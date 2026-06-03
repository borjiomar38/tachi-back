#!/usr/bin/env python3
"""Run one Nayovi Originals preproduction task through Codex CLI.

Preproduction intentionally happens before chapter image rendering:
scenario thinking first, then one complete character dossier per run, then the
chapter scenario. This keeps characters and stories managed instead of using a
single generic prompt for everything.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import pathlib
import re
import subprocess
import tempfile
from typing import Any


DEFAULT_CODEX_BIN = 'codex'
DEFAULT_CONTEXT_ROOT = pathlib.Path('docs/manhwa/context')
DEFAULT_MODEL = 'gpt-5.5'
DEFAULT_REASONING_EFFORT = 'extra-high'
REASONING_EFFORT_ALIASES = {
  'extra-high': 'xhigh',
  'extra_high': 'xhigh',
  'very-high': 'xhigh',
  'very_high': 'xhigh',
}


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(
    description='Run one daily Nayovi Originals preproduction task.'
  )
  parser.add_argument('--series-slug', default=os.environ.get('MANHWA_SERIES_SLUG', 'the-eclipse-crown'))
  parser.add_argument('--chapter-number', type=int, default=int(os.environ.get('MANHWA_CHAPTER_NUMBER', '1') or '1'))
  parser.add_argument('--context-root', default=os.environ.get('MANHWA_CONTEXT_ROOT', str(DEFAULT_CONTEXT_ROOT)))
  parser.add_argument('--codex-bin', default=os.environ.get('MANHWA_AGENT_CODEX_CLI_PATH', DEFAULT_CODEX_BIN))
  parser.add_argument('--model', default=os.environ.get('MANHWA_PREPRODUCTION_CODEX_MODEL', os.environ.get('MANHWA_CREATIVE_CODEX_MODEL', DEFAULT_MODEL)))
  parser.add_argument(
    '--reasoning-effort',
    default=os.environ.get(
      'MANHWA_PREPRODUCTION_CODEX_REASONING_EFFORT',
      os.environ.get('MANHWA_CREATIVE_CODEX_REASONING_EFFORT', DEFAULT_REASONING_EFFORT),
    ),
  )
  parser.add_argument(
    '--task-type',
    choices=['auto', 'scenario-strategy', 'season-scenario', 'character-dossier', 'chapter-scenario'],
    default='auto',
  )
  parser.add_argument('--character-id', default='')
  parser.add_argument('--dry-run', action='store_true')
  return parser.parse_args()


def normalize_reasoning_effort(value: str) -> str:
  normalized = value.strip().lower()
  return REASONING_EFFORT_ALIASES.get(normalized, normalized)


def coerce_dict(value: Any) -> dict[str, Any]:
  return value if isinstance(value, dict) else {}


def coerce_list(value: Any) -> list[Any]:
  return value if isinstance(value, list) else []


def path_exists(path: pathlib.Path) -> bool:
  return path.exists() and path.is_file()


def read_json(path: pathlib.Path, fallback: dict[str, Any] | None = None) -> dict[str, Any]:
  if not path_exists(path):
    return fallback or {}
  value = json.loads(path.read_text(encoding='utf-8'))
  return value if isinstance(value, dict) else fallback or {}


def write_json(path: pathlib.Path, value: dict[str, Any]) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def extract_json_object(text: str) -> dict[str, Any]:
  fenced = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, flags=re.DOTALL)
  candidates = [fenced.group(1)] if fenced else []
  start = text.find('{')
  end = text.rfind('}')
  if start != -1 and end != -1 and end > start:
    candidates.append(text[start : end + 1])

  for candidate in candidates:
    try:
      value = json.loads(candidate)
    except json.JSONDecodeError:
      continue
    if isinstance(value, dict):
      return value

  raise ValueError('Codex response did not contain a JSON object.')


def call_codex(
  *,
  codex_bin: str,
  model: str,
  prompt: str,
  reasoning_effort: str,
  work_dir: pathlib.Path,
) -> dict[str, Any]:
  with tempfile.NamedTemporaryFile('w', encoding='utf-8', suffix='.md', delete=False) as prompt_file:
    prompt_file.write(prompt)
    prompt_path = pathlib.Path(prompt_file.name)

  with tempfile.NamedTemporaryFile('w', encoding='utf-8', suffix='.txt', delete=False) as report_file:
    report_path = pathlib.Path(report_file.name)

  try:
    with prompt_path.open('r', encoding='utf-8') as prompt_handle:
      subprocess.run(
        [
          codex_bin,
          '--search',
          '-a',
          'never',
          'exec',
          '--skip-git-repo-check',
          '--ephemeral',
          '--sandbox',
          'workspace-write',
          '-C',
          str(work_dir),
          '--model',
          model,
          '-c',
          f'model_reasoning_effort="{normalize_reasoning_effort(reasoning_effort)}"',
          '--output-last-message',
          str(report_path),
        ],
        check=True,
        stdin=prompt_handle,
      )
    return extract_json_object(report_path.read_text(encoding='utf-8'))
  finally:
    prompt_path.unlink(missing_ok=True)
    report_path.unlink(missing_ok=True)


def series_dir(args: argparse.Namespace) -> pathlib.Path:
  return pathlib.Path(args.context_root) / args.series_slug


def preproduction_dir(args: argparse.Namespace) -> pathlib.Path:
  return series_dir(args) / 'preproduction'


def character_dir(args: argparse.Namespace, character_id: str) -> pathlib.Path:
  return series_dir(args) / 'characters' / character_id


def sorted_characters(characters_payload: dict[str, Any]) -> list[dict[str, Any]]:
  characters = [
    {**coerce_dict(item), '_registry_index': index}
    for index, item in enumerate(coerce_list(characters_payload.get('characters')))
  ]
  return sorted(
    [character for character in characters if str(character.get('id') or '').strip()],
    key=lambda item: (
      int(item.get('first_appears_in_chapter') or 999),
      int(item.get('_registry_index') or 0),
    ),
  )


def story_engine_path(args: argparse.Namespace) -> pathlib.Path:
  return preproduction_dir(args) / 'story-engine.json'


def season_map_path(args: argparse.Namespace) -> pathlib.Path:
  return preproduction_dir(args) / 'season-map.json'


def chapter_scenario_path(args: argparse.Namespace) -> pathlib.Path:
  return (
    preproduction_dir(args)
    / 'chapters'
    / f'chapter-{int(args.chapter_number):03d}-scenario.json'
  )


def character_dossier_path(args: argparse.Namespace, character_id: str) -> pathlib.Path:
  return character_dir(args, character_id) / 'dossier.json'


def determine_next_task(args: argparse.Namespace) -> dict[str, Any]:
  characters_payload = read_json(series_dir(args) / 'characters.json', {'characters': []})
  characters = sorted_characters(characters_payload)

  if args.task_type == 'scenario-strategy' or (
    args.task_type == 'auto' and not path_exists(story_engine_path(args))
  ):
    return {'task_type': 'scenario-strategy'}

  if args.task_type == 'season-scenario' or (
    args.task_type == 'auto' and not path_exists(season_map_path(args))
  ):
    return {'task_type': 'season-scenario'}

  if args.task_type == 'character-dossier':
    character_id = args.character_id or (characters[0].get('id') if characters else '')
    return {'task_type': 'character-dossier', 'character_id': character_id}

  if args.task_type == 'auto':
    for character in characters:
      character_id = str(character.get('id') or '')
      if not path_exists(character_dossier_path(args, character_id)):
        return {'task_type': 'character-dossier', 'character_id': character_id}

  if args.task_type == 'chapter-scenario' or (
    args.task_type == 'auto' and not path_exists(chapter_scenario_path(args))
  ):
    return {'task_type': 'chapter-scenario'}

  return {'task_type': 'none'}


def build_status(args: argparse.Namespace, next_task: dict[str, Any]) -> dict[str, Any]:
  characters_payload = read_json(series_dir(args) / 'characters.json', {'characters': []})
  characters = sorted_characters(characters_payload)
  dossier_status = {
    str(character.get('id')): path_exists(character_dossier_path(args, str(character.get('id'))))
    for character in characters
  }
  scenario_strategy_ready = path_exists(story_engine_path(args))
  season_scenario_ready = path_exists(season_map_path(args))
  chapter_scenario_ready = path_exists(chapter_scenario_path(args))
  all_character_dossiers_ready = bool(dossier_status) and all(dossier_status.values())

  missing_dossier = next((character_id for character_id, ready in dossier_status.items() if not ready), None)
  ready_for_chapter_generation = (
    scenario_strategy_ready
    and season_scenario_ready
    and all_character_dossiers_ready
    and chapter_scenario_ready
  )

  return {
    'generated_at': dt.datetime.now(dt.UTC).isoformat().replace('+00:00', 'Z'),
    'series_slug': args.series_slug,
    'chapter_number': args.chapter_number,
    'scenario_strategy_ready': scenario_strategy_ready,
    'season_scenario_ready': season_scenario_ready,
    'chapter_scenario_ready': chapter_scenario_ready,
    'character_dossiers': dossier_status,
    'all_character_dossiers_ready': all_character_dossiers_ready,
    'ready_for_character_references': scenario_strategy_ready and season_scenario_ready and all_character_dossiers_ready,
    'ready_for_chapter_generation': ready_for_chapter_generation,
    'next_missing_character_dossier': missing_dossier,
    'next_task': next_task,
    'daily_order': [
      'Day 1: scenario-strategy',
      'Day 2: season-scenario',
      'Next days: one character-dossier per recurring character',
      'Then: chapter-scenario',
      'Then: character reference images',
      'Then: one final chapter panel image per day',
    ],
  }


def write_status(args: argparse.Namespace, next_task: dict[str, Any]) -> dict[str, Any]:
  status = build_status(args, next_task)
  write_json(preproduction_dir(args) / 'status.json', status)
  return status


def prompt_context(args: argparse.Namespace) -> dict[str, Any]:
  root = series_dir(args)
  return {
    'series_bible': read_json(root / 'series-bible.json'),
    'characters': read_json(root / 'characters.json', {'characters': []}),
    'bubble_style_bible': read_json(root / 'bubble-style-bible.json'),
    'existing_story_engine': read_json(story_engine_path(args)),
    'existing_season_map': read_json(season_map_path(args)),
    'chapter_scenario': read_json(chapter_scenario_path(args)),
  }


def build_scenario_strategy_prompt(args: argparse.Namespace) -> str:
  return f"""You are the Nayovi Originals senior showrunner.

Create the first daily preproduction artifact for an original manhwa series.
This is not a chapter draft. It is the story engine that future chapters and
characters will use.

Requirements:
- Use only original story material.
- Think commercially: epic royal fantasy, regression tension, duke intrigue,
  later murim/Oath Hall expansion, dark eclipse magic, romantic pressure, legal
  spectacle, betrayal, and irreversible power costs.
- Make the story feel big enough for 120 chapters without becoming generic.
- Add originality/copyright guardrails so future agents avoid copying known IP.
- Return JSON only.

Context:
{json.dumps(prompt_context(args), ensure_ascii=False, indent=2)}

Return exactly this JSON shape:
{{
  "artifact_type": "scenario-strategy",
  "series_slug": "{args.series_slug}",
  "commercial_promise": "...",
  "story_engine": "...",
  "one_sentence_reader_hook": "...",
  "core_mysteries": ["..."],
  "power_cost_ladder": ["..."],
  "romance_pressure_ladder": ["..."],
  "court_intrigue_ladder": ["..."],
  "murim_oath_hall_ladder": ["..."],
  "chapter_001_to_120_spine": ["..."],
  "recurring_symbol_system": ["..."],
  "scenario_day_rules": ["..."],
  "character_day_rules": ["..."],
  "copyright_originality_rules": ["..."],
  "expert_ai_gate_rules": ["..."]
}}
"""


def build_season_scenario_prompt(args: argparse.Namespace) -> str:
  return f"""You are the Nayovi Originals senior season architect.

Build a season scenario map before any chapter production continues. The result
must guide character dossiers and future chapter scenarios.

Requirements:
- Split the 120-chapter manhwa into seasons/arcs.
- Each season needs a fresh dramatic engine, visual promise, character pressure,
  and cliffhanger escalation.
- Include some murim, duke regression, imperial court, divine-law, and dark
  royal fantasy arcs without copying named properties.
- Return JSON only.

Context:
{json.dumps(prompt_context(args), ensure_ascii=False, indent=2)}

Return exactly this JSON shape:
{{
  "artifact_type": "season-scenario",
  "series_slug": "{args.series_slug}",
  "season_count": 0,
  "seasons": [
    {{
      "season_number": 1,
      "chapter_start": 1,
      "chapter_end": 30,
      "title": "...",
      "emotional_promise": "...",
      "main_conflict": "...",
      "visual_world": "...",
      "major_reveals": ["..."],
      "character_turns": ["..."],
      "ending_cliffhanger": "..."
    }}
  ],
  "scenario_backlog": ["..."],
  "character_dependency_notes": ["..."],
  "originality_notes": ["..."]
}}
"""


def build_character_dossier_prompt(args: argparse.Namespace, character: dict[str, Any]) -> str:
  return f"""You are the Nayovi Originals character designer, writer, and continuity editor.

Build exactly one complete character dossier for today. Do not create a generic
prompt used for all characters. This dossier must be unique to this character
and must give future scenario, image, bubble, and copyright agents everything
they need for consistent production.

Character to build today:
{json.dumps(character, ensure_ascii=False, indent=2)}

Context:
{json.dumps(prompt_context(args), ensure_ascii=False, indent=2)}

Requirements:
- Create an original character identity, not copied from any known manga,
  manhwa, anime, game, celebrity, or actor.
- Include story function, inner wound, secret, desire, fear, relationship hooks,
  visual locks, body/face/hair/costume continuity, speech/bubble style, and
  forbidden drift.
- Make the character useful for epic scenarios over many chapters.
- Include a unique reference_image_plan; this is what the image cron will later
  render for this character. Use more than one reference type when needed.
- Keep all text in English.
- Return JSON only.

Return exactly this JSON shape:
{{
  "artifact_type": "character-dossier",
  "id": "{character.get('id')}",
  "name": "{character.get('name')}",
  "role": "...",
  "narrative_function": "...",
  "core_wound": "...",
  "desire": "...",
  "fear": "...",
  "lie_they_believe": "...",
  "secret": "...",
  "relationship_hooks": ["..."],
  "chapter_usage_rules": ["..."],
  "voice_rules": ["..."],
  "speech_style": "...",
  "bubble_style": "...",
  "thought_style": "...",
  "visual_identity": "...",
  "canon_prompt": "...",
  "silhouette_lock": "...",
  "face_lock": "...",
  "body_lock": "...",
  "hair_lock": "...",
  "costume_phases": ["..."],
  "palette": ["..."],
  "recurring_props": ["..."],
  "pose_language": ["..."],
  "forbidden_drift": ["..."],
  "continuity_tags": ["..."],
  "reference_image_plan": [
    {{
      "id": "identity-front-full-body",
      "purpose": "...",
      "prompt_addendum": "..."
    }}
  ],
  "scenario_hooks": ["..."],
  "copyright_originality_notes": ["..."],
  "expert_ai_review_checklist": ["..."]
}}
"""


def build_chapter_scenario_prompt(args: argparse.Namespace) -> str:
  return f"""You are the Nayovi Originals chapter scenario lead.

Create the scenario preproduction artifact for chapter {args.chapter_number}.
This happens after series/season thinking and character dossiers, before panel
image generation. It should feel like a real manhwa chapter story, not a prompt.

Requirements:
- Use the story engine, season map, and character dossiers.
- Make the scenario epic, readable, emotional, and commercially attractive.
- Keep image continuity and bubble ownership in mind, but do not generate final
  panel images here.
- Return JSON only.

Context:
{json.dumps(prompt_context(args), ensure_ascii=False, indent=2)}

Return exactly this JSON shape:
{{
  "artifact_type": "chapter-scenario",
  "series_slug": "{args.series_slug}",
  "chapter_number": {args.chapter_number},
  "title": "...",
  "reader_hook": "...",
  "emotional_question": "...",
  "full_scenario": "...",
  "scene_beats": ["..."],
  "panel_seed_plan": ["..."],
  "dialogue_direction": ["..."],
  "character_continuity_requirements": ["..."],
  "vertical_scroll_requirements": ["..."],
  "cliffhanger": "...",
  "expert_ai_gate_rules": ["..."],
  "copyright_originality_notes": ["..."]
}}
"""


def run_task(args: argparse.Namespace, task: dict[str, Any]) -> dict[str, Any]:
  task_type = str(task.get('task_type') or '')
  if task_type == 'scenario-strategy':
    payload = call_codex(
      codex_bin=args.codex_bin,
      model=args.model,
      prompt=build_scenario_strategy_prompt(args),
      reasoning_effort=args.reasoning_effort,
      work_dir=pathlib.Path.cwd(),
    )
    write_json(story_engine_path(args), payload)
    return {'task_type': task_type, 'output_path': str(story_engine_path(args))}

  if task_type == 'season-scenario':
    payload = call_codex(
      codex_bin=args.codex_bin,
      model=args.model,
      prompt=build_season_scenario_prompt(args),
      reasoning_effort=args.reasoning_effort,
      work_dir=pathlib.Path.cwd(),
    )
    write_json(season_map_path(args), payload)
    return {'task_type': task_type, 'output_path': str(season_map_path(args))}

  if task_type == 'character-dossier':
    character_id = str(task.get('character_id') or '')
    characters = sorted_characters(read_json(series_dir(args) / 'characters.json', {'characters': []}))
    character = next((item for item in characters if item.get('id') == character_id), None)
    if not character:
      raise SystemExit(f'Character not found: {character_id}')
    payload = call_codex(
      codex_bin=args.codex_bin,
      model=args.model,
      prompt=build_character_dossier_prompt(args, character),
      reasoning_effort=args.reasoning_effort,
      work_dir=pathlib.Path.cwd(),
    )
    write_json(character_dossier_path(args, character_id), payload)
    return {'task_type': task_type, 'character_id': character_id, 'output_path': str(character_dossier_path(args, character_id))}

  if task_type == 'chapter-scenario':
    payload = call_codex(
      codex_bin=args.codex_bin,
      model=args.model,
      prompt=build_chapter_scenario_prompt(args),
      reasoning_effort=args.reasoning_effort,
      work_dir=pathlib.Path.cwd(),
    )
    write_json(chapter_scenario_path(args), payload)
    return {'task_type': task_type, 'output_path': str(chapter_scenario_path(args))}

  return {'task_type': 'none', 'output_path': None}


def main() -> int:
  args = parse_args()
  task = determine_next_task(args)

  if args.dry_run:
    status = write_status(args, task)
    print(json.dumps({'dry_run': True, 'next_task': task, 'status': status}, ensure_ascii=False, indent=2))
    return 0

  result = run_task(args, task)
  next_task_after = determine_next_task(args)
  status = write_status(args, next_task_after)
  print(json.dumps({'completed_task': result, 'next_task': next_task_after, 'status': status}, ensure_ascii=False, indent=2))
  return 0


if __name__ == '__main__':
  raise SystemExit(main())
