import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { type NormalizedOcrPage } from '@/server/provider-gateway/schema';

import {
  coalesceOcrLineBlocks,
  coalesceOcrPageContinuations,
  shouldCoalesceOcrBlocks,
} from './ocr-block-grouping';
import { type MobileOcrRegionHints } from './schema';

describe('OCR block grouping', () => {
  it('merges close stacked lines from the same bubble', () => {
    const page = buildOcrPage([
      block({ text: 'WE NEED', x: 100, y: 100 }),
      block({ text: 'A BETTER PLAN', x: 104, y: 124 }),
    ]);

    const result = coalesceOcrLineBlocks(page);

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0]).toEqual(
      expect.objectContaining({
        height: 44,
        text: 'WE NEED A BETTER PLAN',
        width: 124,
        x: 100,
        y: 100,
      })
    );
  });

  it('merges overlapping OCR line fragments from one tall bubble', () => {
    const page = buildOcrPage([
      block({
        height: 43,
        symHeight: 17,
        text: 'WAS THAT LIGHTNING STRIKE IN',
        width: 191,
        x: 134,
        y: 0,
      }),
      block({
        height: 69,
        symHeight: 16.33,
        text: 'THE SOUTH OF THE CITY CAUSED BY YOU?',
        width: 189,
        x: 135,
        y: 27,
      }),
      block({
        height: 120,
        symHeight: 17,
        text: 'I AM VERY CURIOUS',
        width: 208,
        x: 263,
        y: 129,
      }),
    ]);

    const result = coalesceOcrLineBlocks(page);

    expect(result.blocks.map((item) => item.text)).toEqual([
      'WAS THAT LIGHTNING STRIKE IN THE SOUTH OF THE CITY CAUSED BY YOU?',
      'I AM VERY CURIOUS',
    ]);
  });

  it('does not merge close but separate vertical bubbles', () => {
    const first = block({ text: 'I FOUND HIM.', x: 100, y: 100 });
    const second = block({ text: 'WHERE?', x: 103, y: 132 });

    expect(shouldCoalesceOcrBlocks(first, second)).toBe(false);

    const result = coalesceOcrLineBlocks(buildOcrPage([first, second]));
    expect(result.blocks.map((item) => item.text)).toEqual([
      'I FOUND HIM.',
      'WHERE?',
    ]);
  });

  it('does not merge side-by-side speech bubbles on the same row', () => {
    const page = buildOcrPage([
      block({ text: 'LEFT BUBBLE', x: 80, y: 100 }),
      block({ text: 'RIGHT BUBBLE', x: 260, y: 100 }),
    ]);

    const result = coalesceOcrLineBlocks(page);

    expect(result.blocks).toHaveLength(2);
  });

  it('uses white bubble layout hints to merge OCR lines beyond distance thresholds', () => {
    const page = buildOcrPage([
      block({ text: 'FIRST LINE', x: 180, y: 120, width: 120 }),
      block({ text: 'SECOND LINE', x: 176, y: 170, width: 140 }),
    ]);

    expect(coalesceOcrLineBlocks(page).blocks).toHaveLength(2);

    const result = coalesceOcrLineBlocks(page, {
      mobileOcrRegionHints: buildHints([
        region({ height: 130, hintId: 'white-1', width: 240, x: 130, y: 90 }),
      ]),
    });

    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0]).toEqual(
      expect.objectContaining({
        text: 'FIRST LINE SECOND LINE',
        x: 176,
        y: 120,
      })
    );
  });

  it('does not threshold-merge OCR blocks assigned to different white bubbles', () => {
    const page = buildOcrPage([
      block({ text: 'YES.', x: 180, y: 100, width: 80 }),
      block({ text: 'NO.', x: 182, y: 126, width: 80 }),
    ]);

    expect(coalesceOcrLineBlocks(page).blocks).toHaveLength(1);

    const result = coalesceOcrLineBlocks(page, {
      mobileOcrRegionHints: buildHints([
        region({ height: 38, hintId: 'white-1', width: 160, x: 140, y: 88 }),
        region({ height: 38, hintId: 'white-2', width: 160, x: 140, y: 122 }),
      ]),
    });

    expect(result.blocks.map((item) => item.text)).toEqual(['YES.', 'NO.']);
  });

  it('ignores layout hints whose dimensions do not match the OCR page', () => {
    const page = buildOcrPage([
      block({ text: 'FIRST LINE', x: 180, y: 120, width: 120 }),
      block({ text: 'SECOND LINE', x: 176, y: 170, width: 140 }),
    ]);

    const result = coalesceOcrLineBlocks(page, {
      mobileOcrRegionHints: {
        ...buildHints([
          region({ height: 130, hintId: 'white-1', width: 240, x: 130, y: 90 }),
        ]),
        imageWidth: 900,
      },
    });

    expect(result.blocks).toHaveLength(2);
  });

  it('validates a generated page containing normal, loud, thought, narration, and dark regions', async () => {
    const image = await buildSyntheticBubbleFixtureImage();
    const metadata = await sharp(image).metadata();

    expect(metadata.width).toBe(700);
    expect(metadata.height).toBe(900);

    const page = buildOcrPage([
      block({ text: 'NORMAL TOP', x: 102, y: 94, width: 145 }),
      block({ text: 'NORMAL BOTTOM', x: 85, y: 126, width: 180 }),
      block({ text: 'LOUD TOP', x: 430, y: 98, width: 150 }),
      block({ text: 'LOUD BOTTOM', x: 417, y: 132, width: 175 }),
      block({ text: 'THOUGHT TOP', x: 104, y: 372, width: 145 }),
      block({ text: 'THOUGHT BOTTOM', x: 89, y: 404, width: 180 }),
      block({ text: 'NARRATION BOX', x: 402, y: 385, width: 195 }),
      block({ text: 'DARK ORIGINAL', x: 400, y: 685, width: 190 }),
    ]);

    const detectedHints = await detectSyntheticWhiteBubbleHintsFromPixels(
      image,
      page.blocks
    );

    expect(detectedHints.regions).toHaveLength(3);
    expect(detectedHints.regions.map((item) => item.hintId)).toEqual([
      'white-1',
      'white-2',
      'white-3',
    ]);

    const result = coalesceOcrLineBlocks(page, {
      mobileOcrRegionHints: detectedHints,
    });

    expect(result.blocks.map((item) => item.text)).toEqual([
      'NORMAL TOP NORMAL BOTTOM',
      'LOUD TOP LOUD BOTTOM',
      'THOUGHT TOP THOUGHT BOTTOM',
      'NARRATION BOX',
      'DARK ORIGINAL',
    ]);
  });

  it('merges interleaved same-bubble OCR lines from production page 013__002', () => {
    const page = buildOcrPage([
      block({
        height: 112,
        symHeight: 15.6,
        symWidth: 14.42166666666667,
        text: 'PUEDE  QUE AHORA  ENTIENDA  UN POCO  CÓMO  LOS  TRES GRANDES  SEÑORES VETAN  EL  FUTURO .',
        width: 249,
        x: 431,
        y: 154,
      }),
      block({
        height: 46,
        symHeight: 26.91666666666666,
        symWidth: 18.58333333333334,
        text: 'QUE  DE TE  DIGO',
        width: 168,
        x: 507,
        y: 309,
      }),
      block({
        height: 15,
        symHeight: 15,
        symWidth: 14.44444444444444,
        text: 'SIENTO  QUE',
        width: 124,
        x: 278,
        y: 342,
      }),
      block({
        height: 38,
        symHeight: 23.07142857142857,
        symWidth: 15.28571428571429,
        text: 'VERDAD  LO  VI !!!!',
        width: 162,
        x: 504,
        y: 346,
      }),
      block({
        height: 40,
        symHeight: 15.5,
        symWidth: 13.98128342245989,
        text: 'OBTUVE  UN  BENEFICIO INESPERADO .',
        width: 225,
        x: 232,
        y: 366,
      }),
      block({
        height: 114,
        symHeight: 15.66666666666667,
        symWidth: 13.3013468013468,
        text: '... SI  ES  ASI , TAL VEZ  HAYA  LINA ALTA  PROBABILIDAD  DE QUE  TAMBIEN  DESCUBRA POR  QUE  " REGRESE "',
        width: 246,
        x: 157,
        y: 1429,
      }),
      block({
        height: 77,
        symHeight: 18.33333333333333,
        symWidth: 15.11538461538461,
        text: 'OJALA  ALGUIEN SIMPLEMENTE  ME LO  EXPLICARA .',
        width: 199,
        x: 378,
        y: 1633,
      }),
      block({
        height: 140,
        symHeight: 131,
        symWidth: 110.5,
        text: 'TH',
        width: 139,
        x: 289,
        y: 1865,
      }),
    ]);

    const result = coalesceOcrLineBlocks(page);

    expect(result.blocks.map((item) => item.text)).toEqual([
      'PUEDE  QUE AHORA  ENTIENDA  UN POCO  CÓMO  LOS  TRES GRANDES  SEÑORES VETAN  EL  FUTURO .',
      'QUE  DE TE  DIGO VERDAD  LO  VI !!!!',
      'SIENTO  QUE OBTUVE  UN  BENEFICIO INESPERADO .',
      '... SI  ES  ASI , TAL VEZ  HAYA  LINA ALTA  PROBABILIDAD  DE QUE  TAMBIEN  DESCUBRA POR  QUE  " REGRESE "',
      'OJALA  ALGUIEN SIMPLEMENTE  ME LO  EXPLICARA .',
      'TH',
    ]);
  });

  it('merges a speech bubble split by an image boundary', () => {
    const result = coalesceOcrPageContinuations([
      buildLayoutPage('001.webp', [
        block({
          height: 55,
          text: '" RIGHT NOW, THE WORLD ALREADY',
          width: 230,
          x: 260,
          y: 835,
        }),
      ]),
      buildLayoutPage('002.webp', [
        block({
          height: 90,
          text: 'BELONGS TO THE ALLIANCE."',
          width: 250,
          x: 250,
          y: 18,
        }),
      ]),
    ]);

    expect(result[0]?.ocrPage.blocks).toEqual([
      expect.objectContaining({
        renderMode: 'mask_only',
        text: '" RIGHT NOW, THE WORLD ALREADY',
      }),
    ]);
    expect(result[1]?.ocrPage.blocks.map((item) => item.text)).toEqual([
      '" RIGHT NOW, THE WORLD ALREADY BELONGS TO THE ALLIANCE."',
    ]);
    expect(result[1]?.ocrPage.blocks[0]?.renderMode).toBeUndefined();
  });

  it('does not merge a completed bottom bubble with a new top bubble', () => {
    const result = coalesceOcrPageContinuations([
      buildLayoutPage('001.webp', [
        block({
          height: 50,
          text: '" THAT, I CANNOT DO."',
          width: 210,
          x: 250,
          y: 840,
        }),
      ]),
      buildLayoutPage('002.webp', [
        block({
          height: 70,
          text: '" ARE YOU SAYING YOU CANNOT WAIT?"',
          width: 250,
          x: 246,
          y: 20,
        }),
      ]),
    ]);

    expect(
      result.flatMap((page) => page.ocrPage.blocks.map((item) => item.text))
    ).toEqual(['" THAT, I CANNOT DO."', '" ARE YOU SAYING YOU CANNOT WAIT?"']);
  });
});

function buildLayoutPage(
  fileName: string,
  blocks: NormalizedOcrPage['blocks']
) {
  return {
    fileName,
    ocrPage: buildOcrPage(blocks),
  };
}

function buildOcrPage(blocks: NormalizedOcrPage['blocks']): NormalizedOcrPage {
  return {
    blocks,
    imgHeight: 900,
    imgWidth: 700,
    provider: 'google_cloud_vision',
    providerModel: 'TEXT_DETECTION',
    providerRequestId: 'test',
    sourceLanguage: 'en',
    usage: {
      inputTokens: null,
      latencyMs: 0,
      outputTokens: null,
      pageCount: 1,
      providerRequestId: 'test',
      requestCount: 1,
    },
  };
}

function block(
  overrides: Partial<NormalizedOcrPage['blocks'][number]>
): NormalizedOcrPage['blocks'][number] {
  return {
    angle: 0,
    height: 20,
    symHeight: 12,
    symWidth: 8,
    text: 'TEXT',
    width: 120,
    x: 100,
    y: 100,
    ...overrides,
  };
}

function buildHints(
  regions: MobileOcrRegionHints['regions']
): MobileOcrRegionHints {
  return {
    algorithm: 'unit-test-white-bubble-hints.v1',
    coordinateSpace: 'original_image_px',
    imageHeight: 900,
    imageWidth: 700,
    regions,
    schemaVersion: 'mobile_ocr_region_hints.v1',
    status: 'ok',
  };
}

function region(
  overrides: Partial<MobileOcrRegionHints['regions'][number]>
): MobileOcrRegionHints['regions'][number] {
  return {
    confidence: 0.86,
    height: 120,
    hintId: 'white-1',
    kind: 'white_bubble',
    sourceBlockCount: 2,
    width: 220,
    x: 80,
    y: 80,
    ...overrides,
  };
}

async function buildSyntheticBubbleFixtureImage() {
  const svg = `
    <svg width="700" height="900" xmlns="http://www.w3.org/2000/svg">
      <rect width="700" height="900" fill="#c8d7e8"/>
      <rect x="26" y="28" width="648" height="826" fill="#d8e4f3" opacity="0.85"/>

      <ellipse cx="175" cy="130" rx="130" ry="82" fill="#ffffff" stroke="#111111" stroke-width="4"/>
      <path d="M368 133 L397 55 L430 92 L470 48 L496 94 L554 62 L536 123 L646 124 L553 159 L582 216 L506 185 L462 225 L438 176 L370 194 Z" fill="#ffffff" stroke="#111111" stroke-width="4"/>
      <ellipse cx="180" cy="400" rx="135" ry="85" fill="#fbfbfb" stroke="#111111" stroke-width="4" stroke-dasharray="9 8"/>
      <circle cx="83" cy="510" r="14" fill="#fbfbfb" stroke="#111111" stroke-width="4"/>
      <circle cx="58" cy="543" r="9" fill="#fbfbfb" stroke="#111111" stroke-width="4"/>
      <rect x="370" y="330" width="260" height="150" rx="10" fill="#e9d7a7" stroke="#2b2418" stroke-width="4"/>
      <rect x="350" y="610" width="280" height="170" rx="8" fill="#1b1b1f" stroke="#000000" stroke-width="4"/>

      <text text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" fill="#111111">
        <tspan x="175" y="112" font-size="22">NORMAL TOP</tspan>
        <tspan x="175" y="143" font-size="22">NORMAL BOTTOM</tspan>
        <tspan x="500" y="116" font-size="22">LOUD TOP</tspan>
        <tspan x="500" y="148" font-size="22">LOUD BOTTOM</tspan>
        <tspan x="180" y="390" font-size="22">THOUGHT TOP</tspan>
        <tspan x="180" y="422" font-size="22">THOUGHT BOTTOM</tspan>
        <tspan x="500" y="410" font-size="22">NARRATION BOX</tspan>
      </text>
      <text x="490" y="705" text-anchor="middle" font-size="22" font-family="Arial, sans-serif" font-weight="700" fill="#ffffff">DARK ORIGINAL</text>
    </svg>
  `;

  return await sharp(Buffer.from(svg)).png().toBuffer();
}

async function detectSyntheticWhiteBubbleHintsFromPixels(
  image: Buffer,
  blocks: NormalizedOcrPage['blocks']
): Promise<MobileOcrRegionHints> {
  const rawImage: RawFixtureImage = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const regions: Array<MobileOcrRegionHints['regions'][number]> = [];

  for (const block of blocks) {
    const seed = findWhiteSeedNearBlock(rawImage, block);
    if (!seed) {
      continue;
    }

    const bounds = floodFillWhiteRegion(rawImage, seed);
    if (!bounds) {
      continue;
    }

    const candidate = {
      confidence: 0.86,
      height: bounds.bottom - bounds.top + 1,
      hintId: '',
      kind: 'white_bubble' as const,
      sourceBlockCount: 1,
      width: bounds.right - bounds.left + 1,
      x: bounds.left,
      y: bounds.top,
    };

    if (candidate.width < 24 || candidate.height < 24) {
      continue;
    }

    const existing = regions.findIndex(
      (item) => rectangleOverlapRatioByMinArea(item, candidate) >= 0.85
    );

    if (existing === -1) {
      regions.push(candidate);
    } else {
      const current = regions[existing]!;
      const left = Math.min(current.x, candidate.x);
      const top = Math.min(current.y, candidate.y);
      const right = Math.max(
        current.x + current.width,
        candidate.x + candidate.width
      );
      const bottom = Math.max(
        current.y + current.height,
        candidate.y + candidate.height
      );

      regions[existing] = {
        ...current,
        height: bottom - top,
        sourceBlockCount: (current.sourceBlockCount ?? 1) + 1,
        width: right - left,
        x: left,
        y: top,
      };
    }
  }

  return buildHints(
    regions
      .sort((left, right) => left.y - right.y || left.x - right.x)
      .map((item, index) => ({
        ...item,
        hintId: `white-${index + 1}`,
      }))
  );
}

type RawFixtureImage = {
  data: Buffer;
  info: {
    channels: number;
    height: number;
    width: number;
  };
};

function findWhiteSeedNearBlock(
  rawImage: RawFixtureImage,
  block: NormalizedOcrPage['blocks'][number]
) {
  const searchLeft = Math.max(0, Math.floor(block.x - 80));
  const searchTop = Math.max(0, Math.floor(block.y - 80));
  const searchRight = Math.min(
    rawImage.info.width - 1,
    Math.ceil(block.x + block.width + 80)
  );
  const searchBottom = Math.min(
    rawImage.info.height - 1,
    Math.ceil(block.y + block.height + 80)
  );
  const centerX = block.x + block.width / 2;
  const centerY = block.y + block.height / 2;
  let bestSeed: { distance: number; x: number; y: number } | null = null;

  for (let y = searchTop; y <= searchBottom; y += 1) {
    for (let x = searchLeft; x <= searchRight; x += 1) {
      if (!isSyntheticWhiteBubblePixel(rawImage, x, y)) {
        continue;
      }

      const distance = Math.abs(centerX - x) + Math.abs(centerY - y);
      if (!bestSeed || distance < bestSeed.distance) {
        bestSeed = { distance, x, y };
      }
    }
  }

  return bestSeed ? { x: bestSeed.x, y: bestSeed.y } : null;
}

function floodFillWhiteRegion(
  rawImage: RawFixtureImage,
  seed: { x: number; y: number }
) {
  const visited = new Uint8Array(rawImage.info.width * rawImage.info.height);
  const queue = [seed];
  let bottom = seed.y;
  let left = seed.x;
  let right = seed.x;
  let top = seed.y;
  let visitedCount = 0;

  while (queue.length > 0) {
    const point = queue.pop()!;
    if (
      point.x < 0 ||
      point.y < 0 ||
      point.x >= rawImage.info.width ||
      point.y >= rawImage.info.height
    ) {
      continue;
    }

    const offset = point.y * rawImage.info.width + point.x;
    if (visited[offset]) {
      continue;
    }

    visited[offset] = 1;

    if (!isSyntheticWhiteBubblePixel(rawImage, point.x, point.y)) {
      continue;
    }

    visitedCount += 1;
    left = Math.min(left, point.x);
    top = Math.min(top, point.y);
    right = Math.max(right, point.x);
    bottom = Math.max(bottom, point.y);

    queue.push(
      { x: point.x + 1, y: point.y },
      { x: point.x - 1, y: point.y },
      { x: point.x, y: point.y + 1 },
      { x: point.x, y: point.y - 1 }
    );
  }

  if (visitedCount < 128) {
    return null;
  }

  return { bottom, left, right, top };
}

function isSyntheticWhiteBubblePixel(
  rawImage: RawFixtureImage,
  x: number,
  y: number
) {
  const offset = (y * rawImage.info.width + x) * rawImage.info.channels;
  const red = rawImage.data[offset] ?? 0;
  const green = rawImage.data[offset + 1] ?? 0;
  const blue = rawImage.data[offset + 2] ?? 0;
  const luma = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

  return (
    luma >= 245 && Math.max(red, green, blue) - Math.min(red, green, blue) <= 18
  );
}

function rectangleOverlapRatioByMinArea(
  left: Pick<
    MobileOcrRegionHints['regions'][number],
    'height' | 'width' | 'x' | 'y'
  >,
  right: Pick<
    MobileOcrRegionHints['regions'][number],
    'height' | 'width' | 'x' | 'y'
  >
) {
  const overlapWidth =
    Math.min(left.x + left.width, right.x + right.width) -
    Math.max(left.x, right.x);
  const overlapHeight =
    Math.min(left.y + left.height, right.y + right.height) -
    Math.max(left.y, right.y);
  const overlapArea = Math.max(0, overlapWidth) * Math.max(0, overlapHeight);
  const minArea = Math.min(
    left.width * left.height,
    right.width * right.height
  );

  return overlapArea / Math.max(1, minArea);
}
