import { describe, expect, it, vi } from 'vitest';

import { reviewFreeTrialEmailRisk } from '@/server/licenses/free-trial-email-risk';

function buildDb(email: string) {
  const licenseUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
  const sessionUpdateMany = vi.fn().mockResolvedValue({ count: 1 });
  const redeemCodeUpdate = vi.fn().mockResolvedValue({ id: 'redeem-1' });
  const dbClient = {
    $transaction: vi.fn().mockImplementation(async (operations) => {
      await Promise.all(operations);
      return [];
    }),
    freeTrialClaim: {
      findUnique: vi.fn().mockResolvedValue({
        email,
        license: { orders: [] },
        licenseId: 'license-1',
        redeemCode: {
          id: 'redeem-1',
          metadata: { source: 'free_trial' },
        },
      }),
    },
    license: { updateMany: licenseUpdateMany },
    mobileSession: { updateMany: sessionUpdateMany },
    redeemCode: { update: redeemCodeUpdate },
  };

  return {
    dbClient,
    licenseUpdateMany,
    redeemCodeUpdate,
    sessionUpdateMany,
  };
}

function openAIResponse(input: {
  confidence: number;
  rationale: string;
  verdict: 'legitimate' | 'disposable' | 'uncertain';
}) {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify(input),
          },
        },
      ],
    }),
    { status: 200 }
  );
}

describe('free trial email risk review', () => {
  it('suspends a known disposable domain only after high-confidence confirmation', async () => {
    const { dbClient, licenseUpdateMany, sessionUpdateMany } = buildDb(
      'reader@mailinator.com'
    );

    const result = await reviewFreeTrialEmailRisk(
      { claimId: 'claim-1' },
      {
        apiKey: 'test-key',
        dbClient: dbClient as never,
        fetchFn: vi.fn().mockResolvedValue(
          openAIResponse({
            confidence: 0.98,
            rationale: 'Known temporary inbox provider.',
            verdict: 'disposable',
          })
        ),
        resolveA: vi.fn().mockResolvedValue(['192.0.2.10']),
        resolveMailExchange: vi.fn().mockResolvedValue([]),
      }
    );

    expect(result).toMatchObject({
      blocked: true,
      domain: 'mailinator.com',
      status: 'blocked',
    });
    expect(licenseUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'suspended' },
        where: expect.objectContaining({ id: 'license-1' }),
      })
    );
    expect(sessionUpdateMany).toHaveBeenCalled();
  });

  it('never blocks a legitimate domain from AI opinion alone', async () => {
    const { dbClient, licenseUpdateMany, redeemCodeUpdate } = buildDb(
      'xxy1000@example.com'
    );
    const fetchFn = vi.fn().mockResolvedValue(
      openAIResponse({
        confidence: 0.99,
        rationale: 'Unusual-looking address.',
        verdict: 'disposable',
      })
    );

    const result = await reviewFreeTrialEmailRisk(
      { claimId: 'claim-1' },
      {
        apiKey: 'test-key',
        dbClient: dbClient as never,
        fetchFn,
        resolveA: vi.fn().mockResolvedValue(['93.184.216.34']),
        resolveMailExchange: vi
          .fn()
          .mockResolvedValue([{ exchange: 'mx.example.com', priority: 10 }]),
      }
    );

    expect(result).toMatchObject({
      blocked: false,
      domain: 'example.com',
      knownDisposableDomain: false,
      status: 'accepted',
    });
    expect(licenseUpdateMany).not.toHaveBeenCalled();
    const requestBody = JSON.parse(
      String(fetchFn.mock.calls[0]?.[1]?.body)
    ) as { messages: Array<{ content: string }> };
    expect(JSON.stringify(requestBody)).not.toContain('xxy1000');
    expect(redeemCodeUpdate).toHaveBeenCalled();
  });
});
