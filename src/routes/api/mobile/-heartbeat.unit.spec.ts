import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetEffectiveMobileUpdatePolicyForClient } = vi.hoisted(() => ({
  mockGetEffectiveMobileUpdatePolicyForClient: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => ({ options }),
}));

vi.mock('@/server/mobile-update-policy-resolver', () => ({
  getEffectiveMobileUpdatePolicyForClient:
    mockGetEffectiveMobileUpdatePolicyForClient,
}));

import { Route } from './heartbeat';

type HeartbeatRouteHandlers = {
  GET: (input: { request: Request }) => Promise<Response>;
};

const handlers = (
  Route as never as {
    options: {
      server: {
        handlers: HeartbeatRouteHandlers;
      };
    };
  }
).options.server.handlers;

describe('/api/mobile/heartbeat', () => {
  beforeEach(() => {
    mockGetEffectiveMobileUpdatePolicyForClient.mockReset();
  });

  it('returns the policy selected for the requesting client cohort', async () => {
    const policy = {
      apkVariant: 'per-abi',
      latestVersionCode: 50,
      requiresUpdate: true,
    };
    mockGetEffectiveMobileUpdatePolicyForClient.mockResolvedValue(policy);

    const response = await handlers.GET({
      request: new Request(
        'https://nayovi.com/api/mobile/heartbeat?platform=android&channel=standard-release&versionCode=49'
      ),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: policy,
      ok: true,
    });
    expect(mockGetEffectiveMobileUpdatePolicyForClient).toHaveBeenCalledWith({
      channel: 'standard-release',
      currentVersionCode: 49,
      platform: 'android',
    });
  });
});
