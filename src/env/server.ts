/* eslint-disable no-process-env */
import { createEnv } from '@t3-oss/env-core';
import { z } from 'zod';

const isProd = process.env.NODE_ENV
  ? process.env.NODE_ENV === 'production'
  : import.meta.env?.PROD;

const envServerBase = createEnv({
  server: {
    DATABASE_URL: z.url(),
    AUTH_SECRET: z
      .string()
      .min(32, { error: 'AUTH_SECRET must be at least 32 characters long' })
      .refine((value) => value !== 'REPLACE ME', {
        error: 'Replace AUTH_SECRET with a generated secret value',
      }),
    AUTH_SESSION_EXPIRATION_IN_SECONDS: z.coerce
      .number()
      .int()
      .prefault(2592000), // 30 days by default
    AUTH_SESSION_UPDATE_AGE_IN_SECONDS: z.coerce.number().int().prefault(86400), // 1 day by default
    AUTH_ALLOWED_HOSTS: zCsvList(),
    AUTH_TRUSTED_ORIGINS: zCsvList(),

    GITHUB_CLIENT_ID: zOptionalWithReplaceMe(),
    GITHUB_CLIENT_SECRET: zOptionalWithReplaceMe(),

    EMAIL_SERVER: z.url(),
    EMAIL_FROM: z.string(),

    LEMONSQUEEZY_ENABLED: z.stringbool().default(false),
    LEMONSQUEEZY_API_KEY: z.string().optional(),
    LEMONSQUEEZY_WEBHOOK_SECRET: z.string().optional(),
    LEMONSQUEEZY_STORE_ID: z.string().optional(),
    LEMONSQUEEZY_VARIANT_TOKENS_STARTER: z.string().optional(),
    LEMONSQUEEZY_VARIANT_TOKENS_PRO: z.string().optional(),
    LEMONSQUEEZY_VARIANT_TOKENS_POWER: z.string().optional(),

    GOOGLE_CLOUD_VISION_API_KEY: z.string().optional(),
    GOOGLE_CLOUD_TRANSLATE_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    GEMINI_TRANSLATION_MODEL: z.string().default('gemini-2.5-flash'),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_TRANSLATION_MODEL: z.string().default('gpt-4.1-mini'),
    OPENROUTER_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    ANTHROPIC_TRANSLATION_MODEL: z.string().default('claude-3-5-sonnet-latest'),
    OCR_PROVIDER_PRIMARY: z
      .enum(['google_cloud_vision'])
      .default('google_cloud_vision'),
    TRANSLATION_PROVIDER_PRIMARY: z
      .enum(['anthropic', 'gemini', 'openai'])
      .default('gemini'),
    PROVIDER_REQUEST_TIMEOUT_MS: z.coerce
      .number()
      .int()
      .positive()
      .default(60000),
    PROVIDER_RETRY_MAX_ATTEMPTS: z.coerce
      .number()
      .int()
      .min(1)
      .max(5)
      .default(2),
    TRANSLATION_BATCH_MAX_PAYLOAD_CHARS: z.coerce
      .number()
      .int()
      .positive()
      .default(2_000),
    TRANSLATION_BATCH_MAX_BLOCKS: z.coerce
      .number()
      .int()
      .positive()
      .default(45),
    TRANSLATION_BATCH_CONCURRENCY: z.coerce
      .number()
      .int()
      .positive()
      .default(40),
    TRANSLATION_BLOCK_RETRY_MAX_ATTEMPTS: z.coerce
      .number()
      .int()
      .positive()
      .default(3),
    TRANSLATION_PROMPT_VERSION: z.string().default('2026-04-24.scanlation.v1'),

    MOBILE_API_ENABLED: z.stringbool().default(false),
    MOBILE_API_JWT_SECRET: z.string().optional(),
    MOBILE_API_ISSUER: z.string().default('tachi-back'),
    MOBILE_API_AUDIENCE: z.string().default('tachiyomiat'),
    MOBILE_API_ACCESS_TOKEN_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(3600),
    MOBILE_API_REFRESH_TOKEN_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(2592000),
    MOBILE_ANDROID_LATEST_VERSION_CODE: z.coerce
      .number()
      .int()
      .min(0)
      .default(0),
    MOBILE_ANDROID_LATEST_VERSION_NAME: z.string().optional(),
    MOBILE_ANDROID_MIN_VERSION_CODE: z.coerce.number().int().min(0).default(0),
    MOBILE_ANDROID_RELEASE_URL: z.url().optional(),
    MOBILE_ANDROID_UPDATE_MESSAGE: z.string().optional(),
    MOBILE_ANDROID_UPDATE_URL: z.url().optional(),

    LOGGER_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
      .prefault(isProd ? 'error' : 'info'),
    LOGGER_PRETTY: z
      .enum(['true', 'false'])
      .prefault(isProd ? 'false' : 'true')
      .transform((value) => value === 'true'),
    S3_ACCESS_KEY_ID: z.string(),
    S3_SECRET_ACCESS_KEY: z.string(),
    S3_BUCKET_NAME: z.string().default('default'),
    S3_UPLOADS_BUCKET_NAME: z.string().default('uploads'),
    S3_RESULTS_BUCKET_NAME: z.string().default('results'),
    S3_LOGS_BUCKET_NAME: z.string().default('logs'),
    S3_REGION: z.string().default('auto'),
    S3_HOST: z.string(),
    S3_SECURE: z.stringbool().default(true),
    S3_FORCE_PATH_STYLE: z.stringbool().default(false),

    JOB_RUNTIME_MODE: z.enum(['inline', 'worker']).default('inline'),
    JOB_MAX_CONCURRENCY: z.coerce.number().int().positive().default(2),
    JOB_TOKENS_PER_CHAPTER: z.coerce.number().int().positive().default(10),
    JOB_MAX_PAGE_BYTES: z.coerce.number().int().positive().default(20_000_000),
    JOB_PAGE_UPLOAD_URL_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(900),
    JOB_RESULT_RETENTION_HOURS: z.coerce.number().int().positive().default(24),
    CHECKOUT_RATE_LIMIT_MAX_ATTEMPTS: z.coerce
      .number()
      .int()
      .positive()
      .default(10),
    CHECKOUT_RATE_LIMIT_WINDOW_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(300),
    MOBILE_JOB_CREATE_RATE_LIMIT_MAX_REQUESTS: z.coerce
      .number()
      .int()
      .positive()
      .default(12),
    MOBILE_JOB_WRITE_RATE_LIMIT_MAX_REQUESTS: z.coerce
      .number()
      .int()
      .positive()
      .default(180),
    MOBILE_JOB_READ_RATE_LIMIT_MAX_REQUESTS: z.coerce
      .number()
      .int()
      .positive()
      .default(300),
    MOBILE_JOB_RATE_LIMIT_WINDOW_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(300),
    REDEEM_RATE_LIMIT_MAX_ATTEMPTS: z.coerce
      .number()
      .int()
      .positive()
      .default(10),
    REDEEM_RATE_LIMIT_WINDOW_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(300),

    SENTRY_DSN: z.url().optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.url().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});

export const envServer = validateServerEnv(envServerBase);

function zOptionalWithReplaceMe() {
  return z
    .string()
    .optional()
    .refine(
      (value) =>
        // Check in prodution if the value is not REPLACE ME
        !isProd || value !== 'REPLACE ME',
      {
        error: 'Update the value "REPLACE ME" or remove the variable',
      }
    )
    .transform((value) => (value === 'REPLACE ME' ? undefined : value));
}

function zCsvList() {
  return z
    .string()
    .optional()
    .transform((stringValue) =>
      stringValue
        ?.split(',')
        .map((v) => v.trim())
        .filter(Boolean)
    );
}

function validateServerEnv(env: typeof envServerBase) {
  const errors: string[] = [];

  if (env.LEMONSQUEEZY_ENABLED) {
    if (!env.LEMONSQUEEZY_API_KEY) {
      errors.push(
        'LEMONSQUEEZY_API_KEY is required when LEMONSQUEEZY_ENABLED=true'
      );
    }
    if (!env.LEMONSQUEEZY_WEBHOOK_SECRET) {
      errors.push(
        'LEMONSQUEEZY_WEBHOOK_SECRET is required when LEMONSQUEEZY_ENABLED=true'
      );
    }
  }

  if (env.MOBILE_API_ENABLED) {
    if (!env.MOBILE_API_JWT_SECRET) {
      errors.push(
        'MOBILE_API_JWT_SECRET is required when MOBILE_API_ENABLED=true'
      );
    } else if (env.MOBILE_API_JWT_SECRET.length < 32) {
      errors.push('MOBILE_API_JWT_SECRET must be at least 32 characters long');
    }
  }

  if (errors.length) {
    throw new Error(
      `Invalid server environment configuration:\n- ${errors.join('\n- ')}`
    );
  }

  return env;
}
