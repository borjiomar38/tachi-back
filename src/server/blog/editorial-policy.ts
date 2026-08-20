import type {
  BlogArticleCategory,
  EditorialBlogArticleBody,
} from '@/features/blog/schema';

export type ScheduledBlogArticleCategory = Exclude<
  BlogArticleCategory,
  'app_updates'
>;

export interface BlogEditorialCategoryCounts {
  manhwaNews: number;
  recommendations: number;
}

export interface ResolveScheduledBlogCategoryInput {
  candidateCount: number;
  counts: BlogEditorialCategoryCounts;
}

const genericFaqPatterns = [
  /does nayovi host/i,
  /where (?:can|should).*(?:download|install) nayovi/i,
  /why (?:use|choose) nayovi/i,
  /is nayovi (?:free|safe|legal)/i,
];

export const resolveScheduledBlogCategory = (
  input: ResolveScheduledBlogCategoryInput
): ScheduledBlogArticleCategory | null => {
  if (input.candidateCount === 0) {
    return null;
  }

  if (input.candidateCount === 1) {
    return 'manhwa_news';
  }

  return input.counts.recommendations <= input.counts.manhwaNews
    ? 'recommendations'
    : 'manhwa_news';
};

export const assertFutureBlogArticlePolicy = (input: {
  body: EditorialBlogArticleBody;
  category: BlogArticleCategory;
}): void => {
  if (input.body.category !== input.category) {
    throw new Error('The article body category does not match the draft.');
  }

  const headings = input.body.sections.map((section) =>
    normalizeComparableText(section.heading)
  );

  if (new Set(headings).size !== headings.length) {
    throw new Error('Future blog articles must use distinct section headings.');
  }

  const genericFaq = input.body.faqs.find((faq) =>
    genericFaqPatterns.some((pattern) => pattern.test(faq.question))
  );

  if (genericFaq) {
    throw new Error(
      `Generic repeated FAQ is not allowed in future articles: ${genericFaq.question}`
    );
  }

  const uniqueSourceUrls = new Set(
    input.body.sources.map((source) => source.url.toLowerCase())
  );

  if (uniqueSourceUrls.size !== input.body.sources.length) {
    throw new Error('Future blog article sources must be unique.');
  }
};

export const hasRecentNewsSource = (input: {
  body: EditorialBlogArticleBody;
  publicationDate: Date;
  recencyDays?: number;
}): boolean => {
  const recencyDays = input.recencyDays ?? 120;
  const oldestAllowedTimestamp =
    input.publicationDate.getTime() - recencyDays * 24 * 60 * 60 * 1_000;

  return input.body.sources.some((source) => {
    if (!source.publishedAt) {
      return false;
    }

    const timestamp = Date.parse(`${source.publishedAt}T00:00:00.000Z`);

    return (
      Number.isFinite(timestamp) &&
      timestamp >= oldestAllowedTimestamp &&
      timestamp <= input.publicationDate.getTime()
    );
  });
};

export const assertSafeAppUpdateCopy = (
  body: EditorialBlogArticleBody
): void => {
  const copy = [
    body.introduction,
    body.disclaimer,
    ...body.sections.flatMap((section) => [
      section.heading,
      ...section.paragraphs,
    ]),
  ].join(' ');
  const sensitivePattern =
    /\b(?:cve-\d+|credential|database password|exploit|private endpoint|secret key|token leak|vulnerabilit)\w*\b/i;

  if (sensitivePattern.test(copy)) {
    throw new Error(
      'Application update articles must not expose security-sensitive details.'
    );
  }
};

function normalizeComparableText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
