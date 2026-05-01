import { z } from 'zod';

export const zBlogArticleSection = z.object({
  body: z.string().min(80),
  heading: z.string().min(8).max(96),
  takeaways: z.array(z.string().min(8).max(160)).min(2).max(4),
});

export const zBlogArticleFaq = z.object({
  answer: z.string().min(40).max(520),
  question: z.string().min(12).max(140),
});

export const zBlogArticleBody = z.object({
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

export const zBlogAgentReview = z.object({
  notes: z.array(z.string()).min(1).max(6),
  passed: z.boolean(),
  score: z.number().min(0).max(100),
});

export interface BlogArticleSummary {
  excerpt: string;
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
