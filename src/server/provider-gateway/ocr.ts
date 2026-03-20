import { envServer } from '@/env/server';
import { ProviderType } from '@/server/db/generated/client';
import {
  createInvalidProviderResponseError,
  createProviderConfigError,
} from '@/server/provider-gateway/errors';
import { zNormalizedOcrPage } from '@/server/provider-gateway/schema';
import {
  fetchTextWithTimeout,
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
        const parsedParagraph = parseParagraphToBlock(paragraph);
        if (parsedParagraph) {
          blocks.push(parsedParagraph);
        }
      }
    }
  }

  return blocks;
}

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

function parseParagraphToBlock(paragraph: unknown) {
  const paragraphRecord = asRecord(paragraph);
  if (!paragraphRecord || !Array.isArray(paragraphRecord.words)) {
    return null;
  }

  const accumulator = {
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    symbolCount: 0,
    symbolHeight: 0,
    symbolWidth: 0,
    text: '',
  };

  for (const word of paragraphRecord.words) {
    collectWordMetrics(accumulator, word);
  }

  const normalizedText = accumulator.text.trim();
  if (
    normalizedText.length <= 1 ||
    !Number.isFinite(accumulator.minX) ||
    !Number.isFinite(accumulator.minY) ||
    !Number.isFinite(accumulator.maxX) ||
    !Number.isFinite(accumulator.maxY)
  ) {
    return null;
  }

  return {
    angle: 0,
    height: Math.max(accumulator.maxY - accumulator.minY, 1),
    symHeight:
      accumulator.symbolCount > 0
        ? accumulator.symbolHeight / accumulator.symbolCount
        : 16,
    symWidth:
      accumulator.symbolCount > 0
        ? accumulator.symbolWidth / accumulator.symbolCount
        : 12,
    text: normalizedText,
    width: Math.max(accumulator.maxX - accumulator.minX, 1),
    x: accumulator.minX,
    y: accumulator.minY,
  };
}

function collectWordMetrics(
  accumulator: {
    maxX: number;
    maxY: number;
    minX: number;
    minY: number;
    symbolCount: number;
    symbolHeight: number;
    symbolWidth: number;
    text: string;
  },
  word: unknown
) {
  const wordRecord = asRecord(word);
  if (!wordRecord) {
    return;
  }

  if (accumulator.text) {
    accumulator.text += ' ';
  }

  const symbols = Array.isArray(wordRecord.symbols) ? wordRecord.symbols : [];
  for (const symbol of symbols) {
    appendSymbolMetrics(accumulator, symbol);
  }

  const wordBounds = getBoundsFromBoundingBox(wordRecord.boundingBox);
  if (wordBounds) {
    accumulator.minX = Math.min(accumulator.minX, wordBounds.x);
    accumulator.minY = Math.min(accumulator.minY, wordBounds.y);
    accumulator.maxX = Math.max(
      accumulator.maxX,
      wordBounds.x + wordBounds.width
    );
    accumulator.maxY = Math.max(
      accumulator.maxY,
      wordBounds.y + wordBounds.height
    );
  }
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
