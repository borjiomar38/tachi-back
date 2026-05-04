import sharp from 'sharp';

import {
  BlogAgentReview,
  BlogArticleBody,
  zBlogAgentReview,
} from '@/features/blog/schema';
import { BlogGenerationTopic } from '@/server/blog/topics';

export function runAnimeMangaImageReviewAgent(input: {
  imageAlt: string;
  imagePrompt: string;
  topic: BlogGenerationTopic;
}): BlogAgentReview {
  const normalizedPrompt = input.imagePrompt.toLowerCase();
  const titleWords = input.topic.manhwaTitle
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length >= 4);

  const checks = [
    {
      note: 'Prompt includes the article title and content type for topic relevance.',
      passed:
        normalizedPrompt.includes(input.topic.manhwaTitle.toLowerCase()) &&
        normalizedPrompt.includes(input.topic.manhwaType),
    },
    {
      note: 'Prompt includes genre or setting cues so the image is not generic app artwork.',
      passed:
        /adventure|cultivation|dungeon|fantasy|murim|occult|palace|romance|tower|urban|ocean|martial|apocalyptic/i.test(
          input.imagePrompt
        ),
    },
    {
      note: 'Prompt connects the manga/manhwa mood to OCR, speech bubbles, or translation workflow.',
      passed: /ocr|speech bubble|translated|translation|reader/i.test(
        input.imagePrompt
      ),
    },
    {
      note: 'Prompt avoids copying protected characters, logos, symbols, costumes, and official panels.',
      passed:
        /no copyrighted characters|without copying copyrighted characters/i.test(
          input.imagePrompt
        ) &&
        /no official artwork|no known character likenesses/i.test(
          input.imagePrompt
        ),
    },
    {
      note: 'Alt text clearly describes original AI-generated article artwork.',
      passed:
        /ai-generated/i.test(input.imageAlt) &&
        !input.imageAlt.toLowerCase().includes('official'),
    },
    {
      note: 'Prompt references the topic strongly enough for a specialist fan to recognize the intended genre lane.',
      passed: titleWords.some((word) => normalizedPrompt.includes(word)),
    },
  ];

  return buildReview(checks);
}

export function runHeroImageUxReviewAgent(input: {
  imagePrompt: string;
}): BlogAgentReview {
  const checks = [
    {
      note: 'Prompt requests a 16:9 blog hero composition for article and card reuse.',
      passed: /16:9|blog hero|hero crop/i.test(input.imagePrompt),
    },
    {
      note: 'Prompt reserves readable left-side space for headline overlays.',
      passed: /left.*headline|headline.*left|readable space on the left/i.test(
        input.imagePrompt
      ),
    },
    {
      note: 'Prompt keeps the focal visual area away from the headline zone.',
      passed: /right|focal area/i.test(input.imagePrompt),
    },
    {
      note: 'Prompt asks for a dark cinematic image that works under the site overlay.',
      passed: /dark|cinematic/i.test(input.imagePrompt),
    },
    {
      note: 'Prompt forbids readable text to avoid broken typography in generated art.',
      passed: /no readable text|no fake ui text|no text/i.test(
        input.imagePrompt
      ),
    },
    {
      note: 'Prompt asks for sharp, polished, uncluttered output suitable for production UI.',
      passed: /sharp|polished|not cluttered|commercial/i.test(
        input.imagePrompt
      ),
    },
  ];

  return buildReview(checks);
}

export async function runGeneratedHeroImageAssetReviewAgent(input: {
  image: Buffer;
}): Promise<BlogAgentReview> {
  const metadata = await sharp(input.image).metadata();
  const stats = await sharp(input.image)
    .extract({
      height: metadata.height ?? 1,
      left: 0,
      top: 0,
      width: Math.max(1, Math.floor((metadata.width ?? 1) * 0.58)),
    })
    .greyscale()
    .stats();
  const leftLuma = stats.channels[0]?.mean ?? 255;
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  const aspectRatio = height > 0 ? width / height : 0;

  const checks = [
    {
      note: 'Generated asset is a wide hero image instead of a square thumbnail.',
      passed: width >= 1400 && aspectRatio >= 1.4,
    },
    {
      note: 'Generated asset has enough vertical resolution for the article hero.',
      passed: height >= 900,
    },
    {
      note: 'Left headline zone is dark enough for the site text overlay.',
      passed: leftLuma <= 145,
    },
    {
      note: 'Generated asset is large enough to avoid tiny or failed image payloads.',
      passed: input.image.byteLength >= 250_000,
    },
    {
      note: 'Generated asset is encoded as a browser-friendly raster image.',
      passed: metadata.format === 'png' || metadata.format === 'jpeg',
    },
  ];

  return buildReview(checks);
}

export function combineBlogImageReviews(
  reviews: BlogAgentReview[]
): BlogAgentReview {
  const score = Math.round(
    reviews.reduce((total, review) => total + review.score, 0) / reviews.length
  );

  return zBlogAgentReview.parse({
    notes: reviews.flatMap((review) => review.notes).slice(0, 6),
    passed: reviews.every((review) => review.passed),
    score,
  });
}

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
