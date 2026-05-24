#!/usr/bin/env bash
set -euo pipefail

env_slug="${1:-}"
app_dir="${TACHI_APP_DIR:-/opt/tachi-back}"
lock_file="${TACHI_DEPLOY_LOCK_FILE:-/tmp/tachi-back-deploy.lock}"
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

if [[ "${TACHI_DEPLOY_LOCKED:-}" != "1" ]]; then
  exec 9>"${lock_file}"
  echo "Waiting for Contabo deployment lock: ${lock_file}"
  flock 9
  echo "Acquired Contabo deployment lock"
  TACHI_DEPLOY_LOCKED=1 "$0" "$@"
  exit $?
fi

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

health_attempts="${TACHI_DEPLOY_HEALTH_ATTEMPTS:-30}"
health_delay_seconds="${TACHI_DEPLOY_HEALTH_DELAY_SECONDS:-5}"

echo "Checking deployment health: ${health_url}"
for ((attempt = 1; attempt <= health_attempts; attempt++)); do
  if curl -fsSI --max-time 10 "${health_url}" >/dev/null; then
    echo "Health check passed on attempt ${attempt}/${health_attempts}"
    break
  fi

  if ((attempt == health_attempts)); then
    echo "Health check failed after ${health_attempts} attempts: ${health_url}" >&2
    docker compose \
      --env-file "${env_file}" \
      -p "${app_project}" \
      -f "${app_compose_file}" \
      ps >&2 || true
    docker compose \
      --env-file "${proxy_env_file}" \
      -p "${proxy_project}" \
      -f "${proxy_compose_file}" \
      ps >&2 || true
    exit 1
  fi

  echo "Health check not ready on attempt ${attempt}/${health_attempts}; retrying in ${health_delay_seconds}s" >&2
  sleep "${health_delay_seconds}"
done

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
