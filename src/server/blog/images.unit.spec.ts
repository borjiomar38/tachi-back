import { describe, expect, it } from 'vitest';

import {
  buildBlogTopicHeroImagePrompt,
  normalizeBlogHeroObjectMetadata,
} from '@/server/blog/images';
import {
  combineBlogImageReviews,
  runAnimeMangaImageReviewAgent,
  runHeroImageUxReviewAgent,
} from '@/server/blog/review-agents';

describe('blog hero image prompts', () => {
  it('passes review for a Codex-selected urban action manhwa topic', () => {
    const topic = {
      angle:
        'Teenage Mercenary is trending because of anime development and current WEBTOON momentum.',
      manhwaTitle: 'Teenage Mercenary',
      manhwaType: 'manhwa' as const,
      searchIntent: 'teenage mercenary manhwa translate ai',
    };
    const imagePrompt = buildBlogTopicHeroImagePrompt(topic);
    const imageAlt =
      'AI-generated Teenage Mercenary manhwa translate AI hero image for Nayovi OCR translation.';
    const review = combineBlogImageReviews([
      runAnimeMangaImageReviewAgent({
        imageAlt,
        imagePrompt,
        topic,
      }),
      runHeroImageUxReviewAgent({
        imagePrompt,
      }),
    ]);

    expect(review.passed).toBe(true);
  });

  it('normalizes object metadata values for HTTP headers', () => {
    expect(
      normalizeBlogHeroObjectMetadata({
        'blog-image-prompt': 'Line one\nLine two\r\nCafé \u0000 value',
      })
    ).toEqual({
      'blog-image-prompt': 'Line one Line two Cafe value',
    });
  });
});
