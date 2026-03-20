import { randomBytes } from 'node:crypto';

import { Prisma } from '@/server/db/generated/client';

export function generateRedeemCode() {
  const raw = randomBytes(9)
    .toString('base64url')
    .replace(/[^A-Za-z0-9]/g, '');
  const normalized = raw.slice(0, 12).toUpperCase();

  return `TB-${normalized.slice(0, 4)}-${normalized.slice(4, 8)}-${normalized.slice(8, 12)}`;
}

export function normalizeRedeemCode(input: string) {
  const raw = input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (raw.startsWith('TB') && raw.length >= 14) {
    const suffix = raw.slice(2, 14);
    return `TB-${suffix.slice(0, 4)}-${suffix.slice(4, 8)}-${suffix.slice(8, 12)}`;
  }

  return input.trim().toUpperCase();
}

export function mergeJsonObject(
  existingValue: Prisma.JsonValue | null | undefined,
  patch: Record<string, Prisma.JsonValue | undefined>
) {
  const existingObject =
    existingValue &&
    typeof existingValue === 'object' &&
    !Array.isArray(existingValue)
      ? (existingValue as Prisma.JsonObject)
      : {};

  const nextEntries = Object.entries(patch).filter(
    ([, value]) => value !== undefined
  );

  return {
    ...existingObject,
    ...Object.fromEntries(nextEntries),
  } satisfies Prisma.JsonObject;
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? null;
  }

  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('cf-connecting-ip') ??
    null
  );
}
