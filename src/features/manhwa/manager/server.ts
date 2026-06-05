import { createServerFn } from '@tanstack/react-start';
import { getRequestHeaders } from '@tanstack/react-start/server';
import { z } from 'zod';

import { envServer } from '@/env/server';
import { auth } from '@/server/auth';

const DEFAULT_SERIES_SLUG = 'the-eclipse-crown';
const zSeriesSlugInput = z.object({
  seriesSlug: z
    .string()
    .trim()
    .min(1)
    .max(160)
    .regex(/^[a-z0-9-]+$/),
});

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
  chapterRendering: ManhwaManagerChapterRendering;
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

export interface ManhwaManagerChapterRendering {
  active: boolean;
  activePanelNumber?: number;
  activeProcessCount: number;
  dailyLimit: number;
  failedCount: number;
  failedPanels: number[];
  generatedAt?: string;
  generatedCount: number;
  lastPanelGeneratedAt?: string;
  manifestAvailable: boolean;
  missingCount: number;
  nextPanelNumber?: number;
  renderedPanels: number[];
  renderedThisRun: number[];
  status: string;
  statusStale: boolean;
  statusUpdatedAt?: string;
  runLimit: number;
  totalPanels: number;
}

export interface ManhwaManagerSeriesList {
  canView: boolean;
  contextRoot?: string;
  series: ManhwaManagerSeriesSummary[];
}

export interface ManhwaManagerSeriesSummary {
  chapterFailedCount: number;
  chapterImageCount: number;
  chapterImageMissingCount: number;
  chapterImageNextPanelNumber?: number;
  chapterPanelCount: number;
  chapterRenderingActive: boolean;
  chapterRenderingActivePanelNumber?: number;
  coreHook?: string;
  generatedAt?: string;
  nextTask?: {
    characterId?: string;
    taskType: string;
  };
  referenceGeneratedCount: number;
  referenceMissingCount: number;
  referenceTotalCount: number;
  slug: string;
  title: string;
}

export const getManhwaManagerSeriesList = createServerFn({
  method: 'GET',
}).handler(async (): Promise<ManhwaManagerSeriesList> => {
  const session = await auth.api.getSession({
    headers: getRequestHeaders(),
  });

  if (session?.user.role !== 'admin') {
    return {
      canView: false,
      series: [],
    };
  }

  const contextRoot = await getContextRoot();
  const { readdir } = await import('node:fs/promises');

  let entries: string[] = [];
  try {
    entries = (
      await readdir(contextRoot, {
        withFileTypes: true,
      })
    )
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((slug) => /^[a-z0-9-]+$/.test(slug))
      .sort();
  } catch {
    entries = [];
  }

  if (entries.length === 0) {
    entries = [DEFAULT_SERIES_SLUG];
  }

  const series = await Promise.all(
    entries.map((seriesSlug) => getSeriesSummary(contextRoot, seriesSlug))
  );

  return {
    canView: true,
    contextRoot,
    series,
  };
});

export const getManhwaManagerOverview = createServerFn({
  method: 'GET',
})
  .inputValidator(zSeriesSlugInput)
  .handler(async ({ data }): Promise<ManhwaManagerOverview> => {
    const session = await auth.api.getSession({
      headers: getRequestHeaders(),
    });

    if (session?.user.role !== 'admin') {
      return emptyOverview({ canView: false, seriesSlug: data.seriesSlug });
    }

    const { access } = await import('node:fs/promises');
    const path = await import('node:path');
    const contextRoot = await getContextRoot();
    const privateRoot = await getPrivateRoot();
    const seriesSlug = data.seriesSlug;
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
    const chapterRendering = await getChapterRenderingStatus({
      chapterIndex,
      chapterNumber: 1,
      contextRoot,
      privateRoot,
      seriesSlug,
    });

    return {
      canView: true,
      chapterRendering,
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

async function getSeriesSummary(
  contextRoot: string,
  seriesSlug: string
): Promise<ManhwaManagerSeriesSummary> {
  const path = await import('node:path');
  const privateRoot = await getPrivateRoot();
  const seriesDir = path.join(contextRoot, seriesSlug);
  const seriesBible = await readJsonObject(
    path.join(seriesDir, 'series-bible.json')
  );
  const index = await readJsonObject(path.join(seriesDir, 'index.json'));
  const status = await readJsonObject(
    path.join(seriesDir, 'preproduction', 'status.json')
  );
  const charactersIndex = await readJsonObject(
    path.join(seriesDir, 'characters', 'index.json')
  );
  const chapterIndex = await readJsonObject(
    path.join(seriesDir, 'chapters', 'chapter-001.index.json')
  );
  const referenceOverview = asRecord(charactersIndex.reference_status);
  const nextTask = asRecord(status.next_task);
  const chapterRendering = await getChapterRenderingStatus({
    chapterIndex,
    chapterNumber: 1,
    contextRoot,
    privateRoot,
    seriesSlug,
  });

  return {
    chapterFailedCount: chapterRendering.failedCount,
    chapterImageCount: chapterRendering.generatedCount,
    chapterImageMissingCount: chapterRendering.missingCount,
    chapterImageNextPanelNumber: chapterRendering.nextPanelNumber,
    chapterPanelCount: chapterRendering.totalPanels,
    chapterRenderingActive: chapterRendering.active,
    chapterRenderingActivePanelNumber: chapterRendering.activePanelNumber,
    coreHook: stringValue(seriesBible.core_hook),
    generatedAt:
      stringValue(status.generated_at) || stringValue(index.generated_at),
    nextTask: {
      characterId: stringValue(nextTask.character_id),
      taskType: stringValue(nextTask.task_type) || 'unknown',
    },
    referenceGeneratedCount: numberValue(referenceOverview.generated_count),
    referenceMissingCount: numberValue(referenceOverview.missing_count),
    referenceTotalCount: numberValue(referenceOverview.total_count),
    slug: seriesSlug,
    title:
      stringValue(seriesBible.title) || stringValue(index.title) || seriesSlug,
  };
}

async function getContextRoot() {
  const path = await import('node:path');

  return path.resolve(
    envServer.MANHWA_CONTEXT_ROOT ??
      path.join(process.cwd(), 'docs/manhwa/context')
  );
}

async function getChapterRenderingStatus(input: {
  chapterIndex?: Record<string, unknown>;
  chapterNumber: number;
  contextRoot: string;
  privateRoot: string;
  seriesSlug: string;
}): Promise<ManhwaManagerChapterRendering> {
  const path = await import('node:path');
  const chapterId = `chapter-${String(input.chapterNumber).padStart(3, '0')}`;
  const chapterIndex =
    input.chapterIndex ??
    (await readJsonObject(
      path.join(
        input.contextRoot,
        input.seriesSlug,
        'chapters',
        `${chapterId}.index.json`
      )
    ));
  const plannedPanels = asArray(chapterIndex.panels)
    .map((panel) => numberValue(asRecord(panel).panel_number))
    .filter((panelNumber) => panelNumber > 0);
  const totalPanels = plannedPanels.length;
  const chapterDir = path.join(input.privateRoot, input.seriesSlug, chapterId);
  const manifest = await readJsonObject(
    path.join(chapterDir, `${chapterId}-images.json`)
  );
  const renderStatus = await readJsonObject(
    path.join(chapterDir, 'render-status.json')
  );
  const imageFiles = await listChapterPanelImages(chapterDir);
  const filePanels = imageFiles.map((image) => image.panelNumber);
  const manifestRenderedPanels = asArray(manifest.rendered)
    .map((item) => numberValue(asRecord(item).panel_number))
    .filter((panelNumber) => panelNumber > 0);
  const renderedPanels = uniqueNumbers([
    ...filePanels,
    ...manifestRenderedPanels,
  ]);
  const plannedSet = new Set(plannedPanels);
  const generatedCount = renderedPanels.filter((panelNumber) =>
    plannedSet.has(panelNumber)
  ).length;
  const missingPanels = plannedPanels.filter(
    (panelNumber) => !renderedPanels.includes(panelNumber)
  );
  const failedPanels = uniqueNumbers(
    asArray(manifest.failed)
      .map((item) => numberValue(asRecord(item).panel_number))
      .filter((panelNumber) => panelNumber > 0)
  );
  const activeProcess = await getActiveManhwaImageProcessStatus({
    chapterNumber: input.chapterNumber,
    seriesSlug: input.seriesSlug,
  });
  const renderStatusValue = stringValue(renderStatus.status) ?? 'unknown';
  const renderStatusUpdatedAt = stringValue(renderStatus.updated_at);
  const renderStatusActive =
    booleanValue(renderStatus.active) || renderStatusValue === 'running';
  const renderStatusStale =
    renderStatusActive &&
    isOlderThan(renderStatusUpdatedAt, 4 * 60 * 60 * 1000);
  const activeFromStatus = renderStatusActive && !renderStatusStale;
  const latestImage = imageFiles
    .filter((image) => image.modifiedAt)
    .sort((left, right) =>
      String(right.modifiedAt).localeCompare(String(left.modifiedAt))
    )[0];

  return {
    active: activeFromStatus || activeProcess.active,
    activePanelNumber:
      numberValue(renderStatus.active_panel_number) ||
      activeProcess.panelNumber,
    activeProcessCount: activeProcess.processCount,
    dailyLimit:
      numberValue(renderStatus.daily_limit) ||
      envServer.MANHWA_IMAGE_DAILY_LIMIT,
    failedCount: failedPanels.length,
    failedPanels,
    generatedAt: stringValue(manifest.generated_at),
    generatedCount,
    lastPanelGeneratedAt: latestImage?.modifiedAt,
    manifestAvailable: Object.keys(manifest).length > 0,
    missingCount: missingPanels.length,
    nextPanelNumber: missingPanels[0],
    renderedPanels,
    renderedThisRun: asArray(manifest.rendered_this_run)
      .map((item) => numberValue(asRecord(item).panel_number))
      .filter((panelNumber) => panelNumber > 0),
    runLimit:
      numberValue(renderStatus.run_limit) || envServer.MANHWA_IMAGE_RUN_LIMIT,
    status: renderStatusValue,
    statusStale: renderStatusStale,
    statusUpdatedAt: renderStatusUpdatedAt,
    totalPanels,
  };
}

async function listChapterPanelImages(chapterDir: string) {
  try {
    const { readdir, stat } = await import('node:fs/promises');
    const path = await import('node:path');
    const entries = await readdir(chapterDir, { withFileTypes: true });
    const images = await Promise.all(
      entries.map(async (entry) => {
        const match = /^panel-(\d+)\.(?:png|jpe?g|webp)$/i.exec(entry.name);

        if (!entry.isFile() || !match) {
          return null;
        }

        const filePath = path.join(chapterDir, entry.name);
        const fileStat = await stat(filePath);

        return {
          modifiedAt: fileStat.mtime.toISOString(),
          panelNumber: Number.parseInt(match[1] ?? '0', 10),
        };
      })
    );

    return images
      .filter(
        (image): image is { modifiedAt: string; panelNumber: number } =>
          image !== null && image.panelNumber > 0
      )
      .sort((left, right) => left.panelNumber - right.panelNumber);
  } catch {
    return [];
  }
}

async function getActiveManhwaImageProcessStatus(input: {
  chapterNumber: number;
  seriesSlug: string;
}) {
  try {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);
    const { stdout } = await execFileAsync(
      'ps',
      ['-eo', 'pid=,etimes=,command='],
      { maxBuffer: 1024 * 1024, timeout: 1000 }
    );
    const chapterId = `chapter-${String(input.chapterNumber).padStart(3, '0')}`;
    const candidates = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) =>
        /(?:tachi-manhwa-image-cron|tachi-manhwa-image-renderer|render-manhwa-chapter-images\.py|tachi-codex-image-generator)/.test(
          line
        )
      )
      .filter(
        (line) =>
          line.includes(input.seriesSlug) ||
          line.includes(chapterId) ||
          line.includes('tachi-manhwa-image-cron')
      )
      .filter((line) => !line.includes(' ps -eo '));

    const panelNumber = candidates
      .map((line) => /panel-(\d+)\.png/.exec(line)?.[1])
      .filter((value): value is string => Boolean(value))
      .map((value) => Number.parseInt(value, 10))
      .find((value) => value > 0);

    return {
      active: candidates.length > 0,
      panelNumber,
      processCount: candidates.length,
    };
  } catch {
    return {
      active: false,
      panelNumber: undefined,
      processCount: 0,
    };
  }
}

async function getPrivateRoot() {
  const path = await import('node:path');

  return path.resolve(
    envServer.MANHWA_PRIVATE_ROOT ??
      path.join(process.cwd(), 'docs/manhwa/private')
  );
}

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
    chapterRendering: emptyChapterRendering(),
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

function emptyChapterRendering(): ManhwaManagerChapterRendering {
  return {
    active: false,
    activeProcessCount: 0,
    dailyLimit: 12,
    failedCount: 0,
    failedPanels: [],
    generatedCount: 0,
    manifestAvailable: false,
    missingCount: 0,
    renderedPanels: [],
    renderedThisRun: [],
    runLimit: 1,
    status: 'unknown',
    statusStale: false,
    totalPanels: 0,
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

function uniqueNumbers(values: number[]) {
  return [...new Set(values)].sort((left, right) => left - right);
}

function isOlderThan(value: string | undefined, maxAgeMs: number) {
  if (!value) {
    return true;
  }

  const timestamp = Date.parse(value);

  return Number.isNaN(timestamp) || Date.now() - timestamp > maxAgeMs;
}
