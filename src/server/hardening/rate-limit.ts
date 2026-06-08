import { envServer } from '@/env/server';
import { consumeInMemoryRateLimit } from '@/server/licenses/rate-limit';

export type MobileJobRateLimitBucket =
  | 'create'
  | 'page_upload'
  | 'read'
  | 'write';

export function consumeCheckoutCreateRateLimit(input: {
  clientIp: string;
  now?: number;
}) {
  return consumeInMemoryRateLimit({
    key: `checkout:create:${input.clientIp || 'unknown'}`,
    limit: envServer.CHECKOUT_RATE_LIMIT_MAX_ATTEMPTS,
    now: input.now,
    windowMs: envServer.CHECKOUT_RATE_LIMIT_WINDOW_SECONDS * 1000,
  });
}

export function consumeMobileJobRouteRateLimit(input: {
  bucket: MobileJobRateLimitBucket;
  clientIp: string;
  deviceId: string;
  licenseId: string;
  now?: number;
  scopeId?: string;
}) {
  return consumeInMemoryRateLimit({
    key: buildMobileJobRouteRateLimitKey(input),
    limit: getMobileJobRateLimit(input.bucket),
    now: input.now,
    windowMs: envServer.MOBILE_JOB_RATE_LIMIT_WINDOW_SECONDS * 1000,
  });
}

function buildMobileJobRouteRateLimitKey(input: {
  bucket: MobileJobRateLimitBucket;
  clientIp: string;
  deviceId: string;
  licenseId: string;
  scopeId?: string;
}) {
  return [
    'mobile-job',
    input.bucket,
    input.scopeId,
    input.licenseId,
    input.deviceId,
    input.clientIp || 'unknown',
  ]
    .filter((part): part is string => Boolean(part))
    .join(':');
}

function getMobileJobRateLimit(bucket: MobileJobRateLimitBucket) {
  return mobileJobRateLimitByBucket[bucket]();
}

const mobileJobRateLimitByBucket: Record<
  MobileJobRateLimitBucket,
  () => number
> = {
  create: () => envServer.MOBILE_JOB_CREATE_RATE_LIMIT_MAX_REQUESTS,
  page_upload: () => envServer.MOBILE_JOB_PAGE_UPLOAD_RATE_LIMIT_MAX_REQUESTS,
  read: () => envServer.MOBILE_JOB_READ_RATE_LIMIT_MAX_REQUESTS,
  write: () => envServer.MOBILE_JOB_WRITE_RATE_LIMIT_MAX_REQUESTS,
};
