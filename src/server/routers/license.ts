import { ORPCError } from '@orpc/client';
import { z } from 'zod';

import { createManualLicenseGrant } from '@/server/licenses/manual-grant';
import {
  zCreateManualLicenseGrantInput,
  zCreateManualLicenseGrantResponse,
  zLicenseDevice,
  zLicenseLedgerEntry,
  zLicenseOrderSummary,
  zLicenseSummary,
  zSupportLookupResult,
} from '@/server/licenses/schema';
import { getAvailableLicenseTokenBalance } from '@/server/licenses/token-balance';
import { protectedProcedure } from '@/server/orpc';

const tags = ['licenses'];

export default {
  searchSupport: protectedProcedure({
    permissions: {
      device: ['read'],
      license: ['read'],
      order: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/licenses/support-search',
      tags,
    })
    .input(
      z.object({
        limit: z.coerce.number().int().positive().max(50).default(20),
        query: z.string().trim().min(2).max(128),
      })
    )
    .output(z.array(zSupportLookupResult))
    .handler(async ({ context, input }) => {
      const query = input.query.trim();
      const normalizedQuery = query.toLowerCase();

      const [licenses, redeemCodes, devices, orders] = await Promise.all([
        context.db.license.findMany({
          where: {
            OR: [
              {
                key: {
                  contains: query,
                },
              },
              {
                ownerEmail: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
            ],
          },
          select: {
            _count: {
              select: {
                devices: {
                  where: {
                    status: 'active',
                  },
                },
              },
            },
            key: true,
            ownerEmail: true,
            status: true,
          },
          take: input.limit,
        }),
        context.db.redeemCode.findMany({
          where: {
            code: {
              contains: query,
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            code: true,
            license: {
              select: {
                key: true,
                ownerEmail: true,
              },
            },
            redeemedAt: true,
            status: true,
          },
          take: input.limit,
        }),
        context.db.device.findMany({
          where: {
            installationId: {
              contains: query,
            },
          },
          orderBy: {
            lastSeenAt: 'desc',
          },
          select: {
            id: true,
            installationId: true,
            lastSeenAt: true,
            licenseBindings: {
              orderBy: {
                boundAt: 'desc',
              },
              select: {
                license: {
                  select: {
                    key: true,
                  },
                },
                status: true,
              },
              take: 1,
            },
            status: true,
          },
          take: input.limit,
        }),
        context.db.order.findMany({
          where: {
            OR: [
              {
                id: {
                  contains: query,
                },
              },
              {
                payerEmail: {
                  contains: query,
                  mode: 'insensitive',
                },
              },
              {
                lsOrderId: {
                  contains: query,
                },
              },
              {
                lsSubscriptionId: {
                  contains: query,
                },
              },
            ],
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            amountTotalCents: true,
            currency: true,
            id: true,
            license: {
              select: {
                key: true,
              },
            },
            paidAt: true,
            payerEmail: true,
            status: true,
            lsOrderId: true,
            lsSubscriptionId: true,
          },
          take: input.limit,
        }),
      ]);

      const results = [
        ...licenses.map((license) => ({
          activeDeviceCount: license._count.devices,
          entityType: 'license' as const,
          key: license.key,
          matchedOn: license.key.toLowerCase().includes(normalizedQuery)
            ? ('license_key' as const)
            : ('owner_email' as const),
          matchedValue: license.key.toLowerCase().includes(normalizedQuery)
            ? license.key
            : (license.ownerEmail ?? query),
          ownerEmail: license.ownerEmail,
          status: license.status,
        })),
        ...redeemCodes.map((redeemCode) => ({
          code: redeemCode.code,
          entityType: 'redeem_code' as const,
          key: redeemCode.license.key,
          matchedOn: 'redeem_code' as const,
          matchedValue: redeemCode.code,
          ownerEmail: redeemCode.license.ownerEmail,
          redeemedAt: redeemCode.redeemedAt,
          status: redeemCode.status,
        })),
        ...devices.map((device) => ({
          deviceId: device.id,
          entityType: 'device' as const,
          installationId: device.installationId,
          key:
            device.licenseBindings.find(
              (binding) => binding.status === 'active'
            )?.license.key ??
            device.licenseBindings[0]?.license.key ??
            null,
          lastSeenAt: device.lastSeenAt,
          matchedOn: 'installation_id' as const,
          matchedValue: device.installationId,
          status: device.status,
        })),
        ...orders.map((order) => ({
          amountTotalCents: order.amountTotalCents,
          currency: order.currency,
          entityType: 'order' as const,
          id: order.id,
          key: order.license?.key ?? null,
          matchedOn: order.id.toLowerCase().includes(normalizedQuery)
            ? ('order_id' as const)
            : order.payerEmail?.toLowerCase().includes(normalizedQuery)
              ? ('payer_email' as const)
              : order.lsOrderId?.toLowerCase().includes(normalizedQuery)
                ? ('ls_order_id' as const)
                : ('ls_subscription_id' as const),
          matchedValue: order.id.toLowerCase().includes(normalizedQuery)
            ? order.id
            : order.payerEmail?.toLowerCase().includes(normalizedQuery)
              ? (order.payerEmail ?? query)
              : order.lsOrderId?.toLowerCase().includes(normalizedQuery)
                ? (order.lsOrderId ?? query)
                : (order.lsSubscriptionId ?? query),
          paidAt: order.paidAt,
          payerEmail: order.payerEmail,
          status: order.status,
        })),
      ];

      const dedupedResults = new Map<string, (typeof results)[number]>();

      for (const result of results) {
        const dedupeKey =
          result.entityType === 'device'
            ? `device:${result.deviceId}`
            : result.entityType === 'order'
              ? `order:${result.id}`
              : result.entityType === 'redeem_code'
                ? `redeem:${result.code}`
                : `license:${result.key}`;

        if (!dedupedResults.has(dedupeKey)) {
          dedupedResults.set(dedupeKey, result);
        }
      }

      return Array.from(dedupedResults.values()).slice(0, input.limit);
    }),

  getByKey: protectedProcedure({
    permissions: {
      license: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/licenses/{key}',
      tags,
    })
    .input(
      z.object({
        key: z.string(),
      })
    )
    .output(zLicenseSummary)
    .handler(async ({ context, input }) => {
      const license = await context.db.license.findUnique({
        where: { key: input.key },
        select: {
          activatedAt: true,
          createdAt: true,
          deviceLimit: true,
          id: true,
          key: true,
          ownerEmail: true,
          redeemCodes: {
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              code: true,
              createdAt: true,
              expiresAt: true,
              redeemedAt: true,
              status: true,
            },
            take: 10,
          },
          revokedAt: true,
          status: true,
        },
      });

      if (!license) {
        throw new ORPCError('NOT_FOUND');
      }

      const [activeDeviceCount, tokenBalance] = await Promise.all([
        context.db.licenseDevice.count({
          where: {
            licenseId: license.id,
            status: 'active',
          },
        }),
        getAvailableLicenseTokenBalance(
          {
            licenseId: license.id,
          },
          {
            dbClient: context.db,
          }
        ),
      ]);

      return {
        ...license,
        activeDeviceCount,
        availableTokens: tokenBalance,
      };
    }),

  getDevices: protectedProcedure({
    permissions: {
      license: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/licenses/{key}/devices',
      tags,
    })
    .input(
      z.object({
        activeOnly: z.coerce.boolean().optional().default(false),
        key: z.string(),
      })
    )
    .output(z.array(zLicenseDevice))
    .handler(async ({ context, input }) => {
      const license = await context.db.license.findUnique({
        where: { key: input.key },
        select: {
          id: true,
        },
      });

      if (!license) {
        throw new ORPCError('NOT_FOUND');
      }

      const bindings = await context.db.licenseDevice.findMany({
        where: {
          licenseId: license.id,
          status: input.activeOnly ? 'active' : undefined,
        },
        orderBy: {
          boundAt: 'desc',
        },
        select: {
          boundAt: true,
          device: {
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
          },
          id: true,
          status: true,
          unboundAt: true,
        },
      });

      return bindings.map((binding) => ({
        appBuild: binding.device.appBuild,
        appVersion: binding.device.appVersion,
        boundAt: binding.boundAt,
        deviceId: binding.device.id,
        deviceStatus: binding.device.status,
        installationId: binding.device.installationId,
        lastSeenAt: binding.device.lastSeenAt,
        licenseBindingId: binding.id,
        locale: binding.device.locale,
        platform: binding.device.platform,
        status: binding.status,
        unboundAt: binding.unboundAt,
      }));
    }),

  getOrders: protectedProcedure({
    permissions: {
      order: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/licenses/{key}/orders',
      tags,
    })
    .input(
      z.object({
        key: z.string(),
      })
    )
    .output(z.array(zLicenseOrderSummary))
    .handler(async ({ context, input }) => {
      const license = await context.db.license.findUnique({
        where: { key: input.key },
        select: {
          id: true,
        },
      });

      if (!license) {
        throw new ORPCError('NOT_FOUND');
      }

      return await context.db.order
        .findMany({
          where: {
            licenseId: license.id,
          },
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            amountTotalCents: true,
            createdAt: true,
            currency: true,
            id: true,
            paidAt: true,
            payerEmail: true,
            provider: true,
            status: true,
            lsOrderId: true,
            lsSubscriptionId: true,
            tokenPack: {
              select: {
                name: true,
              },
            },
          },
        })
        .then((orders) =>
          orders.map((order) => ({
            amountTotalCents: order.amountTotalCents,
            createdAt: order.createdAt,
            currency: order.currency,
            id: order.id,
            paidAt: order.paidAt,
            payerEmail: order.payerEmail,
            provider: order.provider,
            status: order.status,
            lsOrderId: order.lsOrderId,
            lsSubscriptionId: order.lsSubscriptionId,
            tokenPackName: order.tokenPack?.name ?? null,
          }))
        );
    }),

  getLedger: protectedProcedure({
    permissions: {
      license: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/licenses/{key}/ledger',
      tags,
    })
    .input(
      z.object({
        key: z.string(),
        limit: z.coerce.number().int().positive().max(100).default(50),
      })
    )
    .output(z.array(zLicenseLedgerEntry))
    .handler(async ({ context, input }) => {
      const license = await context.db.license.findUnique({
        where: { key: input.key },
        select: {
          id: true,
        },
      });

      if (!license) {
        throw new ORPCError('NOT_FOUND');
      }

      const entries = await context.db.tokenLedger.findMany({
        where: {
          licenseId: license.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          createdAt: true,
          deltaTokens: true,
          description: true,
          deviceId: true,
          id: true,
          jobId: true,
          orderId: true,
          redeemCode: {
            select: {
              code: true,
            },
          },
          status: true,
          type: true,
        },
        take: input.limit,
      });

      return entries.map((entry) => ({
        createdAt: entry.createdAt,
        deltaTokens: entry.deltaTokens,
        description: entry.description,
        deviceId: entry.deviceId,
        id: entry.id,
        jobId: entry.jobId,
        orderId: entry.orderId,
        redeemCode: entry.redeemCode?.code ?? null,
        status: entry.status,
        type: entry.type,
      }));
    }),

  createManualGrant: protectedProcedure({
    permissions: {
      license: ['manual-credit'],
    },
  })
    .route({
      method: 'POST',
      path: '/licenses/manual-grants',
      tags,
    })
    .input(zCreateManualLicenseGrantInput)
    .output(zCreateManualLicenseGrantResponse)
    .handler(async ({ context, input }) => {
      return await createManualLicenseGrant(input, {
        createdByUserId: context.user.id,
        dbClient: context.db,
        log: context.logger,
      });
    }),
};
