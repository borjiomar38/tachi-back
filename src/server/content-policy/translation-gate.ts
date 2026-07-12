import { db } from '@/server/db';

import {
  buildExplicitAdultContentBlockDetails,
  type ExplicitAdultContentBlockDetails,
  type ExplicitAdultContentGateInput,
  type ExplicitAdultContentGateResult,
  getExplicitAdultContentGateResult,
} from './explicit-adult-content-gate';
import {
  type ContentPolicyMangaIdentity,
  getManualMangaBlock,
} from './manual-manga-policy';

const MANUAL_MANGA_BLOCK_REASON = 'manual_manga_block';

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

  return await getExplicitAdultContentGateResult(input, { dbClient });
}

export function buildContentPolicyBlockDetails(
  result: ContentPolicyGateResult
): ContentPolicyBlockDetails {
  if (result.reason !== MANUAL_MANGA_BLOCK_REASON) {
    return buildExplicitAdultContentBlockDetails(result);
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
