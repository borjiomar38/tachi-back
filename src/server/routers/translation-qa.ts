import { z } from 'zod';

import {
  zBackofficeTranslationQaIssuePreview,
  zBackofficeTranslationQaListInput,
  zBackofficeTranslationQaListItem,
  zBackofficeTranslationQaListResponse,
} from '@/server/jobs/backoffice-schema';
import { zTranslationChapterIdentity } from '@/server/jobs/schema';
import { getTranslationJobJsonAsset } from '@/server/jobs/storage';
import { protectedProcedure } from '@/server/orpc';

const QA_REPORT_ARTIFACT_NAME = 'translation-qa-report.json';
const tags = ['translation-qa'];

type TranslationQaListItem = z.infer<typeof zBackofficeTranslationQaListItem>;
type TranslationQaIssuePreview = z.infer<
  typeof zBackofficeTranslationQaIssuePreview
>;
type TranslationQaReportStatus = TranslationQaListItem['status'];
type TranslationQaRecord = {
  issues: TranslationQaIssuePreview[];
  item: TranslationQaListItem;
};
type QaReportAssetRow = {
  bucketName: string | null;
  createdAt: Date;
  id: string;
  job: {
    chapterIdentity: unknown;
    completedAt: Date | null;
    createdAt: Date;
    id: string;
    pageCount: number;
    sourceLanguage: string;
    targetLanguage: string;
  };
  objectKey: string | null;
};

export default {
  list: protectedProcedure({
    permissions: {
      job: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/translation-qa',
      tags,
    })
    .input(zBackofficeTranslationQaListInput)
    .output(zBackofficeTranslationQaListResponse)
    .handler(async ({ context, input }) => {
      const where = {
        kind: 'debug_artifact' as const,
        originalFileName: QA_REPORT_ARTIFACT_NAME,
      };
      const [assets, total] = await Promise.all([
        context.db.jobAsset.findMany({
          orderBy: {
            createdAt: 'desc',
          },
          select: {
            bucketName: true,
            createdAt: true,
            id: true,
            job: {
              select: {
                chapterIdentity: true,
                completedAt: true,
                createdAt: true,
                id: true,
                pageCount: true,
                sourceLanguage: true,
                targetLanguage: true,
              },
            },
            objectKey: true,
          },
          take: input.limit,
          where,
        }),
        context.db.jobAsset.count({
          where,
        }),
      ]);
      const records = await Promise.all(
        assets.map(async (asset) => {
          try {
            return await buildTranslationQaRecord(asset);
          } catch (error) {
            context.logger.warn(
              { assetId: asset.id, error },
              'Failed to load translation QA report'
            );

            return buildUnavailableTranslationQaRecord(
              asset,
              `QA report JSON is unavailable: ${getErrorMessage(error)}`
            );
          }
        })
      );
      const filteredRecords =
        input.status === 'all'
          ? records
          : records.filter((record) => record.item.status === input.status);

      return {
        items: filteredRecords.map((record) => record.item),
        stats: buildStats(filteredRecords),
        total,
      };
    }),
};

async function buildTranslationQaRecord(
  asset: QaReportAssetRow
): Promise<TranslationQaRecord> {
  if (!asset.bucketName || !asset.objectKey) {
    return buildUnavailableTranslationQaRecord(
      asset,
      'QA report asset has no storage object.'
    );
  }

  const report = await getTranslationJobJsonAsset({
    bucketName: asset.bucketName,
    objectKey: asset.objectKey,
  });
  const reportRecord = asRecord(report);
  const reportJob = asRecord(reportRecord?.job);
  const codexReport = parseCodexReport(reportRecord?.codexReport);
  const reportCreatedAt =
    parseDate(getString(reportRecord, 'createdAt')) ?? asset.createdAt;
  const chapterIdentity = normalizeChapterIdentity(
    reportJob?.chapterIdentity ?? asset.job.chapterIdentity
  );
  const issueCounts = countIssueSeverities(codexReport.issues);

  return {
    issues: codexReport.issues,
    item: {
      assetId: asset.id,
      chapterIdentity,
      cleanupAnalysisCompleted: codexReport.cleanupAnalysisCompleted,
      cleanupCanDeleteOriginalUploads:
        codexReport.cleanupCanDeleteOriginalUploads,
      criticalIssueCount: issueCounts.critical,
      infoIssueCount: issueCounts.info,
      inspectionMode: codexReport.inspectionMode,
      issueCount: Math.max(codexReport.issueCount, codexReport.issues.length),
      jobCompletedAt:
        parseDate(getString(reportJob, 'completedAt')) ?? asset.job.completedAt,
      jobCreatedAt:
        parseDate(getString(reportJob, 'createdAt')) ?? asset.job.createdAt,
      jobId: getString(reportJob, 'id') ?? asset.job.id,
      pageCount:
        getNonnegativeInteger(reportJob, 'pageCount') ?? asset.job.pageCount,
      reportCreatedAt,
      sourceLanguage:
        getString(reportJob, 'sourceLanguage') ?? asset.job.sourceLanguage,
      status: codexReport.status,
      summary: codexReport.summary,
      targetLanguage:
        getString(reportJob, 'targetLanguage') ?? asset.job.targetLanguage,
      topIssues: codexReport.issues.slice(0, 5),
      trainingSignals: codexReport.trainingSignals,
      warningIssueCount: issueCounts.warning,
    },
  };
}

function buildUnavailableTranslationQaRecord(
  asset: QaReportAssetRow,
  summary: string
): TranslationQaRecord {
  return {
    issues: [],
    item: {
      assetId: asset.id,
      chapterIdentity: normalizeChapterIdentity(asset.job.chapterIdentity),
      cleanupAnalysisCompleted: null,
      cleanupCanDeleteOriginalUploads: null,
      criticalIssueCount: 0,
      infoIssueCount: 0,
      inspectionMode: 'unknown',
      issueCount: 0,
      jobCompletedAt: asset.job.completedAt,
      jobCreatedAt: asset.job.createdAt,
      jobId: asset.job.id,
      pageCount: asset.job.pageCount,
      reportCreatedAt: asset.createdAt,
      sourceLanguage: asset.job.sourceLanguage,
      status: 'unavailable',
      summary,
      targetLanguage: asset.job.targetLanguage,
      topIssues: [],
      trainingSignals: [],
      warningIssueCount: 0,
    },
  };
}

function parseCodexReport(rawCodexReport: unknown) {
  const codexReport = asRecord(rawCodexReport);

  if (!codexReport) {
    return {
      cleanupAnalysisCompleted: null,
      cleanupCanDeleteOriginalUploads: null,
      inspectionMode: 'unknown' as const,
      issueCount: 0,
      issues: [],
      status: 'blocked' as const,
      summary: 'The QA report has no Codex analysis section.',
      trainingSignals: [],
    };
  }

  if (getString(codexReport, 'parseStatus') === 'raw_text') {
    return {
      cleanupAnalysisCompleted: false,
      cleanupCanDeleteOriginalUploads: false,
      inspectionMode: 'unknown' as const,
      issueCount: 0,
      issues: [],
      status: 'blocked' as const,
      summary: 'The Codex QA output was stored as raw text and needs review.',
      trainingSignals: [],
    };
  }

  const summary = asRecord(codexReport.summary);
  const issues = parseIssues(codexReport.issues);
  const cleanupDecision = asRecord(codexReport.cleanupDecision);

  return {
    cleanupAnalysisCompleted: getBoolean(cleanupDecision, 'analysisCompleted'),
    cleanupCanDeleteOriginalUploads: getBoolean(
      cleanupDecision,
      'canDeleteOriginalUploads'
    ),
    inspectionMode: parseInspectionMode(
      getString(codexReport, 'inspectionMode')
    ),
    issueCount: getNonnegativeInteger(summary, 'issueCount') ?? issues.length,
    issues,
    status: parseReportStatus(getString(summary, 'status'), issues),
    summary: truncate(
      getString(summary, 'short') ?? buildFallbackSummary(issues),
      500
    ),
    trainingSignals: getStringArray(codexReport, 'nextTrainingSignals').slice(
      0,
      8
    ),
  };
}

function parseIssues(rawIssues: unknown): TranslationQaIssuePreview[] {
  if (!Array.isArray(rawIssues)) {
    return [];
  }

  return rawIssues
    .map<TranslationQaIssuePreview | null>((rawIssue) => {
      const issue = asRecord(rawIssue);

      if (!issue) {
        return null;
      }

      const message = getString(issue, 'message');

      if (!message) {
        return null;
      }

      const preview: TranslationQaIssuePreview = {
        blockIndex: getNonnegativeInteger(issue, 'blockIndex') ?? null,
        evidence: getString(issue, 'evidence')
          ? truncate(getString(issue, 'evidence') ?? '', 500)
          : null,
        kind: getString(issue, 'kind') ?? 'other',
        message: truncate(message, 500),
        pageKey: getString(issue, 'pageKey') ?? '*',
        severity: parseIssueSeverity(getString(issue, 'severity')),
      };

      return preview;
    })
    .filter((issue): issue is TranslationQaIssuePreview => Boolean(issue));
}

function parseReportStatus(
  value: string | null,
  issues: TranslationQaIssuePreview[]
): TranslationQaReportStatus {
  if (value === 'ok' || value === 'issues_found' || value === 'blocked') {
    return value;
  }

  return issues.length > 0 ? 'issues_found' : 'ok';
}

function parseInspectionMode(
  value: string | null
): TranslationQaListItem['inspectionMode'] {
  if (value === 'visual_and_manifest' || value === 'manifest_only') {
    return value;
  }

  return 'unknown';
}

function parseIssueSeverity(value: string | null) {
  if (value === 'critical' || value === 'warning' || value === 'info') {
    return value;
  }

  return 'info';
}

function buildFallbackSummary(issues: TranslationQaIssuePreview[]) {
  if (!issues.length) {
    return 'No QA issue was reported.';
  }

  return `${issues.length} QA issue${issues.length === 1 ? '' : 's'} reported.`;
}

function buildStats(records: TranslationQaRecord[]) {
  const issueKindCounts = new Map<string, number>();
  const sourceLanguageCounts = new Map<string, number>();
  const targetLanguageCounts = new Map<string, number>();
  const stats = {
    blockedReportCount: 0,
    cleanupBlockedCount: 0,
    criticalIssueCount: 0,
    infoIssueCount: 0,
    issueReportCount: 0,
    manifestOnlyReportCount: 0,
    okReportCount: 0,
    sourceLanguages: [],
    targetLanguages: [],
    topIssueKinds: [],
    totalIssues: 0,
    totalReports: records.length,
    unavailableReportCount: 0,
    visualReportCount: 0,
    warningIssueCount: 0,
  };

  for (const { issues, item } of records) {
    incrementMap(sourceLanguageCounts, item.sourceLanguage);
    incrementMap(targetLanguageCounts, item.targetLanguage);

    stats.totalIssues += item.issueCount;
    stats.criticalIssueCount += item.criticalIssueCount;
    stats.warningIssueCount += item.warningIssueCount;
    stats.infoIssueCount += item.infoIssueCount;

    if (item.status === 'ok') {
      stats.okReportCount += 1;
    }
    if (item.status === 'issues_found') {
      stats.issueReportCount += 1;
    }
    if (item.status === 'blocked') {
      stats.blockedReportCount += 1;
    }
    if (item.status === 'unavailable') {
      stats.unavailableReportCount += 1;
    }
    if (item.inspectionMode === 'visual_and_manifest') {
      stats.visualReportCount += 1;
    }
    if (item.inspectionMode === 'manifest_only') {
      stats.manifestOnlyReportCount += 1;
    }
    if (item.cleanupCanDeleteOriginalUploads === false) {
      stats.cleanupBlockedCount += 1;
    }

    for (const issue of issues) {
      incrementMap(issueKindCounts, issue.kind);
    }
  }

  return {
    ...stats,
    sourceLanguages: rankDimensionCounts(sourceLanguageCounts),
    targetLanguages: rankDimensionCounts(targetLanguageCounts),
    topIssueKinds: rankDimensionCounts(issueKindCounts),
  };
}

function countIssueSeverities(issues: TranslationQaIssuePreview[]) {
  return issues.reduce(
    (counts, issue) => {
      counts[issue.severity] += 1;
      return counts;
    },
    {
      critical: 0,
      info: 0,
      warning: 0,
    }
  );
}

function incrementMap(counts: Map<string, number>, value: string) {
  counts.set(value, (counts.get(value) ?? 0) + 1);
}

function rankDimensionCounts(counts: Map<string, number>) {
  return Array.from(counts.entries())
    .map(([value, count]) => ({
      count,
      value,
    }))
    .sort(
      (left, right) =>
        right.count - left.count || left.value.localeCompare(right.value)
    )
    .slice(0, 10);
}

function normalizeChapterIdentity(rawIdentity: unknown) {
  const identity = zTranslationChapterIdentity.safeParse(rawIdentity);

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

function asRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getString(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];

  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function getStringArray(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is string => typeof item === 'string' && Boolean(item.trim())
    )
    .map((item) => truncate(item.trim(), 240));
}

function getBoolean(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];

  return typeof value === 'boolean' ? value : null;
}

function getNonnegativeInteger(
  record: Record<string, unknown> | null,
  key: string
) {
  const value = record?.[key];

  return typeof value === 'number' && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function parseDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength
    ? `${value.slice(0, Math.max(0, maxLength - 1))}...`
    : value;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'unknown error';
}
