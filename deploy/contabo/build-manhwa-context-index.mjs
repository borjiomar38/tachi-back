#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_CONTEXT_ROOT = 'docs/manhwa/context';
const DEFAULT_PACKAGE_ROOT = 'docs/manhwa/generated';

function parseArgs(argv) {
  const args = {};
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) {
      throw new Error(`Unexpected argument: ${value}`);
    }
    const key = value.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    index += 1;
  }
  return args;
}

async function pathExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath, fallback = {}) {
  if (!(await pathExists(filePath))) {
    return fallback;
  }
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function splitDialogueLine(line) {
  const separatorIndex = line.indexOf(':');
  if (separatorIndex === -1) {
    return { speaker: 'Unknown speaker', text: line.trim() };
  }
  return {
    speaker: line.slice(0, separatorIndex).trim(),
    text: line.slice(separatorIndex + 1).trim(),
  };
}

async function characterAssets(seriesDir, characters) {
  const assets = {};
  for (const character of asArray(characters.characters)) {
    if (!character.id) continue;
    const characterDir = path.join(seriesDir, 'characters', character.id);
    assets[character.id] = {
      index: await readJson(path.join(characterDir, 'index.json')),
      pose_bank: await readJson(path.join(characterDir, 'pose-bank.json')),
      profile: await readJson(path.join(characterDir, 'profile.json')),
      reference_plan: await readJson(
        path.join(characterDir, 'reference-plan.json')
      ),
    };
  }
  return assets;
}

function characterLookup(characters, assets = {}) {
  const byId = {};
  const speakerAliases = {};
  for (const character of asArray(characters.characters)) {
    byId[character.id] = {
      asset_index: assets[character.id]?.index ?? null,
      bubble_placement_rule: character.bubble_placement_rule,
      bubble_style: character.bubble_style,
      canon_prompt: character.canon_prompt,
      name: character.name,
      pose_bank: assets[character.id]?.pose_bank?.poses ?? [],
      reference_images:
        assets[character.id]?.reference_plan?.reference_images ?? [],
      role: character.role,
      thought_style: character.thought_style,
    };
    speakerAliases[character.name] = character.id;
    speakerAliases[character.id] = character.id;
    const firstName = String(character.name || '').split(/\s+/)[0];
    if (firstName) {
      speakerAliases[firstName] = character.id;
    }
  }
  return { byId, speakerAliases };
}

function indexedPanel({
  chapterContextPanel,
  packagePanel,
  previousContextPanel,
  previousPackagePanel,
}) {
  const dialogue = asArray(packagePanel.dialogue).map((line) =>
    splitDialogueLine(String(line))
  );
  const panelNumber = Number(
    packagePanel.panel_number || chapterContextPanel.panel_number
  );

  return {
    background_text: chapterContextPanel.background_text || '',
    bubble_layout_plan: chapterContextPanel.bubble_layout_plan || '',
    characters_present: asArray(packagePanel.characters_present),
    dialogue,
    image_prompt: packagePanel.image_prompt || '',
    image_prompt_addendum: chapterContextPanel.image_prompt_addendum || '',
    lettering_plan: chapterContextPanel.lettering_plan || '',
    narration: packagePanel.narration || '',
    panel_number: panelNumber,
    prompt_keys: [
      `chapter:${String(panelNumber).padStart(3, '0')}`,
      ...asArray(packagePanel.characters_present).map(
        (characterId) => `character:${characterId}`
      ),
      ...dialogue.map((line) => `speaker:${line.speaker}`),
    ],
    top_anchor: chapterContextPanel.top_anchor || '',
    bottom_anchor: chapterContextPanel.bottom_anchor || '',
    visual_continuity_in:
      chapterContextPanel.visual_continuity_in ||
      (previousContextPanel
        ? `Continue from panel ${previousContextPanel.panel_number}: ${previousContextPanel.bottom_anchor || previousPackagePanel?.vertical_continuity_note || ''}`
        : ''),
    visual_continuity_out:
      chapterContextPanel.visual_continuity_out ||
      packagePanel.vertical_continuity_note ||
      '',
  };
}

function buildChapterIndex({ chapterContext, packageData }) {
  const packagePanels = asArray(packageData.panels);
  const contextPanels = new Map(
    asArray(chapterContext.panels).map((panel) => [
      Number(panel.panel_number),
      panel,
    ])
  );
  const panels = packagePanels.map((packagePanel, index) => {
    const panelNumber = Number(packagePanel.panel_number || index + 1);
    return indexedPanel({
      chapterContextPanel: contextPanels.get(panelNumber) || {
        panel_number: panelNumber,
      },
      packagePanel,
      previousContextPanel: contextPanels.get(panelNumber - 1),
      previousPackagePanel: packagePanels[index - 1],
    });
  });

  const transitions = panels.slice(1).map((panel, index) => ({
    from_panel: panels[index].panel_number,
    to_panel: panel.panel_number,
    instruction: panel.visual_continuity_in,
  }));

  return {
    chapter_number:
      chapterContext.chapter_number || packageData.chapter?.chapter_number,
    generated_from: {
      context: 'chapters/chapter-001.json',
      package: chapterContext.scenario_source || '',
    },
    panel_lookup: Object.fromEntries(
      panels.map((panel) => [
        String(panel.panel_number),
        {
          background_text: panel.background_text,
          bubble_layout_plan: panel.bubble_layout_plan,
          characters_present: panel.characters_present,
          dialogue: panel.dialogue,
          image_prompt_addendum: panel.image_prompt_addendum,
          lettering_plan: panel.lettering_plan,
          prompt_keys: panel.prompt_keys,
          visual_continuity_in: panel.visual_continuity_in,
          visual_continuity_out: panel.visual_continuity_out,
        },
      ])
    ),
    panels,
    title: chapterContext.title || packageData.chapter?.title,
    transitions,
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const seriesSlug = args['series-slug'] || 'the-eclipse-crown';
  const chapterNumber = Number(args['chapter-number'] || 1);
  const contextRoot = path.resolve(
    args['context-root'] || DEFAULT_CONTEXT_ROOT
  );
  const packageRoot = path.resolve(
    args['package-root'] || DEFAULT_PACKAGE_ROOT
  );
  const seriesDir = path.join(contextRoot, seriesSlug);
  const chapterFile = path.join(
    seriesDir,
    'chapters',
    `chapter-${String(chapterNumber).padStart(3, '0')}.json`
  );
  const packageFile = path.join(
    packageRoot,
    `${seriesSlug}-chapter-${String(chapterNumber).padStart(3, '0')}.json`
  );

  const seriesBible = await readJson(path.join(seriesDir, 'series-bible.json'));
  const characters = await readJson(path.join(seriesDir, 'characters.json'), {
    characters: [],
  });
  const chapterContext = await readJson(chapterFile);
  const packageData = await readJson(packageFile);

  const assets = await characterAssets(seriesDir, characters);
  const characterIndex = characterLookup(characters, assets);
  const chapterIndex = buildChapterIndex({ chapterContext, packageData });
  const rootIndex = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    series_slug: seriesSlug,
    title: seriesBible.title,
    fast_lookup: {
      bubble_style: 'bubble-style-bible.json',
      character_assets: 'characters/index.json',
      chapter_index: `chapters/chapter-${String(chapterNumber).padStart(3, '0')}.index.json`,
      characters_index: 'characters.index.json',
      series_bible: 'series-bible.json',
    },
    retrieval_rules: [
      'Use characters.index.json for speaker or character canon.',
      'Use characters/<id>/profile.json and reference-plan.json before rendering recurring characters.',
      'Use bubble-style-bible.json for global lettering and bubble shape.',
      'Use chapter-XXX.index.json panel_lookup for panel-specific context.',
      'Use visual_continuity_in before rendering a panel after another panel.',
    ],
  };

  await mkdir(path.join(seriesDir, 'chapters'), { recursive: true });
  await writeFile(
    path.join(seriesDir, 'characters.index.json'),
    `${JSON.stringify(characterIndex, null, 2)}\n`
  );
  await writeFile(
    path.join(
      seriesDir,
      'chapters',
      `chapter-${String(chapterNumber).padStart(3, '0')}.index.json`
    ),
    `${JSON.stringify(chapterIndex, null, 2)}\n`
  );
  await writeFile(
    path.join(seriesDir, 'index.json'),
    `${JSON.stringify(rootIndex, null, 2)}\n`
  );

  console.log(
    JSON.stringify(
      {
        chapter_index_panels: chapterIndex.panels.length,
        index: path.join(seriesDir, 'index.json'),
        next_panel_hint:
          chapterIndex.panel_lookup[String(chapterNumber + 1)] ?? null,
        series_slug: seriesSlug,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
