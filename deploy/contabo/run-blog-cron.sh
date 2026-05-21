#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${TACHI_ENV_FILE:-/opt/tachi-back/.env.production}"

read_env_value() {
  local key="$1"

  sed -n "s/^${key}=//p" "${ENV_FILE}" \
    | tail -n 1 \
    | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

base_url="$(read_env_value VITE_BASE_URL)"
cron_secret="$(read_env_value CRON_SECRET)"

if [[ -z "${base_url}" || -z "${cron_secret}" ]]; then
  echo "VITE_BASE_URL and CRON_SECRET must be set in ${ENV_FILE}" >&2
  exit 1
fi

curl -fsS \
  -H "Authorization: Bearer ${cron_secret}" \
  "${base_url%/}/api/cron/generate-blog-article"
