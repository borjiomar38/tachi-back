#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${TACHI_ENV_FILE:-/opt/tachi-back/.env.production}"

read_env_value() {
  local key="$1"

  if [[ ! -f "${ENV_FILE}" ]]; then
    return 0
  fi

  grep -E "^${key}=" "${ENV_FILE}" \
    | tail -n 1 \
    | cut -d= -f2- \
    | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

base_url="${SEO_DISTRIBUTION_CRON_BASE_URL:-$(read_env_value VITE_BASE_URL)}"
cron_secret="${CRON_SECRET:-$(read_env_value CRON_SECRET)}"

if [[ -z "${base_url}" || -z "${cron_secret}" ]]; then
  echo "Missing VITE_BASE_URL or CRON_SECRET in ${ENV_FILE}." >&2
  exit 1
fi

curl -fsS \
  -H "Authorization: Bearer ${cron_secret}" \
  "${base_url%/}/api/cron/seo-distribution"
