import { describe, expect, it } from 'vitest';

import {
  buildSearchAliases,
  buildSourceDiscoveryPlan,
  calculateSourceDiscoveryPlanTokenCost,
  calculateSourceDiscoveryTitleCorrectionTokenCost,
  calculateSourceDiscoveryVerifyTokenCost,
  generateSourceDiscoveryTitleCorrection,
} from './service';

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
        knownResults: [
          {
            apkName: null,
            baseUrl: 'https://asuracomic.net',
            confidence: 0.98,
            decision: 'match',
            description: 'Cached result',
            extensionIconUrl:
              'https://raw.githubusercontent.com/keiyoushi/extensions/repo/icon/tachiyomi-en.asura.png',
            extensionLang: 'en',
            extensionName: 'Tachiyomi: Asura Scans',
            libVersion: null,
            latestChapterName: 'Chapter 123',
            latestChapterNumber: 123,
            mangaUrl: 'https://asuracomic.net/series/full-awakening',
            matchedAlias: null,
            packageName: 'eu.kanade.tachiyomi.extension.en.asura',
            reason: 'Previously confirmed by a device search',
            repoUrl: null,
            sourceId: '1',
            sourceLanguage: 'en',
            sourceMangaUrl: '/series/full-awakening',
            sourceName: 'Asura Scans',
            thumbnailUrl: null,
            title: 'Full Awakening',
            versionCode: null,
            versionName: null,
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
      aliasStrategy: 'mobile_exact',
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
      libVersion: 1,
      packageName: 'eu.kanade.tachiyomi.extension.en.asura',
      sourceId: '1',
      themeKey: 'madara',
      versionCode: 1,
      versionName: '1.0.0',
    });
    expect(firstCandidate?.reasonCodes).toContain('supported_adapter');
    expect(firstCandidate?.reasonCodes).toContain('preferred_language');
    expect(
      plan.candidates.map((candidate) => candidate.sourceId)
    ).not.toContain('3');
    expect(plan.knownResults).toHaveLength(1);
    expect(plan.knownResults[0]).toMatchObject({
      apkName: 'tachiyomi-en.asura-v1.0.0.apk',
      latestChapterNumber: 123,
      repoUrl: 'https://raw.githubusercontent.com/keiyoushi/extensions/repo',
      packageName: 'eu.kanade.tachiyomi.extension.en.asura',
      title: 'Full Awakening',
      versionCode: 1,
      versionName: '1.0.0',
    });
  });

  it('uses exact catalog aliases without adding broad title fragments', async () => {
    const plan = await buildSourceDiscoveryPlan(
      {
        aliases: ['全职觉醒', 'Full Awakening'],
        catalogAliases: ['全职觉醒', 'Full Awakening'],
        maxCandidates: 5,
        preferredLanguages: ['en', 'zh'],
        query: 'Full Awakening',
      },
      {
        extensionIndexItems: [],
        now: () => new Date('2026-04-27T00:00:00.000Z'),
        sourceThemeHints: [],
      }
    );

    expect(plan.aliases).toEqual(['Full Awakening', '全职觉醒']);
    expect(plan.aliases).not.toContain('Awakening');
  });

  it('prioritizes featured Asian sources used for discovery demos', async () => {
    const plan = await buildSourceDiscoveryPlan(
      {
        maxCandidates: 5,
        preferredLanguages: ['en'],
        query: 'Disastrous Necromancer',
      },
      {
        extensionIndexItems: [
          {
            apk: 'tachiyomi-en.generic-v1.0.0.apk',
            code: 1,
            lang: 'en',
            name: 'Tachiyomi: Generic Comics',
            nsfw: 0,
            pkg: 'eu.kanade.tachiyomi.extension.en.generic',
            sources: [
              {
                baseUrl: 'https://generic.example',
                id: '1',
                lang: 'en',
                name: 'Generic Comics',
              },
            ],
            version: '1.0.0',
          },
          {
            apk: 'tachiyomi-zh.baozi-v1.0.0.apk',
            code: 1,
            lang: 'zh',
            name: 'Tachiyomi: 包子漫畫',
            nsfw: 0,
            pkg: 'eu.kanade.tachiyomi.extension.zh.baozi',
            sources: [
              {
                baseUrl: 'https://baozimh.example',
                id: '2',
                lang: 'zh',
                name: '包子漫畫',
              },
            ],
            version: '1.0.0',
          },
          {
            apk: 'tachiyomi-ja.mangaball-v1.0.0.apk',
            code: 1,
            lang: 'ja',
            name: 'Tachiyomi: Manga Ball',
            nsfw: 0,
            pkg: 'eu.kanade.tachiyomi.extension.ja.mangaball',
            sources: [
              {
                baseUrl: 'https://mangaball.example',
                id: '3',
                lang: 'ja',
                name: 'Manga Ball',
              },
            ],
            version: '1.0.0',
          },
        ],
        now: () => new Date('2026-04-27T00:00:00.000Z'),
        sourceThemeHints: [],
      }
    );

    expect(
      plan.candidates.slice(0, 2).map((candidate) => candidate.sourceId)
    ).toEqual(['2', '3']);
    expect(plan.candidates[0]?.reasonCodes).toContain('featured_asian_source');
  });

  it('charges only when AI title correction is needed', () => {
    expect(calculateSourceDiscoveryPlanTokenCost()).toBe(0);
    expect(
      calculateSourceDiscoveryTitleCorrectionTokenCost({
        attemptedAliases: ['Full Awakening'],
        catalogAliases: ['Full Awakening'],
        observedResultCount: 0,
        query: 'Full Awakening',
        searchedCandidateCount: 120,
      })
    ).toBe(5);
    expect(
      calculateSourceDiscoveryVerifyTokenCost({
        aliases: ['Full Awakening'],
        candidates: Array.from({ length: 120 }, (_, index) => ({
          baseUrl: `https://source-${index}.example`,
          candidateId: `candidate-${index}`,
          extensionName: 'Tachiyomi: Test',
          sourceId: `source-${index}`,
          sourceLanguage: 'en',
          sourceName: 'Test Source',
          title: 'Full Awakening',
        })),
        query: 'Full Awakening',
      })
    ).toBe(0);
  });

  it('filters AI title correction aliases that were already tried', async () => {
    const correction = await generateSourceDiscoveryTitleCorrection(
      {
        attemptedAliases: ['Full Awakening', '全职觉醒'],
        catalogAliases: ['Full Awakening'],
        observedResultCount: 0,
        query: 'Full Awakening',
        searchedCandidateCount: 120,
      },
      {
        generator: async () => ({
          aliases: ['Full Awakening', 'Omniscient Awakening'],
          confidence: 0.81,
          correctedTitle: '全职觉醒',
          reason: 'Found a likely common alias.',
        }),
      }
    );

    expect(correction).toMatchObject({
      aliasStrategy: 'ai_title_correction',
      aliases: ['Omniscient Awakening'],
      canRetry: true,
    });
  });
});
