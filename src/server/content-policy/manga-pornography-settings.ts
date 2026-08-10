import { z } from 'zod';

import { envServer } from '@/env/server';
import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';

export const mangaPornographyAutomationSettingsConfigKey =
  'content_policy_manga_pornography_automation:2026-08-09.v1';

type AppConfigDelegate = Pick<typeof db.appConfig, 'findUnique' | 'upsert'>;

export interface MangaPornographySettingsDbClient {
  appConfig?: AppConfigDelegate;
}

export interface MangaPornographyAutomationSettings {
  defaultEnabled: boolean;
  enabled: boolean;
  updatedAt: Date | null;
}

export interface MangaPornographySettingsDependencies {
  dbClient?: MangaPornographySettingsDbClient;
  defaultEnabled?: boolean;
}

export interface MangaPornographyAutomationSettingsUpdateInput {
  enabled: boolean;
  updatedBy?: string | null;
}

const zStoredMangaPornographyAutomationSettings = z
  .object({
    enabled: z.boolean(),
    updatedBy: z.string().trim().min(1).max(200).optional(),
  })
  .passthrough();

const zUpdateMangaPornographyAutomationSettingsInput = z.object({
  enabled: z.boolean(),
  updatedBy: z.string().trim().min(1).max(200).nullish(),
});

export async function getMangaPornographyAutomationSettings(
  dependencies: MangaPornographySettingsDependencies = {}
): Promise<MangaPornographyAutomationSettings> {
  const defaultEnabled =
    dependencies.defaultEnabled ??
    envServer.OPENAI_PORNOGRAPHY_MODERATION_ENABLED;
  const appConfig = (dependencies.dbClient ?? db).appConfig;

  if (!appConfig) {
    return buildDefaultSettings(defaultEnabled);
  }

  const entry = await appConfig.findUnique({
    select: {
      updatedAt: true,
      value: true,
    },
    where: {
      key: mangaPornographyAutomationSettingsConfigKey,
    },
  });
  const parsed = zStoredMangaPornographyAutomationSettings.safeParse(
    entry?.value
  );

  if (!entry || !parsed.success) {
    return buildDefaultSettings(defaultEnabled);
  }

  return {
    defaultEnabled,
    enabled: parsed.data.enabled,
    updatedAt: entry.updatedAt,
  };
}

export async function updateMangaPornographyAutomationSettings(
  input: MangaPornographyAutomationSettingsUpdateInput,
  dependencies: MangaPornographySettingsDependencies = {}
): Promise<MangaPornographyAutomationSettings> {
  const parsed = zUpdateMangaPornographyAutomationSettingsInput.parse(input);
  const defaultEnabled =
    dependencies.defaultEnabled ??
    envServer.OPENAI_PORNOGRAPHY_MODERATION_ENABLED;
  const appConfig = (dependencies.dbClient ?? db).appConfig;

  if (!appConfig) {
    throw new Error('Manga pornography automation settings are unavailable.');
  }

  const updatedBy = parsed.updatedBy?.trim() || null;
  const value = {
    enabled: parsed.enabled,
    ...(updatedBy ? { updatedBy } : {}),
  } satisfies Prisma.InputJsonObject;
  const entry = await appConfig.upsert({
    create: {
      key: mangaPornographyAutomationSettingsConfigKey,
      value,
    },
    select: {
      updatedAt: true,
    },
    update: {
      value,
    },
    where: {
      key: mangaPornographyAutomationSettingsConfigKey,
    },
  });

  return {
    defaultEnabled,
    enabled: parsed.enabled,
    updatedAt: entry.updatedAt,
  };
}

function buildDefaultSettings(
  defaultEnabled: boolean
): MangaPornographyAutomationSettings {
  return {
    defaultEnabled,
    enabled: defaultEnabled,
    updatedAt: null,
  };
}
