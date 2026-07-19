import { db } from '@/server/db';
import { mergeJsonObject } from '@/server/licenses/utils';
import { logger } from '@/server/logger';
import {
  zRegisterMobileInstallationInput,
  zRegisterMobileInstallationResponse,
} from '@/server/mobile-auth/schema';

interface RegisterMobileInstallationDependencies {
  clientIp?: string | null;
  dbClient?: typeof db;
  log?: Pick<typeof logger, 'info'>;
  now?: Date;
  userAgent?: string | null;
}

export const registerMobileInstallation = async (
  rawInput: unknown,
  dependencies: RegisterMobileInstallationDependencies = {}
) => {
  const input = zRegisterMobileInstallationInput.parse(rawInput);
  const dbClient = dependencies.dbClient ?? db;
  const log = dependencies.log ?? logger;
  const now = dependencies.now ?? new Date();
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
          appBuild: input.appBuild,
          appVersion: input.appVersion,
          lastIpAddress: dependencies.clientIp ?? undefined,
          lastSeenAt: now,
          locale: input.locale,
          metadata: mergeJsonObject(existingDevice.metadata, {
            buildChannel: input.buildChannel,
            lastInstallPingAt: now.toISOString(),
            userAgent: dependencies.userAgent ?? undefined,
          }),
          platform: input.platform,
        },
        select: {
          appBuild: true,
          appVersion: true,
          id: true,
          installationId: true,
          lastSeenAt: true,
          locale: true,
          platform: true,
          status: true,
        },
      })
    : await dbClient.device.upsert({
        where: {
          installationId: input.installationId,
        },
        create: {
          appBuild: input.appBuild,
          appVersion: input.appVersion,
          installationId: input.installationId,
          lastIpAddress: dependencies.clientIp ?? undefined,
          lastSeenAt: now,
          locale: input.locale,
          metadata: mergeJsonObject(null, {
            buildChannel: input.buildChannel,
            firstInstallPingAt: now.toISOString(),
            lastInstallPingAt: now.toISOString(),
            userAgent: dependencies.userAgent ?? undefined,
          }),
          platform: input.platform,
          status: 'pending',
        },
        update: {
          appBuild: input.appBuild,
          appVersion: input.appVersion,
          lastIpAddress: dependencies.clientIp ?? undefined,
          lastSeenAt: now,
          locale: input.locale,
          platform: input.platform,
        },
        select: {
          appBuild: true,
          appVersion: true,
          id: true,
          installationId: true,
          lastSeenAt: true,
          locale: true,
          platform: true,
          status: true,
        },
      });
  const result = zRegisterMobileInstallationResponse.parse({
    device,
    registrationStatus: existingDevice ? 'updated' : 'registered',
  });

  log.info({
    deviceId: device.id,
    installationId: device.installationId,
    registrationStatus: result.registrationStatus,
    scope: 'mobile-installation',
    status: device.status,
  });

  return result;
};
