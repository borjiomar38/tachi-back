#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_CONTEXT_ROOT = 'docs/manhwa/context';
const DEFAULT_PRIVATE_ROOT = 'docs/manhwa/private';

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

async function writeJson(filePath, value) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function referencePlanFor(character, seriesSlug, privateRoot) {
  const characterId = character.id;
  const protectedRoot = `/api/manhwa-private/${seriesSlug}/character/${characterId}/reference`;
  const privateReferenceRoot = path.join(
    privateRoot,
    seriesSlug,
    'characters',
    characterId
  );
  const referenceImage = (id, purpose, promptAddendum) => ({
    id,
    local_file: path.relative(
      process.cwd(),
      path.join(privateReferenceRoot, `${id}.png`)
    ),
    protected_path: `${protectedRoot}/${id}`,
    purpose,
    public_path: `${protectedRoot}/${id}`,
    prompt_addendum: promptAddendum,
  });

  return {
    private_reference_root: path.relative(process.cwd(), privateReferenceRoot),
    protected_reference_root: protectedRoot,
    required_before_chapter_render: true,
    reference_images: [
      referenceImage(
        'identity-front-full-body',
        'Lock full body proportions, outfit, hair length, main silhouette, and costume details.',
        'Full-body front view, neutral readable pose, clean silhouette, complete costume visible from head to feet, no text.'
      ),
      referenceImage(
        'identity-three-quarter',
        'Lock face, body volume, hairstyle, and costume in premium manhwa perspective.',
        'Three-quarter full-body view, cinematic but clear, same costume and face, no text.'
      ),
      referenceImage(
        'face-expression-sheet',
        'Lock facial features and emotional range for close-ups.',
        'Expression sheet with neutral, fear, anger, resolve, shock, and quiet sorrow; same face in every expression, no text labels.'
      ),
      referenceImage(
        'hands-props-detail',
        'Lock important hands, scars, jewelry, relics, cuffs, weapons, or role-specific objects.',
        'Detail sheet for hands and role-specific props, consistent anatomy and materials, no text labels.'
      ),
      referenceImage(
        'chapter-001-key-pose',
        'Lock the most important chapter-one pose for continuity in rendered panels.',
        keyPosePrompt(character)
      ),
    ],
  };
}

function localReferencePath({
  publicRoot,
  seriesSlug,
  characterId,
  publicPath,
}) {
  return path.join(
    publicRoot,
    seriesSlug,
    'characters',
    characterId,
    path.basename(publicPath)
  );
}

async function referenceStatusFor({
  publicRoot,
  seriesSlug,
  characterId,
  referencePlan,
}) {
  const references = [];
  for (const reference of asArray(referencePlan.reference_images)) {
    const publicPath = String(reference.public_path || '');
    const localFile = reference.local_file
      ? path.resolve(reference.local_file)
      : localReferencePath({
          publicRoot,
          seriesSlug,
          characterId,
          publicPath,
        });
    const generated = await pathExists(localFile);
    references.push({
      generated,
      id: reference.id,
      local_file: path.relative(process.cwd(), localFile),
      protected_path: reference.protected_path || publicPath,
      public_path: publicPath,
      status: generated ? 'generated' : 'missing',
    });
  }

  return {
    generated_count: references.filter((reference) => reference.generated)
      .length,
    missing_count: references.filter((reference) => !reference.generated)
      .length,
    missing_reference_ids: references
      .filter((reference) => !reference.generated)
      .map((reference) => reference.id),
    references,
    required_before_chapter_render:
      referencePlan.required_before_chapter_render,
  };
}

function keyPosePrompt(character) {
  if (character.id === 'elianor-veyr') {
    return 'Elianor lying on cold prison stone in torn white execution dress, full body visible including legs and feet, bruised wrists, chains, hair spread like ink, never sexualized, no text.';
  }
  if (character.id === 'caelan-rhovir') {
    return 'Caelan waking before dawn with hand near heart scar, then kneeling in controlled urgency, full costume reference, no text.';
  }
  if (character.id === 'eclipse-crown') {
    return 'Eclipse Crown shown as reflection/shadow/relic glow only: thornlike black-silver lunar crown, no physical head placement unless magical reflection, no text.';
  }
  return 'Chapter-one key pose for this character based on their role, full readable costume and face, no text.';
}

function poseBankFor(character) {
  const base = [
    {
      id: 'standing-neutral',
      description:
        'Neutral full-body standing pose for scale and costume continuity.',
      use_when: 'establishing shots and character reintroduction',
    },
    {
      id: 'face-close-up',
      description:
        'Close-up face angle preserving eyes, nose, lips, hairline, and expression style.',
      use_when: 'dialogue, shock, internal thought, emotional beats',
    },
    {
      id: 'hands-action',
      description:
        'Hands interacting with chains, weapon, relic, document, or clothing without anatomy drift.',
      use_when: 'detail panels and legal/relic reveals',
    },
  ];

  if (character.id === 'elianor-veyr') {
    return [
      ...base,
      {
        id: 'prison-lying-full-body',
        description:
          'Lying on prison floor, full body visible from hair to feet, torn white dress, chains, bruised wrists and legs, non-sexual tragic framing.',
        use_when:
          'chapter 1 panels 1-3 and continuity from panel 1 into panel 2',
      },
      {
        id: 'upright-in-chains',
        description:
          'Pushing herself upright despite chains, shoulders straight, injured but dignified.',
        use_when: 'resolve panels and refusal scenes',
      },
    ];
  }

  if (character.id === 'eclipse-crown') {
    return [
      {
        id: 'eye-reflection',
        description:
          'Crown appears only as black-silver thorn reflection inside Elianor eye.',
        use_when: 'inner voice and magical identity reveal',
      },
      {
        id: 'shadow-crown',
        description:
          'Crown visible in shadow or blade reflection, not physically sitting on head.',
        use_when: 'execution tension and magic restraint',
      },
    ];
  }

  return base;
}

function profileFor(character) {
  return {
    age_label: character.age_label || '',
    bubble_placement_rule: character.bubble_placement_rule || '',
    bubble_style: character.bubble_style || '',
    canon_prompt: character.canon_prompt || '',
    id: character.id,
    name: character.name,
    role: character.role || '',
    thought_style: character.thought_style || '',
    visual_identity_lock: [
      'Do not change face structure between panels.',
      'Do not change body proportions between panels.',
      'Do not change primary costume unless the chapter context explicitly says so.',
      'Use reference images from this folder before rendering chapter panels.',
    ],
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const seriesSlug = args['series-slug'] || 'the-eclipse-crown';
  const contextRoot = path.resolve(
    args['context-root'] || DEFAULT_CONTEXT_ROOT
  );
  const publicRoot = path.resolve(args['public-root'] || DEFAULT_PRIVATE_ROOT);
  const seriesDir = path.join(contextRoot, seriesSlug);
  const charactersFile = path.join(seriesDir, 'characters.json');
  const characters = await readJson(charactersFile, { characters: [] });
  const characterRoot = path.join(seriesDir, 'characters');
  const publicCharacterRoot = path.join(publicRoot, seriesSlug, 'characters');
  const characterIds = [];
  const characterSummaries = {};
  let totalReferenceCount = 0;
  let generatedReferenceCount = 0;
  let nextMissingReference = null;

  for (const character of asArray(characters.characters)) {
    if (!character.id) continue;
    characterIds.push(character.id);
    const dir = path.join(characterRoot, character.id);
    const publicDir = path.join(publicCharacterRoot, character.id);
    const referencePlan = referencePlanFor(character, seriesSlug, publicRoot);
    const referenceStatus = await referenceStatusFor({
      publicRoot,
      seriesSlug,
      characterId: character.id,
      referencePlan,
    });
    totalReferenceCount += referenceStatus.references.length;
    generatedReferenceCount += referenceStatus.generated_count;
    if (!nextMissingReference) {
      const missing = referenceStatus.references.find(
        (reference) => !reference.generated
      );
      if (missing) {
        nextMissingReference = {
          character_id: character.id,
          reference_id: missing.id,
          local_file: missing.local_file,
          public_path: missing.public_path,
        };
      }
    }
    await mkdir(dir, { recursive: true });
    await mkdir(publicDir, { recursive: true });
    await writeJson(path.join(dir, 'profile.json'), profileFor(character));
    await writeJson(path.join(dir, 'reference-plan.json'), referencePlan);
    await writeJson(path.join(dir, 'pose-bank.json'), {
      character_id: character.id,
      poses: poseBankFor(character),
    });
    await writeJson(path.join(dir, 'index.json'), {
      character_id: character.id,
      profile: `characters/${character.id}/profile.json`,
      private_reference_root: referencePlan.private_reference_root,
      protected_reference_root: referencePlan.protected_reference_root,
      reference_plan: `characters/${character.id}/reference-plan.json`,
      reference_status: referenceStatus,
      pose_bank: `characters/${character.id}/pose-bank.json`,
    });
    characterSummaries[character.id] = {
      name: character.name,
      private_reference_root: referencePlan.private_reference_root,
      protected_reference_root: referencePlan.protected_reference_root,
      reference_status: referenceStatus,
      role: character.role || '',
    };
  }

  await writeJson(path.join(characterRoot, 'index.json'), {
    character_ids: characterIds,
    characters: characterSummaries,
    reference_status: {
      generated_count: generatedReferenceCount,
      missing_count: totalReferenceCount - generatedReferenceCount,
      next_missing_reference: nextMissingReference,
      total_count: totalReferenceCount,
    },
    rule: 'Each recurring character must have reference images generated before regular chapter panels use them.',
  });

  console.log(
    JSON.stringify(
      {
        character_count: characterIds.length,
        character_root: characterRoot,
        private_character_root: path.join(publicRoot, seriesSlug, 'characters'),
        protected_character_root: `/api/manhwa-private/${seriesSlug}/character`,
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
