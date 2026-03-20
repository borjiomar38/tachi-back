type RateLimitRecord = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitRecord>();

export function consumeInMemoryRateLimit(input: {
  key: string;
  limit: number;
  now?: number;
  windowMs: number;
}) {
  const now = input.now ?? Date.now();
  const existing = store.get(input.key);

  if (!existing || existing.resetAt <= now) {
    store.set(input.key, {
      count: 1,
      resetAt: now + input.windowMs,
    });

    pruneExpiredEntries(now);

    return {
      allowed: true,
      remaining: Math.max(input.limit - 1, 0),
      retryAfterMs: input.windowMs,
    } as const;
  }

  if (existing.count >= input.limit) {
    pruneExpiredEntries(now);

    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: Math.max(existing.resetAt - now, 0),
    } as const;
  }

  existing.count += 1;
  store.set(input.key, existing);
  pruneExpiredEntries(now);

  return {
    allowed: true,
    remaining: Math.max(input.limit - existing.count, 0),
    retryAfterMs: Math.max(existing.resetAt - now, 0),
  } as const;
}

function pruneExpiredEntries(now: number) {
  for (const [key, value] of store.entries()) {
    if (value.resetAt <= now) {
      store.delete(key);
    }
  }
}
