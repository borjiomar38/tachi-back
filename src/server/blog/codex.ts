import { envServer } from '@/env/server';
import type { BlogArticleCategory } from '@/features/blog/schema';
import { buildBlogSeoKeywords } from '@/features/blog/seo';
import { shouldAdvanceBlogAppUpdateCheckpoint } from '@/server/blog/app-update-policy';
import {
  advanceBlogAppUpdateCheckpoint,
  assertCurrentBlogAppUpdateEvidence,
  prepareBlogAppUpdatePromptContext,
} from '@/server/blog/app-update-source';
import {
  BLOG_CODEX_PROMPT_VERSION,
  buildCodexAppUpdateArticlePrompt,
  buildCodexBlogArticlePrompt,
  buildCodexBlogNoopPrompt,
  type CodexBlogArticleDraft,
  type ExistingBlogTopic,
  findDuplicateBlogTopic,
} from '@/server/blog/codex-draft';
import {
  assertFutureBlogArticlePolicy,
  assertSafeAppUpdateCopy,
  hasRecentNewsSource,
  resolveScheduledBlogCategory,
} from '@/server/blog/editorial-policy';
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
import type { BlogGenerationTopic } from '@/server/blog/topics';
import {
  resolveTrendingMangaCandidates,
  type TrendingMangaCandidate,
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

interface VerifiedTopicSelection {
  candidate: TrendingMangaCandidate;
  title: string;
}

const codexBlogArticleSelect = {
  heroImageUrl: true,
  publishedAt: true,
  slug: true,
  status: true,
  title: true,
} as const;

const codexBlogArticleInternalSelect = {
  ...codexBlogArticleSelect,
  id: true,
} as const;

export async function buildDailyCodexBlogArticlePrompt(
  input: {
    date?: Date;
    fetchImpl?: typeof fetch;
  } = {}
): Promise<string> {
  const publicationDate = input.date ?? new Date();
  const generationDate = publicationDate.toISOString().slice(0, 10);
  const appUpdateContext = await resolveAppUpdatePromptContext({
    fetchImpl: input.fetchImpl,
    now: publicationDate,
  });

  if (appUpdateContext.kind === 'ready') {
    return buildCodexAppUpdateArticlePrompt({
      date: generationDate,
      evidence: appUpdateContext.evidence,
    });
  }

  const existingTopics = await getExistingBlogTopics();
  const trendResult = await resolveTrendingCandidatesForPrompt(
    existingTopics,
    input.fetchImpl
  );

  if (trendResult.candidates.length === 0) {
    return buildCodexBlogNoopPrompt({
      reason:
        'No real, currently trending, verified, and unpublished manga/manhwa/manhua candidate passed validation.',
      rejectedCandidates: trendResult.rejected,
    });
  }

  const counts = await getEditorialCategoryCounts();
  const category = resolveScheduledBlogCategory({
    candidateCount: trendResult.candidates.length,
    counts,
  });

  if (!category) {
    return buildCodexBlogNoopPrompt({
      reason: 'No editorial category has enough verified source material.',
    });
  }

  return buildCodexBlogArticlePrompt({
    candidates: trendResult.candidates,
    category,
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
  const generationKey = buildGenerationKey(input.draft, generationDate);
  const existingArticle = await db.blogArticle.findFirst({
    select: codexBlogArticleInternalSelect,
    where: {
      generationKey,
    },
  });

  if (
    existingArticle?.status === BlogArticleStatus.published ||
    (existingArticle && input.draft.category !== 'app_updates')
  ) {
    return mapCodexBlogPublishResult(existingArticle);
  }

  assertFutureBlogArticlePolicy({
    body: input.draft.body,
    category: input.draft.category,
  });
  const topicSelectionAudit = await validateDraftEvidence({
    draft: input.draft,
    publicationDate,
  });

  if (input.draft.category === 'app_updates') {
    assertSafeAppUpdateCopy(input.draft.body);
    await assertCurrentBlogAppUpdateEvidence(input.draft.appUpdateEvidence);
  }

  const topic = buildTopicFromDraft(input.draft);
  const imagePrompt = buildEditorialHeroImagePrompt(input.draft, topic);
  const imageAlt = buildEditorialHeroImageAlt(input.draft, topic);
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
    editorialCategory: input.draft.category,
    topicSelection: topicSelectionAudit,
  };
  const slug =
    existingArticle?.slug ??
    (await buildUniqueSlug(input.draft.slugBase, generationDate));
  const heroImage = input.heroImage
    ? await uploadGeneratedBlogHeroImage({
        image: decodeCodexHeroImage(input.heroImage.dataBase64),
        metadata: {
          'blog-category': input.draft.category,
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
  const data = {
    body: toPrismaJson(input.draft.body),
    excerpt: input.draft.excerpt,
    generatedAt: publicationDate,
    generationKey,
    generationModel: buildCodexGenerationModel(input),
    generationPromptVersion: BLOG_CODEX_PROMPT_VERSION,
    generationProvider: ProviderType.internal,
    generationSource: buildGenerationSource(input.draft.category),
    heroImageObjectKey: heroImage?.heroImageObjectKey,
    heroImageUrl: heroImage?.heroImageUrl,
    imageAlt,
    imagePrompt,
    imageReview: toPrismaJson(imageReview),
    keywords: buildEditorialKeywords(input.draft),
    manhwaTitle: input.draft.manhwaTitle.trim(),
    manhwaType: input.draft.manhwaType,
    metaDescription: input.draft.metaDescription,
    publishedAt: publishable ? publicationDate : null,
    searchIntent: input.draft.searchIntent,
    slug,
    status: publishable ? BlogArticleStatus.published : BlogArticleStatus.draft,
    title: input.draft.title,
    uxReview: toPrismaJson(uxReview),
  } satisfies Prisma.BlogArticleUncheckedCreateInput;

  if (
    input.draft.category !== 'app_updates' ||
    !shouldAdvanceBlogAppUpdateCheckpoint(data.status)
  ) {
    return existingArticle
      ? await db.blogArticle.update({
          data,
          select: codexBlogArticleSelect,
          where: {
            id: existingArticle.id,
          },
        })
      : await db.blogArticle.create({
          data,
          select: codexBlogArticleSelect,
        });
  }

  const appUpdateEvidence = input.draft.appUpdateEvidence;

  return await db.$transaction(
    async (transaction) => {
      const article = existingArticle
        ? await transaction.blogArticle.update({
            data,
            select: codexBlogArticleSelect,
            where: {
              id: existingArticle.id,
            },
          })
        : await transaction.blogArticle.create({
            data,
            select: codexBlogArticleSelect,
          });

      await advanceBlogAppUpdateCheckpoint(
        appUpdateEvidence,
        transaction,
        publicationDate
      );

      return article;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    }
  );
}

function buildCodexGenerationModel(input: {
  codexModel?: string | null;
  codexReasoningEffort?: string | null;
}) {
  const model = input.codexModel?.trim() || 'gpt-5.5';
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

async function getEditorialCategoryCounts() {
  const [recommendations, manhwaNews] = await Promise.all([
    db.blogArticle.count({
      where: {
        generationSource: buildGenerationSource('recommendations'),
      },
    }),
    db.blogArticle.count({
      where: {
        generationSource: buildGenerationSource('manhwa_news'),
      },
    }),
  ]);

  return {
    manhwaNews,
    recommendations,
  };
}

async function resolveAppUpdatePromptContext(input: {
  fetchImpl?: typeof fetch;
  now: Date;
}) {
  try {
    return await prepareBlogAppUpdatePromptContext({
      fetchImpl: input.fetchImpl,
      now: input.now,
    });
  } catch (error) {
    return {
      kind: 'noop' as const,
      reason:
        error instanceof Error
          ? `GitHub app update discovery is temporarily unavailable: ${error.message}`
          : 'GitHub app update discovery is temporarily unavailable.',
    };
  }
}

async function resolveTrendingCandidatesForPrompt(
  existingTopics: ExistingBlogTopic[],
  fetchImpl?: typeof fetch
) {
  try {
    return await resolveTrendingMangaCandidates({
      existingTopics,
      fetchImpl,
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

async function validateDraftEvidence(input: {
  draft: CodexBlogArticleDraft;
  publicationDate: Date;
}): Promise<Record<string, unknown>> {
  if (input.draft.category === 'app_updates') {
    return validateAppUpdateSources(input.draft);
  }

  if (input.draft.category === 'manhwa_news') {
    return await validateManhwaNewsSelection(
      input.draft,
      input.publicationDate
    );
  }

  return await validateRecommendationSelections(input.draft);
}

async function validateRecommendationSelections(
  draft: Extract<CodexBlogArticleDraft, { category: 'recommendations' }>
): Promise<Record<string, unknown>> {
  const existingTopics = await getExistingBlogTopics();
  const selections: VerifiedTopicSelection[] = [];

  for (const [index, evidence] of draft.recommendationEvidence.entries()) {
    const title = draft.featuredTitles[index];

    if (!title) {
      throw new CodexBlogTopicSelectionError({
        message: 'A recommendation evidence item has no matching title.',
      });
    }

    const candidate = await validateTopicEvidence({
      evidence,
      existingTopics,
      slugBase: draft.slugBase,
      title,
    });
    assertBodyUsesCandidateSource(draft.body.sources, candidate, title);
    selections.push({ candidate, title });
  }

  return {
    category: draft.category,
    duplicatePolicy: 'all-featured-title-aliases',
    selections: selections.map((selection) => ({
      aliases: selection.candidate.aliases,
      canonicalId: selection.candidate.canonicalId,
      sourceEvidence: selection.candidate.sourceEvidence,
      title: selection.title,
    })),
    validatedAt: new Date().toISOString(),
  };
}

async function validateManhwaNewsSelection(
  draft: Extract<CodexBlogArticleDraft, { category: 'manhwa_news' }>,
  publicationDate: Date
): Promise<Record<string, unknown>> {
  const existingTopics = await getExistingBlogTopics();
  const candidate = await validateTopicEvidence({
    evidence: draft.topicEvidence,
    existingTopics,
    slugBase: draft.slugBase,
    title: draft.manhwaTitle,
  });
  assertBodyUsesCandidateSource(
    draft.body.sources,
    candidate,
    draft.manhwaTitle
  );

  if (
    !hasRecentNewsSource({
      body: draft.body,
      publicationDate,
    })
  ) {
    throw new CodexBlogTopicSelectionError({
      message:
        'Manhwa news drafts require at least one dated source from the previous 120 days.',
    });
  }

  return {
    aliases: candidate.aliases,
    canonicalId: candidate.canonicalId,
    category: draft.category,
    sourceEvidence: candidate.sourceEvidence,
    validatedAt: publicationDate.toISOString(),
  };
}

function validateAppUpdateSources(
  draft: Extract<CodexBlogArticleDraft, { category: 'app_updates' }>
): Record<string, unknown> {
  const commitUrls = new Set(
    draft.appUpdateEvidence.commits.map((commit) => commit.url)
  );
  const invalidSource = draft.body.sources.find(
    (source) => !commitUrls.has(source.url)
  );

  if (invalidSource) {
    throw new CodexBlogTopicSelectionError({
      details: {
        invalidSource: invalidSource.url,
      },
      message:
        'App update article sources must use only verified GitHub commit URLs.',
    });
  }

  return {
    category: draft.category,
    commitCount: draft.appUpdateEvidence.commits.length,
    fromSha: draft.appUpdateEvidence.fromSha,
    repository: draft.appUpdateEvidence.repository,
    toSha: draft.appUpdateEvidence.toSha,
    validatedAt: new Date().toISOString(),
  };
}

async function validateTopicEvidence(input: {
  evidence: {
    anilistId: number;
    canonicalId: string;
    kitsuId: string | null;
    myAnimeListId: number | null;
    sourceUrls: string[];
    titleAliases: string[];
    type: 'manga' | 'manhua' | 'manhwa';
  };
  existingTopics: ExistingBlogTopic[];
  slugBase: string;
  title: string;
}): Promise<TrendingMangaCandidate> {
  const duplicate = findDuplicateBlogTopic(
    {
      aliases: input.evidence.titleAliases,
      manhwaTitle: input.title,
      slugBase: input.slugBase,
      title: input.title,
    },
    input.existingTopics
  );

  if (duplicate) {
    throw new CodexBlogDuplicateTopicError({
      duplicate,
      manhwaTitle: input.title,
    });
  }

  return await validateTrendingMangaSelection({
    claim: {
      aliases: input.evidence.titleAliases,
      anilistId: input.evidence.anilistId,
      canonicalId: input.evidence.canonicalId,
      kitsuId: input.evidence.kitsuId,
      malId: input.evidence.myAnimeListId,
      sourceUrls: input.evidence.sourceUrls,
      title: input.title,
      type: input.evidence.type,
    },
  }).catch((error: unknown) => {
    throw new CodexBlogTopicSelectionError({
      details: {
        canonicalId: input.evidence.canonicalId,
        reason: error instanceof Error ? error.message : 'Unknown error',
      },
      message:
        'Codex blog draft selected a topic that is not currently verified.',
    });
  });
}

function assertBodyUsesCandidateSource(
  sources: CodexBlogArticleDraft['body']['sources'],
  candidate: TrendingMangaCandidate,
  title: string
): void {
  const verifiedUrls = new Set(
    candidate.sourceEvidence.map((source) => source.url)
  );
  const hasVerifiedSource = sources.some((source) =>
    verifiedUrls.has(source.url)
  );

  if (!hasVerifiedSource) {
    throw new CodexBlogTopicSelectionError({
      details: {
        sourceUrls: sources.map((source) => source.url),
        title,
        verifiedUrls: [...verifiedUrls],
      },
      message: 'The article does not cite a verified source for its topic.',
    });
  }
}

function buildTopicFromDraft(
  draft: CodexBlogArticleDraft
): BlogGenerationTopic {
  return {
    angle: draft.editorialRationale,
    manhwaTitle: draft.manhwaTitle.trim(),
    manhwaType: draft.manhwaType,
    searchIntent: draft.searchIntent,
  };
}

function buildEditorialHeroImagePrompt(
  draft: CodexBlogArticleDraft,
  topic: BlogGenerationTopic
): string {
  if (draft.category !== 'app_updates') {
    return buildBlogTopicHeroImagePrompt(topic);
  }

  return [
    'Create an original cinematic manhwa-style hero illustration for a Nayovi application update article.',
    `Update theme: ${draft.editorialRationale}`,
    'Show an original reader in a dark modern setting noticing a smoother mobile reading experience.',
    'Use a 16:9 landscape composition with readable negative space, premium violet-blue lighting, and no copied characters.',
    'Do not show readable UI, release notes, source code, logos, watermarks, credentials, security details, or fake screenshots.',
  ].join(' ');
}

function buildEditorialHeroImageAlt(
  draft: CodexBlogArticleDraft,
  topic: BlogGenerationTopic
): string {
  return draft.category === 'app_updates'
    ? `Original illustration for the Nayovi app update: ${draft.title}`
    : buildBlogTopicHeroImageAlt(topic);
}

function buildEditorialKeywords(draft: CodexBlogArticleDraft): string[] {
  if (draft.category !== 'app_updates') {
    return buildBlogSeoKeywords(draft.keywords, {
      type: draft.manhwaType,
    });
  }

  return [...new Set([...draft.keywords, 'Nayovi update', 'Nayovi Android'])]
    .filter(Boolean)
    .slice(0, 12);
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

function buildGenerationKey(
  draft: CodexBlogArticleDraft,
  generationDate: string
): string {
  return draft.category === 'app_updates'
    ? `codex-blog:app-updates:${draft.appUpdateEvidence.toSha}`
    : `daily-blog:${draft.category}:${generationDate}`;
}

function buildGenerationSource(category: BlogArticleCategory): string {
  return `codex-cli-cron:${category}`;
}

function mapCodexBlogPublishResult(input: {
  heroImageUrl: string | null;
  publishedAt: Date | null;
  slug: string;
  status: BlogArticleStatus;
  title: string;
}): CodexBlogPublishResult {
  return {
    heroImageUrl: input.heroImageUrl,
    publishedAt: input.publishedAt,
    slug: input.slug,
    status: input.status,
    title: input.title,
  };
}

function toPrismaJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function slugify(value: string) {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

  return slug || 'nayovi-editorial';
}
