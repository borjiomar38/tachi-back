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
