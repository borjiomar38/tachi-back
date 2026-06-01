#!/usr/bin/env python3
"""Generate queued Nayovi social images through Codex CLI only.

This renderer never calls OpenAI image APIs and never creates procedural
placeholder art. It asks the installed Codex CLI to use its built-in imagegen
tool, then writes the generated PNG path back into the JSONL queue only when a
validated bitmap is produced.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import pathlib
import re
import subprocess
import tempfile
from typing import Any


DEFAULT_IMAGE_DIR = pathlib.Path('/var/lib/tachi-seo-distribution-agent/generated-images')
DEFAULT_CODEX_IMAGE_SCRIPT = pathlib.Path('/usr/local/bin/tachi-codex-image-generator')
PROMOTABLE_STATUSES = {'draft', 'owner_review_required'}
ALLOWED_PROMOTED_STATUSES = {'approved', 'auto_publish', 'owner_review_required', 'draft'}

LEAD_ARCHETYPES = {
  'male_hero': 'one original powerful male hero with a memorable silhouette, heroic but not copied from any existing series',
  'female_heroine': 'one original powerful female heroine with a memorable silhouette, heroic but not copied from any existing series',
  'duo_team': 'two original leads or a small team with clear complementary silhouettes and shared story stakes',
  'antihero': 'one original dark antihero with a morally dangerous aura, strong silhouette, and readable emotional conflict',
  'creature_threat': 'one iconic original monster, spirit, dragon, or cosmic threat as the central poster presence with a human-scale figure for drama',
  'ensemble': 'an original ensemble cast with one clear focal lead and varied silhouettes, avoiding clutter',
}

DEFAULT_ROTATION = [
  'male_hero',
  'male_hero',
  'male_hero',
  'male_hero',
  'female_heroine',
  'female_heroine',
  'female_heroine',
  'female_heroine',
  'duo_team',
  'antihero',
]


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description='Generate social queue images with Codex CLI imagegen.')
  parser.add_argument('--queue-file', required=True)
  parser.add_argument('--image-dir', default=str(DEFAULT_IMAGE_DIR))
  parser.add_argument('--statuses', default='draft,owner_review_required,approved,auto_publish')
  parser.add_argument('--limit', type=int, default=20)
  parser.add_argument('--force', action='store_true')
  parser.add_argument('--codex-image-script', default=str(DEFAULT_CODEX_IMAGE_SCRIPT))
  parser.add_argument(
    '--promote-rendered-status',
    default=os.environ.get('SEO_AGENT_SOCIAL_IMAGE_PROMOTE_RENDERED_STATUS', ''),
    help='Optional status to set on draft/owner_review_required items after a valid image is generated.',
  )
  return parser.parse_args()


def safe_filename(value: str) -> str:
  normalized = re.sub(r'[^a-zA-Z0-9._-]+', '-', value).strip('-._')
  return normalized[:96] or 'social-image'


def normalize_lead_archetype(value: str) -> str | None:
  normalized = re.sub(r'[^a-z0-9]+', '_', value.lower()).strip('_')
  if normalized in LEAD_ARCHETYPES:
    return normalized
  if 'male' in normalized or normalized in {'hero', 'man', 'boy'}:
    return 'male_hero'
  if 'female' in normalized or 'heroine' in normalized or normalized in {'woman', 'girl'}:
    return 'female_heroine'
  if 'duo' in normalized or 'team' in normalized or 'pair' in normalized:
    return 'duo_team'
  if 'anti' in normalized or 'villain' in normalized or 'rogue' in normalized:
    return 'antihero'
  if 'creature' in normalized or 'monster' in normalized or 'dragon' in normalized or 'spirit' in normalized:
    return 'creature_threat'
  if 'ensemble' in normalized or 'cast' in normalized or 'group' in normalized:
    return 'ensemble'
  return None


def choose_lead_archetype(item: dict[str, Any]) -> tuple[str, str]:
  requested = str(
    item.get('lead_archetype')
    or item.get('character_archetype')
    or item.get('protagonist_archetype')
    or ''
  )
  normalized = normalize_lead_archetype(requested)
  if normalized:
    return normalized, LEAD_ARCHETYPES[normalized]

  seed = str(item.get('id') or item.get('story_title') or item.get('message') or 'nayovi')
  digest = hashlib.sha256(seed.encode('utf-8')).digest()
  fallback = DEFAULT_ROTATION[digest[0] % len(DEFAULT_ROTATION)]
  return fallback, LEAD_ARCHETYPES[fallback]


def read_queue(path: pathlib.Path) -> list[dict[str, Any]]:
  if not path.exists():
    return []

  items: list[dict[str, Any]] = []
  for raw_line in path.read_text(encoding='utf-8').splitlines():
    line = raw_line.strip()
    if not line or line.startswith('#'):
      items.append({'_raw': raw_line})
      continue
    item = json.loads(line)
    if not isinstance(item, dict):
      raise ValueError(f'{path}: queue line must be a JSON object')
    items.append(item)
  return items


def write_queue(path: pathlib.Path, items: list[dict[str, Any]]) -> None:
  lines: list[str] = []
  for item in items:
    raw = item.get('_raw')
    if raw is not None:
      lines.append(str(raw))
      continue
    clean = {key: value for key, value in item.items() if not key.startswith('_')}
    lines.append(json.dumps(clean, ensure_ascii=False, separators=(',', ':')))

  payload = '\n'.join(lines).rstrip() + '\n'
  with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=path.parent, delete=False) as handle:
    handle.write(payload)
    tmp_name = handle.name
  pathlib.Path(tmp_name).replace(path)


def build_image_prompt(item: dict[str, Any]) -> str:
  title = str(item.get('story_title') or item.get('id') or 'Invented manhwa story').strip()
  hook = str(item.get('story_hook') or '').strip()
  message = str(item.get('message') or '').strip()
  genre = str(item.get('genre') or 'epic fantasy').strip()
  visual_style = str(item.get('visual_style') or '').strip()
  image_prompt = str(item.get('image_prompt') or '').strip()
  lead_key, lead_description = choose_lead_archetype(item)

  primary_request = image_prompt or (
    f'Original epic manhwa poster for an invented story titled {title}. '
    f'{hook} {message[:900]} Feature {lead_description}.'
  )

  return '\n'.join([
    'Use case: illustration-story',
    'Asset type: Facebook Page manhwa poster for Nayovi',
    f'Primary request: {primary_request}',
    f'Story title: {title}',
    f'Story hook: {hook}',
    f'Genre: {genre}',
    f'Lead archetype: {lead_key} - {lead_description}',
    f'Style/medium: {visual_style or "polished Korean manhwa cover art, cinematic commercial key art"}',
    'Composition/framing: 16:9 landscape poster, the requested lead archetype must be visually obvious, strong silhouette, epic background, high contrast, social-feed readable.',
    'Lighting/mood: dramatic, powerful, emotional, mysterious, premium poster lighting.',
    'Constraints: original invented character and setting; no copyrighted characters; no manga panels; no device mockups; no software interface; no Nayovi logo; no readable text; no watermark; no fake typography; no sexualized minors.',
    'Avoid: always defaulting to female leads, developer imagery, OCR diagrams, translation UI, generic stock art, weak placeholder graphics, low-detail procedural art.',
  ])


def should_render(item: dict[str, Any], statuses: set[str], force: bool) -> bool:
  if item.get('_raw') is not None:
    return False
  if str(item.get('platform') or '').lower() not in {'facebook', 'facebook_page'}:
    return False
  if str(item.get('status') or '').lower() not in statuses:
    return False
  if item.get('image_url'):
    return False

  image_path_value = str(item.get('image_path') or '').strip()
  if image_path_value and pathlib.Path(image_path_value).exists() and not force:
    return False

  return bool(str(item.get('id') or '').strip())


def main() -> int:
  args = parse_args()
  queue_file = pathlib.Path(args.queue_file)
  image_dir = pathlib.Path(args.image_dir)
  codex_image_script = pathlib.Path(args.codex_image_script)
  statuses = {status.strip().lower() for status in args.statuses.split(',') if status.strip()}
  promote_rendered_status = str(args.promote_rendered_status or '').strip().lower()
  items = read_queue(queue_file)
  rendered = 0
  failures = 0

  if promote_rendered_status and promote_rendered_status not in ALLOWED_PROMOTED_STATUSES:
    print(f'Invalid promoted status: {promote_rendered_status}')
    return 2

  if not codex_image_script.exists() or not codex_image_script.is_file():
    print(f'Codex image script is missing: {codex_image_script}')
    return 2

  for item in items:
    if not should_render(item, statuses, args.force):
      continue

    post_id = str(item.get('id') or '').strip()
    output_path = image_dir / f'{safe_filename(post_id)}.png'
    prompt = build_image_prompt(item)

    with tempfile.NamedTemporaryFile('w', encoding='utf-8', suffix='.md', delete=False) as handle:
      handle.write(prompt)
      prompt_path = pathlib.Path(handle.name)

    try:
      subprocess.run(
        [
          str(codex_image_script),
          '--prompt-file',
          str(prompt_path),
          '--output-file',
          str(output_path),
        ],
        check=True,
      )
    except subprocess.CalledProcessError as error:
      failures += 1
      print(f'failed {post_id}: Codex CLI image generation exited {error.returncode}')
    finally:
      prompt_path.unlink(missing_ok=True)

    if output_path.exists():
      item['image_path'] = str(output_path)
      item.setdefault('image_alt', f'Original manhwa-style poster art for {post_id}.')
      item['image_generated_by'] = 'codex-cli-imagegen'
      item['image_generated_at'] = dt.datetime.now(dt.UTC).isoformat().replace('+00:00', 'Z')
      if promote_rendered_status and str(item.get('status') or '').lower() in PROMOTABLE_STATUSES:
        item['status'] = promote_rendered_status
        item['status_promoted_by'] = 'codex-cli-imagegen'
        item['status_promoted_at'] = item['image_generated_at']
      rendered += 1
      print(f'rendered {post_id}: {output_path}')

    if rendered >= args.limit:
      break

  if rendered:
    write_queue(queue_file, items)
    print(f'Updated {rendered} social image(s) in {queue_file}.')
  else:
    print(f'No social images rendered for {queue_file}.')

  return 1 if failures and not rendered else 0


if __name__ == '__main__':
  raise SystemExit(main())
