import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { BlogEditorialArticleData } from '@/features/blog/blog-editorial-article';
import {
  BlogEditorialBody,
  BlogEditorialHero,
} from '@/features/blog/blog-editorial-article';

const article: BlogEditorialArticleData = {
  body: {
    category: 'manhwa_news',
    disclaimer:
      'Nayovi does not host manga, manhwa, or manhua chapters. Readers should respect official releases and rights holders.',
    downloadCallout: {
      body: 'Use the official Nayovi Android download to continue with a clear reading and translation workflow for material you can legally access.',
      buttonLabel: 'Download Nayovi',
      title: 'Continue reading with Nayovi',
    },
    faqs: [],
    introduction:
      'This introduction summarizes a verified current development in a direct editorial voice without adding the repeated cards and FAQ blocks used by historical articles.',
    sections: [
      {
        heading: 'The confirmed development',
        paragraphs: [
          'This first paragraph presents a dated and sourced update in plain language, making it clear what changed and why a reader following the title would care now.',
        ],
      },
      {
        heading: 'What readers can expect next',
        paragraphs: [
          'This second paragraph gives useful context without turning the news into a generic recommendation list or a repeated collection of takeaway cards.',
        ],
      },
    ],
    sources: [
      {
        publishedAt: '2026-08-20',
        title: 'Verified source',
        url: 'https://example.com/verified-news',
      },
    ],
    version: 2,
  },
  category: 'manhwa_news',
  excerpt:
    'A concise, verified manhwa news article rendered with the new simple editorial layout and without an automatic FAQ section.',
  heroImageUrl: null,
  imageAlt: 'Original illustration for a current manhwa news article',
  imagePrompt: 'Original cinematic manhwa editorial illustration prompt.',
  imageReview: null,
  keywords: ['manhwa news'],
  manhwaTitle: 'Verified title',
  manhwaType: 'manhwa',
  metaDescription:
    'Read a concise verified manhwa news update with clear dates, useful context, and a simple editorial structure designed for Nayovi readers.',
  publishedAt: '2026-08-20T12:00:00.000Z',
  searchIntent: 'latest verified manhwa news',
  slug: 'verified-manhwa-news',
  title: 'The Latest Verified Manhwa Development Readers Should Know',
  updatedAt: '2026-08-20T12:00:00.000Z',
  uxReview: null,
};

describe('simple editorial blog article', () => {
  it('renders category, prose, sources, and CTA without a FAQ block', () => {
    const html = renderToStaticMarkup(
      <>
        <BlogEditorialHero article={article} />
        <BlogEditorialBody article={article} />
      </>
    );

    expect(html).toContain('Manhwa news');
    expect(html).toContain('The confirmed development');
    expect(html).toContain('Verified source');
    expect(html).toContain('Download Nayovi');
    expect(html).toContain('href="/blog/category/manhwa-news"');
    expect(html).not.toContain('Common questions');
    expect(html).not.toContain('Reading profile');
  });
});
