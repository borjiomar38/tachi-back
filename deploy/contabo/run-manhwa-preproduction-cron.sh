#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${TACHI_APP_DIR:-/opt/tachi-back}"
ENV_FILE="${MANHWA_AGENT_ENV_FILE:-${APP_DIR}/.env.manhwa-production}"
LOCK_FILE="${MANHWA_PREPRODUCTION_LOCK_FILE:-/var/lock/tachi-manhwa-preproduction-cron.lock}"

load_env_file() {
  local file="$1"

  if [[ -f "${file}" ]]; then
    set -a
    # shellcheck source=/dev/null
    . "${file}"
    set +a
  fi
}

log() {
  printf '[%s] %s\n' "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" "$*"
}

acquire_lock() {
  mkdir -p "$(dirname "${LOCK_FILE}")"
  if command -v flock >/dev/null 2>&1; then
    exec 9>"${LOCK_FILE}"
    flock -n 9
    return $?
  fi

  lock_dir="${LOCK_FILE}.d"
  if mkdir "${lock_dir}" 2>/dev/null; then
    trap 'rmdir "${lock_dir}" 2>/dev/null || true' EXIT
    return 0
  fi
  return 1
}

run_script() {
  local script="$1"
  shift

  if [[ ! -f "${script}" ]]; then
    echo "Required manhwa script is missing: ${script}" >&2
    exit 1
  fi

  if [[ "${script}" == *.mjs ]]; then
    node "${script}" "$@"
  else
    "${script}" "$@"
  fi
}

load_env_file "${ENV_FILE}"

runner="${MANHWA_PREPRODUCTION_RUNNER_PATH:-${APP_DIR}/deploy/contabo/run-manhwa-preproduction-task.py}"
asset_builder="${MANHWA_CHARACTER_ASSET_BUILDER_PATH:-${APP_DIR}/deploy/contabo/build-manhwa-character-assets.mjs}"
context_indexer="${MANHWA_CONTEXT_INDEXER_PATH:-${APP_DIR}/deploy/contabo/build-manhwa-context-index.mjs}"
series_slug="${MANHWA_SERIES_SLUG:-the-eclipse-crown}"
chapter_number="${MANHWA_CHAPTER_NUMBER:-1}"
context_root="${MANHWA_CONTEXT_ROOT:-docs/manhwa/context}"
package_root="${MANHWA_PACKAGE_ROOT:-docs/manhwa/generated}"
public_root="${MANHWA_PUBLIC_ROOT:-docs/manhwa/private}"
task_type="${MANHWA_PREPRODUCTION_TASK_TYPE:-auto}"
character_id="${MANHWA_PREPRODUCTION_CHARACTER_ID:-}"
dry_run="${MANHWA_PREPRODUCTION_DRY_RUN:-false}"

if ! acquire_lock; then
  log "Nayovi manhwa preproduction cron is already running; skipping."
  exit 0
fi

if [[ ! -d "${APP_DIR}" ]]; then
  echo "App directory is missing: ${APP_DIR}" >&2
  exit 1
fi

cd "${APP_DIR}"

runner_args=(
  --series-slug
  "${series_slug}"
  --chapter-number
  "${chapter_number}"
  --context-root
  "${context_root}"
  --task-type
  "${task_type}"
)

if [[ -n "${character_id}" ]]; then
  runner_args+=(--character-id "${character_id}")
fi

if [[ "${dry_run}" == "true" ]]; then
  runner_args+=(--dry-run)
fi

log "Running one Nayovi manhwa preproduction task for ${series_slug}."
python3 "${runner}" "${runner_args[@]}"

log "Refreshing character folders and fast context indexes after preproduction."
run_script "${asset_builder}" \
  --series-slug "${series_slug}" \
  --context-root "${context_root}" \
  --public-root "${public_root}"

run_script "${context_indexer}" \
  --series-slug "${series_slug}" \
  --chapter-number "${chapter_number}" \
  --context-root "${context_root}" \
  --package-root "${package_root}"
