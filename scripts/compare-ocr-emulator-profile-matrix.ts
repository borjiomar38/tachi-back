import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  coalesceOcrLineBlocks,
  coalesceOcrPageContinuations,
} from '@/server/jobs/ocr-block-grouping';
import { performGoogleCloudVisionOcr } from '@/server/provider-gateway/ocr';
import { type NormalizedOcrPage } from '@/server/provider-gateway/schema';

type OcrBlock = NormalizedOcrPage['blocks'][number];
type OcrPage = NormalizedOcrPage;

type RawOcrPage = {
  fileName: string;
  ocrPage: OcrPage;
};

type SourcePlacement = {
  fileName: string;
  height: number;
  offsetX: number;
  offsetY: number;
  originalHeight: number;
  originalWidth: number;
  sha256: string;
  width: number;
};

type Upload = {
  fileName: string;
  height: number | null;
  mimeType: string;
  relativePath: string | null;
  sha256: string;
  sizeBytes: number;
  sourcePages: SourcePlacement[];
  width: number | null;
};

type EncodedUpload = Upload & {
  imageBytes: Uint8Array;
};

type MatrixProfile = {
  durationMs: number;
  maxWidthPx: number | null;
  originalFallbackCount: number;
  originalTotalBytes: number;
  preparedTotalBytes: number;
  profile: string;
  reductionPercent: number;
  uploadCount: number;
  uploads: Upload[];
  webpQuality: number | null;
};

type MatrixReport = {
  availableHeapBytes: number;
  device: string;
  maxHeapBytes: number;
  profiles: MatrixProfile[];
  sdkInt: number;
  sourceDirectory: string;
  sourcePageCount: number;
};

type ReferenceArtifact = {
  rawOcrPages: RawOcrPage[];
};

type CandidateUnit = {
  blocks: OcrBlock[];
  normalizedText: string;
};

type MatchResult = {
  centerDriftPercent: number | null;
  iou: number | null;
  matchedText: string;
  recall: number;
  score: number;
  unorderedRecall: number;
};

type OriginalSourcePage = {
  fileName: string;
  imageBytes: Uint8Array;
  imageHeight: number;
  imageWidth: number;
  sha256: string;
};

const HOSTED_OCR_MAX_BATCH_HEIGHT = 30_000;
const HOSTED_OCR_MAX_BATCH_PIXELS = 40_000_000;
const HOSTED_OCR_MAX_INLINE_IMAGE_BYTES = 7 * 1024 * 1024;
const HOSTED_OCR_JPEG_QUALITY = 88;
const PRODUCTION_ORIGINAL_PIPELINE_VERSION = 'server-batched-mozjpeg-q88-v1';
const PROFILE_CHECKPOINT_VERSION = 'google-vision-text-detection-v1';

const options = parseOptions(process.argv.slice(2));
const matrixPath = requireOption(options, 'matrix');
const baselinePath = requireOption(options, 'baseline');
const outputDirectory = requireOption(options, 'output');
const trustExistingCheckpoints = options.get('trust-checkpoints') === 'true';
const originalDirectory = options.get('original')
  ? path.resolve(requireOption(options, 'original'))
  : null;
const matrixDirectory = path.dirname(matrixPath);
const matrix = JSON.parse(await readFile(matrixPath, 'utf8')) as MatrixReport;
const baselineArtifact = JSON.parse(
  await readFile(baselinePath, 'utf8')
) as ReferenceArtifact;
const historicalBaselinePages = baselineArtifact.rawOcrPages;
const profiles = matrix.profiles.filter(
  (profile) => profile.profile !== 'original'
);

await mkdir(outputDirectory, { recursive: true });
const productionOriginalRun = originalDirectory
  ? await loadOrRunFreshOriginalOcr({
      originalDirectory,
      outputDirectory,
    })
  : null;
const baselinePages = productionOriginalRun?.pages ?? historicalBaselinePages;

const profileAnalyses = [];
for (const profile of profiles) {
  const profileOutputDirectory = path.join(outputDirectory, profile.profile);
  const checkpointPath = path.join(
    profileOutputDirectory,
    'raw-ocr-pages.json'
  );
  const checkpointMetadataPath = path.join(
    profileOutputDirectory,
    'checkpoint-metadata.json'
  );
  const profileFingerprint = fingerprintMatrixProfile(profile);
  await mkdir(profileOutputDirectory, { recursive: true });

  let rawOcrPages: RawOcrPage[];
  try {
    rawOcrPages = JSON.parse(
      await readFile(checkpointPath, 'utf8')
    ) as RawOcrPage[];
    if (!trustExistingCheckpoints) {
      const metadata = JSON.parse(
        await readFile(checkpointMetadataPath, 'utf8')
      ) as {
        checkpointVersion: string;
        profileFingerprint: string;
      };
      if (
        metadata.checkpointVersion !== PROFILE_CHECKPOINT_VERSION ||
        metadata.profileFingerprint !== profileFingerprint
      ) {
        throw new Error(`Stale checkpoint for ${profile.profile}`);
      }
    }
    if (rawOcrPages.length !== matrix.sourcePageCount) {
      throw new Error(`Incomplete checkpoint for ${profile.profile}`);
    }
    console.log(
      `profile=${profile.profile} using checkpoint pages=${rawOcrPages.length}`
    );
    if (trustExistingCheckpoints) {
      await writeProfileCheckpointMetadata({
        checkpointMetadataPath,
        profileFingerprint,
      });
    }
  } catch {
    rawOcrPages = await ocrProfile({
      matrixDirectory,
      profile,
    });
    await writeFile(
      checkpointPath,
      `${JSON.stringify(rawOcrPages, null, 2)}\n`
    );
    await writeProfileCheckpointMetadata({
      checkpointMetadataPath,
      profileFingerprint,
    });
  }

  const analysis = analyzeProfile({
    baselinePages,
    candidatePages: rawOcrPages,
    profile,
  });
  profileAnalyses.push(analysis);
  await writeFile(
    path.join(profileOutputDirectory, 'analysis.json'),
    `${JSON.stringify(analysis, null, 2)}\n`
  );
  console.log(
    `ANALYSIS profile=${profile.profile} ` +
      `rawRecall=${analysis.rawComparison.characterRecallPercent}% ` +
      `productionRecall=${analysis.productionComparison.characterRecallPercent}% ` +
      `lowRecall=${analysis.productionComparison.lowRecallMeaningfulBlockCount} ` +
      `blocks=${analysis.productionComparison.candidateBlockCount} ` +
      `outOfBounds=${analysis.rawComparison.outOfBoundsBlockCount}`
  );
}

const finalReport = {
  baseline: {
    blockCount: baselinePages.reduce(
      (sum, page) => sum + page.ocrPage.blocks.length,
      0
    ),
    characterCount: baselinePages.reduce(
      (sum, page) => sum + normalizedPageText(page.ocrPage).length,
      0
    ),
    pipeline: productionOriginalRun
      ? PRODUCTION_ORIGINAL_PIPELINE_VERSION
      : 'historical-artifact',
    pageCount: baselinePages.length,
    preparedBytes: productionOriginalRun?.preparedBytes ?? null,
    requestCount: productionOriginalRun?.requestCount ?? null,
    sourceBytes: productionOriginalRun?.sourceBytes ?? null,
    productionGroupingBlockCount: applyProductionOcrGrouping(
      baselinePages
    ).reduce((sum, page) => sum + translatableBlocks(page.ocrPage).length, 0),
  },
  generatedAt: new Date().toISOString(),
  historicalOriginalComparison: originalDirectory
    ? analyzeProfile({
        baselinePages: historicalBaselinePages,
        candidatePages: baselinePages,
        profile: {
          durationMs: 0,
          maxWidthPx: null,
          originalFallbackCount: 0,
          originalTotalBytes:
            matrix.profiles.find((profile) => profile.profile === 'original')
              ?.originalTotalBytes ?? 0,
          preparedTotalBytes: productionOriginalRun?.preparedBytes ?? 0,
          profile: 'production_original_repeat',
          reductionPercent: 0,
          uploadCount: productionOriginalRun?.requestCount ?? 0,
          uploads: [],
          webpQuality: null,
        },
      })
    : null,
  matrix: {
    availableHeapBytes: matrix.availableHeapBytes,
    device: matrix.device,
    maxHeapBytes: matrix.maxHeapBytes,
    profiles: matrix.profiles.map((profile) => ({
      durationMs: profile.durationMs,
      maxWidthPx: profile.maxWidthPx,
      originalFallbackCount: profile.originalFallbackCount,
      originalTotalBytes: profile.originalTotalBytes,
      preparedTotalBytes: profile.preparedTotalBytes,
      profile: profile.profile,
      reductionPercent: profile.reductionPercent,
      uploadCount: profile.uploadCount,
      webpQuality: profile.webpQuality,
    })),
    sdkInt: matrix.sdkInt,
    sourcePageCount: matrix.sourcePageCount,
  },
  profiles: profileAnalyses,
};

await writeFile(
  path.join(outputDirectory, 'report.json'),
  `${JSON.stringify(finalReport, null, 2)}\n`
);
console.log(`REPORT ${path.join(outputDirectory, 'report.json')}`);

async function loadOrRunFreshOriginalOcr(input: {
  originalDirectory: string;
  outputDirectory: string;
}) {
  const profileOutputDirectory = path.join(
    input.outputDirectory,
    'production-original'
  );
  const checkpointPath = path.join(
    profileOutputDirectory,
    'raw-ocr-pages.json'
  );
  const checkpointMetadataPath = path.join(
    profileOutputDirectory,
    'checkpoint-metadata.json'
  );
  await mkdir(profileOutputDirectory, { recursive: true });

  const fileNames = (await readdir(input.originalDirectory))
    .filter((fileName) => /\.(?:jpe?g|png|webp)$/i.test(fileName))
    .sort();
  const sharp = await loadSharp();
  const sourcePages: OriginalSourcePage[] = [];
  for (const fileName of fileNames) {
    const imageBytes = await readFile(
      path.join(input.originalDirectory, fileName)
    );
    const metadata = await sharp(imageBytes).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error(`Unable to read original dimensions for ${fileName}`);
    }
    sourcePages.push({
      fileName: fileName.replace(/^\d{4}-/, ''),
      imageBytes,
      imageHeight: metadata.height,
      imageWidth: metadata.width,
      sha256: sha256(imageBytes),
    });
  }
  const sourceFingerprint = fingerprintOriginalSources(sourcePages);

  try {
    const metadata = JSON.parse(
      await readFile(checkpointMetadataPath, 'utf8')
    ) as {
      pipelineVersion: string;
      preparedBytes: number;
      requestCount: number;
      sourceBytes: number;
      sourceFingerprint: string;
    };
    const checkpoint = JSON.parse(
      await readFile(checkpointPath, 'utf8')
    ) as RawOcrPage[];
    if (
      metadata.pipelineVersion === PRODUCTION_ORIGINAL_PIPELINE_VERSION &&
      metadata.sourceFingerprint === sourceFingerprint &&
      checkpoint.length === sourcePages.length
    ) {
      console.log(
        `profile=production-original using checkpoint pages=${checkpoint.length}`
      );
      return {
        pages: checkpoint,
        preparedBytes: metadata.preparedBytes,
        requestCount: metadata.requestCount,
        sourceBytes: metadata.sourceBytes,
      };
    }
  } catch {
    // Continue with a fresh run of the production Original image pipeline.
  }

  const uploads = await buildProductionOriginalBatches(sourcePages);
  const results: Array<{ index: number; pages: RawOcrPage[] }> = [];
  for (let offset = 0; offset < uploads.length; offset += 3) {
    const batch = uploads.slice(offset, offset + 3);
    const batchResults = await Promise.all(
      batch.map(async (upload, batchIndex) => {
        const ocrPage = await withRetry(() =>
          performGoogleCloudVisionOcr({
            imageBytes: upload.imageBytes,
            imageHeight: upload.height ?? undefined,
            imageWidth: upload.width ?? undefined,
          })
        );
        return {
          index: offset + batchIndex,
          pages: mapBatchToOriginalPages(upload, ocrPage),
        };
      })
    );
    results.push(...batchResults);
    console.log(
      `profile=production-original ocr=${Math.min(offset + batch.length, uploads.length)}/${uploads.length}`
    );
  }
  const pages = results
    .sort((left, right) => left.index - right.index)
    .flatMap((result) => result.pages);
  const sourceBytes = sourcePages.reduce(
    (sum, page) => sum + page.imageBytes.byteLength,
    0
  );
  const preparedBytes = uploads.reduce(
    (sum, upload) => sum + upload.sizeBytes,
    0
  );
  await writeFile(checkpointPath, `${JSON.stringify(pages, null, 2)}\n`);
  await writeFile(
    checkpointMetadataPath,
    `${JSON.stringify(
      {
        pipelineVersion: PRODUCTION_ORIGINAL_PIPELINE_VERSION,
        preparedBytes,
        requestCount: uploads.length,
        sourceBytes,
        sourceFingerprint,
      },
      null,
      2
    )}\n`
  );
  return {
    pages,
    preparedBytes,
    requestCount: uploads.length,
    sourceBytes,
  };
}

async function buildProductionOriginalBatches(pages: OriginalSourcePage[]) {
  const plannedBatches: OriginalSourcePage[][] = [];
  let currentBatch: OriginalSourcePage[] = [];

  for (const page of pages) {
    const candidate = [...currentBatch, page];
    if (currentBatch.length > 0 && !canFitProductionOriginalBatch(candidate)) {
      plannedBatches.push(currentBatch);
      currentBatch = [page];
    } else {
      currentBatch = candidate;
    }
  }
  if (currentBatch.length > 0) plannedBatches.push(currentBatch);

  const uploads: EncodedUpload[] = [];
  for (const batch of plannedBatches) {
    uploads.push(...(await encodeProductionOriginalBatchSafely(batch)));
  }
  return uploads.map((upload, index) => ({
    ...upload,
    fileName: `server-original-batch-${String(index + 1).padStart(4, '0')}.jpg`,
  }));
}

function canFitProductionOriginalBatch(pages: OriginalSourcePage[]) {
  const width = Math.max(...pages.map((page) => page.imageWidth));
  const height = pages.reduce((sum, page) => sum + page.imageHeight, 0);
  return (
    height <= HOSTED_OCR_MAX_BATCH_HEIGHT &&
    width * height <= HOSTED_OCR_MAX_BATCH_PIXELS
  );
}

async function encodeProductionOriginalBatchSafely(
  pages: OriginalSourcePage[]
): Promise<EncodedUpload[]> {
  const upload = await encodeProductionOriginalBatch(pages);
  if (
    upload.sizeBytes <= HOSTED_OCR_MAX_INLINE_IMAGE_BYTES ||
    pages.length === 1
  ) {
    return [upload];
  }

  const splitAt = Math.ceil(pages.length / 2);
  return [
    ...(await encodeProductionOriginalBatchSafely(pages.slice(0, splitAt))),
    ...(await encodeProductionOriginalBatchSafely(pages.slice(splitAt))),
  ];
}

async function encodeProductionOriginalBatch(
  pages: OriginalSourcePage[]
): Promise<EncodedUpload> {
  const sharp = await loadSharp();
  const width = Math.max(...pages.map((page) => page.imageWidth));
  const height = pages.reduce((sum, page) => sum + page.imageHeight, 0);
  const sourcePages: SourcePlacement[] = [];
  let offsetY = 0;
  for (const page of pages) {
    sourcePages.push({
      fileName: page.fileName,
      height: page.imageHeight,
      offsetX: Math.max(Math.floor((width - page.imageWidth) / 2), 0),
      offsetY,
      originalHeight: page.imageHeight,
      originalWidth: page.imageWidth,
      sha256: page.sha256,
      width: page.imageWidth,
    });
    offsetY += page.imageHeight;
  }

  const imageBytes = await sharp({
    create: {
      background: '#ffffff',
      channels: 3,
      height,
      width,
    },
  })
    .composite(
      pages.map((page, index) => ({
        input: Buffer.from(page.imageBytes),
        left: sourcePages[index]?.offsetX ?? 0,
        top: sourcePages[index]?.offsetY ?? 0,
      }))
    )
    .jpeg({ mozjpeg: true, quality: HOSTED_OCR_JPEG_QUALITY })
    .toBuffer();

  return {
    fileName: 'server-original-batch.jpg',
    height,
    imageBytes,
    mimeType: 'image/jpeg',
    relativePath: null,
    sha256: sha256(imageBytes),
    sizeBytes: imageBytes.byteLength,
    sourcePages,
    width,
  };
}

function fingerprintOriginalSources(pages: OriginalSourcePage[]) {
  const hash = createHash('sha256');
  hash.update(PRODUCTION_ORIGINAL_PIPELINE_VERSION);
  for (const page of pages) {
    hash.update(
      JSON.stringify({
        fileName: page.fileName,
        imageHeight: page.imageHeight,
        imageWidth: page.imageWidth,
        sha256: page.sha256,
      })
    );
  }
  return hash.digest('hex');
}

function fingerprintMatrixProfile(profile: MatrixProfile) {
  return sha256(
    Buffer.from(
      JSON.stringify({
        checkpointVersion: PROFILE_CHECKPOINT_VERSION,
        maxWidthPx: profile.maxWidthPx,
        profile: profile.profile,
        uploads: profile.uploads.map((upload) => ({
          height: upload.height,
          sha256: upload.sha256,
          sourcePages: upload.sourcePages,
          width: upload.width,
        })),
        webpQuality: profile.webpQuality,
      })
    )
  );
}

async function writeProfileCheckpointMetadata(input: {
  checkpointMetadataPath: string;
  profileFingerprint: string;
}) {
  await writeFile(
    input.checkpointMetadataPath,
    `${JSON.stringify(
      {
        checkpointVersion: PROFILE_CHECKPOINT_VERSION,
        profileFingerprint: input.profileFingerprint,
      },
      null,
      2
    )}\n`
  );
}

function sha256(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}

async function loadSharp() {
  return (await import('sharp')).default;
}

async function ocrProfile(input: {
  matrixDirectory: string;
  profile: MatrixProfile;
}) {
  const results: Array<{
    index: number;
    pages: RawOcrPage[];
  }> = [];

  for (let offset = 0; offset < input.profile.uploads.length; offset += 3) {
    const batch = input.profile.uploads.slice(offset, offset + 3);
    const batchResults = await Promise.all(
      batch.map(async (upload, batchIndex) => {
        if (!upload.relativePath || upload.sourcePages.length === 0) {
          throw new Error(
            `Profile ${input.profile.profile} unexpectedly used an original fallback.`
          );
        }
        const imagePath = path.join(
          input.matrixDirectory,
          input.profile.profile,
          upload.relativePath
        );
        const imageBytes = await readFile(imagePath);
        const ocrPage = await withRetry(() =>
          performGoogleCloudVisionOcr({
            imageBytes,
            imageHeight: upload.height ?? undefined,
            imageWidth: upload.width ?? undefined,
          })
        );

        return {
          index: offset + batchIndex,
          pages: mapBatchToOriginalPages(upload, ocrPage),
        };
      })
    );
    results.push(...batchResults);
    console.log(
      `profile=${input.profile.profile} ocr=${Math.min(offset + batch.length, input.profile.uploads.length)}/${input.profile.uploads.length}`
    );
  }

  return results
    .sort((left, right) => left.index - right.index)
    .flatMap((result) => result.pages);
}

async function withRetry<T>(operation: () => Promise<T>) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 1_000 * attempt));
      }
    }
  }
  throw lastError;
}

function mapBatchToOriginalPages(upload: Upload, ocrPage: OcrPage) {
  const pages = new Map<string, RawOcrPage>();
  for (const placement of upload.sourcePages) {
    pages.set(placement.fileName, {
      fileName: placement.fileName,
      ocrPage: {
        ...ocrPage,
        blocks: [],
        imgHeight: placement.originalHeight,
        imgWidth: placement.originalWidth,
      },
    });
  }

  for (const block of ocrPage.blocks) {
    const placement = findPlacement(upload.sourcePages, block);
    if (!placement) continue;
    const mapped = mapBlockToPlacement(block, placement);
    if (mapped) pages.get(placement.fileName)?.ocrPage.blocks.push(mapped);
  }

  return upload.sourcePages.map((placement) => {
    const page = pages.get(placement.fileName);
    if (!page) throw new Error(`Missing mapped page ${placement.fileName}`);
    page.ocrPage.blocks.sort(
      (left, right) => left.y - right.y || left.x - right.x
    );
    return page;
  });
}

function findPlacement(placements: SourcePlacement[], block: OcrBlock) {
  const centerY = block.y + block.height / 2;
  const containing = placements.find(
    (placement) =>
      centerY >= placement.offsetY &&
      centerY <= placement.offsetY + placement.height
  );
  if (containing) return containing;

  return placements
    .map((placement) => ({
      overlap: overlap(
        block.y,
        block.y + block.height,
        placement.offsetY,
        placement.offsetY + placement.height
      ),
      placement,
    }))
    .sort((left, right) => right.overlap - left.overlap)[0]?.placement;
}

function mapBlockToPlacement(
  block: OcrBlock,
  placement: SourcePlacement
): OcrBlock | null {
  const left = Math.max(block.x - placement.offsetX, 0);
  const top = Math.max(block.y - placement.offsetY, 0);
  const right = Math.min(
    block.x - placement.offsetX + block.width,
    placement.width
  );
  const bottom = Math.min(
    block.y - placement.offsetY + block.height,
    placement.height
  );
  if (right <= left || bottom <= top) return null;

  const scaleX = placement.originalWidth / placement.width;
  const scaleY = placement.originalHeight / placement.height;
  return {
    ...block,
    height: (bottom - top) * scaleY,
    symHeight: block.symHeight * scaleY,
    symWidth: block.symWidth * scaleX,
    width: (right - left) * scaleX,
    x: left * scaleX,
    y: top * scaleY,
  };
}

function analyzeProfile(input: {
  baselinePages: RawOcrPage[];
  candidatePages: RawOcrPage[];
  profile: MatrixProfile;
}) {
  const rawComparison = compareOcrPages({
    baselinePages: input.baselinePages,
    candidatePages: input.candidatePages,
    profileName: input.profile.profile,
  });
  const productionComparison = compareOcrPages({
    baselinePages: applyProductionOcrGrouping(input.baselinePages),
    candidatePages: applyProductionOcrGrouping(input.candidatePages),
    profileName: input.profile.profile,
  });

  return {
    androidPreparationDurationMs: input.profile.durationMs,
    maxWidthPx: input.profile.maxWidthPx,
    ocrRequestCount: input.profile.uploadCount,
    originalFallbackCount: input.profile.originalFallbackCount,
    originalTotalBytes: input.profile.originalTotalBytes,
    preparedTotalBytes: input.profile.preparedTotalBytes,
    productionComparison,
    profile: input.profile.profile,
    rawComparison,
    reductionPercent: input.profile.reductionPercent,
    webpQuality: input.profile.webpQuality,
  };
}

function compareOcrPages(input: {
  baselinePages: RawOcrPage[];
  candidatePages: RawOcrPage[];
  profileName: string;
}) {
  const candidateByFileName = new Map(
    input.candidatePages.map((page) => [page.fileName, page])
  );
  const lowRecallBlocks: Array<{
    bestMatchOrderedRecallPercent: number;
    bestMatchText: string;
    bestMatchUnorderedRecallPercent: number;
    fileName: string;
    height: number;
    kind: 'changed_or_missing' | 'reordered_or_split';
    text: string;
    width: number;
    x: number;
    y: number;
  }> = [];
  const pageComparisons: Array<{
    baselineCharacterCount: number;
    candidateCharacterCount: number;
    characterPrecisionPercent: number;
    characterRecallPercent: number;
    fileName: string;
    unorderedCharacterRecallPercent: number;
  }> = [];
  const centerDrifts: number[] = [];
  const ious: number[] = [];
  let baselineCharacterCount = 0;
  let candidateCharacterCount = 0;
  let commonCharacterCount = 0;
  let meaningfulBlockCount = 0;
  let outOfBoundsBlockCount = 0;

  for (const baselinePage of input.baselinePages) {
    const candidatePage = candidateByFileName.get(baselinePage.fileName);
    if (!candidatePage) {
      throw new Error(
        `Profile ${input.profileName} is missing page ${baselinePage.fileName}`
      );
    }
    if (
      candidatePage.ocrPage.imgWidth !== baselinePage.ocrPage.imgWidth ||
      candidatePage.ocrPage.imgHeight !== baselinePage.ocrPage.imgHeight
    ) {
      throw new Error(
        `Profile ${input.profileName} changed original dimensions for ${baselinePage.fileName}`
      );
    }

    const baselineText = normalizedPageText(baselinePage.ocrPage);
    const candidateText = normalizedPageText(candidatePage.ocrPage);
    const commonCharacters = longestCommonSubsequenceLength(
      baselineText,
      candidateText
    );
    baselineCharacterCount += baselineText.length;
    candidateCharacterCount += candidateText.length;
    commonCharacterCount += commonCharacters;
    pageComparisons.push({
      baselineCharacterCount: baselineText.length,
      candidateCharacterCount: candidateText.length,
      characterPrecisionPercent:
        candidateText.length === 0
          ? 0
          : round((commonCharacters / candidateText.length) * 100),
      characterRecallPercent:
        baselineText.length === 0
          ? 100
          : round((commonCharacters / baselineText.length) * 100),
      fileName: baselinePage.fileName,
      unorderedCharacterRecallPercent: round(
        unorderedCharacterRecall(baselineText, candidateText) * 100
      ),
    });

    for (const block of translatableBlocks(candidatePage.ocrPage)) {
      if (!isBlockInBounds(block, candidatePage.ocrPage)) {
        outOfBoundsBlockCount += 1;
      }
    }

    const candidateUnits = buildCandidateUnits(
      translatableBlocks(candidatePage.ocrPage)
    );
    for (const baselineBlock of translatableBlocks(baselinePage.ocrPage)) {
      const normalized = normalizeText(baselineBlock.text);
      if (normalized.length < 2) continue;
      meaningfulBlockCount += 1;
      const bestMatch = findBestMatch({
        baselineBlock,
        candidateUnits,
        pageHeight: baselinePage.ocrPage.imgHeight,
        pageWidth: baselinePage.ocrPage.imgWidth,
      });
      if (
        bestMatch.centerDriftPercent != null &&
        Math.max(bestMatch.recall, bestMatch.unorderedRecall) >= 0.8
      ) {
        centerDrifts.push(bestMatch.centerDriftPercent);
      }
      if (
        bestMatch.iou != null &&
        Math.max(bestMatch.recall, bestMatch.unorderedRecall) >= 0.8
      ) {
        ious.push(bestMatch.iou);
      }

      if (bestMatch.recall < 0.8) {
        lowRecallBlocks.push({
          bestMatchOrderedRecallPercent: round(bestMatch.recall * 100),
          bestMatchText: bestMatch.matchedText,
          bestMatchUnorderedRecallPercent: round(
            bestMatch.unorderedRecall * 100
          ),
          fileName: baselinePage.fileName,
          height: baselineBlock.height,
          kind:
            bestMatch.unorderedRecall >= 0.95
              ? 'reordered_or_split'
              : 'changed_or_missing',
          text: baselineBlock.text,
          width: baselineBlock.width,
          x: baselineBlock.x,
          y: baselineBlock.y,
        });
      }
    }
  }

  return {
    baselineBlockCount: input.baselinePages.reduce(
      (sum, page) => sum + translatableBlocks(page.ocrPage).length,
      0
    ),
    baselineCharacterCount,
    candidateBlockCount: input.candidatePages.reduce(
      (sum, page) => sum + translatableBlocks(page.ocrPage).length,
      0
    ),
    candidateCharacterCount,
    characterPrecisionPercent:
      candidateCharacterCount === 0
        ? 0
        : round((commonCharacterCount / candidateCharacterCount) * 100),
    characterRecallPercent:
      baselineCharacterCount === 0
        ? 100
        : round((commonCharacterCount / baselineCharacterCount) * 100),
    geometry: {
      matchedBlockCount: centerDrifts.length,
      medianCenterDriftPercent: percentile(centerDrifts, 50),
      medianIou: percentile(ious, 50),
      p95CenterDriftPercent: percentile(centerDrifts, 95),
    },
    lowRecallBlocks,
    lowRecallMeaningfulBlockCount: lowRecallBlocks.length,
    lowestRecallPages: [...pageComparisons]
      .sort(
        (left, right) =>
          left.characterRecallPercent - right.characterRecallPercent
      )
      .slice(0, 5),
    meaningfulBlockCount,
    outOfBoundsBlockCount,
    pageCount: input.candidatePages.length,
    readingOrderRegressions: pageComparisons.filter(
      (page) =>
        page.unorderedCharacterRecallPercent >= 99.5 &&
        page.characterRecallPercent < 98 &&
        page.unorderedCharacterRecallPercent - page.characterRecallPercent >= 2
    ),
  };
}

function applyProductionOcrGrouping(pages: RawOcrPage[]) {
  return coalesceOcrPageContinuations(
    pages.map((page) => ({
      ...page,
      ocrPage: coalesceOcrLineBlocks(page.ocrPage),
    }))
  );
}

function translatableBlocks(page: OcrPage) {
  return page.blocks.filter((block) => block.renderMode !== 'mask_only');
}

function buildCandidateUnits(blocks: OcrBlock[]) {
  const sorted = [...blocks].sort(
    (left, right) => left.y - right.y || left.x - right.x
  );
  const units: CandidateUnit[] = [];
  for (let index = 0; index < sorted.length; index += 1) {
    for (
      let length = 1;
      length <= 5 && index + length <= sorted.length;
      length += 1
    ) {
      const unitBlocks = sorted.slice(index, index + length);
      units.push({
        blocks: unitBlocks,
        normalizedText: unitBlocks
          .map((block) => normalizeText(block.text))
          .join(''),
      });
    }
  }
  return units.filter((unit) => unit.normalizedText.length > 0);
}

function findBestMatch(input: {
  baselineBlock: OcrBlock;
  candidateUnits: CandidateUnit[];
  pageHeight: number;
  pageWidth: number;
}): MatchResult {
  const baselineText = normalizeText(input.baselineBlock.text);
  let best: MatchResult = {
    centerDriftPercent: null,
    iou: null,
    matchedText: '',
    recall: 0,
    score: 0,
    unorderedRecall: 0,
  };

  for (const unit of input.candidateUnits) {
    const bounds = unionBounds(unit.blocks);
    const centerDrift = normalizedCenterDriftPercent(
      input.baselineBlock,
      bounds,
      input.pageWidth,
      input.pageHeight
    );
    const iou = intersectionOverUnion(input.baselineBlock, bounds);
    if (centerDrift > 5 && iou <= 0) continue;

    const common = longestCommonSubsequenceLength(
      baselineText,
      unit.normalizedText
    );
    const recall = common / baselineText.length;
    const unorderedRecall = unorderedCharacterRecall(
      baselineText,
      unit.normalizedText
    );
    const precision = common / unit.normalizedText.length;
    const proximity = Math.max(0, 1 - centerDrift / 20);
    const score =
      recall * 0.85 +
      unorderedRecall * 0.05 +
      precision * 0.02 +
      proximity * 0.08;
    if (
      recall > best.recall + 0.01 ||
      (Math.abs(recall - best.recall) <= 0.01 && score > best.score)
    ) {
      best = {
        centerDriftPercent: round(centerDrift),
        iou: round(iou),
        matchedText: unit.blocks.map((block) => block.text).join(' / '),
        recall,
        score,
        unorderedRecall,
      };
    }
  }
  return best;
}

function normalizedPageText(page: OcrPage) {
  return translatableBlocks(page)
    .sort((left, right) => left.y - right.y || left.x - right.x)
    .map((block) => normalizeText(block.text))
    .join('');
}

function normalizeText(text: string) {
  return text
    .normalize('NFKC')
    .toLocaleLowerCase('und')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function longestCommonSubsequenceLength(left: string, right: string) {
  if (!left || !right) return 0;
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;
  let previous = new Uint32Array(shorter.length + 1);
  let current = new Uint32Array(shorter.length + 1);

  for (let row = 1; row <= longer.length; row += 1) {
    for (let column = 1; column <= shorter.length; column += 1) {
      current[column] =
        longer[row - 1] === shorter[column - 1]
          ? (previous[column - 1] ?? 0) + 1
          : Math.max(previous[column] ?? 0, current[column - 1] ?? 0);
    }
    [previous, current] = [current, previous];
    current.fill(0);
  }
  return previous[shorter.length] ?? 0;
}

function unorderedCharacterRecall(baseline: string, candidate: string) {
  if (!baseline) return 1;
  const available = new Map<string, number>();
  for (const character of candidate) {
    available.set(character, (available.get(character) ?? 0) + 1);
  }
  let common = 0;
  for (const character of baseline) {
    const count = available.get(character) ?? 0;
    if (count <= 0) continue;
    common += 1;
    available.set(character, count - 1);
  }
  return common / baseline.length;
}

function isBlockInBounds(block: OcrBlock, page: OcrPage) {
  const values = [block.x, block.y, block.width, block.height];
  return (
    values.every(Number.isFinite) &&
    block.x >= 0 &&
    block.y >= 0 &&
    block.width > 0 &&
    block.height > 0 &&
    block.x + block.width <= page.imgWidth + 0.01 &&
    block.y + block.height <= page.imgHeight + 0.01
  );
}

function unionBounds(blocks: OcrBlock[]): OcrBlock {
  const left = Math.min(...blocks.map((block) => block.x));
  const top = Math.min(...blocks.map((block) => block.y));
  const right = Math.max(...blocks.map((block) => block.x + block.width));
  const bottom = Math.max(...blocks.map((block) => block.y + block.height));
  return {
    angle: 0,
    height: bottom - top,
    symHeight: 0,
    symWidth: 0,
    text: blocks.map((block) => block.text).join(' '),
    width: right - left,
    x: left,
    y: top,
  };
}

function normalizedCenterDriftPercent(
  left: OcrBlock,
  right: OcrBlock,
  pageWidth: number,
  pageHeight: number
) {
  const leftX = left.x + left.width / 2;
  const leftY = left.y + left.height / 2;
  const rightX = right.x + right.width / 2;
  const rightY = right.y + right.height / 2;
  const distance = Math.hypot(leftX - rightX, leftY - rightY);
  return (distance / Math.hypot(pageWidth, pageHeight)) * 100;
}

function intersectionOverUnion(left: OcrBlock, right: OcrBlock) {
  const intersectionWidth = overlap(
    left.x,
    left.x + left.width,
    right.x,
    right.x + right.width
  );
  const intersectionHeight = overlap(
    left.y,
    left.y + left.height,
    right.y,
    right.y + right.height
  );
  const intersection = intersectionWidth * intersectionHeight;
  const union =
    left.width * left.height + right.width * right.height - intersection;
  return union <= 0 ? 0 : intersection / union;
}

function overlap(
  leftStart: number,
  leftEnd: number,
  rightStart: number,
  rightEnd: number
) {
  return Math.max(
    0,
    Math.min(leftEnd, rightEnd) - Math.max(leftStart, rightStart)
  );
}

function percentile(values: number[], requestedPercentile: number) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((requestedPercentile / 100) * sorted.length) - 1)
  );
  return round(sorted[index] ?? 0);
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function parseOptions(arguments_: string[]) {
  const parsed = new Map<string, string>();
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (!argument?.startsWith('--')) continue;
    const key = argument.replace(/^--/, '');
    const value = arguments_[index + 1];
    if (key && value) {
      parsed.set(key, value);
      index += 1;
    }
  }
  return parsed;
}

function requireOption(options_: Map<string, string>, key: string) {
  const value = options_.get(key);
  if (!value) throw new Error(`Missing --${key}`);
  return path.resolve(value);
}
