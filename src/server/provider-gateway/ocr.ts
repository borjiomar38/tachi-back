import { envServer } from '@/env/server';
import { ProviderType } from '@/server/db/generated/client';
import {
  createInvalidProviderResponseError,
  createProviderConfigError,
} from '@/server/provider-gateway/errors';
import {
  type NormalizedOcrPage,
  OCR_SYMBOL_CATEGORIES,
  type OcrSymbolCategory,
  type OcrSymbolMetrics,
  zNormalizedOcrPage,
} from '@/server/provider-gateway/schema';
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
  const blocks: NormalizedOcrPage['blocks'] = [];

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
    if (!shouldKeepOcrText(text)) {
      return [];
    }

    const bounds = getCloudVisionBoundingGeometry(
      annotationRecord.boundingPoly
    );
    if (!bounds) {
      return [];
    }

    return [
      {
        angle: bounds.angle,
        hasLetterOrDigit: /[\p{L}\p{N}]/u.test(text),
        height: bounds.height,
        orientedHeight: bounds.orientedHeight,
        orientedWidth: bounds.orientedWidth,
        orientedX: bounds.orientedX,
        orientedY: bounds.orientedY,
        symHeight: bounds.orientedHeight,
        symWidth: Math.max(bounds.orientedWidth / Math.max(text.length, 1), 1),
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

type CloudVisionBoundingGeometry = {
  angle: number;
  height: number;
  orientedHeight: number;
  orientedWidth: number;
  orientedX: number;
  orientedY: number;
  width: number;
  x: number;
  y: number;
};

type CloudVisionPoint = {
  x: number;
  y: number;
};

function getCloudVisionBoundingGeometry(
  boundingBox: unknown
): CloudVisionBoundingGeometry | null {
  const boundingBoxRecord = asRecord(boundingBox);
  const vertices =
    boundingBoxRecord && Array.isArray(boundingBoxRecord.vertices)
      ? boundingBoxRecord.vertices
      : null;

  if (!vertices || vertices.length < 4) {
    return null;
  }

  const points = vertices.slice(0, 4).flatMap((vertex) => {
    const vertexRecord = asRecord(vertex);
    if (!vertexRecord) {
      return [];
    }

    // Vision omits coordinates whose value is zero.
    const x = vertexRecord.x ?? 0;
    const y = vertexRecord.y ?? 0;
    return typeof x === 'number' &&
      typeof y === 'number' &&
      Number.isFinite(x) &&
      Number.isFinite(y)
      ? [{ x, y }]
      : [];
  });
  const [topLeft, topRight, bottomRight, bottomLeft] = points;

  if (!topLeft || !topRight || !bottomRight || !bottomLeft) {
    return null;
  }

  const horizontalX = topRight.x - topLeft.x + bottomRight.x - bottomLeft.x;
  const horizontalY = topRight.y - topLeft.y + bottomRight.y - bottomLeft.y;
  const orientedWidth =
    (Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y) +
      Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y)) /
    2;
  const orientedHeight =
    (Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y) +
      Math.hypot(bottomRight.x - topRight.x, bottomRight.y - topRight.y)) /
    2;

  if (
    orientedWidth <= 0 ||
    orientedHeight <= 0 ||
    Math.hypot(horizontalX, horizontalY) <= 0
  ) {
    return null;
  }

  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));
  const centerX = points.reduce((sum, point) => sum + point.x, 0) / 4;
  const centerY = points.reduce((sum, point) => sum + point.y, 0) / 4;

  return {
    angle: (Math.atan2(horizontalY, horizontalX) * 180) / Math.PI,
    height: Math.max(maxY - minY, 1),
    orientedHeight,
    orientedWidth,
    orientedX: centerX - orientedWidth / 2,
    orientedY: centerY - orientedHeight / 2,
    width: Math.max(maxX - minX, 1),
    x: minX,
    y: minY,
  };
}

function mergeCloudVisionBoundingGeometries(
  geometries: readonly CloudVisionBoundingGeometry[]
): CloudVisionBoundingGeometry | null {
  if (geometries.length === 0) return null;

  const angle = getRepresentativeTextAngle(
    geometries.map((geometry) => geometry.angle)
  );
  const radians = (angle * Math.PI) / 180;
  const horizontalX = Math.cos(radians);
  const horizontalY = Math.sin(radians);
  const verticalX = -horizontalY;
  const verticalY = horizontalX;
  const points = geometries.flatMap(getCloudVisionGeometryCorners);
  const horizontalCoordinates = points.map(
    (point) => point.x * horizontalX + point.y * horizontalY
  );
  const verticalCoordinates = points.map(
    (point) => point.x * verticalX + point.y * verticalY
  );
  const minHorizontal = Math.min(...horizontalCoordinates);
  const maxHorizontal = Math.max(...horizontalCoordinates);
  const minVertical = Math.min(...verticalCoordinates);
  const maxVertical = Math.max(...verticalCoordinates);
  const orientedWidth = Math.max(maxHorizontal - minHorizontal, 1);
  const orientedHeight = Math.max(maxVertical - minVertical, 1);
  const centerHorizontal = (minHorizontal + maxHorizontal) / 2;
  const centerVertical = (minVertical + maxVertical) / 2;
  const centerX = centerHorizontal * horizontalX + centerVertical * verticalX;
  const centerY = centerHorizontal * horizontalY + centerVertical * verticalY;
  const minX = Math.min(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxX = Math.max(...points.map((point) => point.x));
  const maxY = Math.max(...points.map((point) => point.y));

  return {
    angle,
    height: Math.max(maxY - minY, 1),
    orientedHeight,
    orientedWidth,
    orientedX: centerX - orientedWidth / 2,
    orientedY: centerY - orientedHeight / 2,
    width: Math.max(maxX - minX, 1),
    x: minX,
    y: minY,
  };
}

function getCloudVisionGeometryCorners(
  geometry: CloudVisionBoundingGeometry
): CloudVisionPoint[] {
  const radians = (geometry.angle * Math.PI) / 180;
  const horizontalX = Math.cos(radians);
  const horizontalY = Math.sin(radians);
  const verticalX = -horizontalY;
  const verticalY = horizontalX;
  const centerX = geometry.orientedX + geometry.orientedWidth / 2;
  const centerY = geometry.orientedY + geometry.orientedHeight / 2;
  const halfWidth = geometry.orientedWidth / 2;
  const halfHeight = geometry.orientedHeight / 2;

  return [
    {
      x: centerX - horizontalX * halfWidth - verticalX * halfHeight,
      y: centerY - horizontalY * halfWidth - verticalY * halfHeight,
    },
    {
      x: centerX + horizontalX * halfWidth - verticalX * halfHeight,
      y: centerY + horizontalY * halfWidth - verticalY * halfHeight,
    },
    {
      x: centerX + horizontalX * halfWidth + verticalX * halfHeight,
      y: centerY + horizontalY * halfWidth + verticalY * halfHeight,
    },
    {
      x: centerX - horizontalX * halfWidth + verticalX * halfHeight,
      y: centerY - horizontalY * halfWidth + verticalY * halfHeight,
    },
  ];
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

type CloudVisionParagraphMetrics = {
  maxX: number;
  maxY: number;
  minX: number;
  minY: number;
  symbolHeights: number[];
  symbolCategoryHeights: Record<OcrSymbolCategory, number[]>;
  symbolWidths: number[];
  text: string;
  wordAngles: number[];
  wordGeometries: CloudVisionBoundingGeometry[];
  wordHeights: number[];
};

function parseParagraphToBlock(paragraph: unknown) {
  const paragraphRecord = asRecord(paragraph);
  if (!paragraphRecord || !Array.isArray(paragraphRecord.words)) {
    return null;
  }

  const accumulator: CloudVisionParagraphMetrics = {
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    symbolHeights: [],
    symbolCategoryHeights: {
      digit: [],
      lowercase: [],
      uncased: [],
      uppercase: [],
    },
    symbolWidths: [],
    text: '',
    wordAngles: [],
    wordGeometries: [],
    wordHeights: [],
  };

  for (const word of paragraphRecord.words) {
    collectWordMetrics(accumulator, word);
  }

  const normalizedText = accumulator.text.trim();
  if (
    !shouldKeepOcrText(normalizedText) ||
    !Number.isFinite(accumulator.minX) ||
    !Number.isFinite(accumulator.minY) ||
    !Number.isFinite(accumulator.maxX) ||
    !Number.isFinite(accumulator.maxY)
  ) {
    return null;
  }

  const orientedGeometry =
    getCloudVisionBoundingGeometry(paragraphRecord.boundingBox) ??
    mergeCloudVisionBoundingGeometries(accumulator.wordGeometries);

  return {
    angle:
      orientedGeometry?.angle ??
      getRepresentativeTextAngle(accumulator.wordAngles),
    hasLetterOrDigit: /[\p{L}\p{N}]/u.test(normalizedText),
    height: Math.max(accumulator.maxY - accumulator.minY, 1),
    ...(orientedGeometry
      ? {
          orientedHeight: orientedGeometry.orientedHeight,
          orientedWidth: orientedGeometry.orientedWidth,
          orientedX: orientedGeometry.orientedX,
          orientedY: orientedGeometry.orientedY,
        }
      : {}),
    symbolMetrics: getSymbolCategoryMetrics(accumulator.symbolCategoryHeights),
    symHeight:
      getMedian(accumulator.symbolHeights) ??
      getMedian(accumulator.wordHeights) ??
      16,
    symWidth:
      accumulator.symbolWidths.length > 0
        ? accumulator.symbolWidths.reduce((sum, width) => sum + width, 0) /
          accumulator.symbolWidths.length
        : 12,
    text: normalizedText,
    width: Math.max(accumulator.maxX - accumulator.minX, 1),
    x: accumulator.minX,
    y: accumulator.minY,
  };
}

function collectWordMetrics(
  accumulator: CloudVisionParagraphMetrics,
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

  const wordBounds = getCloudVisionBoundingGeometry(wordRecord.boundingBox);
  if (wordBounds) {
    accumulator.wordAngles.push(wordBounds.angle);
    accumulator.wordGeometries.push(wordBounds);
    accumulator.wordHeights.push(wordBounds.orientedHeight);
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
  accumulator: CloudVisionParagraphMetrics,
  symbol: unknown
) {
  const symbolRecord = asRecord(symbol);
  if (!symbolRecord) {
    return;
  }

  if (typeof symbolRecord.text === 'string') {
    accumulator.text += symbolRecord.text;
  }

  const symbolBounds = getCloudVisionBoundingGeometry(symbolRecord.boundingBox);
  if (symbolBounds) {
    accumulator.symbolWidths.push(symbolBounds.orientedWidth);
    const category = getSymbolCategory(symbolRecord.text);
    if (category) {
      accumulator.symbolHeights.push(symbolBounds.orientedHeight);
      accumulator.symbolCategoryHeights[category].push(
        symbolBounds.orientedHeight
      );
    }
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

function getSymbolCategory(text: unknown): OcrSymbolCategory | null {
  if (typeof text !== 'string') return null;
  if (/[\p{Lu}\p{Lt}]/u.test(text)) return 'uppercase';
  if (/\p{Ll}/u.test(text)) return 'lowercase';
  if (/\p{N}/u.test(text)) return 'digit';
  if (/\p{L}/u.test(text)) return 'uncased';
  return null;
}

function shouldKeepOcrText(text: string): boolean {
  // Preserve standalone punctuation without changing legacy single-letter filtering.
  return text.length > 1 || (text.length > 0 && /^\p{P}+$/u.test(text));
}

function getSymbolCategoryMetrics(
  categoryHeights: Record<OcrSymbolCategory, number[]>
): OcrSymbolMetrics | undefined {
  const metrics: OcrSymbolMetrics = {};
  for (const category of OCR_SYMBOL_CATEGORIES) {
    const heights = categoryHeights[category];
    const height = getMedian(heights);
    if (height != null) {
      metrics[category] = { count: heights.length, height };
    }
  }
  return Object.keys(metrics).length > 0 ? metrics : undefined;
}

function getMedian(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
}

function getRepresentativeTextAngle(angles: number[]): number {
  const reference = angles[0];
  if (reference == null) return 0;
  const normalizeAngle = (angle: number) =>
    ((((angle + 180) % 360) + 360) % 360) - 180;
  const offsets = angles.map((angle) => normalizeAngle(angle - reference));
  return normalizeAngle(reference + (getMedian(offsets) ?? 0));
}
