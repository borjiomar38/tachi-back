import { db } from '@/server/db';
import {
  analyzeTranslationManifestOcr,
  selectTopOcrGroupingIssues,
  summarizeOcrManifestAnalyses,
} from '@/server/jobs/ocr-cache-analysis';
import { zTranslationJobResultManifest } from '@/server/jobs/schema';

type CliOptions = {
  chapterSearch?: string;
  json: boolean;
  limit: number;
  top: number;
};

const options = parseArgs(process.argv.slice(2));

try {
  const rows = await db.translationResultCache.findMany({
    orderBy: {
      updatedAt: 'desc',
    },
    select: {
      cacheKey: true,
      chapterCacheKey: true,
      chapterIdentity: true,
      resultManifest: true,
      targetLanguage: true,
      updatedAt: true,
    },
    take: options.limit,
    where: {
      chapterCacheKey: {
        not: null,
      },
    },
  });

  const filteredRows = options.chapterSearch
    ? rows.filter((row) =>
        JSON.stringify(row.chapterIdentity ?? {})
          .toLowerCase()
          .includes(options.chapterSearch!.toLowerCase())
      )
    : rows;

  const analyses = filteredRows.flatMap((row) => {
    if (!row.resultManifest) {
      return [];
    }

    const manifest = parseManifest(row.resultManifest);
    if (!manifest) {
      return [];
    }

    return analyzeTranslationManifestOcr({
      cacheKey: row.cacheKey,
      chapterCacheKey: row.chapterCacheKey,
      manifest,
    });
  });
  const summary = summarizeOcrManifestAnalyses(analyses);
  const topIssues = selectTopOcrGroupingIssues(analyses, options.top);

  if (options.json) {
    console.log(JSON.stringify({ summary, topIssues }, null, 2));
  } else {
    console.log('OCR cache grouping analysis');
    console.log(`Rows scanned: ${rows.length}`);
    console.log(`Rows after filter: ${filteredRows.length}`);
    console.log(`Manifests analyzed: ${summary.analyzedManifests}`);
    console.log(`Pages analyzed: ${summary.analyzedPages}`);
    console.log(`Blocks analyzed: ${summary.analyzedBlocks}`);
    console.log(`Issues: ${summary.issueCount}`);
    console.log(`Issues by kind: ${JSON.stringify(summary.issuesByKind)}`);
    console.log(
      `Issues by severity: ${JSON.stringify(summary.issuesBySeverity)}`
    );

    for (const issue of topIssues) {
      const location = [
        issue.chapterCacheKey ?? 'no-chapter-key',
        issue.cacheKey ?? 'no-cache-key',
        issue.pageKey,
        issue.blockIndex != null
          ? `block ${issue.blockIndex}`
          : issue.neighborIndexes
            ? `neighbors ${issue.neighborIndexes.join('/')}`
            : 'page',
      ].join(' / ');

      console.log('');
      console.log(`[${issue.severity}] ${issue.kind}`);
      console.log(location);
      console.log(issue.message);
      console.log(JSON.stringify(issue.metrics));
      if (issue.sourceText != null) {
        console.log(`Source: ${issue.sourceText}`);
      }
      if (issue.translation != null) {
        console.log(`Translation: ${issue.translation}`);
      }
      if (issue.neighborTexts) {
        console.log(`Neighbor source A: ${issue.neighborTexts[0]}`);
        console.log(`Neighbor source B: ${issue.neighborTexts[1]}`);
      }
    }
  }
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}

function parseManifest(rawManifest: unknown) {
  const record =
    rawManifest &&
    typeof rawManifest === 'object' &&
    !Array.isArray(rawManifest)
      ? (rawManifest as Record<string, unknown>)
      : null;

  const parsed = zTranslationJobResultManifest.safeParse({
    ...record,
    completedAt:
      typeof record?.completedAt === 'string'
        ? new Date(record.completedAt)
        : record?.completedAt,
  });

  return parsed.success ? parsed.data : null;
}

function parseArgs(args: string[]): CliOptions {
  const options: CliOptions = {
    json: false,
    limit: 500,
    top: 30,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case '--chapter':
        options.chapterSearch = args[index + 1];
        index += 1;
        break;
      case '--json':
        options.json = true;
        break;
      case '--limit':
        options.limit = parsePositiveInt(args[index + 1], options.limit);
        index += 1;
        break;
      case '--top':
        options.top = parsePositiveInt(args[index + 1], options.top);
        index += 1;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
    }
  }

  return options;
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
  dotenv -- node ./run-jiti.js ./scripts/analyze-translation-cache-ocr.ts [options]

Options:
  --chapter <text>  Filter by serialized chapter identity text.
  --json            Print machine-readable JSON.
  --limit <number>  Max cache rows to scan. Default: 500.
  --top <number>    Max issues to print. Default: 30.
`);
}
