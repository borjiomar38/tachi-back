import { envServer } from '@/env/server';
import { buildBlogSeoKeywords } from '@/features/blog/seo';
import {
  BLOG_CODEX_PROMPT_VERSION,
  buildCodexBlogArticlePrompt,
  CodexBlogArticleDraft,
  ExistingBlogTopic,
  findDuplicateBlogTopic,
} from '@/server/blog/codex-draft';
import {
  buildBlogTopicHeroImageAlt,
  buildBlogTopicHeroImagePrompt,
  uploadGeneratedBlogHeroImage,
} from '@/server/blog/images';
import {
  combineBlogImageReviews,
  runAnimeMangaImageReviewAgent,
  runArticleUxReviewAgent,
  runHeroImageUxReviewAgent,
} from '@/server/blog/review-agents';
import { BlogGenerationTopic } from '@/server/blog/topics';
import { db } from '@/server/db';
import { BlogArticleStatus, ProviderType } from '@/server/db/generated/client';

export class CodexBlogDuplicateTopicError extends Error {
  readonly duplicate: ExistingBlogTopic;

  constructor(input: { duplicate: ExistingBlogTopic; manhwaTitle: string }) {
    super(`Codex selected an already used blog topic: ${input.manhwaTitle}.`);
    this.name = 'CodexBlogDuplicateTopicError';
    this.duplicate = input.duplicate;
  }
}

export interface CodexBlogPublishResult {
  heroImageUrl: string | null;
  publishedAt: Date | null;
  slug: string;
  status: BlogArticleStatus;
  title: string;
}

const codexBlogArticleSelect = {
  heroImageUrl: true,
  publishedAt: true,
  slug: true,
  status: true,
  title: true,
} as const;

export async function buildDailyCodexBlogArticlePrompt(
  input: {
    date?: Date;
  } = {}
) {
  const publicationDate = input.date ?? new Date();
  const generationDate = publicationDate.toISOString().slice(0, 10);
  const existingTopics = await getExistingBlogTopics();

  return buildCodexBlogArticlePrompt({
    date: generationDate,
    existingTopics,
  });
}

export async function publishCodexBlogArticleDraft(input: {
  codexModel?: string | null;
  codexReasoningEffort?: string | null;
  date?: Date;
  draft: CodexBlogArticleDraft;
  heroImage?: {
    contentType: 'image/jpeg' | 'image/png' | 'image/webp';
    dataBase64: string;
    generatedBy: 'codex-cli';
    prompt: string;
  };
}): Promise<CodexBlogPublishResult> {
  const publicationDate = input.date ?? new Date();
  const generationDate = publicationDate.toISOString().slice(0, 10);
  const generationKey = buildDailyGenerationKey(generationDate);
  const existingDailyArticle = await db.blogArticle.findFirst({
    select: codexBlogArticleSelect,
    where: {
      generationKey,
    },
  });

  if (existingDailyArticle) {
    return existingDailyArticle;
  }

  const existingTopics = await getExistingBlogTopics();
  const duplicate = findDuplicateBlogTopic(input.draft, existingTopics);

  if (duplicate) {
    throw new CodexBlogDuplicateTopicError({
      duplicate,
      manhwaTitle: input.draft.manhwaTitle,
    });
  }

  const topic = buildTopicFromDraft(input.draft);
  const imagePrompt = buildBlogTopicHeroImagePrompt(topic);
  const imageAlt = buildBlogTopicHeroImageAlt(topic);
  const imageReview = combineBlogImageReviews([
    runAnimeMangaImageReviewAgent({
      imageAlt,
      imagePrompt,
      topic,
    }),
    runHeroImageUxReviewAgent({
      imagePrompt,
    }),
  ]);
  const uxReview = runArticleUxReviewAgent({
    body: input.draft.body,
    excerpt: input.draft.excerpt,
    keywords: input.draft.keywords,
    metaDescription: input.draft.metaDescription,
    title: input.draft.title,
  });
  const slug = await buildUniqueSlug(input.draft.slugBase, generationDate);
  const heroImage = input.heroImage
    ? await uploadGeneratedBlogHeroImage({
        image: decodeCodexHeroImage(input.heroImage.dataBase64),
        metadata: {
          'blog-image-alt': imageAlt,
          'blog-image-generated-by': input.heroImage.generatedBy,
          'blog-image-prompt': input.heroImage.prompt.slice(0, 1_024),
          'blog-search-intent': topic.searchIntent,
          'blog-topic': topic.manhwaTitle,
          'blog-type': topic.manhwaType,
        },
        slug,
      })
    : null;
  const publishable =
    imageReview.score >= 80 &&
    uxReview.score >= 80 &&
    (!envServer.BLOG_IMAGE_GENERATION_ENABLED || Boolean(heroImage));

  return await db.blogArticle.create({
    data: {
      body: input.draft.body,
      excerpt: input.draft.excerpt,
      generatedAt: publicationDate,
      generationKey,
      generationModel: buildCodexGenerationModel(input),
      generationPromptVersion: BLOG_CODEX_PROMPT_VERSION,
      generationProvider: ProviderType.internal,
      generationSource: 'codex-cli-cron',
      heroImageObjectKey: heroImage?.heroImageObjectKey,
      heroImageUrl: heroImage?.heroImageUrl,
      imageAlt,
      imagePrompt,
      imageReview,
      keywords: buildBlogSeoKeywords(input.draft.keywords, {
        type: input.draft.manhwaType,
      }),
      manhwaTitle: input.draft.manhwaTitle.trim(),
      manhwaType: input.draft.manhwaType,
      metaDescription: input.draft.metaDescription,
      publishedAt: publishable ? publicationDate : null,
      searchIntent: input.draft.searchIntent,
      slug,
      status: publishable
        ? BlogArticleStatus.published
        : BlogArticleStatus.draft,
      title: input.draft.title,
      uxReview,
    },
    select: codexBlogArticleSelect,
  });
}

function buildCodexGenerationModel(input: {
  codexModel?: string | null;
  codexReasoningEffort?: string | null;
}) {
  const model = input.codexModel?.trim() || 'gpt-5.3-codex-spark';
  const reasoningEffort = input.codexReasoningEffort?.trim() || 'xhigh';

  return `codex-cli:${model}:${reasoningEffort}`;
}

function decodeCodexHeroImage(dataBase64: string) {
  const image = Buffer.from(dataBase64, 'base64');

  if (image.byteLength < 500_000) {
    throw new Error('Codex CLI hero image is too small to publish.');
  }

  return image;
}

async function getExistingBlogTopics(): Promise<ExistingBlogTopic[]> {
  const rows = await db.blogArticle.findMany({
    orderBy: [{ createdAt: 'desc' }],
    select: {
      manhwaTitle: true,
      title: true,
    },
  });

  return rows.map((row) => ({
    manhwaTitle: row.manhwaTitle,
    title: row.title,
  }));
}

function buildTopicFromDraft(
  draft: CodexBlogArticleDraft
): BlogGenerationTopic {
  return {
    angle: draft.trendRationale,
    manhwaTitle: draft.manhwaTitle.trim(),
    manhwaType: draft.manhwaType,
    searchIntent: draft.searchIntent,
  };
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

function buildDailyGenerationKey(generationDate: string) {
  return `daily-blog-${generationDate}`;
}

function slugify(value: string) {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return slug || 'nayovi-manhwa-guide';
}
