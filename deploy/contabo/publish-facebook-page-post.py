#!/usr/bin/env python3
"""Manage a Nayovi Facebook Page through Meta's Graph API.

Each post queue JSON line must have:
  id, platform=facebook, status, message

Allowed statuses:
  approved: owner-approved post
  auto_publish: autonomous-agent post when explicitly enabled

Optional fields:
  link, scheduled_at

Page info updates use:
  status=approved or auto_sync, fields={...}
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import mimetypes
import os
import pathlib
import sys
import tempfile
import urllib.error
import urllib.parse
import urllib.request
from typing import Any


DEFAULT_ENV_FILE = pathlib.Path('/opt/tachi-back/.env.seo-distribution-agent')
DEFAULT_REPO_DIR = pathlib.Path('/opt/tachi-seo-distribution-agent/repo')
DEFAULT_STATE_FILE = pathlib.Path('/var/lib/tachi-seo-distribution-agent/facebook-published.json')
DEFAULT_GRAPH_VERSION = 'v22.0'
PAGE_INFO_FIELDS = {
  'about',
  'attire',
  'bio',
  'description',
  'emails',
  'general_info',
  'hours',
  'impressum',
  'location',
  'parking',
  'payment_options',
  'phone',
  'price_range',
  'public_transit',
  'restaurant_services',
  'restaurant_specialties',
  'website',
}
DEFAULT_ALLOWED_LINK_DOMAINS = {
  'nayovi.com',
  'tachiyomiat.com',
  'translate-manhwa-ai.com',
}
BLOCKED_MESSAGE_PHRASES = {
  'guaranteed ranking',
  'guaranteed seo',
  'officially endorsed by google',
  'free forever',
  'unlimited translation',
  'copyright-free manga',
}


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(
    description='Publish approved Facebook Page posts and optionally sync owner-approved Page info.',
  )
  parser.add_argument('--env-file', default=str(DEFAULT_ENV_FILE))
  parser.add_argument('--queue-file', default=None)
  parser.add_argument('--page-info-file', default=None)
  parser.add_argument('--state-file', default=str(DEFAULT_STATE_FILE))
  parser.add_argument('--limit', type=int, default=1)
  parser.add_argument('--dry-run', action='store_true')
  parser.add_argument('--sync-page-info', action='store_true')
  parser.add_argument('--verify-access', action='store_true')
  return parser.parse_args()


def parse_env_file(path: pathlib.Path) -> dict[str, str]:
  values: dict[str, str] = {}
  if not path.exists():
    return values

  for raw_line in path.read_text(encoding='utf-8').splitlines():
    line = raw_line.strip()
    if not line or line.startswith('#') or '=' not in line:
      continue
    key, value = line.split('=', 1)
    key = key.strip()
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in {'"', "'"}:
      value = value[1:-1]
    values[key] = value
  return values


def getenv(values: dict[str, str], key: str, default: str = '') -> str:
  return os.environ.get(key, values.get(key, default))


def env_bool(values: dict[str, str], key: str, default: bool = False) -> bool:
  raw = getenv(values, key, 'true' if default else 'false').strip().lower()
  return raw in {'1', 'true', 'yes', 'on'}


def parse_domains(value: str) -> set[str]:
  domains = {
    item.strip().lower().removeprefix('www.')
    for item in value.split(',')
    if item.strip()
  }
  return domains or set(DEFAULT_ALLOWED_LINK_DOMAINS)


def parse_time(value: str | None) -> dt.datetime | None:
  if not value:
    return None
  normalized = value.replace('Z', '+00:00')
  parsed = dt.datetime.fromisoformat(normalized)
  if parsed.tzinfo is None:
    parsed = parsed.replace(tzinfo=dt.UTC)
  return parsed.astimezone(dt.UTC)


def read_queue(path: pathlib.Path) -> list[dict[str, Any]]:
  if not path.exists():
    return []

  items: list[dict[str, Any]] = []
  for line_number, raw_line in enumerate(path.read_text(encoding='utf-8').splitlines(), start=1):
    line = raw_line.strip()
    if not line or line.startswith('#'):
      continue
    try:
      item = json.loads(line)
    except json.JSONDecodeError as exc:
      raise ValueError(f'{path}:{line_number}: invalid JSON: {exc}') from exc
    if not isinstance(item, dict):
      raise ValueError(f'{path}:{line_number}: queue item must be an object')
    item['_line'] = line_number
    items.append(item)
  return items


def read_json_object(path: pathlib.Path) -> dict[str, Any] | None:
  if not path.exists():
    return None
  data = json.loads(path.read_text(encoding='utf-8'))
  if not isinstance(data, dict):
    raise ValueError(f'{path}: JSON must be an object')
  return data


def read_state(path: pathlib.Path) -> dict[str, Any]:
  if not path.exists():
    return {'published': {}}
  state = json.loads(path.read_text(encoding='utf-8'))
  if not isinstance(state, dict):
    return {'published': {}}
  if not isinstance(state.get('published'), dict):
    state['published'] = {}
  return state


def write_state(path: pathlib.Path, state: dict[str, Any]) -> None:
  path.parent.mkdir(parents=True, exist_ok=True)
  state['updated_at'] = dt.datetime.now(dt.UTC).isoformat().replace('+00:00', 'Z')
  payload = json.dumps(state, indent=2, sort_keys=True) + '\n'
  with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=path.parent, delete=False) as handle:
    handle.write(payload)
    tmp_name = handle.name
  pathlib.Path(tmp_name).replace(path)


def is_due(item: dict[str, Any], now: dt.datetime) -> bool:
  scheduled_at = parse_time(item.get('scheduled_at'))
  return scheduled_at is None or scheduled_at <= now


def link_domain(link: str) -> str:
  parsed = urllib.parse.urlparse(link)
  return (parsed.hostname or '').lower().removeprefix('www.')


def validate_item(
  item: dict[str, Any],
  *,
  autonomous_enabled: bool,
  allowed_link_domains: set[str],
  require_image: bool,
) -> str | None:
  post_id = str(item.get('id') or '').strip()
  if not post_id:
    return 'missing id'
  if str(item.get('platform') or '').lower() not in {'facebook', 'facebook_page'}:
    return 'platform is not facebook'
  status = str(item.get('status') or '').lower()
  allowed_statuses = {'approved'}
  if autonomous_enabled:
    allowed_statuses.add('auto_publish')
  if status not in allowed_statuses:
    if autonomous_enabled:
      return 'status is not approved or auto_publish'
    return 'status is not approved'
  if require_image and status == 'auto_publish':
    image_url = str(item.get('image_url') or '').strip()
    image_path = str(item.get('image_path') or '').strip()
    if not image_url and not image_path:
      return 'auto_publish requires image_url or image_path'
    if image_path and not pathlib.Path(image_path).exists():
      return f'auto_publish image_path does not exist: {image_path}'
  message = str(item.get('message') or '').strip()
  if len(message) < 40:
    return 'message is too short'
  if len(message) > 5000:
    return 'message is too long'
  lowered_message = message.lower()
  for phrase in BLOCKED_MESSAGE_PHRASES:
    if phrase in lowered_message:
      return f'message contains blocked phrase: {phrase}'
  link = str(item.get('link') or '').strip()
  if link:
    domain = link_domain(link)
    if not domain:
      return 'link is not an absolute URL'
    if domain not in allowed_link_domains:
      return f'link domain is not allowed: {domain}'
  image_prompt = str(item.get('image_prompt') or '').strip()
  if image_prompt and len(image_prompt) < 80:
    return 'image_prompt is too short'
  if image_prompt and len(image_prompt) > 1800:
    return 'image_prompt is too long'
  return None


def graph_value(value: Any) -> str:
  if isinstance(value, bool):
    return 'true' if value else 'false'
  if isinstance(value, (dict, list)):
    return json.dumps(value, separators=(',', ':'), sort_keys=True)
  return str(value)


def graph_request(
  *,
  method: str,
  path: str,
  access_token: str,
  graph_version: str,
  fields: dict[str, Any] | None = None,
) -> dict[str, Any]:
  endpoint = f'https://graph.facebook.com/{graph_version}/{path.lstrip("/")}'
  payload = {'access_token': access_token}
  if fields:
    payload.update({key: graph_value(value) for key, value in fields.items()})

  if method.upper() == 'GET':
    endpoint = f'{endpoint}?{urllib.parse.urlencode(payload)}'
    data = None
  else:
    data = urllib.parse.urlencode(payload).encode('utf-8')

  request = urllib.request.Request(endpoint, data=data, method=method.upper())
  if data is not None:
    request.add_header('Content-Type', 'application/x-www-form-urlencoded')

  try:
    with urllib.request.urlopen(request, timeout=30) as response:
      return json.loads(response.read().decode('utf-8'))
  except urllib.error.HTTPError as exc:
    body = exc.read().decode('utf-8', errors='replace')
    raise RuntimeError(f'Facebook API returned HTTP {exc.code}: {body}') from exc


def graph_multipart_request(
  *,
  path: str,
  access_token: str,
  graph_version: str,
  fields: dict[str, Any],
  file_field: str,
  file_path: pathlib.Path,
) -> dict[str, Any]:
  endpoint = f'https://graph.facebook.com/{graph_version}/{path.lstrip("/")}'
  boundary = f'----nayovi-{dt.datetime.now(dt.UTC).timestamp()}'.replace('.', '')
  body_parts: list[bytes] = []

  upload_fields = {'access_token': access_token}
  upload_fields.update({key: graph_value(value) for key, value in fields.items()})
  for key, value in upload_fields.items():
    body_parts.extend([
      f'--{boundary}\r\n'.encode('utf-8'),
      f'Content-Disposition: form-data; name="{key}"\r\n\r\n'.encode('utf-8'),
      str(value).encode('utf-8'),
      b'\r\n',
    ])

  content_type = mimetypes.guess_type(str(file_path))[0] or 'image/png'
  body_parts.extend([
    f'--{boundary}\r\n'.encode('utf-8'),
    (
      f'Content-Disposition: form-data; name="{file_field}"; '
      f'filename="{file_path.name}"\r\n'
    ).encode('utf-8'),
    f'Content-Type: {content_type}\r\n\r\n'.encode('utf-8'),
    file_path.read_bytes(),
    b'\r\n',
    f'--{boundary}--\r\n'.encode('utf-8'),
  ])

  request = urllib.request.Request(endpoint, data=b''.join(body_parts), method='POST')
  request.add_header('Content-Type', f'multipart/form-data; boundary={boundary}')

  try:
    with urllib.request.urlopen(request, timeout=60) as response:
      return json.loads(response.read().decode('utf-8'))
  except urllib.error.HTTPError as exc:
    body = exc.read().decode('utf-8', errors='replace')
    raise RuntimeError(f'Facebook API returned HTTP {exc.code}: {body}') from exc


def verify_page_access(*, page_id: str, access_token: str, graph_version: str) -> dict[str, Any]:
  fields = {'fields': 'id,name,link,website,about'}
  return graph_request(
    method='GET',
    path=urllib.parse.quote(page_id),
    access_token=access_token,
    graph_version=graph_version,
    fields=fields,
  )


def build_caption(item: dict[str, Any]) -> str:
  message = str(item.get('message') or '').strip()
  link = str(item.get('link') or '').strip()
  if link and link not in message:
    return f'{message}\n\n{link}'
  return message


def post_to_facebook(
  *,
  page_id: str,
  access_token: str,
  graph_version: str,
  message: str,
  link: str | None,
) -> dict[str, Any]:
  fields = {
    'message': message,
  }
  if link:
    fields['link'] = link
  return graph_request(
    method='POST',
    path=f'{urllib.parse.quote(page_id)}/feed',
    access_token=access_token,
    graph_version=graph_version,
    fields=fields,
  )


def post_photo_to_facebook(
  *,
  page_id: str,
  access_token: str,
  graph_version: str,
  caption: str,
  image_path: pathlib.Path | None,
  image_url: str | None,
  alt_text: str | None,
) -> dict[str, Any]:
  fields: dict[str, Any] = {
    'message': caption,
  }
  if alt_text:
    fields['alt_text_custom'] = alt_text

  if image_url:
    fields['url'] = image_url
    return graph_request(
      method='POST',
      path=f'{urllib.parse.quote(page_id)}/photos',
      access_token=access_token,
      graph_version=graph_version,
      fields=fields,
    )

  if image_path:
    return graph_multipart_request(
      path=f'{urllib.parse.quote(page_id)}/photos',
      access_token=access_token,
      graph_version=graph_version,
      fields=fields,
      file_field='source',
      file_path=image_path,
    )

  raise ValueError('post_photo_to_facebook requires image_path or image_url')


def ensure_post_image(
  *,
  item: dict[str, Any],
  state: dict[str, Any],
) -> tuple[pathlib.Path | None, str | None]:
  image_url = str(item.get('image_url') or '').strip()
  if image_url:
    return None, image_url

  image_path = str(item.get('image_path') or '').strip()
  if image_path:
    path = pathlib.Path(image_path)
    if path.exists():
      return path, None
    print(f'skip image_path for {item.get("id")}: file does not exist: {path}')

  images_state = state.setdefault('images', {})
  post_id = str(item['id'])
  existing = images_state.get(post_id)
  if isinstance(existing, dict):
    existing_path = pathlib.Path(str(existing.get('path') or ''))
    if existing_path.exists():
      return existing_path, None

  image_prompt = str(item.get('image_prompt') or '').strip()
  if image_prompt:
    print(
      f'skip generated image for {post_id}: publisher does not call image APIs; '
      'Codex CLI agent must create image_path before publishing.'
    )
  return None, None


def validate_page_info(
  data: dict[str, Any],
  *,
  autonomous_enabled: bool,
) -> tuple[dict[str, Any] | None, str | None]:
  status = str(data.get('status') or '').lower()
  allowed_statuses = {'approved'}
  if autonomous_enabled:
    allowed_statuses.add('auto_sync')
  if status not in allowed_statuses:
    if autonomous_enabled:
      return None, 'page info status is not approved or auto_sync'
    return None, 'page info status is not approved'
  fields = data.get('fields')
  if not isinstance(fields, dict) or not fields:
    return None, 'page info fields must be a non-empty object'

  unknown = sorted(set(fields) - PAGE_INFO_FIELDS)
  if unknown:
    return None, f'unsupported page info field(s): {", ".join(unknown)}'

  cleaned = {
    key: value
    for key, value in fields.items()
    if value is not None and value != '' and value != [] and value != {}
  }
  if not cleaned:
    return None, 'page info fields are empty after cleanup'
  return cleaned, None


def sync_page_info(
  *,
  page_id: str,
  access_token: str,
  graph_version: str,
  page_info_file: pathlib.Path,
  state: dict[str, Any],
  state_file: pathlib.Path,
  dry_run: bool,
  autonomous_enabled: bool,
) -> None:
  data = read_json_object(page_info_file)
  if data is None:
    print(f'No Facebook page info file at {page_info_file}.')
    return

  fields, reason = validate_page_info(data, autonomous_enabled=autonomous_enabled)
  if reason:
    print(f'skip page info sync: {reason}')
    return
  assert fields is not None

  signature = json.dumps(fields, sort_keys=True, separators=(',', ':'))
  page_info_state = state.setdefault('page_info', {})
  if page_info_state.get('signature') == signature:
    print('Facebook page info already synced for current approved fields.')
    return

  if dry_run:
    print(f'Dry run: Facebook page info ready to sync fields: {", ".join(sorted(fields))}.')
    return

  result = graph_request(
    method='POST',
    path=urllib.parse.quote(page_id),
    access_token=access_token,
    graph_version=graph_version,
    fields=fields,
  )
  page_info_state.update({
    'signature': signature,
    'synced_at': dt.datetime.now(dt.UTC).isoformat().replace('+00:00', 'Z'),
    'fields': sorted(fields),
    'result': result,
  })
  write_state(state_file, state)
  print(f'Facebook page info synced: {", ".join(sorted(fields))}.')


def main() -> int:
  args = parse_args()
  env_file = pathlib.Path(args.env_file)
  env_values = parse_env_file(env_file)

  repo_dir = pathlib.Path(getenv(env_values, 'SEO_AGENT_REPO_DIR', str(DEFAULT_REPO_DIR)))
  queue_file = pathlib.Path(
    args.queue_file
    or getenv(
      env_values,
      'SEO_AGENT_SOCIAL_QUEUE_FILE',
      str(repo_dir / 'docs/seo-distribution/social-post-queue.jsonl'),
    ),
  )
  page_info_file = pathlib.Path(
    args.page_info_file
    or getenv(
      env_values,
      'SEO_AGENT_FACEBOOK_PAGE_INFO_FILE',
      str(repo_dir / 'docs/seo-distribution/facebook-page-info.json'),
    ),
  )
  state_file = pathlib.Path(args.state_file)
  mode = getenv(env_values, 'SEO_AGENT_FACEBOOK_POSTING_MODE', 'draft').lower()
  page_info_mode = getenv(env_values, 'SEO_AGENT_FACEBOOK_PAGE_INFO_MODE', 'draft').lower()
  graph_version = getenv(env_values, 'SEO_AGENT_FACEBOOK_GRAPH_VERSION', DEFAULT_GRAPH_VERSION)
  page_id = getenv(env_values, 'SEO_AGENT_FACEBOOK_PAGE_ID')
  access_token = getenv(env_values, 'SEO_AGENT_FACEBOOK_PAGE_ACCESS_TOKEN')
  autonomous_posts = env_bool(env_values, 'SEO_AGENT_FACEBOOK_AUTONOMOUS_APPROVAL_ENABLED', False)
  autonomous_page_info = env_bool(env_values, 'SEO_AGENT_FACEBOOK_PAGE_INFO_AUTONOMOUS_ENABLED', False)
  allowed_link_domains = parse_domains(
    getenv(
      env_values,
      'SEO_AGENT_FACEBOOK_ALLOWED_LINK_DOMAINS',
      ','.join(sorted(DEFAULT_ALLOWED_LINK_DOMAINS)),
    ),
  )
  daily_limit = int(getenv(env_values, 'SEO_AGENT_FACEBOOK_DAILY_POST_LIMIT', '1') or '1')
  require_image = env_bool(env_values, 'SEO_AGENT_SOCIAL_IMAGE_REQUIRED', False)

  if mode not in {'off', 'draft', 'publish'}:
    print(f'Invalid SEO_AGENT_FACEBOOK_POSTING_MODE={mode!r}; expected off, draft, or publish.', file=sys.stderr)
    return 2
  if page_info_mode not in {'off', 'draft', 'sync'}:
    print(f'Invalid SEO_AGENT_FACEBOOK_PAGE_INFO_MODE={page_info_mode!r}; expected off, draft, or sync.', file=sys.stderr)
    return 2

  if args.verify_access:
    if not page_id or not access_token:
      print('Missing SEO_AGENT_FACEBOOK_PAGE_ID or SEO_AGENT_FACEBOOK_PAGE_ACCESS_TOKEN.', file=sys.stderr)
      return 2
    result = verify_page_access(page_id=page_id, access_token=access_token, graph_version=graph_version)
    print(json.dumps(result, indent=2, sort_keys=True))

  state = read_state(state_file)

  if args.sync_page_info or page_info_mode == 'sync':
    dry_run_page_info = args.dry_run or page_info_mode != 'sync'
    if not dry_run_page_info and (not page_id or not access_token):
      print('Missing SEO_AGENT_FACEBOOK_PAGE_ID or SEO_AGENT_FACEBOOK_PAGE_ACCESS_TOKEN.', file=sys.stderr)
      return 2
    sync_page_info(
      page_id=page_id,
      access_token=access_token,
      graph_version=graph_version,
      page_info_file=page_info_file,
      state=state,
      state_file=state_file,
      dry_run=dry_run_page_info,
      autonomous_enabled=autonomous_page_info,
    )

  if mode == 'off':
    print('Facebook post publisher is off.')
    return 0

  queue = read_queue(queue_file)
  published = state['published']
  now = dt.datetime.now(dt.UTC)
  today = now.date().isoformat()
  already_published_today = sum(
    1
    for entry in published.values()
    if str(entry.get('published_at') or '').startswith(today)
  )
  remaining_today = max(daily_limit - already_published_today, 0)
  candidates: list[dict[str, Any]] = []

  for item in queue:
    post_id = str(item.get('id') or '').strip()
    if post_id in published:
      continue
    reason = validate_item(
      item,
      autonomous_enabled=autonomous_posts,
      allowed_link_domains=allowed_link_domains,
      require_image=require_image,
    )
    if reason:
      print(f'skip line {item.get("_line")}: {reason}')
      continue
    if not is_due(item, now):
      print(f'skip {post_id}: scheduled for {item.get("scheduled_at")}')
      continue
    candidates.append(item)

  if not candidates:
    print(f'No approved/auto-publish Facebook posts ready in {queue_file}.')
    return 0

  if remaining_today <= 0:
    print(f'Daily Facebook post limit reached ({daily_limit}); no posts selected.')
    return 0

  limit = min(max(args.limit, 0), remaining_today)
  selected = candidates[:limit] if limit else []
  if not selected:
    print('Limit is 0; no posts selected.')
    return 0

  dry_run = args.dry_run or mode != 'publish'
  if dry_run:
    print(f'Dry run: {len(selected)} approved/auto-publish Facebook post(s) ready.')
    for item in selected:
      print(f'- {item["id"]}: {item.get("link", "no link")}')
    return 0

  if not page_id or not access_token:
    print('Missing SEO_AGENT_FACEBOOK_PAGE_ID or SEO_AGENT_FACEBOOK_PAGE_ACCESS_TOKEN.', file=sys.stderr)
    return 2

  for item in selected:
    post_id = str(item['id'])
    image_path, image_url = ensure_post_image(
      item=item,
      state=state,
    )
    if image_path or image_url:
      result = post_photo_to_facebook(
        page_id=page_id,
        access_token=access_token,
        graph_version=graph_version,
        caption=build_caption(item),
        image_path=image_path,
        image_url=image_url,
        alt_text=str(item.get('image_alt') or '').strip() or None,
      )
    else:
      result = post_to_facebook(
        page_id=page_id,
        access_token=access_token,
        graph_version=graph_version,
        message=str(item['message']).strip(),
        link=str(item.get('link') or '').strip() or None,
      )
    remote_id = str(result.get('id') or '')
    published[post_id] = {
      'platform': 'facebook',
      'remote_id': remote_id,
      'published_at': dt.datetime.now(dt.UTC).isoformat().replace('+00:00', 'Z'),
      'link': item.get('link'),
    }
    print(f'published {post_id} as Facebook post {remote_id}')
    write_state(state_file, state)

  return 0


if __name__ == '__main__':
  raise SystemExit(main())
