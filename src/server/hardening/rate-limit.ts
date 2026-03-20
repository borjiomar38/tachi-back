import { envServer } from '@/env/server';
import { consumeInMemoryRateLimit } from '@/server/licenses/rate-limit';

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
  bucket: 'create' | 'read' | 'write';
  clientIp: string;
  deviceId: string;
  licenseId: string;
  now?: number;
}) {
  return consumeInMemoryRateLimit({
    key: [
      'mobile-job',
      input.bucket,
      input.licenseId,
      input.deviceId,
      input.clientIp || 'unknown',
    ].join(':'),
    limit: getMobileJobRateLimit(input.bucket),
    now: input.now,
    windowMs: envServer.MOBILE_JOB_RATE_LIMIT_WINDOW_SECONDS * 1000,
  });
}

function getMobileJobRateLimit(bucket: 'create' | 'read' | 'write') {
  switch (bucket) {
    case 'create':
      return envServer.MOBILE_JOB_CREATE_RATE_LIMIT_MAX_REQUESTS;
    case 'read':
      return envServer.MOBILE_JOB_READ_RATE_LIMIT_MAX_REQUESTS;
    case 'write':
      return envServer.MOBILE_JOB_WRITE_RATE_LIMIT_MAX_REQUESTS;
  }
}
