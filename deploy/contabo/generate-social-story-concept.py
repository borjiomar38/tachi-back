#!/usr/bin/env python3
"""Improve Nayovi Facebook story posts with Codex CLI text generation only."""

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


DEFAULT_CODEX_BIN = 'codex'
DEFAULT_MODEL = 'gpt-5.5'
DEFAULT_REASONING_EFFORT = 'medium'
DEFAULT_STATUS_SET = 'draft,owner_review_required'
CTA = 'Install Nayovi on Android:\nhttps://nayovi.com/download'

LEAD_ARCHETYPES = {
  'male_hero',
  'female_heroine',
  'duo_team',
  'antihero',
  'creature_threat',
  'ensemble',
}

LEAD_ROTATION = [
  'male_hero',
  'male_hero',
  'female_heroine',
  'female_heroine',
  'duo_team',
  'antihero',
  'male_hero',
  'female_heroine',
  'creature_threat',
  'ensemble',
]

SUBGENRES = {
  'murim': 'Murim martial-arts fantasy: sword sects, qi, heavenly demon rumors, mountain pavilions, rival clans, blood oaths.',
  'regressed_duke': 'Regressed duke/noble returner: a betrayed duke wakes before execution, court politics, war banners, cold revenge, second life.',
  'tower_hunter': 'Tower hunter fantasy: gates, hunters, ranked floors, relic trials, monsters, party betrayal, impossible rank-up.',
  'constellation_academy': 'Constellation academy fantasy: academy duel, star patrons, sealed classrooms, prophecy, rank exams, forbidden power.',
  'villainess_duchess': 'Villainess or duchess political fantasy: noble court, contract marriage tension, revenge, masked balls, secret magic.',
  'necromancer_returner': 'Necromancer returner fantasy: battlefield revival, bone crowns, ruined empire, second chance, dark power with rules.',
}

SUBGENRE_ROTATION = [
  'murim',
  'regressed_duke',
  'tower_hunter',
  'constellation_academy',
  'villainess_duchess',
  'necromancer_returner',
  'murim',
  'regressed_duke',
]

BLOCKED_MESSAGE_PHRASES = {
  'api',
  'backlink',
  'citation ladder',
  'compliance checklist',
  'developer',
  'image prompt',
  'metadata',
  'no-link-first',
  'ocr checklist',
  'schema',
  'seo',
  'workflow',
}

VISUAL_REPLACEMENTS = {
  'app screen': 'software interface',
  'app ui': 'software interface',
  'mobile app': 'software interface',
  'phone': 'device mockup',
  'screenshot': 'captured screen',
  'smartphone': 'device mockup',
  'ui mockup': 'software interface',
}


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description='Generate better story-first Facebook queue concepts with Codex CLI.')
  parser.add_argument('--queue-file', required=True)
  parser.add_argument('--statuses', default=os.environ.get('SEO_AGENT_SOCIAL_STORY_STATUSES', DEFAULT_STATUS_SET))
  parser.add_argument('--limit', type=int, default=int(os.environ.get('SEO_AGENT_SOCIAL_STORY_LIMIT', '1') or '1'))
  parser.add_argument('--force', action='store_true')
  parser.add_argument('--codex-bin', default=os.environ.get('SEO_AGENT_SOCIAL_STORY_CODEX_CLI_PATH', DEFAULT_CODEX_BIN))
  parser.add_argument('--model', default=os.environ.get('SEO_AGENT_SOCIAL_STORY_CODEX_MODEL', DEFAULT_MODEL))
  parser.add_argument(
    '--reasoning-effort',
    default=os.environ.get('SEO_AGENT_SOCIAL_STORY_CODEX_REASONING_EFFORT', DEFAULT_REASONING_EFFORT),
  )
  return parser.parse_args()


def stable_choice(seed: str, options: list[str]) -> str:
  digest = hashlib.sha256(seed.encode('utf-8')).digest()
  return options[digest[0] % len(options)]


def normalize_lead_archetype(value: str) -> str | None:
  normalized = re.sub(r'[^a-z0-9]+', '_', value.lower()).strip('_')
  if normalized in LEAD_ARCHETYPES:
    return normalized
  if 'duo' in normalized or 'team' in normalized:
    return 'duo_team'
  if 'anti' in normalized:
    return 'antihero'
  if 'creature' in normalized or 'monster' in normalized or 'dragon' in normalized:
    return 'creature_threat'
  if 'ensemble' in normalized or 'group' in normalized:
    return 'ensemble'
  if 'female' in normalized or 'heroine' in normalized or normalized in {'girl', 'woman'}:
    return 'female_heroine'
  if 'male' in normalized or 'hero' in normalized or normalized in {'boy', 'man'}:
    return 'male_hero'
  return None


def choose_lead_archetype(item: dict[str, Any]) -> str:
  requested = normalize_lead_archetype(str(item.get('lead_archetype') or ''))
  if requested:
    return requested
  return stable_choice(str(item.get('id') or item.get('story_title') or item.get('message') or 'nayovi'), LEAD_ROTATION)


def choose_subgenre(item: dict[str, Any]) -> str:
  haystack = ' '.join(str(item.get(key) or '') for key in ('genre', 'story_title', 'story_hook', 'message')).lower()
  if 'murim' in haystack or 'martial' in haystack or 'sect' in haystack:
    return 'murim'
  if 'duke' in haystack or 'regress' in haystack or 'returner' in haystack:
    return 'regressed_duke'
  if 'tower' in haystack or 'hunter' in haystack:
    return 'tower_hunter'
  return stable_choice(str(item.get('id') or item.get('story_title') or 'nayovi'), SUBGENRE_ROTATION)


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
    if item.get('_raw') is not None:
      lines.append(str(item['_raw']))
      continue
    clean = {key: value for key, value in item.items() if not key.startswith('_')}
    lines.append(json.dumps(clean, ensure_ascii=False, separators=(',', ':')))

  payload = '\n'.join(lines).rstrip() + '\n'
  with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=path.parent, delete=False) as handle:
    handle.write(payload)
    tmp_name = handle.name
  pathlib.Path(tmp_name).replace(path)


def should_generate(item: dict[str, Any], statuses: set[str], model: str, force: bool) -> bool:
  if item.get('_raw') is not None:
    return False
  if str(item.get('platform') or '').lower() not in {'facebook', 'facebook_page'}:
    return False
  if str(item.get('status') or '').lower() not in statuses:
    return False
  if str(item.get('status') or '').lower() == 'archived':
    return False
  if item.get('image_url'):
    return False
  image_path = str(item.get('image_path') or '').strip()
  if image_path and pathlib.Path(image_path).exists() and not force:
    return False
  if str(item.get('story_generated_model') or '') == model and item.get('image_prompt') and item.get('message') and not force:
    return False
  return bool(str(item.get('id') or '').strip())


def sanitize_visual_text(value: str) -> str:
  result = value
  for blocked, replacement in VISUAL_REPLACEMENTS.items():
    result = re.sub(re.escape(blocked), replacement, result, flags=re.IGNORECASE)
  return result


def normalize_message(message: str, title: str) -> str:
  message = message.strip().replace('\r\n', '\n')
  if not message.upper().startswith(title.upper()):
    message = f'{title.upper()}\n\n{message}'
  if 'https://nayovi.com/download' not in message:
    message = f'{message.rstrip()}\n\n{CTA}'
  return message


def validate_generated(payload: dict[str, Any]) -> dict[str, str]:
  required = ['story_title', 'story_hook', 'genre', 'lead_archetype', 'message', 'visual_style', 'image_prompt', 'image_alt']
  cleaned: dict[str, str] = {}
  for key in required:
    value = str(payload.get(key) or '').strip()
    if not value:
      raise ValueError(f'Missing generated field: {key}')
    cleaned[key] = value

  lead = normalize_lead_archetype(cleaned['lead_archetype'])
  if not lead:
    raise ValueError(f'Invalid lead_archetype: {cleaned["lead_archetype"]}')
  cleaned['lead_archetype'] = lead

  title = cleaned['story_title'].upper()
  cleaned['story_title'] = title
  cleaned['message'] = normalize_message(cleaned['message'], title)

  lower_message = cleaned['message'].lower()
  blocked_message = [phrase for phrase in BLOCKED_MESSAGE_PHRASES if contains_blocked_phrase(lower_message, phrase)]
  if blocked_message:
    raise ValueError(f'Generated message contains blocked phrase(s): {", ".join(sorted(blocked_message))}')

  for key in ('visual_style', 'image_prompt', 'image_alt'):
    cleaned[key] = sanitize_visual_text(cleaned[key])
  return cleaned


def contains_blocked_phrase(text: str, phrase: str) -> bool:
  if re.fullmatch(r'[a-z0-9]+', phrase):
    return re.search(rf'(?<![a-z0-9]){re.escape(phrase)}(?![a-z0-9])', text) is not None
  return phrase in text


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
  raise ValueError('Codex output did not contain a JSON object')


def build_prompt(item: dict[str, Any], lead_archetype: str, subgenre: str) -> str:
  current = {key: item.get(key) for key in (
    'id',
    'story_title',
    'story_hook',
    'genre',
    'lead_archetype',
    'message',
    'visual_style',
    'image_prompt',
    'image_alt',
  )}
  return f"""Create one original Facebook Page post concept for Nayovi.

Audience: normal manga/manhwa/manhua readers who like dramatic posters and want to discover an epic invented story.
Language: English.
Target subgenre: {subgenre} — {SUBGENRES[subgenre]}
Target lead archetype: {lead_archetype}

Use the current queue item only as rough seed material. You may completely reinvent the title, plot, and visual concept.

Current queue item:
{json.dumps(current, ensure_ascii=False, indent=2)}

Required creative direction:
- Invent a fictional manhwa people would want to install the APK to read or translate.
- Prioritize popular manhwa hooks: murim sect revenge, regressed duke / second life noble revenge, tower hunter rank-up, constellation academy, villainess duchess politics, necromancer returner.
- Make it feel like a real story teaser, not a prompt, ad, SEO update, product update, or developer note.
- The story cannot mention Nayovi except the final CTA.
- Avoid copyrighted characters, real series names, celebrity names, app screens, software interfaces, readable poster text, device mockups, fake UI, minors sexualization, and unsupported claims.
- Avoid the literal words image prompt, OCR checklist, backlink, metadata, SEO, API, schema, workflow, no-link-first.

Message format:
TITLE IN UPPERCASE

5 to 9 short cinematic story lines.

One simple reader question.

Install Nayovi on Android:
https://nayovi.com/download

Return exactly one JSON object and no prose:
{{
  "story_title": "UPPERCASE INVENTED TITLE",
  "story_hook": "one sentence hook",
  "genre": "{subgenre}",
  "lead_archetype": "{lead_archetype}",
  "message": "full Facebook post using the required format",
  "visual_style": "short visual style phrase for a 16:9 premium manhwa poster",
  "image_prompt": "detailed original poster prompt, no readable text, no logos, no device mockups, no software interfaces, no copyrighted characters",
  "image_alt": "short alt text"
}}
"""


def run_codex(codex_bin: str, model: str, reasoning_effort: str, prompt: str) -> str:
  with tempfile.TemporaryDirectory(prefix='tachi-social-story-') as tmp_dir:
    output_path = pathlib.Path(tmp_dir) / 'codex-output.md'
    subprocess.run(
      [
        codex_bin,
        '-a',
        'never',
        'exec',
        '--skip-git-repo-check',
        '--ephemeral',
        '--sandbox',
        'workspace-write',
        '-C',
        tmp_dir,
        '--model',
        model,
        '-c',
        f'model_reasoning_effort="{reasoning_effort}"',
        '--output-last-message',
        str(output_path),
      ],
      input=prompt,
      text=True,
      check=True,
    )
    return output_path.read_text(encoding='utf-8')


def main() -> int:
  args = parse_args()
  queue_file = pathlib.Path(args.queue_file)
  statuses = {status.strip().lower() for status in args.statuses.split(',') if status.strip()}
  items = read_queue(queue_file)
  generated = 0
  failures = 0

  for item in items:
    if not should_generate(item, statuses, args.model, args.force):
      continue

    post_id = str(item.get('id') or '').strip()
    lead_archetype = choose_lead_archetype(item)
    subgenre = choose_subgenre(item)
    prompt = build_prompt(item, lead_archetype, subgenre)

    try:
      raw_output = run_codex(args.codex_bin, args.model, args.reasoning_effort, prompt)
      generated_payload = validate_generated(extract_json_object(raw_output))
    except (subprocess.CalledProcessError, ValueError) as error:
      failures += 1
      print(f'failed {post_id}: {error}')
      continue

    item.update(generated_payload)
    item['story_subgenre'] = subgenre
    item['story_generated_by'] = 'codex-cli'
    item['story_generated_model'] = args.model
    item['story_generated_at'] = dt.datetime.now(dt.UTC).isoformat().replace('+00:00', 'Z')
    generated += 1
    print(f'generated-story {post_id}: {item["story_title"]} ({subgenre}, {lead_archetype})')

    if generated >= args.limit:
      break

  if generated:
    write_queue(queue_file, items)
    print(f'Updated {generated} social story concept(s) in {queue_file}.')
  else:
    print(f'No social story concepts generated for {queue_file}.')

  return 1 if failures and not generated else 0


if __name__ == '__main__':
  raise SystemExit(main())
