#!/usr/bin/env python3
from __future__ import annotations

import argparse
import email
import hashlib
import html
import imaplib
import json
import os
import pathlib
import re
import shutil
import smtplib
import subprocess
import sys
import time
import ssl
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timezone
from email.header import decode_header, make_header
from email.message import EmailMessage, Message
from email.parser import BytesParser
from email.policy import default
from email.utils import formatdate, getaddresses, parseaddr, parsedate_to_datetime
from urllib.parse import unquote, urlparse


DEFAULT_ENV_FILE = pathlib.Path('/opt/tachi-back/.env.growth-agent')
DEFAULT_STATE_DIR = pathlib.Path('/var/lib/tachi-growth-agent')
DEFAULT_STATUS_REPLY_KEYWORDS = (
  'avancement',
  'status',
  'update',
  'tu fais quoi',
  'tu fais quoi la',
  'tu fais quoi là',
  'avance sur quoi',
  'quoi maintenant',
  'progress',
  'what are you doing',
)
VIDEO_EXTENSIONS = {
  '.3g2',
  '.3gp',
  '.avi',
  '.m4v',
  '.mkv',
  '.mov',
  '.mp4',
  '.mpeg',
  '.mpg',
  '.webm',
}
TEXT_EXTENSIONS = {
  '.csv',
  '.json',
  '.log',
  '.md',
  '.srt',
  '.txt',
  '.vtt',
}


@dataclass(frozen=True)
class BridgeConfig:
  enabled: bool
  env_file: pathlib.Path
  state_dir: pathlib.Path
  repo_dir: pathlib.Path
  inbound_dir: pathlib.Path
  queue_dir: pathlib.Path
  attachment_dir: pathlib.Path
  seen_file: pathlib.Path
  trigger_file: pathlib.Path
  allowed_senders: set[str]
  require_authenticated_sender: bool
  imap_host: str
  imap_port: int
  imap_user: str
  imap_password: str
  imap_mailbox: str
  imap_ssl: bool
  poll_seconds: int
  max_messages: int
  max_attachment_bytes: int
  mark_seen: bool
  confirmation_enabled: bool
  status_reply_enabled: bool
  status_reply_keywords: tuple[str, ...]
  notifier_path: pathlib.Path
  notify_email: str
  notify_env_file: pathlib.Path
  interval_seconds: int
  max_video_frames: int
  max_video_audio_seconds: int


def main() -> int:
  parser = argparse.ArgumentParser(
    description='Poll owner replies and queue instructions for the Nayovi growth agent.'
  )
  parser.add_argument('--env-file', default=str(DEFAULT_ENV_FILE))
  parser.add_argument('--loop', action='store_true', help='Poll forever.')
  parser.add_argument('--once', action='store_true', help='Run a single poll.')
  parser.add_argument('--process-eml', help='Process a local .eml file for testing.')
  args = parser.parse_args()

  config = load_config(pathlib.Path(args.env_file))
  ensure_directories(config)

  if args.process_eml:
    raw = pathlib.Path(args.process_eml).read_bytes()
    message = BytesParser(policy=default).parsebytes(raw)
    accepted = process_message(config, message)
    return 0 if accepted else 1

  if args.once or not args.loop:
    return poll_once(config)

  while True:
    try:
      poll_once(config)
    except Exception as error:  # noqa: BLE001 - service should keep running.
      print(f'mail bridge poll failed: {error}', file=sys.stderr)
    time.sleep(config.poll_seconds)


def load_config(env_file: pathlib.Path) -> BridgeConfig:
  values = dict(os.environ)
  if env_file.exists():
    values.update(read_env(env_file))

  state_dir = pathlib.Path(values.get('TACHI_GROWTH_STATE_DIR', str(DEFAULT_STATE_DIR)))
  inbound_dir = pathlib.Path(
    values.get('GROWTH_AGENT_INBOUND_DIR', str(state_dir / 'inbound'))
  )
  imap = parse_imap_settings(values)

  return BridgeConfig(
    enabled=is_true(values.get('GROWTH_AGENT_INBOUND_ENABLED', 'false')),
    env_file=env_file,
    state_dir=state_dir,
    repo_dir=pathlib.Path(
      values.get('GROWTH_AGENT_REPO_DIR', '/opt/tachi-growth-agent/repo')
    ),
    inbound_dir=inbound_dir,
    queue_dir=inbound_dir / 'queue',
    attachment_dir=inbound_dir / 'attachments',
    seen_file=inbound_dir / 'seen-message-ids.txt',
    trigger_file=pathlib.Path(
      values.get('GROWTH_AGENT_TRIGGER_FILE', str(state_dir / 'run-now'))
    ),
    allowed_senders=parse_csv_set(
      values.get('GROWTH_AGENT_INBOUND_ALLOWED_SENDERS', 'borjiomar38@gmail.com')
    ),
    require_authenticated_sender=is_true(
      values.get('GROWTH_AGENT_INBOUND_REQUIRE_AUTHENTICATED_SENDER', 'true')
    ),
    imap_host=imap['host'],
    imap_port=int(imap['port']),
    imap_user=imap['user'],
    imap_password=imap['password'],
    imap_mailbox=imap['mailbox'],
    imap_ssl=is_true(str(imap['ssl'])),
    poll_seconds=max(30, int(values.get('GROWTH_AGENT_INBOUND_POLL_SECONDS', '60'))),
    max_messages=max(1, int(values.get('GROWTH_AGENT_INBOUND_MAX_MESSAGES', '10'))),
    max_attachment_bytes=max(
      1024 * 1024,
      int(values.get('GROWTH_AGENT_INBOUND_MAX_ATTACHMENT_MB', '100')) * 1024 * 1024,
    ),
    mark_seen=is_true(values.get('GROWTH_AGENT_INBOUND_MARK_SEEN', 'true')),
    confirmation_enabled=is_true(
      values.get('GROWTH_AGENT_INBOUND_CONFIRMATION_ENABLED', 'false')
    ),
    status_reply_enabled=is_true(values.get('GROWTH_AGENT_STATUS_REPLY_ENABLED', 'true')),
    status_reply_keywords=tuple(
      parse_csv_list(
        values.get(
          'GROWTH_AGENT_STATUS_REPLY_KEYWORDS',
          ','.join(DEFAULT_STATUS_REPLY_KEYWORDS),
        )
      )
    ),
    notifier_path=pathlib.Path(
      values.get('GROWTH_AGENT_NOTIFY_BIN', '/usr/local/bin/tachi-growth-owner-notify')
    ),
    notify_email=values.get('GROWTH_AGENT_NOTIFY_EMAIL', 'borjiomar38@gmail.com'),
    notify_env_file=pathlib.Path(
      values.get('GROWTH_AGENT_NOTIFY_ENV_FILE', '/opt/tachi-back/.env.production')
    ),
    interval_seconds=max(60, int(values.get('GROWTH_AGENT_INTERVAL_SECONDS', '21600'))),
    max_video_frames=max(1, int(values.get('GROWTH_AGENT_INBOUND_MAX_VIDEO_FRAMES', '8'))),
    max_video_audio_seconds=max(
      30, int(values.get('GROWTH_AGENT_INBOUND_MAX_VIDEO_AUDIO_SECONDS', '600'))
    ),
  )


def parse_imap_settings(values: dict[str, str]) -> dict[str, str | int | bool]:
  imap_url = values.get('GROWTH_AGENT_INBOUND_IMAP_URL', '').strip()
  if imap_url:
    parsed = urlparse(imap_url)
    mailbox = unquote(parsed.path.lstrip('/')) or 'INBOX'
    return {
      'host': parsed.hostname or '',
      'port': parsed.port or (993 if parsed.scheme == 'imaps' else 143),
      'user': unquote(parsed.username or ''),
      'password': unquote(parsed.password or ''),
      'mailbox': mailbox,
      'ssl': parsed.scheme != 'imap',
    }

  return {
    'host': values.get('GROWTH_AGENT_INBOUND_IMAP_HOST', ''),
    'port': int(values.get('GROWTH_AGENT_INBOUND_IMAP_PORT', '993')),
    'user': values.get('GROWTH_AGENT_INBOUND_IMAP_USER', ''),
    'password': values.get('GROWTH_AGENT_INBOUND_IMAP_PASSWORD', ''),
    'mailbox': values.get('GROWTH_AGENT_INBOUND_IMAP_MAILBOX', 'INBOX'),
    'ssl': values.get('GROWTH_AGENT_INBOUND_IMAP_SSL', 'true'),
  }


def read_env(path: pathlib.Path) -> dict[str, str]:
  values: dict[str, str] = {}
  for raw_line in path.read_text(encoding='utf-8').splitlines():
    line = raw_line.strip()
    if not line or line.startswith('#') or '=' not in line:
      continue

    key, value = line.split('=', 1)
    values[key.strip()] = clean_env_value(value)

  return values


def clean_env_value(value: str) -> str:
  cleaned = value.strip()
  if len(cleaned) >= 2 and cleaned[0] == cleaned[-1] and cleaned[0] in {'"', "'"}:
    return cleaned[1:-1]

  return cleaned


def is_true(value: str | bool) -> bool:
  if isinstance(value, bool):
    return value

  return value.strip().lower() in {'1', 'true', 'yes', 'on'}


def parse_csv_set(value: str) -> set[str]:
  return {item.strip().lower() for item in value.split(',') if item.strip()}


def parse_csv_list(value: str) -> list[str]:
  return [item.strip() for item in value.split(',') if item.strip()]


def ensure_directories(config: BridgeConfig) -> None:
  config.queue_dir.mkdir(parents=True, exist_ok=True)
  config.attachment_dir.mkdir(parents=True, exist_ok=True)
  config.seen_file.parent.mkdir(parents=True, exist_ok=True)


def poll_once(config: BridgeConfig) -> int:
  if not config.enabled:
    print('growth mail bridge disabled; set GROWTH_AGENT_INBOUND_ENABLED=true')
    return 0

  if not config.imap_host or not config.imap_user or not config.imap_password:
    print('growth mail bridge waiting for IMAP credentials')
    return 0

  with connect_imap(config) as mailbox:
    status, _ = mailbox.select(config.imap_mailbox)
    if status != 'OK':
      raise RuntimeError(f'cannot select IMAP mailbox {config.imap_mailbox}')

    status, data = mailbox.uid('SEARCH', None, 'UNSEEN')
    if status != 'OK':
      raise RuntimeError('IMAP search failed')

    uids = data[0].split()[-config.max_messages :]
    if not uids:
      print('no unseen owner replies')
      return 0

    accepted_count = 0
    for uid in uids:
      status, fetched = mailbox.uid('FETCH', uid, '(RFC822)')
      if status != 'OK':
        print(f'failed to fetch message uid={uid.decode()}', file=sys.stderr)
        continue

      raw_message = extract_fetched_message(fetched)
      if raw_message is None:
        continue

      message = BytesParser(policy=default).parsebytes(raw_message)
      accepted = process_message(config, message)
      if accepted:
        accepted_count += 1

      if config.mark_seen:
        mailbox.uid('STORE', uid, '+FLAGS', '(\\Seen)')

    return 0 if accepted_count >= 0 else 1


def connect_imap(config: BridgeConfig) -> imaplib.IMAP4:
  if config.imap_ssl:
    mailbox: imaplib.IMAP4 = imaplib.IMAP4_SSL(config.imap_host, config.imap_port)
  else:
    mailbox = imaplib.IMAP4(config.imap_host, config.imap_port)

  mailbox.login(config.imap_user, config.imap_password)
  return mailbox


def extract_fetched_message(fetched: list[bytes | tuple[bytes, bytes]]) -> bytes | None:
  for item in fetched:
    if isinstance(item, tuple) and len(item) >= 2 and isinstance(item[1], bytes):
      return item[1]

  return None


def process_message(config: BridgeConfig, message: Message) -> bool:
  seen_ids = read_seen_ids(config.seen_file)
  message_key = stable_message_key(message)
  if message_key in seen_ids:
    return False

  sender = message_sender(message)
  if sender not in config.allowed_senders:
    print(f'ignored inbound message from unauthorized sender: {sender}')
    append_seen_id(config.seen_file, message_key)
    return False
  if not authenticated_sender_passed(config, message, sender):
    print(f'ignored inbound message from unauthenticated allowed sender: {sender}')
    append_seen_id(config.seen_file, message_key)
    return False

  subject = decode_header_value(message.get('Subject', '(no subject)'))
  body = strip_quoted_reply(extract_body_text(message)).strip()
  if is_status_request(config, message, subject, body):
    sent = send_status_reply(config, message, sender, subject)
    append_seen_id(config.seen_file, message_key)
    if sent:
      print(f'sent owner status reply for message: {subject[:120]}')
    return True

  command_id = command_identifier(message)
  command_dir = config.attachment_dir / command_id
  command_dir.mkdir(parents=True, exist_ok=True)

  attachments = extract_attachments(config, message, command_dir)
  context_path = config.queue_dir / f'{command_id}.md'
  context = render_context_markdown(
    command_id=command_id,
    message=message,
    sender=sender,
    subject=subject,
    body=body,
    attachments=attachments,
  )
  context_path.write_text(context, encoding='utf-8')
  write_manifest(command_dir / 'manifest.json', message, sender, subject, body, attachments)
  append_seen_id(config.seen_file, message_key)
  trigger_growth_agent(config)
  maybe_send_confirmation(config, command_id, subject, context_path)
  print(f'queued owner reply {command_id}: {context_path}')
  return True


def is_status_request(
  config: BridgeConfig,
  message: Message,
  subject: str,
  body: str,
) -> bool:
  if not config.status_reply_enabled or message_has_attachments(message):
    return False

  owner_text = normalize_status_text(body) or normalize_status_text(subject)
  if not owner_text or len(owner_text) > 500:
    return False

  combined = normalize_status_text(f'{subject}\n{body}')
  keywords = [normalize_status_text(keyword) for keyword in config.status_reply_keywords]
  if not any(keyword and keyword in combined for keyword in keywords):
    return False

  action_pattern = (
    r'\b(add|ajoute|change|configure|contacte|create|delete|deploy|envoie|'
    r'fix|install|installe|merge|modifie|push|remove|restart|send|start|stop)\b'
  )
  if re.search(action_pattern, owner_text) and not re.search(
    r'\b(avancement|status|progress|quoi|avance)\b',
    owner_text,
  ):
    return False

  return True


def message_has_attachments(message: Message) -> bool:
  for part in message.walk():
    if part.is_multipart():
      continue

    disposition = (part.get_content_disposition() or '').lower()
    filename = part.get_filename()
    content_type = part.get_content_type()
    if filename or disposition == 'attachment':
      return True
    if content_type.startswith(('image/', 'video/', 'audio/', 'application/pdf')):
      return True

  return False


def normalize_status_text(value: str) -> str:
  normalized = unicodedata.normalize('NFKD', value)
  without_accents = ''.join(
    char for char in normalized if not unicodedata.combining(char)
  )
  lower = without_accents.lower().replace("'", ' ')
  words = re.sub(r'[^a-z0-9@./:_-]+', ' ', lower)
  return re.sub(r'\s+', ' ', words).strip()


def send_status_reply(
  config: BridgeConfig,
  original_message: Message,
  recipient: str,
  original_subject: str,
) -> bool:
  try:
    app_env = read_env(config.notify_env_file)
    smtp_url = app_env.get('EMAIL_SERVER', '')
    email_from = app_env.get('EMAIL_FROM', '')
    if not smtp_url or not email_from:
      print('status reply skipped: EMAIL_SERVER and EMAIL_FROM must be set.', file=sys.stderr)
      return False

    reply = EmailMessage()
    reply['From'] = email_from
    reply['To'] = recipient
    reply['Subject'] = reply_subject(original_subject)
    reply['Date'] = formatdate(localtime=True)
    message_id = original_message.get('Message-ID', '').strip()
    if message_id:
      reply['In-Reply-To'] = message_id
      reply['References'] = message_id
    reply.set_content(build_status_reply_body(config))

    send_smtp_message(smtp_url, reply, email_from)
    return True
  except Exception as error:  # noqa: BLE001 - bridge must keep polling.
    print(f'owner status reply failed: {error}', file=sys.stderr)
    return False


def reply_subject(subject: str) -> str:
  cleaned = subject.strip() or 'Nayovi growth agent status'
  if cleaned.lower().startswith('re:'):
    return cleaned[:140]

  return f'Re: {cleaned[:136]}'


def build_status_reply_body(config: BridgeConfig) -> str:
  generated_at = datetime.now(timezone.utc).isoformat(timespec='seconds')
  latest_prompt = newest_file(config.state_dir / 'prompts', 'growth-*.md')
  latest_report = newest_file(config.state_dir / 'reports', 'growth-*.md')
  codex_processes = process_lines('codex')
  growth_processes = process_lines('tachi-growth-agent')
  cycle_state = infer_cycle_state(config, latest_prompt, latest_report, codex_processes)

  lines = [
    'Nayovi growth agent status',
    f'Generated at: {generated_at}',
    '',
    'Services',
    f'- tachi-growth-agent: {service_status("tachi-growth-agent.service")}',
    f'- tachi-growth-mail-bridge: {service_status("tachi-growth-mail-bridge.service")}',
    f'- Cycle state: {cycle_state}',
    *process_status_lines('Codex processes', codex_processes),
    *process_status_lines('Growth runner processes', growth_processes),
    '',
    'Repo',
    *repo_status_lines(config),
    '',
    'Inbound',
    f'- Pending owner commands: {count_files(config.queue_dir, "*.md")}',
    f'- Run-now trigger queued: {yes_no(config.trigger_file.exists())}',
    '',
    'Recent outreach',
    *recent_outreach_lines(config),
    '',
    'Latest report',
    *latest_report_lines(latest_report),
    '',
  ]
  return '\n'.join(lines)


def service_status(service_name: str) -> str:
  if not shutil.which('systemctl'):
    return 'systemctl unavailable'

  result = run_command(['systemctl', 'is-active', service_name], timeout=5)
  output = str(result['stdout']).strip()
  if output:
    return output

  return f'unknown (code {result["returncode"]})'


def process_lines(pattern: str) -> list[str]:
  if not shutil.which('pgrep'):
    return []

  result = run_command(['pgrep', '-af', pattern], timeout=5)
  if result['returncode'] not in {0, 1}:
    return []

  lines = []
  for line in str(result['stdout']).splitlines():
    if 'tachi-growth-mail-bridge' in line:
      continue
    lines.append(line[:220])
  return lines[:5]


def process_status_lines(label: str, lines: list[str]) -> list[str]:
  if not lines:
    return [f'- {label}: none detected']

  result = [f'- {label}:']
  result.extend(f'  {line}' for line in lines)
  return result


def infer_cycle_state(
  config: BridgeConfig,
  latest_prompt: pathlib.Path | None,
  latest_report: pathlib.Path | None,
  codex_processes: list[str],
) -> str:
  if codex_processes:
    return 'running now (Codex/growth process active)'
  if config.trigger_file.exists():
    return 'run requested; waiting for next agent wake-up'
  if latest_prompt and (
    latest_report is None or latest_prompt.stat().st_mtime > latest_report.stat().st_mtime
  ):
    return f'cycle likely in progress since {format_mtime(latest_prompt)}'
  if latest_report:
    next_wake = datetime.fromtimestamp(
      latest_report.stat().st_mtime + config.interval_seconds,
      timezone.utc,
    ).isoformat(timespec='seconds')
    return f'idle/sleeping; next regular wake around {next_wake}'

  return 'idle; no completed report found yet'


def repo_status_lines(config: BridgeConfig) -> list[str]:
  if not (config.repo_dir / '.git').exists():
    return [f'- Repo not found: {config.repo_dir}']

  branch = git_output(config, ['branch', '--show-current'])
  status = git_output(config, ['status', '--short', '--branch'])
  latest_commit = git_output(
    config,
    ['log', '-1', '--pretty=format:%h %ci %s'],
  )
  master_commit = git_output(
    config,
    ['log', '-1', '--pretty=format:%h %ci %s', 'origin/master'],
  )
  recent_commits = git_output(
    config,
    ['log', '-3', '--pretty=format:- %h %ci %s'],
  )

  status_lines = status.splitlines()
  dirty_lines = [line for line in status_lines[1:] if line.strip()]
  lines = [
    f'- Path: {config.repo_dir}',
    f'- Current branch: {branch or "(unknown)"}',
    f'- Workspace: {"dirty" if dirty_lines else "clean"}',
    f'- HEAD: {latest_commit or "(unknown)"}',
    f'- origin/master: {master_commit or "(unknown)"}',
  ]
  if dirty_lines:
    lines.append('- Modified files:')
    lines.extend(f'  {line[:180]}' for line in dirty_lines[:12])
  if recent_commits:
    lines.append('- Recent commits:')
    lines.extend(recent_commits.splitlines()[:3])
  return lines


def git_output(config: BridgeConfig, args: list[str], timeout: int = 10) -> str:
  result = run_command(['git', *args], timeout=timeout, cwd=config.repo_dir)
  if result['returncode'] != 0:
    return ''

  return str(result['stdout']).strip()


def recent_outreach_lines(config: BridgeConfig, limit: int = 3) -> list[str]:
  log_path = config.state_dir / 'outreach' / 'sent.jsonl'
  if not log_path.exists():
    return ['- None logged yet']

  raw_lines = tail_lines(log_path, limit)
  items = []
  for raw_line in raw_lines:
    try:
      item = json.loads(raw_line)
    except json.JSONDecodeError:
      continue

    items.append(
      '- {sent_at}: {prospect} <{to}> ({category}) subject="{subject}"'.format(
        sent_at=str(item.get('sent_at', ''))[:19],
        prospect=item.get('prospect', 'unknown'),
        to=item.get('to', 'unknown'),
        category=item.get('category', 'unknown'),
        subject=item.get('subject', ''),
      )[:240]
    )

  return items or ['- None logged yet']


def latest_report_lines(latest_report: pathlib.Path | None) -> list[str]:
  if latest_report is None:
    return ['- No report found yet']

  excerpt = trim_text(
    latest_report.read_text(encoding='utf-8', errors='replace').strip(),
    2200,
  )
  return [
    f'- File: {latest_report}',
    f'- Updated: {format_mtime(latest_report)}',
    '',
    excerpt or '(empty report)',
  ]


def newest_file(directory: pathlib.Path, pattern: str) -> pathlib.Path | None:
  if not directory.exists():
    return None

  matches = list(directory.glob(pattern))
  if not matches:
    return None

  return max(matches, key=lambda path: path.stat().st_mtime)


def count_files(directory: pathlib.Path, pattern: str) -> int:
  if not directory.exists():
    return 0

  return sum(1 for _ in directory.glob(pattern))


def tail_lines(path: pathlib.Path, limit: int) -> list[str]:
  if limit <= 0:
    return []

  return path.read_text(encoding='utf-8', errors='replace').splitlines()[-limit:]


def format_mtime(path: pathlib.Path) -> str:
  return datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).isoformat(
    timespec='seconds'
  )


def trim_text(value: str, max_chars: int) -> str:
  if len(value) <= max_chars:
    return value

  return value[:max_chars].rstrip() + '\n... truncated ...'


def yes_no(value: bool) -> str:
  return 'yes' if value else 'no'


def send_smtp_message(smtp_url: str, message: EmailMessage, email_from: str) -> None:
  parsed = urlparse(smtp_url)
  host = parsed.hostname
  if not host:
    raise ValueError('EMAIL_SERVER must include an SMTP host.')

  port = parsed.port or (465 if parsed.scheme == 'smtps' else 587)
  username = unquote(parsed.username) if parsed.username else None
  password = unquote(parsed.password) if parsed.password else None
  sender = parseaddr(email_from)[1] or email_from

  if parsed.scheme == 'smtps':
    with smtplib.SMTP_SSL(host, port, context=ssl.create_default_context()) as smtp:
      login_if_needed(smtp, username, password)
      smtp.send_message(message, from_addr=sender)
    return

  with smtplib.SMTP(host, port) as smtp:
    smtp.ehlo()
    if parsed.scheme == 'smtp' and port != 25:
      smtp.starttls(context=ssl.create_default_context())
      smtp.ehlo()
    login_if_needed(smtp, username, password)
    smtp.send_message(message, from_addr=sender)


def login_if_needed(
  smtp: smtplib.SMTP | smtplib.SMTP_SSL,
  username: str | None,
  password: str | None,
) -> None:
  if username and password:
    smtp.login(username, password)


def read_seen_ids(path: pathlib.Path) -> set[str]:
  if not path.exists():
    return set()

  return {line.strip() for line in path.read_text(encoding='utf-8').splitlines() if line}


def append_seen_id(path: pathlib.Path, message_key: str) -> None:
  with path.open('a', encoding='utf-8') as seen_file:
    seen_file.write(f'{message_key}\n')


def stable_message_key(message: Message) -> str:
  source = '\n'.join(
    [
      message.get('Message-ID', ''),
      message.get('Date', ''),
      message.get('From', ''),
      message.get('Subject', ''),
    ]
  )
  if not source.strip():
    source = str(message)

  return hashlib.sha256(source.encode('utf-8', errors='replace')).hexdigest()


def command_identifier(message: Message) -> str:
  timestamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
  digest = stable_message_key(message)[:12]
  return f'{timestamp}-{digest}'


def message_sender(message: Message) -> str:
  addresses = getaddresses([message.get('From', '')])
  if not addresses:
    return ''

  return addresses[0][1].strip().lower()


def authenticated_sender_passed(
  config: BridgeConfig, message: Message, sender: str
) -> bool:
  if not config.require_authenticated_sender:
    return True

  domain = sender_domain(sender)
  if not domain:
    return False

  auth_headers = message.get_all('Authentication-Results', [])
  spf_headers = message.get_all('Received-SPF', [])
  if not auth_headers and not spf_headers:
    return False

  header_text = normalize_authentication_text(auth_headers + spf_headers)
  sender_pattern = re.escape(sender)
  domain_pattern = re.escape(domain)

  dmarc_pass = re.search(r'\bdmarc=pass\b', header_text) and re.search(
    rf'\bheader\.from={domain_pattern}\b', header_text
  )
  dkim_pass = re.search(r'\bdkim=pass\b', header_text) and (
    re.search(rf'\bheader\.d={domain_pattern}\b', header_text)
    or re.search(rf'\bheader\.i=[^;\s]*@{domain_pattern}\b', header_text)
  )
  spf_pass = re.search(r'\bspf=pass\b', header_text) and (
    re.search(rf'\bsmtp\.mailfrom={sender_pattern}\b', header_text)
    or re.search(rf'\benvelope-from={sender_pattern}\b', header_text)
    or re.search(rf'\bdomain of {sender_pattern}\b', header_text)
  )

  return bool(dmarc_pass or dkim_pass or spf_pass)


def sender_domain(sender: str) -> str:
  if '@' not in sender:
    return ''

  return sender.rsplit('@', 1)[1].strip().lower()


def normalize_authentication_text(values: list[str]) -> str:
  return ' '.join(' '.join(str(value).lower().split()) for value in values)


def decode_header_value(value: str) -> str:
  try:
    return str(make_header(decode_header(value)))
  except Exception:  # noqa: BLE001
    return value


def extract_body_text(message: Message) -> str:
  if message.is_multipart():
    plain_parts: list[str] = []
    html_parts: list[str] = []
    for part in message.walk():
      if part.is_multipart():
        continue

      disposition = (part.get_content_disposition() or '').lower()
      if disposition == 'attachment':
        continue

      content_type = part.get_content_type()
      text = part_to_text(part)
      if not text:
        continue

      if content_type == 'text/plain':
        plain_parts.append(text)
      elif content_type == 'text/html':
        html_parts.append(html_to_text(text))

    if plain_parts:
      return '\n\n'.join(plain_parts)
    return '\n\n'.join(html_parts)

  return part_to_text(message)


def part_to_text(part: Message) -> str:
  try:
    content = part.get_content()
    if isinstance(content, str):
      return content
  except Exception:  # noqa: BLE001
    pass

  payload = part.get_payload(decode=True)
  if not payload:
    return ''

  charset = part.get_content_charset() or 'utf-8'
  return payload.decode(charset, errors='replace')


def html_to_text(value: str) -> str:
  no_scripts = re.sub(r'<(script|style)\b.*?</\1>', ' ', value, flags=re.I | re.S)
  with_breaks = re.sub(r'<\s*(br|/p|/div|/li)\s*/?>', '\n', no_scripts, flags=re.I)
  stripped = re.sub(r'<[^>]+>', ' ', with_breaks)
  return html.unescape(re.sub(r'[ \t]+', ' ', stripped)).strip()


def strip_quoted_reply(value: str) -> str:
  lines: list[str] = []
  for line in value.splitlines():
    stripped = line.strip()
    if stripped.startswith('>'):
      continue
    if re.match(r'^On .+ wrote:$', stripped, flags=re.I):
      break
    if stripped in {'--', 'Sent from my iPhone', 'Sent from my Android'}:
      break
    lines.append(line)

  return '\n'.join(lines).strip()


def extract_attachments(
  config: BridgeConfig,
  message: Message,
  command_dir: pathlib.Path,
) -> list[dict[str, object]]:
  attachments: list[dict[str, object]] = []

  for index, part in enumerate(message.walk(), start=1):
    if part.is_multipart():
      continue

    filename = part.get_filename()
    disposition = (part.get_content_disposition() or '').lower()
    content_type = part.get_content_type()
    if not filename and disposition != 'attachment':
      if not content_type.startswith(('image/', 'video/', 'audio/', 'application/pdf')):
        continue
      filename = f'attachment-{index}{extension_from_content_type(content_type)}'

    if not filename:
      continue

    payload = part.get_payload(decode=True)
    safe_name = safe_filename(decode_header_value(filename))
    attachment_info: dict[str, object] = {
      'filename': safe_name,
      'email_content_type': content_type,
      'content_disposition': disposition or 'inline',
    }
    if not payload:
      attachment_info['skipped'] = 'empty payload'
      attachments.append(attachment_info)
      continue

    size = len(payload)
    attachment_info['size_bytes'] = size
    if size > config.max_attachment_bytes:
      attachment_info['skipped'] = (
        f'larger than max attachment limit '
        f'({config.max_attachment_bytes // (1024 * 1024)} MB)'
      )
      attachments.append(attachment_info)
      continue

    path = unique_path(command_dir / safe_name)
    path.write_bytes(payload)
    attachment_info['path'] = str(path)
    attachment_info.update(analyze_attachment(config, path, content_type))
    attachments.append(attachment_info)

  return attachments


def extension_from_content_type(content_type: str) -> str:
  suffix = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/webm': '.webm',
  }.get(content_type)
  if suffix:
    return suffix

  main_type = content_type.split('/', 1)[0]
  return f'.{main_type}' if main_type else '.bin'


def safe_filename(filename: str) -> str:
  name = pathlib.Path(filename).name
  name = re.sub(r'[^A-Za-z0-9._ -]+', '_', name).strip(' .')
  if not name:
    return 'attachment.bin'

  return name[:140]


def unique_path(path: pathlib.Path) -> pathlib.Path:
  if not path.exists():
    return path

  stem = path.stem
  suffix = path.suffix
  for index in range(2, 1000):
    candidate = path.with_name(f'{stem}-{index}{suffix}')
    if not candidate.exists():
      return candidate

  raise RuntimeError(f'cannot find unique path for {path}')


def analyze_attachment(
  config: BridgeConfig,
  path: pathlib.Path,
  email_content_type: str,
) -> dict[str, object]:
  info: dict[str, object] = {}
  detected_mime = detect_mime(path)
  if detected_mime:
    info['detected_mime'] = detected_mime

  if is_video(path, email_content_type, detected_mime):
    info.update(analyze_video(config, path))
  elif path.suffix.lower() == '.pdf':
    info.update(extract_pdf_text(path))
  elif is_text_attachment(path, email_content_type, detected_mime):
    info['text_excerpt'] = path.read_text(encoding='utf-8', errors='replace')[:20000]

  return info


def detect_mime(path: pathlib.Path) -> str:
  if not shutil.which('file'):
    return ''

  result = run_command(['file', '--brief', '--mime-type', str(path)], timeout=10)
  if result['returncode'] == 0:
    return str(result['stdout']).strip()

  return ''


def is_video(path: pathlib.Path, email_content_type: str, detected_mime: str) -> bool:
  return (
    email_content_type.startswith('video/')
    or detected_mime.startswith('video/')
    or path.suffix.lower() in VIDEO_EXTENSIONS
  )


def is_text_attachment(
  path: pathlib.Path,
  email_content_type: str,
  detected_mime: str,
) -> bool:
  return (
    email_content_type.startswith('text/')
    or detected_mime.startswith('text/')
    or path.suffix.lower() in TEXT_EXTENSIONS
  )


def analyze_video(config: BridgeConfig, path: pathlib.Path) -> dict[str, object]:
  analysis_dir = path.with_suffix('') / 'analysis'
  analysis_dir.mkdir(parents=True, exist_ok=True)
  info: dict[str, object] = {'analysis_dir': str(analysis_dir)}

  if shutil.which('ffprobe'):
    ffprobe_path = analysis_dir / 'ffprobe.json'
    result = run_command(
      [
        'ffprobe',
        '-v',
        'error',
        '-show_format',
        '-show_streams',
        '-of',
        'json',
        str(path),
      ],
      timeout=60,
    )
    info['ffprobe_returncode'] = result['returncode']
    if result['stdout']:
      ffprobe_path.write_text(str(result['stdout']), encoding='utf-8')
      info['ffprobe_path'] = str(ffprobe_path)
    if result['stderr']:
      info['ffprobe_error'] = str(result['stderr'])[:2000]

  if shutil.which('ffmpeg'):
    frames_dir = analysis_dir / 'frames'
    frames_dir.mkdir(exist_ok=True)
    frame_pattern = frames_dir / 'frame-%03d.jpg'
    frame_result = run_command(
      [
        'ffmpeg',
        '-y',
        '-i',
        str(path),
        '-vf',
        'fps=1/10,scale=1280:-2',
        '-frames:v',
        str(config.max_video_frames),
        str(frame_pattern),
      ],
      timeout=180,
    )
    frame_paths = sorted(str(frame) for frame in frames_dir.glob('frame-*.jpg'))
    info['frame_extract_returncode'] = frame_result['returncode']
    info['frame_paths'] = frame_paths
    if frame_result['stderr'] and frame_result['returncode'] != 0:
      info['frame_extract_error'] = str(frame_result['stderr'])[:2000]

    audio_path = analysis_dir / 'audio.wav'
    audio_result = run_command(
      [
        'ffmpeg',
        '-y',
        '-i',
        str(path),
        '-vn',
        '-ac',
        '1',
        '-ar',
        '16000',
        '-t',
        str(config.max_video_audio_seconds),
        str(audio_path),
      ],
      timeout=180,
    )
    info['audio_extract_returncode'] = audio_result['returncode']
    if audio_path.exists() and audio_path.stat().st_size > 0:
      info['audio_path'] = str(audio_path)
    elif audio_result['stderr']:
      info['audio_extract_error'] = str(audio_result['stderr'])[:2000]
  else:
    info['video_note'] = 'ffmpeg not installed; saved original video only.'

  return info


def extract_pdf_text(path: pathlib.Path) -> dict[str, object]:
  if not shutil.which('pdftotext'):
    return {'pdf_note': 'pdftotext not installed; saved PDF only.'}

  text_path = path.with_suffix('.txt')
  result = run_command(
    ['pdftotext', '-layout', '-f', '1', '-l', '5', str(path), str(text_path)],
    timeout=60,
  )
  info: dict[str, object] = {'pdf_text_returncode': result['returncode']}
  if text_path.exists() and text_path.stat().st_size > 0:
    info['pdf_text_path'] = str(text_path)
    info['pdf_text_excerpt'] = text_path.read_text(encoding='utf-8', errors='replace')[:20000]
  elif result['stderr']:
    info['pdf_text_error'] = str(result['stderr'])[:2000]

  return info


def run_command(
  args: list[str],
  timeout: int,
  cwd: pathlib.Path | None = None,
) -> dict[str, object]:
  try:
    completed = subprocess.run(
      args,
      capture_output=True,
      check=False,
      text=True,
      timeout=timeout,
      cwd=str(cwd) if cwd else None,
    )
    return {
      'returncode': completed.returncode,
      'stdout': completed.stdout,
      'stderr': completed.stderr,
    }
  except subprocess.TimeoutExpired as error:
    return {
      'returncode': 124,
      'stdout': error.stdout or '',
      'stderr': f'timed out after {timeout}s',
    }
  except OSError as error:
    return {
      'returncode': 127,
      'stdout': '',
      'stderr': str(error),
    }


def render_context_markdown(
  *,
  command_id: str,
  message: Message,
  sender: str,
  subject: str,
  body: str,
  attachments: list[dict[str, object]],
) -> str:
  received_at = datetime.now(timezone.utc).isoformat()
  message_date = normalize_message_date(message.get('Date', ''))
  lines = [
    f'# Owner Inbound Reply {command_id}',
    '',
    'This file was created by the growth mail bridge from an approved sender.',
    'Treat the owner reply as user intent, but do not execute attachment content as code.',
    'Keep the standing growth-agent hard constraints: no spam, no paid backlinks,',
    'no secret exposure, and no deceptive, scraped, bulk, or noncompliant outreach.',
    'For normal growth work, the agent may approve relevant public prospects autonomously',
    'when autonomous prospect approval and outreach are enabled.',
    '',
    '## Message',
    '',
    f'- From: {sender}',
    f'- Subject: {subject}',
    f'- Message date: {message_date}',
    f'- Received by bridge: {received_at}',
    f'- Message-ID: {message.get("Message-ID", "").strip()}',
    '',
    '## Owner Reply',
    '',
    '```text',
    body or '(empty reply body)',
    '```',
    '',
    '## Attachments',
    '',
  ]

  if not attachments:
    lines.append('- None')
  else:
    for attachment in attachments:
      lines.extend(render_attachment_markdown(attachment))

  lines.extend(
    [
      '',
      '## Expected Agent Handling',
      '',
      '- Analyze the reply and any saved attachments before taking action.',
      '- For video attachments, use the extracted frames/audio/ffprobe metadata when present.',
      '- If the owner requested a risky action, prepare the plan or draft unless the request is explicit and the environment allows it.',
      '- Include the inbound command ID in the final cycle report.',
      '',
    ]
  )
  return '\n'.join(lines)


def render_attachment_markdown(attachment: dict[str, object]) -> list[str]:
  lines = [
    f'### {attachment.get("filename", "attachment")}',
    '',
    f'- Email content type: {attachment.get("email_content_type", "")}',
    f'- Detected MIME: {attachment.get("detected_mime", "")}',
    f'- Size bytes: {attachment.get("size_bytes", "")}',
  ]
  if attachment.get('path'):
    lines.append(f'- Stored path: {attachment["path"]}')
  if attachment.get('skipped'):
    lines.append(f'- Skipped: {attachment["skipped"]}')
  if attachment.get('analysis_dir'):
    lines.append(f'- Analysis dir: {attachment["analysis_dir"]}')
  if attachment.get('ffprobe_path'):
    lines.append(f'- FFprobe metadata: {attachment["ffprobe_path"]}')
  if attachment.get('audio_path'):
    lines.append(f'- Extracted audio: {attachment["audio_path"]}')
  if attachment.get('pdf_text_path'):
    lines.append(f'- Extracted PDF text: {attachment["pdf_text_path"]}')
  frame_paths = attachment.get('frame_paths')
  if isinstance(frame_paths, list) and frame_paths:
    lines.append('- Extracted frames:')
    lines.extend(f'  - {frame}' for frame in frame_paths)
  if attachment.get('text_excerpt'):
    lines.extend(['', 'Text excerpt:', '', '```text', str(attachment['text_excerpt']), '```'])
  if attachment.get('pdf_text_excerpt'):
    lines.extend(['', 'PDF text excerpt:', '', '```text', str(attachment['pdf_text_excerpt']), '```'])

  lines.append('')
  return lines


def normalize_message_date(value: str) -> str:
  if not value:
    return ''

  try:
    parsed = parsedate_to_datetime(value)
    return parsed.isoformat()
  except Exception:  # noqa: BLE001
    return value


def write_manifest(
  path: pathlib.Path,
  message: Message,
  sender: str,
  subject: str,
  body: str,
  attachments: list[dict[str, object]],
) -> None:
  manifest = {
    'from': sender,
    'subject': subject,
    'date': normalize_message_date(message.get('Date', '')),
    'message_id': message.get('Message-ID', ''),
    'body': body,
    'attachments': attachments,
  }
  path.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding='utf-8')


def trigger_growth_agent(config: BridgeConfig) -> None:
  config.trigger_file.parent.mkdir(parents=True, exist_ok=True)
  config.trigger_file.write_text(
    datetime.now(timezone.utc).isoformat(),
    encoding='utf-8',
  )


def maybe_send_confirmation(
  config: BridgeConfig,
  command_id: str,
  subject: str,
  context_path: pathlib.Path,
) -> None:
  if (
    not config.confirmation_enabled
    or not config.notify_email
    or not config.notifier_path.exists()
  ):
    return

  confirmation_subject = f'Nayovi inbound queued: {subject[:80] or command_id}'
  result = subprocess.run(
    [
      str(config.notifier_path),
      '--env-file',
      str(config.notify_env_file),
      '--to',
      config.notify_email,
      '--subject',
      confirmation_subject,
      '--report-file',
      str(context_path),
      '--repo-dir',
      str(config.state_dir),
      '--cycle-id',
      command_id,
    ],
    capture_output=True,
    check=False,
    text=True,
  )
  if result.returncode != 0:
    print(
      f'owner inbound confirmation failed: {result.stderr.strip()}',
      file=sys.stderr,
    )


if __name__ == '__main__':
  raise SystemExit(main())
