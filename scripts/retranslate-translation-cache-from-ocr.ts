import { envServer } from '@/env/server';
import { db } from '@/server/db';
import { Prisma, ProviderType } from '@/server/db/generated/client';
import {
  coalesceOcrLineBlocks,
  coalesceOcrPageContinuations,
} from '@/server/jobs/ocr-block-grouping';
import {
  type TranslationJobResultManifest,
  zTranslationJobResultManifest,
} from '@/server/jobs/schema';
import { JOB_RESULT_VERSION } from '@/server/jobs/service';
import {
  getTranslationJobResultManifest,
  putTranslationJobResultManifest,
  putTranslationResultCacheManifest,
} from '@/server/jobs/storage';
import {
  type HostedPageTranslation,
  type NormalizedOcrPage,
  zNormalizedOcrPage,
} from '@/server/provider-gateway/schema';
import {
  mergeHostedPageTranslation,
  performHostedTranslation,
} from '@/server/provider-gateway/service';
import {
  cleanProviderTranslationText,
  shouldDropProviderTranslationBlock,
} from '@/server/provider-gateway/translation-cleanup';

type TranslationProvider = 'anthropic' | 'gemini' | 'openai';
type OcrProvider = 'gemini' | 'google_cloud_vision';

type CliOptions = {
  all: boolean;
  apply: boolean;
  cacheKeys: string[];
  chapterCacheKey?: string;
  chapterSearch?: string;
  json: boolean;
  limit: number;
  targetLanguage?: string;
  translationProvider?: TranslationProvider;
  updateLatestJob: boolean;
};

type CacheRow = {
  bucketName: string;
  cacheKey: string;
  chapterCacheKey: string | null;
  chapterIdentity: unknown;
  objectKey: string;
  pageCount: number;
  providerSignature: string;
  resultManifest: unknown;
  targetLanguage: string;
  updatedAt: Date;
};

const options = parseArgs(process.argv.slice(2));

try {
  const rows = await findCacheRows(options);
  const filteredRows = options.chapterSearch
    ? rows.filter((row) => matchesChapterSearch(row, options.chapterSearch!))
    : rows;

  if (filteredRows.length === 0) {
    throw new Error('No translation cache rows matched the provided filters.');
  }

  if (options.apply && filteredRows.length > 1 && !options.all) {
    printRows(filteredRows);
    throw new Error(
      'Multiple cache rows matched. Re-run with --cache-key <key> or --all.'
    );
  }

  const summaries = [];

  for (const row of filteredRows) {
    const manifest = await loadCacheManifest(row);
    const plan = buildRetranslationPlan({
      manifest,
      options,
      row,
    });

    if (!options.apply) {
      summaries.push({
        cacheKey: row.cacheKey,
        chapterCacheKey: row.chapterCacheKey,
        dryRun: true,
        pageChanges: plan.pageChanges,
        targetLanguage: row.targetLanguage,
        totalBlocksAfter: plan.totalBlocksAfter,
        totalBlocksBefore: plan.totalBlocksBefore,
        updatedAt: row.updatedAt,
      });
      continue;
    }

    const translatedManifest = await retranslateFromPlan({
      manifest,
      plan,
      row,
    });
    const cacheUpdate = await storeRetranslatedCache({
      manifest: translatedManifest,
      plan,
      row,
    });
    const updatedJob = options.updateLatestJob
      ? await updateLatestCompletedJobResult({
          manifest: translatedManifest,
          row,
        })
      : null;

    summaries.push({
      cacheKey: row.cacheKey,
      chapterCacheKey: row.chapterCacheKey,
      dryRun: false,
      objectKey: cacheUpdate.objectKey,
      pageChanges: plan.pageChanges,
      targetLanguage: translatedManifest.targetLanguage,
      totalBlocksAfter: plan.totalBlocksAfter,
      totalBlocksBefore: plan.totalBlocksBefore,
      updatedLatestJobId: updatedJob?.id ?? null,
    });
  }

  if (options.json) {
    console.log(JSON.stringify({ rows: summaries }, null, 2));
  } else {
    for (const summary of summaries) {
      console.log('');
      console.log(summary.dryRun ? 'Dry run' : 'Updated cache');
      console.log(`Cache key: ${summary.cacheKey}`);
      console.log(`Chapter cache key: ${summary.chapterCacheKey ?? 'none'}`);
      console.log(`Target language: ${summary.targetLanguage}`);
      console.log(
        `Blocks: ${summary.totalBlocksBefore} -> ${summary.totalBlocksAfter}`
      );
      console.log(`Changed pages: ${summary.pageChanges.length}`);

      for (const page of summary.pageChanges.slice(0, 20)) {
        console.log(
          `- ${page.pageKey}: ${page.blocksBefore} -> ${page.blocksAfter}`
        );
      }

      if ('updatedLatestJobId' in summary) {
        console.log(
          `Updated latest job: ${summary.updatedLatestJobId ?? 'no matching completed job'}`
        );
      }
    }
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}

async function findCacheRows(input: CliOptions): Promise<CacheRow[]> {
  if (
    input.cacheKeys.length === 0 &&
    !input.chapterCacheKey &&
    !input.chapterSearch
  ) {
    throw new Error(
      'Provide --cache-key, --chapter-cache-key, or --chapter to select rows.'
    );
  }

  const where: Prisma.TranslationResultCacheWhereInput = {};

  if (input.cacheKeys.length === 1) {
    where.cacheKey = input.cacheKeys[0];
  } else if (input.cacheKeys.length > 1) {
    where.cacheKey = {
      in: input.cacheKeys,
    };
  }

  if (input.chapterCacheKey) {
    where.chapterCacheKey = input.chapterCacheKey;
  }

  if (input.targetLanguage) {
    where.targetLanguage = input.targetLanguage;
  }

  return await db.translationResultCache.findMany({
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
      providerSignature: true,
      resultManifest: true,
      targetLanguage: true,
      updatedAt: true,
    },
    take: input.cacheKeys.length > 0 ? undefined : input.limit,
    where,
  });
}

async function loadCacheManifest(row: CacheRow) {
  if (row.resultManifest) {
    return parseManifest(row.resultManifest);
  }

  return await getTranslationJobResultManifest({
    bucketName: row.bucketName,
    objectKey: row.objectKey,
  });
}

function buildRetranslationPlan(input: {
  manifest: TranslationJobResultManifest;
  options: CliOptions;
  row: CacheRow;
}) {
  const providerSignature = parseProviderSignature(input.row.providerSignature);
  const ocrProvider = providerSignature.ocrProvider ?? 'google_cloud_vision';
  const translationProvider =
    input.options.translationProvider ??
    providerSignature.translationProvider ??
    input.manifest.translatorType;
  const layoutPages = coalesceOcrPageContinuations(
    input.manifest.pageOrder.map((pageKey) => {
      const cachedPage = input.manifest.pages[pageKey];

      if (!cachedPage) {
        throw new Error(`Manifest is missing page ${pageKey}`);
      }

      return {
        fileName: pageKey,
        ocrPage: coalesceOcrLineBlocks(
          buildCachedOcrPage({
            cacheKey: input.row.cacheKey,
            ocrProvider,
            page: cachedPage,
            sourceLanguage:
              cachedPage.sourceLanguage || input.manifest.sourceLanguage,
          })
        ),
      };
    })
  );
  const detectedLanguages = layoutPages.map(
    (page) => page.ocrPage.sourceLanguage
  );
  const sourceLanguage = resolveEffectiveSourceLanguage(
    input.manifest.sourceLanguage,
    detectedLanguages
  );
  const pageChanges = layoutPages
    .map((page) => {
      const beforeCount =
        input.manifest.pages[page.fileName]?.blocks.length ?? 0;
      const afterCount = page.ocrPage.blocks.length;

      return {
        blocksAfter: afterCount,
        blocksBefore: beforeCount,
        pageKey: page.fileName,
      };
    })
    .filter((page) => page.blocksAfter !== page.blocksBefore);

  return {
    layoutPages,
    pageChanges,
    providerSignature: buildProviderSignature({
      ocrProvider,
      translationProvider,
    }),
    sourceLanguage,
    targetLanguage: input.row.targetLanguage,
    totalBlocksAfter: layoutPages.reduce(
      (sum, page) => sum + page.ocrPage.blocks.length,
      0
    ),
    totalBlocksBefore: input.manifest.pageOrder.reduce(
      (sum, pageKey) =>
        sum + (input.manifest.pages[pageKey]?.blocks.length ?? 0),
      0
    ),
    translationProvider,
  };
}

function buildCachedOcrPage(input: {
  cacheKey: string;
  ocrProvider: OcrProvider;
  page: HostedPageTranslation;
  sourceLanguage: string;
}) {
  const sanitizedPage = sanitizeHostedPageTranslation(input.page);

  return zNormalizedOcrPage.parse({
    blocks: sanitizedPage.blocks.map(
      ({ translation: _translation, ...block }) => block
    ),
    imgHeight: sanitizedPage.imgHeight,
    imgWidth: sanitizedPage.imgWidth,
    provider: input.ocrProvider,
    providerModel: 'cached_result_manifest',
    providerRequestId: input.cacheKey,
    sourceLanguage: input.sourceLanguage,
    usage: {
      inputTokens: null,
      latencyMs: 0,
      outputTokens: null,
      pageCount: 1,
      providerRequestId: input.cacheKey,
      requestCount: 1,
    },
  });
}

async function retranslateFromPlan(input: {
  manifest: TranslationJobResultManifest;
  plan: ReturnType<typeof buildRetranslationPlan>;
  row: CacheRow;
}) {
  const translatableBlockIndexesByPage = new Map<string, number[]>();
  const translatablePages = input.plan.layoutPages.flatMap((page) => {
    const translatableBlockIndexes: number[] = [];
    const blocks = page.ocrPage.blocks.flatMap((block, index) => {
      if (isMaskOnlyOcrBlock(block)) {
        return [];
      }

      translatableBlockIndexes.push(index);
      return [{ text: block.text }];
    });

    translatableBlockIndexesByPage.set(page.fileName, translatableBlockIndexes);

    return blocks.length > 0
      ? [
          {
            blocks,
            pageKey: page.fileName,
          },
        ]
      : [];
  });
  const translationBatch =
    translatablePages.length > 0
      ? await performHostedTranslation({
          pages: translatablePages,
          preferredProvider: input.plan.translationProvider,
          sourceLanguage: input.plan.sourceLanguage,
          targetLanguage: input.plan.targetLanguage,
        })
      : null;
  const translationsByPage = new Map(
    translationBatch?.pages.map((page) => [page.pageKey, page]) ?? []
  );
  const pages: Record<string, HostedPageTranslation> = {};

  for (const page of input.plan.layoutPages) {
    const translatableBlockIndexes =
      translatableBlockIndexesByPage.get(page.fileName) ?? [];
    const translationPage =
      translationsByPage.get(page.fileName) ??
      (translatableBlockIndexes.length === 0
        ? {
            blocks: [],
            pageKey: page.fileName,
          }
        : null);

    if (!translationPage) {
      throw new Error(`Missing translation page for ${page.fileName}`);
    }

    pages[page.fileName] = mergeHostedPageTranslation({
      ocrPage: page.ocrPage,
      targetLanguage: input.plan.targetLanguage,
      translationPage: mapTranslationPageToOcrBlocks({
        ocrPage: page.ocrPage,
        pageKey: page.fileName,
        translatableBlockIndexes,
        translationPage,
      }),
      translatorType:
        translationBatch?.provider ?? input.plan.translationProvider,
    });
  }

  return zTranslationJobResultManifest.parse({
    ...input.manifest,
    completedAt: new Date(),
    pageCount: input.plan.layoutPages.length,
    pageOrder: input.plan.layoutPages.map((page) => page.fileName),
    pages,
    sourceLanguage: input.plan.sourceLanguage,
    targetLanguage: input.plan.targetLanguage,
    translatorType:
      translationBatch?.provider ?? input.plan.translationProvider,
    version: JOB_RESULT_VERSION,
  });
}

async function storeRetranslatedCache(input: {
  manifest: TranslationJobResultManifest;
  plan: ReturnType<typeof buildRetranslationPlan>;
  row: CacheRow;
}) {
  const storedCacheResult = await putTranslationResultCacheManifest({
    cacheKey: input.row.cacheKey,
    manifest: input.manifest,
  });
  const manifestJson = JSON.stringify(input.manifest);

  await db.translationResultCache.update({
    data: {
      bucketName: storedCacheResult.bucketName,
      objectKey: storedCacheResult.objectKey,
      pageCount: input.manifest.pageCount,
      providerSignature: input.plan.providerSignature,
      resultManifest: JSON.parse(manifestJson) as Prisma.InputJsonValue,
      resultPayloadVersion: input.manifest.version,
      sizeBytes: Buffer.byteLength(manifestJson),
      sourceLanguage: input.manifest.sourceLanguage,
      targetLanguage: input.manifest.targetLanguage,
    },
    where: {
      cacheKey: input.row.cacheKey,
    },
  });

  return storedCacheResult;
}

async function updateLatestCompletedJobResult(input: {
  manifest: TranslationJobResultManifest;
  row: CacheRow;
}) {
  if (!input.row.chapterCacheKey) {
    return null;
  }

  const job = await db.translationJob.findFirst({
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      deviceId: true,
      id: true,
      licenseId: true,
      pageCount: true,
    },
    where: {
      chapterCacheKey: input.row.chapterCacheKey,
      status: 'completed',
      targetLanguage: input.manifest.targetLanguage,
    },
  });

  if (!job || job.pageCount !== input.manifest.pageCount) {
    return null;
  }

  const completedAt = new Date();
  const jobManifest = zTranslationJobResultManifest.parse({
    ...input.manifest,
    completedAt,
    deviceId: job.deviceId,
    jobId: job.id,
    licenseId: job.licenseId,
  });
  const storedResult = await putTranslationJobResultManifest(jobManifest);
  const manifestJson = JSON.stringify(jobManifest);

  await db.$transaction(async (tx) => {
    const existingResultAsset = await tx.jobAsset.findFirst({
      select: {
        id: true,
      },
      where: {
        jobId: job.id,
        kind: 'result_manifest',
      },
    });
    const resultAssetData = {
      bucketName: storedResult.bucketName,
      metadata: {
        cacheRetypedFromOcr: true,
        pageCount: jobManifest.pageCount,
        version: JOB_RESULT_VERSION,
      },
      mimeType: 'application/json',
      objectKey: storedResult.objectKey,
      sizeBytes: Buffer.byteLength(manifestJson),
    };

    if (existingResultAsset) {
      await tx.jobAsset.update({
        data: resultAssetData,
        where: {
          id: existingResultAsset.id,
        },
      });
    } else {
      await tx.jobAsset.create({
        data: {
          ...resultAssetData,
          jobId: job.id,
          kind: 'result_manifest',
        },
      });
    }

    await tx.translationJob.update({
      data: {
        completedAt,
        resultPayloadVersion: JOB_RESULT_VERSION,
        sourceLanguage: jobManifest.sourceLanguage,
      },
      where: {
        id: job.id,
      },
    });
  });

  return job;
}

function mapTranslationPageToOcrBlocks(input: {
  ocrPage: NormalizedOcrPage;
  pageKey: string;
  translatableBlockIndexes: number[];
  translationPage: {
    blocks: Array<{ translation?: string }>;
    pageKey: string;
  };
}) {
  const translationsByOcrBlockIndex = new Map<number, string>();

  for (const [
    translationBlockIndex,
    ocrBlockIndex,
  ] of input.translatableBlockIndexes.entries()) {
    translationsByOcrBlockIndex.set(
      ocrBlockIndex,
      input.translationPage.blocks[translationBlockIndex]?.translation ?? ''
    );
  }

  return {
    blocks: input.ocrPage.blocks.map((block, index) => ({
      index,
      sourceText: block.text,
      translation: isMaskOnlyOcrBlock(block)
        ? ''
        : (translationsByOcrBlockIndex.get(index) ?? ''),
    })),
    pageKey: input.pageKey,
  };
}

function isMaskOnlyOcrBlock(block: NormalizedOcrPage['blocks'][number]) {
  return block.renderMode === 'mask_only';
}

function sanitizeHostedPageTranslation(
  page: HostedPageTranslation
): HostedPageTranslation {
  return {
    ...page,
    blocks: page.blocks
      .map((block) => {
        const rawTranslation = block.translation;

        return {
          ...block,
          rawTranslation,
          translation: cleanProviderTranslationText(rawTranslation),
        };
      })
      .filter(
        (block) =>
          !shouldDropProviderTranslationBlock({
            sourceText: block.text,
            translation: block.rawTranslation,
          })
      )
      .map(({ rawTranslation: _rawTranslation, ...block }) => block),
  };
}

function parseManifest(rawManifest: unknown) {
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

function parseProviderSignature(signature: string): {
  ocrProvider?: OcrProvider;
  translationProvider?: TranslationProvider;
} {
  try {
    const parsed = JSON.parse(signature) as Record<string, unknown>;
    const ocrProvider =
      parsed.ocrProvider === ProviderType.gemini ||
      parsed.ocrProvider === ProviderType.google_cloud_vision
        ? parsed.ocrProvider
        : undefined;
    const translationProvider =
      parsed.translationProvider === ProviderType.anthropic ||
      parsed.translationProvider === ProviderType.gemini ||
      parsed.translationProvider === ProviderType.openai
        ? parsed.translationProvider
        : undefined;

    return {
      ocrProvider,
      translationProvider,
    };
  } catch {
    return {};
  }
}

function buildProviderSignature(input: {
  ocrProvider: OcrProvider;
  translationProvider: TranslationProvider;
}) {
  return JSON.stringify({
    ocrProvider: input.ocrProvider,
    promptVersion: envServer.TRANSLATION_PROMPT_VERSION ?? null,
    resultVersion: JOB_RESULT_VERSION,
    translationProvider: input.translationProvider,
  });
}

function resolveEffectiveSourceLanguage(
  requestedSourceLanguage: string,
  detectedLanguages: string[]
) {
  if (requestedSourceLanguage !== 'auto') {
    return requestedSourceLanguage;
  }

  const counts = detectedLanguages
    .filter((language) => language && language !== 'auto')
    .reduce<Record<string, number>>((accumulator, language) => {
      accumulator[language] = (accumulator[language] ?? 0) + 1;
      return accumulator;
    }, {});
  const dominantLanguage = Object.entries(counts).sort(
    (left, right) => right[1] - left[1]
  )[0]?.[0];

  return dominantLanguage ?? 'auto';
}

function matchesChapterSearch(row: CacheRow, search: string) {
  const haystack = [
    row.cacheKey,
    row.chapterCacheKey ?? '',
    JSON.stringify(row.chapterIdentity ?? {}),
  ]
    .join(' ')
    .toLowerCase();

  return haystack.includes(search.toLowerCase());
}

function printRows(rows: CacheRow[]) {
  for (const row of rows) {
    console.log(
      [
        row.cacheKey,
        row.chapterCacheKey ?? 'no-chapter-cache-key',
        row.targetLanguage,
        row.updatedAt.toISOString(),
        JSON.stringify(row.chapterIdentity ?? {}),
      ].join(' | ')
    );
  }
}

function parseArgs(args: string[]): CliOptions {
  const parsed: CliOptions = {
    all: false,
    apply: false,
    cacheKeys: [],
    json: false,
    limit: 20,
    updateLatestJob: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case '--all':
        parsed.all = true;
        break;
      case '--apply':
        parsed.apply = true;
        break;
      case '--cache-key':
        parsed.cacheKeys.push(requireValue(args, index));
        index += 1;
        break;
      case '--chapter':
        parsed.chapterSearch = requireValue(args, index);
        index += 1;
        break;
      case '--chapter-cache-key':
        parsed.chapterCacheKey = requireValue(args, index);
        index += 1;
        break;
      case '--json':
        parsed.json = true;
        break;
      case '--limit':
        parsed.limit = parsePositiveInt(requireValue(args, index), 20);
        index += 1;
        break;
      case '--target-language':
        parsed.targetLanguage = requireValue(args, index);
        index += 1;
        break;
      case '--translation-provider':
        parsed.translationProvider = parseTranslationProvider(
          requireValue(args, index)
        );
        index += 1;
        break;
      case '--update-latest-job':
        parsed.updateLatestJob = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return parsed;
}

function requireValue(args: string[], index: number) {
  const value = args[index + 1];

  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${args[index]}`);
  }

  return value;
}

function parsePositiveInt(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseTranslationProvider(value: string): TranslationProvider {
  if (value === 'anthropic' || value === 'gemini' || value === 'openai') {
    return value;
  }

  throw new Error(`Unsupported translation provider: ${value}`);
}

function printHelp() {
  console.log(`Usage:
  dotenv -- node ./run-jiti.js ./scripts/retranslate-translation-cache-from-ocr.ts [options]

Options:
  --cache-key <key>             Retranslate one exact cache row.
  --chapter-cache-key <key>     Filter by chapter cache key.
  --chapter <text>              Filter by serialized chapter identity text.
  --target-language <lang>      Filter by target language.
  --translation-provider <name> Override provider: anthropic, gemini, openai.
  --update-latest-job           Also rewrite the latest completed job result.
  --all                         Allow applying to multiple matching rows.
  --apply                       Write changes. Without this, only dry-runs.
  --json                        Print machine-readable JSON.
  --limit <number>              Max rows to scan when using --chapter. Default: 20.
`);
}
