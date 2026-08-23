import { describe, expect, it } from 'vitest';

import { resolveLegacyBlogArticleCategory } from '@/server/blog/legacy-category-policy';

const baseInput = {
  excerpt:
    'A focused guide for readers looking for their next manhwa and a comfortable translation workflow.',
  generationSource: 'codex-cli-cron',
  keywords: ['manhwa', 'Nayovi'],
  manhwaTitle: 'The Heavenly Demon Wants a Quiet Life',
  searchIntent: 'manhwa translation guide',
  slug: 'the-heavenly-demon-wants-a-quiet-life-manhwa-translate-ai-guide',
  title: 'The Heavenly Demon Wants a Quiet Life manhwa translate ai guide',
} as const;

describe('legacy blog category policy', () => {
  it('classifies title spotlights and reading guides as recommendations', () => {
    expect(resolveLegacyBlogArticleCategory(baseInput)).toBe('recommendations');
  });

  it('classifies explicit release announcements as manhwa news', () => {
    expect(
      resolveLegacyBlogArticleCategory({
        ...baseInput,
        generationSource: 'manual-editorial',
        searchIntent: 'official new season announcement',
        slug: 'tower-of-god-new-season-release-date',
        title: 'Tower of God new season release date announced',
      })
    ).toBe('manhwa_news');
  });

  it('classifies explicit Nayovi release notes as app updates', () => {
    expect(
      resolveLegacyBlogArticleCategory({
        ...baseInput,
        manhwaTitle: 'Nayovi',
        searchIntent: 'Nayovi app update',
        slug: 'nayovi-release-notes-version-2',
        title: 'Nayovi version 2 release notes',
      })
    ).toBe('app_updates');
  });

  it('keeps historical guides in recommendations when they mention a season', () => {
    expect(
      resolveLegacyBlogArticleCategory({
        ...baseInput,
        searchIntent: 'manhwa guide before season 2',
        slug: 'study-group-guide-before-season-2',
        title: 'Study Group translate manhwa ai guide before Season 2',
      })
    ).toBe('recommendations');
  });

  it('keeps daily cron articles in recommendations', () => {
    expect(
      resolveLegacyBlogArticleCategory({
        ...baseInput,
        generationSource: 'daily-cron',
        title: 'A reader guide for a newly announced adaptation',
      })
    ).toBe('recommendations');
  });
});
