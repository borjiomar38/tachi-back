import { syncContactInbox } from '@/server/contact/inbox-sync';
import {
  processNextContactTriage,
  quarantineStaleContactNotifications,
} from '@/server/contact/triage-processor';
import { db } from '@/server/db';

const getArgument = (name: string) =>
  process.argv
    .find((argument) => argument.startsWith(`--${name}=`))
    ?.slice(name.length + 3);

const onlyId = getArgument('id');
const limit = Number.parseInt(getArgument('limit') ?? '50', 10);
const concurrency = Number.parseInt(getArgument('concurrency') ?? '3', 10);
const safeLimit = Math.max(1, Math.min(limit, 100));
const safeConcurrency = Math.max(1, Math.min(concurrency, 5));

const runBatch = async () => {
  const batches = Array.from({
    length: Math.ceil(safeLimit / safeConcurrency),
  });
  const batchResults = [];

  for (const [batchIndex] of batches.entries()) {
    const remaining = safeLimit - batchIndex * safeConcurrency;
    const batchSize = Math.min(safeConcurrency, remaining);
    const results = await Promise.all(
      Array.from({ length: batchSize }, () => processNextContactTriage(onlyId))
    );
    batchResults.push(...results);
    if (onlyId || results.every((result) => result.outcome === 'empty')) break;
  }

  return batchResults;
};

const run = async () => {
  const inbox = await syncContactInbox();
  const quarantinedNotifications = await quarantineStaleContactNotifications();
  const queuedBefore = await db.contactConversationMessage.count({
    where: { automationStatus: 'pending', direction: 'inbound' },
  });
  const results = await runBatch();
  const queuedAfter = await db.contactConversationMessage.count({
    where: { automationStatus: 'pending', direction: 'inbound' },
  });

  console.info(
    JSON.stringify({
      failed: results.filter((result) => result.outcome === 'failed').length,
      inbox,
      processed: results.filter((result) => result.processed).length,
      quarantinedNotifications: quarantinedNotifications.count,
      queuedAfter,
      queuedBefore,
    })
  );
};

run()
  .catch(() => {
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
