import { envServer } from '@/env/server';
import {
  BlogAgentReview,
  BlogArticleDetail,
  BlogArticleSummary,
  zBlogAgentReview,
  zBlogArticleBody,
} from '@/features/blog/schema';
import { generateBlogArticleDraft } from '@/server/blog/ai';
import { generateBlogHeroImage } from '@/server/blog/images';
import {
  runArticleUxReviewAgent,
  runImageGenerationReviewAgent,
} from '@/server/blog/review-agents';
import {
  type BlogGenerationTopic,
  blogGenerationTopics,
} from '@/server/blog/topics';
import { db } from '@/server/db';
import { BlogArticleStatus } from '@/server/db/generated/client';

interface BlogArticleSummaryRow {
  excerpt: string;
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

const blogArticleSummarySelect = {
  excerpt: true,
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
    return mapBlogArticleDetailRow(existing);
  }

  const topic = await selectDailyTopic(generationDate);
  const draft = await generateBlogArticleDraft({
    date: generationDate,
    fetchFn: input.fetchFn,
    topic,
  });
  const imageReview = runImageGenerationReviewAgent({
    imageAlt: draft.imageAlt,
    imagePrompt: draft.imagePrompt,
    manhwaTitle: topic.manhwaTitle,
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
    ? await tryGenerateHeroImage({
        fetchFn: input.fetchFn,
        imagePrompt: draft.imagePrompt,
        imageReview,
        slug,
      })
    : {
        image: null,
        imageReview,
      };
  const finalImageReview = heroImage.imageReview;

  const publishable =
    finalImageReview.score >= 80 &&
    uxReview.score >= 80 &&
    (!envServer.BLOG_IMAGE_GENERATION_ENABLED || Boolean(heroImage.image));
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
      heroImageObjectKey: heroImage.image?.heroImageObjectKey,
      heroImageUrl: heroImage.image?.heroImageUrl,
      imageAlt: draft.imageAlt,
      imagePrompt: draft.imagePrompt,
      imageReview: finalImageReview,
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

async function tryGenerateHeroImage(input: {
  fetchFn?: typeof fetch;
  imagePrompt: string;
  imageReview: BlogAgentReview;
  slug: string;
}) {
  if (!envServer.BLOG_IMAGE_GENERATION_ENABLED) {
    return {
      image: null,
      imageReview: input.imageReview,
    };
  }

  try {
    return {
      image: await generateBlogHeroImage({
        fetchFn: input.fetchFn,
        imagePrompt: input.imagePrompt,
        slug: input.slug,
      }),
      imageReview: input.imageReview,
    };
  } catch (error) {
    return {
      image: null,
      imageReview: {
        ...input.imageReview,
        notes: [
          ...input.imageReview.notes.slice(0, 5),
          `Image generation failed: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        ],
        passed: false,
        score: Math.min(input.imageReview.score, 70),
      },
    };
  }
}

function mapBlogArticleSummaryRow(
  row: BlogArticleSummaryRow
): BlogArticleSummary {
  const publishedAt = row.publishedAt ?? row.updatedAt;

  return {
    excerpt: row.excerpt,
    imageAlt: row.imageAlt,
    imagePrompt: row.imagePrompt,
    keywords: row.keywords,
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
