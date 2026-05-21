import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { db } from '@/server/db';
import {
  type TranslationJobResultManifest,
  zTranslationJobResultManifest,
} from '@/server/jobs/schema';
import { getTranslationJobResultManifest } from '@/server/jobs/storage';

type ChapterIdentity = {
  chapterName?: string;
  mangaTitle?: string;
  sourceName?: string;
};

type CacheFixtureIndexEntry = {
  cacheKeyPrefix: string;
  chapterCacheKeyPrefix: string | null;
  chapterName: string;
  displayName: string;
  fixtureFile: string;
  mangaTitle: string;
  pageCount: number;
  sourceLanguage: string;
  sourceName: string;
  targetLanguage: string;
  updatedAt: string;
};

const DEFAULT_OUTPUT_DIR =
  'src/server/jobs/fixtures/production-cache-regressions';
const FIXED_COMPLETED_AT = '2026-01-01T00:00:00.000Z';

const options = parseArgs(process.argv.slice(2));

try {
  const outputDir = resolve(process.cwd(), options.outputDir);
  await mkdir(outputDir, { recursive: true });

  const rows = await db.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');

    return await tx.translationResultCache.findMany({
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        bucketName: true,
        cacheKey: true,
        chapterCacheKey: true,
        chapterIdentity: true,
        objectKey: true,
        pageCount: true,
        resultManifest: true,
        sourceLanguage: true,
        targetLanguage: true,
        updatedAt: true,
      },
      take: options.limit,
    });
  });
  const indexEntries: CacheFixtureIndexEntry[] = [];
  const skipped: Array<{ cacheKey: string; reason: string }> = [];

  for (const [rowIndex, row] of rows.entries()) {
    try {
      const manifest = row.resultManifest
        ? parseManifest(row.resultManifest)
        : await getTranslationJobResultManifest({
            bucketName: row.bucketName,
            objectKey: row.objectKey,
          });
      const chapterIdentity = parseChapterIdentity(row.chapterIdentity);
      const mangaTitle = chapterIdentity.mangaTitle ?? 'unknown-manga';
      const chapterName =
        chapterIdentity.chapterName ??
        `chapter-${row.chapterCacheKey?.slice(0, 8) ?? row.cacheKey.slice(0, 8)}`;
      const sourceName = chapterIdentity.sourceName ?? 'unknown-source';
      const displayName = [
        mangaTitle,
        chapterName,
        `${row.sourceLanguage}->${row.targetLanguage}`,
      ].join(' - ');
      const fixtureFile = buildFixtureFileName({
        cacheKey: row.cacheKey,
        chapterName,
        index: rowIndex + 1,
        mangaTitle,
        sourceLanguage: row.sourceLanguage,
        targetLanguage: row.targetLanguage,
      });
      const sanitizedManifest = sanitizeManifest(manifest, rowIndex + 1);

      await writeFile(
        join(outputDir, fixtureFile),
        `${JSON.stringify(sanitizedManifest, null, 2)}\n`
      );

      indexEntries.push({
        cacheKeyPrefix: row.cacheKey.slice(0, 12),
        chapterCacheKeyPrefix: row.chapterCacheKey?.slice(0, 12) ?? null,
        chapterName,
        displayName,
        fixtureFile,
        mangaTitle,
        pageCount: row.pageCount,
        sourceLanguage: row.sourceLanguage,
        sourceName,
        targetLanguage: row.targetLanguage,
        updatedAt: row.updatedAt.toISOString(),
      });
    } catch (error) {
      skipped.push({
        cacheKey: row.cacheKey,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await writeFile(
    join(outputDir, 'index.json'),
    `${JSON.stringify(
      {
        entries: indexEntries,
        generatedFrom: 'translation_result_caches',
        schemaVersion: 'translation-cache-regression-fixtures.v1',
        skipped,
      },
      null,
      2
    )}\n`
  );

  console.log(
    JSON.stringify(
      {
        exported: indexEntries.length,
        outputDir,
        skipped,
      },
      null,
      2
    )
  );
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}

function sanitizeManifest(
  manifest: TranslationJobResultManifest,
  index: number
): TranslationJobResultManifest {
  return zTranslationJobResultManifest.parse({
    ...manifest,
    completedAt: new Date(FIXED_COMPLETED_AT),
    deviceId: `fixture-device-${String(index).padStart(4, '0')}`,
    jobId: `fixture-job-${String(index).padStart(4, '0')}`,
    licenseId: `fixture-license-${String(index).padStart(4, '0')}`,
  });
}

function parseManifest(rawManifest: unknown): TranslationJobResultManifest {
  const record =
    rawManifest &&
    typeof rawManifest === 'object' &&
    !Array.isArray(rawManifest)
      ? (rawManifest as Record<string, unknown>)
      : null;

  return zTranslationJobResultManifest.parse({
    ...record,
    completedAt:
      typeof record?.completedAt === 'string'
        ? new Date(record.completedAt)
        : record?.completedAt,
  });
}

function parseChapterIdentity(rawIdentity: unknown): ChapterIdentity {
  const record =
    rawIdentity &&
    typeof rawIdentity === 'object' &&
    !Array.isArray(rawIdentity)
      ? (rawIdentity as Record<string, unknown>)
      : {};

  return {
    chapterName:
      typeof record.chapterName === 'string' ? record.chapterName : undefined,
    mangaTitle:
      typeof record.mangaTitle === 'string' ? record.mangaTitle : undefined,
    sourceName:
      typeof record.sourceName === 'string' ? record.sourceName : undefined,
  };
}

function buildFixtureFileName(input: {
  cacheKey: string;
  chapterName: string;
  index: number;
  mangaTitle: string;
  sourceLanguage: string;
  targetLanguage: string;
}) {
  return [
    String(input.index).padStart(3, '0'),
    slugFilePart(input.mangaTitle),
    slugFilePart(input.chapterName),
    `${slugFilePart(input.sourceLanguage)}-to-${slugFilePart(
      input.targetLanguage
    )}`,
    input.cacheKey.slice(0, 10),
  ]
    .filter(Boolean)
    .join('__')
    .concat('.fixture.json');
}

function slugFilePart(value: string) {
  const slug = value
    .normalize('NFKC')
    .trim()
    .replaceAll('\\', '-')
    .replaceAll('/', '-')
    .replace(/\s+/g, '-')
    .replace(/[^\p{Letter}\p{Number}._-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+/, '')
    .replace(/[.-]+$/, '')
    .slice(0, 90);

  return slug || 'unknown';
}

function parseArgs(args: string[]) {
  const parsed = {
    limit: undefined as number | undefined,
    outputDir: DEFAULT_OUTPUT_DIR,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case '--limit':
        parsed.limit = parsePositiveInt(args[index + 1]);
        index += 1;
        break;
      case '--output':
        parsed.outputDir = args[index + 1] ?? parsed.outputDir;
        index += 1;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return parsed;
}

function parsePositiveInt(value: string | undefined) {
  if (!value) {
    throw new Error('Expected a positive integer.');
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`Invalid positive integer: ${value}`);
  }

  return parsed;
}

function printHelp() {
  console.log(`Usage:
  dotenv -- node ./run-jiti.js ./scripts/export-translation-cache-regression-fixtures.ts [options]

Options:
  --output <path>  Fixture output directory. Defaults to ${DEFAULT_OUTPUT_DIR}
  --limit <n>      Export at most n newest cache rows.
`);
}
