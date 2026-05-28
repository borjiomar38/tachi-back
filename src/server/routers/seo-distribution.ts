/* eslint-disable no-process-env */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import { protectedProcedure } from '@/server/orpc';

const tags = ['seo-distribution'];
const defaultStateDir = '/var/lib/tachi-seo-distribution-agent';

const zDistributionRow = z.object({
  columns: z.record(z.string(), z.string()),
  id: z.string(),
});

const zSeoDistributionAccount = z.object({
  actionMode: z.string(),
  configured: z.boolean(),
  displayName: z.string(),
  notes: z.string(),
  platform: z.string(),
  requiredSecretNames: z.array(z.string()),
});

const zSeoDistributionOverview = z.object({
  accounts: z.array(zSeoDistributionAccount),
  authorityOpportunities: z.array(zDistributionRow),
  contentCalendar: z.array(zDistributionRow),
  docsGeneratedAt: z.string().nullable(),
  latestReport: z
    .object({
      excerpt: z.string(),
      fileName: z.string(),
      updatedAt: z.string(),
    })
    .nullable(),
  linkAssets: z.array(zDistributionRow),
  platformDrafts: z.array(zDistributionRow),
  recentReports: z.array(
    z.object({
      excerpt: z.string(),
      fileName: z.string(),
      updatedAt: z.string(),
    })
  ),
  stats: z.object({
    authorizedAccountRequiredCount: z.number(),
    authorityOpportunityCount: z.number(),
    highAuthorityOpportunityCount: z.number(),
    configuredAccountCount: z.number(),
    contentBacklogCount: z.number(),
    linkAssetCount: z.number(),
    platformDraftCount: z.number(),
    pushedReportCount: z.number(),
    reportCount: z.number(),
  }),
  status: z.object({
    accountCreationEnabled: z.boolean(),
    autoMergeToMaster: z.boolean(),
    branch: z.string().nullable(),
    commit: z.string().nullable(),
    cycleId: z.string().nullable(),
    externalPostingMode: z.string(),
    generatedAt: z.string().nullable(),
    gitPushEnabled: z.boolean(),
    intervalSeconds: z.number(),
    reportFile: z.string().nullable(),
    stage: z.string(),
    stale: z.boolean(),
  }),
});

export default {
  overview: protectedProcedure({
    permissions: {
      job: ['read'],
    },
  })
    .route({
      method: 'GET',
      path: '/seo-distribution',
      tags,
    })
    .output(zSeoDistributionOverview)
    .handler(async () => buildOverview()),
};

async function buildOverview(): Promise<
  z.infer<typeof zSeoDistributionOverview>
> {
  const stateDir =
    process.env.SEO_DISTRIBUTION_AGENT_STATE_DIR ?? defaultStateDir;
  const [status, docsSnapshot, recentReports] = await Promise.all([
    readJsonFile(path.join(stateDir, 'status.json')),
    readJsonFile(path.join(stateDir, 'docs-snapshot.json')),
    readRecentReports(path.join(stateDir, 'reports')),
  ]);
  const accounts = parseAccounts(
    await readJsonFile(path.join(stateDir, 'accounts.json'))
  );
  const docsSnapshotRecord = asRecord(docsSnapshot);
  const docsFiles = asRecord(docsSnapshotRecord?.files) ?? {};
  const platformDrafts = parseMarkdownTable(
    getString(docsFiles, 'docs/seo-distribution/platform-drafts.md')
  );
  const authorityOpportunities = parseMarkdownTable(
    getString(docsFiles, 'docs/seo-distribution/authority-opportunities.md')
  );
  const contentCalendar = parseMarkdownTable(
    getString(docsFiles, 'docs/seo-distribution/content-calendar.md')
  );
  const linkAssets = parseMarkdownTable(
    getString(docsFiles, 'docs/seo-distribution/link-assets.md')
  );
  const latestReport = recentReports[0] ?? null;
  const generatedAt = getString(status, 'generatedAt');

  return {
    accounts,
    authorityOpportunities,
    contentCalendar,
    docsGeneratedAt: getString(docsSnapshot, 'generatedAt'),
    latestReport,
    linkAssets,
    platformDrafts,
    recentReports,
    stats: {
      authorizedAccountRequiredCount: platformDrafts.filter((row) =>
        Object.values(row.columns).some((value) =>
          /AUTHORIZED_ACCOUNT_REQUIRED/i.test(value)
        )
      ).length,
      authorityOpportunityCount: authorityOpportunities.length,
      highAuthorityOpportunityCount: authorityOpportunities.filter((row) =>
        /^high$/i.test(row.columns['Authority tier'] ?? '')
      ).length,
      contentBacklogCount: contentCalendar.filter((row) =>
        /^backlog$/i.test(row.columns.Status ?? '')
      ).length,
      configuredAccountCount: accounts.filter((account) => account.configured)
        .length,
      linkAssetCount: linkAssets.length,
      platformDraftCount: platformDrafts.length,
      pushedReportCount: recentReports.filter((report) =>
        /Pushed seo\/distribution-/i.test(report.excerpt)
      ).length,
      reportCount: recentReports.length,
    },
    status: {
      accountCreationEnabled:
        getBoolean(status, 'accountCreationEnabled') ?? false,
      autoMergeToMaster: getBoolean(status, 'autoMergeToMaster') ?? false,
      branch: getString(status, 'branch'),
      commit: getString(status, 'commit'),
      cycleId: getString(status, 'cycleId'),
      externalPostingMode: getString(status, 'externalPostingMode') ?? 'draft',
      generatedAt,
      gitPushEnabled: getBoolean(status, 'gitPushEnabled') ?? false,
      intervalSeconds: getNumber(status, 'intervalSeconds') ?? 60,
      reportFile: getString(status, 'reportFile'),
      stage: getString(status, 'stage') ?? 'unknown',
      stale: isStale(generatedAt),
    },
  };
}

function parseAccounts(
  raw: unknown
): z.infer<typeof zSeoDistributionAccount>[] {
  const accounts = asRecord(raw)?.accounts;

  if (!Array.isArray(accounts)) {
    return [];
  }

  return accounts
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) {
        return null;
      }

      return {
        actionMode: getString(record, 'actionMode') ?? 'draft',
        configured: getBoolean(record, 'configured') ?? false,
        displayName: getString(record, 'displayName') ?? 'Account',
        notes: getString(record, 'notes') ?? '',
        platform: getString(record, 'platform') ?? 'unknown',
        requiredSecretNames: getStringArray(record, 'requiredSecretNames'),
      };
    })
    .filter((account): account is z.infer<typeof zSeoDistributionAccount> =>
      Boolean(account)
    );
}

async function readRecentReports(reportsDir: string) {
  try {
    const entries = await fs.readdir(reportsDir, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
        .map(async (entry) => {
          const filePath = path.join(reportsDir, entry.name);
          const [stat, content] = await Promise.all([
            fs.stat(filePath),
            fs.readFile(filePath, 'utf8').catch(() => ''),
          ]);

          return {
            excerpt: content.trim().slice(0, 3000),
            fileName: entry.name,
            updatedAt: stat.mtime.toISOString(),
          };
        })
    );

    return files
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 10);
  } catch {
    return [];
  }
}

async function readJsonFile(filePath: string) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8')) as unknown;
  } catch {
    return null;
  }
}

function parseMarkdownTable(markdown: string | null) {
  if (!markdown) {
    return [];
  }

  const lines = markdown
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('|') && line.endsWith('|'));

  for (let index = 0; index < lines.length - 1; index += 1) {
    const currentLine = lines[index];
    const nextLine = lines[index + 1];
    if (!currentLine || !nextLine) {
      continue;
    }

    const header = splitMarkdownRow(currentLine);
    const separator = splitMarkdownRow(nextLine);
    const isSeparator = separator.every((cell) => /^:?-{3,}:?$/.test(cell));

    if (!header.length || !isSeparator) {
      continue;
    }

    return lines
      .slice(index + 2)
      .filter((line) => splitMarkdownRow(line).length === header.length)
      .map((line, rowIndex) => {
        const values = splitMarkdownRow(line);
        const columns = Object.fromEntries(
          header.map((key, columnIndex) => [
            key || `Column ${columnIndex + 1}`,
            values[columnIndex] ?? '',
          ])
        );

        return {
          columns,
          id: `${index}-${rowIndex}-${values.join('-')}`,
        };
      });
  }

  return [];
}

function splitMarkdownRow(row: string) {
  return row
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isStale(value: string | null) {
  if (!value) {
    return true;
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return true;
  }

  return Date.now() - timestamp > 30 * 60 * 1000;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function getString(record: unknown, key: string) {
  const value = asRecord(record)?.[key];

  return typeof value === 'string' ? value : null;
}

function getBoolean(record: unknown, key: string) {
  const value = asRecord(record)?.[key];

  return typeof value === 'boolean' ? value : null;
}

function getNumber(record: unknown, key: string) {
  const value = asRecord(record)?.[key];

  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getStringArray(record: unknown, key: string) {
  const value = asRecord(record)?.[key];

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}
