/* eslint-disable no-process-env */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const defaultStateDir = '/var/lib/tachi-seo-distribution-agent';
const defaultDailyCronSchedule = '0 3 * * *';

export type SeoDistributionControlState = {
  cronEndpoint: string;
  dailyCronSchedule: string;
  lastTrigger: {
    requestedAt: string;
    source: string;
  } | null;
  stateDir: string;
  triggerFile: string;
  triggerPending: boolean;
  triggerUpdatedAt: string | null;
};

export function getSeoDistributionStateDir() {
  return process.env.SEO_DISTRIBUTION_AGENT_STATE_DIR ?? defaultStateDir;
}

export function getSeoDistributionTriggerFile() {
  return (
    process.env.SEO_DISTRIBUTION_AGENT_TRIGGER_FILE ??
    path.join(getSeoDistributionStateDir(), 'run-now')
  );
}

export async function readSeoDistributionControlState(): Promise<SeoDistributionControlState> {
  const stateDir = getSeoDistributionStateDir();
  const triggerFile = getSeoDistributionTriggerFile();
  const triggerStat = await fs.stat(triggerFile).catch(() => null);
  const lastTrigger = await readLastTrigger(
    path.join(stateDir, 'trigger-history.json')
  );

  return {
    cronEndpoint: '/api/cron/seo-distribution',
    dailyCronSchedule:
      process.env.SEO_DISTRIBUTION_DAILY_CRON_SCHEDULE ??
      defaultDailyCronSchedule,
    lastTrigger,
    stateDir,
    triggerFile,
    triggerPending: Boolean(triggerStat),
    triggerUpdatedAt: triggerStat?.mtime.toISOString() ?? null,
  };
}

export async function triggerSeoDistributionCycle(input: {
  source: 'admin' | 'cron';
}): Promise<SeoDistributionControlState> {
  const stateDir = getSeoDistributionStateDir();
  const triggerFile = getSeoDistributionTriggerFile();
  const requestedAt = new Date().toISOString();
  const triggerPayload = {
    requestedAt,
    source: input.source,
    version: 'seo-distribution-trigger.v1',
  };

  await fs.mkdir(path.dirname(triggerFile), { recursive: true });
  await fs.writeFile(
    triggerFile,
    `${JSON.stringify(triggerPayload)}\n`,
    'utf8'
  );
  await writeLastTrigger(path.join(stateDir, 'trigger-history.json'), {
    requestedAt,
    source: input.source,
  });

  return await readSeoDistributionControlState();
}

async function readLastTrigger(historyFile: string) {
  try {
    const raw = JSON.parse(await fs.readFile(historyFile, 'utf8')) as unknown;
    const record = asRecord(raw);
    const requestedAt = getString(record, 'requestedAt');
    const source = getString(record, 'source');

    if (!requestedAt || !source) {
      return null;
    }

    return { requestedAt, source };
  } catch {
    return null;
  }
}

async function writeLastTrigger(
  historyFile: string,
  trigger: NonNullable<SeoDistributionControlState['lastTrigger']>
) {
  await fs.mkdir(path.dirname(historyFile), { recursive: true });
  await fs.writeFile(
    historyFile,
    `${JSON.stringify(
      {
        ...trigger,
        version: 'seo-distribution-trigger-history.v1',
      },
      null,
      2
    )}\n`,
    'utf8'
  );
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
