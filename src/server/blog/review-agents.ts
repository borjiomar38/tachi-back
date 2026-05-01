import {
  BlogAgentReview,
  BlogArticleBody,
  zBlogAgentReview,
} from '@/features/blog/schema';

export function runImageGenerationReviewAgent(input: {
  imageAlt: string;
  imagePrompt: string;
  manhwaTitle: string;
}): BlogAgentReview {
  const checks = [
    {
      note: 'Prompt requests an original composition instead of copying known characters.',
      passed: /original/i.test(input.imagePrompt),
    },
    {
      note: 'Prompt keeps the dark cinematic manhwa mood used across the login and public pages.',
      passed: /dark|cinematic|noir/i.test(input.imagePrompt),
    },
    {
      note: 'Prompt avoids readable text so generated art does not create broken typography.',
      passed: /no readable text|without readable text|no text/i.test(
        input.imagePrompt
      ),
    },
    {
      note: 'Image alt text names the article mood without pretending the artwork is an official panel.',
      passed:
        input.imageAlt.length >= 24 &&
        !input.imageAlt.toLowerCase().includes('official'),
    },
    {
      note: 'Prompt references the article topic for relevance.',
      passed: input.imagePrompt
        .toLowerCase()
        .includes(input.manhwaTitle.toLowerCase().split(' ')[0] ?? ''),
    },
  ];

  return buildReview(checks);
}

export function runArticleUxReviewAgent(input: {
  body: BlogArticleBody;
  excerpt: string;
  keywords: string[];
  metaDescription: string;
  title: string;
}): BlogAgentReview {
  const checks = [
    {
      note: 'Article uses the fixed introduction, section, reading profile, CTA, FAQ, and disclaimer structure.',
      passed:
        input.body.sections.length >= 3 &&
        input.body.faqs.length >= 3 &&
        Boolean(input.body.downloadCallout.title),
    },
    {
      note: 'Download CTA is consistent across generated articles.',
      passed: input.body.downloadCallout.buttonLabel === 'Download TachiyomiAT',
    },
    {
      note: 'Metadata stays within search result display limits.',
      passed:
        input.title.length <= 86 &&
        input.metaDescription.length >= 120 &&
        input.metaDescription.length <= 165,
    },
    {
      note: 'Article has enough keyword coverage without becoming a keyword dump.',
      passed: input.keywords.length >= 6 && input.keywords.length <= 12,
    },
    {
      note: 'Excerpt is compact enough for cards and index previews.',
      passed: input.excerpt.length >= 80 && input.excerpt.length <= 260,
    },
    {
      note: 'Legal disclaimer protects the site from appearing to host chapters.',
      passed: /does not host/i.test(input.body.disclaimer),
    },
  ];

  return buildReview(checks);
}

function buildReview(
  checks: Array<{
    note: string;
    passed: boolean;
  }>
) {
  const passedCount = checks.filter((check) => check.passed).length;

  return zBlogAgentReview.parse({
    notes: checks.map((check) =>
      check.passed ? check.note : `Needs attention: ${check.note}`
    ),
    passed: passedCount === checks.length,
    score: Math.round((passedCount / checks.length) * 100),
  });
}
