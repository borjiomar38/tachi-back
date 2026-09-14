import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// Explicit opt-in isolated PostgreSQL only. Never load dotenv or accept a remote target.
const target = new URL(process.env.DATABASE_URL ?? 'http://invalid');
assert.equal(target.protocol, 'postgresql:');
assert.equal(target.hostname, '127.0.0.1');
assert.equal(target.port, '55439');
assert.equal(target.pathname, '/nayovi_release_history_utf8');

const { db } = await import('@/server/db');
const { registerMobileRelease, markMobileReleasePublished } =
  await import('@/server/services/mobile-release-history');
const { zMobileReleaseInformation } =
  await import('@/server/mobile-release-information');
const manifestPath = process.argv[3];
assert.ok(manifestPath, 'Pass a generated release-information.json file');
const releaseInfo = zMobileReleaseInformation().parse(
  JSON.parse(await readFile(manifestPath, 'utf8'))
);
const policy = {
  platform: 'android',
  channel: `release-history-qa-${randomUUID()}`,
  latestVersionCode: releaseInfo.versionCode,
  latestVersionName: releaseInfo.versionName,
  releaseInfo,
};

try {
  const ids = await Promise.all(
    Array.from({ length: 5 }, () => registerMobileRelease(policy))
  );
  assert.equal(new Set(ids).size, 1, 'Concurrent retries must produce one row');
  const id = ids[0];
  assert.ok(id);
  const registered = await db.mobileAppRelease.findUniqueOrThrow({
    where: { id },
  });
  assert.equal(registered.publishedAt, null);
  assert.deepEqual(
    registered.releaseInfo,
    releaseInfo,
    'All translated text survives JSONB roundtrip'
  );
  const defaultContent = releaseInfo.locales[releaseInfo.defaultLocale];
  assert.ok(defaultContent);
  await assert.rejects(
    registerMobileRelease({
      ...policy,
      releaseInfo: {
        ...releaseInfo,
        locales: {
          ...releaseInfo.locales,
          [releaseInfo.defaultLocale]: {
            ...defaultContent,
            title: 'Conflicting title',
          },
        },
      },
    }),
    /different release information/
  );
  await markMobileReleasePublished(id);
  const first = await db.mobileAppRelease.findUniqueOrThrow({ where: { id } });
  assert.ok(first.publishedAt);
  await markMobileReleasePublished(id);
  const retry = await db.mobileAppRelease.findUniqueOrThrow({ where: { id } });
  assert.equal(retry.publishedAt?.getTime(), first.publishedAt.getTime());
  assert.equal(
    await db.mobileAppRelease.count({ where: { channel: policy.channel } }),
    1
  );
  console.log(
    'PASS: migration, concurrent/idempotent registration, immutable notes, FR/AR JSONB roundtrip, first publication timestamp.'
  );
} finally {
  await db.$disconnect();
}
