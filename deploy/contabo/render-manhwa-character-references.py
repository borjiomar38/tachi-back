#!/usr/bin/env python3
"""Render Nayovi Originals character reference images through Codex CLI imagegen."""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import subprocess
import tempfile
from typing import Any


DEFAULT_CODEX_IMAGE_SCRIPT = pathlib.Path('/usr/local/bin/tachi-codex-image-generator')
DEFAULT_CONTEXT_ROOT = pathlib.Path('docs/manhwa/context')


def default_bubble_toolkit(series_slug: str) -> dict[str, Any]:
  return {
    'id': 'eclipse-gothic-bubble-toolkit',
    'local_file': f'docs/manhwa/private/{series_slug}/bubble-style/eclipse-gothic-bubble-toolkit.png',
    'purpose': 'Canonical bubble-only toolkit for chapter panel generation.',
    'prompt_addendum': (
      'Create a bubble-only manhwa lettering toolkit on a plain transparent-looking or clean dark '
      'neutral background. No people, no faces, no bodies, no scenery, no character art. Show only '
      'the reusable bubble/caption shapes for THE ECLIPSE CROWN: one black gothic narration card '
      'with thin ivory/silver ornamental filigree border; one warm ivory normal dialogue bubble '
      'with clean black ink outline and one tail sample; one warm ivory supernatural thought '
      'bubble with thin black-silver decorative ring, moonlit glow, and thought-dot chain; one '
      'small engraved background caption plaque. Keep every sample empty or with tiny placeholder '
      'line strokes only, not readable words. The goal is a context reference for bubble shape, '
      'border, fill, tail, glow, spacing, and typography mood only.'
    ),
    'reference_type': 'bubble_style_toolkit',
  }


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(
    description='Render missing character reference images before chapter panel generation.'
  )
  parser.add_argument('--series-slug', default='the-eclipse-crown')
  parser.add_argument('--context-root', default=os.environ.get('MANHWA_CONTEXT_ROOT', str(DEFAULT_CONTEXT_ROOT)))
  parser.add_argument(
    '--codex-image-script',
    default=os.environ.get('MANHWA_IMAGE_SCRIPT_PATH', str(DEFAULT_CODEX_IMAGE_SCRIPT)),
  )
  parser.add_argument('--character-id', default='')
  parser.add_argument('--dry-run', action='store_true')
  parser.add_argument('--force', action='store_true')
  parser.add_argument('--limit', type=int, default=1)
  return parser.parse_args()


def read_json(path: pathlib.Path) -> dict[str, Any]:
  value = json.loads(path.read_text(encoding='utf-8'))
  return value if isinstance(value, dict) else {}


def coerce_list(value: Any) -> list[Any]:
  return value if isinstance(value, list) else []


def coerce_dict(value: Any) -> dict[str, Any]:
  return value if isinstance(value, dict) else {}


def public_path_to_file(public_path: str) -> pathlib.Path:
  normalized = public_path.lstrip('/')
  return pathlib.Path('public') / normalized


def reference_output_path(reference: dict[str, Any]) -> pathlib.Path:
  local_file = str(reference.get('local_file') or '').strip()
  if local_file:
    return pathlib.Path(local_file)

  return public_path_to_file(str(reference.get('public_path') or ''))


def build_prompt(profile: dict[str, Any], reference: dict[str, Any]) -> str:
  dossier = coerce_dict(profile.get('character_dossier'))
  return '\n'.join(
    [
      'Use case: illustration-story',
      'Asset type: original manhwa character reference sheet for Nayovi Originals',
      f'Character: {profile.get("name")} ({profile.get("id")})',
      f'Role: {profile.get("role")}',
      '',
      'Stable character canon:',
      str(profile.get('canon_prompt') or '').strip(),
      '',
      'Full character dossier for this one character:',
      json.dumps(
        {
          'narrative_function': profile.get('narrative_function'),
          'voice_rules': profile.get('voice_rules'),
          'visual_identity': dossier.get('visual_identity'),
          'silhouette_lock': dossier.get('silhouette_lock'),
          'face_lock': profile.get('face_lock'),
          'body_lock': profile.get('body_lock'),
          'hair_lock': profile.get('hair_lock'),
          'costume_phases': profile.get('costume_phases'),
          'palette': profile.get('palette'),
          'recurring_props': profile.get('recurring_props'),
          'pose_language': profile.get('pose_language'),
          'forbidden_drift': profile.get('forbidden_drift'),
          'scenario_hooks': profile.get('scenario_hooks'),
        },
        ensure_ascii=False,
        indent=2,
      ),
      '',
      'Reference image purpose:',
      str(reference.get('purpose') or '').strip(),
      '',
      'Reference image request:',
      str(reference.get('prompt_addendum') or '').strip(),
      '',
      'Continuity requirements:',
      '- This image is a canonical reference for future chapter panels.',
      '- Preserve face, body proportions, hair, costume, scars, accessories, and color identity.',
      '- No speech bubbles, no captions, no logos, no labels, no watermarks, no random text.',
      '- Use a clean premium original Korean manhwa character reference finish.',
      '- Keep the design modest and non-sexualized.',
    ]
  ).strip()


def build_bubble_toolkit_prompt(
  *,
  series_slug: str,
  style_bible: dict[str, Any],
  reference: dict[str, Any],
) -> str:
  return '\n'.join(
    [
      'Use case: illustration-story',
      'Asset type: original manhwa bubble and lettering style toolkit for Nayovi Originals',
      f'Series slug: {series_slug}',
      '',
      'Series bubble style bible:',
      json.dumps(style_bible, ensure_ascii=False, indent=2),
      '',
      'Reference image purpose:',
      str(reference.get('purpose') or '').strip(),
      '',
      'Reference image request:',
      str(reference.get('prompt_addendum') or '').strip(),
      '',
      'Hard requirements:',
      '- Generate only reusable bubble, caption, border, tail, thought-dot, glow, and typography-shape samples.',
      '- No characters, no faces, no bodies, no hands, no portraits, no costumes, no scenery, no weapons, no props, no chapter illustration.',
      '- Do not render a final reader scene; this is a clean visual toolkit for future agents.',
      '- Keep the toolkit visually close to the accepted chapter style: black ornamental gothic narration card plus ivory manhwa dialogue/thought bubbles.',
      '- Avoid fake readable words, labels, logos, watermarks, scan-group marks, random letters, and long text.',
      '- Leave enough padding around each bubble so a future model can analyze the shape, border, tail, glow, and fill without distraction.',
    ]
  ).strip()


def run_image_generator(
  *,
  codex_image_script: pathlib.Path,
  output_path: pathlib.Path,
  prompt: str,
) -> None:
  output_path.parent.mkdir(parents=True, exist_ok=True)
  with tempfile.NamedTemporaryFile('w', encoding='utf-8', suffix='.md', delete=False) as handle:
    handle.write(prompt)
    prompt_path = pathlib.Path(handle.name)

  env = os.environ.copy()
  # Character reference sheets can be portrait, square, or landscape lineups.
  # Keep chapter panel vertical constraints in the chapter renderer, but validate
  # reference sheets by usable resolution instead of forcing a tall aspect ratio.
  env['CODEX_IMAGE_MIN_WIDTH'] = os.environ.get('MANHWA_CHARACTER_REFERENCE_MIN_WIDTH', '800')
  env['CODEX_IMAGE_MIN_HEIGHT'] = os.environ.get('MANHWA_CHARACTER_REFERENCE_MIN_HEIGHT', '800')

  try:
    subprocess.run(
      [
        str(codex_image_script),
        '--prompt-file',
        str(prompt_path),
        '--output-file',
        str(output_path),
        '--work-dir',
        str(output_path.parent),
      ],
      check=True,
      env=env,
    )
  finally:
    prompt_path.unlink(missing_ok=True)


def main() -> int:
  args = parse_args()
  context_root = pathlib.Path(args.context_root)
  series_dir = context_root / args.series_slug
  character_index = read_json(series_dir / 'characters' / 'index.json')
  bubble_style_bible = read_json(series_dir / 'bubble-style-bible.json')
  codex_image_script = pathlib.Path(args.codex_image_script)
  if not codex_image_script.exists():
    local_script = pathlib.Path(__file__).with_name('generate-codex-image.sh')
    if local_script.exists():
      codex_image_script = local_script
    else:
      raise SystemExit(f'Codex image script is missing: {codex_image_script}')

  candidates: list[dict[str, Any]] = []
  toolkit = coerce_dict(bubble_style_bible.get('reference_toolkit'))
  toolkit_references = coerce_list(toolkit.get('reference_images'))
  if not toolkit_references:
    toolkit_references = [default_bubble_toolkit(args.series_slug)]

  for reference in toolkit_references:
    output_path = reference_output_path(reference)
    if not output_path:
      continue
    if output_path.exists() and not args.force:
      continue
    candidates.append(
      {
        'character_id': None,
        'output_path': output_path,
        'profile': {},
        'reference': reference,
        'reference_type': 'bubble_style_toolkit',
      }
    )

  for character_id in coerce_list(character_index.get('character_ids')):
    if args.character_id and character_id != args.character_id:
      continue
    character_dir = series_dir / 'characters' / str(character_id)
    profile = read_json(character_dir / 'profile.json')
    reference_plan = read_json(character_dir / 'reference-plan.json')
    for reference in coerce_list(reference_plan.get('reference_images')):
      output_path = reference_output_path(reference)
      if not output_path:
        continue
      if output_path.exists() and not args.force:
        continue
      candidates.append(
        {
          'character_id': character_id,
          'output_path': output_path,
          'profile': profile,
          'reference': reference,
          'reference_type': 'character_reference',
        }
      )

  if args.limit > 0:
    candidates = candidates[: args.limit]

  if args.dry_run:
    print(
      json.dumps(
        {
          'planned': [
            {
              'character_id': item['character_id'],
              'output_path': str(item['output_path']),
              'reference_id': item['reference'].get('id'),
            }
            for item in candidates
          ],
          'series_slug': args.series_slug,
        },
        indent=2,
      )
    )
    return 0

  rendered = []
  failed = []
  for item in candidates:
    if item.get('reference_type') == 'bubble_style_toolkit':
      prompt = build_bubble_toolkit_prompt(
        series_slug=args.series_slug,
        style_bible=bubble_style_bible,
        reference=item['reference'],
      )
    else:
      prompt = build_prompt(item['profile'], item['reference'])
    try:
      run_image_generator(
        codex_image_script=codex_image_script,
        output_path=item['output_path'],
        prompt=prompt,
      )
      rendered.append(
        {
          'character_id': item['character_id'],
          'output_path': str(item['output_path']),
          'reference_id': item['reference'].get('id'),
          'reference_type': item.get('reference_type'),
        }
      )
    except subprocess.CalledProcessError as error:
      failed.append(
        {
          'character_id': item['character_id'],
          'exit_code': error.returncode,
          'reference_id': item['reference'].get('id'),
          'reference_type': item.get('reference_type'),
        }
      )

  print(json.dumps({'failed': failed, 'rendered': rendered}, indent=2))
  return 1 if failed else 0


if __name__ == '__main__':
  raise SystemExit(main())
