import { describe, expect, it, vi } from 'vitest';

import { buildBlogAppUpdateCheckpoint } from '@/server/blog/app-update-policy';
import {
  advanceBlogAppUpdateCheckpoint,
  prepareBlogAppUpdatePromptContext,
} from '@/server/blog/app-update-source';

interface StoredConfig {
  value: unknown;
}

const buildFakeDb = (initialValue: unknown = null) => {
  const state: { entry: StoredConfig | null } = {
    entry: initialValue ? { value: initialValue } : null,
  };
  const dbClient = {
    appConfig: {
      findUnique: vi.fn(async () => state.entry),
      upsert: vi.fn(
        async (input: { create: StoredConfig; update: StoredConfig }) => {
          state.entry = {
            value: state.entry ? input.update.value : input.create.value,
          };

          return state.entry;
        }
      ),
    },
  };

  return { dbClient, state };
};

const buildGitHubCommit = (input: { message: string; sha: string }) => ({
  commit: {
    author: {
      date: '2026-08-20T10:00:00.000Z',
    },
    message: input.message,
  },
  html_url: `https://github.com/borjiomar38/tachi-mobile/commit/${input.sha}`,
  sha: input.sha,
});

const buildFetch = (input: {
  changedFiles?: string[];
  headSha: string;
  messages?: Array<{ message: string; sha: string }>;
}) =>
  vi.fn(async (request: string | URL | Request) => {
    const url = String(request);
    const payload = url.includes('/compare/')
      ? {
          commits: (input.messages ?? []).map(buildGitHubCommit),
          files: (input.changedFiles ?? []).map((filename) => ({ filename })),
          status: 'ahead',
        }
      : buildGitHubCommit({
          message: 'head',
          sha: input.headSha,
        });

    return new Response(JSON.stringify(payload), {
      headers: {
        'Content-Type': 'application/json',
      },
      status: 200,
    });
  }) as unknown as typeof fetch;

describe('GitHub app update checkpoint workflow', () => {
  it('initializes at the current head without publishing repository history', async () => {
    const { dbClient, state } = buildFakeDb();
    const result = await prepareBlogAppUpdatePromptContext({
      branch: 'main',
      dbClient,
      fetchImpl: buildFetch({ headSha: 'aaaaaaaaaaaa' }),
      now: new Date('2026-08-20T12:00:00.000Z'),
      repository: 'borjiomar38/tachi-mobile',
    });

    expect(result.kind).toBe('noop');
    expect(state.entry?.value).toMatchObject({
      lastProcessedSha: 'aaaaaaaaaaaa',
    });
  });

  it('keeps the old checkpoint while an eligible article awaits publication', async () => {
    const checkpoint = buildBlogAppUpdateCheckpoint({
      branch: 'main',
      processedAt: new Date('2026-08-19T12:00:00.000Z'),
      repository: 'borjiomar38/tachi-mobile',
      sha: 'aaaaaaaaaaaa',
    });
    const { dbClient, state } = buildFakeDb(checkpoint);
    const result = await prepareBlogAppUpdatePromptContext({
      branch: 'main',
      dbClient,
      fetchImpl: buildFetch({
        changedFiles: [
          'app/src/main/java/eu/kanade/presentation/Onboarding.kt',
        ],
        headSha: 'bbbbbbbbbbbb',
        messages: [
          {
            message: 'feat: improve translation onboarding',
            sha: 'bbbbbbbbbbbb',
          },
        ],
      }),
      now: new Date('2026-08-20T12:00:00.000Z'),
      repository: 'borjiomar38/tachi-mobile',
    });

    expect(result.kind).toBe('ready');
    expect(state.entry?.value).toMatchObject({
      lastProcessedSha: 'aaaaaaaaaaaa',
    });

    if (result.kind !== 'ready') {
      throw new Error('Expected a ready app update batch.');
    }

    await advanceBlogAppUpdateCheckpoint(
      result.evidence,
      dbClient,
      new Date('2026-08-20T12:30:00.000Z')
    );
    expect(state.entry?.value).toMatchObject({
      lastProcessedSha: 'bbbbbbbbbbbb',
    });
  });

  it('advances past maintenance-only commits without creating an article', async () => {
    const checkpoint = buildBlogAppUpdateCheckpoint({
      branch: 'main',
      processedAt: new Date('2026-08-19T12:00:00.000Z'),
      repository: 'borjiomar38/tachi-mobile',
      sha: 'aaaaaaaaaaaa',
    });
    const { dbClient, state } = buildFakeDb(checkpoint);
    const result = await prepareBlogAppUpdatePromptContext({
      branch: 'main',
      dbClient,
      fetchImpl: buildFetch({
        changedFiles: ['gradle/libs.versions.toml'],
        headSha: 'bbbbbbbbbbbb',
        messages: [
          {
            message: 'chore: update dependencies',
            sha: 'bbbbbbbbbbbb',
          },
        ],
      }),
      now: new Date('2026-08-20T12:00:00.000Z'),
      repository: 'borjiomar38/tachi-mobile',
    });

    expect(result.kind).toBe('noop');
    expect(state.entry?.value).toMatchObject({
      lastProcessedSha: 'bbbbbbbbbbbb',
    });
  });
});
