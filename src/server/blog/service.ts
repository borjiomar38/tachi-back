import { envServer } from '@/env/server';
import {
  BlogAgentReview,
  BlogArticleDetail,
  BlogArticleSummary,
  zBlogAgentReview,
  zBlogArticleBody,
} from '@/features/blog/schema';
import { buildBlogSeoKeywords } from '@/features/blog/seo';
import { generateBlogArticleDraft } from '@/server/blog/ai';
import { findPrebuiltBlogHeroImage } from '@/server/blog/images';
import {
  combineBlogImageReviews,
  runAnimeMangaImageReviewAgent,
  runArticleUxReviewAgent,
  runHeroImageUxReviewAgent,
} from '@/server/blog/review-agents';
import {
  type BlogGenerationTopic,
  blogGenerationTopics,
} from '@/server/blog/topics';
import { db } from '@/server/db';
import { BlogArticleStatus } from '@/server/db/generated/client';

interface BlogArticleSummaryRow {
  excerpt: string;
  heroImageUrl: string | null;
  imageAlt: string;
  imagePrompt: string;
  keywords: string[];
  manhwaTitle: string;
  manhwaType: string;
  publishedAt: Date | null;
  slug: string;
  title: string;
  updatedAt: Date;
}

interface BlogArticleDetailRow extends BlogArticleSummaryRow {
  body: unknown;
  heroImageUrl: string | null;
  imageReview: unknown;
  metaDescription: string;
  searchIntent: string;
  uxReview: unknown;
}

interface BlogSitemapEntryRow {
  publishedAt: Date | null;
  slug: string;
  updatedAt: Date;
}

export interface BlogSitemapEntry {
  lastModified: string;
  slug: string;
}

const blogArticleSummarySelect = {
  excerpt: true,
  heroImageUrl: true,
  imageAlt: true,
  imagePrompt: true,
  keywords: true,
  manhwaTitle: true,
  manhwaType: true,
  publishedAt: true,
  slug: true,
  title: true,
  updatedAt: true,
} as const;

const blogArticleDetailSelect = {
  ...blogArticleSummarySelect,
  body: true,
  heroImageUrl: true,
  imageReview: true,
  metaDescription: true,
  searchIntent: true,
  uxReview: true,
} as const;

export async function getPublishedBlogArticleSummaries(): Promise<
  BlogArticleSummary[]
> {
  const rows = await db.blogArticle.findMany({
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: blogArticleSummarySelect,
    take: 24,
    where: {
      publishedAt: {
        lte: new Date(),
      },
      status: BlogArticleStatus.published,
    },
  });

  return rows.map(mapBlogArticleSummaryRow);
}

export async function getPublishedBlogArticleBySlug(
  slug: string
): Promise<BlogArticleDetail | null> {
  const row = await db.blogArticle.findFirst({
    select: blogArticleDetailSelect,
    where: {
      publishedAt: {
        lte: new Date(),
      },
      slug,
      status: BlogArticleStatus.published,
    },
  });

  return row ? mapBlogArticleDetailRow(row) : null;
}

export async function getPublishedBlogSitemapEntries(): Promise<
  BlogSitemapEntry[]
> {
  const rows = await db.blogArticle.findMany({
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    select: {
      publishedAt: true,
      slug: true,
      updatedAt: true,
    },
    where: {
      publishedAt: {
        lte: new Date(),
      },
      status: BlogArticleStatus.published,
    },
  });

  return rows.map(mapBlogSitemapEntryRow);
}

export async function generateDailyBlogArticle(
  input: {
    date?: Date;
    fetchFn?: typeof fetch;
  } = {}
): Promise<BlogArticleDetail> {
  const publicationDate = input.date ?? new Date();
  const generationDate = publicationDate.toISOString().slice(0, 10);
  const generationKey = `daily-blog-${generationDate}`;
  const existing = await db.blogArticle.findFirst({
    select: blogArticleDetailSelect,
    where: {
      generationKey,
    },
  });

  if (existing) {
    return await ensureBlogArticleHeroImage(existing);
  }

  const topic = await selectDailyTopic(generationDate);
  const draft = await generateBlogArticleDraft({
    date: generationDate,
    fetchFn: input.fetchFn,
    topic,
  });
  const imageReview = runPrebuiltImageReview({
    imageAlt: draft.imageAlt,
    imagePrompt: draft.imagePrompt,
    topic,
  });
  const uxReview = runArticleUxReviewAgent({
    body: draft.body,
    excerpt: draft.excerpt,
    keywords: draft.keywords,
    metaDescription: draft.metaDescription,
    title: draft.title,
  });
  const slug = await buildUniqueSlug(draft.slugBase, generationDate);
  const heroImage = imageReview.passed
    ? await findPrebuiltBlogHeroImage({
        topic,
      })
    : null;

  const publishable =
    imageReview.score >= 80 &&
    uxReview.score >= 80 &&
    (!envServer.BLOG_IMAGE_GENERATION_ENABLED || Boolean(heroImage));
  const row = await db.blogArticle.create({
    data: {
      body: draft.body,
      excerpt: draft.excerpt,
      generatedAt: publicationDate,
      generationKey,
      generationModel: draft.generationModel,
      generationPromptVersion: draft.generationPromptVersion,
      generationProvider: draft.generationProvider,
      generationSource: 'daily-cron',
      heroImageObjectKey: heroImage?.heroImageObjectKey,
      heroImageUrl: heroImage?.heroImageUrl,
      imageAlt: draft.imageAlt,
      imagePrompt: draft.imagePrompt,
      imageReview,
      keywords: draft.keywords,
      manhwaTitle: topic.manhwaTitle,
      manhwaType: topic.manhwaType,
      metaDescription: draft.metaDescription,
      publishedAt: publishable ? publicationDate : null,
      searchIntent: topic.searchIntent,
      slug,
      status: publishable
        ? BlogArticleStatus.published
        : BlogArticleStatus.draft,
      title: draft.title,
      uxReview,
    },
    select: blogArticleDetailSelect,
  });

  return mapBlogArticleDetailRow(row);
}

async function selectDailyTopic(
  generationDate: string
): Promise<BlogGenerationTopic> {
  if (blogGenerationTopics.length === 0) {
    throw new Error('At least one blog generation topic is required.');
  }

  const articleCount = await db.blogArticle.count({
    where: {
      generationSource: 'daily-cron',
    },
  });
  const dateOffset = generationDate
    .split('-')
    .join('')
    .split('')
    .reduce((total, digit) => total + Number(digit), 0);
  const index = (articleCount + dateOffset) % blogGenerationTopics.length;
  const topic = blogGenerationTopics[index];

  if (!topic) {
    throw new Error('Unable to select blog generation topic.');
  }

  return topic;
}

async function buildUniqueSlug(slugBase: string, generationDate: string) {
  const normalizedBase = slugify(slugBase);
  const base = `${normalizedBase}-${generationDate}`;
  const existing = await db.blogArticle.findFirst({
    select: {
      id: true,
    },
    where: {
      slug: base,
    },
  });

  if (!existing) {
    return base;
  }

  return `${base}-${Date.now().toString(36)}`;
}

async function ensureBlogArticleHeroImage(
  row: BlogArticleDetailRow
): Promise<BlogArticleDetail> {
  if (row.heroImageUrl?.startsWith('/api/blog/heroes/')) {
    return mapBlogArticleDetailRow(row);
  }

  if (row.heroImageUrl) {
    const updated = await db.blogArticle.update({
      data: {
        heroImageUrl: buildBlogHeroImageRouteUrl(row.slug),
      },
      select: blogArticleDetailSelect,
      where: {
        slug: row.slug,
      },
    });

    return mapBlogArticleDetailRow(updated);
  }

  if (!envServer.BLOG_IMAGE_GENERATION_ENABLED) {
    return mapBlogArticleDetailRow(row);
  }

  const topic = findTopicForArticle(row);
  const imagePromptReview = runPrebuiltImageReview({
    imageAlt: row.imageAlt,
    imagePrompt: row.imagePrompt,
    topic,
  });

  if (!imagePromptReview.passed) {
    const updated = await db.blogArticle.update({
      data: {
        imageReview: imagePromptReview,
      },
      select: blogArticleDetailSelect,
      where: {
        slug: row.slug,
      },
    });

    return mapBlogArticleDetailRow(updated);
  }

  const heroImage = await findPrebuiltBlogHeroImage({
    topic,
  });

  if (!heroImage) {
    const updated = await db.blogArticle.update({
      data: {
        imageReview: {
          ...imagePromptReview,
          notes: [
            ...imagePromptReview.notes.slice(0, 5),
            'Needs attention: prebuilt Cloudflare hero image is missing for this topic.',
          ],
          passed: false,
          score: Math.min(imagePromptReview.score, 70),
        },
      },
      select: blogArticleDetailSelect,
      where: {
        slug: row.slug,
      },
    });

    return mapBlogArticleDetailRow(updated);
  }

  const updated = await db.blogArticle.update({
    data: {
      heroImageObjectKey: heroImage.heroImageObjectKey,
      heroImageUrl: heroImage.heroImageUrl,
      imageReview: imagePromptReview,
    },
    select: blogArticleDetailSelect,
    where: {
      slug: row.slug,
    },
  });

  return mapBlogArticleDetailRow(updated);
}

function runPrebuiltImageReview(input: {
  imageAlt: string;
  imagePrompt: string;
  topic: BlogGenerationTopic;
}) {
  return combineBlogImageReviews([
    runAnimeMangaImageReviewAgent(input),
    runHeroImageUxReviewAgent({
      imagePrompt: input.imagePrompt,
    }),
  ]);
}

function findTopicForArticle(row: {
  manhwaTitle: string;
  manhwaType: string;
  searchIntent: string;
}): BlogGenerationTopic {
  return (
    blogGenerationTopics.find(
      (topic) =>
        topic.manhwaTitle === row.manhwaTitle &&
        topic.manhwaType === row.manhwaType
    ) ?? {
      angle: `Create a visual translation workflow article image for ${row.manhwaTitle}.`,
      manhwaTitle: row.manhwaTitle,
      manhwaType:
        row.manhwaType === 'manga' ||
        row.manhwaType === 'manhua' ||
        row.manhwaType === 'manhwa'
          ? row.manhwaType
          : 'manhwa',
      searchIntent: row.searchIntent,
    }
  );
}

function buildBlogHeroImageRouteUrl(slug: string) {
  return `/api/blog/heroes/${encodeURIComponent(slug)}`;
}

function mapBlogArticleSummaryRow(
  row: BlogArticleSummaryRow
): BlogArticleSummary {
  const publishedAt = row.publishedAt ?? row.updatedAt;

  return {
    excerpt: row.excerpt,
    heroImageUrl: row.heroImageUrl,
    imageAlt: row.imageAlt,
    imagePrompt: row.imagePrompt,
    keywords: buildBlogSeoKeywords(row.keywords, {
      type: row.manhwaType,
    }),
    manhwaTitle: row.manhwaTitle,
    manhwaType: row.manhwaType,
    publishedAt: publishedAt.toISOString(),
    slug: row.slug,
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function mapBlogArticleDetailRow(row: BlogArticleDetailRow): BlogArticleDetail {
  return {
    ...mapBlogArticleSummaryRow(row),
    body: zBlogArticleBody.parse(row.body),
    heroImageUrl: row.heroImageUrl,
    imageReview: parseReview(row.imageReview),
    metaDescription: row.metaDescription,
    searchIntent: row.searchIntent,
    uxReview: parseReview(row.uxReview),
  };
}

function mapBlogSitemapEntryRow(row: BlogSitemapEntryRow): BlogSitemapEntry {
  const lastModified = row.updatedAt ?? row.publishedAt ?? new Date();

  return {
    lastModified: lastModified.toISOString(),
    slug: row.slug,
  };
}

function parseReview(value: unknown): BlogAgentReview | null {
  if (!value) {
    return null;
  }

  const result = zBlogAgentReview.safeParse(value);

  return result.success ? result.data : null;
}

function slugify(value: string) {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return slug || 'tachiyomiat-manhwa-guide';
}
