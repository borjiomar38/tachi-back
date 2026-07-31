import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Prisma } from '@/server/db/generated/client';
import { createMobileFunnelEventInputSchema } from '@/server/product-analytics/schema';
import { recordMobileFunnelEvent } from '@/server/product-analytics/service';

const now = new Date('2026-07-31T12:00:00.000Z');
const validInput = {
  consent: {
    analytics: true as const,
    version: '2026-07',
  },
  eventKey: '12345678-1234-4234-9234-123456789abc',
  installationId: 'android-12345678-1234-1234-1234-123456789abc',
  name: 'paywall_viewed' as const,
  occurredAt: '2026-07-31T11:59:00.000Z',
  properties: {
    action: 'translate_chapters' as const,
    mode: 'out_of_tokens' as const,
    reasonCode: 'insufficient_tokens' as const,
    surface: 'manga' as const,
  },
};

describe('mobile funnel event service', () => {
  const deviceFindUnique = vi.fn();
  const funnelEventCreate = vi.fn();
  const dbClient = {
    device: {
      findUnique: deviceFindUnique,
    },
    funnelEvent: {
      create: funnelEventCreate,
    },
  };

  beforeEach(() => {
    deviceFindUnique.mockReset();
    funnelEventCreate.mockReset();
  });

  it('persists only allowlisted pseudonymous paywall context', async () => {
    deviceFindUnique.mockResolvedValue({ id: 'device-1' });
    funnelEventCreate.mockResolvedValue({ id: 'event-1' });

    const result = await recordMobileFunnelEvent(validInput, {
      dbClient: dbClient as never,
      now,
    });

    expect(result).toEqual({ accepted: true, duplicate: false });
    expect(funnelEventCreate).toHaveBeenCalledWith({
      data: {
        consentVersion: '2026-07',
        deviceId: 'device-1',
        eventKey: validInput.eventKey,
        name: 'paywall_viewed',
        occurredAt: new Date(validInput.occurredAt),
        properties: validInput.properties,
        schemaVersion: 1,
        source: 'android',
      },
      select: {
        id: true,
      },
    });
    const storedData = funnelEventCreate.mock.calls[0]?.[0]?.data;
    expect(storedData).not.toHaveProperty('installationId');
    expect(storedData).not.toHaveProperty('email');
    expect(storedData).not.toHaveProperty('ipAddress');
    expect(storedData.properties).not.toHaveProperty('mangaTitle');
    expect(storedData.properties).not.toHaveProperty('chapterTitle');
    expect(storedData.properties).not.toHaveProperty('url');
  });

  it('does not create an analytics row or device for an unknown installation', async () => {
    deviceFindUnique.mockResolvedValue(null);

    const result = await recordMobileFunnelEvent(validInput, {
      dbClient: dbClient as never,
      now,
    });

    expect(result).toEqual({
      accepted: false,
      duplicate: false,
      reason: 'unknown_installation',
    });
    expect(funnelEventCreate).not.toHaveBeenCalled();
  });

  it('treats a duplicate event key as an idempotent success', async () => {
    deviceFindUnique.mockResolvedValue({ id: 'device-1' });
    funnelEventCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        clientVersion: '0.0.0',
        code: 'P2002',
        meta: { target: ['eventKey'] },
      })
    );

    await expect(
      recordMobileFunnelEvent(validInput, {
        dbClient: dbClient as never,
        now,
      })
    ).resolves.toEqual({ accepted: true, duplicate: true });
  });

  it('uses server time when the device clock is outside the accepted window', async () => {
    deviceFindUnique.mockResolvedValue({ id: 'device-1' });
    funnelEventCreate.mockResolvedValue({ id: 'event-1' });

    await recordMobileFunnelEvent(
      {
        ...validInput,
        occurredAt: '2026-06-01T00:00:00.000Z',
      },
      {
        dbClient: dbClient as never,
        now,
      }
    );

    expect(funnelEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          occurredAt: now,
        }),
      })
    );
  });

  it('rejects missing consent and unexpected personal or content fields', () => {
    const schema = createMobileFunnelEventInputSchema();

    expect(
      schema.safeParse({
        ...validInput,
        consent: { analytics: false, version: '2026-07' },
      }).success
    ).toBe(false);
    expect(
      schema.safeParse({
        ...validInput,
        email: 'reader@example.com',
      }).success
    ).toBe(false);
    expect(
      schema.safeParse({
        ...validInput,
        properties: {
          ...validInput.properties,
          mangaTitle: 'Private reading title',
        },
      }).success
    ).toBe(false);
  });
});
