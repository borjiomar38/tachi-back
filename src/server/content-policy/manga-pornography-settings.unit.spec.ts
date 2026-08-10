import { describe, expect, it, vi } from 'vitest';

import {
  getMangaPornographyAutomationSettings,
  mangaPornographyAutomationSettingsConfigKey,
  type MangaPornographySettingsDbClient,
  updateMangaPornographyAutomationSettings,
} from './manga-pornography-settings';

const UPDATED_AT = new Date('2026-08-09T15:00:00.000Z');

describe('manga pornography automation settings', () => {
  it.each([true, false])(
    'uses the supplied environment default when AppConfig is unavailable (%s)',
    async (defaultEnabled) => {
      await expect(
        getMangaPornographyAutomationSettings({
          dbClient: {},
          defaultEnabled,
        })
      ).resolves.toEqual({
        defaultEnabled,
        enabled: defaultEnabled,
        updatedAt: null,
      });
    }
  );

  it('lets the persisted value override the environment default', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      updatedAt: UPDATED_AT,
      value: {
        enabled: true,
        updatedBy: 'admin-1',
      },
    });
    const dbClient = {
      appConfig: { findUnique, upsert: vi.fn() },
    } as unknown as MangaPornographySettingsDbClient;

    await expect(
      getMangaPornographyAutomationSettings({
        dbClient,
        defaultEnabled: false,
      })
    ).resolves.toEqual({
      defaultEnabled: false,
      enabled: true,
      updatedAt: UPDATED_AT,
    });
    expect(findUnique).toHaveBeenCalledWith({
      select: {
        updatedAt: true,
        value: true,
      },
      where: {
        key: mangaPornographyAutomationSettingsConfigKey,
      },
    });
  });

  it('falls back safely when the persisted payload is malformed', async () => {
    const dbClient = {
      appConfig: {
        findUnique: vi.fn().mockResolvedValue({
          updatedAt: UPDATED_AT,
          value: { enabled: 'yes' },
        }),
        upsert: vi.fn(),
      },
    } as unknown as MangaPornographySettingsDbClient;

    await expect(
      getMangaPornographyAutomationSettings({
        dbClient,
        defaultEnabled: false,
      })
    ).resolves.toEqual({
      defaultEnabled: false,
      enabled: false,
      updatedAt: null,
    });
  });

  it('persists a versioned boolean setting and its optional reviewer', async () => {
    const upsert = vi.fn().mockResolvedValue({ updatedAt: UPDATED_AT });
    const dbClient = {
      appConfig: { findUnique: vi.fn(), upsert },
    } as unknown as MangaPornographySettingsDbClient;

    await expect(
      updateMangaPornographyAutomationSettings(
        { enabled: false, updatedBy: ' admin-42 ' },
        { dbClient, defaultEnabled: true }
      )
    ).resolves.toEqual({
      defaultEnabled: true,
      enabled: false,
      updatedAt: UPDATED_AT,
    });
    expect(upsert).toHaveBeenCalledWith({
      create: {
        key: mangaPornographyAutomationSettingsConfigKey,
        value: {
          enabled: false,
          updatedBy: 'admin-42',
        },
      },
      select: {
        updatedAt: true,
      },
      update: {
        value: {
          enabled: false,
          updatedBy: 'admin-42',
        },
      },
      where: {
        key: mangaPornographyAutomationSettingsConfigKey,
      },
    });
  });
});
