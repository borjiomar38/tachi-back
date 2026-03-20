import { ORPCError } from '@orpc/client';

import { revokeDeviceActivation } from '@/server/licenses/revoke-device';
import {
  zBackofficeDeviceDetail,
  zRevokeDeviceInput,
  zRevokeDeviceResponse,
} from '@/server/licenses/schema';
import { protectedProcedure } from '@/server/orpc';

const tags = ['devices'];

export default {
  getById: protectedProcedure({
    permissions: {
      device: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/devices/{id}',
      tags,
    })
    .input(
      zRevokeDeviceInput
        .pick({
          deviceId: true,
        })
        .transform((input) => ({
          id: input.deviceId,
        }))
    )
    .output(zBackofficeDeviceDetail)
    .handler(async ({ context, input }) => {
      const device = await context.db.device.findUnique({
        where: {
          id: input.id,
        },
        select: {
          appBuild: true,
          appVersion: true,
          createdAt: true,
          id: true,
          installationId: true,
          lastIpAddress: true,
          lastSeenAt: true,
          licenseBindings: {
            orderBy: {
              boundAt: 'desc',
            },
            select: {
              boundAt: true,
              id: true,
              license: {
                select: {
                  id: true,
                  key: true,
                  ownerEmail: true,
                  status: true,
                },
              },
              status: true,
              unboundAt: true,
            },
          },
          locale: true,
          metadata: true,
          platform: true,
          status: true,
        },
      });

      if (!device) {
        throw new ORPCError('NOT_FOUND');
      }

      const activeBinding =
        device.licenseBindings.find((binding) => binding.status === 'active') ??
        null;

      return {
        activeLicense: activeBinding
          ? {
              boundAt: activeBinding.boundAt,
              id: activeBinding.license.id,
              key: activeBinding.license.key,
              ownerEmail: activeBinding.license.ownerEmail,
              status: activeBinding.license.status,
            }
          : null,
        appBuild: device.appBuild,
        appVersion: device.appVersion,
        bindings: device.licenseBindings.map((binding) => ({
          boundAt: binding.boundAt,
          key: binding.license.key,
          licenseBindingId: binding.id,
          licenseId: binding.license.id,
          licenseStatus: binding.license.status,
          ownerEmail: binding.license.ownerEmail,
          status: binding.status,
          unboundAt: binding.unboundAt,
        })),
        createdAt: device.createdAt,
        id: device.id,
        installationId: device.installationId,
        lastIpAddress: device.lastIpAddress,
        lastSeenAt: device.lastSeenAt,
        locale: device.locale,
        metadata: device.metadata,
        platform: device.platform,
        status: device.status,
      };
    }),

  revokeById: protectedProcedure({
    permissions: {
      device: ['revoke'],
    },
  })
    .route({
      method: 'POST',
      path: '/devices/{deviceId}/revoke',
      tags,
    })
    .input(zRevokeDeviceInput)
    .output(zRevokeDeviceResponse)
    .handler(async ({ context, input }) => {
      return await revokeDeviceActivation(input, {
        dbClient: context.db,
        log: context.logger,
      });
    }),
};
