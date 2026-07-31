import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';
import {
  createMobileFunnelEventInputSchema,
  type MobileFunnelEventResponse,
} from '@/server/product-analytics/schema';

const MAX_EVENT_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FUTURE_CLOCK_SKEW_MS = 5 * 60 * 1000;

type FunnelEventDbClient = Pick<typeof db, 'device' | 'funnelEvent'>;

interface RecordMobileFunnelEventDependencies {
  dbClient?: FunnelEventDbClient;
  now?: Date;
}

export const recordMobileFunnelEvent = async (
  rawInput: unknown,
  dependencies: RecordMobileFunnelEventDependencies = {}
): Promise<MobileFunnelEventResponse> => {
  const input = createMobileFunnelEventInputSchema().parse(rawInput);
  const dbClient = dependencies.dbClient ?? db;
  const now = dependencies.now ?? new Date();
  const device = await dbClient.device.findUnique({
    where: {
      installationId: input.installationId,
    },
    select: {
      id: true,
    },
  });

  if (!device) {
    return {
      accepted: false,
      duplicate: false,
      reason: 'unknown_installation',
    };
  }

  try {
    await dbClient.funnelEvent.create({
      data: {
        consentVersion: input.consent.version,
        deviceId: device.id,
        eventKey: input.eventKey,
        name: input.name,
        occurredAt: normalizeOccurredAt(input.occurredAt, now),
        properties: input.properties,
        schemaVersion: 1,
        source: 'android',
      },
      select: {
        id: true,
      },
    });

    return {
      accepted: true,
      duplicate: false,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return {
        accepted: true,
        duplicate: true,
      };
    }

    throw error;
  }
};

const normalizeOccurredAt = (occurredAt: Date, now: Date): Date => {
  const earliestAcceptedAt = now.getTime() - MAX_EVENT_AGE_MS;
  const latestAcceptedAt = now.getTime() + MAX_FUTURE_CLOCK_SKEW_MS;

  if (
    occurredAt.getTime() < earliestAcceptedAt ||
    occurredAt.getTime() > latestAcceptedAt
  ) {
    return now;
  }

  return occurredAt;
};
