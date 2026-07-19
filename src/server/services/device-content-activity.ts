import { z } from 'zod';

import { db } from '@/server/db';
import { mergeJsonObject } from '@/server/licenses/utils';

import { resolveExtensionAccess } from './extension-access-policy';

const zRemoteImageUrl = z.string().trim().max(2_048).nullish();

export const zDeviceContentVisitInput = z.object({
  extension: z.object({
    iconUrl: zRemoteImageUrl,
    lang: z.string().trim().max(50).nullish(),
    name: z.string().trim().min(1).max(200),
    packageName: z.string().trim().min(1).max(300),
  }),
  installationId: z.string().trim().min(8).max(200),
  manga: z
    .object({
      thumbnailUrl: zRemoteImageUrl,
      title: z.string().trim().min(1).max(500),
      url: z.string().trim().min(1).max(2_048),
    })
    .optional(),
  source: z.object({
    id: z.string().trim().min(1).max(100),
    language: z.string().trim().max(50).nullish(),
    name: z.string().trim().min(1).max(200),
  }),
  visitedAt: z.coerce.date().optional(),
});

export const recordDeviceContentVisit = async (
  rawInput: unknown,
  dependencies: {
    dbClient?: typeof db;
    now?: Date;
  } = {}
) => {
  const input = zDeviceContentVisitInput.parse(rawInput);
  const dbClient = dependencies.dbClient ?? db;
  const visitedAt = input.visitedAt ?? dependencies.now ?? new Date();
  const access = await resolveExtensionAccess(input.extension, {
    dbClient,
  });
  const existingDevice = await dbClient.device.findUnique({
    where: {
      installationId: input.installationId,
    },
    select: {
      id: true,
      metadata: true,
    },
  });
  const device = existingDevice
    ? await dbClient.device.update({
        where: {
          id: existingDevice.id,
        },
        data: {
          lastSeenAt: visitedAt,
          metadata: mergeJsonObject(existingDevice.metadata, {
            lastContentVisitAt: visitedAt.toISOString(),
          }),
        },
        select: {
          id: true,
        },
      })
    : await dbClient.device.create({
        data: {
          installationId: input.installationId,
          lastSeenAt: visitedAt,
          metadata: {
            firstContentVisitAt: visitedAt.toISOString(),
            lastContentVisitAt: visitedAt.toISOString(),
          },
          platform: 'android',
          status: 'pending',
        },
        select: {
          id: true,
        },
      });

  await dbClient.deviceExtensionVisit.upsert({
    where: {
      deviceId_packageName: {
        deviceId: device.id,
        packageName: input.extension.packageName,
      },
    },
    create: {
      deviceId: device.id,
      extensionLang: input.extension.lang,
      extensionName: input.extension.name,
      firstVisitedAt: visitedAt,
      iconUrl: input.extension.iconUrl,
      lastVisitedAt: visitedAt,
      packageName: input.extension.packageName,
      sourceId: input.source.id,
      sourceLanguage: input.source.language,
      sourceName: input.source.name,
    },
    update: {
      extensionLang: input.extension.lang,
      extensionName: input.extension.name,
      iconUrl: input.extension.iconUrl,
      lastVisitedAt: visitedAt,
      sourceId: input.source.id,
      sourceLanguage: input.source.language,
      sourceName: input.source.name,
      visitCount: {
        increment: 1,
      },
    },
  });

  if (input.manga) {
    await dbClient.deviceMangaVisit.upsert({
      where: {
        deviceId_sourceId_mangaUrl: {
          deviceId: device.id,
          mangaUrl: input.manga.url,
          sourceId: input.source.id,
        },
      },
      create: {
        deviceId: device.id,
        extensionLang: input.extension.lang,
        extensionName: input.extension.name,
        extensionPackageName: input.extension.packageName,
        firstVisitedAt: visitedAt,
        lastVisitedAt: visitedAt,
        mangaUrl: input.manga.url,
        sourceId: input.source.id,
        sourceLanguage: input.source.language,
        sourceName: input.source.name,
        thumbnailUrl: input.manga.thumbnailUrl,
        title: input.manga.title,
      },
      update: {
        extensionLang: input.extension.lang,
        extensionName: input.extension.name,
        extensionPackageName: input.extension.packageName,
        lastVisitedAt: visitedAt,
        sourceLanguage: input.source.language,
        sourceName: input.source.name,
        thumbnailUrl: input.manga.thumbnailUrl,
        title: input.manga.title,
        visitCount: {
          increment: 1,
        },
      },
    });
  }

  return {
    accepted: true,
    blocked: !access.allowed,
    deviceId: device.id,
    packageName: input.extension.packageName,
  };
};
