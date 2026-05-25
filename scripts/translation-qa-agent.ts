import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { db } from '@/server/db';
import { JobAssetKind, Prisma } from '@/server/db/generated/client';
import {
  analyzeTranslationManifestOcr,
  selectTopOcrGroupingIssues,
  summarizeOcrManifestAnalyses,
} from '@/server/jobs/ocr-cache-analysis';
import { type TranslationJobResultManifest } from '@/server/jobs/schema';
import {
  deleteTranslationJobPageUploads,
  getTranslationJobJsonAsset,
  getTranslationJobPageUpload,
  getTranslationJobResultManifest,
  putTranslationJobDebugArtifact,
} from '@/server/jobs/storage';

const QA_REPORT_ARTIFACT_NAME = 'translation-qa-report.json';
const OCR_DEBUG_ARTIFACT_NAME = 'ocr-pages.json';
const QA_STATE_FILE_NAME = 'state.json';
const CODEX_REPORT_FILE_NAME = 'codex-report.json';
const TRANSLATION_QA_REPORT_VERSION = 'translation-qa-report.v1';
const TRANSLATION_QA_STATE_VERSION = 'translation-qa-state.v1';

type CliCommand = 'complete' | 'prepare-next';

type CliOptions = {
  command: CliCommand;
  limit: number;
  top: number;
  workDir: string;
};

type CandidateJobAsset = {
  bucketName: string | null;
  checksumSha256: string | null;
  id: string;
  kind: JobAssetKind;
  metadata: Prisma.JsonValue | null;
  mimeType: string | null;
  objectKey: string | null;
  originalFileName: string | null;
  pageNumber: number | null;
  sizeBytes: number | null;
};

type CandidateJob = {
  assets: CandidateJobAsset[];
  chapterCacheKey: string | null;
  chapterIdentity: Prisma.JsonValue | null;
  completedAt: Date | null;
  createdAt: Date;
  deviceId: string;
  id: string;
  licenseId: string;
  pageCount: number;
  resolvedOcrProvider: string | null;
  resolvedTranslationProvider: string | null;
  sourceLanguage: string;
  targetLanguage: string;
};

type StoredObjectAsset = CandidateJobAsset & {
  bucketName: string;
  objectKey: string;
};

type DownloadedPage = {
  assetId: string;
  checksumSha256: string | null;
  localPath: string;
  mimeType: string | null;
  objectKey: string;
  originalFileName: string | null;
  pageNumber: number | null;
  sizeBytes: number | null;
};

type QaHeuristicIssue = {
  blockIndex?: number;
  kind: string;
  message: string;
  pageKey: string;
  severity: 'critical' | 'info' | 'warning';
  snippet?: {
    sourceText?: string;
    translation?: string;
  };
};

const zQaState = z.object({
  codexReportFile: z.string().min(1),
  jobId: z.string().min(1),
  preparedAt: z.string().min(1),
  version: z.literal(TRANSLATION_QA_STATE_VERSION),
  workDir: z.string().min(1),
});

const candidateJobSelect = {
  assets: {
    select: {
      bucketName: true,
      checksumSha256: true,
      id: true,
      kind: true,
      metadata: true,
      mimeType: true,
      objectKey: true,
      originalFileName: true,
      pageNumber: true,
      sizeBytes: true,
    },
  },
  chapterCacheKey: true,
  chapterIdentity: true,
  completedAt: true,
  createdAt: true,
  deviceId: true,
  id: true,
  licenseId: true,
  pageCount: true,
  resolvedOcrProvider: true,
  resolvedTranslationProvider: true,
  sourceLanguage: true,
  targetLanguage: true,
} satisfies Prisma.TranslationJobSelect;

const options = parseArgs(process.argv.slice(2));

try {
  const result =
    options.command === 'prepare-next'
      ? await prepareNextQaJob(options)
      : await completeQaJob(options);

  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}

async function prepareNextQaJob(options: CliOptions) {
  await resetWorkDir(options.workDir);

  const job = await findNextQaCandidate(options.limit);

  if (!job) {
    return {
      status: 'no_work',
    };
  }

  const resultManifestAsset = findRequiredResultManifestAsset(job);
  const ocrDebugAsset = findJsonDebugArtifact(job, OCR_DEBUG_ARTIFACT_NAME);
  const pageUploadAssets = findRetainedPageUploadAssets(job);
  const manifest = await getTranslationJobResultManifest(resultManifestAsset);
  const ocrDebug = ocrDebugAsset
    ? await getTranslationJobJsonAsset(ocrDebugAsset)
    : null;
  const downloadedPages = await downloadPageUploads({
    pageUploadAssets,
    workDir: options.workDir,
  });
  const heuristicReport = buildHeuristicReport({
    job,
    manifest,
    ocrDebugAvailable: Boolean(ocrDebug),
    top: options.top,
  });
  const context = buildQaContext({
    downloadedPages,
    job,
    ocrDebugAsset,
    pageUploadAssets,
    resultManifestAsset,
  });
  const state = {
    codexReportFile: path.join(options.workDir, CODEX_REPORT_FILE_NAME),
    jobId: job.id,
    preparedAt: new Date().toISOString(),
    version: TRANSLATION_QA_STATE_VERSION,
    workDir: options.workDir,
  } satisfies z.infer<typeof zQaState>;

  await writeJson(path.join(options.workDir, 'qa-context.json'), context);
  await writeJson(
    path.join(options.workDir, 'result-manifest.json'),
    serializeManifest(manifest)
  );
  await writeJson(path.join(options.workDir, 'ocr-debug.json'), ocrDebug);
  await writeJson(
    path.join(options.workDir, 'heuristic-report.json'),
    heuristicReport
  );
  await writeJson(path.join(options.workDir, QA_STATE_FILE_NAME), state);
  await writeFile(
    path.join(options.workDir, 'prompt.md'),
    buildCodexPrompt({
      contextPath: path.join(options.workDir, 'qa-context.json'),
      heuristicPath: path.join(options.workDir, 'heuristic-report.json'),
      manifestPath: path.join(options.workDir, 'result-manifest.json'),
      ocrDebugPath: path.join(options.workDir, 'ocr-debug.json'),
      pageDir: path.join(options.workDir, 'pages'),
    })
  );

  return {
    codexReportFile: state.codexReportFile,
    jobId: job.id,
    pageCount: job.pageCount,
    promptFile: path.join(options.workDir, 'prompt.md'),
    status: 'prepared',
    workDir: options.workDir,
  };
}

async function completeQaJob(options: CliOptions) {
  const state = zQaState.parse(
    JSON.parse(
      await readFile(path.join(options.workDir, QA_STATE_FILE_NAME), 'utf8')
    ) as unknown
  );
  const job = await findQaJobById(state.jobId);

  if (!job) {
    throw new Error(`Translation job ${state.jobId} no longer exists.`);
  }

  const pageUploadAssets = findRetainedPageUploadAssets(job);
  const resultManifestAsset = findRequiredResultManifestAsset(job);
  const ocrDebugAsset = findJsonDebugArtifact(job, OCR_DEBUG_ARTIFACT_NAME);
  const heuristicReport = JSON.parse(
    await readFile(path.join(options.workDir, 'heuristic-report.json'), 'utf8')
  ) as unknown;
  const codexReportRaw = await readFile(state.codexReportFile, 'utf8');
  const codexReport = parseCodexReport(codexReportRaw);
  const createdAt = new Date();
  const qaReportBody = {
    assets: {
      ocrDebug: ocrDebugAsset
        ? {
            bucketName: ocrDebugAsset.bucketName,
            id: ocrDebugAsset.id,
            objectKey: ocrDebugAsset.objectKey,
          }
        : null,
      pageUploads: pageUploadAssets.map((asset) => ({
        bucketName: asset.bucketName,
        id: asset.id,
        objectKey: asset.objectKey,
        originalFileName: asset.originalFileName,
        pageNumber: asset.pageNumber,
      })),
      resultManifest: {
        bucketName: resultManifestAsset.bucketName,
        id: resultManifestAsset.id,
        objectKey: resultManifestAsset.objectKey,
      },
    },
    codexReport,
    createdAt: createdAt.toISOString(),
    heuristicReport,
    job: buildJobSummary(job),
    preparedAt: state.preparedAt,
    version: TRANSLATION_QA_REPORT_VERSION,
  };
  const storedArtifact = await putTranslationJobDebugArtifact({
    artifactName: QA_REPORT_ARTIFACT_NAME,
    body: qaReportBody,
    jobId: job.id,
  });
  const reportAssetId = await upsertQaReportAsset({
    createdAt,
    job,
    storedArtifact,
  });

  if (!shouldDeleteOriginalUploads(codexReport)) {
    await Promise.all(
      pageUploadAssets.map((asset) =>
        db.jobAsset.update({
          where: {
            id: asset.id,
          },
          data: {
            metadata: mergeMetadata(asset.metadata, {
              qaReportAssetId: reportAssetId,
              qaReportObjectKey: storedArtifact.objectKey,
              qaStatus: 'analysis_blocked',
              storageStatus: 'retained_for_translation_qa',
            }),
          },
        })
      )
    );

    return {
      deletedPageUploads: 0,
      jobId: job.id,
      qaReportAssetId: reportAssetId,
      qaReportObjectKey: storedArtifact.objectKey,
      status: 'analysis_blocked',
    };
  }

  const deletedAt = new Date();

  await deleteTranslationJobPageUploads({
    objects: pageUploadAssets.map((asset) => ({
      bucketName: asset.bucketName,
      objectKey: asset.objectKey,
    })),
  });

  await Promise.all(
    pageUploadAssets.map((asset) =>
      db.jobAsset.update({
        where: {
          id: asset.id,
        },
        data: {
          metadata: mergeMetadata(asset.metadata, {
            deletedAt: deletedAt.toISOString(),
            qaReportAssetId: reportAssetId,
            qaReportObjectKey: storedArtifact.objectKey,
            qaStatus: 'completed',
            storageStatus: 'deleted',
          }),
        },
      })
    )
  );

  return {
    deletedPageUploads: pageUploadAssets.length,
    jobId: job.id,
    qaReportAssetId: reportAssetId,
    qaReportObjectKey: storedArtifact.objectKey,
    status: 'completed',
  };
}

async function findNextQaCandidate(limit: number) {
  const jobs = await db.translationJob.findMany({
    orderBy: {
      completedAt: 'desc',
    },
    select: candidateJobSelect,
    take: limit,
    where: {
      assets: {
        none: {
          kind: JobAssetKind.debug_artifact,
          originalFileName: QA_REPORT_ARTIFACT_NAME,
        },
        some: {
          bucketName: {
            not: null,
          },
          kind: JobAssetKind.page_upload,
          objectKey: {
            not: null,
          },
        },
      },
      completedAt: {
        not: null,
      },
      status: 'completed',
    },
  });

  return jobs.find(isProcessableQaCandidate) ?? null;
}

async function findQaJobById(jobId: string) {
  return await db.translationJob.findUnique({
    select: candidateJobSelect,
    where: {
      id: jobId,
    },
  });
}

function isProcessableQaCandidate(job: CandidateJob) {
  return (
    findRetainedPageUploadAssets(job).length > 0 &&
    Boolean(findOptionalResultManifestAsset(job)) &&
    !findJsonDebugArtifact(job, QA_REPORT_ARTIFACT_NAME)
  );
}

function findRetainedPageUploadAssets(job: CandidateJob) {
  return job.assets
    .filter(
      (asset): asset is StoredObjectAsset =>
        asset.kind === JobAssetKind.page_upload &&
        Boolean(asset.bucketName && asset.objectKey) &&
        getMetadataString(asset.metadata, 'storageStatus') !== 'deleted'
    )
    .sort((left, right) => (left.pageNumber ?? 0) - (right.pageNumber ?? 0));
}

function findOptionalResultManifestAsset(job: CandidateJob) {
  return (
    job.assets.find(
      (asset): asset is StoredObjectAsset =>
        asset.kind === JobAssetKind.result_manifest &&
        Boolean(asset.bucketName && asset.objectKey)
    ) ?? null
  );
}

function findRequiredResultManifestAsset(job: CandidateJob) {
  const asset = findOptionalResultManifestAsset(job);

  if (!asset) {
    throw new Error(`Translation job ${job.id} has no result manifest asset.`);
  }

  return asset;
}

function findJsonDebugArtifact(job: CandidateJob, fileName: string) {
  return (
    job.assets.find(
      (asset): asset is StoredObjectAsset =>
        asset.kind === JobAssetKind.debug_artifact &&
        asset.originalFileName === fileName &&
        Boolean(asset.bucketName && asset.objectKey)
    ) ?? null
  );
}

async function downloadPageUploads(input: {
  pageUploadAssets: StoredObjectAsset[];
  workDir: string;
}) {
  const pageDir = path.join(input.workDir, 'pages');
  await mkdir(pageDir, { recursive: true });

  const downloadedPages: DownloadedPage[] = [];

  for (const asset of input.pageUploadAssets) {
    const object = await getTranslationJobPageUpload({
      bucketName: asset.bucketName,
      objectKey: asset.objectKey,
    });
    const pagePath = path.join(pageDir, buildDownloadedPageFileName(asset));
    await writeFile(pagePath, Buffer.from(await object.blob.arrayBuffer()));
    downloadedPages.push({
      assetId: asset.id,
      checksumSha256: asset.checksumSha256,
      localPath: pagePath,
      mimeType: asset.mimeType,
      objectKey: asset.objectKey,
      originalFileName: asset.originalFileName,
      pageNumber: asset.pageNumber,
      sizeBytes: asset.sizeBytes,
    });
  }

  return downloadedPages;
}

function buildHeuristicReport(input: {
  job: CandidateJob;
  manifest: TranslationJobResultManifest;
  ocrDebugAvailable: boolean;
  top: number;
}) {
  const ocrAnalysis = analyzeTranslationManifestOcr({
    chapterCacheKey: input.job.chapterCacheKey,
    manifest: input.manifest,
  });
  const heuristicIssues = [
    ...selectTopOcrGroupingIssues([ocrAnalysis], input.top).map((issue) => ({
      blockIndex: issue.blockIndex,
      kind: issue.kind,
      message: issue.message,
      pageKey: issue.pageKey,
      severity: issue.severity,
      snippet: {
        sourceText: truncateSnippet(issue.sourceText),
        translation: truncateSnippet(issue.translation),
      },
    })),
    ...detectTranslationQaIssues(input.manifest),
    ...(input.ocrDebugAvailable
      ? []
      : [
          {
            kind: 'missing_ocr_debug_artifact',
            message:
              'The job has no OCR debug artifact, so only the final manifest and images can be inspected.',
            pageKey: '*',
            severity: 'warning',
          } satisfies QaHeuristicIssue,
        ]),
  ];

  return {
    createdAt: new Date().toISOString(),
    heuristicIssues,
    summary: summarizeOcrManifestAnalyses([ocrAnalysis]),
    version: 'translation-qa-heuristic-report.v1',
  };
}

function detectTranslationQaIssues(manifest: TranslationJobResultManifest) {
  const issues: QaHeuristicIssue[] = [];

  for (const pageKey of manifest.pageOrder) {
    const page = manifest.pages[pageKey];

    if (!page) {
      continue;
    }

    page.blocks.forEach((block, blockIndex) => {
      const sourceText = block.text.trim();
      const translation = block.translation.trim();

      if (block.renderMode === 'mask_only' && translation.length > 0) {
        issues.push({
          blockIndex,
          kind: 'mask_only_block_has_translation',
          message:
            'A mask-only block has translated text; this block may have been translated when it should only be removed.',
          pageKey,
          severity: 'critical',
          snippet: {
            sourceText: truncateSnippet(sourceText),
            translation: truncateSnippet(translation),
          },
        });
      }

      if (
        block.renderMode !== 'mask_only' &&
        normalizeComparableText(sourceText) ===
          normalizeComparableText(translation)
      ) {
        issues.push({
          blockIndex,
          kind: 'source_text_repeated_in_translation',
          message:
            'The translated text is effectively identical to the OCR source text.',
          pageKey,
          severity: 'warning',
          snippet: {
            sourceText: truncateSnippet(sourceText),
            translation: truncateSnippet(translation),
          },
        });
      }

      if (
        block.renderMode !== 'mask_only' &&
        targetLanguageShouldNotContainCjk(manifest.targetLanguage) &&
        countCjkCharacters(translation) >= 2
      ) {
        issues.push({
          blockIndex,
          kind: 'target_translation_contains_cjk_text',
          message:
            'The target translation still contains CJK characters for a non-CJK target language.',
          pageKey,
          severity: 'warning',
          snippet: {
            sourceText: truncateSnippet(sourceText),
            translation: truncateSnippet(translation),
          },
        });
      }

      if (
        block.renderMode !== 'mask_only' &&
        sourceText.length >= 20 &&
        translation.length > 0 &&
        translation.length <= Math.max(4, sourceText.length * 0.08)
      ) {
        issues.push({
          blockIndex,
          kind: 'suspiciously_short_translation',
          message:
            'The translation is very short compared with the OCR source text.',
          pageKey,
          severity: 'info',
          snippet: {
            sourceText: truncateSnippet(sourceText),
            translation: truncateSnippet(translation),
          },
        });
      }
    });
  }

  return issues;
}

function buildQaContext(input: {
  downloadedPages: DownloadedPage[];
  job: CandidateJob;
  ocrDebugAsset: StoredObjectAsset | null;
  pageUploadAssets: StoredObjectAsset[];
  resultManifestAsset: StoredObjectAsset;
}) {
  return {
    assets: {
      ocrDebug: input.ocrDebugAsset
        ? {
            bucketName: input.ocrDebugAsset.bucketName,
            objectKey: input.ocrDebugAsset.objectKey,
            originalFileName: input.ocrDebugAsset.originalFileName,
          }
        : null,
      pageUploads: input.pageUploadAssets.map((asset) => ({
        bucketName: asset.bucketName,
        objectKey: asset.objectKey,
        originalFileName: asset.originalFileName,
        pageNumber: asset.pageNumber,
      })),
      resultManifest: {
        bucketName: input.resultManifestAsset.bucketName,
        objectKey: input.resultManifestAsset.objectKey,
      },
    },
    downloadedPages: input.downloadedPages,
    job: buildJobSummary(input.job),
    version: 'translation-qa-context.v1',
  };
}

function buildJobSummary(job: CandidateJob) {
  return {
    chapterCacheKey: job.chapterCacheKey,
    chapterIdentity: job.chapterIdentity,
    completedAt: job.completedAt?.toISOString() ?? null,
    createdAt: job.createdAt.toISOString(),
    id: job.id,
    pageCount: job.pageCount,
    resolvedOcrProvider: job.resolvedOcrProvider,
    resolvedTranslationProvider: job.resolvedTranslationProvider,
    sourceLanguage: job.sourceLanguage,
    targetLanguage: job.targetLanguage,
  };
}

async function upsertQaReportAsset(input: {
  createdAt: Date;
  job: CandidateJob;
  storedArtifact: {
    bucketName: string;
    objectKey: string;
    sizeBytes: number;
  };
}) {
  const existingArtifact = await db.jobAsset.findFirst({
    select: {
      id: true,
    },
    where: {
      jobId: input.job.id,
      kind: JobAssetKind.debug_artifact,
      originalFileName: QA_REPORT_ARTIFACT_NAME,
    },
  });
  const assetData = {
    bucketName: input.storedArtifact.bucketName,
    metadata: {
      artifactType: 'translation_qa_report',
      createdAt: input.createdAt.toISOString(),
      pageCount: input.job.pageCount,
      version: TRANSLATION_QA_REPORT_VERSION,
    },
    mimeType: 'application/json',
    objectKey: input.storedArtifact.objectKey,
    originalFileName: QA_REPORT_ARTIFACT_NAME,
    pageNumber: null,
    sizeBytes: input.storedArtifact.sizeBytes,
  };

  if (existingArtifact) {
    await db.jobAsset.update({
      data: assetData,
      where: {
        id: existingArtifact.id,
      },
    });

    return existingArtifact.id;
  }

  const created = await db.jobAsset.create({
    data: {
      ...assetData,
      jobId: input.job.id,
      kind: JobAssetKind.debug_artifact,
    },
    select: {
      id: true,
    },
  });

  return created.id;
}

function buildCodexPrompt(input: {
  contextPath: string;
  heuristicPath: string;
  manifestPath: string;
  ocrDebugPath: string;
  pageDir: string;
}) {
  return `You are the Nayovi translation QA agent.

Goal:
- Analyze one completed manga/manhwa translation job.
- Compare original page images, OCR blocks, merged OCR blocks, final rendered translation manifest, and heuristic issues.
- Detect OCR merge mistakes, mistranslations, untranslated text, over-translation of non-dialogue/mask-only blocks, source text copied into the target language, and any obvious visual/layout risks.

Files available:
- Context: ${input.contextPath}
- Final translation manifest: ${input.manifestPath}
- OCR debug artifact: ${input.ocrDebugPath}
- Heuristic report: ${input.heuristicPath}
- Original page images: ${input.pageDir}

Rules:
- Return strict JSON only. No markdown and no prose outside JSON.
- Do not include long copyrighted text. Use short snippets only when needed to identify a block.
- Be conservative: report concrete issues with pageKey and blockIndex whenever possible.
- If image inspection is unavailable in this runtime, say that in the JSON and rely on the manifest, OCR debug artifact, and heuristics.
- Do not modify the repository, database, or storage. This run only produces analysis.

Required JSON shape:
{
  "version": "translation-qa-codex-report.v1",
  "inspectionMode": "visual_and_manifest" | "manifest_only",
  "summary": {
    "status": "ok" | "issues_found" | "blocked",
    "short": "one short human-readable summary",
    "issueCount": 0
  },
  "issues": [
    {
      "severity": "critical" | "warning" | "info",
      "kind": "ocr_merge" | "translation_quality" | "mask_only" | "layout" | "missing_data" | "other",
      "pageKey": "string",
      "blockIndex": 0,
      "message": "specific issue",
      "evidence": "short evidence"
    }
  ],
  "cleanupDecision": {
    "analysisCompleted": true,
    "canDeleteOriginalUploads": true,
    "reason": "why the source images can or cannot be cleaned up"
  },
  "nextTrainingSignals": [
    "short reusable improvement signal"
  ]
}
`;
}

function serializeManifest(manifest: TranslationJobResultManifest) {
  return {
    ...manifest,
    completedAt: manifest.completedAt.toISOString(),
  };
}

function parseCodexReport(raw: string) {
  const trimmed = raw.trim();
  const directJson = parseJsonObject(trimmed);

  if (directJson) {
    return directJson;
  }

  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const fencedJson = fenced ? parseJsonObject(fenced[1]?.trim() ?? '') : null;

  if (fencedJson) {
    return fencedJson;
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  const extractedJson =
    firstBrace >= 0 && lastBrace > firstBrace
      ? parseJsonObject(trimmed.slice(firstBrace, lastBrace + 1))
      : null;

  return (
    extractedJson ?? {
      parseStatus: 'raw_text',
      rawText: truncateSnippet(raw, 20_000),
    }
  );
}

function shouldDeleteOriginalUploads(codexReport: unknown) {
  const cleanupDecision = asRecord(asRecord(codexReport).cleanupDecision);

  return (
    cleanupDecision.analysisCompleted !== false &&
    cleanupDecision.canDeleteOriginalUploads !== false
  );
}

function parseJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;

    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

async function resetWorkDir(workDir: string) {
  await rm(workDir, {
    force: true,
    recursive: true,
  });
  await mkdir(workDir, {
    recursive: true,
  });
}

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function buildDownloadedPageFileName(asset: StoredObjectAsset) {
  const pageNumber = String(asset.pageNumber ?? 0).padStart(4, '0');
  const baseName = sanitizeFileName(asset.originalFileName ?? asset.id);
  const extension = inferFileExtension(asset);

  return baseName.endsWith(extension)
    ? `${pageNumber}-${baseName}`
    : `${pageNumber}-${baseName}${extension}`;
}

function inferFileExtension(asset: StoredObjectAsset) {
  const extensionFromName = path.extname(asset.originalFileName ?? '');

  if (extensionFromName) {
    return extensionFromName;
  }

  const extensionsByMimeType: Record<string, string> = {
    'image/avif': '.avif',
    'image/gif': '.gif',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  };

  return asset.mimeType
    ? (extensionsByMimeType[asset.mimeType] ?? '.img')
    : '.img';
}

function sanitizeFileName(fileName: string) {
  const normalized = fileName
    .trim()
    .replaceAll('\\', '-')
    .replaceAll('/', '-')
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+/, '')
    .replace(/[.-]+$/, '');

  return normalized.length > 0 ? normalized : 'page';
}

function getMetadataString(metadata: unknown, key: string) {
  const record = asRecord(metadata);
  const value = record[key];

  return typeof value === 'string' ? value : null;
}

function mergeMetadata(
  current: unknown,
  next: Record<string, unknown>
): Prisma.InputJsonValue {
  return {
    ...asRecord(current),
    ...next,
  } as Prisma.InputJsonValue;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeComparableText(value: string) {
  return value
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .replace(/[^\p{Letter}\p{Number}]/gu, '')
    .toLowerCase();
}

function targetLanguageShouldNotContainCjk(targetLanguage: string) {
  return !/^(ja|jp|jpn|ko|kor|zh|zho|chi|cmn|yue|chinese|japanese|korean)/i.test(
    targetLanguage.trim()
  );
}

function countCjkCharacters(value: string) {
  return Array.from(value).filter((character) =>
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(
      character
    )
  ).length;
}

function truncateSnippet(value: string | undefined, maxLength = 180) {
  if (!value) {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();

  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength - 3)}...`;
}

function parseArgs(args: string[]): CliOptions {
  const normalizedArgs = normalizeCliArgs(args);
  const command = normalizedArgs[0];

  if (command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  if (command !== 'prepare-next' && command !== 'complete') {
    printHelp();
    process.exit(2);
  }

  const options: CliOptions = {
    command,
    limit: 500,
    top: 40,
    workDir: '',
  };

  for (let index = 1; index < normalizedArgs.length; index += 1) {
    const arg = normalizedArgs[index];

    if (arg === '--work-dir') {
      options.workDir = normalizedArgs[index + 1] ?? '';
      index += 1;
    } else if (arg === '--limit') {
      options.limit = parsePositiveInt(
        normalizedArgs[index + 1],
        options.limit
      );
      index += 1;
    } else if (arg === '--top') {
      options.top = parsePositiveInt(normalizedArgs[index + 1], options.top);
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
  }

  if (!options.workDir) {
    throw new Error('Provide --work-dir.');
  }

  return options;
}

function normalizeCliArgs(args: string[]): string[] {
  const withoutRunnerScript = args[0]?.endsWith('.ts') ? args.slice(1) : args;

  return stripPnpmSeparators(withoutRunnerScript);
}

function stripPnpmSeparators(args: string[]): string[] {
  return args[0] === '--' ? stripPnpmSeparators(args.slice(1)) : args;
}

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function printHelp() {
  console.log(`Usage:
  dotenv -- node ./run-jiti.js ./scripts/translation-qa-agent.ts prepare-next --work-dir <dir>
  dotenv -- node ./run-jiti.js ./scripts/translation-qa-agent.ts complete --work-dir <dir>

Options:
  --limit <number>  Completed jobs to scan. Default: 500.
  --top <number>    Max OCR grouping issues to include. Default: 40.
`);
}
