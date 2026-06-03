#!/usr/bin/env python3
"""Render approved Nayovi Originals chapter panels through Codex CLI imagegen.

This script never calls OpenAI APIs directly and never creates procedural
fallback art. It delegates bitmap generation to the installed Codex CLI image
generator, then records only validated PNG outputs in a small manifest.
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


DEFAULT_CODEX_IMAGE_SCRIPT = pathlib.Path('/usr/local/bin/tachi-codex-image-generator')
DEFAULT_OUTPUT_ROOT = pathlib.Path('docs/manhwa/private')
DEFAULT_BUBBLE_STYLE_BIBLE = (
  'Use one coherent THE ECLIPSE CROWN manhwa lettering system across all panels: '
  'narration uses black rectangular gothic title-card boxes with thin ivory/silver ornamental '
  'filigree borders and elegant white serif lettering; supernatural inner voices use warm ivory '
  'oval/circular bubbles with thin black-silver decorative rings, subtle moonlit glow, elegant '
  'dark serif lettering, and small thought-dot chains pointing to the magical source or the '
  'character receiving the thought; normal spoken dialogue uses clean white/ivory manhwa speech '
  'bubbles with inked outlines, natural tails, subtle paper texture, and the same readable serif '
  'lettering. Keep this bubble style consistent chapter-wide so panels look from the same series.'
)


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(
    description='Render approved Nayovi Originals chapter panels with Codex CLI imagegen.'
  )
  parser.add_argument('--package-file', required=True)
  parser.add_argument('--output-root', default=str(DEFAULT_OUTPUT_ROOT))
  parser.add_argument(
    '--codex-image-script',
    default=os.environ.get('MANHWA_IMAGE_SCRIPT_PATH', str(DEFAULT_CODEX_IMAGE_SCRIPT)),
  )
  parser.add_argument(
    '--context-dir',
    default=os.environ.get('MANHWA_CONTEXT_DIR', ''),
    help='Optional series context directory containing bubble and character style bibles.',
  )
  parser.add_argument('--force', action='store_true')
  parser.add_argument('--allow-unapproved', action='store_true')
  parser.add_argument(
    '--next-missing',
    action='store_true',
    help='Render only the next missing panel after start-panel; combine with --limit=1 for daily cron.',
  )
  parser.add_argument('--dry-run', action='store_true')
  parser.add_argument('--start-panel', type=int, default=1)
  parser.add_argument('--limit', type=int, default=0)
  return parser.parse_args()


def slugify(value: str, fallback: str) -> str:
  normalized = re.sub(r'[^a-zA-Z0-9]+', '-', value.lower()).strip('-')
  return normalized or fallback


def load_package(path: pathlib.Path) -> dict[str, Any]:
  data = json.loads(path.read_text(encoding='utf-8'))
  if not isinstance(data, dict):
    raise ValueError(f'{path}: expected a JSON object')
  return data


def coerce_dict(value: Any) -> dict[str, Any]:
  return value if isinstance(value, dict) else {}


def coerce_list(value: Any) -> list[Any]:
  return value if isinstance(value, list) else []


def load_json_file(path: pathlib.Path) -> dict[str, Any]:
  if not path.exists():
    return {}
  value = json.loads(path.read_text(encoding='utf-8'))
  return value if isinstance(value, dict) else {}


def load_context(context_dir: pathlib.Path, chapter_number: int) -> dict[str, Any]:
  if not context_dir.exists() or not context_dir.is_dir():
    return {}

  return {
    'bubble_style_bible': load_json_file(context_dir / 'bubble-style-bible.json'),
    'character_assets': load_json_file(context_dir / 'characters' / 'index.json'),
    'chapter': load_json_file(
      context_dir / 'chapters' / f'chapter-{chapter_number:03d}.json'
    ),
    'chapter_index': load_json_file(
      context_dir / 'chapters' / f'chapter-{chapter_number:03d}.index.json'
    ),
    'characters': load_json_file(context_dir / 'characters.json'),
    'characters_index': load_json_file(context_dir / 'characters.index.json'),
    'index': load_json_file(context_dir / 'index.json'),
    'series': load_json_file(context_dir / 'series-bible.json'),
  }


def resolve_context_dir(args: argparse.Namespace, series_slug: str) -> pathlib.Path | None:
  if str(args.context_dir or '').strip():
    return pathlib.Path(args.context_dir)
  default_dir = pathlib.Path('docs/manhwa/context') / series_slug
  return default_dir if default_dir.exists() else None


def character_map(package: dict[str, Any]) -> dict[str, dict[str, Any]]:
  characters: dict[str, dict[str, Any]] = {}
  for raw_character in coerce_list(package.get('characters')):
    character = coerce_dict(raw_character)
    character_id = str(character.get('id') or '').strip()
    if character_id:
      characters[character_id] = character
  return characters


def character_anchor(character: dict[str, Any]) -> str:
  name = str(character.get('name') or character.get('id') or 'Character').strip()
  canon_prompt = str(character.get('canon_prompt') or '').strip()
  if canon_prompt:
    return f'- {name}: {canon_prompt}'
  description = str(character.get('description') or '').strip()
  return f'- {name}: {description}'


def public_path_to_local_file(public_path: str) -> pathlib.Path:
  return pathlib.Path('public') / public_path.lstrip('/')


def reference_local_file(reference: dict[str, Any]) -> pathlib.Path | None:
  local_file = str(reference.get('local_file') or '').strip()
  if local_file:
    return pathlib.Path(local_file)

  public_path = str(reference.get('public_path') or '').strip()
  if public_path:
    return public_path_to_local_file(public_path)

  return None


def split_dialogue_line(line: str) -> tuple[str, str]:
  separator_index = line.find(':')
  if separator_index == -1:
    return ('Unknown speaker', line.strip())
  return (line[:separator_index].strip(), line[separator_index + 1 :].strip())


def build_text_bubble_plan(panel: dict[str, Any]) -> str:
  lines: list[str] = []
  narration = str(panel.get('narration') or '').strip()
  if narration:
    lines.append(
      '- Narration caption: render this exact text inside an integrated manhwa caption box '
      f'placed in atmospheric negative space: "{narration}". This caption explains the story beat; '
      'it must look printed inside the illustrated panel, not like a web UI overlay.'
    )

  dialogue = [str(line).strip() for line in coerce_list(panel.get('dialogue')) if str(line).strip()]
  for index, raw_line in enumerate(dialogue, start=1):
    speaker, text = split_dialogue_line(raw_line)
    bubble_type = 'supernatural thought/whisper bubble' if re.search(
      r'crown|maerith',
      speaker,
      flags=re.IGNORECASE,
    ) else 'speech bubble'
    lines.append(
      f'- Dialogue bubble {index}: owner/speaker is "{speaker}". Render exactly "{text}" inside a '
      f'{bubble_type}. The bubble belongs to {speaker}; the tail, thought dots, or visual direction '
      'must point toward that speaker, their face, hand, reflection, relic, or magical source. Do not '
      'print the speaker name in the bubble unless it is part of the dialogue text.'
    )

  if not lines:
    lines.append('- No readable text or dialogue bubbles are required in this panel.')

  return '\n'.join(lines)


def default_background_text(panel_number: int) -> str:
  defaults = {
    1: 'Imperial Prison - three hours before execution',
    5: 'Northern Duchy - before dawn',
    7: 'Execution Plaza',
  }
  return defaults.get(panel_number, '')


def build_background_text_plan(
  *,
  context: dict[str, Any],
  panel: dict[str, Any],
  panel_number: int,
) -> str:
  background_text = str(panel.get('background_text') or '').strip()
  if not background_text:
    background_text = str(context_panel(context, panel_number).get('background_text') or '').strip()
  if not background_text:
    background_text = default_background_text(panel_number)

  if not background_text:
    return (
      'No extra background/location text is required. Do not invent random decorative words.'
    )

  return (
    f'Render this exact optional environment caption only if it fits naturally: "{background_text}". '
    'It should feel like part of the manhwa art direction, such as a small atmospheric location/time '
    'caption, carved plaque, ritual title card, or background story label. It must stay readable, '
    'short, beautiful, and subordinate to the main art.'
  )


def context_panel(context: dict[str, Any], panel_number: int) -> dict[str, Any]:
  chapter_index = coerce_dict(context.get('chapter_index'))
  panel_lookup = coerce_dict(chapter_index.get('panel_lookup'))
  indexed_panel = coerce_dict(panel_lookup.get(str(panel_number)))

  chapter = coerce_dict(context.get('chapter'))
  panels = coerce_list(chapter.get('panels'))
  for raw_panel in panels:
    panel = coerce_dict(raw_panel)
    if int(panel.get('panel_number') or 0) == panel_number:
      return {**indexed_panel, **panel}
  return indexed_panel


def build_lettering_plan(
  *,
  context: dict[str, Any],
  panel: dict[str, Any],
  panel_number: int,
) -> str:
  lettering_plan = str(panel.get('lettering_plan') or '').strip()
  if not lettering_plan:
    lettering_plan = str(context_panel(context, panel_number).get('lettering_plan') or '').strip()
  if lettering_plan:
    return lettering_plan
  return (
    'Use creative, beautiful, highly visible manhwa lettering: elegant dark-fantasy serif or '
    'hand-lettered typography, strong contrast, clean line breaks, readable on mobile, and styled '
    'as part of the drawn panel rather than UI text.'
  )


def bubble_style_bible(package: dict[str, Any], context: dict[str, Any]) -> str:
  context_style = coerce_dict(context.get('bubble_style_bible'))
  if context_style:
    return json.dumps(context_style, ensure_ascii=False, indent=2)

  continuity = coerce_dict(package.get('image_continuity_rules'))
  custom_style = str(
    continuity.get('bubble_style_bible') or continuity.get('lettering_style_bible') or ''
  ).strip()
  return custom_style or DEFAULT_BUBBLE_STYLE_BIBLE


def build_bubble_layout_plan(
  *,
  context: dict[str, Any],
  panel: dict[str, Any],
  panel_number: int,
) -> str:
  bubble_layout_plan = str(panel.get('bubble_layout_plan') or '').strip()
  if not bubble_layout_plan:
    bubble_layout_plan = str(
      context_panel(context, panel_number).get('bubble_layout_plan') or ''
    ).strip()
  if bubble_layout_plan:
    return bubble_layout_plan
  return (
    'Place every bubble beside or above the character/relic that owns the thought or speech. '
    'The tail, thought dots, glow, or visual direction must clearly connect the text to that '
    'speaker/source so the reader immediately understands who is thinking or talking.'
  )


def build_visual_continuity_plan(
  *,
  context: dict[str, Any],
  panel_number: int,
) -> str:
  panel = context_panel(context, panel_number)
  parts = []
  image_prompt_addendum = str(panel.get('image_prompt_addendum') or '').strip()
  visual_continuity_in = str(panel.get('visual_continuity_in') or '').strip()
  top_anchor = str(panel.get('top_anchor') or '').strip()
  bottom_anchor = str(panel.get('bottom_anchor') or '').strip()

  if visual_continuity_in:
    parts.append(f'- Incoming continuity: {visual_continuity_in}')
  if image_prompt_addendum:
    parts.append(f'- Panel-specific visual addendum: {image_prompt_addendum}')
  if top_anchor:
    parts.append(f'- Top edge anchor: {top_anchor}')
  if bottom_anchor:
    parts.append(f'- Bottom edge anchor: {bottom_anchor}')

  if not parts:
    return (
      'Use the package vertical continuity note and keep the panel visually connected to the '
      'previous and next panel.'
    )

  return '\n'.join(parts)


def previous_panel_reference_context(
  *,
  output_dir: pathlib.Path,
  panel_number: int,
) -> str:
  if panel_number <= 1:
    return '- No previous reader panel exists. Establish the opening image clearly.'

  previous_path = panel_output_path(output_dir, panel_number - 1)
  if not previous_path.exists():
    return (
      f'- Previous panel file is not available yet: {previous_path.resolve()}. '
      'Use indexed top/bottom anchors and written continuity context only.'
    )

  return '\n'.join(
    [
      f'- Previous panel image file: {previous_path.resolve()}',
      '- Inspect this local image before generating the new panel.',
      '- Continue from the bottom edge of the previous image: preserve the same scene, lighting, camera direction, visible cropped body parts, chains, hair, floor, architecture, bubble style, and vertical scroll rhythm.',
      '- Do not copy the previous image as a duplicate; generate the next original panel that naturally extends it.',
    ]
  )


def character_bubble_context(
  *,
  context: dict[str, Any],
  panel: dict[str, Any],
) -> str:
  characters_context = coerce_dict(context.get('characters'))
  characters_index = coerce_dict(context.get('characters_index'))
  indexed_by_id = coerce_dict(characters_index.get('byId'))
  speaker_aliases = coerce_dict(characters_index.get('speakerAliases'))
  characters = coerce_list(characters_context.get('characters'))
  by_name = {
    str(character.get('name') or '').strip().lower(): coerce_dict(character)
    for character in characters
    if isinstance(character, dict)
  }
  by_id = {
    str(character.get('id') or '').strip().lower(): coerce_dict(character)
    for character in characters
    if isinstance(character, dict)
  }

  speaker_names = []
  for raw_line in coerce_list(panel.get('dialogue')):
    speaker, _text = split_dialogue_line(str(raw_line))
    speaker_names.append(speaker.strip().lower())
  for character_id in coerce_list(panel.get('characters_present')):
    speaker_names.append(str(character_id).strip().lower())

  entries = []
  for speaker_key in dict.fromkeys(speaker_names):
    indexed_id = str(speaker_aliases.get(speaker_key) or speaker_key)
    character = coerce_dict(indexed_by_id.get(indexed_id)) or by_name.get(speaker_key) or by_id.get(speaker_key)
    if not character:
      continue
    bubble_style = str(character.get('bubble_style') or '').strip()
    thought_style = str(character.get('thought_style') or '').strip()
    placement_rule = str(character.get('bubble_placement_rule') or '').strip()
    if bubble_style or thought_style or placement_rule:
      entries.append(
        f'- {character.get("name") or character.get("id")}: '
        f'bubble_style={bubble_style or "default"}; '
        f'thought_style={thought_style or "default"}; '
        f'placement={placement_rule or "place near speaker/source"}.'
      )

  return '\n'.join(entries) if entries else '- Use the series bubble style bible.'


def character_reference_context(
  *,
  context: dict[str, Any],
  panel: dict[str, Any],
) -> str:
  characters_index = coerce_dict(context.get('characters_index'))
  indexed_by_id = coerce_dict(characters_index.get('byId'))
  lines: list[str] = []

  for character_id in coerce_list(panel.get('characters_present')):
    character = coerce_dict(indexed_by_id.get(str(character_id)))
    if not character:
      continue
    reference_images = coerce_list(character.get('reference_images'))[:5]
    pose_bank = coerce_list(character.get('pose_bank'))[:5]
    reference_paths = [
      str(reference.get('public_path') or '').strip()
      for reference in reference_images
      if str(reference.get('public_path') or '').strip()
    ]
    reference_file_lines = []
    for reference in reference_images:
      public_path = str(reference.get('public_path') or '').strip()
      local_file = reference_local_file(reference)
      if not public_path and not local_file:
        continue
      reference_file_lines.append(
        (
          f'{reference.get("id")}: '
          f'{"generated" if local_file and local_file.exists() else "missing"}; '
          f'protected={reference.get("protected_path") or public_path}; '
          f'local_file={local_file.resolve() if local_file else "missing"}'
        )
      )
    pose_lines = [
      f'{pose.get("id")}: {pose.get("description")}'
      for pose in pose_bank
      if isinstance(pose, dict)
    ]
    lines.append(
      '\n'.join(
        [
          f'- {character.get("name") or character_id}: use this character folder before rendering if references exist.',
          f'  Canon: {character.get("canon_prompt") or ""}',
          f'  Planned/generated reference paths: {", ".join(reference_paths) if reference_paths else "not generated yet"}',
          f'  Local reference files: {" | ".join(reference_file_lines) if reference_file_lines else "not generated yet"}',
          f'  Pose bank: {" | ".join(pose_lines) if pose_lines else "default pose continuity"}',
          '  Hard rule: inspect generated local reference files when present, then preserve face, body proportions, costume, hair, scars, accessories, and non-sexualized framing.',
        ]
      )
    )

  return '\n'.join(lines) if lines else '- No recurring character reference folder is required for this panel.'


def panel_has_required_text(panel: dict[str, Any]) -> bool:
  return bool(str(panel.get('narration') or '').strip()) or any(
    str(line).strip() for line in coerce_list(panel.get('dialogue'))
  )


def clean_negative_prompt_for_panel(negative_prompt: str, panel: dict[str, Any]) -> str:
  if not panel_has_required_text(panel):
    return negative_prompt

  cleaned = negative_prompt
  blocked_phrases = [
    'No real or fake readable text, ',
    'no real or fake readable text, ',
    'No real or fake readable text',
    'no real or fake readable text',
    'No readable text, ',
    'no readable text, ',
    'No readable text',
    'no readable text',
  ]
  for phrase in blocked_phrases:
    cleaned = cleaned.replace(phrase, '')
  return cleaned.strip(' ,')


def build_panel_prompt(
  *,
  characters: dict[str, dict[str, Any]],
  package: dict[str, Any],
  panel: dict[str, Any],
  series: dict[str, Any],
  chapter: dict[str, Any],
  context: dict[str, Any],
  output_dir: pathlib.Path,
) -> str:
  continuity = coerce_dict(package.get('image_continuity_rules'))
  panel_number = int(panel.get('panel_number') or 0)
  has_required_text = panel_has_required_text(panel)
  present_ids = [str(value) for value in coerce_list(panel.get('characters_present'))]
  anchors = [
    character_anchor(characters[character_id])
    for character_id in present_ids
    if character_id in characters
  ]

  return '\n'.join(
    [
      'Use case: illustration-story',
      'Asset type: original vertical manhwa reader panel for Nayovi Originals',
      f'Series: {str(series.get("title") or "Original Nayovi manhwa").strip()}',
      f'Chapter {chapter.get("chapter_number")}: {str(chapter.get("title") or "").strip()}',
      f'Panel: {panel_number}',
      '',
      'Primary image request:',
      str(panel.get('image_prompt') or '').strip(),
      '',
      'Indexed visual continuity context:',
      build_visual_continuity_plan(context=context, panel_number=panel_number),
      '',
      'Previous panel visual reference:',
      previous_panel_reference_context(output_dir=output_dir, panel_number=panel_number),
      '',
      'Continuity priority:',
      (
        'The previous panel visual reference and indexed visual continuity context are mandatory. '
        'If they conflict with the primary image request, preserve the story beat but follow the '
        'reference image and indexed continuity so the vertical scroll feels like one connected '
        'manhwa sequence.'
      ),
      '',
      'Text override for this final reader panel:',
      (
        'If any inherited prompt line says "no readable text", override it for the specified '
        'narration caption and dialogue bubbles only. Required bubble/caption text must be '
        'generated in-image. Text outside the specified bubbles and captions remains forbidden.'
        if has_required_text
        else 'No in-image text is required for this panel.'
      ),
      '',
      'Narrative beat:',
      str(panel.get('narration') or '').strip(),
      '',
      'In-image text and bubble ownership plan:',
      build_text_bubble_plan(panel),
      '',
      'Creative lettering plan:',
      build_lettering_plan(context=context, panel=panel, panel_number=panel_number),
      '',
      'Series bubble and lettering style bible:',
      bubble_style_bible(package, context),
      '',
      'Character-specific bubble context:',
      character_bubble_context(context=context, panel=panel),
      '',
      'Bubble placement and ownership direction:',
      build_bubble_layout_plan(context=context, panel=panel, panel_number=panel_number),
      '',
      'Optional background/story text plan:',
      build_background_text_plan(context=context, panel=panel, panel_number=panel_number),
      '',
      'Integrated manhwa lettering rules:',
      (
        'The final image itself must include the required caption and dialogue bubbles as part of '
        'the artwork. Use clean but artistic manhwa/webtoon bubble art: white, black, warm ivory, '
        'moonlit silver, or character-colored fills where appropriate; inked outlines; natural tails; '
        'thought dots for inner/supernatural voices; glow or texture when it belongs to the magic. '
        'Use creative visible typography, not plain UI text. Compose the scene around the bubbles so '
        'they feel planned inside the panel; do not cover the main face or important action. Render '
        'only the exact provided story text and approved optional background_text. Do not invent '
        'extra text, random letters, subtitles, labels, logos, scan-group marks, or watermarks.'
      ),
      '',
      'Character identity anchors for consistency:',
      '\n'.join(anchors) if anchors else '- No recurring character close-up in this panel.',
      '',
      'Indexed character reference folders:',
      character_reference_context(context=context, panel=panel),
      '',
      'Vertical continuity note:',
      str(panel.get('vertical_continuity_note') or '').strip(),
      '',
      'Global style:',
      str(continuity.get('global_style') or '').strip(),
      '',
      'Composition:',
      (
        'Tall 9:16 vertical webtoon/manhwa panel, cinematic crop, coherent with the previous '
        'and next panel, premium Korean manhwa cover/panel finish, expressive faces, strong '
        'value contrast, modest non-pin-up framing, no cleavage emphasis, no thigh exposure, '
        'no sexualized prison or execution imagery. This is a finished reader panel with integrated '
        'manhwa text bubbles and narration captions generated directly in the image.'
      ),
      '',
      'Negative prompt:',
      clean_negative_prompt_for_panel(
        str(continuity.get('negative_prompt') or '').strip(),
        panel,
      ),
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
  env.setdefault('CODEX_IMAGE_MIN_WIDTH', '900')
  env.setdefault('CODEX_IMAGE_MIN_HEIGHT', '1200')

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


def manifest_path(output_dir: pathlib.Path, chapter_number: int) -> pathlib.Path:
  return output_dir / f'chapter-{chapter_number:03d}-images.json'


def panel_output_path(output_dir: pathlib.Path, panel_number: int) -> pathlib.Path:
  return output_dir / f'panel-{panel_number:03d}.png'


def public_path(path: pathlib.Path) -> str:
  parts = path.parts
  if 'private' in parts:
    private_index = parts.index('private')
    private_parts = parts[private_index + 1 :]
    if len(private_parts) >= 3:
      series_slug = private_parts[0]
      chapter_match = re.fullmatch(r'chapter-(\d+)', private_parts[1])
      panel_match = re.fullmatch(r'panel-(\d+)\.png', private_parts[2])
      if chapter_match and panel_match:
        return (
          f'/api/manhwa-private/{series_slug}/chapter/'
          f'{int(chapter_match.group(1))}/panel/{int(panel_match.group(1))}'
        )
  if 'public' not in parts:
    return str(path)
  public_index = parts.index('public')
  return '/' + '/'.join(parts[public_index + 1 :])


def main() -> int:
  args = parse_args()
  package_file = pathlib.Path(args.package_file)
  package = load_package(package_file)
  status = str(package.get('publication_status') or '').strip()
  if not args.allow_unapproved and status != 'approved_by_expert_ai':
    raise SystemExit(
      f'{package_file} is not approved_by_expert_ai; refusing image generation for status {status!r}.'
    )

  codex_image_script = pathlib.Path(args.codex_image_script)
  if not codex_image_script.exists():
    local_script = pathlib.Path(__file__).with_name('generate-codex-image.sh')
    if local_script.exists():
      codex_image_script = local_script
    else:
      raise SystemExit(f'Codex image script is missing: {codex_image_script}')

  series = coerce_dict(package.get('series'))
  chapter = coerce_dict(package.get('chapter'))
  panels = [coerce_dict(panel) for panel in coerce_list(package.get('panels'))]
  chapter_number = int(chapter.get('chapter_number') or 1)
  series_slug = str(series.get('slug') or '').strip() or slugify(
    str(series.get('title') or package_file.stem), 'nayovi-original'
  )
  output_root = pathlib.Path(args.output_root)
  output_dir = output_root / series_slug / f'chapter-{chapter_number:03d}'
  characters = character_map(package)
  context_dir = resolve_context_dir(args, series_slug)
  context = load_context(context_dir, chapter_number) if context_dir else {}
  rendered_this_run: list[dict[str, Any]] = []
  failed: list[dict[str, Any]] = []

  eligible_panels = [
    panel
    for panel in panels
    if int(panel.get('panel_number') or 0) >= args.start_panel
  ]
  if args.next_missing:
    eligible_panels = [
      panel
      for panel in eligible_panels
      if not panel_output_path(output_dir, int(panel.get('panel_number') or 0)).exists()
    ]
  if args.limit > 0:
    eligible_panels = eligible_panels[: args.limit]

  if args.dry_run:
    print(
      json.dumps(
        {
          'chapter_number': chapter_number,
          'daily_mode': args.next_missing and args.limit == 1,
          'planned_panel_numbers': [
            int(panel.get('panel_number') or 0)
            for panel in eligible_panels
            if int(panel.get('panel_number') or 0) > 0
          ],
          'series_slug': series_slug,
        },
        indent=2,
      )
    )
    return 0

  for panel in eligible_panels:
    panel_number = int(panel.get('panel_number') or 0)
    if panel_number <= 0:
      continue
    output_path = panel_output_path(output_dir, panel_number)
    if output_path.exists() and not args.force:
      print(f'skipping panel {panel_number}: {output_path} already exists')
    else:
      prompt = build_panel_prompt(
        characters=characters,
        package=package,
        panel=panel,
        series=series,
        chapter=chapter,
        context=context,
        output_dir=output_dir,
      )
      try:
        run_image_generator(
          codex_image_script=codex_image_script,
          output_path=output_path,
          prompt=prompt,
        )
      except subprocess.CalledProcessError as error:
        failed.append(
          {
            'panel_number': panel_number,
            'phase': 'image_generation',
            'exit_code': error.returncode,
          }
        )
        print(f'failed panel {panel_number}: image generator exited {error.returncode}')
        continue

    if output_path.exists():
      rendered_this_run.append(
        {
          'panel_number': panel_number,
          'image_path': public_path(output_path),
          'source_prompt': str(panel.get('image_prompt') or '').strip(),
        }
      )

  available_images = []
  for panel in panels:
    panel_number = int(panel.get('panel_number') or 0)
    if panel_number <= 0:
      continue
    output_path = panel_output_path(output_dir, panel_number)
    if output_path.exists():
      available_images.append(
        {
          'panel_number': panel_number,
          'image_path': public_path(output_path),
          'source_prompt': str(panel.get('image_prompt') or '').strip(),
        }
      )

  manifest = {
    'generated_at': dt.datetime.now(dt.UTC).isoformat().replace('+00:00', 'Z'),
    'package_file': str(package_file),
    'publication_status': status,
    'series_slug': series_slug,
    'chapter_number': chapter_number,
    'context_dir': str(context_dir) if context_dir else None,
    'image_generator': str(codex_image_script),
    'daily_mode': args.next_missing and args.limit == 1,
    'rendered': available_images,
    'rendered_this_run': rendered_this_run,
    'failed': failed,
  }
  output_dir.mkdir(parents=True, exist_ok=True)
  manifest_path(output_dir, chapter_number).write_text(
    json.dumps(manifest, ensure_ascii=False, indent=2) + '\n',
    encoding='utf-8',
  )

  print(
    json.dumps(
      {
        'chapter_number': chapter_number,
        'available_images': len(available_images),
        'failed': len(failed),
        'manifest': str(manifest_path(output_dir, chapter_number)),
        'rendered_this_run': len(rendered_this_run),
        'series_slug': series_slug,
      },
      indent=2,
    )
  )
  return 1 if failed else 0


if __name__ == '__main__':
  raise SystemExit(main())
