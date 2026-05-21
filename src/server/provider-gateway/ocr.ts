import { envServer } from '@/env/server';
import { ProviderType } from '@/server/db/generated/client';
import {
  createInvalidProviderResponseError,
  createProviderConfigError,
} from '@/server/provider-gateway/errors';
import { zNormalizedOcrPage } from '@/server/provider-gateway/schema';
import {
  fetchTextWithTimeout,
  parseJsonObjectText,
  parseJsonResponse,
} from '@/server/provider-gateway/utils';

export async function performGoogleCloudVisionOcr(
  input: {
    imageBytes: Uint8Array;
    imageHeight?: number;
    imageWidth?: number;
  },
  deps: {
    apiKey?: string;
    fetchFn?: typeof fetch;
    timeoutMs?: number;
  } = {}
) {
  const apiKey = deps.apiKey ?? envServer.GOOGLE_CLOUD_VISION_API_KEY;

  if (!apiKey) {
    throw createProviderConfigError(
      ProviderType.google_cloud_vision,
      'GOOGLE_CLOUD_VISION_API_KEY is not configured.'
    );
  }

  const requestBody = JSON.stringify({
    requests: [
      {
        features: [{ type: 'TEXT_DETECTION' }],
        image: {
          content: Buffer.from(input.imageBytes).toString('base64'),
        },
      },
    ],
  });

  const response = await fetchTextWithTimeout({
    body: requestBody,
    fetchFn: deps.fetchFn,
    headers: {
      'Content-Type': 'application/json',
    },
    provider: ProviderType.google_cloud_vision,
    timeoutMs: deps.timeoutMs ?? envServer.PROVIDER_REQUEST_TIMEOUT_MS,
    url: `https://vision.googleapis.com/v1/images:annotate?key=${encodeURIComponent(
      apiKey
    )}`,
  });

  const json = parseJsonResponse<Record<string, unknown>>(
    ProviderType.google_cloud_vision,
    response.text,
    'Google Cloud Vision returned malformed JSON'
  );

  const responses = Array.isArray(json.responses) ? json.responses : [];
  const firstResponse = responses[0];

  if (!firstResponse || typeof firstResponse !== 'object') {
    throw createInvalidProviderResponseError(
      ProviderType.google_cloud_vision,
      'Google Cloud Vision did not return a valid annotation response.'
    );
  }

  const responseError = getNestedObject(firstResponse, 'error');
  if (responseError && typeof responseError.message === 'string') {
    throw createInvalidProviderResponseError(
      ProviderType.google_cloud_vision,
      responseError.message
    );
  }

  const fullTextAnnotation = getNestedObject(
    firstResponse,
    'fullTextAnnotation'
  );
  const textAnnotations = Array.isArray(firstResponse.textAnnotations)
    ? firstResponse.textAnnotations
    : [];

  const blocks = fullTextAnnotation
    ? parseFullTextAnnotation(fullTextAnnotation)
    : parseTextAnnotations(textAnnotations);

  const pageDimensions =
    getPageDimensionsFromFullText(fullTextAnnotation) ??
    deriveImageDimensions(blocks, input.imageWidth, input.imageHeight);

  return zNormalizedOcrPage.parse({
    blocks,
    imgHeight: pageDimensions.height,
    imgWidth: pageDimensions.width,
    provider: ProviderType.google_cloud_vision,
    providerModel: 'TEXT_DETECTION',
    providerRequestId:
      response.headers.get('x-request-id') ??
      response.headers.get('x-guploader-uploadid'),
    sourceLanguage:
      (textAnnotations[0] &&
        typeof textAnnotations[0] === 'object' &&
        typeof textAnnotations[0].locale === 'string' &&
        textAnnotations[0].locale.trim()) ||
      'auto',
    usage: {
      inputTokens: null,
      latencyMs: response.latencyMs,
      outputTokens: null,
      pageCount: 1,
      providerRequestId:
        response.headers.get('x-request-id') ??
        response.headers.get('x-guploader-uploadid'),
      requestCount: 1,
    },
  });
}

export async function performGeminiVisionOcr(
  input: {
    imageBytes: Uint8Array;
    imageHeight?: number;
    imageWidth?: number;
  },
  deps: {
    apiKey?: string;
    fetchFn?: typeof fetch;
    modelName?: string;
    timeoutMs?: number;
  } = {}
) {
  const apiKey = deps.apiKey ?? envServer.GEMINI_API_KEY;

  if (!apiKey) {
    throw createProviderConfigError(
      ProviderType.gemini,
      'GEMINI_API_KEY is not configured.'
    );
  }

  const modelName = deps.modelName ?? envServer.GEMINI_TRANSLATION_MODEL;
  const imageDimensions = getImageDimensions(
    input.imageBytes,
    input.imageWidth,
    input.imageHeight
  );
  const prompt = buildGeminiOcrPrompt(imageDimensions);
  const response = await fetchTextWithTimeout({
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: Buffer.from(input.imageBytes).toString('base64'),
                mimeType: detectImageMimeType(input.imageBytes),
              },
            },
          ],
          role: 'user',
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
    fetchFn: deps.fetchFn,
    headers: {
      'Content-Type': 'application/json',
    },
    provider: ProviderType.gemini,
    timeoutMs: deps.timeoutMs ?? envServer.PROVIDER_REQUEST_TIMEOUT_MS,
    url: `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      modelName
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
  });

  const json = parseJsonResponse<Record<string, unknown>>(
    ProviderType.gemini,
    response.text,
    'Gemini returned malformed JSON'
  );
  const candidates = Array.isArray(json.candidates) ? json.candidates : [];
  const candidate = candidates[0];

  if (!candidate || typeof candidate !== 'object') {
    throw createInvalidProviderResponseError(
      ProviderType.gemini,
      'Gemini did not return a usable OCR candidate.'
    );
  }

  const parts =
    candidate.content &&
    typeof candidate.content === 'object' &&
    Array.isArray(candidate.content.parts)
      ? candidate.content.parts
      : [];
  const text = parts
    .map((part: unknown) => {
      const record =
        part && typeof part === 'object' ? (part as { text?: unknown }) : null;

      return record && typeof record.text === 'string' ? record.text : '';
    })
    .join('')
    .trim();

  const payload = parseJsonObjectText(
    ProviderType.gemini,
    text,
    'Gemini OCR did not return valid JSON output'
  );

  return zNormalizedOcrPage.parse({
    blocks: normalizeGeminiOcrBlocks(payload.blocks, imageDimensions),
    imgHeight: imageDimensions.height,
    imgWidth: imageDimensions.width,
    provider: ProviderType.gemini,
    providerModel: modelName,
    providerRequestId:
      (typeof json.responseId === 'string' ? json.responseId : null) ??
      response.headers.get('x-request-id'),
    sourceLanguage:
      typeof payload.sourceLanguage === 'string' &&
      payload.sourceLanguage.trim()
        ? payload.sourceLanguage.trim()
        : 'auto',
    usage: {
      inputTokens: getGeminiUsageNumber(json.usageMetadata, 'promptTokenCount'),
      latencyMs: response.latencyMs,
      outputTokens: getGeminiUsageNumber(
        json.usageMetadata,
        'candidatesTokenCount'
      ),
      pageCount: 1,
      providerRequestId:
        (typeof json.responseId === 'string' ? json.responseId : null) ??
        response.headers.get('x-request-id'),
      requestCount: 1,
    },
  });
}

function parseFullTextAnnotation(fullTextAnnotation: Record<string, unknown>) {
  const pages = Array.isArray(fullTextAnnotation.pages)
    ? fullTextAnnotation.pages
    : [];
  const blocks: Array<{
    angle: number;
    height: number;
    symHeight: number;
    symWidth: number;
    text: string;
    width: number;
    x: number;
    y: number;
  }> = [];

  for (const page of pages) {
    const pageRecord = asRecord(page);
    if (!pageRecord || !Array.isArray(pageRecord.blocks)) {
      continue;
    }

    for (const block of pageRecord.blocks) {
      const blockRecord = asRecord(block);
      if (
        !blockRecord ||
        (typeof blockRecord.blockType === 'string' &&
          blockRecord.blockType !== 'TEXT') ||
        !Array.isArray(blockRecord.paragraphs)
      ) {
        continue;
      }

      for (const paragraph of blockRecord.paragraphs) {
        blocks.push(...parseParagraphToBlocks(paragraph));
      }
    }
  }

  return blocks;
}

type ParsedOcrWord = {
  angle: number;
  height: number;
  order: number;
  symHeight: number;
  symWidth: number;
  text: string;
  width: number;
  x: number;
  y: number;
};

function parseTextAnnotations(textAnnotations: unknown[]) {
  return textAnnotations.slice(1).flatMap((annotation) => {
    const annotationRecord = asRecord(annotation);
    if (!annotationRecord) {
      return [];
    }

    const text =
      typeof annotationRecord.description === 'string'
        ? annotationRecord.description.trim()
        : '';
    if (text.length <= 1) {
      return [];
    }

    const bounds = getBoundsFromBoundingBox(annotationRecord.boundingPoly);
    if (!bounds) {
      return [];
    }

    return [
      {
        angle: 0,
        height: bounds.height,
        symHeight: Math.max(bounds.height / Math.max(text.length, 1), 1),
        symWidth: Math.max(bounds.width / Math.max(text.length, 1), 1),
        text,
        width: bounds.width,
        x: bounds.x,
        y: bounds.y,
      },
    ];
  });
}

function deriveImageDimensions(
  blocks: Array<{ height: number; width: number; x: number; y: number }>,
  inputWidth?: number,
  inputHeight?: number
) {
  if (inputWidth && inputHeight) {
    return { height: inputHeight, width: inputWidth };
  }

  const derivedWidth = Math.max(
    ...blocks.map((block) => Math.ceil(block.x + block.width)),
    inputWidth ?? 1
  );
  const derivedHeight = Math.max(
    ...blocks.map((block) => Math.ceil(block.y + block.height)),
    inputHeight ?? 1
  );

  return { height: derivedHeight, width: derivedWidth };
}

function getPageDimensionsFromFullText(
  fullTextAnnotation: Record<string, unknown> | null
) {
  if (!fullTextAnnotation || !Array.isArray(fullTextAnnotation.pages)) {
    return null;
  }

  const firstPage = asRecord(fullTextAnnotation.pages[0]);
  if (
    !firstPage ||
    typeof firstPage.width !== 'number' ||
    typeof firstPage.height !== 'number'
  ) {
    return null;
  }

  return {
    height: firstPage.height,
    width: firstPage.width,
  };
}

function normalizeGeminiOcrBlocks(
  rawBlocks: unknown,
  imageDimensions: {
    height: number;
    width: number;
  }
) {
  type GeminiOcrBlockDraft = {
    height: number | null;
    text: string;
    width: number | null;
    x: number | null;
    y: number | null;
  };

  const blocks = Array.isArray(rawBlocks) ? rawBlocks : [];
  const textBlocks = blocks.flatMap<GeminiOcrBlockDraft>((block) => {
    if (typeof block === 'string' && block.trim()) {
      return [
        {
          height: null,
          text: block.trim(),
          width: null,
          x: null,
          y: null,
        },
      ];
    }

    if (!block || typeof block !== 'object') {
      return [];
    }

    const record = block as {
      height?: unknown;
      text?: unknown;
      width?: unknown;
      x?: unknown;
      y?: unknown;
    };

    if (typeof record.text !== 'string' || !record.text.trim()) {
      return [];
    }

    return [
      {
        height:
          typeof record.height === 'number' && record.height > 0
            ? record.height
            : null,
        text: record.text.trim(),
        width:
          typeof record.width === 'number' && record.width > 0
            ? record.width
            : null,
        x: typeof record.x === 'number' ? record.x : null,
        y: typeof record.y === 'number' ? record.y : null,
      },
    ];
  });

  const synthesizedBlockHeight = Math.max(
    Math.round(imageDimensions.height / Math.max(textBlocks.length, 1) / 2),
    24
  );
  const synthesizedBlockWidth = Math.max(imageDimensions.width - 40, 24);

  return textBlocks.map((block, index) => {
    const fallbackY = 20 + index * (synthesizedBlockHeight + 12);

    return {
      angle: 0,
      height: block.height ?? synthesizedBlockHeight,
      symHeight: Math.max(
        Math.round((block.height ?? synthesizedBlockHeight) / 2),
        12
      ),
      symWidth: Math.max(
        Math.round(
          (block.width ?? synthesizedBlockWidth) /
            Math.max(block.text.length, 1)
        ),
        8
      ),
      text: block.text,
      width: block.width ?? synthesizedBlockWidth,
      x: block.x ?? 20,
      y: block.y ?? fallbackY,
    };
  });
}

function buildGeminiOcrPrompt(imageDimensions: {
  height: number;
  width: number;
}) {
  return [
    'You are OCR for manga/comic pages.',
    'Return strict JSON only with this shape:',
    '{"sourceLanguage":"<language-or-auto>","blocks":[{"text":"...","x":0,"y":0,"width":0,"height":0}]}',
    'Rules:',
    '- Do not translate any text.',
    '- Preserve reading order.',
    '- Keep one block per speech bubble or text group.',
    '- Coordinates are approximate pixels relative to the full image.',
    `- The image size is approximately ${imageDimensions.width}x${imageDimensions.height}.`,
    '- If coordinates are uncertain, estimate them.',
    '- If no text is readable, return {"sourceLanguage":"auto","blocks":[]}.',
  ].join('\n');
}

function detectImageMimeType(imageBytes: Uint8Array) {
  if (
    imageBytes[0] === 0x89 &&
    imageBytes[1] === 0x50 &&
    imageBytes[2] === 0x4e &&
    imageBytes[3] === 0x47
  ) {
    return 'image/png';
  }

  if (imageBytes[0] === 0xff && imageBytes[1] === 0xd8) {
    return 'image/jpeg';
  }

  return 'image/png';
}

function getImageDimensions(
  imageBytes: Uint8Array,
  inputWidth?: number,
  inputHeight?: number
) {
  if (inputWidth && inputHeight) {
    return { height: inputHeight, width: inputWidth };
  }

  const pngDimensions = getPngDimensions(imageBytes);
  if (pngDimensions) {
    return pngDimensions;
  }

  const jpegDimensions = getJpegDimensions(imageBytes);
  if (jpegDimensions) {
    return jpegDimensions;
  }

  return {
    height: inputHeight ?? 1600,
    width: inputWidth ?? 1200,
  };
}

function getPngDimensions(imageBytes: Uint8Array) {
  if (
    imageBytes.length < 24 ||
    imageBytes[0] !== 0x89 ||
    imageBytes[1] !== 0x50 ||
    imageBytes[2] !== 0x4e ||
    imageBytes[3] !== 0x47
  ) {
    return null;
  }

  return {
    height:
      ((imageBytes[20] ?? 0) << 24) |
      ((imageBytes[21] ?? 0) << 16) |
      ((imageBytes[22] ?? 0) << 8) |
      (imageBytes[23] ?? 0),
    width:
      ((imageBytes[16] ?? 0) << 24) |
      ((imageBytes[17] ?? 0) << 16) |
      ((imageBytes[18] ?? 0) << 8) |
      (imageBytes[19] ?? 0),
  };
}

function getJpegDimensions(imageBytes: Uint8Array) {
  if (
    imageBytes.length < 4 ||
    imageBytes[0] !== 0xff ||
    imageBytes[1] !== 0xd8
  ) {
    return null;
  }

  let offset = 2;

  while (offset + 9 < imageBytes.length) {
    if (imageBytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = imageBytes[offset + 1] ?? -1;
    const length =
      ((imageBytes[offset + 2] ?? 0) << 8) | (imageBytes[offset + 3] ?? 0);

    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      return {
        height:
          ((imageBytes[offset + 5] ?? 0) << 8) | (imageBytes[offset + 6] ?? 0),
        width:
          ((imageBytes[offset + 7] ?? 0) << 8) | (imageBytes[offset + 8] ?? 0),
      };
    }

    offset += 2 + length;
  }

  return null;
}

function getGeminiUsageNumber(
  usageMetadata: unknown,
  key: 'candidatesTokenCount' | 'promptTokenCount'
) {
  if (!usageMetadata || typeof usageMetadata !== 'object') {
    return null;
  }

  const value = (usageMetadata as Record<string, unknown>)[key];

  return typeof value === 'number' ? value : null;
}

function getBoundsFromBoundingBox(boundingBox: unknown) {
  const boundingBoxRecord = asRecord(boundingBox);
  const vertices =
    boundingBoxRecord && Array.isArray(boundingBoxRecord.vertices)
      ? boundingBoxRecord.vertices
      : null;

  if (!vertices || vertices.length < 4) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const vertex of vertices) {
    const vertexRecord = asRecord(vertex);
    if (!vertexRecord) {
      continue;
    }

    const x = typeof vertexRecord.x === 'number' ? vertexRecord.x : 0;
    const y = typeof vertexRecord.y === 'number' ? vertexRecord.y : 0;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
    return null;
  }

  return {
    height: Math.max(maxY - minY, 1),
    width: Math.max(maxX - minX, 1),
    x: minX,
    y: minY,
  };
}

function getNestedObject(
  value: unknown,
  ...path: string[]
): Record<string, unknown> | null {
  let cursor: unknown = value;

  for (const key of path) {
    const record = asRecord(cursor);
    if (!record || !(key in record)) {
      return null;
    }
    cursor = record[key];
  }

  return asRecord(cursor);
}

function asRecord(value: unknown) {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function parseParagraphToBlocks(paragraph: unknown) {
  const paragraphRecord = asRecord(paragraph);
  if (!paragraphRecord || !Array.isArray(paragraphRecord.words)) {
    return [];
  }

  const words = paragraphRecord.words.flatMap((word, order) => {
    const parsedWord = parseWordToBlock(word, order);
    return parsedWord ? [parsedWord] : [];
  });

  return splitParagraphWordsIntoVisualSegments(words).map(mergeWordBlocks);
}

function parseWordToBlock(word: unknown, order: number): ParsedOcrWord | null {
  const wordRecord = asRecord(word);
  if (!wordRecord) {
    return null;
  }

  const wordBounds = getBoundsFromBoundingBox(wordRecord.boundingBox);
  if (!wordBounds) {
    return null;
  }

  const accumulator = {
    symbolCount: 0,
    symbolHeight: 0,
    symbolWidth: 0,
    text: '',
  };
  const symbols = Array.isArray(wordRecord.symbols) ? wordRecord.symbols : [];
  for (const symbol of symbols) {
    appendSymbolMetrics(accumulator, symbol);
  }

  const text = accumulator.text.trim();
  if (text.length <= 1) {
    return null;
  }

  return {
    angle: 0,
    height: wordBounds.height,
    order,
    symHeight:
      accumulator.symbolCount > 0
        ? accumulator.symbolHeight / accumulator.symbolCount
        : wordBounds.height,
    symWidth:
      accumulator.symbolCount > 0
        ? accumulator.symbolWidth / accumulator.symbolCount
        : Math.max(wordBounds.width / text.length, 1),
    text,
    width: wordBounds.width,
    x: wordBounds.x,
    y: wordBounds.y,
  };
}

function splitParagraphWordsIntoVisualSegments(words: ParsedOcrWord[]) {
  if (words.length < 2) {
    return words.length === 0 ? [] : [words];
  }

  const lines: ParsedOcrWord[][] = [];
  for (const word of [...words].sort(
    (left, right) =>
      getOcrBlockCenterY(left) - getOcrBlockCenterY(right) || left.x - right.x
  )) {
    const line = lines.find((candidate) =>
      belongsToSameVisualLine(word, candidate)
    );

    if (line) {
      line.push(word);
    } else {
      lines.push([word]);
    }
  }

  return lines
    .sort(
      (left, right) =>
        getWordGroupBounds(left).top - getWordGroupBounds(right).top ||
        getWordGroupBounds(left).left - getWordGroupBounds(right).left
    )
    .flatMap(splitVisualLineByHorizontalGaps);
}

function belongsToSameVisualLine(word: ParsedOcrWord, line: ParsedOcrWord[]) {
  const bounds = getWordGroupBounds(line);
  const overlap =
    Math.min(word.y + word.height, bounds.bottom) -
    Math.max(word.y, bounds.top);
  const minHeight = Math.min(word.height, bounds.bottom - bounds.top);
  const overlapRatio = minHeight > 0 ? overlap / minHeight : 0;
  const averageHeight =
    (word.height +
      line.reduce((sum, item) => sum + item.height, 0) / line.length) /
    2;
  const centerDistance = Math.abs(
    getOcrBlockCenterY(word) - (bounds.top + bounds.bottom) / 2
  );

  return (
    overlapRatio >= 0.55 || centerDistance <= Math.max(8, averageHeight * 0.6)
  );
}

function splitVisualLineByHorizontalGaps(line: ParsedOcrWord[]) {
  const segments: ParsedOcrWord[][] = [];

  for (const word of [...line].sort((left, right) => left.x - right.x)) {
    const current = segments.at(-1);
    if (!current) {
      segments.push([word]);
      continue;
    }

    const currentRight = Math.max(
      ...current.map((item) => item.x + item.width)
    );
    const horizontalGap = word.x - currentRight;
    const averageSymbolWidth =
      [...current, word].reduce((sum, item) => sum + item.symWidth, 0) /
      (current.length + 1);
    const averageSymbolHeight =
      [...current, word].reduce((sum, item) => sum + item.symHeight, 0) /
      (current.length + 1);
    const maxInlineGap = Math.max(
      18,
      Math.min(42, averageSymbolWidth * 2.2, averageSymbolHeight * 1.4)
    );

    if (horizontalGap > maxInlineGap) {
      segments.push([word]);
    } else {
      current.push(word);
    }
  }

  return segments;
}

function mergeWordBlocks(words: ParsedOcrWord[]) {
  const left = Math.min(...words.map((word) => word.x));
  const top = Math.min(...words.map((word) => word.y));
  const right = Math.max(...words.map((word) => word.x + word.width));
  const bottom = Math.max(...words.map((word) => word.y + word.height));
  const orderedWords = [...words].sort((leftWord, rightWord) => {
    return leftWord.order - rightWord.order;
  });

  return {
    angle: 0,
    height: Math.max(bottom - top, 1),
    symHeight:
      words.reduce((sum, word) => sum + word.symHeight, 0) / words.length,
    symWidth:
      words.reduce((sum, word) => sum + word.symWidth, 0) / words.length,
    text: orderedWords.map((word) => word.text).join(' '),
    width: Math.max(right - left, 1),
    x: left,
    y: top,
  };
}

function getWordGroupBounds(words: ParsedOcrWord[]) {
  return {
    bottom: Math.max(...words.map((word) => word.y + word.height)),
    left: Math.min(...words.map((word) => word.x)),
    right: Math.max(...words.map((word) => word.x + word.width)),
    top: Math.min(...words.map((word) => word.y)),
  };
}

function getOcrBlockCenterY(block: { height: number; y: number }) {
  return block.y + block.height / 2;
}

function appendSymbolMetrics(
  accumulator: {
    symbolCount: number;
    symbolHeight: number;
    symbolWidth: number;
    text: string;
  },
  symbol: unknown
) {
  const symbolRecord = asRecord(symbol);
  if (!symbolRecord) {
    return;
  }

  if (typeof symbolRecord.text === 'string') {
    accumulator.text += symbolRecord.text;
  }

  const symbolBounds = getBoundsFromBoundingBox(symbolRecord.boundingBox);
  if (symbolBounds) {
    accumulator.symbolWidth += symbolBounds.width;
    accumulator.symbolHeight += symbolBounds.height;
    accumulator.symbolCount += 1;
  }

  const detectedBreak = getNestedObject(
    symbolRecord,
    'property',
    'detectedBreak'
  );
  if (
    detectedBreak &&
    typeof detectedBreak.type === 'string' &&
    (detectedBreak.type === 'SPACE' || detectedBreak.type === 'SURE_SPACE')
  ) {
    accumulator.text += ' ';
  }
}
