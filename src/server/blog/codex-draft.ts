import { z } from 'zod';

import { zBlogArticleBody } from '@/features/blog/schema';
import {
  buildRequiredBlogSeoKeyword,
  campaignBlogSeoKeywords,
  highIntentBlogSeoKeywords,
} from '@/features/blog/seo';

export const BLOG_CODEX_PROMPT_VERSION = '2026-06-24.codex-manhwa-focus.v1';

export const zCodexBlogSourceNote = z
  .object({
    title: z.string().min(4).max(160),
    url: z.url(),
    summary: z.string().min(30).max(360),
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

export interface ExistingBlogTopic {
  manhwaTitle: string;
  title: string;
}

export interface BuildCodexBlogArticlePromptInput {
  date: string;
  existingTopics: ExistingBlogTopic[];
}

export const buildCodexBlogArticlePrompt = (
  input: BuildCodexBlogArticlePromptInput
) => {
  const existingTopicList = buildExistingTopicList(input.existingTopics);

  return [
    `Prompt version: ${BLOG_CODEX_PROMPT_VERSION}`,
    `Publication date: ${input.date}`,
    '',
    'You are generating one production-ready Nayovi SEO blog article.',
    'Use live web search before choosing the subject. Default to a currently discussed manhwa topic, especially new seasons, rankings, adaptations, awards, or release momentum that can support organic search demand. Choose manga or manhua only when no credible current manhwa topic has a comparable trend signal.',
    '',
    'Hard constraints:',
    '- Return only one valid JSON object. No markdown fences, no commentary, no trailing prose.',
    '- Choose exactly one manga, manhwa, or manhua topic.',
    '- Do not choose a topic that already exists in the used-title list below. Treat spelling, punctuation, subtitles, and casing as irrelevant.',
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
        trendRationale: 'string',
      },
      null,
      2
    ),
    '',
    'Already used topics and titles:',
    existingTopicList,
  ].join('\n');
};

export const normalizeBlogTopicName = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(the|a|an)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

export const findDuplicateBlogTopic = (
  draft: Pick<CodexBlogArticleDraft, 'manhwaTitle' | 'title'>,
  existingTopics: ExistingBlogTopic[]
) => {
  const draftTopic = normalizeBlogTopicName(draft.manhwaTitle);
  const draftTitle = normalizeBlogTopicName(draft.title);

  return (
    existingTopics.find((topic) => {
      const existingTopic = normalizeBlogTopicName(topic.manhwaTitle);
      const existingTitle = normalizeBlogTopicName(topic.title);

      return (
        isSameOrNestedTopic(existingTopic, draftTopic) ||
        isSameOrNestedTopic(existingTitle, draftTopic) ||
        isSameOrNestedTopic(existingTitle, draftTitle) ||
        isSameOrNestedTopic(existingTopic, draftTitle)
      );
    }) ?? null
  );
};

function isSameOrNestedTopic(existingTopic: string, draftTopic: string) {
  if (!existingTopic || !draftTopic) {
    return false;
  }

  if (existingTopic === draftTopic) {
    return true;
  }

  if (existingTopic.length < 4 || draftTopic.length < 4) {
    return false;
  }

  return (
    existingTopic.includes(draftTopic) || draftTopic.includes(existingTopic)
  );
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
