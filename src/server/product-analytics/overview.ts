import { db } from '@/server/db';
import {
  createFunnelOverviewInputSchema,
  type FunnelOverview,
} from '@/server/product-analytics/schema';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type FunnelOverviewDbClient = Pick<
  typeof db,
  'device' | 'freeTrialClaim' | 'funnelEvent' | 'translationJob'
>;

interface GetFunnelOverviewDependencies {
  dbClient?: FunnelOverviewDbClient;
  now?: Date;
}

export const getFunnelOverview = async (
  rawInput: unknown,
  dependencies: GetFunnelOverviewDependencies = {}
): Promise<FunnelOverview> => {
  const input = createFunnelOverviewInputSchema().parse(rawInput);
  const dbClient = dependencies.dbClient ?? db;
  const generatedAt = dependencies.now ?? new Date();
  const from = new Date(generatedAt.getTime() - input.days * MS_PER_DAY);
  const cohortDevices = await dbClient.device.findMany({
    where: {
      createdAt: {
        gte: from,
        lte: generatedAt,
      },
    },
    select: {
      id: true,
      installationId: true,
    },
  });

  if (cohortDevices.length === 0) {
    return buildEmptyOverview(input.days, from, generatedAt);
  }

  const deviceIds = cohortDevices.map((device) => device.id);
  const installationIds = cohortDevices.map((device) => device.installationId);
  const deviceIdByInstallationId = new Map(
    cohortDevices.map((device) => [device.installationId, device.id])
  );
  const [trialClaims, completedJobGroups, funnelEvents] = await Promise.all([
    dbClient.freeTrialClaim.findMany({
      where: {
        installationId: {
          in: installationIds,
        },
      },
      select: {
        installationId: true,
      },
    }),
    dbClient.translationJob.groupBy({
      by: ['deviceId'],
      _count: {
        _all: true,
      },
      where: {
        deviceId: {
          in: deviceIds,
        },
        status: 'completed',
      },
    }),
    dbClient.funnelEvent.findMany({
      distinct: ['deviceId', 'name'],
      where: {
        deviceId: {
          in: deviceIds,
        },
        name: {
          in: ['paywall_viewed', 'paywall_subscribe_clicked'],
        },
      },
      select: {
        deviceId: true,
        name: true,
      },
    }),
  ]);

  const trialDeviceIds = new Set(
    trialClaims.flatMap((claim) => {
      const deviceId = deviceIdByInstallationId.get(claim.installationId);
      return deviceId ? [deviceId] : [];
    })
  );
  const firstTranslationDeviceIds = new Set(
    completedJobGroups
      .filter((group) => group._count._all >= 1)
      .map((group) => group.deviceId)
  );
  const secondTranslationDeviceIds = new Set(
    completedJobGroups
      .filter((group) => group._count._all >= 2)
      .map((group) => group.deviceId)
  );
  const paywallViewerDeviceIds = toDeviceIdSet(funnelEvents, 'paywall_viewed');
  const paywallSubscriberDeviceIds = toDeviceIdSet(
    funnelEvents,
    'paywall_subscribe_clicked'
  );
  const trialDevicesWithFirstTranslation = countIntersection(
    trialDeviceIds,
    firstTranslationDeviceIds
  );
  const paywallViewersWhoClickedSubscribe = countIntersection(
    paywallViewerDeviceIds,
    paywallSubscriberDeviceIds
  );

  return {
    counts: {
      firstTranslationDevices: firstTranslationDeviceIds.size,
      installs: cohortDevices.length,
      paywallSubscribeClickers: paywallSubscriberDeviceIds.size,
      paywallViewers: paywallViewerDeviceIds.size,
      secondTranslationDevices: secondTranslationDeviceIds.size,
      trials: trialDeviceIds.size,
    },
    period: {
      days: input.days,
      from: from.toISOString(),
      generatedAt: generatedAt.toISOString(),
      to: generatedAt.toISOString(),
    },
    rates: {
      firstToSecondTranslation: ratio(
        secondTranslationDeviceIds.size,
        firstTranslationDeviceIds.size
      ),
      installToTrial: ratio(trialDeviceIds.size, cohortDevices.length),
      paywallViewToSubscribeClick: ratio(
        paywallViewersWhoClickedSubscribe,
        paywallViewerDeviceIds.size
      ),
      trialToFirstTranslation: ratio(
        trialDevicesWithFirstTranslation,
        trialDeviceIds.size
      ),
    },
  };
};

interface DeviceEventRow {
  deviceId: string;
  name: string;
}

const toDeviceIdSet = (
  events: DeviceEventRow[],
  name: 'paywall_subscribe_clicked' | 'paywall_viewed'
): Set<string> =>
  new Set(
    events.filter((event) => event.name === name).map((event) => event.deviceId)
  );

const countIntersection = (left: Set<string>, right: Set<string>): number =>
  [...left].filter((value) => right.has(value)).length;

const ratio = (numerator: number, denominator: number): number =>
  denominator === 0 ? 0 : Number((numerator / denominator).toFixed(4));

const buildEmptyOverview = (
  days: number,
  from: Date,
  generatedAt: Date
): FunnelOverview => ({
  counts: {
    firstTranslationDevices: 0,
    installs: 0,
    paywallSubscribeClickers: 0,
    paywallViewers: 0,
    secondTranslationDevices: 0,
    trials: 0,
  },
  period: {
    days,
    from: from.toISOString(),
    generatedAt: generatedAt.toISOString(),
    to: generatedAt.toISOString(),
  },
  rates: {
    firstToSecondTranslation: 0,
    installToTrial: 0,
    paywallViewToSubscribeClick: 0,
    trialToFirstTranslation: 0,
  },
});
