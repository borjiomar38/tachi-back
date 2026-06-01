#!/usr/bin/env python3
"""Render placeholder Nayovi social images for queued posts.

This is a local CLI renderer. It does not call image-generation APIs and does
not read OPENAI_API_KEY. Codex prepares the post/visual direction; this script
turns that direction into an original PNG file and writes image_path back into
the JSONL queue. It is disabled by default for production Facebook posting
and renders draft placeholders only unless statuses are explicitly overridden,
because auto-published story posters require higher-quality generated art.
"""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import math
import pathlib
import random
import re
import struct
import tempfile
import zlib
from typing import Any


DEFAULT_IMAGE_DIR = pathlib.Path('/var/lib/tachi-seo-distribution-agent/generated-images')
DEFAULT_SIZE = 1080


PALETTES: dict[str, tuple[tuple[int, int, int], ...]] = {
  'action': ((11, 20, 38), (230, 64, 52), (255, 179, 71), (38, 198, 218), (245, 247, 250)),
  'romance': ((36, 20, 45), (232, 86, 138), (255, 180, 203), (120, 190, 255), (255, 245, 249)),
  'fantasy': ((20, 31, 43), (96, 214, 166), (123, 93, 255), (255, 214, 102), (240, 255, 248)),
  'noir': ((8, 12, 18), (60, 70, 92), (210, 218, 235), (196, 54, 74), (245, 245, 240)),
  'scifi': ((8, 18, 32), (52, 224, 255), (116, 91, 255), (255, 76, 176), (238, 252, 255)),
  'comedy': ((22, 29, 35), (255, 205, 57), (80, 220, 145), (75, 170, 255), (255, 250, 225)),
  'horror': ((14, 10, 18), (120, 20, 45), (190, 35, 65), (80, 105, 130), (235, 232, 225)),
}


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(description='Render local PNG images for Nayovi social queue items.')
  parser.add_argument('--queue-file', required=True)
  parser.add_argument('--image-dir', default=str(DEFAULT_IMAGE_DIR))
  parser.add_argument('--size', type=int, default=DEFAULT_SIZE)
  parser.add_argument('--statuses', default='draft')
  parser.add_argument('--limit', type=int, default=20)
  parser.add_argument('--force', action='store_true')
  return parser.parse_args()


def safe_filename(value: str) -> str:
  normalized = re.sub(r'[^a-zA-Z0-9._-]+', '-', value).strip('-._')
  return normalized[:96] or 'social-image'


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


def pick_genre(text: str) -> str:
  lowered = text.lower()
  if any(word in lowered for word in ('romance', 'love', 'heart', 'couple', 'soft')):
    return 'romance'
  if any(word in lowered for word in ('fantasy', 'magic', 'dragon', 'kingdom', 'portal')):
    return 'fantasy'
  if any(word in lowered for word in ('noir', 'detective', 'shadow', 'crime', 'urban')):
    return 'noir'
  if any(word in lowered for word in ('sci-fi', 'scifi', 'cyber', 'future', 'neon')):
    return 'scifi'
  if any(word in lowered for word in ('comedy', 'fun', 'chaos', 'light')):
    return 'comedy'
  if any(word in lowered for word in ('horror', 'dark', 'monster', 'curse')):
    return 'horror'
  return 'action'


def clamp(value: float) -> int:
  return max(0, min(255, int(round(value))))


def mix(a: tuple[int, int, int], b: tuple[int, int, int], t: float) -> tuple[int, int, int]:
  return tuple(clamp(a[i] * (1 - t) + b[i] * t) for i in range(3))


def blend(
  image: bytearray,
  width: int,
  height: int,
  x: int,
  y: int,
  color: tuple[int, int, int],
  alpha: float,
) -> None:
  if x < 0 or y < 0 or x >= width or y >= height:
    return
  index = (y * width + x) * 3
  inv = 1 - alpha
  image[index] = clamp(image[index] * inv + color[0] * alpha)
  image[index + 1] = clamp(image[index + 1] * inv + color[1] * alpha)
  image[index + 2] = clamp(image[index + 2] * inv + color[2] * alpha)


def rect(
  image: bytearray,
  width: int,
  height: int,
  x0: int,
  y0: int,
  x1: int,
  y1: int,
  color: tuple[int, int, int],
  alpha: float = 1.0,
) -> None:
  for y in range(max(0, y0), min(height, y1)):
    for x in range(max(0, x0), min(width, x1)):
      blend(image, width, height, x, y, color, alpha)


def circle(
  image: bytearray,
  width: int,
  height: int,
  cx: int,
  cy: int,
  radius: int,
  color: tuple[int, int, int],
  alpha: float = 1.0,
) -> None:
  r2 = radius * radius
  for y in range(max(0, cy - radius), min(height, cy + radius + 1)):
    dy = y - cy
    for x in range(max(0, cx - radius), min(width, cx + radius + 1)):
      dx = x - cx
      d2 = dx * dx + dy * dy
      if d2 <= r2:
        edge = max(0.0, min(1.0, (radius - math.sqrt(d2)) / max(1, radius * 0.12)))
        blend(image, width, height, x, y, color, alpha * min(1.0, edge + 0.2))


def ellipse(
  image: bytearray,
  width: int,
  height: int,
  cx: int,
  cy: int,
  rx: int,
  ry: int,
  color: tuple[int, int, int],
  alpha: float = 1.0,
) -> None:
  if rx <= 0 or ry <= 0:
    return
  for y in range(max(0, cy - ry), min(height, cy + ry + 1)):
    ny = (y - cy) / ry
    for x in range(max(0, cx - rx), min(width, cx + rx + 1)):
      nx = (x - cx) / rx
      d = nx * nx + ny * ny
      if d <= 1.0:
        edge = max(0.0, min(1.0, (1.0 - d) / 0.16))
        blend(image, width, height, x, y, color, alpha * min(1.0, edge + 0.18))


def polygon(
  image: bytearray,
  width: int,
  height: int,
  points: list[tuple[int, int]],
  color: tuple[int, int, int],
  alpha: float = 1.0,
) -> None:
  if len(points) < 3:
    return
  min_y = max(0, min(y for _, y in points))
  max_y = min(height - 1, max(y for _, y in points))
  for y in range(min_y, max_y + 1):
    xs: list[float] = []
    for i, (x0, y0) in enumerate(points):
      x1, y1 = points[(i + 1) % len(points)]
      if y0 == y1:
        continue
      if (y0 <= y < y1) or (y1 <= y < y0):
        xs.append(x0 + (y - y0) * (x1 - x0) / (y1 - y0))
    xs.sort()
    for left, right in zip(xs[0::2], xs[1::2]):
      for x in range(max(0, math.ceil(left)), min(width, math.floor(right) + 1)):
        blend(image, width, height, x, y, color, alpha)


def line(
  image: bytearray,
  width: int,
  height: int,
  x0: float,
  y0: float,
  x1: float,
  y1: float,
  color: tuple[int, int, int],
  thickness: int,
  alpha: float = 1.0,
) -> None:
  steps = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
  radius = max(1, thickness // 2)
  for step in range(steps):
    t = step / max(1, steps - 1)
    x = int(round(x0 + (x1 - x0) * t))
    y = int(round(y0 + (y1 - y0) * t))
    circle(image, width, height, x, y, radius, color, alpha)


def panel(
  image: bytearray,
  width: int,
  height: int,
  cx: int,
  cy: int,
  w: int,
  h: int,
  color: tuple[int, int, int],
  border: tuple[int, int, int],
  alpha: float,
) -> None:
  x0 = cx - w // 2
  y0 = cy - h // 2
  rect(image, width, height, x0, y0, x0 + w, y0 + h, border, 0.85)
  rect(image, width, height, x0 + 10, y0 + 10, x0 + w - 10, y0 + h - 10, color, alpha)
  for offset in range(24, h - 24, 34):
    line(image, width, height, x0 + 30, y0 + offset, x0 + w - 30, y0 + offset - 12, border, 3, 0.2)


def draw_manhwa_character(
  image: bytearray,
  width: int,
  height: int,
  rng: random.Random,
  bg0: tuple[int, int, int],
  accent: tuple[int, int, int],
  accent2: tuple[int, int, int],
  glow: tuple[int, int, int],
  paper: tuple[int, int, int],
) -> None:
  skin = (238, 198, 172)
  blush = (238, 118, 138)
  ink = (8, 10, 18)
  hair = mix(bg0, accent2, 0.38)
  hair_shadow = mix(bg0, ink, 0.66)
  armor = mix(bg0, accent, 0.52)
  light = mix(paper, glow, 0.34)

  cx = int(width * 0.36 + rng.randint(-24, 16))
  head_y = int(height * 0.27 + rng.randint(-8, 14))
  head_r = int(width * 0.075)
  body_y = head_y + int(height * 0.16)

  polygon(
    image,
    width,
    height,
    [
      (cx - 120, head_y + 68),
      (cx - 330, int(height * 0.86)),
      (cx - 38, int(height * 0.76)),
      (cx + 66, int(height * 0.88)),
      (cx + 218, int(height * 0.48)),
      (cx + 86, head_y + 72),
    ],
    mix(bg0, accent2, 0.32),
    0.88,
  )
  for strand in range(9):
    sx = cx + rng.randint(-70, 75)
    sy = head_y + rng.randint(-42, 28)
    ex = sx + rng.randint(-190, 170)
    ey = int(height * rng.uniform(0.58, 0.86))
    line(image, width, height, sx, sy, ex, ey, hair_shadow if strand % 2 else hair, rng.randint(18, 34), 0.76)

  ellipse(image, width, height, cx, head_y + 20, head_r + 34, head_r + 58, hair_shadow, 0.98)
  ellipse(image, width, height, cx - 10, head_y, head_r + 18, head_r + 26, hair, 0.94)
  circle(image, width, height, cx, head_y + 8, head_r, skin, 0.98)

  for offset in (-52, -22, 8, 36):
    polygon(
      image,
      width,
      height,
      [(cx + offset, head_y - 72), (cx + offset + rng.randint(-20, 20), head_y + 8), (cx + offset + 58, head_y - 44)],
      hair,
      0.92,
    )

  ellipse(image, width, height, cx - 30, head_y + 10, 16, 8, paper, 0.95)
  ellipse(image, width, height, cx + 30, head_y + 10, 16, 8, paper, 0.95)
  ellipse(image, width, height, cx - 29, head_y + 10, 7, 9, accent2, 0.98)
  ellipse(image, width, height, cx + 29, head_y + 10, 7, 9, accent2, 0.98)
  line(image, width, height, cx - 52, head_y - 8, cx - 13, head_y - 3, ink, 4, 0.82)
  line(image, width, height, cx + 12, head_y - 3, cx + 54, head_y - 8, ink, 4, 0.82)
  ellipse(image, width, height, cx - 44, head_y + 36, 12, 5, blush, 0.25)
  ellipse(image, width, height, cx + 44, head_y + 36, 12, 5, blush, 0.25)
  line(image, width, height, cx - 16, head_y + 48, cx + 18, head_y + 46, ink, 3, 0.55)

  polygon(image, width, height, [(cx - 126, body_y), (cx + 126, body_y), (cx + 78, int(height * 0.67)), (cx - 82, int(height * 0.67))], armor, 0.94)
  polygon(image, width, height, [(cx - 178, body_y + 34), (cx - 78, body_y + 4), (cx - 100, body_y + 110), (cx - 230, body_y + 158)], mix(accent, paper, 0.18), 0.82)
  polygon(image, width, height, [(cx + 76, body_y + 4), (cx + 185, body_y + 42), (cx + 252, body_y + 176), (cx + 116, body_y + 124)], mix(accent2, paper, 0.14), 0.84)
  polygon(image, width, height, [(cx - 42, body_y + 8), (cx + 44, body_y + 8), (cx + 16, body_y + 176), (cx - 18, body_y + 176)], mix(bg0, paper, 0.18), 0.95)
  line(image, width, height, cx - 132, body_y + 8, cx + 132, body_y + 8, light, 6, 0.42)
  line(image, width, height, cx - 68, body_y + 78, cx + 72, body_y + 78, glow, 5, 0.34)

  line(image, width, height, cx - 250, int(height * 0.80), cx + 268, int(height * 0.18), paper, 10, 0.50)
  line(image, width, height, cx - 250, int(height * 0.80), cx + 268, int(height * 0.18), glow, 22, 0.20)
  circle(image, width, height, cx + 145, body_y + 112, 34, light, 0.78)
  rect(image, width, height, cx + 126, body_y + 78, cx + 168, body_y + 158, ink, 0.82)
  rect(image, width, height, cx + 132, body_y + 86, cx + 162, body_y + 150, glow, 0.34)


def render_item(item: dict[str, Any], output_path: pathlib.Path, size: int) -> None:
  text = ' '.join(str(item.get(key) or '') for key in ('message', 'image_prompt', 'visual_style', 'genre'))
  seed = int(hashlib.sha256((str(item.get('id')) + text).encode('utf-8')).hexdigest()[:16], 16)
  rng = random.Random(seed)
  genre = str(item.get('genre') or pick_genre(text))
  palette = PALETTES.get(genre, PALETTES['action'])
  bg0, accent, accent2, glow, paper = palette

  width = height = size
  image = bytearray(width * height * 3)

  for y in range(height):
    vertical = y / max(1, height - 1)
    for x in range(width):
      horizontal = x / max(1, width - 1)
      wave = 0.08 * math.sin((x + seed % 200) / 55) + 0.06 * math.cos((y + seed % 300) / 71)
      color = mix(bg0, mix(accent, accent2, horizontal), min(0.55, vertical * 0.45 + wave))
      index = (y * width + x) * 3
      image[index:index + 3] = bytes(color)

  for _ in range(18):
    cx = rng.randint(-100, width + 100)
    cy = rng.randint(-100, height + 100)
    radius = rng.randint(80, 260)
    circle(image, width, height, cx, cy, radius, rng.choice((accent, accent2, glow)), rng.uniform(0.05, 0.16))

  for _ in range(28):
    start_y = rng.randint(-height // 3, height)
    start_x = rng.randint(-width // 3, width)
    length = rng.randint(width // 3, width)
    slope = rng.uniform(-0.45, 0.45)
    line(
      image,
      width,
      height,
      start_x,
      start_y,
      start_x + length,
      start_y + length * slope,
      rng.choice((accent, accent2, glow, paper)),
      rng.randint(2, 8),
      rng.uniform(0.08, 0.23),
    )

  for i in range(4):
    panel_w = rng.randint(250, 420)
    panel_h = rng.randint(170, 310)
    cx = rng.randint(150, width - 150)
    cy = rng.randint(150, height - 150)
    panel(
      image,
      width,
      height,
      cx,
      cy,
      panel_w,
      panel_h,
      mix(bg0, paper, 0.14 + i * 0.04),
      rng.choice((accent, accent2, glow)),
      0.32,
    )

  draw_manhwa_character(image, width, height, rng, bg0, accent, accent2, glow, paper)

  for _ in range(8):
    circle(
      image,
      width,
      height,
      rng.randint(90, width - 90),
      rng.randint(90, height - 90),
      rng.randint(18, 46),
      paper,
      rng.uniform(0.16, 0.34),
    )

  for y in range(0, height, 7):
    rect(image, width, height, 0, y, width, y + 1, (255, 255, 255), 0.025)

  output_path.parent.mkdir(parents=True, exist_ok=True)
  write_png(output_path, width, height, image)


def write_png(path: pathlib.Path, width: int, height: int, rgb: bytearray) -> None:
  def chunk(kind: bytes, data: bytes) -> bytes:
    return (
      struct.pack('>I', len(data))
      + kind
      + data
      + struct.pack('>I', zlib.crc32(kind + data) & 0xFFFFFFFF)
    )

  rows = bytearray()
  stride = width * 3
  for y in range(height):
    rows.append(0)
    start = y * stride
    rows.extend(rgb[start:start + stride])

  png = bytearray(b'\x89PNG\r\n\x1a\n')
  png.extend(chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)))
  png.extend(chunk(b'IDAT', zlib.compress(bytes(rows), level=9)))
  png.extend(chunk(b'IEND', b''))
  path.write_bytes(png)


def main() -> int:
  args = parse_args()
  queue_file = pathlib.Path(args.queue_file)
  image_dir = pathlib.Path(args.image_dir)
  statuses = {status.strip().lower() for status in args.statuses.split(',') if status.strip()}
  items = read_queue(queue_file)
  rendered = 0

  for item in items:
    if item.get('_raw') is not None:
      continue
    if str(item.get('platform') or '').lower() not in {'facebook', 'facebook_page'}:
      continue
    if str(item.get('status') or '').lower() not in statuses:
      continue
    if item.get('image_url'):
      continue

    image_path_value = str(item.get('image_path') or '').strip()
    image_path = pathlib.Path(image_path_value) if image_path_value else None
    if image_path is not None and image_path.exists() and not args.force:
      continue

    post_id = str(item.get('id') or '').strip()
    if not post_id:
      continue
    output_path = image_dir / f'{safe_filename(post_id)}.png'
    if output_path.exists() and not args.force:
      item['image_path'] = str(output_path)
      item.setdefault('image_alt', 'Original placeholder manhwa-style Nayovi social image.')
      continue

    render_item(item, output_path, max(512, min(1600, args.size)))
    item['image_path'] = str(output_path)
    item.setdefault('image_alt', 'Original placeholder manhwa-style Nayovi social image.')
    item['image_generated_by'] = 'tachi-social-image-renderer'
    item['image_generated_at'] = dt.datetime.now(dt.UTC).isoformat().replace('+00:00', 'Z')
    rendered += 1
    print(f'rendered {post_id}: {output_path}')
    if rendered >= args.limit:
      break

  if rendered:
    write_queue(queue_file, items)
  else:
    print(f'No social images needed for {queue_file}.')

  return 0


if __name__ == '__main__':
  raise SystemExit(main())
