import { describe, expect, it } from 'vitest';

import { buildSearchAliases, buildSourceDiscoveryPlan } from './service';

describe('source discovery service', () => {
  it('builds normalized title aliases for cross-source search', () => {
    expect(
      buildSearchAliases(
        'Infinite Martial Arts: Landing in the Future 10,000 Years'
      )
    ).toEqual([
      'Infinite Martial Arts: Landing in the Future 10,000 Years',
      'Infinite Martial Arts Landing in the Future 10 000 Years',
      'Infinite Martial Arts',
      'Landing in the Future 10,000 Years',
      'Infinite Martial Arts Landing in Future 10 000 Years',
      'infinite martial arts landing in the future 10 000 years',
    ]);
  });

  it('returns installable extension candidates with theme and adapter metadata', async () => {
    const plan = await buildSourceDiscoveryPlan(
      {
        maxCandidates: 10,
        preferredLanguages: ['en'],
        query: 'Full Awakening',
        targetChapter: 123,
      },
      {
        extensionIndexItems: [
          {
            apk: 'tachiyomi-en.asura-v1.0.0.apk',
            code: 1,
            lang: 'en',
            name: 'Tachiyomi: Asura Scans',
            nsfw: 0,
            pkg: 'eu.kanade.tachiyomi.extension.en.asura',
            sources: [
              {
                baseUrl: 'https://asuracomic.net',
                id: '1',
                lang: 'en',
                name: 'Asura Scans',
              },
            ],
            version: '1.0.0',
          },
          {
            apk: 'tachiyomi-zh.reader-v1.0.0.apk',
            code: 1,
            lang: 'zh',
            name: 'Tachiyomi: Generic Reader',
            nsfw: 0,
            pkg: 'eu.kanade.tachiyomi.extension.zh.reader',
            sources: [
              {
                baseUrl: 'https://reader.example',
                id: '2',
                lang: 'zh',
                name: 'Generic Reader',
              },
            ],
            version: '1.0.0',
          },
          {
            apk: 'tachiyomi-en.nsfw-v1.0.0.apk',
            code: 1,
            lang: 'en',
            name: 'Tachiyomi: NSFW Source',
            nsfw: 1,
            pkg: 'eu.kanade.tachiyomi.extension.en.nsfw',
            sources: [
              {
                baseUrl: 'https://nsfw.example',
                id: '3',
                lang: 'en',
                name: 'NSFW Source',
              },
            ],
            version: '1.0.0',
          },
        ],
        now: () => new Date('2026-04-27T00:00:00.000Z'),
        sourceThemeHints: [
          {
            baseUrl: 'https://asuracomic.net',
            extensionName: 'Asura Scans',
            themeKey: 'madara',
          },
        ],
      }
    );

    expect(plan).toMatchObject({
      aliasStrategy: 'deterministic',
      generatedAt: '2026-04-27T00:00:00.000Z',
      query: 'Full Awakening',
      targetChapter: 123,
    });
    expect(plan.candidates).toHaveLength(2);
    const firstCandidate = plan.candidates[0];
    expect(firstCandidate).toBeDefined();
    expect(firstCandidate).toMatchObject({
      adapterKey: 'asurascans',
      apkName: 'tachiyomi-en.asura-v1.0.0.apk',
      baseUrl: 'https://asuracomic.net',
      packageName: 'eu.kanade.tachiyomi.extension.en.asura',
      sourceId: '1',
      themeKey: 'madara',
    });
    expect(firstCandidate?.reasonCodes).toContain('supported_adapter');
    expect(firstCandidate?.reasonCodes).toContain('preferred_language');
    expect(
      plan.candidates.map((candidate) => candidate.sourceId)
    ).not.toContain('3');
  });
});
