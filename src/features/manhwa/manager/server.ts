import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';

import { envServer } from '@/env/server';
import { auth } from '@/server/auth';

const DEFAULT_SERIES_SLUG = 'the-eclipse-crown';

export interface ManhwaManagerReference {
  generated: boolean;
  id: string;
  protectedPath?: string;
  purpose?: string;
  status: string;
}

export interface ManhwaManagerCharacter {
  bubblePlacementRule?: string;
  bubbleStyle?: string;
  canonPrompt?: string;
  dossierReady: boolean;
  id: string;
  missingReferenceIds: string[];
  name: string;
  narrativeFunction?: string;
  referenceGeneratedCount: number;
  referenceMissingCount: number;
  references: ManhwaManagerReference[];
  role: string;
  thoughtStyle?: string;
}

export interface ManhwaManagerOverview {
  canView: boolean;
  characters: ManhwaManagerCharacter[];
  contextRoot?: string;
  files: {
    chapterScenario: boolean;
    seasonMap: boolean;
    storyEngine: boolean;
  };
  generatedAt?: string;
  nextPanelHint?: {
    bubbleLayoutPlan?: string;
    charactersPresent: string[];
    promptKeys: string[];
    visualContinuityIn?: string;
    visualContinuityOut?: string;
  };
  nextTask?: {
    characterId?: string;
    taskType: string;
  };
  preproduction: {
    allCharacterDossiersReady: boolean;
    chapterScenarioReady: boolean;
    readyForChapterGeneration: boolean;
    readyForCharacterReferences: boolean;
    scenarioStrategyReady: boolean;
    seasonScenarioReady: boolean;
  };
  referenceStatus: {
    generatedCount: number;
    missingCount: number;
    nextMissingReference?: {
      characterId?: string;
      referenceId?: string;
    };
    totalCount: number;
  };
  seriesSlug: string;
}

export const getManhwaManagerOverview = createServerFn({
  method: 'GET',
}).handler(async (): Promise<ManhwaManagerOverview> => {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
  });

  if (session?.user.role !== 'admin') {
    return emptyOverview({ canView: false, seriesSlug: DEFAULT_SERIES_SLUG });
  }

  const { access } = await import('node:fs/promises');
  const path = await import('node:path');
  const contextRoot = path.resolve(
    envServer.MANHWA_CONTEXT_ROOT ??
      path.join(process.cwd(), 'docs/manhwa/context')
  );
  const seriesSlug = DEFAULT_SERIES_SLUG;
  const seriesDir = path.join(contextRoot, seriesSlug);
  const preproductionDir = path.join(seriesDir, 'preproduction');
  const status = await readJsonObject(
    path.join(preproductionDir, 'status.json')
  );
  const charactersIndex = await readJsonObject(
    path.join(seriesDir, 'characters', 'index.json')
  );
  const chapterIndex = await readJsonObject(
    path.join(seriesDir, 'chapters', 'chapter-001.index.json')
  );
  const charactersRecord = asRecord(charactersIndex.characters);
  const characterIds =
    asStringArray(charactersIndex.character_ids).length > 0
      ? asStringArray(charactersIndex.character_ids)
      : Object.keys(charactersRecord);

  const characters = await Promise.all(
    characterIds.map(async (characterId) => {
      const indexedCharacter = asRecord(charactersRecord[characterId]);
      const profile = await readJsonObject(
        path.join(seriesDir, 'characters', characterId, 'profile.json')
      );
      const referenceStatus = asRecord(indexedCharacter.reference_status);
      const references = asArray(referenceStatus.references)
        .map((item): ManhwaManagerReference | null => {
          const reference = asRecord(item);
          const id = stringValue(reference.id);

          if (!id) {
            return null;
          }

          return {
            generated: booleanValue(reference.generated),
            id,
            protectedPath: stringValue(reference.protected_path),
            purpose: stringValue(reference.purpose),
            status: stringValue(reference.status) || 'unknown',
          };
        })
        .filter((item): item is ManhwaManagerReference => Boolean(item));

      return {
        bubblePlacementRule: stringValue(profile.bubble_placement_rule),
        bubbleStyle: stringValue(profile.bubble_style),
        canonPrompt: stringValue(profile.canon_prompt),
        dossierReady:
          booleanValue(indexedCharacter.dossier_ready) ||
          Boolean(indexedCharacter.dossier),
        id: characterId,
        missingReferenceIds: asStringArray(
          referenceStatus.missing_reference_ids
        ),
        name:
          stringValue(indexedCharacter.name) ||
          stringValue(profile.name) ||
          characterId,
        narrativeFunction: stringValue(profile.narrative_function),
        referenceGeneratedCount: numberValue(referenceStatus.generated_count),
        referenceMissingCount: numberValue(referenceStatus.missing_count),
        references,
        role:
          stringValue(indexedCharacter.role) ||
          stringValue(profile.role) ||
          'Character',
        thoughtStyle: stringValue(profile.thought_style),
      };
    })
  );

  const nextTask = asRecord(status.next_task);
  const referenceOverview = asRecord(charactersIndex.reference_status);
  const nextMissingReference = asRecord(
    referenceOverview.next_missing_reference
  );
  const nextPanelHint = asRecord(chapterIndex.next_panel_hint);

  return {
    canView: true,
    characters,
    contextRoot,
    files: {
      chapterScenario: await fileExists(
        path.join(preproductionDir, 'chapters', 'chapter-001-scenario.json'),
        access
      ),
      seasonMap: await fileExists(
        path.join(preproductionDir, 'season-map.json'),
        access
      ),
      storyEngine: await fileExists(
        path.join(preproductionDir, 'story-engine.json'),
        access
      ),
    },
    generatedAt: stringValue(status.generated_at),
    nextPanelHint: {
      bubbleLayoutPlan: stringValue(nextPanelHint.bubble_layout_plan),
      charactersPresent: asStringArray(nextPanelHint.characters_present),
      promptKeys: asStringArray(nextPanelHint.prompt_keys),
      visualContinuityIn: stringValue(nextPanelHint.visual_continuity_in),
      visualContinuityOut: stringValue(nextPanelHint.visual_continuity_out),
    },
    nextTask: {
      characterId: stringValue(nextTask.character_id),
      taskType: stringValue(nextTask.task_type) || 'unknown',
    },
    preproduction: {
      allCharacterDossiersReady: booleanValue(
        status.all_character_dossiers_ready
      ),
      chapterScenarioReady: booleanValue(status.chapter_scenario_ready),
      readyForChapterGeneration: booleanValue(
        status.ready_for_chapter_generation
      ),
      readyForCharacterReferences: booleanValue(
        status.ready_for_character_references
      ),
      scenarioStrategyReady: booleanValue(status.scenario_strategy_ready),
      seasonScenarioReady: booleanValue(status.season_scenario_ready),
    },
    referenceStatus: {
      generatedCount: numberValue(referenceOverview.generated_count),
      missingCount: numberValue(referenceOverview.missing_count),
      nextMissingReference: {
        characterId: stringValue(nextMissingReference.character_id),
        referenceId: stringValue(nextMissingReference.reference_id),
      },
      totalCount: numberValue(referenceOverview.total_count),
    },
    seriesSlug,
  };
});

async function readJsonObject(filePath: string) {
  try {
    const { readFile } = await import('node:fs/promises');
    const value = JSON.parse(await readFile(filePath, 'utf-8'));

    return asRecord(value);
  } catch {
    return {};
  }
}

async function fileExists(
  filePath: string,
  access: (path: string) => Promise<void>
) {
  try {
    await access(filePath);

    return true;
  } catch {
    return false;
  }
}

function emptyOverview(input: {
  canView: boolean;
  seriesSlug: string;
}): ManhwaManagerOverview {
  return {
    canView: input.canView,
    characters: [],
    files: {
      chapterScenario: false,
      seasonMap: false,
      storyEngine: false,
    },
    preproduction: {
      allCharacterDossiersReady: false,
      chapterScenarioReady: false,
      readyForChapterGeneration: false,
      readyForCharacterReferences: false,
      scenarioStrategyReady: false,
      seasonScenarioReady: false,
    },
    referenceStatus: {
      generatedCount: 0,
      missingCount: 0,
      totalCount: 0,
    },
    seriesSlug: input.seriesSlug,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asStringArray(value: unknown): string[] {
  return asArray(value)
    .map((item) => stringValue(item))
    .filter((item): item is string => Boolean(item));
}

function booleanValue(value: unknown) {
  return value === true;
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}
