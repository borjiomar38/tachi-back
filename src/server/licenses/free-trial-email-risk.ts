import { resolve4, resolveMx } from 'node:dns/promises';
import { domainToASCII } from 'node:url';
import { z } from 'zod';

import { envServer } from '@/env/server';
import { db } from '@/server/db';
import { Prisma } from '@/server/db/generated/client';
import { logger } from '@/server/logger';

const OPENAI_TIMEOUT_MS = 12_000;
const EMAIL_REVIEW_MODEL = 'gpt-4.1-mini';
const BLOCK_CONFIDENCE_THRESHOLD = 0.9;

const disposableEmailDomains = new Set([
  '10minutemail.com',
  'disposablemail.com',
  'getnada.com',
  'grr.la',
  'guerrillamail.com',
  'maildrop.cc',
  'mailinator.com',
  'sharklasers.com',
  'temp-mail.org',
  'tempmail.com',
  'yopmail.com',
]);

const zOpenAIReview = z.object({
  confidence: z.number().min(0).max(1),
  rationale: z.string().trim().max(300),
  verdict: z.enum(['legitimate', 'disposable', 'uncertain']),
});

const zOpenAIResponse = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string(),
      }),
    })
  ),
});

export interface FreeTrialEmailRiskReview {
  blocked: boolean;
  confidence: number | null;
  domain: string;
  knownDisposableDomain: boolean;
  mailRoutingDetected: boolean;
  rationale: string;
  status: 'accepted' | 'blocked' | 'error' | 'skipped';
  verdict: 'legitimate' | 'disposable' | 'uncertain' | null;
}

export async function reviewFreeTrialEmailRisk(
  input: { claimId: string },
  deps: {
    apiKey?: string | null;
    dbClient?: typeof db;
    fetchFn?: typeof fetch;
    resolveA?: typeof resolve4;
    resolveMailExchange?: typeof resolveMx;
  } = {}
): Promise<FreeTrialEmailRiskReview | null> {
  const dbClient = deps.dbClient ?? db;
  const reviewLog = logger.child({ scope: 'free-trial-email-risk' });
  const claim = await dbClient.freeTrialClaim.findUnique({
    select: {
      email: true,
      license: {
        select: {
          orders: {
            select: { id: true },
            take: 1,
            where: {
              paidAt: { not: null },
              status: 'paid',
            },
          },
        },
      },
      licenseId: true,
      redeemCode: {
        select: {
          id: true,
          metadata: true,
        },
      },
    },
    where: {
      id: input.claimId,
    },
  });

  if (!claim) {
    return null;
  }

  const domain = normalizeEmailDomain(claim.email);
  const knownDisposableDomain = isKnownDisposableDomain(domain);
  const mailRoutingDetected = await hasMailRouting(domain, {
    resolveA: deps.resolveA,
    resolveMailExchange: deps.resolveMailExchange,
  });
  const apiKey =
    deps.apiKey === undefined ? envServer.OPENAI_API_KEY : deps.apiKey;

  if (!apiKey) {
    const review = {
      blocked: false,
      confidence: null,
      domain,
      knownDisposableDomain,
      mailRoutingDetected,
      rationale: 'OpenAI email review is not configured.',
      status: 'skipped',
      verdict: null,
    } satisfies FreeTrialEmailRiskReview;
    await saveReviewMetadata(claim.redeemCode, review, dbClient);
    return review;
  }

  try {
    const aiReview = await requestOpenAIEmailDomainReview(
      {
        domain,
        knownDisposableDomain,
        mailRoutingDetected,
      },
      {
        apiKey,
        fetchFn: deps.fetchFn,
      }
    );
    const shouldBlock =
      claim.license.orders.length === 0 &&
      knownDisposableDomain &&
      aiReview.verdict === 'disposable' &&
      aiReview.confidence >= BLOCK_CONFIDENCE_THRESHOLD;
    const review = {
      blocked: shouldBlock,
      confidence: aiReview.confidence,
      domain,
      knownDisposableDomain,
      mailRoutingDetected,
      rationale: aiReview.rationale,
      status: shouldBlock ? 'blocked' : 'accepted',
      verdict: aiReview.verdict,
    } satisfies FreeTrialEmailRiskReview;

    if (shouldBlock) {
      await suspendFreeTrialLicense(claim.licenseId, dbClient);
    }

    await saveReviewMetadata(claim.redeemCode, review, dbClient);
    reviewLog.info({
      blocked: review.blocked,
      claimId: input.claimId,
      confidence: review.confidence,
      domain,
      knownDisposableDomain,
      mailRoutingDetected,
      verdict: review.verdict,
    });
    return review;
  } catch (error) {
    const review = {
      blocked: false,
      confidence: null,
      domain,
      knownDisposableDomain,
      mailRoutingDetected,
      rationale:
        error instanceof Error ? error.message : 'Email review failed.',
      status: 'error',
      verdict: null,
    } satisfies FreeTrialEmailRiskReview;
    await saveReviewMetadata(claim.redeemCode, review, dbClient);
    reviewLog.warn({
      claimId: input.claimId,
      domain,
      errorMessage: review.rationale,
    });
    return review;
  }
}

async function requestOpenAIEmailDomainReview(
  input: {
    domain: string;
    knownDisposableDomain: boolean;
    mailRoutingDetected: boolean;
  },
  deps: {
    apiKey: string;
    fetchFn?: typeof fetch;
  }
) {
  const fetchFn = deps.fetchFn ?? fetch;
  const response = await fetchFn('https://api.openai.com/v1/chat/completions', {
    body: JSON.stringify({
      messages: [
        {
          content:
            'Classify only the supplied email domain. Be conservative: unusual user names are not evidence, and legitimate custom domains must not be rejected. Return disposable only for a domain designed for temporary or throwaway inboxes.',
          role: 'system',
        },
        {
          content: JSON.stringify(input),
          role: 'user',
        },
      ],
      model: EMAIL_REVIEW_MODEL,
      response_format: {
        json_schema: {
          name: 'email_domain_risk_review',
          schema: {
            additionalProperties: false,
            properties: {
              confidence: { maximum: 1, minimum: 0, type: 'number' },
              rationale: { maxLength: 300, type: 'string' },
              verdict: {
                enum: ['legitimate', 'disposable', 'uncertain'],
                type: 'string',
              },
            },
            required: ['verdict', 'confidence', 'rationale'],
            type: 'object',
          },
          strict: true,
        },
        type: 'json_schema',
      },
      temperature: 0,
    }),
    headers: {
      Authorization: `Bearer ${deps.apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    signal: AbortSignal.timeout(OPENAI_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(
      `OpenAI email review failed with status ${response.status}.`
    );
  }

  const payload = zOpenAIResponse.parse(await response.json());
  const content = payload.choices[0]?.message.content;

  if (!content) {
    throw new Error('OpenAI email review returned no result.');
  }

  return zOpenAIReview.parse(JSON.parse(content));
}

async function hasMailRouting(
  domain: string,
  deps: {
    resolveA?: typeof resolve4;
    resolveMailExchange?: typeof resolveMx;
  }
) {
  if (!domain) {
    return false;
  }

  const [mxResult, addressResult] = await Promise.allSettled([
    (deps.resolveMailExchange ?? resolveMx)(domain),
    (deps.resolveA ?? resolve4)(domain),
  ]);

  return (
    (mxResult.status === 'fulfilled' && mxResult.value.length > 0) ||
    (addressResult.status === 'fulfilled' && addressResult.value.length > 0)
  );
}

function normalizeEmailDomain(email: string) {
  const rawDomain = email.trim().toLowerCase().split('@').at(-1) ?? '';
  return domainToASCII(rawDomain).replace(/^www\./, '');
}

function isKnownDisposableDomain(domain: string) {
  return Array.from(disposableEmailDomains).some(
    (blockedDomain) =>
      domain === blockedDomain || domain.endsWith(`.${blockedDomain}`)
  );
}

async function suspendFreeTrialLicense(licenseId: string, dbClient: typeof db) {
  const now = new Date();
  await dbClient.$transaction([
    dbClient.license.updateMany({
      data: {
        status: 'suspended',
      },
      where: {
        id: licenseId,
        status: { in: ['active', 'pending'] },
      },
    }),
    dbClient.mobileSession.updateMany({
      data: {
        revokeReason: 'high_confidence_disposable_email_domain',
        revokedAt: now,
      },
      where: {
        licenseId,
        revokedAt: null,
      },
    }),
  ]);
}

async function saveReviewMetadata(
  redeemCode: { id: string; metadata: Prisma.JsonValue | null },
  review: FreeTrialEmailRiskReview,
  dbClient: typeof db
) {
  const existingMetadata =
    redeemCode.metadata &&
    typeof redeemCode.metadata === 'object' &&
    !Array.isArray(redeemCode.metadata)
      ? redeemCode.metadata
      : {};

  await dbClient.redeemCode.update({
    data: {
      metadata: {
        ...existingMetadata,
        emailRiskReview: {
          ...review,
          reviewedAt: new Date().toISOString(),
        },
      } satisfies Prisma.InputJsonObject,
    },
    where: {
      id: redeemCode.id,
    },
  });
}
