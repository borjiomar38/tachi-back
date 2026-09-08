import { db } from '@/server/db';
import type { InstallationOverview } from '@/server/product-analytics/schema';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RECENT_FIRST_INSTALLATION_LIMIT = 5;

type InstallationOverviewDbClient = Pick<typeof db, 'device'>;

interface GetInstallationOverviewDependencies {
  dbClient?: InstallationOverviewDbClient;
  now?: Date;
}

const firstInstalledSince = (from: Date, to: Date) => ({
  createdAt: {
    gte: from,
    lte: to,
  },
});

/**
 * A Device row represents one installationId for its lifetime. App updates only
 * mutate that row, so installation analytics must use createdAt and never
 * updatedAt or lastSeenAt.
 */
export const getInstallationOverview = async (
  dependencies: GetInstallationOverviewDependencies = {}
): Promise<InstallationOverview> => {
  const dbClient = dependencies.dbClient ?? db;
  const generatedAt = dependencies.now ?? new Date();
  const last24Hours = new Date(generatedAt.getTime() - MS_PER_DAY);
  const last7Days = new Date(generatedAt.getTime() - 7 * MS_PER_DAY);
  const last30Days = new Date(generatedAt.getTime() - 30 * MS_PER_DAY);
  const installedBeforeGeneration = {
    createdAt: {
      lte: generatedAt,
    },
  };

  const [total, recent24Hours, recent7Days, recent30Days, recentInstallations] =
    await Promise.all([
      dbClient.device.count({ where: installedBeforeGeneration }),
      dbClient.device.count({
        where: firstInstalledSince(last24Hours, generatedAt),
      }),
      dbClient.device.count({
        where: firstInstalledSince(last7Days, generatedAt),
      }),
      dbClient.device.count({
        where: firstInstalledSince(last30Days, generatedAt),
      }),
      dbClient.device.findMany({
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          appVersion: true,
          createdAt: true,
          id: true,
          installationId: true,
          locale: true,
        },
        take: RECENT_FIRST_INSTALLATION_LIMIT,
        where: installedBeforeGeneration,
      }),
    ]);

  return {
    counts: {
      last24Hours: recent24Hours,
      last30Days: recent30Days,
      last7Days: recent7Days,
      total,
    },
    generatedAt,
    recentFirstInstallations: recentInstallations.map((installation) => ({
      appVersion: installation.appVersion,
      firstInstalledAt: installation.createdAt,
      id: installation.id,
      installationId: installation.installationId,
      locale: installation.locale,
    })),
  };
};
