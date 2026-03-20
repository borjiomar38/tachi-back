import { ORPCError } from '@orpc/client';

import { db } from '@/server/db';
import {
  zRevokeDeviceInput,
  zRevokeDeviceResponse,
} from '@/server/licenses/schema';
import { mergeJsonObject } from '@/server/licenses/utils';
import { logger } from '@/server/logger';

export async function revokeDeviceActivation(
  rawInput: unknown,
  deps: {
    dbClient?: typeof db;
    log?: Pick<typeof logger, 'info' | 'warn'>;
    now?: Date;
  } = {}
) {
  const input = zRevokeDeviceInput.parse(rawInput);
  const dbClient = deps.dbClient ?? db;
  const log = deps.log ?? logger;
  const now = deps.now ?? new Date();

  const result = await dbClient.$transaction(async (tx) => {
    const existingDevice = await tx.device.findUnique({
      where: { id: input.deviceId },
      select: {
        id: true,
        installationId: true,
        metadata: true,
        status: true,
      },
    });

    if (!existingDevice) {
      throw new ORPCError('NOT_FOUND');
    }

    await tx.licenseDevice.updateMany({
      where: {
        deviceId: existingDevice.id,
        status: 'active',
      },
      data: {
        status: 'revoked',
        unboundAt: now,
      },
    });

    await tx.mobileSession.updateMany({
      where: {
        deviceId: existingDevice.id,
        revokedAt: null,
      },
      data: {
        revokeReason: input.reason,
        revokedAt: now,
      },
    });

    return await tx.device.update({
      where: { id: existingDevice.id },
      data: {
        metadata: mergeJsonObject(existingDevice.metadata, {
          revokedAt: now.toISOString(),
          revokeReason: input.reason,
        }),
        status: 'revoked',
      },
      select: {
        id: true,
        installationId: true,
        status: true,
      },
    });
  });

  log.info({
    deviceId: result.id,
    installationId: result.installationId,
    scope: 'device',
    status: result.status,
  });

  return zRevokeDeviceResponse.parse({
    ...result,
    revokedAt: now,
  });
}
