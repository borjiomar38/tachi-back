import { z } from 'zod';

const forbiddenPublicTextPatterns = [
  /\b(?:api|branch|commit|credential|database|endpoint|internal|migration|password|private key|pull request|repository|secret|server|sha-?\d*)\b/i,
  /\b(?:cve-\d+|exploit|vulnerabilit(?:y|ies))\b/i,
  /(?:^|\s)(?:app\/src|src\/|\.env(?:\.|\s|$))/i,
  /\.(?:gradle|java|kt|kts|sql|ts|tsx)\b/i,
  /https?:\/\//i,
] as const;

const zPublicText = (maxLength: number) =>
  z
    .string()
    .trim()
    .min(3)
    .max(maxLength)
    .refine(
      (value) =>
        forbiddenPublicTextPatterns.every((pattern) => !pattern.test(value)),
      'Release text contains internal or sensitive implementation details.'
    );

export const zLatestPublicAppUpdate = z
  .object({
    schemaVersion: z.literal(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    publishedDate: z.iso.date(),
    title: zPublicText(80),
    summary: zPublicText(240),
    highlights: z.array(zPublicText(100)).min(1).max(4),
  })
  .strict();

export type LatestPublicAppUpdate = z.infer<
  typeof zLatestPublicAppUpdate
>;

export const parseLatestPublicAppUpdate = (
  value: unknown
): LatestPublicAppUpdate => zLatestPublicAppUpdate.parse(value);

export const formatLatestPublicAppUpdateDate = (date: string): string => {
  const parsedDate = z.iso.date().parse(date);

  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(`${parsedDate}T00:00:00.000Z`));
};
