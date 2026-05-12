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
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

vi.mock('@/server/db', () => ({ db: mockDb }));

beforeEach(() => {
  vi.clearAllMocks();
  setupAuthenticatedUser();
});
