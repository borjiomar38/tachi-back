#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import pathlib
import smtplib
import ssl
import sys
from email.message import EmailMessage
from email.utils import formatdate, parseaddr
from urllib.parse import unquote, urlparse


DEFAULT_ENV_FILE = pathlib.Path('/opt/tachi-back/.env.production')


def main() -> int:
  parser = argparse.ArgumentParser(
    description='Send a private owner notification for a growth-agent report.'
  )
  parser.add_argument('--env-file', default=str(DEFAULT_ENV_FILE))
  parser.add_argument('--to', required=True)
  parser.add_argument('--subject', required=True)
  parser.add_argument('--report-file', required=True)
  parser.add_argument('--repo-dir', required=True)
  parser.add_argument('--cycle-id', required=True)
  args = parser.parse_args()

  env = read_env(pathlib.Path(args.env_file))
  smtp_url = env.get('EMAIL_SERVER')
  email_from = env.get('EMAIL_FROM')
  if not smtp_url or not email_from:
    print('EMAIL_SERVER and EMAIL_FROM must be set.', file=sys.stderr)
    return 1

  report = pathlib.Path(args.report_file).read_text(encoding='utf-8')
  body = build_body(
    cycle_id=args.cycle_id,
    report=report,
    report_file=args.report_file,
    repo_dir=args.repo_dir,
  )
  message = EmailMessage()
  message['From'] = email_from
  message['To'] = args.to
  message['Subject'] = args.subject
  message['Date'] = formatdate(localtime=True)
  message.set_content(body)

  send_message(smtp_url, message, email_from)
  print(f'notification sent to {args.to}')
  return 0


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


def build_body(*, cycle_id: str, report: str, report_file: str, repo_dir: str) -> str:
  return '\n'.join(
    [
      f'Nayovi growth agent cycle: {cycle_id}',
      f'Report file: {report_file}',
      f'Repo: {repo_dir}',
      '',
      'This is a private owner notification. No external outreach email was sent.',
      '',
      report.strip(),
      '',
    ]
  )


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
