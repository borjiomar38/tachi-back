#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import pathlib
import re
import smtplib
import ssl
import sys
import unicodedata
from datetime import datetime, timezone, tzinfo
from email.message import EmailMessage
from email.utils import formatdate, parseaddr
from urllib.parse import unquote, urlparse
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


DEFAULT_ENV_FILE = pathlib.Path('/opt/tachi-back/.env.production')
TUNISIA_TIMEZONE = 'Africa/Tunis'
FRENCH_MONTHS = (
  '',
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
)


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
  done_items = extract_section_items(
    report,
    ('changed', 'j ai avance sur', 'jai avance sur', 'fait', 'done'),
    limit=5,
  )
  outreach_items = extract_section_items(
    report,
    ('outreach', 'outreach envoye', 'outreach sent', 'contacts envoyes'),
    limit=4,
  )
  owner_items = owner_action_items(report)

  return '\n'.join(
    [
      'Update Nayovi Growth Agent',
      f'Date: {format_tunisia_datetime(datetime.now(timezone.utc))}',
      '',
      'Résumé:',
      f'- {summary_sentence(report)}',
      '',
      'Fait:',
      *bullet_lines(done_items, '- Le cycle a terminé sans action business claire dans le résumé.'),
      '',
      'Prospection:',
      *bullet_lines(outreach_items, '- Aucun outreach externe nouveau dans ce cycle.'),
      '',
      'Pourquoi c’est utile:',
      '- Ces actions peuvent améliorer le SEO, les backlinks, la confiance et la conversion vers installation, essai ou abonnement.',
      '- Les contacts presse/partenaires peuvent créer des opportunités de reviews, trafic qualifié, collaboration ou investissement.',
      '',
      'Besoin de toi:',
      *bullet_lines(owner_items, '- Rien pour l’instant.'),
      '',
      'Détails techniques:',
      f'- Cycle: {cycle_id}',
      f'- Rapport: {report_file}',
      f'- Repo: {repo_dir}',
      '',
      'Si tu veux le rapport brut complet, réponds avec "status technique" ou "logs".',
      '',
    ]
  )


def summary_sentence(report: str) -> str:
  lowered = normalize_text(report)
  if 'cycle complete' in lowered or 'cycle termine' in lowered:
    if 'outreach' in lowered or 'pitch' in lowered or 'sent individualized' in lowered:
      return 'Cycle terminé: amélioration growth/SEO faite et prospection envoyée.'
    return 'Cycle terminé: amélioration growth/SEO faite.'

  return 'Nouveau rapport reçu du growth agent.'


def owner_action_items(report: str) -> list[str]:
  lowered = normalize_text(report)
  items: list[str] = []
  action_lines = [
    line
    for line in report.splitlines()
    if any(marker in line for marker in ('OWNER_ACTION_REQUIRED', 'MEETING_REQUIRED', 'CALL_REQUIRED'))
    and not re.search(r'\bno\s+`?(OWNER_ACTION_REQUIRED|MEETING_REQUIRED|CALL_REQUIRED)`?\b', line, re.I)
    and 'aucune action' not in normalize_text(line)
  ]
  if action_lines:
    items.append('Oui: le dernier rapport demande une action propriétaire ou un call.')

  if (
    'demo video' in lowered
    and (
      'not present' in lowered
      or 'not available' in lowered
      or 'could not actually evaluate' in lowered
      or 'needs to be resent' in lowered
    )
  ):
    items.append(
      'Si tu veux une vraie analyse vidéo, renvoie la vidéo en pièce jointe ou donne un lien accessible.'
    )

  return items


def extract_section_items(
  report: str,
  labels: tuple[str, ...],
  limit: int,
) -> list[str]:
  items: list[str] = []
  capture = False
  normalized_labels = tuple(normalize_text(label) for label in labels)

  for raw_line in report.splitlines():
    line = raw_line.strip()
    normalized = normalize_text(line.rstrip(':'))
    if any(label and normalized == label for label in normalized_labels):
      capture = True
      continue

    if not capture:
      continue
    if not line:
      continue
    if line.startswith('##') or (line.endswith(':') and not line.startswith(('-', '*'))):
      break
    if not line.startswith(('-', '*')):
      continue

    item = clean_report_item(line.lstrip('-* '))
    if item:
      items.append(item)
    if len(items) >= limit:
      break

  return items


def clean_report_item(value: str) -> str:
  cleaned = re.sub(r'`([^`]+)`', r'\1', value).strip()
  cleaned = re.sub(r'^/?[\w./-]+\s*:\s*', '', cleaned)
  cleaned = re.sub(r'\s+', ' ', cleaned).strip()
  if not cleaned:
    return ''

  if re.search(
    r'\b(tsc|git|commit|branch|pushed|validation|pre-commit|pre-push|remote branch|'
    r'report file|repo|cycle id|no-verify)\b',
    cleaned,
    re.I,
  ):
    return ''

  if re.search(r'^Added a /translate-manhwa-ai .+Demo quality.+section', cleaned, re.I):
    return (
      'Ajout d’une section “Demo quality” pour montrer la qualité OCR, '
      'la continuité Android et donner plus confiance avant upgrade.'
    )
  if re.search(r'^Updated sitemap freshness for /translate-manhwa-ai', cleaned, re.I):
    return 'Sitemap mis à jour pour /translate-manhwa-ai.'
  if re.search(r'^Updated docs/growth/', cleaned, re.I):
    return 'Suivi growth mis à jour: prospects backlinks, drafts outreach et log.'
  pitch_match = re.search(
    r'^Sent individualized compliant pitch to (.+?) via .+?:\s*([^\s]+)',
    cleaned,
    re.I,
  )
  if pitch_match:
    email_address = pitch_match.group(2).rstrip('.')
    return f'Pitch personnalisé envoyé à {pitch_match.group(1)} ({email_address}).'
  if re.search(r'^Logged recipient, rationale, status', cleaned, re.I):
    return 'Suivi enregistré pour éviter les relances abusives.'

  cleaned = re.sub(r'\bpassed\b', 'réussi', cleaned, flags=re.I)
  cleaned = re.sub(r'\bAdded\b', 'Ajouté', cleaned)
  cleaned = re.sub(r'\bUpdated\b', 'Mis à jour', cleaned)
  cleaned = re.sub(r'\bSent individualized compliant pitch to\b', 'Pitch personnalisé envoyé à', cleaned)
  cleaned = re.sub(r'\bLogged\b', 'Suivi enregistré:', cleaned)
  cleaned = re.sub(r'\bNo demo video\b.*', 'Vidéo demo non disponible côté agent.', cleaned)
  return sentence_case(cleaned[:240])


def bullet_lines(items: list[str], empty_line: str) -> list[str]:
  if not items:
    return [empty_line]

  return [f'- {item}' for item in items]


def sentence_case(value: str) -> str:
  if not value:
    return value

  return value[0].upper() + value[1:]


def normalize_text(value: str) -> str:
  normalized = unicodedata.normalize('NFKD', value)
  without_accents = ''.join(
    char for char in normalized if not unicodedata.combining(char)
  )
  lowered = without_accents.lower().replace("'", ' ')
  words = re.sub(r'[^a-z0-9@./:_-]+', ' ', lowered)
  return re.sub(r'\s+', ' ', words).strip()


def format_tunisia_datetime(value: datetime) -> str:
  if value.tzinfo is None:
    value = value.replace(tzinfo=timezone.utc)

  local = value.astimezone(tunisia_timezone())
  month = FRENCH_MONTHS[local.month]
  return (
    f'{local.day} {month} {local.year} à '
    f'{local.hour:02d}:{local.minute:02d} (Tunisie)'
  )


def tunisia_timezone() -> tzinfo:
  try:
    return ZoneInfo(TUNISIA_TIMEZONE)
  except ZoneInfoNotFoundError:
    return timezone.utc


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
