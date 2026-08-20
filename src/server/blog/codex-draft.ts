import { z } from 'zod';

import {
  type BlogArticleCategory,
  zEditorialBlogArticleBody,
} from '@/features/blog/schema';
import {
  buildRequiredBlogSeoKeyword,
  campaignBlogSeoKeywords,
  highIntentBlogSeoKeywords,
} from '@/features/blog/seo';
import { zBlogAppUpdateEvidence } from '@/server/blog/app-update-policy';
import type { ExistingBlogTopic } from '@/server/blog/topic-policy';
import {
  findDuplicateBlogTopic,
  normalizeBlogTopicName,
} from '@/server/blog/topic-policy';
import type { TrendingMangaCandidate } from '@/server/blog/trending-topic-resolver';

export const BLOG_CODEX_PROMPT_VERSION =
  '2026-08-20.editorial-categories-simple-articles.v1';
export const CODEX_BLOG_NOOP_MARKER = 'TACHI_CODEX_BLOG_NOOP';

export { findDuplicateBlogTopic, normalizeBlogTopicName };
export type { ExistingBlogTopic };

export const zCodexBlogTopicEvidence = z
  .object({
    anilistId: z.number().int().positive(),
    canonicalId: z.string().regex(/^anilist:\d+$/),
    kitsuId: z.string().min(1).max(40).nullable(),
    myAnimeListId: z.number().int().positive().nullable(),
    sourceUrls: z.array(z.url()).min(2).max(6),
    titleAliases: z.array(z.string().min(1).max(160)).min(2).max(20),
    trendRank: z.number().int().min(1).max(50),
    trendScore: z.number().int().min(1),
    type: z.enum(['manga', 'manhua', 'manhwa']),
    verifiedAt: z.iso.datetime(),
  })
  .strict();

export const zCodexBlogHeroImagePayload = z
  .object({
    contentType: z.enum(['image/png', 'image/jpeg', 'image/webp']),
    dataBase64: z.string().min(1_000).max(18_000_000),
    generatedBy: z.literal('codex-cli'),
    prompt: z.string().min(80).max(2_000),
  })
  .strict();

const commonDraftFields = {
  body: zEditorialBlogArticleBody,
  editorialRationale: z.string().min(80).max(600),
  excerpt: z.string().min(80).max(260),
  keywords: z.array(z.string().min(3).max(48)).min(6).max(12),
  manhwaTitle: z.string().min(2).max(120),
  manhwaType: z.enum(['manga', 'manhua', 'manhwa']),
  metaDescription: z.string().min(120).max(165),
  searchIntent: z.string().min(12).max(160),
  slugBase: z.string().min(8).max(86),
  title: z.string().min(18).max(86),
};

const recommendationDraftFields = {
  ...commonDraftFields,
  category: z.literal('recommendations'),
  featuredTitles: z.array(z.string().min(2).max(120)).min(2).max(5),
  recommendationEvidence: z.array(zCodexBlogTopicEvidence).min(2).max(5),
};

const manhwaNewsDraftFields = {
  ...commonDraftFields,
  category: z.literal('manhwa_news'),
  topicEvidence: zCodexBlogTopicEvidence,
};

const appUpdateDraftFields = {
  ...commonDraftFields,
  appUpdateEvidence: zBlogAppUpdateEvidence,
  category: z.literal('app_updates'),
};

const zCodexRecommendationDraft = z.object(recommendationDraftFields).strict();
const zCodexManhwaNewsDraft = z.object(manhwaNewsDraftFields).strict();
const zCodexAppUpdateDraft = z.object(appUpdateDraftFields).strict();

export const zCodexBlogArticleDraft = z
  .discriminatedUnion('category', [
    zCodexRecommendationDraft,
    zCodexManhwaNewsDraft,
    zCodexAppUpdateDraft,
  ])
  .superRefine(assertDraftCategoryConsistency);

export const zCodexBlogArticlePublishPayload = z
  .discriminatedUnion('category', [
    z
      .object({
        ...recommendationDraftFields,
        heroImage: zCodexBlogHeroImagePayload.optional(),
      })
      .strict(),
    z
      .object({
        ...manhwaNewsDraftFields,
        heroImage: zCodexBlogHeroImagePayload.optional(),
      })
      .strict(),
    z
      .object({
        ...appUpdateDraftFields,
        heroImage: zCodexBlogHeroImagePayload.optional(),
      })
      .strict(),
  ])
  .superRefine(assertDraftCategoryConsistency);

export type CodexBlogArticleDraft = z.infer<typeof zCodexBlogArticleDraft>;
export type CodexBlogArticlePublishPayload = z.infer<
  typeof zCodexBlogArticlePublishPayload
>;

export interface BuildCodexBlogArticlePromptInput {
  candidates: TrendingMangaCandidate[];
  category: Exclude<BlogArticleCategory, 'app_updates'>;
  date: string;
  existingTopics: ExistingBlogTopic[];
}

export interface BuildCodexBlogNoopPromptInput {
  reason: string;
  rejectedCandidates?: readonly { reason: string; title: string }[];
}

export const buildCodexBlogNoopPrompt = (
  input: BuildCodexBlogNoopPromptInput
) =>
  [
    CODEX_BLOG_NOOP_MARKER,
    `Reason: ${input.reason}`,
    ...(input.rejectedCandidates && input.rejectedCandidates.length > 0
      ? [
          'Rejected candidates:',
          ...input.rejectedCandidates
            .slice(0, 12)
            .map((candidate) => `- ${candidate.title}: ${candidate.reason}`),
        ]
      : []),
  ].join('\n');

export const buildCodexBlogArticlePrompt = (
  input: BuildCodexBlogArticlePromptInput
): string => {
  const builders: Record<
    BuildCodexBlogArticlePromptInput['category'],
    (builderInput: BuildCodexBlogArticlePromptInput) => string
  > = {
    manhwa_news: buildCodexManhwaNewsArticlePrompt,
    recommendations: buildCodexRecommendationArticlePrompt,
  };

  return builders[input.category](input);
};

export const buildCodexAppUpdateArticlePrompt = (input: {
  date: string;
  evidence: z.infer<typeof zBlogAppUpdateEvidence>;
}): string =>
  [
    ...buildCommonPromptHeader({
      category: 'app_updates',
      date: input.date,
      role: 'Write one concise, user-facing Nayovi application update article from the verified GitHub commit batch below.',
    }),
    'App update rules:',
    '- Copy appUpdateEvidence exactly. Do not add, remove, reorder, or alter commits or SHA values.',
    '- Explain only user-visible benefits, fixes, or behavior changes. Translate technical commit language into plain reader language.',
    '- Group related commits into one coherent release note. Never create one section per commit.',
    '- Do not reveal implementation internals, file paths, infrastructure, credentials, exploit details, vulnerabilities, or security-sensitive information.',
    '- If a commit cannot be explained safely as a user benefit, omit it from the prose while preserving it in appUpdateEvidence.',
    '- Set manhwaTitle to "Nayovi" and manhwaType to "manhwa" for compatibility with the existing image pipeline.',
    '- Use the exact GitHub commit URLs as body.sources and use the commit authored date as publishedAt.',
    '- Use 2 to 4 short sections. Keep body.faqs as an empty array.',
    '',
    'JSON shape:',
    JSON.stringify(buildAppUpdateJsonShape(input.evidence), null, 2),
    '',
    'Verified GitHub commit batch:',
    JSON.stringify(input.evidence, null, 2),
  ].join('\n');

function buildCodexRecommendationArticlePrompt(
  input: BuildCodexBlogArticlePromptInput
): string {
  return [
    ...buildCommonPromptHeader({
      category: 'recommendations',
      date: input.date,
      role: 'Write one useful, curated Nayovi recommendation article that helps readers discover several verified manga, manhwa, or manhua titles.',
    }),
    'Recommendation rules:',
    '- Choose 2 to 5 different titles from the verified candidate list and copy their evidence exactly into recommendationEvidence.',
    '- Set featuredTitles to those exact selected titles in the same order.',
    '- Use a discovery, comparison, mood, genre, or reader-fit angle. This is not a news report.',
    '- Give a concrete reason to try each selection. Avoid generic praise and avoid repeating the same paragraph pattern for every title.',
    '- Include at least one verified candidate URL per selected title in body.sources.',
    '- Use 2 to 4 naturally varied sections. Keep body.faqs empty unless one subject-specific question is indispensable; never use generic Nayovi FAQs.',
    '',
    'JSON shape:',
    JSON.stringify(buildRecommendationJsonShape(), null, 2),
    '',
    'Verified candidate list:',
    buildCandidateList(input.candidates),
    '',
    'Already used topics and titles:',
    buildExistingTopicList(input.existingTopics),
  ].join('\n');
}

function buildCodexManhwaNewsArticlePrompt(
  input: BuildCodexBlogArticlePromptInput
): string {
  return [
    ...buildCommonPromptHeader({
      category: 'manhwa_news',
      date: input.date,
      role: 'Write one timely, factual Nayovi manhwa news article about a recent release, announcement, new season, return, or meaningful development.',
    }),
    'Manhwa news rules:',
    '- Choose exactly one title from the verified candidate list and copy its topicEvidence exactly.',
    '- Use live web search to find and verify a real recent development. Do not turn the article into a generic recommendation list.',
    '- Include specific dates and at least one reliable dated source published during the previous 120 days.',
    '- Include at least one verified candidate URL and the recent news source in body.sources.',
    '- Clearly separate confirmed facts from cautious interpretation. Never invent an announcement, season, chapter, adaptation, date, quote, or ranking.',
    '- Use 2 to 4 naturally varied sections. Keep body.faqs empty unless one event-specific question is indispensable; never use generic Nayovi FAQs.',
    '',
    'JSON shape:',
    JSON.stringify(buildManhwaNewsJsonShape(), null, 2),
    '',
    'Verified candidate list:',
    buildCandidateList(input.candidates),
    '',
    'Already used topics and titles:',
    buildExistingTopicList(input.existingTopics),
  ].join('\n');
}

function buildCommonPromptHeader(input: {
  category: BlogArticleCategory;
  date: string;
  role: string;
}): string[] {
  return [
    `Prompt version: ${BLOG_CODEX_PROMPT_VERSION}`,
    `Publication date: ${input.date}`,
    `Editorial category: ${input.category}`,
    '',
    input.role,
    '',
    'Hard constraints:',
    '- Return only one valid JSON object. No markdown fences, commentary, or trailing prose.',
    `- Set category and body.category to exactly "${input.category}" and body.version to 2.`,
    '- Keep the article simple: one introduction, 2 to 4 sections made of normal paragraphs, one restrained download callout, sources, and a short rights disclaimer.',
    '- Do not use a reading-profile block, takeaway cards, repeated block templates, or a fixed conclusion formula.',
    '- Default body.faqs to []. A FAQ is allowed only when it is specific to this exact subject and genuinely useful; never add generic questions about hosting, safety, legality, pricing, or downloading Nayovi.',
    '- Vary the introduction, section count, heading style, paragraph rhythm, and ending from previous articles.',
    '- Do not claim Nayovi hosts chapters, bypasses paywalls, or provides pirated content.',
    '- Do not include scanlation, piracy, unauthorized chapter, or third-party APK download links.',
    '- Mention Nayovi naturally. The downloadCallout buttonLabel must be exactly "Download Nayovi".',
    '- The disclaimer must say that Nayovi does not host manga, manhwa, or manhua chapters and readers should respect official releases and rights holders.',
    '',
    'SEO constraints:',
    `- Campaign focus phrases for manga content: ${campaignBlogSeoKeywords.join(', ')}.`,
    `- Relevant search cluster: ${highIntentBlogSeoKeywords.join(', ')}. Use only phrases that fit naturally.`,
    '- Keep title under 86 characters and metaDescription between 120 and 165 characters.',
    '- Use 6 to 12 focused keywords without stuffing.',
  ];
}

function buildEditorialBodyShape(category: BlogArticleCategory) {
  return {
    category,
    disclaimer: 'string',
    downloadCallout: {
      body: 'string',
      buttonLabel: 'Download Nayovi',
      title: 'string',
    },
    faqs: [],
    introduction: 'string',
    sections: [
      {
        heading: 'string',
        paragraphs: ['string'],
      },
    ],
    sources: [
      {
        publishedAt: 'YYYY-MM-DD | null',
        title: 'string',
        url: 'https://example.com/source',
      },
    ],
    version: 2,
  };
}

function buildRecommendationJsonShape() {
  return {
    body: buildEditorialBodyShape('recommendations'),
    category: 'recommendations',
    editorialRationale: 'string',
    excerpt: 'string',
    featuredTitles: ['First verified title', 'Second verified title'],
    keywords: [
      buildRequiredBlogSeoKeyword('manhwa'),
      'manhwa recommendations',
      'string',
      'string',
      'string',
      'string',
    ],
    manhwaTitle: 'Short recommendation theme',
    manhwaType: 'manga | manhua | manhwa',
    metaDescription: 'string',
    recommendationEvidence: [buildTopicEvidenceShape()],
    searchIntent: 'string',
    slugBase: 'string',
    title: 'string',
  };
}

function buildManhwaNewsJsonShape() {
  return {
    body: buildEditorialBodyShape('manhwa_news'),
    category: 'manhwa_news',
    editorialRationale: 'string',
    excerpt: 'string',
    keywords: [
      buildRequiredBlogSeoKeyword('manhwa'),
      'manhwa news',
      'string',
      'string',
      'string',
      'string',
    ],
    manhwaTitle: 'Exact verified title',
    manhwaType: 'manga | manhua | manhwa',
    metaDescription: 'string',
    searchIntent: 'string',
    slugBase: 'string',
    title: 'string',
    topicEvidence: buildTopicEvidenceShape(),
  };
}

function buildAppUpdateJsonShape(
  evidence: z.infer<typeof zBlogAppUpdateEvidence>
) {
  return {
    appUpdateEvidence: evidence,
    body: buildEditorialBodyShape('app_updates'),
    category: 'app_updates',
    editorialRationale: 'string',
    excerpt: 'string',
    keywords: [
      'Nayovi update',
      'Nayovi Android',
      'app improvements',
      'app fixes',
      'manga translation app',
      'Nayovi release notes',
    ],
    manhwaTitle: 'Nayovi',
    manhwaType: 'manhwa',
    metaDescription: 'string',
    searchIntent: 'Nayovi app update and release notes',
    slugBase: 'nayovi-app-update',
    title: 'string',
  };
}

function buildTopicEvidenceShape() {
  return {
    anilistId: 12345,
    canonicalId: 'anilist:12345',
    kitsuId: 'string | null',
    myAnimeListId: 67890,
    sourceUrls: [
      'https://anilist.co/manga/12345/example',
      'https://myanimelist.net/manga/67890/example',
    ],
    titleAliases: ['English title', 'Native title'],
    trendRank: 1,
    trendScore: 100,
    type: 'manhwa',
    verifiedAt: '2026-08-20T00:00:00.000Z',
  };
}

function buildExistingTopicList(existingTopics: ExistingBlogTopic[]) {
  const uniqueTopics = new Map<string, ExistingBlogTopic>();

  for (const topic of existingTopics) {
    const key = normalizeBlogTopicName(topic.manhwaTitle);

    if (key && !uniqueTopics.has(key)) {
      uniqueTopics.set(key, topic);
    }
  }

  const lines = [...uniqueTopics.values()]
    .slice(0, 240)
    .map((topic) => `- ${topic.manhwaTitle} — ${topic.title}`);

  return lines.length > 0 ? lines.join('\n') : '- None yet';
}

function buildCandidateList(candidates: TrendingMangaCandidate[]) {
  return JSON.stringify(
    candidates.map((candidate) => ({
      aliases: candidate.aliases,
      anilistId: candidate.anilistId,
      canonicalId: candidate.canonicalId,
      countryOfOrigin: candidate.countryOfOrigin,
      kitsuId: candidate.kitsuId,
      myAnimeListId: candidate.malId,
      sourceEvidence: candidate.sourceEvidence,
      sourceUrls: candidate.sourceEvidence.map((source) => source.url),
      title: candidate.title,
      trendRank: candidate.trendRank,
      trendRationale: candidate.trendRationale,
      trendScore: candidate.trendScore,
      type: candidate.type,
      verifiedAt: candidate.sourceEvidence[0]?.retrievedAt,
    })),
    null,
    2
  );
}

function assertDraftCategoryConsistency(
  draft: {
    body: { category: BlogArticleCategory };
    category: BlogArticleCategory;
  } & Partial<{
    featuredTitles: string[];
    recommendationEvidence: Array<{ canonicalId: string }>;
  }>,
  context: z.RefinementCtx
): void {
  if (draft.body.category !== draft.category) {
    context.addIssue({
      code: 'custom',
      message: 'body.category must match category.',
      path: ['body', 'category'],
    });
  }

  if (draft.category !== 'recommendations') {
    return;
  }

  const recommendationEvidence = draft.recommendationEvidence ?? [];
  const featuredTitles = draft.featuredTitles ?? [];
  const evidenceIds = new Set(
    recommendationEvidence.map((evidence) => evidence.canonicalId)
  );

  if (
    evidenceIds.size !== recommendationEvidence.length ||
    featuredTitles.length !== recommendationEvidence.length
  ) {
    context.addIssue({
      code: 'custom',
      message:
        'Recommendations require one unique evidence object per featured title.',
      path: ['recommendationEvidence'],
    });
  }
}
