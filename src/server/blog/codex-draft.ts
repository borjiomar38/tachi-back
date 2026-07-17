import { z } from 'zod';

import { zBlogArticleBody } from '@/features/blog/schema';
import {
  buildRequiredBlogSeoKeyword,
  campaignBlogSeoKeywords,
  highIntentBlogSeoKeywords,
} from '@/features/blog/seo';
import type { ExistingBlogTopic } from '@/server/blog/topic-policy';
import {
  findDuplicateBlogTopic,
  normalizeBlogTopicName,
} from '@/server/blog/topic-policy';
import type { TrendingMangaCandidate } from '@/server/blog/trending-topic-resolver';

export const BLOG_CODEX_PROMPT_VERSION =
  '2026-07-17.real-trending-manga-policy.v1';
export const CODEX_BLOG_NOOP_MARKER = 'TACHI_CODEX_BLOG_NOOP';

export { findDuplicateBlogTopic, normalizeBlogTopicName };
export type { ExistingBlogTopic };

export const zCodexBlogSourceNote = z
  .object({
    title: z.string().min(4).max(160),
    url: z.url(),
    summary: z.string().min(30).max(360),
  })
  .strict();

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
    verifiedAt: z.iso.datetime(),
  })
  .strict();

export const zCodexBlogArticleDraft = z
  .object({
    body: zBlogArticleBody,
    excerpt: z.string().min(80).max(260),
    keywords: z.array(z.string().min(3).max(48)).min(6).max(12),
    manhwaTitle: z.string().min(2).max(120),
    manhwaType: z.enum(['manga', 'manhua', 'manhwa']),
    metaDescription: z.string().min(120).max(165),
    searchIntent: z.string().min(12).max(160),
    slugBase: z.string().min(8).max(86),
    sourceNotes: z.array(zCodexBlogSourceNote).min(2).max(5),
    title: z.string().min(18).max(86),
    topicEvidence: zCodexBlogTopicEvidence,
    trendRationale: z.string().min(80).max(600),
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

export const zCodexBlogArticlePublishPayload = zCodexBlogArticleDraft
  .extend({
    heroImage: zCodexBlogHeroImagePayload.optional(),
  })
  .strict();

export type CodexBlogArticleDraft = z.infer<typeof zCodexBlogArticleDraft>;
export type CodexBlogArticlePublishPayload = z.infer<
  typeof zCodexBlogArticlePublishPayload
>;

export interface BuildCodexBlogArticlePromptInput {
  candidates: TrendingMangaCandidate[];
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
) => {
  const existingTopicList = buildExistingTopicList(input.existingTopics);
  const candidateList = buildCandidateList(input.candidates);

  return [
    `Prompt version: ${BLOG_CODEX_PROMPT_VERSION}`,
    `Publication date: ${input.date}`,
    '',
    'You are generating one production-ready Nayovi SEO blog article.',
    'The backend has already performed live source discovery. Choose exactly one title from the verified candidate list below. Do not choose any title outside that list, even if web search suggests it.',
    '',
    'Hard constraints:',
    '- Return only one valid JSON object. No markdown fences, no commentary, no trailing prose.',
    '- Choose exactly one manga, manhwa, or manhua topic from the verified candidate list.',
    '- Copy canonicalId, anilistId, myAnimeListId, kitsuId, sourceUrls, trendRank, trendScore, verifiedAt, and titleAliases from the chosen candidate. Do not alter those values.',
    '- Do not choose a topic that already exists in the used-title list below. Treat aliases, slugs, Japanese titles, English titles, French titles, spelling, punctuation, subtitles, and casing as duplicates.',
    '- Do not invent a manga/manhwa/manhua title, author, release, adaptation, award, ranking, season, or news item.',
    '- Only make factual claims supported by the candidate sources or by sourceNotes you can verify with live web search. If a fact is not sourced, omit it.',
    '- Do not claim Nayovi hosts chapters, bypasses paywalls, or provides pirated content.',
    '- Do not include external chapter links, scanlation links, piracy links, or download links other than Nayovi.',
    '- Mention Nayovi naturally and make the reader want the official Android download.',
    '- The downloadCallout buttonLabel must be exactly "Download Nayovi".',
    '- The disclaimer must say that Nayovi does not host manga, manhwa, or manhua chapters and users should respect official releases and rights holders.',
    '',
    'SEO constraints:',
    `- Campaign focus phrases: ${campaignBlogSeoKeywords.join(', ')}. For manhwa articles, include both exact phrases naturally in the keywords array and use at least one in the title or meta description when it reads cleanly.`,
    `- Include the exact primary phrase returned by type: manga => "${buildRequiredBlogSeoKeyword('manga')}", manhwa => "${buildRequiredBlogSeoKeyword('manhwa')}", manhua => "${buildRequiredBlogSeoKeyword('manhua')}".`,
    `- Work naturally across this cluster without stuffing: ${highIntentBlogSeoKeywords.join(', ')}.`,
    '- The keywords array must contain 6 to 12 strings. Do not dump the full keyword cluster into keywords; choose only the strongest phrases for this one article.',
    '- Keep the title useful, search-intent focused, and under 86 characters.',
    '- Keep metaDescription between 120 and 165 characters.',
    '- Use 3 to 6 body sections, each with 2 to 4 takeaways.',
    '- Use 3 to 5 FAQs.',
    '',
    'JSON shape:',
    JSON.stringify(
      {
        body: {
          disclaimer: 'string',
          downloadCallout: {
            body: 'string',
            buttonLabel: 'Download Nayovi',
            title: 'string',
          },
          faqs: [
            {
              answer: 'string',
              question: 'string',
            },
          ],
          introduction: 'string',
          readingProfile: {
            bestFor: 'string',
            pacing: 'string',
            tone: 'string',
          },
          sections: [
            {
              body: 'string',
              heading: 'string',
              takeaways: ['string', 'string'],
            },
          ],
        },
        excerpt: 'string',
        keywords: ['string'],
        manhwaTitle: 'string',
        manhwaType: 'manga | manhua | manhwa',
        metaDescription: 'string',
        searchIntent: 'string',
        slugBase: 'string',
        sourceNotes: [
          {
            summary: 'string',
            title: 'string',
            url: 'https://example.com/source',
          },
        ],
        title: 'string',
        topicEvidence: {
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
          verifiedAt: '2026-07-17T00:00:00.000Z',
        },
        trendRationale: 'string',
      },
      null,
      2
    ),
    '',
    'Verified candidate list:',
    candidateList,
    '',
    'Already used topics and titles:',
    existingTopicList,
  ].join('\n');
};

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
