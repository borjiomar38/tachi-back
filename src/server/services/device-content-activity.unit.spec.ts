import { beforeEach, describe, expect, it, vi } from 'vitest';

import { recordDeviceContentVisit } from '@/server/services/device-content-activity';

describe('device content activity', () => {
  const extensionBlockFindUnique = vi.fn();
  const deviceFindUnique = vi.fn();
  const deviceCreate = vi.fn();
  const deviceUpdate = vi.fn();
  const extensionVisitUpsert = vi.fn();
  const mangaVisitUpsert = vi.fn();
  const registerPornographyAssessment = vi.fn();
  const schedulePornographyAssessment = vi.fn();
  const policyLog = {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  };
  const dbClient = {
    device: {
      create: deviceCreate,
      findUnique: deviceFindUnique,
      update: deviceUpdate,
    },
    deviceExtensionVisit: {
      upsert: extensionVisitUpsert,
    },
    deviceMangaVisit: {
      upsert: mangaVisitUpsert,
    },
    extensionBlock: {
      findUnique: extensionBlockFindUnique,
    },
  };

  beforeEach(() => {
    extensionBlockFindUnique.mockReset();
    deviceFindUnique.mockReset();
    deviceCreate.mockReset();
    deviceUpdate.mockReset();
    extensionVisitUpsert.mockReset();
    mangaVisitUpsert.mockReset();
    registerPornographyAssessment.mockReset();
    schedulePornographyAssessment.mockReset();
  });

  it('records exact remote image URLs before the installation redeems', async () => {
    extensionBlockFindUnique.mockResolvedValue(null);
    deviceFindUnique.mockResolvedValue(null);
    deviceCreate.mockResolvedValue({ id: 'device-pending-1' });
    extensionVisitUpsert.mockResolvedValue({ id: 'extension-visit-1' });
    mangaVisitUpsert.mockResolvedValue({ id: 'manga-visit-1' });
    registerPornographyAssessment.mockResolvedValue({
      assessmentId: 'assessment-1',
      identityKey: 'identity-1',
      inputFingerprint: 'fingerprint-1',
      shouldSchedule: true,
      status: 'pending',
    });

    const result = await recordDeviceContentVisit(
      {
        extension: {
          iconUrl: 'https://extensions.example/icon.png',
          lang: 'en',
          name: 'Webtoon',
          packageName: 'eu.kanade.tachiyomi.extension.en.webtoon',
        },
        installationId: 'android-installation-12345678',
        manga: {
          thumbnailUrl: 'https://cdn.example/cover.jpg',
          title: 'Omniscient Reader',
          url: 'https://example.com/title/omniscient-reader',
        },
        source: {
          id: '123456789',
          language: 'en',
          name: 'Webtoon',
        },
      },
      {
        dbClient: dbClient as never,
        log: policyLog,
        now: new Date('2026-07-19T15:30:00.000Z'),
        registerPornographyAssessment,
        schedulePornographyAssessment,
      }
    );

    expect(result).toMatchObject({ accepted: true, blocked: false });
    expect(deviceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          installationId: 'android-installation-12345678',
          status: 'pending',
        }),
      })
    );
    expect(mangaVisitUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          thumbnailUrl: 'https://cdn.example/cover.jpg',
        }),
      })
    );
    expect(extensionVisitUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          iconUrl: 'https://extensions.example/icon.png',
        }),
      })
    );
    expect(registerPornographyAssessment).toHaveBeenCalledWith(
      {
        extensionName: 'Webtoon',
        extensionPackageName: 'eu.kanade.tachiyomi.extension.en.webtoon',
        mangaUrl: 'https://example.com/title/omniscient-reader',
        sourceId: '123456789',
        sourceName: 'Webtoon',
        thumbnailUrl: 'https://cdn.example/cover.jpg',
        title: 'Omniscient Reader',
      },
      expect.objectContaining({
        dbClient,
        log: policyLog,
        now: expect.any(Function),
      })
    );
    expect(schedulePornographyAssessment).toHaveBeenCalledWith('assessment-1');
  });
});
