import { protectedProcedure } from '@/server/orpc';
import { getInstallationOverview } from '@/server/product-analytics/installations';
import { getFunnelOverview } from '@/server/product-analytics/overview';
import {
  createFunnelOverviewInputSchema,
  createFunnelOverviewSchema,
  createInstallationOverviewSchema,
} from '@/server/product-analytics/schema';

const tags = ['product-analytics'];

export default {
  funnelOverview: protectedProcedure({
    permissions: {
      device: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/product-analytics/funnel',
      tags,
    })
    .input(createFunnelOverviewInputSchema())
    .output(createFunnelOverviewSchema())
    .handler(async ({ context, input }) =>
      getFunnelOverview(input, {
        dbClient: context.db,
      })
    ),
  installationOverview: protectedProcedure({
    permissions: {
      device: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/product-analytics/installations',
      tags,
    })
    .output(createInstallationOverviewSchema())
    .handler(async ({ context }) =>
      getInstallationOverview({
        dbClient: context.db,
      })
    ),
};
