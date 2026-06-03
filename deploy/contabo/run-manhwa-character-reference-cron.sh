#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${TACHI_APP_DIR:-/opt/tachi-back}"
ENV_FILE="${MANHWA_AGENT_ENV_FILE:-${APP_DIR}/.env.manhwa-production}"
LOCK_FILE="${MANHWA_CHARACTER_REFERENCE_LOCK_FILE:-/var/lock/tachi-manhwa-character-reference-cron.lock}"

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

asset_builder="${MANHWA_CHARACTER_ASSET_BUILDER_PATH:-${APP_DIR}/deploy/contabo/build-manhwa-character-assets.mjs}"
context_indexer="${MANHWA_CONTEXT_INDEXER_PATH:-${APP_DIR}/deploy/contabo/build-manhwa-context-index.mjs}"
reference_renderer="${MANHWA_CHARACTER_REFERENCE_RENDERER_PATH:-${APP_DIR}/deploy/contabo/render-manhwa-character-references.py}"
codex_image_script="${MANHWA_IMAGE_SCRIPT_PATH:-/usr/local/bin/tachi-codex-image-generator}"
series_slug="${MANHWA_SERIES_SLUG:-the-eclipse-crown}"
chapter_number="${MANHWA_CHAPTER_NUMBER:-1}"
context_root="${MANHWA_CONTEXT_ROOT:-docs/manhwa/context}"
package_root="${MANHWA_PACKAGE_ROOT:-docs/manhwa/generated}"
public_root="${MANHWA_PUBLIC_ROOT:-docs/manhwa/private}"
daily_limit="${MANHWA_CHARACTER_REFERENCE_DAILY_LIMIT:-1}"
character_id="${MANHWA_CHARACTER_REFERENCE_CHARACTER_ID:-}"
force="${MANHWA_CHARACTER_REFERENCE_FORCE:-false}"
dry_run="${MANHWA_CHARACTER_REFERENCE_DRY_RUN:-false}"

if ! acquire_lock; then
  log "Nayovi manhwa character reference cron is already running; skipping."
  exit 0
fi

if [[ ! -d "${APP_DIR}" ]]; then
  echo "App directory is missing: ${APP_DIR}" >&2
  exit 1
fi

cd "${APP_DIR}"

log "Refreshing character folders and fast context indexes for ${series_slug}."
run_script "${asset_builder}" \
  --series-slug "${series_slug}" \
  --context-root "${context_root}" \
  --public-root "${public_root}"

run_script "${context_indexer}" \
  --series-slug "${series_slug}" \
  --chapter-number "${chapter_number}" \
  --context-root "${context_root}" \
  --package-root "${package_root}"

renderer_args=(
  --series-slug
  "${series_slug}"
  --context-root
  "${context_root}"
  --codex-image-script
  "${codex_image_script}"
  --limit
  "${daily_limit}"
)

if [[ -n "${character_id}" ]]; then
  renderer_args+=(--character-id "${character_id}")
fi

if [[ "${force}" == "true" ]]; then
  renderer_args+=(--force)
fi

if [[ "${dry_run}" == "true" ]]; then
  renderer_args+=(--dry-run)
fi

log "Rendering up to ${daily_limit} missing character reference image(s)."
python3 "${reference_renderer}" "${renderer_args[@]}"

log "Refreshing indexes after character reference rendering."
run_script "${asset_builder}" \
  --series-slug "${series_slug}" \
  --context-root "${context_root}" \
  --public-root "${public_root}"

run_script "${context_indexer}" \
  --series-slug "${series_slug}" \
  --chapter-number "${chapter_number}" \
  --context-root "${context_root}" \
  --package-root "${package_root}"
