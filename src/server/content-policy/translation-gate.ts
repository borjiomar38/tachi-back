import { envServer } from '@/env/server';
import { db } from '@/server/db';

import {
  buildExplicitAdultContentBlockDetails,
  type ExplicitAdultContentBlockDetails,
  type ExplicitAdultContentGateInput,
  type ExplicitAdultContentGateResult,
  getExplicitAdultContentGateResult,
} from './explicit-adult-content-gate';
import {
  type MangaPornographyPolicyLogger,
  waitForMangaPornographyPolicyDecision,
} from './manga-pornography-policy';
import {
  type ContentPolicyMangaIdentity,
  getManualMangaBlock,
} from './manual-manga-policy';

const MANUAL_MANGA_BLOCK_REASON = 'manual_manga_block';
const AUTOMATIC_PORNOGRAPHY_BLOCK_REASON = 'automatic_pornography_detection';

export type ContentPolicyGateInput = ExplicitAdultContentGateInput & {
  manga: ExplicitAdultContentGateInput['manga'] & ContentPolicyMangaIdentity;
};

export type ContentPolicyGateResult =
  | ExplicitAdultContentGateResult
  | {
      reason: typeof MANUAL_MANGA_BLOCK_REASON;
      signal: {
        field: 'manga';
        value: string;
      };
    }
  | {
      assessmentId: string;
      reason: typeof AUTOMATIC_PORNOGRAPHY_BLOCK_REASON;
      signal: {
        field: 'manga';
        value: string;
      };
    };

export type ContentPolicyBlockDetails = Omit<
  ExplicitAdultContentBlockDetails,
  'reason'
> & {
  reason: ContentPolicyGateResult['reason'];
};

export async function getContentPolicyGateResult(
  input: ContentPolicyGateInput,
  deps?: {
    dbClient?: typeof db;
    log?: MangaPornographyPolicyLogger;
  }
): Promise<ContentPolicyGateResult | null> {
  const dbClient = deps?.dbClient ?? db;
  const manualBlock =
    input.manga.mangaTitle || input.manga.mangaUrl
      ? await getManualMangaBlock(
          {
            mangaTitle: input.manga.mangaTitle,
            mangaUrl: input.manga.mangaUrl,
            sourceId: input.manga.sourceId,
            sourceName: input.manga.sourceName,
          },
          { dbClient }
        )
      : null;

  if (manualBlock?.blocked) {
    return {
      reason: MANUAL_MANGA_BLOCK_REASON,
      signal: {
        field: 'manga',
        value:
          manualBlock.identity.mangaTitle ??
          manualBlock.identity.mangaUrl ??
          manualBlock.key,
      },
    };
  }

  const explicitMetadataBlock = await getExplicitAdultContentGateResult(input, {
    dbClient,
  });
  if (explicitMetadataBlock) {
    return explicitMetadataBlock;
  }

  if (!input.manga.mangaTitle) {
    return null;
  }

  const pornographyDecision = await waitForMangaPornographyPolicyDecision(
    {
      mangaTitle: input.manga.mangaTitle,
      sourceId: input.manga.sourceId,
      sourceName: input.manga.sourceName,
    },
    {
      dbClient,
      log: deps?.log,
      timeoutMs: envServer.OPENAI_PORNOGRAPHY_MODERATION_GATE_WAIT_MS,
    }
  );

  if (!pornographyDecision?.blocked) {
    return null;
  }

  return {
    assessmentId: pornographyDecision.assessmentId,
    reason: AUTOMATIC_PORNOGRAPHY_BLOCK_REASON,
    signal: {
      field: 'manga',
      value: input.manga.mangaTitle,
    },
  };
}

export function buildContentPolicyBlockDetails(
  result: ContentPolicyGateResult
): ContentPolicyBlockDetails {
  if (result.reason === 'official_explicit_adult_metadata') {
    return buildExplicitAdultContentBlockDetails(result);
  }

  if (result.reason === AUTOMATIC_PORNOGRAPHY_BLOCK_REASON) {
    return {
      illustration: {
        prompt:
          'Respectful non-sexual manhua-style content-policy warning illustration, closed book with a shield symbol, no people, no explicit imagery, no mockery of religion.',
        speechBubble: 'empty',
        style: 'respectful-manhua-warning',
      },
      i18n: {
        bodyKey: 'mobile:translationGate.automaticPornographyBlock.body',
        fallbackBody:
          'This title was blocked after an automated explicit-pornography check.',
        fallbackTitle: 'Title unavailable',
        titleKey: 'mobile:translationGate.automaticPornographyBlock.title',
      },
      reason: result.reason,
      signal: result.signal,
    };
  }

  return {
    illustration: {
      prompt:
        'Respectful non-sexual manhua-style warning illustration of an adult character in modest traditional Muslim clothing, concerned expression, empty speech bubble, no explicit imagery, no mockery of religion.',
      speechBubble: 'empty',
      style: 'respectful-manhua-warning',
    },
    i18n: {
      bodyKey: 'mobile:translationGate.manualMangaBlock.body',
      fallbackBody:
        'Translation has been disabled for this title by the content policy team.',
      fallbackTitle: 'Translation unavailable',
      titleKey: 'mobile:translationGate.manualMangaBlock.title',
    },
    reason: result.reason,
    signal: result.signal,
  };
}
