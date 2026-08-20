import { z } from 'zod';

export const BLOG_APP_UPDATE_CHECKPOINT_KEY =
  'blog-app-update-github-checkpoint-v1';

export const zBlogAppUpdateCommit = z
  .object({
    authoredAt: z.iso.datetime(),
    message: z.string().min(3).max(500),
    sha: z.string().regex(/^[a-f0-9]{7,40}$/i),
    url: z.url(),
  })
  .strict();

export const zBlogAppUpdateEvidence = z
  .object({
    branch: z.string().min(1).max(120),
    commits: z.array(zBlogAppUpdateCommit).min(1).max(50),
    fromSha: z.string().regex(/^[a-f0-9]{7,40}$/i),
    repository: z.string().regex(/^[^/\s]+\/[^/\s]+$/),
    toSha: z.string().regex(/^[a-f0-9]{7,40}$/i),
  })
  .strict();

export const zBlogAppUpdateCheckpoint = z
  .object({
    branch: z.string().min(1).max(120),
    lastProcessedSha: z.string().regex(/^[a-f0-9]{7,40}$/i),
    processedAt: z.iso.datetime(),
    repository: z.string().regex(/^[^/\s]+\/[^/\s]+$/),
    version: z.literal(1),
  })
  .strict();

export type BlogAppUpdateCheckpoint = z.infer<typeof zBlogAppUpdateCheckpoint>;
export type BlogAppUpdateCommit = z.infer<typeof zBlogAppUpdateCommit>;
export type BlogAppUpdateEvidence = z.infer<typeof zBlogAppUpdateEvidence>;

export interface ResolveUserFacingCommitsInput {
  changedFiles: readonly string[];
  commits: readonly BlogAppUpdateCommit[];
}

const internalMessagePatterns = [
  /^(?:build|chore|ci|docs|style|test)(?:\([^)]*\))?:/i,
  /dependabot|dependency|dependencies|format(?:ting)?|lint|toolchain/i,
  /\[skip (?:actions|ci)\]/i,
];

const sensitiveMessagePatterns = [
  /credential|exploit|secret|security|token leak|vulnerabilit/i,
];

const internalPathPatterns = [
  /(?:^|\/)\.github\//,
  /(?:^|\/)buildsrc\//i,
  /(?:^|\/)(?:test|tests|__tests__)\//i,
  /(?:^|\/)docs?\//i,
  /(?:^|\/)gradle\//i,
  /(?:^|\/)scripts?\//i,
  /(?:^|\/)tools?\//i,
  /(?:^|\/)package-lock\.json$/i,
  /(?:^|\/)pnpm-lock\.yaml$/i,
];

const userFacingPathPatterns = [
  /(?:^|\/)app\/src\/main\//i,
  /(?:^|\/)src\/(?:components|features|layout|routes)\//i,
  /(?:^|\/)(?:domain|feature|presentation|reader|ui)\//i,
  /(?:^|\/)public\//i,
];

export const resolveUserFacingCommits = (
  input: ResolveUserFacingCommitsInput
): BlogAppUpdateCommit[] => {
  const hasUserFacingFile = input.changedFiles.some(isUserFacingFile);

  if (!hasUserFacingFile) {
    return [];
  }

  return input.commits.filter((commit) => {
    const subject = commit.message.split('\n')[0]?.trim() ?? '';
    const sensitive = sensitiveMessagePatterns.some((pattern) =>
      pattern.test(subject)
    );
    const internal = internalMessagePatterns.some((pattern) =>
      pattern.test(subject)
    );

    return Boolean(subject) && !sensitive && !internal;
  });
};

export const buildBlogAppUpdateCheckpoint = (input: {
  branch: string;
  processedAt: Date;
  repository: string;
  sha: string;
}): BlogAppUpdateCheckpoint =>
  zBlogAppUpdateCheckpoint.parse({
    branch: input.branch,
    lastProcessedSha: input.sha,
    processedAt: input.processedAt.toISOString(),
    repository: input.repository,
    version: 1,
  });

export const isMatchingBlogAppUpdateCheckpoint = (input: {
  branch: string;
  checkpoint: BlogAppUpdateCheckpoint;
  repository: string;
}): boolean =>
  input.checkpoint.branch === input.branch &&
  input.checkpoint.repository.toLowerCase() === input.repository.toLowerCase();

export const shouldAdvanceBlogAppUpdateCheckpoint = (
  articleStatus: 'draft' | 'failed' | 'published'
): boolean => articleStatus === 'published';

function isUserFacingFile(filename: string): boolean {
  const normalized = filename.replace(/\\/g, '/');

  if (internalPathPatterns.some((pattern) => pattern.test(normalized))) {
    return false;
  }

  return userFacingPathPatterns.some((pattern) => pattern.test(normalized));
}
