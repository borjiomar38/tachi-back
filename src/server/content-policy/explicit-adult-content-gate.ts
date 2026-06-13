const EXPLICIT_ADULT_BLOCK_REASON = 'official_explicit_adult_metadata';

const EXPLICIT_ADULT_FIELD_LABELS = new Set([
  'content rating',
  'contentrating',
  'rating',
]);

const EXPLICIT_ADULT_TOKEN_PATTERNS = [
  /\bhentai\b/i,
  /\bporn(?:ographic|ography)?\b/i,
  /\badult\s+explicit\b/i,
  /\bexplicit\s+adult\b/i,
  /\bexplicit\s+sex\b/i,
  /\bhardcore\b/i,
  /\b18\+\s+explicit\b/i,
  /\bexplicit\s+18\+\b/i,
  /\badult\s+sex(?:ual)?\b/i,
];

const EXPLICIT_CONTEXT_PATTERNS = [
  /\bexplicit\b/i,
  /\badult\b/i,
  /\b18\+\b/i,
  /\bporn(?:ographic|ography)?\b/i,
  /\bhentai\b/i,
  /\bhardcore\b/i,
];

const CONTEXTUAL_EXPLICIT_TERMS = new Set(['smut', 'erotica']);

export interface ExplicitAdultContentMetadata {
  categories?: string[] | null;
  contentRating?: string | null;
  genres?: string[] | null;
  rating?: string | null;
  tags?: string[] | null;
}

export interface ExplicitAdultContentGateInput {
  manga: ExplicitAdultContentMetadata;
}

export interface ExplicitAdultContentGateResult {
  reason: typeof EXPLICIT_ADULT_BLOCK_REASON;
  signal: {
    field: string;
    value: string;
  };
}

export interface ExplicitAdultContentBlockDetails {
  illustration: {
    prompt: string;
    speechBubble: 'empty';
    style: 'respectful-manhua-warning';
  };
  i18n: {
    bodyKey: string;
    fallbackBody: string;
    fallbackTitle: string;
    titleKey: string;
  };
  reason: typeof EXPLICIT_ADULT_BLOCK_REASON;
  signal: {
    field: string;
    value: string;
  };
}

export function getExplicitAdultContentGateResult(
  input: ExplicitAdultContentGateInput
): ExplicitAdultContentGateResult | null {
  const signals = buildMetadataSignals(input.manga);

  for (const signal of signals) {
    if (isExplicitAdultSignal(signal)) {
      return {
        reason: EXPLICIT_ADULT_BLOCK_REASON,
        signal,
      };
    }
  }

  return null;
}

export function isExplicitAdultContentBlocked(
  input: ExplicitAdultContentGateInput
) {
  return getExplicitAdultContentGateResult(input) !== null;
}

export function buildExplicitAdultContentBlockDetails(
  result: ExplicitAdultContentGateResult
): ExplicitAdultContentBlockDetails {
  return {
    illustration: {
      prompt:
        'Respectful non-sexual manhua-style warning illustration of an adult character in modest traditional Muslim clothing, shocked and concerned expression, empty speech bubble, no explicit imagery, no mockery of religion.',
      speechBubble: 'empty',
      style: 'respectful-manhua-warning',
    },
    i18n: {
      bodyKey: 'mobile:translationGate.explicitAdultContent.body',
      fallbackBody: 'This is haram',
      fallbackTitle: 'Warning, this is haram',
      titleKey: 'mobile:translationGate.explicitAdultContent.title',
    },
    reason: result.reason,
    signal: result.signal,
  };
}

function buildMetadataSignals(input: ExplicitAdultContentMetadata) {
  const listFields: Array<{
    field: keyof Pick<
      ExplicitAdultContentMetadata,
      'categories' | 'genres' | 'tags'
    >;
    values: string[] | null | undefined;
  }> = [
    { field: 'genres', values: input.genres },
    { field: 'tags', values: input.tags },
    { field: 'categories', values: input.categories },
  ];
  const textFields: Array<{
    field: keyof Pick<ExplicitAdultContentMetadata, 'contentRating' | 'rating'>;
    value: string | null | undefined;
  }> = [
    { field: 'rating', value: input.rating },
    { field: 'contentRating', value: input.contentRating },
  ];

  return [
    ...listFields.flatMap(({ field, values }) =>
      (values ?? []).map((value) => ({
        field,
        value,
      }))
    ),
    ...textFields.flatMap(({ field, value }) =>
      value
        ? [
            {
              field,
              value,
            },
          ]
        : []
    ),
  ];
}

function isExplicitAdultSignal(input: { field: string; value: string }) {
  const value = normalizeMetadataValue(input.value);

  if (!value) {
    return false;
  }

  if (EXPLICIT_ADULT_TOKEN_PATTERNS.some((pattern) => pattern.test(value))) {
    return true;
  }

  if (isExplicitRatingSignal(input.field, value)) {
    return true;
  }

  return isContextualExplicitSignal(value);
}

function isExplicitRatingSignal(field: string, value: string) {
  return (
    EXPLICIT_ADULT_FIELD_LABELS.has(normalizeMetadataValue(field)) &&
    /\b(?:18\+|adult|explicit)\b/i.test(value) &&
    !/\b(?:mature|suggestive|teen|all\s+ages|safe)\b/i.test(value)
  );
}

function isContextualExplicitSignal(value: string) {
  const words = value.split(/\s+/).filter(Boolean);

  if (!words.some((word) => CONTEXTUAL_EXPLICIT_TERMS.has(word))) {
    return false;
  }

  return EXPLICIT_CONTEXT_PATTERNS.some((pattern) => pattern.test(value));
}

function normalizeMetadataValue(input: string) {
  return input
    .normalize('NFKC')
    .replaceAll(/[_-]+/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
