#!/usr/bin/env bash
set -euo pipefail

env_slug="${1:-}"
app_dir="${TACHI_APP_DIR:-/opt/tachi-back}"
proxy_project="${TACHI_CADDY_PROJECT:-tachi-caddy}"
proxy_env_file="${TACHI_CADDY_ENV_FILE:-${app_dir}/.env.caddy}"
proxy_compose_file="deploy/contabo/docker-compose.caddy.yml"
app_compose_file="deploy/contabo/docker-compose.app.yml"

case "${env_slug}" in
  production | staging)
    ;;
  *)
    echo "Usage: $0 production|staging" >&2
    exit 2
    ;;
esac

env_file="${app_dir}/.env.${env_slug}"
app_project="tachi-${env_slug}"

cd "${app_dir}"

if [[ ! -f "${env_file}" ]]; then
  echo "Missing environment file: ${env_file}" >&2
  exit 1
fi

if [[ ! -f "${proxy_env_file}" ]]; then
  echo "Missing Caddy environment file: ${proxy_env_file}" >&2
  exit 1
fi

docker network create "${TACHI_PROXY_NETWORK:-tachi-proxy}" >/dev/null 2>&1 || true

echo "Deploying ${env_slug} from ${app_dir}"

docker compose \
  --env-file "${env_file}" \
  -p "${app_project}" \
  -f "${app_compose_file}" \
  up -d postgres

docker compose \
  --env-file "${env_file}" \
  -p "${app_project}" \
  -f "${app_compose_file}" \
  build migrate

docker compose \
  --env-file "${env_file}" \
  -p "${app_project}" \
  -f "${app_compose_file}" \
  --profile tools \
  run --rm migrate

docker compose \
  --env-file "${env_file}" \
  -p "${app_project}" \
  -f "${app_compose_file}" \
  up -d --build app

docker compose \
  --env-file "${proxy_env_file}" \
  -p "${proxy_project}" \
  -f "${proxy_compose_file}" \
  up -d

case "${env_slug}" in
  production)
    health_url="https://tachiyomiat.com/robots.txt"
    ;;
  staging)
    health_url="https://staging.62.171.171.212.sslip.io/robots.txt"
    ;;
esac

curl -fsSI "${health_url}" >/dev/null

docker compose \
  --env-file "${env_file}" \
  -p "${app_project}" \
  -f "${app_compose_file}" \
  ps

docker compose \
  --env-file "${proxy_env_file}" \
  -p "${proxy_project}" \
  -f "${proxy_compose_file}" \
  ps

echo "Deployment completed for ${env_slug}"
