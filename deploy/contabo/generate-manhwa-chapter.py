#!/usr/bin/env python3
"""Generate one Nayovi original manhwa chapter package through Codex CLI.

The script keeps the manhwa production model isolated from the SEO, blog, and
translation agents. It uses Codex CLI for story generation and a second Codex
CLI pass for autonomous expert review. It does not call OpenAI APIs directly.
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
DEFAULT_MODEL = 'gpt-5.5'
DEFAULT_REASONING_EFFORT = 'extra-high'
DEFAULT_OUTPUT_DIR = pathlib.Path('docs/manhwa/generated')
MIN_PANELS = 12
MAX_PANELS = 12
REASONING_EFFORT_ALIASES = {
  'extra-high': 'xhigh',
  'extra_high': 'xhigh',
  'very-high': 'xhigh',
  'very_high': 'xhigh',
}


def object_schema(properties: dict[str, Any]) -> dict[str, Any]:
  return {
    'type': 'object',
    'additionalProperties': False,
    'properties': properties,
    'required': list(properties),
  }


STRING_ARRAY_SCHEMA = {'type': 'array', 'items': {'type': 'string'}}
CHAPTER_OUTLINE_ITEM_SCHEMA = object_schema({
  'chapter_number': {'type': 'integer'},
  'purpose': {'type': 'string'},
  'title': {'type': 'string'},
})
CHARACTER_SCHEMA = object_schema({
  'age_label': {'type': 'string'},
  'canon_prompt': {'type': 'string'},
  'first_appears_in_chapter': {'type': 'integer'},
  'id': {'type': 'string'},
  'name': {'type': 'string'},
  'personality': {'type': 'string'},
  'role': {'type': 'string'},
  'visual_identity': {'type': 'string'},
})
PANEL_SCHEMA = object_schema({
  'background_text': {'type': 'string'},
  'bubble_layout_plan': {'type': 'string'},
  'characters_present': STRING_ARRAY_SCHEMA,
  'dialogue': STRING_ARRAY_SCHEMA,
  'image_prompt': {'type': 'string'},
  'lettering_plan': {'type': 'string'},
  'narration': {'type': 'string'},
  'panel_number': {'type': 'integer'},
  'vertical_continuity_note': {'type': 'string'},
})
SEASON_SCHEMA = object_schema({
  'arc_summary': {'type': 'string'},
  'chapter_end': {'type': 'integer'},
  'chapter_start': {'type': 'integer'},
  'season_number': {'type': 'integer'},
  'title': {'type': 'string'},
})
PACKAGE_OUTPUT_SCHEMA = object_schema({
  'active_season': object_schema({
    'chapter_outline': {'type': 'array', 'items': CHAPTER_OUTLINE_ITEM_SCHEMA},
    'season_goal': {'type': 'string'},
    'season_number': {'type': 'integer'},
    'title': {'type': 'string'},
  }),
  'chapter': object_schema({
    'chapter_number': {'type': 'integer'},
    'ending_cliffhanger': {'type': 'string'},
    'full_text_scenario': {'type': 'string'},
    'hook': {'type': 'string'},
    'slug': {'type': 'string'},
    'title': {'type': 'string'},
  }),
  'characters': {'type': 'array', 'items': CHARACTER_SCHEMA},
  'image_continuity_rules': object_schema({
    'character_consistency': {'type': 'string'},
    'global_style': {'type': 'string'},
    'negative_prompt': {'type': 'string'},
  }),
  'panels': {'type': 'array', 'items': PANEL_SCHEMA},
  'rights_log': object_schema({
    'copyright_tracking_note': {'type': 'string'},
    'human_review_replaced_by': {'type': 'string'},
    'originality_statement': {'type': 'string'},
  }),
  'seasons': {'type': 'array', 'items': SEASON_SCHEMA},
  'series': object_schema({
    'core_themes': STRING_ARRAY_SCHEMA,
    'full_premise': {'type': 'string'},
    'logline': {'type': 'string'},
    'slug': {'type': 'string'},
    'tagline': {'type': 'string'},
    'target_reader_feeling': {'type': 'string'},
    'title': {'type': 'string'},
  }),
})
REVIEW_OUTPUT_SCHEMA = object_schema({
  'approved_for_publication': {'type': 'boolean'},
  'continuity_notes': STRING_ARRAY_SCHEMA,
  'copyright_notes': STRING_ARRAY_SCHEMA,
  'expert_summary': {'type': 'string'},
  'required_fixes': STRING_ARRAY_SCHEMA,
  'score': {'type': 'integer'},
})


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description='Generate one original manhwa chapter package.')
  parser.add_argument('--series-title', default='THE ECLIPSE CROWN')
  parser.add_argument('--series-slug', default='the-eclipse-crown')
  parser.add_argument('--chapter-number', type=int, default=1)
  parser.add_argument('--output-dir', default=os.environ.get('MANHWA_AGENT_OUTPUT_DIR', str(DEFAULT_OUTPUT_DIR)))
  parser.add_argument('--input-package', default='')
  parser.add_argument('--codex-bin', default=os.environ.get('MANHWA_AGENT_CODEX_CLI_PATH', DEFAULT_CODEX_BIN))
  parser.add_argument('--model', default=os.environ.get('MANHWA_CREATIVE_CODEX_MODEL', DEFAULT_MODEL))
  parser.add_argument(
    '--reasoning-effort',
    default=os.environ.get('MANHWA_CREATIVE_CODEX_REASONING_EFFORT', DEFAULT_REASONING_EFFORT),
  )
  parser.add_argument('--max-revisions', type=int, default=int(os.environ.get('MANHWA_AGENT_MAX_REVISIONS', '2') or '2'))
  parser.add_argument('--skip-review', action='store_true')
  return parser.parse_args()


def call_codex(
  *,
  codex_bin: str,
  model: str,
  output_schema: dict[str, Any],
  prompt: str,
  reasoning_effort: str,
  work_dir: pathlib.Path,
) -> str:
  with tempfile.NamedTemporaryFile('w', encoding='utf-8', suffix='.md', delete=False) as prompt_file:
    prompt_file.write(prompt)
    prompt_path = pathlib.Path(prompt_file.name)

  with tempfile.NamedTemporaryFile('w', encoding='utf-8', suffix='.txt', delete=False) as report_file:
    report_path = pathlib.Path(report_file.name)
  with tempfile.NamedTemporaryFile('w', encoding='utf-8', suffix='.schema.json', delete=False) as schema_file:
    json.dump(output_schema, schema_file)
    schema_path = pathlib.Path(schema_file.name)

  normalized_reasoning_effort = normalize_reasoning_effort(reasoning_effort)

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
          f'model_reasoning_effort="{normalized_reasoning_effort}"',
          '--output-schema',
          str(schema_path),
          '--output-last-message',
          str(report_path),
        ],
        check=True,
        stdin=prompt_handle,
      )
    return report_path.read_text(encoding='utf-8')
  finally:
    prompt_path.unlink(missing_ok=True)
    report_path.unlink(missing_ok=True)
    schema_path.unlink(missing_ok=True)


def normalize_reasoning_effort(value: str) -> str:
  normalized = value.strip().lower()
  return REASONING_EFFORT_ALIASES.get(normalized, normalized)


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


def validate_package(
  payload: dict[str, Any],
  *,
  max_panels: int = MAX_PANELS,
  min_panels: int = MIN_PANELS,
) -> dict[str, Any]:
  required_top_level = [
    'series',
    'seasons',
    'characters',
    'active_season',
    'chapter',
    'panels',
    'image_continuity_rules',
    'rights_log',
  ]
  missing = [key for key in required_top_level if key not in payload]
  if missing:
    raise ValueError(f'Missing generated field(s): {", ".join(missing)}')

  characters = payload.get('characters')
  panels = payload.get('panels')
  if not isinstance(characters, list) or len(characters) < 3:
    raise ValueError('Generated package must contain at least 3 characters.')
  if not isinstance(panels, list) or not min_panels <= len(panels) <= max_panels:
    raise ValueError(f'Generated package must contain {min_panels}-{max_panels} panels.')

  for index, panel in enumerate(panels, start=1):
    if not isinstance(panel, dict):
      raise ValueError(f'Panel {index} must be an object.')
    for key in (
      'panel_number',
      'narration',
      'dialogue',
      'characters_present',
      'image_prompt',
      'lettering_plan',
      'bubble_layout_plan',
      'background_text',
      'vertical_continuity_note',
    ):
      if not str(panel.get(key) or '').strip() and key not in ('dialogue', 'background_text'):
        raise ValueError(f'Panel {index} missing {key}.')
    if not isinstance(panel.get('dialogue'), list):
      raise ValueError(f'Panel {index} dialogue must be a list.')

  payload['generated_at'] = dt.datetime.now(dt.UTC).isoformat().replace('+00:00', 'Z')
  payload['generation_model'] = payload.get('generation_model') or DEFAULT_MODEL
  return payload


def build_generation_prompt(series_title: str, chapter_number: int) -> str:
  return f"""You are the autonomous Nayovi Originals showrunner.

Use model-level reasoning to create an original premium Korean manhwa/webtoon package.

Model requirements:
- Think like a senior manhwa writer, art director, continuity editor, and copyright documentation assistant.
- Use original story material. Do not copy characters, settings, names, scenes, or visual designs from any existing manga, manhwa, manhua, anime, game, or novel.
- Desired commercial genres: royal fantasy, regression, duke intrigue, murim-inspired later season, dark eclipse magic.
- Target series: {series_title}.
- Target total length: 120 chapters.
- Current chapter: {chapter_number}.
- Publication is autonomous after AI expert approval. Do not ask the owner for approval.
- Stable lettering art direction: keep one coherent bubble system across all panels. Narration uses black gothic title-card boxes with ivory/silver ornamental borders and elegant white serif text. Supernatural inner voices use warm ivory oval/circular bubbles with thin black-silver decorative rings, moonlit glow, and thought-dot chains to the magical source or receiver. Normal dialogue uses clean white/ivory manhwa bubbles with inked outlines, natural tails, subtle paper texture, and the same readable serif lettering.

Story seed to preserve:
- The moon is chained.
- The heroine is a fallen princess who wakes before her execution.
- Her crown is alive.
- A regressed duke remembers failing her in a previous timeline.

Return JSON only. The first character must be {{ and the last character must be }}.
Return exactly one JSON object with this shape:
{{
  "series": {{
    "title": "{series_title}",
    "slug": "the-eclipse-crown",
    "tagline": "...",
    "logline": "...",
    "full_premise": "...",
    "core_themes": ["...", "..."],
    "target_reader_feeling": "..."
  }},
  "seasons": [
    {{
      "season_number": 1,
      "title": "...",
      "chapter_start": 1,
      "chapter_end": 30,
      "arc_summary": "..."
    }}
  ],
  "characters": [
    {{
      "id": "stable-kebab-id",
      "name": "...",
      "role": "...",
      "age_label": "...",
      "personality": "...",
      "visual_identity": "...",
      "canon_prompt": "stable face/body/costume prompt for all future images",
      "first_appears_in_chapter": 1
    }}
  ],
  "active_season": {{
    "season_number": 1,
    "title": "...",
    "season_goal": "...",
    "chapter_outline": [
      {{"chapter_number": 1, "title": "...", "purpose": "..."}}
    ]
  }},
  "chapter": {{
    "chapter_number": {chapter_number},
    "title": "...",
    "slug": "...",
    "hook": "...",
    "full_text_scenario": "...",
    "ending_cliffhanger": "..."
  }},
  "panels": [
    {{
      "panel_number": 1,
      "narration": "...",
      "dialogue": ["Speaker: line"],
      "characters_present": ["stable-kebab-id"],
      "image_prompt": "vertical manhwa panel prompt, include character canon references by id and visual continuity",
      "lettering_plan": "creative but highly readable manhwa lettering style for this panel; mention serif/hand-lettered mood, contrast, and size",
      "bubble_layout_plan": "which character owns each bubble and where it should sit relative to their face/body/relic so the thought/speech origin is obvious",
      "background_text": "optional exact background/location/time caption if useful, otherwise empty string",
      "vertical_continuity_note": "how this image continues or aligns with the previous/next image"
    }}
  ],
  "image_continuity_rules": {{
    "global_style": "premium Korean manhwa vertical webtoon, cinematic lighting, original IP",
    "character_consistency": "...",
    "negative_prompt": "no copyrighted characters, no readable fake text, no logos, no UI, no device mockups, no sexualized minors"
  }},
  "rights_log": {{
    "originality_statement": "...",
    "human_review_replaced_by": "autonomous AI expert continuity and originality review",
    "copyright_tracking_note": "..."
  }}
}}

Panel requirements:
- Use exactly {MIN_PANELS} vertical panels for chapter {chapter_number}.
- The chapter must read like a real opening manhwa chapter, not a prompt.
- Use emotional stakes, short dialogue, strong cliffhanger, and cinematic panel flow.
- Each image_prompt must be specific enough for image generation and must maintain character identity.
- Each lettering_plan must ask for beautiful, creative, visible typography that still reads instantly on mobile.
- Each bubble_layout_plan must make bubble ownership obvious: who thinks/speaks, where the bubble sits, and where the tail/thought dots point.
- Keep the same bubble styling system across panels unless a story reason requires a controlled variation.
- Use background_text only when it genuinely helps explain the place, time, or story situation. It must be exact, short, and not random decoration.
- Dialogue must be English.
"""


def build_review_prompt(payload: dict[str, Any]) -> str:
  return f"""You are the autonomous Nayovi Originals expert AI reviewer.

Review this generated manhwa package for:
- story quality and reader hook,
- 120-chapter scalability,
- character consistency,
- panel-to-panel vertical continuity,
- originality and copyright risk,
- image prompt quality,
- readiness for autonomous publication.

Do not ask for owner approval. Decide yourself.

Return JSON only. The first character must be {{ and the last character must be }}.
Return exactly one JSON object:
{{
  "approved_for_publication": true,
  "score": 0-100,
  "expert_summary": "...",
  "required_fixes": [],
  "continuity_notes": ["..."],
  "copyright_notes": ["..."]
}}

Package:
{json.dumps(payload, ensure_ascii=False, indent=2)}
"""


def build_revision_prompt(payload: dict[str, Any], review: dict[str, Any]) -> str:
  revision_seed = build_revision_seed(payload)

  return f"""You are the autonomous Nayovi Originals showrunner revising a manhwa package after expert AI review.

Revise the package so it can pass autonomous publication review.

Mandatory fixes:
- Apply every required_fixes item from the expert review.
- Expand chapter 1 into exactly {MIN_PANELS} vertical panels.
- Keep all recurring character IDs stable unless a new character is truly needed.
- Preserve the core premise: chained moon, fallen princess before execution, living crown, regressed duke.
- Improve foreshadowing for the future moon-sword/murim arc without making chapter 1 feel overloaded.
- Clarify visual/body continuity in canon prompts.
- Strengthen antagonist motives and limits.
- Keep the story original and avoid named series, artists, studios, copyrighted characters, logos, or readable fake text outside the approved manhwa lettering, bubbles, captions, and background_text fields.

Return JSON only. The first character must be {{ and the last character must be }}.
Return exactly one revised JSON package with the same shape as the original generation output. Do not include markdown or narration.

Expert review:
{json.dumps(review, ensure_ascii=False, indent=2)}

Canonical seed to preserve:
{json.dumps(revision_seed, ensure_ascii=False, indent=2)}
"""


def build_revision_seed(payload: dict[str, Any]) -> dict[str, Any]:
  series = payload.get('series') if isinstance(payload.get('series'), dict) else {}
  chapter = payload.get('chapter') if isinstance(payload.get('chapter'), dict) else {}
  seasons = payload.get('seasons') if isinstance(payload.get('seasons'), list) else []
  characters = payload.get('characters') if isinstance(payload.get('characters'), list) else []
  active_season = payload.get('active_season') if isinstance(payload.get('active_season'), dict) else {}

  return {
    'series': {
      'title': series.get('title'),
      'slug': series.get('slug'),
      'tagline': series.get('tagline'),
      'logline': series.get('logline'),
      'core_themes': series.get('core_themes'),
    },
    'seasons': [
      {
        'season_number': item.get('season_number'),
        'title': item.get('title'),
        'chapter_start': item.get('chapter_start'),
        'chapter_end': item.get('chapter_end'),
        'arc_summary': item.get('arc_summary'),
      }
      for item in seasons
      if isinstance(item, dict)
    ],
    'characters': [
      {
        'id': item.get('id'),
        'name': item.get('name'),
        'role': item.get('role'),
        'age_label': item.get('age_label'),
        'personality': item.get('personality'),
        'visual_identity': item.get('visual_identity'),
        'canon_prompt': item.get('canon_prompt'),
      }
      for item in characters
      if isinstance(item, dict)
    ],
    'active_season_goal': active_season.get('season_goal'),
    'current_chapter': {
      'chapter_number': chapter.get('chapter_number'),
      'title': chapter.get('title'),
      'slug': chapter.get('slug'),
      'hook': chapter.get('hook'),
      'ending_cliffhanger': chapter.get('ending_cliffhanger'),
    },
    'old_panel_count': len(payload.get('panels')) if isinstance(payload.get('panels'), list) else 0,
  }


def review_package(
  *,
  args: argparse.Namespace,
  package: dict[str, Any],
  work_dir: pathlib.Path,
) -> dict[str, Any]:
  raw_review = call_codex(
    codex_bin=args.codex_bin,
    model=args.model,
    output_schema=REVIEW_OUTPUT_SCHEMA,
    prompt=build_review_prompt(package),
    reasoning_effort=args.reasoning_effort,
    work_dir=work_dir,
  )
  return extract_json_object(raw_review)


def revise_package(
  *,
  args: argparse.Namespace,
  package: dict[str, Any],
  review: dict[str, Any],
  work_dir: pathlib.Path,
) -> dict[str, Any]:
  raw_revision = call_codex(
    codex_bin=args.codex_bin,
    model=args.model,
    output_schema=PACKAGE_OUTPUT_SCHEMA,
    prompt=build_revision_prompt(package, review),
    reasoning_effort=args.reasoning_effort,
    work_dir=work_dir,
  )
  revised = validate_package(extract_json_object(raw_revision))
  revised['generation_model'] = args.model
  revised['generation_reasoning_effort'] = normalize_reasoning_effort(args.reasoning_effort)
  return revised


def is_review_approved(review: dict[str, Any]) -> bool:
  value = review.get('approved_for_publication')
  if isinstance(value, bool):
    return value
  if isinstance(value, str):
    return value.strip().lower() == 'true'
  return False


def load_initial_package(args: argparse.Namespace, work_dir: pathlib.Path) -> dict[str, Any]:
  if args.input_package:
    input_path = pathlib.Path(args.input_package)
    package = validate_package(
      json.loads(input_path.read_text(encoding='utf-8')),
      max_panels=MAX_PANELS,
      min_panels=1,
    )
  else:
    raw_generation = call_codex(
      codex_bin=args.codex_bin,
      model=args.model,
      output_schema=PACKAGE_OUTPUT_SCHEMA,
      prompt=build_generation_prompt(args.series_title, args.chapter_number),
      reasoning_effort=args.reasoning_effort,
      work_dir=work_dir,
    )
    package = validate_package(extract_json_object(raw_generation))

  package['generation_model'] = args.model
  package['generation_reasoning_effort'] = normalize_reasoning_effort(args.reasoning_effort)
  return package


def main() -> int:
  args = parse_args()
  output_dir = pathlib.Path(args.output_dir)
  output_dir.mkdir(parents=True, exist_ok=True)
  work_dir = pathlib.Path.cwd()

  package = load_initial_package(args, work_dir)

  if args.skip_review:
    package['expert_review'] = {
      'approved_for_publication': False,
      'score': 0,
      'expert_summary': 'Review skipped by command line option.',
      'required_fixes': ['Run without --skip-review before publication.'],
      'continuity_notes': [],
      'copyright_notes': [],
    }
  else:
    revision_history: list[dict[str, Any]] = []
    existing_review = package.get('expert_review') if isinstance(package.get('expert_review'), dict) else None
    for revision_index in range(args.max_revisions + 1):
      if revision_index == 0 and existing_review and not is_review_approved(existing_review):
        review = existing_review
      else:
        review = review_package(args=args, package=package, work_dir=work_dir)
      package['expert_review'] = review
      if is_review_approved(review):
        package['publication_status'] = 'approved_by_expert_ai'
        break
      if revision_index >= args.max_revisions:
        package['publication_status'] = 'held_by_expert_ai'
        break
      revision_history.append({
        'revision_number': revision_index + 1,
        'review': review,
        'requested_at': dt.datetime.now(dt.UTC).isoformat().replace('+00:00', 'Z'),
      })
      package = revise_package(args=args, package=package, review=review, work_dir=work_dir)
      package['revision_history'] = revision_history

  output_path = output_dir / f'{args.series_slug}-chapter-{args.chapter_number:03d}.json'
  output_path.write_text(
    json.dumps(package, ensure_ascii=False, indent=2) + '\n',
    encoding='utf-8',
  )
  print(f'manhwa_package_ready {output_path}')
  return 0


if __name__ == '__main__':
  raise SystemExit(main())
