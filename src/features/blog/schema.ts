import { z } from 'zod';

export const blogArticleCategories = [
  'recommendations',
  'manhwa_news',
  'app_updates',
] as const;

export const zBlogArticleCategory = z.enum(blogArticleCategories);

export type BlogArticleCategory = z.infer<typeof zBlogArticleCategory>;

export const blogArticleCategoryLabels: Record<BlogArticleCategory, string> = {
  app_updates: 'App updates',
  manhwa_news: 'Manhwa news',
  recommendations: 'Recommendations',
};

export const zBlogArticleSection = z.object({
  body: z.string().min(80),
  heading: z.string().min(8).max(96),
  takeaways: z.array(z.string().min(8).max(160)).min(2).max(4),
});

export const zBlogArticleFaq = z.object({
  answer: z.string().min(40).max(520),
  question: z.string().min(12).max(140),
});

export const zLegacyBlogArticleBody = z.object({
  disclaimer: z.string().min(40).max(520),
  downloadCallout: z.object({
    body: z.string().min(40).max(420),
    buttonLabel: z.string().min(8).max(48),
    title: z.string().min(8).max(96),
  }),
  faqs: z.array(zBlogArticleFaq).min(3).max(5),
  introduction: z.string().min(120).max(1_200),
  readingProfile: z.object({
    bestFor: z.string().min(20).max(260),
    pacing: z.string().min(20).max(180),
    tone: z.string().min(20).max(180),
  }),
  sections: z.array(zBlogArticleSection).min(3).max(6),
});

export const zEditorialBlogArticleSection = z
  .object({
    heading: z.string().min(8).max(96),
    paragraphs: z.array(z.string().min(80).max(1_200)).min(1).max(3),
  })
  .strict();

export const zEditorialBlogArticleSource = z
  .object({
    publishedAt: z.iso.date().nullable(),
    title: z.string().min(4).max(160),
    url: z.url(),
  })
  .strict();

export const zEditorialBlogArticleBody = z
  .object({
    category: zBlogArticleCategory,
    disclaimer: z.string().min(40).max(520),
    downloadCallout: z
      .object({
        body: z.string().min(40).max(420),
        buttonLabel: z.literal('Download Nayovi'),
        title: z.string().min(8).max(96),
      })
      .strict(),
    faqs: z.array(zBlogArticleFaq).max(2).default([]),
    introduction: z.string().min(120).max(1_200),
    sections: z.array(zEditorialBlogArticleSection).min(2).max(4),
    sources: z.array(zEditorialBlogArticleSource).min(1).max(10),
    version: z.literal(2),
  })
  .strict();

export const zBlogArticleBody = z.union([
  zEditorialBlogArticleBody,
  zLegacyBlogArticleBody,
]);

export const zBlogAgentReview = z.object({
  notes: z.array(z.string()).min(1).max(6),
  passed: z.boolean(),
  score: z.number().min(0).max(100),
});

export interface BlogArticleSummary {
  category: BlogArticleCategory | null;
  excerpt: string;
  heroImageUrl: string | null;
  imageAlt: string;
  imagePrompt: string;
  keywords: string[];
  manhwaTitle: string;
  manhwaType: string;
  publishedAt: string;
  slug: string;
  title: string;
  updatedAt: string;
}

export interface BlogArticlePagination {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  pageEnd: number;
  pageSize: number;
  pageStart: number;
  totalItems: number;
  totalPages: number;
}

export interface BlogArticleSummaryPage {
  articles: BlogArticleSummary[];
  pagination: BlogArticlePagination;
}

export interface BlogArticleDetail extends BlogArticleSummary {
  body: BlogArticleBody;
  heroImageUrl: string | null;
  imageReview: BlogAgentReview | null;
  metaDescription: string;
  searchIntent: string;
  uxReview: BlogAgentReview | null;
}

export type BlogAgentReview = z.infer<typeof zBlogAgentReview>;
export type BlogArticleBody = z.infer<typeof zBlogArticleBody>;
export type EditorialBlogArticleBody = z.infer<
  typeof zEditorialBlogArticleBody
>;
export type LegacyBlogArticleBody = z.infer<typeof zLegacyBlogArticleBody>;

export const isEditorialBlogArticleBody = (
  body: BlogArticleBody
): body is EditorialBlogArticleBody => 'version' in body && body.version === 2;
