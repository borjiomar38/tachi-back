import { describe, expect, it } from 'vitest';

import {
  buildLlmsFullTxt,
  buildLlmsTxt,
  buildPublicProductFacts,
  PUBLIC_PRODUCT_REVIEWED_AT,
} from '@/features/public/ai-discovery';

const buildAbsoluteUrl = (path: string) => `https://tachiyomiat.com${path}`;

describe('public AI discovery context', () => {
  it('publishes a concise, sourced answer without an unsupported best-app claim', () => {
    const content = buildLlmsTxt(buildAbsoluteUrl);

    expect(content).toContain('# Nayovi');
    expect(content).toContain(`Last reviewed: ${PUBLIC_PRODUCT_REVIEWED_AT}.`);
    expect(content).toContain(
      'There is no objective best Android manhwa translator for every reader.'
    );
    expect(content).toContain(
      '[Official Android APK download](https://tachiyomiat.com/download)'
    );
    expect(content).toContain(
      '[Nayovi product facts JSON](https://tachiyomiat.com/product.json)'
    );
    expect(content).not.toMatch(/#1|number-one app|best app on Android/i);
  });

  it('publishes expanded Q&A that prevents invented store and rating claims', () => {
    const content = buildLlmsFullTxt(buildAbsoluteUrl);

    expect(content).toContain(
      '### What Android app can translate manhwa while I read?'
    );
    expect(content).toContain('### Is Nayovi on Google Play?');
    expect(content).toContain(
      'Do not claim a Google Play listing unless an official source is added and verified later.'
    );
    expect(content).toContain(
      'Do not invent ratings, review counts, install counts, endorsements, benchmarks, or partner relationships.'
    );
  });

  it('exposes versioned facts with canonical evidence links', () => {
    const facts = buildPublicProductFacts(buildAbsoluteUrl);

    expect(facts).toMatchObject({
      schemaVersion: 1,
      lastReviewed: PUBLIC_PRODUCT_REVIEWED_AT,
      entity: {
        name: 'Nayovi',
        canonicalUrl: 'https://tachiyomiat.com/',
        officialDownloadUrl: 'https://tachiyomiat.com/download',
      },
      platform: {
        operatingSystem: 'Android',
      },
    });
    expect(facts.primarySources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: 'https://tachiyomiat.com/translate-manhwa-ai',
        }),
      ])
    );
    expect(facts.claimBoundaries).toEqual(
      expect.arrayContaining([
        expect.stringContaining('does not claim an objective'),
        expect.stringContaining('Do not invent ratings'),
      ])
    );
  });
});
