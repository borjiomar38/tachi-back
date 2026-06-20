import { z } from 'zod';

import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';
import type { HttpRequestContext } from '@/server/http/route-utils';
import {
  buildTranslationChapterCacheKey,
  normalizeTranslationChapterIdentity,
} from '@/server/jobs/chapter-identity';
import { zTranslationChapterIdentity } from '@/server/jobs/schema';

const MAX_INT = 2_147_483_647;

export const zTranslationRatingFeedbackInput = z
  .object({
    chapterIdentity: zTranslationChapterIdentity.optional(),
    clientSessionId: z.string().trim().min(1).max(128).optional(),
    comment: z.string().trim().max(1000).optional(),
    pageCount: z.coerce.number().int().positive().max(10_000).optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    readDurationMs: z.coerce
      .number()
      .int()
      .nonnegative()
      .max(MAX_INT)
      .optional(),
    sourceLanguage: z.string().trim().min(1).max(32).optional(),
    status: z.enum(['rated', 'skipped']).default('rated'),
    targetLanguage: z.string().trim().min(1).max(32),
    translationCacheKey: z.string().trim().min(1).max(255).optional(),
    translationJobId: z.string().trim().min(1).max(255).optional(),
  })
  .superRefine((input, context) => {
    if (input.status === 'rated' && input.rating === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Rating is required when status is rated.',
        path: ['rating'],
      });
    }

    if (
      !input.chapterIdentity &&
      !input.translationCacheKey &&
      !input.translationJobId
    ) {
      context.addIssue({
        code: 'custom',
        message:
          'A chapter identity, translation cache key, or translation job id is required.',
        path: ['chapterIdentity'],
      });
    }
  });

type TranslationRatingFeedbackInput = z.infer<
  typeof zTranslationRatingFeedbackInput
>;

type MobileRatingActor = {
  deviceId: string;
  licenseId: string;
};

type TranslationReference = {
  chapterCacheKey: string | null;
  chapterIdentity: unknown;
  pageCount: number | null;
  sourceLanguage: string | null;
  targetLanguage: string;
};

export class TranslationRatingFeedbackError extends Error {
  constructor(
    readonly code: 'invalid_feedback' | 'invalid_translation_reference',
    readonly statusCode: number,
    options?: { details?: unknown; message?: string }
  ) {
    super(options?.message ?? code);
    this.details = options?.details;
    this.name = 'TranslationRatingFeedbackError';
  }

  readonly details?: unknown;
}

export async function recordTranslationRatingFeedback(
  rawInput: unknown,
  deps: {
    actor: MobileRatingActor;
    dbClient?: typeof db;
    requestContext?: Pick<HttpRequestContext, 'clientIp' | 'userAgent'>;
  }
) {
  const input = zTranslationRatingFeedbackInput.parse(rawInput);
  const dbClient = deps.dbClient ?? db;
  const [job, cacheEntry] = await Promise.all([
    input.translationJobId
      ? dbClient.translationJob.findFirst({
          select: {
            chapterCacheKey: true,
            chapterIdentity: true,
            id: true,
            pageCount: true,
            sourceLanguage: true,
            targetLanguage: true,
          },
          where: {
            deviceId: deps.actor.deviceId,
            id: input.translationJobId,
            licenseId: deps.actor.licenseId,
          },
        })
      : Promise.resolve(null),
    input.translationCacheKey
      ? dbClient.translationResultCache.findUnique({
          select: {
            cacheKey: true,
            chapterCacheKey: true,
            chapterIdentity: true,
            pageCount: true,
            sourceLanguage: true,
            targetLanguage: true,
          },
          where: {
            cacheKey: input.translationCacheKey,
          },
        })
      : Promise.resolve(null),
  ]);

  if (input.translationJobId && !job) {
    throw new TranslationRatingFeedbackError(
      'invalid_translation_reference',
      404
    );
  }

  if (input.translationCacheKey && !cacheEntry && !input.chapterIdentity) {
    throw new TranslationRatingFeedbackError(
      'invalid_translation_reference',
      404
    );
  }

  const reference = resolveTranslationReference(input, {
    cacheEntry,
    job,
  });
  const existing = await findExistingFeedback(dbClient, {
    actor: deps.actor,
    chapterCacheKey: reference.chapterCacheKey,
    clientSessionId: input.clientSessionId ?? null,
    jobId: job?.id ?? null,
    targetLanguage: input.targetLanguage,
  });
  const data = buildFeedbackData(input, {
    actor: deps.actor,
    cacheKey: cacheEntry?.cacheKey ?? input.translationCacheKey ?? null,
    jobId: job?.id ?? null,
    reference,
    requestContext: deps.requestContext,
  });

  if (existing) {
    await dbClient.translationRatingFeedback.update({
      data,
      where: {
        id: existing.id,
      },
    });

    return {
      duplicate: true,
    };
  }

  try {
    await dbClient.translationRatingFeedback.create({
      data,
    });

    return {
      duplicate: false,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return {
        duplicate: true,
      };
    }

    throw error;
  }
}

function resolveTranslationReference(
  input: TranslationRatingFeedbackInput,
  refs: {
    cacheEntry: TranslationReference | null;
    job: (TranslationReference & { id: string }) | null;
  }
) {
  const rawChapterIdentity =
    input.chapterIdentity ??
    refs.job?.chapterIdentity ??
    refs.cacheEntry?.chapterIdentity ??
    null;
  const normalizedChapterIdentity =
    normalizeTranslationChapterIdentity(rawChapterIdentity);
  const chapterCacheKey =
    refs.job?.chapterCacheKey ??
    refs.cacheEntry?.chapterCacheKey ??
    buildTranslationChapterCacheKey(rawChapterIdentity);

  if (!chapterCacheKey && !normalizedChapterIdentity) {
    throw new TranslationRatingFeedbackError('invalid_feedback', 400, {
      message: 'Unable to resolve the translated chapter.',
    });
  }

  return {
    chapterCacheKey,
    chapterIdentity: normalizedChapterIdentity,
    pageCount:
      input.pageCount ??
      refs.job?.pageCount ??
      refs.cacheEntry?.pageCount ??
      null,
    sourceLanguage:
      input.sourceLanguage ??
      refs.job?.sourceLanguage ??
      refs.cacheEntry?.sourceLanguage ??
      null,
    targetLanguage: input.targetLanguage,
  };
}

async function findExistingFeedback(
  dbClient: typeof db,
  input: {
    actor: MobileRatingActor;
    chapterCacheKey: string | null;
    clientSessionId: string | null;
    jobId: string | null;
    targetLanguage: string;
  }
) {
  const conditions: Prisma.TranslationRatingFeedbackWhereInput[] = [];

  if (input.clientSessionId) {
    conditions.push({
      clientSessionId: input.clientSessionId,
    });
  }

  if (input.jobId) {
    conditions.push({
      jobId: input.jobId,
    });
  }

  if (input.chapterCacheKey) {
    conditions.push({
      chapterCacheKey: input.chapterCacheKey,
      targetLanguage: input.targetLanguage,
    });
  }

  if (!conditions.length) {
    return null;
  }

  return await dbClient.translationRatingFeedback.findFirst({
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
    },
    where: {
      deviceId: input.actor.deviceId,
      licenseId: input.actor.licenseId,
      OR: conditions,
    },
  });
}

function buildFeedbackData(
  input: TranslationRatingFeedbackInput,
  refs: {
    actor: MobileRatingActor;
    cacheKey: string | null;
    jobId: string | null;
    reference: ReturnType<typeof resolveTranslationReference>;
    requestContext?: Pick<HttpRequestContext, 'clientIp' | 'userAgent'>;
  }
) {
  return {
    chapterCacheKey: refs.reference.chapterCacheKey,
    chapterIdentity: refs.reference.chapterIdentity
      ? (refs.reference.chapterIdentity as Prisma.InputJsonValue)
      : undefined,
    clientSessionId: input.clientSessionId,
    comment: input.status === 'rated' ? input.comment?.trim() || null : null,
    deviceId: refs.actor.deviceId,
    ipAddress: refs.requestContext?.clientIp,
    jobId: refs.jobId,
    licenseId: refs.actor.licenseId,
    pageCount: refs.reference.pageCount,
    rating: input.status === 'rated' ? (input.rating ?? null) : null,
    readDurationMs: input.readDurationMs,
    sourceLanguage: refs.reference.sourceLanguage,
    status: input.status,
    targetLanguage: refs.reference.targetLanguage,
    translationCacheKey: refs.cacheKey,
    userAgent: refs.requestContext?.userAgent,
  } satisfies Prisma.TranslationRatingFeedbackUncheckedCreateInput;
}
