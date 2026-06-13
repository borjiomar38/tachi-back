import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';
import {
  type CreateTranslationRatingFeedbackInput,
  zCreateTranslationRatingFeedbackInput,
  zTranslationRatingFeedbackSubmissionResponse,
} from '@/server/translation-rating-feedback/schema';

interface TranslationRatingFeedbackActor {
  appBuild?: string | null;
  appVersion?: string | null;
  clientIp?: string | null;
  deviceId: string;
  licenseId: string;
  locale?: string | null;
  mobileSessionId?: string | null;
  userAgent?: string | null;
}

interface CreateTranslationRatingFeedbackOptions {
  actor: TranslationRatingFeedbackActor;
  dbClient?: typeof db;
}

interface ChapterIdentityParts {
  chapterName: string | null;
  chapterUrl: string | null;
  mangaTitle: string | null;
  sourceId: string | null;
  sourceName: string | null;
}

export async function createTranslationRatingFeedback(
  rawInput: unknown,
  options: CreateTranslationRatingFeedbackOptions
) {
  const input = zCreateTranslationRatingFeedbackInput.parse(rawInput);
  const dbClient = options.dbClient ?? db;
  const chapterFingerprint = buildTranslationRatingChapterFingerprint(input);
  const existing = await dbClient.translationRatingFeedback.findUnique({
    select: {
      createdAt: true,
      id: true,
      rating: true,
    },
    where: {
      licenseId_deviceId_chapterFingerprint_targetLanguage: {
        chapterFingerprint,
        deviceId: options.actor.deviceId,
        licenseId: options.actor.licenseId,
        targetLanguage: input.targetLanguage,
      },
    },
  });

  if (existing) {
    return zTranslationRatingFeedbackSubmissionResponse.parse({
      duplicate: true,
      feedback: existing,
    });
  }

  const chapterIdentityParts = getChapterIdentityParts(input);

  try {
    const feedback = await dbClient.translationRatingFeedback.create({
      data: {
        appBuild: options.actor.appBuild ?? undefined,
        appVersion: options.actor.appVersion ?? undefined,
        chapterCacheKey: input.chapterCacheKey,
        chapterFingerprint,
        chapterIdentity: input.chapterIdentity
          ? (input.chapterIdentity as Prisma.InputJsonValue)
          : undefined,
        chapterName: chapterIdentityParts.chapterName ?? undefined,
        chapterUrl: chapterIdentityParts.chapterUrl ?? undefined,
        clientSessionId: input.clientSessionId,
        comment: normalizeOptionalText(input.comment),
        deviceId: options.actor.deviceId,
        ipAddress: options.actor.clientIp ?? undefined,
        licenseId: options.actor.licenseId,
        locale: options.actor.locale ?? undefined,
        mangaTitle: chapterIdentityParts.mangaTitle ?? undefined,
        mobileSessionId: options.actor.mobileSessionId ?? undefined,
        pageCount: input.pageCount,
        providerSignature: input.providerSignature,
        rating: input.rating,
        readDurationMs: input.readDurationMs,
        sourceId: chapterIdentityParts.sourceId ?? undefined,
        sourceLanguage: input.sourceLanguage,
        sourceName: chapterIdentityParts.sourceName ?? undefined,
        targetLanguage: input.targetLanguage,
        translationCacheKey: input.translationCacheKey,
        translationJobId: input.translationJobId,
        userAgent: options.actor.userAgent ?? undefined,
      },
      select: {
        createdAt: true,
        id: true,
        rating: true,
      },
    });

    return zTranslationRatingFeedbackSubmissionResponse.parse({
      duplicate: false,
      feedback,
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const feedback =
        await dbClient.translationRatingFeedback.findUniqueOrThrow({
          select: {
            createdAt: true,
            id: true,
            rating: true,
          },
          where: {
            licenseId_deviceId_chapterFingerprint_targetLanguage: {
              chapterFingerprint,
              deviceId: options.actor.deviceId,
              licenseId: options.actor.licenseId,
              targetLanguage: input.targetLanguage,
            },
          },
        });

      return zTranslationRatingFeedbackSubmissionResponse.parse({
        duplicate: true,
        feedback,
      });
    }

    throw error;
  }
}

export function buildTranslationRatingChapterFingerprint(
  input: CreateTranslationRatingFeedbackInput
) {
  const identity = input.chapterIdentity;
  const fingerprintSource =
    input.chapterCacheKey ??
    identity?.chapterUrl ??
    input.translationCacheKey ??
    input.translationJobId;

  return fingerprintSource?.trim().toLowerCase() ?? '';
}

function getChapterIdentityParts(
  input: CreateTranslationRatingFeedbackInput
): ChapterIdentityParts {
  return {
    chapterName: input.chapterIdentity?.chapterName ?? null,
    chapterUrl:
      input.chapterIdentity?.chapterUrl ?? input.chapterCacheKey ?? null,
    mangaTitle: input.chapterIdentity?.mangaTitle ?? null,
    sourceId: input.chapterIdentity?.sourceId ?? null,
    sourceName: input.chapterIdentity?.sourceName ?? null,
  };
}

function normalizeOptionalText(value: string | undefined) {
  const normalized = value?.trim();

  return normalized ? normalized : undefined;
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
