import { describe, expect, it } from 'vitest';

import { buildPublicPageHead } from '@/features/public/head';
import { resolvePricingSeoCopy } from '@/features/public/pricing-seo';

describe('pricing page SEO', () => {
  it('leads with the free trial and one-time token offer', () => {
    const head = buildPublicPageHead(
      'Translation Token Packs for Android',
      'Nayovi is free to use. Buy one-time token packs for translations and optional AI features, without a subscription.',
      '/pricing',
      { titleSuffix: 'Nayovi' }
    );

    expect(head.meta).toContainEqual({
      title:
        'Manga Translator Pricing: Free Trial & Token Packs | Nayovi',
    });
    expect(head.meta).toContainEqual({
      content:
        "Try Nayovi's Android manga translator free, with no card required. Buy one-time translation tokens only when you need more. No subscription.",
      name: 'description',
    });
    const canonical = head.links.find((link) => link.rel === 'canonical');

    expect(canonical).toBeDefined();
    expect(new URL(canonical?.href ?? '').pathname).toBe('/pricing');
  });

  it('keeps the visible offer aligned with the WebPage structured data', () => {
    const head = buildPublicPageHead(
      'Translation Token Packs for Android',
      'Nayovi is free to use. Buy one-time token packs for translations and optional AI features, without a subscription.',
      '/pricing',
      { titleSuffix: 'Nayovi' }
    );
    const structuredData = head.meta.find(
      (entry) => 'script:ld+json' in entry
    )?.['script:ld+json'];
    const webPage = structuredData?.['@graph'].find(
      (entry: Record<string, unknown>) => entry['@type'] === 'WebPage'
    );

    expect(webPage).toMatchObject({
      description:
        "Try Nayovi's Android manga translator free, with no card required. Buy one-time translation tokens only when you need more. No subscription.",
      name: 'Manga Translator Pricing: Free Trial & Token Packs | Nayovi',
      url: expect.stringMatching(/\/pricing$/),
    });
  });

  it('uses the French pricing metadata for French visitors', () => {
    const copy = resolvePricingSeoCopy({
      description: 'Original description',
      language: 'fr',
      pageTitle: 'Original title',
      path: '/pricing',
    });

    expect(copy).toEqual({
      description:
        'Essayez gratuitement le traducteur de manga Android de Nayovi, sans carte bancaire. Achetez ensuite des tokens ponctuellement, sans abonnement.',
      pageTitle:
        'Tarifs du traducteur de manga : essai gratuit et packs de tokens',
    });
  });

  it('leaves other public pages unchanged', () => {
    expect(
      resolvePricingSeoCopy({
        description: 'Download the Android app.',
        language: 'en',
        pageTitle: 'Download Nayovi',
        path: '/download',
      })
    ).toEqual({
      description: 'Download the Android app.',
      pageTitle: 'Download Nayovi',
    });
  });
});
