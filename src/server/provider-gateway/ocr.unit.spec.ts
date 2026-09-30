import { describe, expect, it, vi } from 'vitest';

vi.mock('@/env/server', () => ({
  envServer: {
    GEMINI_API_KEY: 'gemini-key',
    GEMINI_TRANSLATION_MODEL: 'gemini-2.5-flash',
    GOOGLE_CLOUD_VISION_API_KEY: 'vision-key',
    PROVIDER_REQUEST_TIMEOUT_MS: 5000,
  },
}));

import { coalesceOcrLineBlocks } from '@/server/jobs/ocr-block-grouping';
import {
  performGeminiVisionOcr,
  performGoogleCloudVisionOcr,
} from '@/server/provider-gateway/ocr';

function visionBox(
  x: number,
  y: number,
  width: number,
  height: number,
  angle = 0
) {
  const radians = (angle * Math.PI) / 180;
  const horizontal = {
    x: Math.cos(radians) * width,
    y: Math.sin(radians) * width,
  };
  const vertical = {
    x: -Math.sin(radians) * height,
    y: Math.cos(radians) * height,
  };
  return {
    vertices: [
      { x, y },
      { x: x + horizontal.x, y: y + horizontal.y },
      { x: x + horizontal.x + vertical.x, y: y + horizontal.y + vertical.y },
      { x: x + vertical.x, y: y + vertical.y },
    ],
  };
}

function visionWord(
  text: string,
  x: number,
  y: number,
  height: number,
  angle = 0
) {
  return {
    boundingBox: visionBox(x, y, text.length * 12, height, angle),
    symbols: [...text].map((letter, index) => ({
      boundingBox: visionBox(
        x + Math.cos((angle * Math.PI) / 180) * index * 12,
        y + Math.sin((angle * Math.PI) / 180) * index * 12,
        10,
        height,
        angle
      ),
      text: letter,
    })),
  };
}

async function parseVisionParagraphs(
  paragraphs: Array<{ words: ReturnType<typeof visionWord>[] }>
) {
  return await performGoogleCloudVisionOcr(
    { imageBytes: Uint8Array.from([1, 2, 3]) },
    {
      fetchFn: vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify(
            {
              responses: [
                {
                  fullTextAnnotation: {
                    pages: [
                      {
                        width: 900,
                        height: 1600,
                        blocks: [{ blockType: 'TEXT', paragraphs }],
                      },
                    ],
                  },
                  textAnnotations: [{ locale: 'en' }],
                },
              ],
            },
            (key, value) =>
              (key === 'x' || key === 'y') && value === 0 ? undefined : value
          ),
          { status: 200 }
        )
      ),
    }
  );
}

describe('provider gateway OCR', () => {
  it('normalizes Google Cloud Vision paragraph geometry into hosted OCR blocks', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          responses: [
            {
              fullTextAnnotation: {
                pages: [
                  {
                    blocks: [
                      {
                        blockType: 'TEXT',
                        paragraphs: [
                          {
                            words: [
                              {
                                boundingBox: {
                                  vertices: [
                                    { x: 10, y: 20 },
                                    { x: 70, y: 20 },
                                    { x: 70, y: 60 },
                                    { x: 10, y: 60 },
                                  ],
                                },
                                symbols: [
                                  {
                                    boundingBox: {
                                      vertices: [
                                        { x: 10, y: 20 },
                                        { x: 35, y: 20 },
                                        { x: 35, y: 60 },
                                        { x: 10, y: 60 },
                                      ],
                                    },
                                    text: '안',
                                  },
                                  {
                                    boundingBox: {
                                      vertices: [
                                        { x: 36, y: 20 },
                                        { x: 60, y: 20 },
                                        { x: 60, y: 60 },
                                        { x: 36, y: 60 },
                                      ],
                                    },
                                    text: '녕',
                                  },
                                ],
                              },
                            ],
                          },
                        ],
                      },
                    ],
                    height: 1800,
                    width: 1200,
                  },
                ],
              },
              textAnnotations: [{ locale: 'ko' }],
            },
          ],
        }),
        {
          headers: {
            'x-guploader-uploadid': 'vision-request-123',
          },
          status: 200,
        }
      )
    );

    const result = await performGoogleCloudVisionOcr(
      {
        imageBytes: Uint8Array.from([1, 2, 3]),
      },
      {
        fetchFn,
      }
    );

    expect(fetchFn).toHaveBeenCalledOnce();
    expect(result.provider).toBe('google_cloud_vision');
    expect(result.sourceLanguage).toBe('ko');
    expect(result.imgWidth).toBe(1200);
    expect(result.imgHeight).toBe(1800);
    expect(result.blocks).toEqual([
      expect.objectContaining({
        height: 40,
        orientedHeight: 40,
        orientedWidth: 60,
        orientedX: 10,
        orientedY: 20,
        text: '안녕',
        width: 60,
        x: 10,
        y: 20,
      }),
    ]);
    expect(result.usage.providerRequestId).toBe('vision-request-123');
  });

  it('normalizes Gemini multimodal OCR output into hosted OCR blocks', async () => {
    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      blocks: [
                        {
                          height: 120,
                          text: 'Hello there',
                          width: 320,
                          x: 24,
                          y: 80,
                        },
                      ],
                      sourceLanguage: 'en',
                    }),
                  },
                ],
              },
              finishReason: 'STOP',
            },
          ],
          responseId: 'gemini-ocr-request-123',
          usageMetadata: {
            candidatesTokenCount: 31,
            promptTokenCount: 117,
          },
        }),
        {
          status: 200,
        }
      )
    );

    const pngBytes = Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x04, 0xb0, 0x00, 0x00, 0x06, 0x40,
    ]);

    const result = await performGeminiVisionOcr(
      {
        imageBytes: pngBytes,
      },
      {
        fetchFn,
      }
    );

    expect(fetchFn).toHaveBeenCalledOnce();
    expect(result.provider).toBe('gemini');
    expect(result.sourceLanguage).toBe('en');
    expect(result.imgWidth).toBe(1200);
    expect(result.imgHeight).toBe(1600);
    expect(result.blocks).toEqual([
      expect.objectContaining({
        height: 120,
        text: 'Hello there',
        width: 320,
        x: 24,
        y: 80,
      }),
    ]);
    expect(result.usage.providerRequestId).toBe('gemini-ocr-request-123');
    expect(result.usage.inputTokens).toBe(117);
    expect(result.usage.outputTokens).toBe(31);
  });

  it('measures letters independently of line count, punctuation, and oversized initials', async () => {
    const words = [
      visionWord('A', 10, 20, 90),
      visionWord('BCD', 30, 20, 34),
      visionWord('EFG', 10, 120, 34),
      visionWord('...', 50, 140, 4),
    ];
    const result = await parseVisionParagraphs([{ words }]);

    expect(result.blocks[0]).toMatchObject({ symHeight: 34, height: 134 });
    expect(result.blocks[0]?.text).toContain('...');
  });

  it('retains separate median heights and counts for comparable character categories', async () => {
    const result = await parseVisionParagraphs([
      {
        words: [
          visionWord('HI', 10, 20, 40),
          visionWord('hi', 40, 20, 20),
          visionWord('12', 70, 20, 32),
          visionWord('你好', 100, 20, 42),
          visionWord('...', 130, 50, 4),
        ],
      },
    ]);

    expect(result.blocks[0]).toMatchObject({
      hasLetterOrDigit: true,
      symbolMetrics: {
        digit: { count: 2, height: 32 },
        lowercase: { count: 2, height: 20 },
        uncased: { count: 2, height: 42 },
        uppercase: { count: 2, height: 40 },
      },
    });
  });

  it('does not mistake different case proportions for a different font size', async () => {
    const result = await parseVisionParagraphs([
      {
        words: [
          visionWord('HI', 100, 100, 40),
          visionWord('there', 130, 115, 20),
        ],
      },
      {
        words: [
          visionWord('THEN', 100, 150, 40),
          visionWord('hi', 152, 165, 20),
        ],
      },
    ]);

    expect(result.blocks.map((block) => block.symHeight)).toEqual([20, 40]);
    expect(coalesceOcrLineBlocks(result).blocks).toHaveLength(1);
  });

  it('does not use uppercase-to-lowercase height as a size veto', async () => {
    const result = await parseVisionParagraphs([
      { words: [visionWord('HI', 100, 100, 34)] },
      { words: [visionWord('there', 100, 140, 20)] },
    ]);

    expect(coalesceOcrLineBlocks(result).blocks).toHaveLength(1);
  });

  it('retains standalone punctuation without claiming a measured letter size', async () => {
    const result = await parseVisionParagraphs([
      { words: [visionWord('?', 100, 100, 4)] },
      { words: [visionWord('!', 150, 100, 4)] },
      { words: [visionWord('…', 200, 100, 4)] },
    ]);

    expect(result.blocks.map((block) => block.text)).toEqual(['?', '!', '…']);
    for (const block of result.blocks) {
      expect(block.hasLetterOrDigit).toBe(false);
      expect(block.symbolMetrics).toBeUndefined();
    }
  });

  it('attaches nearby baseline punctuation instead of comparing dot and letter heights', async () => {
    const result = await parseVisionParagraphs([
      { words: [visionWord('hi', 100, 100, 34)] },
      { words: [visionWord('...', 130, 130, 4)] },
    ]);

    const grouped = coalesceOcrLineBlocks(result);
    expect(grouped.blocks).toHaveLength(1);
    expect(grouped.blocks[0]?.text).toContain('hi');
    expect(grouped.blocks[0]?.text).toContain('...');
  });

  it('uses oriented letter height rather than rotated axis-aligned bounds', async () => {
    const result = await parseVisionParagraphs([
      { words: [visionWord('HELLO', 100, 100, 34, 30)] },
    ]);

    expect(result.blocks[0]?.angle).toBeCloseTo(30);
    expect(result.blocks[0]?.symHeight).toBeCloseTo(34);
    expect(result.blocks[0]?.height).toBeGreaterThan(34);
    expect(result.blocks[0]?.orientedHeight).toBeCloseTo(34);
    expect(result.blocks[0]?.orientedWidth).toBeCloseTo(60);
    expect(result.blocks[0]?.orientedX).toBeTypeOf('number');
    expect(result.blocks[0]?.orientedY).toBeTypeOf('number');
  });

  it('preserves counter-clockwise word orientation when paragraph geometry is absent', async () => {
    const result = await parseVisionParagraphs([
      { words: [visionWord('HELLO', 100, 100, 34, -15)] },
    ]);
    expect(result.blocks[0]?.angle).toBeCloseTo(-15);
    expect(result.blocks[0]?.symHeight).toBeCloseTo(34);
    expect(result.blocks[0]?.orientedHeight).toBeCloseTo(34);
    expect(result.blocks[0]?.orientedWidth).toBeCloseTo(60);
  });

  it('keeps Vision blocks with different angles separate through grouping', async () => {
    const result = await parseVisionParagraphs([
      { words: [visionWord('FIRST', 100, 100, 34)] },
      { words: [visionWord('SECOND', 100, 140, 34, 20)] },
    ]);
    expect(coalesceOcrLineBlocks(result).blocks).toHaveLength(2);
  });

  it('keeps differently sized Vision text separate through grouping', async () => {
    const result = await parseVisionParagraphs([
      { words: [visionWord('FIRST', 100, 100, 34)] },
      { words: [visionWord('HUFF', 100, 140, 100)] },
    ]);
    expect(coalesceOcrLineBlocks(result).blocks).toHaveLength(2);
  });

  it('uses word height rather than height divided by character count in the fallback response', async () => {
    const result = await performGoogleCloudVisionOcr(
      {
        imageBytes: Uint8Array.from([1, 2, 3]),
        imageWidth: 900,
        imageHeight: 1600,
      },
      {
        fetchFn: vi.fn().mockResolvedValue(
          new Response(
            JSON.stringify({
              responses: [
                {
                  textAnnotations: [
                    { locale: 'en', description: 'HELLO' },
                    {
                      description: 'HELLO',
                      boundingPoly: visionBox(100, 100, 60, 34, -15),
                    },
                  ],
                },
              ],
            }),
            { status: 200 }
          )
        ),
      }
    );
    expect(result.blocks[0]?.angle).toBeCloseTo(-15);
    expect(result.blocks[0]?.symHeight).toBeCloseTo(34);
  });

  it('accepts zero coordinates omitted by Vision and ignores degenerate symbol boxes', async () => {
    const word = visionWord('AB', 0, 0, 34);
    word.boundingBox = {
      vertices: [
        { x: 0, y: 0 },
        { x: 24, y: 0 },
        { x: 24, y: 34 },
        { x: 0, y: 34 },
      ],
    };
    word.symbols[0]!.boundingBox = visionBox(0, 0, 0, 0);
    const result = await parseVisionParagraphs([{ words: [word] }]);
    expect(result.blocks[0]).toMatchObject({ symHeight: 34, x: 0, y: 0 });
  });
});
