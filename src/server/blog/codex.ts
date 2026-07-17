import { envServer } from '@/env/server';
import { buildBlogSeoKeywords } from '@/features/blog/seo';
import {
  BLOG_CODEX_PROMPT_VERSION,
  buildCodexBlogArticlePrompt,
  buildCodexBlogNoopPrompt,
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
import {
  resolveTrendingMangaCandidates,
  TrendingMangaCandidate,
  validateTrendingMangaSelection,
} from '@/server/blog/trending-topic-resolver';
import { db } from '@/server/db';
import {
  BlogArticleStatus,
  Prisma,
  ProviderType,
} from '@/server/db/generated/client';

export class CodexBlogDuplicateTopicError extends Error {
  readonly duplicate: ExistingBlogTopic;

  constructor(input: { duplicate: ExistingBlogTopic; manhwaTitle: string }) {
    super(`Codex selected an already used blog topic: ${input.manhwaTitle}.`);
    this.name = 'CodexBlogDuplicateTopicError';
    this.duplicate = input.duplicate;
  }
}

export class CodexBlogTopicSelectionError extends Error {
  readonly details: Record<string, unknown>;

  constructor(input: { details?: Record<string, unknown>; message: string }) {
    super(input.message);
    this.name = 'CodexBlogTopicSelectionError';
    this.details = input.details ?? {};
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
  const trendResult = await resolveTrendingCandidatesForPrompt(existingTopics);

  if (trendResult.candidates.length === 0) {
    return buildCodexBlogNoopPrompt({
      reason:
        'No real, currently trending, verified, and unpublished manga/manhwa/manhua candidate passed validation.',
      rejectedCandidates: trendResult.rejected,
    });
  }

  return buildCodexBlogArticlePrompt({
    candidates: trendResult.candidates,
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
  const verifiedCandidate = await validateDraftTopicSelection({
    draft: input.draft,
    existingTopics,
  });

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
  const articleUxReview = runArticleUxReviewAgent({
    body: input.draft.body,
    excerpt: input.draft.excerpt,
    keywords: input.draft.keywords,
    metaDescription: input.draft.metaDescription,
    title: input.draft.title,
  });
  const uxReview = {
    ...articleUxReview,
    topicSelection: buildTopicSelectionAudit({
      candidate: verifiedCandidate,
      draft: input.draft,
      validatedAt: publicationDate.toISOString(),
    }),
  };
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
      uxReview: toPrismaJson(uxReview),
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
      slug: true,
      title: true,
    },
  });

  return rows.map((row) => ({
    manhwaTitle: row.manhwaTitle,
    slug: row.slug,
    title: row.title,
  }));
}

async function resolveTrendingCandidatesForPrompt(
  existingTopics: ExistingBlogTopic[]
) {
  try {
    return await resolveTrendingMangaCandidates({
      existingTopics,
    });
  } catch (error) {
    return {
      candidates: [],
      rejected: [
        {
          reason:
            error instanceof Error
              ? `Trend resolver failed: ${error.message}`
              : 'Trend resolver failed with an unknown error.',
          title: 'trend-resolver',
        },
      ],
      resolvedAt: new Date().toISOString(),
    };
  }
}

async function validateDraftTopicSelection(input: {
  draft: CodexBlogArticleDraft;
  existingTopics: ExistingBlogTopic[];
}): Promise<TrendingMangaCandidate> {
  const duplicate = findDuplicateBlogTopic(
    {
      aliases: input.draft.topicEvidence.titleAliases,
      manhwaTitle: input.draft.manhwaTitle,
      slugBase: input.draft.slugBase,
      title: input.draft.title,
    },
    input.existingTopics
  );

  if (duplicate) {
    throw new CodexBlogDuplicateTopicError({
      duplicate,
      manhwaTitle: input.draft.manhwaTitle,
    });
  }

  const verifiedCandidate = await validateTrendingMangaSelection({
    claim: {
      aliases: input.draft.topicEvidence.titleAliases,
      anilistId: input.draft.topicEvidence.anilistId,
      canonicalId: input.draft.topicEvidence.canonicalId,
      kitsuId: input.draft.topicEvidence.kitsuId,
      malId: input.draft.topicEvidence.myAnimeListId,
      sourceUrls: input.draft.topicEvidence.sourceUrls,
      title: input.draft.manhwaTitle,
      type: input.draft.manhwaType,
    },
  }).catch((error: unknown) => {
    throw new CodexBlogTopicSelectionError({
      details: {
        canonicalId: input.draft.topicEvidence.canonicalId,
        reason: error instanceof Error ? error.message : 'Unknown error',
      },
      message:
        'Codex blog draft selected a topic that is not currently verified.',
    });
  });
  const candidateDuplicate = findDuplicateBlogTopic(
    {
      aliases: [
        ...verifiedCandidate.aliases,
        ...input.draft.topicEvidence.titleAliases,
      ],
      manhwaTitle: input.draft.manhwaTitle,
      slugBase: input.draft.slugBase,
      title: input.draft.title,
    },
    input.existingTopics
  );

  if (candidateDuplicate) {
    throw new CodexBlogDuplicateTopicError({
      duplicate: candidateDuplicate,
      manhwaTitle: input.draft.manhwaTitle,
    });
  }

  assertDraftSourceNotesUseVerifiedSources({
    candidate: verifiedCandidate,
    draft: input.draft,
  });

  return verifiedCandidate;
}

function assertDraftSourceNotesUseVerifiedSources(input: {
  candidate: TrendingMangaCandidate;
  draft: CodexBlogArticleDraft;
}) {
  const verifiedUrls = new Set(
    input.candidate.sourceEvidence.map((source) => source.url)
  );
  const matchingSourceCount = input.draft.sourceNotes.filter((source) =>
    verifiedUrls.has(source.url)
  ).length;

  if (matchingSourceCount < 2) {
    throw new CodexBlogTopicSelectionError({
      details: {
        canonicalId: input.draft.topicEvidence.canonicalId,
        sourceNoteUrls: input.draft.sourceNotes.map((source) => source.url),
        verifiedUrls: [...verifiedUrls],
      },
      message:
        'Codex blog draft sourceNotes do not include the verified topic sources.',
    });
  }
}

function buildTopicSelectionAudit(input: {
  candidate: TrendingMangaCandidate;
  draft: CodexBlogArticleDraft;
  validatedAt: string;
}) {
  return {
    aliases: input.candidate.aliases,
    anilistId: input.candidate.anilistId,
    canonicalId: input.candidate.canonicalId,
    duplicatePolicy: 'alias-title-slug-canonical-topic',
    draftEvidence: input.draft.topicEvidence,
    kitsuId: input.candidate.kitsuId,
    myAnimeListId: input.candidate.malId,
    sourceEvidence: input.candidate.sourceEvidence,
    trendRank: input.candidate.trendRank,
    trendScore: input.candidate.trendScore,
    validatedAt: input.validatedAt,
  };
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
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
