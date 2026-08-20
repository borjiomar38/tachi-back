import { describe, expect, it } from 'vitest';

import {
  buildBlogAppUpdateCheckpoint,
  isMatchingBlogAppUpdateCheckpoint,
  resolveUserFacingCommits,
  shouldAdvanceBlogAppUpdateCheckpoint,
} from '@/server/blog/app-update-policy';

const commits = [
  {
    authoredAt: '2026-08-20T10:00:00.000Z',
    message: 'feat: improve translation onboarding',
    sha: 'aaaaaaaaaaaa',
    url: 'https://github.com/borjiomar38/tachi-mobile/commit/aaaaaaaaaaaa',
  },
  {
    authoredAt: '2026-08-20T11:00:00.000Z',
    message: 'chore: update dependencies',
    sha: 'bbbbbbbbbbbb',
    url: 'https://github.com/borjiomar38/tachi-mobile/commit/bbbbbbbbbbbb',
  },
  {
    authoredAt: '2026-08-20T12:00:00.000Z',
    message: 'fix: patch credential vulnerability details',
    sha: 'cccccccccccc',
    url: 'https://github.com/borjiomar38/tachi-mobile/commit/cccccccccccc',
  },
];

describe('app update commit policy', () => {
  it('keeps user-facing changes and filters maintenance and sensitive commits', () => {
    expect(
      resolveUserFacingCommits({
        changedFiles: [
          'app/src/main/java/eu/kanade/presentation/Onboarding.kt',
        ],
        commits,
      }).map((commit) => commit.sha)
    ).toEqual(['aaaaaaaaaaaa']);
  });

  it('publishes nothing for test-only changes', () => {
    expect(
      resolveUserFacingCommits({
        changedFiles: ['app/src/test/java/OnboardingTest.kt'],
        commits: [commits[0]!],
      })
    ).toEqual([]);
  });

  it('advances the checkpoint only for a published article', () => {
    expect(shouldAdvanceBlogAppUpdateCheckpoint('draft')).toBe(false);
    expect(shouldAdvanceBlogAppUpdateCheckpoint('failed')).toBe(false);
    expect(shouldAdvanceBlogAppUpdateCheckpoint('published')).toBe(true);
  });
});

describe('app update checkpoint identity', () => {
  it('matches the configured repository and branch exactly', () => {
    const checkpoint = buildBlogAppUpdateCheckpoint({
      branch: 'main',
      processedAt: new Date('2026-08-20T12:00:00.000Z'),
      repository: 'borjiomar38/tachi-mobile',
      sha: 'aaaaaaaaaaaa',
    });

    expect(
      isMatchingBlogAppUpdateCheckpoint({
        branch: 'main',
        checkpoint,
        repository: 'borjiomar38/tachi-mobile',
      })
    ).toBe(true);
    expect(
      isMatchingBlogAppUpdateCheckpoint({
        branch: 'master',
        checkpoint,
        repository: 'borjiomar38/tachi-mobile',
      })
    ).toBe(false);
  });
});
