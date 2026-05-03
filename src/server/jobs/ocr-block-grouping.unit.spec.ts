import { describe, expect, it } from 'vitest';

import { type NormalizedOcrPage } from '@/server/provider-gateway/schema';

import {
  coalesceOcrLineBlocks,
  coalesceOcrPageContinuations,
  shouldCoalesceOcrBlocks,
} from './ocr-block-grouping';

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

    expect(result[0]?.ocrPage.blocks).toHaveLength(0);
    expect(result[1]?.ocrPage.blocks.map((item) => item.text)).toEqual([
      '" RIGHT NOW, THE WORLD ALREADY BELONGS TO THE ALLIANCE."',
    ]);
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
