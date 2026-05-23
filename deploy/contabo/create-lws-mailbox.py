#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import pathlib
import secrets
import string
import sys
import urllib.error
import urllib.parse
import urllib.request


DEFAULT_ENV_FILE = pathlib.Path('/opt/tachi-back/.env.lws')
DEFAULT_SECRET_DIR = pathlib.Path('/opt/tachi-back/.secrets')
DEFAULT_API_BASE_URL = 'https://api.lws.net/v1'


def main() -> int:
  parser = argparse.ArgumentParser(
    description='Create an LWS mailbox without printing credentials.'
  )
  parser.add_argument('mailbox', help='Mailbox address to create')
  parser.add_argument(
    '--env-file',
    default=str(DEFAULT_ENV_FILE),
    help='Path to the LWS env file containing LWS_API_LOGIN/LWS_API_KEY',
  )
  parser.add_argument(
    '--secret-dir',
    default=str(DEFAULT_SECRET_DIR),
    help='Directory where generated mailbox credentials are stored',
  )
  parser.add_argument(
    '--test-mode',
    action='store_true',
    help='Send X-Test-Mode: true to the LWS API',
  )

  args = parser.parse_args()
  mailbox = args.mailbox.strip().lower()
  if '@' not in mailbox:
    print('Mailbox must be a full email address.', file=sys.stderr)
    return 2

  env = read_env(pathlib.Path(args.env_file))
  login = env.get('LWS_API_LOGIN')
  api_key = env.get('LWS_API_KEY')
  base_url = env.get('LWS_API_BASE_URL', DEFAULT_API_BASE_URL).rstrip('/')
  if not login or not api_key:
    print('Missing LWS_API_LOGIN or LWS_API_KEY.', file=sys.stderr)
    return 1

  secret_dir = pathlib.Path(args.secret_dir)
  secret_file = secret_dir / f'{mailbox.replace("@", "-at-")}.env'
  password = read_existing_password(secret_file) or generate_password()
  payload = call_lws_mail_api(
    api_key=api_key,
    base_url=base_url,
    login=login,
    mailbox=mailbox,
    password=password,
    test_mode=args.test_mode,
  )

  code = payload.get('code')
  info = str(payload.get('info') or payload.get('message') or '')
  if code == 200:
    write_secret(secret_file, mailbox, password)
    print(f'created {mailbox}; credentials stored at {secret_file}')
    return 0

  if code == 400 and ('exist' in info.lower() or 'already' in info.lower()):
    write_secret(secret_file, mailbox, password)
    print(f'{mailbox} already exists; local credential file preserved at {secret_file}')
    return 0

  print(json.dumps({'code': code, 'info': info}, ensure_ascii=False), file=sys.stderr)
  return 1


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


def generate_password() -> str:
  alphabet = string.ascii_letters + string.digits + '!#%+-_?@'
  required_chars = [
    secrets.choice(string.ascii_lowercase),
    secrets.choice(string.ascii_uppercase),
    secrets.choice(string.digits),
    secrets.choice('!#%+-_?@'),
  ]
  password_chars = required_chars + [secrets.choice(alphabet) for _ in range(28)]
  secrets.SystemRandom().shuffle(password_chars)

  return ''.join(password_chars)


def read_existing_password(path: pathlib.Path) -> str | None:
  if not path.exists():
    return None

  for raw_line in path.read_text(encoding='utf-8').splitlines():
    if raw_line.startswith('MAIL_PASSWORD='):
      return clean_env_value(raw_line.split('=', 1)[1])

  return None


def write_secret(path: pathlib.Path, mailbox: str, password: str) -> None:
  path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
  local_part, domain = mailbox.split('@', 1)
  content = '\n'.join(
    [
      f'MAILBOX={mailbox}',
      f'MAIL_PASSWORD={password}',
      f'SMTP_HOST=mail.{domain}',
      'SMTP_PORT=587',
      f'SMTP_USER={mailbox}',
      f'MAIL_LOCAL_PART={local_part}',
      f'MAIL_DOMAIN={domain}',
      '',
    ]
  )
  path.write_text(content, encoding='utf-8')
  os.chmod(path, 0o600)


def call_lws_mail_api(
  *,
  api_key: str,
  base_url: str,
  login: str,
  mailbox: str,
  password: str,
  test_mode: bool,
) -> dict[str, object]:
  request = urllib.request.Request(
    f'{base_url}/mail/{urllib.parse.quote(mailbox, safe="")}',
    data=json.dumps({'password': password}).encode('utf-8'),
    method='POST',
    headers={
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Auth-Login': login,
      'X-Auth-Pass': api_key,
      **({'X-Test-Mode': 'true'} if test_mode else {}),
    },
  )

  try:
    with urllib.request.urlopen(request, timeout=45) as response:
      return json.loads(response.read().decode('utf-8'))
  except urllib.error.HTTPError as error:
    body = error.read().decode('utf-8')
    try:
      return json.loads(body)
    except json.JSONDecodeError:
      return {'code': error.code, 'info': body or error.reason}


if __name__ == '__main__':
  raise SystemExit(main())
