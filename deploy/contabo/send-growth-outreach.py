#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import pathlib
import smtplib
import ssl
import sys
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import formatdate, parseaddr
from urllib.parse import unquote, urlparse


def default_app_env_file() -> pathlib.Path:
  configured = os.environ.get('GROWTH_AGENT_OUTREACH_ENV_FILE')
  if configured:
    return pathlib.Path(configured)

  growth_mail_env = pathlib.Path('/opt/tachi-back/.env.growth-mail')
  if growth_mail_env.exists():
    return growth_mail_env

  return pathlib.Path('/opt/tachi-back/.env.production')


DEFAULT_APP_ENV_FILE = default_app_env_file()
DEFAULT_GROWTH_ENV_FILE = pathlib.Path('/opt/tachi-back/.env.growth-agent')
DEFAULT_STATE_DIR = pathlib.Path('/var/lib/tachi-growth-agent/outreach')
OPT_OUT_MARKERS = ('opt out', 'not relevant', 'not interested', 'will not follow up')


def main() -> int:
  parser = argparse.ArgumentParser(
    description='Send a compliant autonomous growth outreach email.'
  )
  parser.add_argument('--env-file', default=str(DEFAULT_APP_ENV_FILE))
  parser.add_argument('--growth-env-file', default=str(DEFAULT_GROWTH_ENV_FILE))
  parser.add_argument('--state-dir', default=str(DEFAULT_STATE_DIR))
  parser.add_argument('--to', required=True)
  parser.add_argument('--subject', required=True)
  parser.add_argument('--body-file', required=True)
  parser.add_argument('--prospect', required=True)
  parser.add_argument('--category', default='')
  parser.add_argument('--contact-path', default='')
  args = parser.parse_args()

  app_env = read_env(pathlib.Path(args.env_file))
  growth_env = read_env(pathlib.Path(args.growth_env_file))
  mode = growth_env.get('GROWTH_AGENT_EMAIL_SEND_MODE', 'draft')
  daily_cap = int(growth_env.get('GROWTH_AGENT_MAX_OUTREACH_EMAILS_PER_DAY', '10'))
  state_dir = pathlib.Path(args.state_dir)
  body = pathlib.Path(args.body_file).read_text(encoding='utf-8').strip()

  validate_outreach(args.to, args.subject, body, daily_cap)

  if mode != 'send':
    draft_path = write_draft(state_dir, args, body, mode)
    print(f'outreach draft saved because mode={mode}: {draft_path}')
    return 0

  today_count = sent_count_today(state_dir)
  if today_count >= daily_cap:
    print(
      f'daily outreach cap reached: {today_count}/{daily_cap}; not sending.',
      file=sys.stderr,
    )
    return 2

  smtp_url = app_env.get('EMAIL_SERVER')
  email_from = app_env.get('EMAIL_FROM')
  if not smtp_url or not email_from:
    print('EMAIL_SERVER and EMAIL_FROM must be set.', file=sys.stderr)
    return 1

  message = EmailMessage()
  message['From'] = email_from
  message['To'] = args.to
  message['Subject'] = args.subject
  message['Date'] = formatdate(localtime=True)
  message.set_content(body)

  send_message(smtp_url, message, email_from)
  log_delivery(state_dir, args, body)
  print(f'outreach sent to {args.to} for {args.prospect}')
  return 0


def read_env(path: pathlib.Path) -> dict[str, str]:
  values: dict[str, str] = {}
  if not path.exists():
    return values

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


def validate_outreach(to_address: str, subject: str, body: str, daily_cap: int) -> None:
  parsed_to = parseaddr(to_address)[1]
  if not parsed_to or '@' not in parsed_to:
    raise ValueError('A valid public business recipient email is required.')

  if not subject.strip():
    raise ValueError('Subject is required.')

  if len(subject) > 120:
    raise ValueError('Subject is too long for personalized outreach.')

  if len(body) < 80:
    raise ValueError('Body is too short to be useful or personalized.')

  if not any(marker in body.lower() for marker in OPT_OUT_MARKERS):
    raise ValueError('Body must include a clear opt-out or no-follow-up line.')

  if daily_cap < 1 or daily_cap > 25:
    raise ValueError('Daily cap must be between 1 and 25.')


def sent_count_today(state_dir: pathlib.Path) -> int:
  log_path = state_dir / 'sent.jsonl'
  if not log_path.exists():
    return 0

  today = datetime.now(timezone.utc).date().isoformat()
  count = 0
  for line in log_path.read_text(encoding='utf-8').splitlines():
    try:
      item = json.loads(line)
    except json.JSONDecodeError:
      continue
    if str(item.get('sent_at', '')).startswith(today):
      count += 1

  return count


def write_draft(
  state_dir: pathlib.Path, args: argparse.Namespace, body: str, mode: str
) -> pathlib.Path:
  drafts_dir = state_dir / 'drafts'
  drafts_dir.mkdir(parents=True, exist_ok=True)
  timestamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
  draft_path = drafts_dir / f'{timestamp}-{slugify(args.prospect)}.json'
  draft_path.write_text(
    json.dumps(
      {
        'mode': mode,
        'to': args.to,
        'subject': args.subject,
        'prospect': args.prospect,
        'category': args.category,
        'contact_path': args.contact_path,
        'body': body,
      },
      indent=2,
      sort_keys=True,
    ),
    encoding='utf-8',
  )
  return draft_path


def log_delivery(state_dir: pathlib.Path, args: argparse.Namespace, body: str) -> None:
  state_dir.mkdir(parents=True, exist_ok=True)
  log_path = state_dir / 'sent.jsonl'
  item = {
    'sent_at': datetime.now(timezone.utc).isoformat(),
    'to': parseaddr(args.to)[1],
    'subject': args.subject,
    'prospect': args.prospect,
    'category': args.category,
    'contact_path': args.contact_path,
    'body_sha256': __import__('hashlib').sha256(body.encode('utf-8')).hexdigest(),
  }
  with log_path.open('a', encoding='utf-8') as log_file:
    log_file.write(json.dumps(item, sort_keys=True) + '\n')


def slugify(value: str) -> str:
  slug = ''.join(char.lower() if char.isalnum() else '-' for char in value)
  return '-'.join(part for part in slug.split('-') if part)[:80] or 'prospect'


def send_message(smtp_url: str, message: EmailMessage, email_from: str) -> None:
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


if __name__ == '__main__':
  raise SystemExit(main())
