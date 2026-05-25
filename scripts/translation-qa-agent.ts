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
const QA_BASELINE_FILE_NAME = 'new-chapter-baseline.txt';
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

type MissingPageUpload = {
  assetId: string;
  errorMessage: string;
  objectKey: string;
  originalFileName: string | null;
  pageNumber: number | null;
};

type QaInputReadiness = {
  issues: Array<{
    kind: string;
    message: string;
    pageKey: string;
    severity: 'critical' | 'info' | 'warning';
  }>;
  ready: boolean;
  stats: {
    downloadedImageCount: number;
    expectedPageCount: number;
    groupedOcrBlockCount: number;
    groupedOcrPageCount: number;
    manifestBlockCount: number;
    manifestPageCount: number;
    rawOcrBlockCount: number;
    rawOcrPageCount: number;
    retainedImageCount: number;
    translatableBlockCount: number;
    translatablePageCount: number;
  };
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

  const minRetainedAt = await resolveQaBaselineRetainedAt(options.workDir);

  await cleanupOldRetainedPageUploads({
    limit: options.limit,
    minRetainedAt,
  });

  const job = await findNextQaCandidate(options.limit, minRetainedAt);

  if (!job) {
    return {
      status: 'no_work',
    };
  }

  const resultManifestAsset = findOptionalResultManifestAsset(job);
  const ocrDebugAsset = findJsonDebugArtifact(job, OCR_DEBUG_ARTIFACT_NAME);
  const pageUploadAssets = findRetainedPageUploadAssets(job, minRetainedAt);
  const manifest = resultManifestAsset
    ? await getTranslationJobResultManifest(resultManifestAsset)
    : null;
  const ocrDebug = ocrDebugAsset
    ? await getTranslationJobJsonAsset(ocrDebugAsset)
    : null;
  const pageDownload = await downloadPageUploads({
    pageUploadAssets,
    workDir: options.workDir,
  });

  const readiness = checkQaInputReadiness({
    downloadedPages: pageDownload.downloadedPages,
    job,
    manifest,
    missingPageUploads: pageDownload.missingPageUploads,
    ocrDebug,
    pageUploadAssets,
  });

  if (!readiness.ready || !manifest || !resultManifestAsset) {
    const blockedResult = await completeBlockedQaJob({
      job,
      ocrDebugAsset,
      pageDownload,
      pageUploadAssets,
      readiness,
      resultManifestAsset,
    });

    return {
      ...blockedResult,
      status: 'no_work',
    };
  }

  const heuristicReport = buildHeuristicReport({
    job,
    manifest,
    missingPageUploads: pageDownload.missingPageUploads,
    ocrDebugAvailable: Boolean(ocrDebug),
    top: options.top,
  });
  const context = buildQaContext({
    downloadedPages: pageDownload.downloadedPages,
    job,
    missingPageUploads: pageDownload.missingPageUploads,
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

  const minRetainedAt = await resolveQaBaselineRetainedAt(options.workDir);
  const pageUploadAssets = findRetainedPageUploadAssets(job, minRetainedAt);
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

  await deleteAndMarkPageUploads({
    pageUploadAssets,
    qaReportAssetId: reportAssetId,
    qaReportObjectKey: storedArtifact.objectKey,
    qaStatus: 'completed',
  });

  return {
    deletedPageUploads: pageUploadAssets.length,
    jobId: job.id,
    qaReportAssetId: reportAssetId,
    qaReportObjectKey: storedArtifact.objectKey,
    status: 'completed',
  };
}

async function completeBlockedQaJob(input: {
  job: CandidateJob;
  ocrDebugAsset: StoredObjectAsset | null;
  pageDownload: {
    downloadedPages: DownloadedPage[];
    missingPageUploads: MissingPageUpload[];
  };
  pageUploadAssets: StoredObjectAsset[];
  readiness: QaInputReadiness;
  resultManifestAsset: StoredObjectAsset | null;
}) {
  const createdAt = new Date();
  const codexReport = {
    cleanupDecision: {
      analysisCompleted: false,
      canDeleteOriginalUploads: true,
      reason:
        'QA was cancelled before Codex analysis because required comparison inputs were missing. Retained source images can be cleaned up.',
    },
    inspectionMode: 'manifest_only',
    issues: input.readiness.issues.map((issue) => ({
      ...issue,
      evidence: issue.message,
    })),
    nextTrainingSignals: [
      'Only run translation QA when full chapter images, raw OCR blocks, and merged OCR blocks are all available.',
    ],
    summary: {
      issueCount: input.readiness.issues.length,
      short: `QA cancelled: ${input.readiness.issues
        .map((issue) => issue.kind)
        .join(', ')}`,
      status: 'blocked',
    },
    version: 'translation-qa-codex-report.v1',
  };
  const qaReportBody = {
    assets: {
      ocrDebug: input.ocrDebugAsset
        ? {
            bucketName: input.ocrDebugAsset.bucketName,
            id: input.ocrDebugAsset.id,
            objectKey: input.ocrDebugAsset.objectKey,
          }
        : null,
      pageUploads: input.pageUploadAssets.map((asset) => ({
        bucketName: asset.bucketName,
        id: asset.id,
        objectKey: asset.objectKey,
        originalFileName: asset.originalFileName,
        pageNumber: asset.pageNumber,
      })),
      resultManifest: input.resultManifestAsset
        ? {
            bucketName: input.resultManifestAsset.bucketName,
            id: input.resultManifestAsset.id,
            objectKey: input.resultManifestAsset.objectKey,
          }
        : null,
    },
    codexReport,
    createdAt: createdAt.toISOString(),
    heuristicReport: {
      createdAt: createdAt.toISOString(),
      heuristicIssues: input.readiness.issues,
      inputReadiness: input.readiness.stats,
      summary: {
        analyzedBlocks: input.readiness.stats.manifestBlockCount,
        analyzedManifests: input.resultManifestAsset ? 1 : 0,
        analyzedPages: input.readiness.stats.manifestPageCount,
        issueCount: input.readiness.issues.length,
      },
      version: 'translation-qa-heuristic-report.v1',
    },
    inputReadiness: input.readiness,
    job: buildJobSummary(input.job),
    preparedAt: createdAt.toISOString(),
    version: TRANSLATION_QA_REPORT_VERSION,
  };
  const storedArtifact = await putTranslationJobDebugArtifact({
    artifactName: QA_REPORT_ARTIFACT_NAME,
    body: qaReportBody,
    jobId: input.job.id,
  });
  const reportAssetId = await upsertQaReportAsset({
    createdAt,
    job: input.job,
    storedArtifact,
  });

  await deleteAndMarkPageUploads({
    ignoreDeleteErrors: true,
    pageUploadAssets: input.pageUploadAssets,
    qaReportAssetId: reportAssetId,
    qaReportObjectKey: storedArtifact.objectKey,
    qaStatus: 'analysis_cancelled_missing_inputs',
  });

  return {
    deletedPageUploads: input.pageUploadAssets.length,
    jobId: input.job.id,
    qaReportAssetId: reportAssetId,
    qaReportObjectKey: storedArtifact.objectKey,
    reason: 'required_inputs_missing',
  };
}

async function deleteAndMarkPageUploads(input: {
  ignoreDeleteErrors?: boolean;
  pageUploadAssets: StoredObjectAsset[];
  qaReportAssetId?: string;
  qaReportObjectKey?: string;
  qaStatus: string;
}) {
  const deletedAt = new Date();

  try {
    await deleteTranslationJobPageUploads({
      objects: input.pageUploadAssets.map((asset) => ({
        bucketName: asset.bucketName,
        objectKey: asset.objectKey,
      })),
    });
  } catch (error) {
    if (!input.ignoreDeleteErrors) {
      throw error;
    }
  }

  await Promise.all(
    input.pageUploadAssets.map((asset) =>
      db.jobAsset.update({
        where: {
          id: asset.id,
        },
        data: {
          metadata: mergeMetadata(asset.metadata, {
            deletedAt: deletedAt.toISOString(),
            qaReportAssetId: input.qaReportAssetId,
            qaReportObjectKey: input.qaReportObjectKey,
            qaStatus: input.qaStatus,
            storageStatus: 'deleted',
          }),
        },
      })
    )
  );
}

function checkQaInputReadiness(input: {
  downloadedPages: DownloadedPage[];
  job: CandidateJob;
  manifest: TranslationJobResultManifest | null;
  missingPageUploads: MissingPageUpload[];
  ocrDebug: unknown;
  pageUploadAssets: StoredObjectAsset[];
}): QaInputReadiness {
  const ocrDebugStats = summarizeOcrDebug(input.ocrDebug);
  const manifestStats = summarizeManifest(input.manifest);
  const stats = {
    downloadedImageCount: input.downloadedPages.length,
    expectedPageCount: input.job.pageCount,
    groupedOcrBlockCount: ocrDebugStats.groupedOcrBlockCount,
    groupedOcrPageCount: ocrDebugStats.groupedOcrPageCount,
    manifestBlockCount: manifestStats.blockCount,
    manifestPageCount: manifestStats.pageCount,
    rawOcrBlockCount: ocrDebugStats.rawOcrBlockCount,
    rawOcrPageCount: ocrDebugStats.rawOcrPageCount,
    retainedImageCount: input.pageUploadAssets.length,
    translatableBlockCount: ocrDebugStats.translatableBlockCount,
    translatablePageCount: ocrDebugStats.translatablePageCount,
  };
  const issues: QaInputReadiness['issues'] = [];

  if (input.pageUploadAssets.length !== input.job.pageCount) {
    issues.push({
      kind: 'missing_full_chapter_images',
      message: `Expected ${input.job.pageCount} retained page image(s), found ${input.pageUploadAssets.length}.`,
      pageKey: '*',
      severity: 'critical',
    });
  }

  if (input.downloadedPages.length !== input.job.pageCount) {
    issues.push({
      kind: 'missing_downloadable_chapter_images',
      message: `Expected ${input.job.pageCount} downloadable page image(s), downloaded ${input.downloadedPages.length}.`,
      pageKey: '*',
      severity: 'critical',
    });
  }

  for (const missingPageUpload of input.missingPageUploads) {
    issues.push({
      kind: 'missing_chapter_image_object',
      message: missingPageUpload.errorMessage,
      pageKey:
        missingPageUpload.originalFileName ??
        `page-${missingPageUpload.pageNumber ?? 'unknown'}`,
      severity: 'critical',
    });
  }

  if (!hasSequentialPageNumbers(input.pageUploadAssets, input.job.pageCount)) {
    issues.push({
      kind: 'incomplete_chapter_page_numbers',
      message:
        'Retained page uploads do not cover every expected page number in the chapter.',
      pageKey: '*',
      severity: 'warning',
    });
  }

  if (!input.manifest) {
    issues.push({
      kind: 'missing_result_manifest',
      message:
        'The final translation manifest is missing, so merged OCR blocks cannot be compared with the translation output.',
      pageKey: '*',
      severity: 'critical',
    });
  } else {
    if (manifestStats.pageCount !== input.job.pageCount) {
      issues.push({
        kind: 'incomplete_result_manifest_pages',
        message: `Expected ${input.job.pageCount} manifest page(s), found ${manifestStats.pageCount}.`,
        pageKey: '*',
        severity: 'critical',
      });
    }

    if (manifestStats.blockCount <= 0) {
      issues.push({
        kind: 'missing_result_manifest_blocks',
        message:
          'The final translation manifest has no merged/translated OCR blocks.',
        pageKey: '*',
        severity: 'critical',
      });
    }
  }

  if (!ocrDebugStats.available) {
    issues.push({
      kind: 'missing_ocr_debug_artifact',
      message:
        'The OCR debug artifact is missing, so raw OCR blocks and merged OCR blocks cannot be compared.',
      pageKey: '*',
      severity: 'critical',
    });
  } else {
    if (ocrDebugStats.rawOcrPageCount !== input.job.pageCount) {
      issues.push({
        kind: 'incomplete_original_ocr_pages',
        message: `Expected ${input.job.pageCount} original OCR page(s), found ${ocrDebugStats.rawOcrPageCount}.`,
        pageKey: '*',
        severity: 'critical',
      });
    }

    if (ocrDebugStats.rawOcrBlockCount <= 0) {
      issues.push({
        kind: 'missing_original_ocr_blocks',
        message:
          'The OCR debug artifact has no original OCR blocks to compare.',
        pageKey: '*',
        severity: 'critical',
      });
    }

    if (ocrDebugStats.groupedOcrPageCount !== input.job.pageCount) {
      issues.push({
        kind: 'incomplete_merged_ocr_pages',
        message: `Expected ${input.job.pageCount} merged OCR page(s), found ${ocrDebugStats.groupedOcrPageCount}.`,
        pageKey: '*',
        severity: 'critical',
      });
    }

    if (ocrDebugStats.groupedOcrBlockCount <= 0) {
      issues.push({
        kind: 'missing_merged_ocr_blocks',
        message:
          'The OCR debug artifact has no merged OCR blocks after original OCR.',
        pageKey: '*',
        severity: 'critical',
      });
    }
  }

  return {
    issues,
    ready: !issues.some((issue) => issue.severity === 'critical'),
    stats,
  };
}

async function findNextQaCandidate(limit: number, minRetainedAt: Date) {
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

  return (
    jobs.find((job) => isPendingQaCandidate({ job, minRetainedAt })) ?? null
  );
}

async function cleanupOldRetainedPageUploads(input: {
  limit: number;
  minRetainedAt: Date;
}) {
  const assets = await db.jobAsset.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      bucketName: true,
      createdAt: true,
      id: true,
      job: {
        select: {
          id: true,
          status: true,
        },
      },
      metadata: true,
      objectKey: true,
    },
    take: input.limit,
    where: {
      bucketName: {
        not: null,
      },
      job: {
        completedAt: {
          not: null,
        },
        status: 'completed',
      },
      kind: JobAssetKind.page_upload,
      objectKey: {
        not: null,
      },
    },
  });
  const oldRetainedAssets = assets.filter(
    (
      asset
    ): asset is typeof asset & {
      bucketName: string;
      objectKey: string;
    } => {
      const storageStatus = getMetadataString(asset.metadata, 'storageStatus');
      const qaStatus = getMetadataString(asset.metadata, 'qaStatus');
      const qaRetainedAt = getMetadataDate(asset.metadata, 'qaRetainedAt');

      if (
        storageStatus === 'deleted' ||
        storageStatus === 'missing' ||
        qaStatus === 'completed' ||
        qaStatus === 'skipped_legacy_before_baseline'
      ) {
        return false;
      }

      if (storageStatus !== 'retained_for_translation_qa') {
        return true;
      }

      return !qaRetainedAt || qaRetainedAt < input.minRetainedAt;
    }
  );

  if (!oldRetainedAssets.length) {
    return {
      deletedPageUploads: 0,
    };
  }

  const deletedAt = new Date();

  try {
    await deleteTranslationJobPageUploads({
      objects: oldRetainedAssets.map((asset) => ({
        bucketName: asset.bucketName,
        objectKey: asset.objectKey,
      })),
    });
  } catch {
    // Keep metadata cleanup best-effort: missing old objects should not block
    // fresh QA cycles for new chapters.
  }

  await Promise.all(
    oldRetainedAssets.map((asset) =>
      db.jobAsset.update({
        data: {
          metadata: mergeMetadata(asset.metadata, {
            deletedAt: deletedAt.toISOString(),
            qaSkippedReason: 'retained_before_translation_qa_baseline',
            qaStatus: 'skipped_legacy_before_baseline',
            storageStatus: 'deleted',
          }),
        },
        where: {
          id: asset.id,
        },
      })
    )
  );

  return {
    deletedPageUploads: oldRetainedAssets.length,
  };
}

async function findQaJobById(jobId: string) {
  return await db.translationJob.findUnique({
    select: candidateJobSelect,
    where: {
      id: jobId,
    },
  });
}

function isPendingQaCandidate(input: {
  job: CandidateJob;
  minRetainedAt: Date;
}) {
  if (!input.job.completedAt || input.job.completedAt < input.minRetainedAt) {
    return false;
  }

  return !findJsonDebugArtifact(input.job, QA_REPORT_ARTIFACT_NAME);
}

function findRetainedPageUploadAssets(job: CandidateJob, minRetainedAt: Date) {
  return job.assets
    .filter((asset): asset is StoredObjectAsset => {
      const storageStatus = getMetadataString(asset.metadata, 'storageStatus');
      const qaStatus = getMetadataString(asset.metadata, 'qaStatus');
      const qaRetainedAt = getMetadataDate(asset.metadata, 'qaRetainedAt');

      return (
        asset.kind === JobAssetKind.page_upload &&
        Boolean(asset.bucketName && asset.objectKey) &&
        storageStatus === 'retained_for_translation_qa' &&
        qaStatus === 'pending' &&
        Boolean(qaRetainedAt && qaRetainedAt >= minRetainedAt)
      );
    })
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
  const missingPageUploads: MissingPageUpload[] = [];

  for (const asset of input.pageUploadAssets) {
    try {
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
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      await markPageUploadMissing({
        asset,
        errorMessage,
      });
      missingPageUploads.push({
        assetId: asset.id,
        errorMessage,
        objectKey: asset.objectKey,
        originalFileName: asset.originalFileName,
        pageNumber: asset.pageNumber,
      });
    }
  }

  return {
    downloadedPages,
    missingPageUploads,
  };
}

function buildHeuristicReport(input: {
  job: CandidateJob;
  manifest: TranslationJobResultManifest;
  missingPageUploads: MissingPageUpload[];
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
    ...input.missingPageUploads.map(
      (pageUpload) =>
        ({
          kind: 'source_page_upload_missing',
          message:
            'The original uploaded page object is missing from object storage, so visual QA for this page is unavailable.',
          pageKey:
            pageUpload.originalFileName ??
            `page-${pageUpload.pageNumber ?? 'unknown'}`,
          severity: 'warning',
        }) satisfies QaHeuristicIssue
    ),
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
  missingPageUploads: MissingPageUpload[];
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
    inputReadiness: summarizeQaContextInputs({
      downloadedPages: input.downloadedPages,
      job: input.job,
      ocrDebugAsset: input.ocrDebugAsset,
      pageUploadAssets: input.pageUploadAssets,
      resultManifestAsset: input.resultManifestAsset,
    }),
    job: buildJobSummary(input.job),
    missingPageUploads: input.missingPageUploads,
    version: 'translation-qa-context.v1',
  };
}

function summarizeQaContextInputs(input: {
  downloadedPages: DownloadedPage[];
  job: CandidateJob;
  ocrDebugAsset: StoredObjectAsset | null;
  pageUploadAssets: StoredObjectAsset[];
  resultManifestAsset: StoredObjectAsset;
}) {
  return {
    downloadedImageCount: input.downloadedPages.length,
    expectedPageCount: input.job.pageCount,
    hasOcrDebugArtifact: Boolean(input.ocrDebugAsset),
    hasResultManifest: Boolean(input.resultManifestAsset),
    retainedImageCount: input.pageUploadAssets.length,
  };
}

function summarizeOcrDebug(rawOcrDebug: unknown) {
  const ocrDebug = asRecord(rawOcrDebug);
  const rawOcrPages = getOcrDebugPages(ocrDebug.rawOcrPages);
  const groupedOcrPages = getOcrDebugPages(ocrDebug.groupedOcrPages);
  const translatablePages = getTranslatableOcrPages(ocrDebug.translatablePages);

  return {
    available: Object.keys(ocrDebug).length > 0,
    groupedOcrBlockCount: countOcrDebugBlocks(groupedOcrPages),
    groupedOcrPageCount: groupedOcrPages.length,
    rawOcrBlockCount: countOcrDebugBlocks(rawOcrPages),
    rawOcrPageCount: rawOcrPages.length,
    translatableBlockCount: countTranslatableBlocks(translatablePages),
    translatablePageCount: translatablePages.length,
  };
}

function summarizeManifest(manifest: TranslationJobResultManifest | null) {
  if (!manifest) {
    return {
      blockCount: 0,
      pageCount: 0,
    };
  }

  return {
    blockCount: manifest.pageOrder.reduce((count, pageKey) => {
      return count + (manifest.pages[pageKey]?.blocks.length ?? 0);
    }, 0),
    pageCount: manifest.pageOrder.length,
  };
}

function getOcrDebugPages(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((page): page is Record<string, unknown> => {
    const record = asRecord(page);
    const ocrPage = asRecord(record.ocrPage);

    return typeof record.fileName === 'string' && Array.isArray(ocrPage.blocks);
  });
}

function getTranslatableOcrPages(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((page): page is Record<string, unknown> => {
    const record = asRecord(page);

    return typeof record.pageKey === 'string' && Array.isArray(record.blocks);
  });
}

function countOcrDebugBlocks(pages: Array<Record<string, unknown>>) {
  return pages.reduce((count, page) => {
    const ocrPage = asRecord(page.ocrPage);
    const blocks = Array.isArray(ocrPage.blocks) ? ocrPage.blocks : [];

    return count + blocks.length;
  }, 0);
}

function countTranslatableBlocks(pages: Array<Record<string, unknown>>) {
  return pages.reduce((count, page) => {
    const blocks = Array.isArray(page.blocks) ? page.blocks : [];

    return count + blocks.length;
  }, 0);
}

function hasSequentialPageNumbers(
  assets: StoredObjectAsset[],
  expectedPageCount: number
) {
  const pageNumbers = new Set(
    assets
      .map((asset) => asset.pageNumber)
      .filter((pageNumber): pageNumber is number =>
        Number.isInteger(pageNumber)
      )
  );

  for (let pageNumber = 1; pageNumber <= expectedPageCount; pageNumber += 1) {
    if (!pageNumbers.has(pageNumber)) {
      return false;
    }
  }

  return true;
}

async function markPageUploadMissing(input: {
  asset: StoredObjectAsset;
  errorMessage: string;
}) {
  await db.jobAsset.update({
    data: {
      metadata: mergeMetadata(input.asset.metadata, {
        missingAt: new Date().toISOString(),
        missingError: truncateSnippet(input.errorMessage, 500),
        qaStatus: 'source_upload_missing',
        storageStatus: 'missing',
      }),
    },
    where: {
      id: input.asset.id,
    },
  });
}

function buildJobSummary(job: CandidateJob) {
  const chapterIdentity = normalizeChapterIdentity(job.chapterIdentity);

  return {
    chapterCacheKey: job.chapterCacheKey,
    chapterDisplay: {
      chapterName: chapterIdentity?.chapterName ?? null,
      chapterNumber: extractChapterNumber(chapterIdentity),
      mangaTitle: chapterIdentity?.mangaTitle ?? null,
      sourceName: chapterIdentity?.sourceName ?? null,
    },
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

function normalizeChapterIdentity(rawIdentity: unknown) {
  const identity = z
    .object({
      chapterName: z.string().optional(),
      chapterUrl: z.string(),
      mangaTitle: z.string().optional(),
      mangaUrl: z.string().optional(),
      sourceId: z.string().optional(),
      sourceName: z.string().optional(),
    })
    .safeParse(rawIdentity);

  if (!identity.success) {
    return null;
  }

  return {
    chapterName: identity.data.chapterName ?? null,
    chapterUrl: identity.data.chapterUrl,
    mangaTitle: identity.data.mangaTitle ?? null,
    mangaUrl: identity.data.mangaUrl ?? null,
    sourceId: identity.data.sourceId ?? null,
    sourceName: identity.data.sourceName ?? null,
  };
}

function extractChapterNumber(
  chapterIdentity: ReturnType<typeof normalizeChapterIdentity>
) {
  const candidates = [
    chapterIdentity?.chapterName,
    chapterIdentity?.chapterUrl,
  ].filter((value): value is string => typeof value === 'string');

  for (const candidate of candidates) {
    const match =
      candidate.match(/chapter[\s/_-]*(\d+(?:\.\d+)?)/i) ??
      candidate.match(/chapitre[\s/_-]*(\d+(?:\.\d+)?)/i) ??
      candidate.match(/(?:^|[\s/_-])(\d+(?:\.\d+)?)(?:$|[\s/_-])/);

    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
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

async function resolveQaBaselineRetainedAt(workDir: string) {
  const envBaseline = parseDate(
    process.env.TRANSLATION_QA_AGENT_MIN_RETAINED_AT
  );

  if (envBaseline) {
    return envBaseline;
  }

  const stateDir = path.dirname(path.dirname(workDir));
  const baselineFile = path.join(stateDir, QA_BASELINE_FILE_NAME);

  try {
    const existingBaseline = parseDate(
      (await readFile(baselineFile, 'utf8')).trim()
    );

    if (existingBaseline) {
      return existingBaseline;
    }
  } catch {
    // Missing baseline is expected on the first run after the new-chapter-only
    // policy is deployed.
  }

  const baseline = new Date();

  await mkdir(stateDir, {
    recursive: true,
  });
  await writeFile(baselineFile, `${baseline.toISOString()}\n`);

  return baseline;
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

function getMetadataDate(metadata: unknown, key: string) {
  return parseDate(getMetadataString(metadata, key));
}

function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
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
