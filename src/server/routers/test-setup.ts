import { beforeEach, vi } from 'vitest';

import {
  mockDb,
  mockGetSession,
  mockUserHasPermission,
  setupAuthenticatedUser,
} from '@/server/routers/test-utils';

vi.mock('@/server/auth', () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      userHasPermission: (...args: unknown[]) => mockUserHasPermission(...args),
    },
  },
}));

vi.mock('@tanstack/react-start/server', () => ({
  getRequestHeaders: () => new Headers(),
}));

vi.mock('@/env/client', () => ({
  envClient: {
    VITE_IS_DEMO: false,
  },
}));

vi.mock('@/env/server', () => ({
  envServer: {
    LOGGER_LEVEL: 'error',
    LOGGER_PRETTY: false,
    OPENAI_API_KEY: 'test-openai-key',
    OPENAI_BASE_URL: 'https://api.openai.com/v1',
    OPENAI_PORNOGRAPHY_MODERATION_BLOCK_THRESHOLD: 0.9,
    OPENAI_PORNOGRAPHY_MODERATION_ENABLED: true,
    OPENAI_PORNOGRAPHY_MODERATION_GATE_WAIT_MS: 20_000,
    OPENAI_PORNOGRAPHY_MODERATION_MAX_ATTEMPTS: 3,
    OPENAI_PORNOGRAPHY_MODERATION_MODEL: 'omni-moderation-2024-09-26',
    OPENAI_PORNOGRAPHY_MODERATION_POLICY_VERSION:
      '2026-08-09.explicit-pornography.v1',
    OPENAI_PORNOGRAPHY_MODERATION_REVIEW_THRESHOLD: 0.15,
    OPENAI_PORNOGRAPHY_MODERATION_TIMEOUT_MS: 15_000,
    S3_ACCESS_KEY_ID: 'test-access-key',
    S3_BUCKET_NAME: 'test-public',
    S3_FORCE_PATH_STYLE: true,
    S3_HOST: 'localhost:9000',
    S3_LOGS_BUCKET_NAME: 'test-logs',
    S3_REGION: 'auto',
    S3_RESULTS_BUCKET_NAME: 'test-results',
    S3_SECRET_ACCESS_KEY: 'test-secret-key',
    S3_SECURE: false,
    S3_UPLOADS_BUCKET_NAME: 'test-uploads',
  },
}));

vi.mock('@/server/logger', () => ({
  logger: {
    child: () => ({
      debug: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
    }),
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/server/db', () => ({ db: mockDb }));

beforeEach(() => {
  vi.clearAllMocks();
  setupAuthenticatedUser();
});
