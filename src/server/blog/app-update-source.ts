import { z } from 'zod';

import { envServer } from '@/env/server';
import {
  BLOG_APP_UPDATE_CHECKPOINT_KEY,
  BlogAppUpdateCheckpoint,
  BlogAppUpdateCommit,
  BlogAppUpdateEvidence,
  buildBlogAppUpdateCheckpoint,
  isMatchingBlogAppUpdateCheckpoint,
  resolveUserFacingCommits,
  zBlogAppUpdateCheckpoint,
  zBlogAppUpdateEvidence,
} from '@/server/blog/app-update-policy';
import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';

interface BlogAppUpdateCheckpointDbClient {
  appConfig: {
    findUnique: (input: {
      select: { value: true };
      where: { key: string };
    }) => PromiseLike<{ value: unknown } | null>;
    upsert: (input: {
      create: { key: string; value: Prisma.InputJsonValue };
      update: { value: Prisma.InputJsonValue };
      where: { key: string };
    }) => PromiseLike<unknown>;
  };
}

interface GitHubCommitResponse {
  authoredAt: string;
  message: string;
  sha: string;
  url: string;
}

interface GitHubComparisonResponse {
  changedFiles: string[];
  commits: GitHubCommitResponse[];
  status: 'ahead' | 'behind' | 'diverged' | 'identical';
}

export type BlogAppUpdatePromptContext =
  | {
      kind: 'noop';
      reason: string;
    }
  | {
      evidence: BlogAppUpdateEvidence;
      kind: 'ready';
    };

export interface PrepareBlogAppUpdatePromptContextOptions {
  branch?: string;
  dbClient?: BlogAppUpdateCheckpointDbClient;
  fetchImpl?: typeof fetch;
  now?: Date;
  repository?: string;
  token?: string;
}

const zGitHubCommit = z
  .object({
    commit: z
      .object({
        author: z
          .object({
            date: z.iso.datetime(),
          })
          .nullable(),
        message: z.string(),
      })
      .passthrough(),
    html_url: z.url(),
    sha: z.string(),
  })
  .passthrough();

const zGitHubCompare = z
  .object({
    commits: z.array(zGitHubCommit),
    files: z
      .array(
        z
          .object({
            filename: z.string(),
          })
          .passthrough()
      )
      .optional(),
    status: z.enum(['ahead', 'behind', 'diverged', 'identical']),
  })
  .passthrough();

export const prepareBlogAppUpdatePromptContext = async (
  options: PrepareBlogAppUpdatePromptContextOptions = {}
): Promise<BlogAppUpdatePromptContext> => {
  const branch = options.branch ?? envServer.BLOG_GITHUB_BRANCH;
  const dbClient = options.dbClient ?? db;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const now = options.now ?? new Date();
  const repository = options.repository ?? envServer.BLOG_GITHUB_REPOSITORY;
  const token = options.token ?? envServer.BLOG_GITHUB_TOKEN;
  const checkpoint = await getBlogAppUpdateCheckpoint(dbClient);
  const head = await fetchGitHubHead({
    branch,
    fetchImpl,
    repository,
    token,
  });

  if (
    !checkpoint ||
    !isMatchingBlogAppUpdateCheckpoint({ branch, checkpoint, repository })
  ) {
    await saveBlogAppUpdateCheckpoint(dbClient, {
      branch,
      processedAt: now,
      repository,
      sha: head.sha,
    });

    return {
      kind: 'noop',
      reason:
        'The app update checkpoint was initialized at the current GitHub head; historical commits are intentionally not published.',
    };
  }

  if (checkpoint.lastProcessedSha === head.sha) {
    return {
      kind: 'noop',
      reason:
        'No new GitHub commits exist after the last processed app update.',
    };
  }

  const comparison = await fetchGitHubComparison({
    baseSha: checkpoint.lastProcessedSha,
    branch,
    fetchImpl,
    repository,
    token,
  });

  if (comparison.status !== 'ahead') {
    await saveBlogAppUpdateCheckpoint(dbClient, {
      branch,
      processedAt: now,
      repository,
      sha: head.sha,
    });

    return {
      kind: 'noop',
      reason:
        'The configured GitHub branch no longer descends from the saved checkpoint; the checkpoint was safely reset without publishing historical or divergent commits.',
    };
  }

  const relevantCommits = resolveUserFacingCommits({
    changedFiles: comparison.changedFiles,
    commits: comparison.commits,
  });

  if (relevantCommits.length === 0) {
    await saveBlogAppUpdateCheckpoint(dbClient, {
      branch,
      processedAt: now,
      repository,
      sha: head.sha,
    });

    return {
      kind: 'noop',
      reason:
        'New GitHub commits were found, but they only contain internal maintenance, tests, dependencies, documentation, or sensitive changes.',
    };
  }

  return {
    evidence: zBlogAppUpdateEvidence.parse({
      branch,
      commits: relevantCommits,
      fromSha: checkpoint.lastProcessedSha,
      repository,
      toSha: head.sha,
    }),
    kind: 'ready',
  };
};

export const assertCurrentBlogAppUpdateEvidence = async (
  evidence: BlogAppUpdateEvidence,
  dbClient: BlogAppUpdateCheckpointDbClient = db
): Promise<void> => {
  const checkpoint = await getBlogAppUpdateCheckpoint(dbClient);

  if (
    !checkpoint ||
    checkpoint.repository.toLowerCase() !== evidence.repository.toLowerCase() ||
    checkpoint.branch !== evidence.branch ||
    checkpoint.lastProcessedSha !== evidence.fromSha
  ) {
    throw new Error(
      'The app update draft does not start at the active GitHub checkpoint.'
    );
  }
};

export const advanceBlogAppUpdateCheckpoint = async (
  evidence: BlogAppUpdateEvidence,
  dbClient: BlogAppUpdateCheckpointDbClient,
  processedAt: Date
): Promise<void> => {
  await assertCurrentBlogAppUpdateEvidence(evidence, dbClient);
  await saveBlogAppUpdateCheckpoint(dbClient, {
    branch: evidence.branch,
    processedAt,
    repository: evidence.repository,
    sha: evidence.toSha,
  });
};

async function getBlogAppUpdateCheckpoint(
  dbClient: BlogAppUpdateCheckpointDbClient
): Promise<BlogAppUpdateCheckpoint | null> {
  const entry = await dbClient.appConfig.findUnique({
    select: {
      value: true,
    },
    where: {
      key: BLOG_APP_UPDATE_CHECKPOINT_KEY,
    },
  });

  if (!entry) {
    return null;
  }

  const parsed = zBlogAppUpdateCheckpoint.safeParse(entry.value);

  return parsed.success ? parsed.data : null;
}

async function saveBlogAppUpdateCheckpoint(
  dbClient: BlogAppUpdateCheckpointDbClient,
  input: {
    branch: string;
    processedAt: Date;
    repository: string;
    sha: string;
  }
): Promise<void> {
  const checkpoint = buildBlogAppUpdateCheckpoint(input);
  const value = JSON.parse(JSON.stringify(checkpoint)) as Prisma.InputJsonValue;

  await dbClient.appConfig.upsert({
    create: {
      key: BLOG_APP_UPDATE_CHECKPOINT_KEY,
      value,
    },
    update: {
      value,
    },
    where: {
      key: BLOG_APP_UPDATE_CHECKPOINT_KEY,
    },
  });
}

async function fetchGitHubHead(input: {
  branch: string;
  fetchImpl: typeof fetch;
  repository: string;
  token?: string;
}): Promise<GitHubCommitResponse> {
  const response = await fetchGitHubJson({
    fetchImpl: input.fetchImpl,
    path: `/repos/${input.repository}/commits/${encodeURIComponent(input.branch)}`,
    token: input.token,
  });
  const commit = zGitHubCommit.parse(response);

  return mapGitHubCommit(commit);
}

async function fetchGitHubComparison(input: {
  baseSha: string;
  branch: string;
  fetchImpl: typeof fetch;
  repository: string;
  token?: string;
}): Promise<GitHubComparisonResponse> {
  const response = await fetchGitHubJson({
    fetchImpl: input.fetchImpl,
    path: `/repos/${input.repository}/compare/${input.baseSha}...${encodeURIComponent(input.branch)}`,
    token: input.token,
  });
  const comparison = zGitHubCompare.parse(response);

  return {
    changedFiles: comparison.files?.map((file) => file.filename) ?? [],
    commits: comparison.commits.map(mapGitHubCommit),
    status: comparison.status,
  };
}

async function fetchGitHubJson(input: {
  fetchImpl: typeof fetch;
  path: string;
  token?: string;
}): Promise<unknown> {
  const response = await input.fetchImpl(
    `https://api.github.com${input.path}`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
        'User-Agent': 'nayovi-blog-update-agent',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(12_000),
    }
  );

  if (!response.ok) {
    throw new Error(`GitHub API request failed with HTTP ${response.status}.`);
  }

  return await response.json();
}

function mapGitHubCommit(
  commit: z.infer<typeof zGitHubCommit>
): BlogAppUpdateCommit {
  return {
    authoredAt: commit.commit.author?.date ?? new Date(0).toISOString(),
    message: commit.commit.message.slice(0, 500),
    sha: commit.sha,
    url: commit.html_url,
  };
}
