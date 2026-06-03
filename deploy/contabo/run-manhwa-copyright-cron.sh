#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${TACHI_APP_DIR:-/opt/tachi-back}"
ENV_FILE="${MANHWA_AGENT_ENV_FILE:-${APP_DIR}/.env.manhwa-production}"
LOCK_FILE="${MANHWA_COPYRIGHT_LOCK_FILE:-/var/lock/tachi-manhwa-copyright-cron.lock}"

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

load_env_file "${ENV_FILE}"

builder="${MANHWA_COPYRIGHT_BUILDER_PATH:-${APP_DIR}/deploy/contabo/build-manhwa-copyright-package.py}"
series_slug="${MANHWA_COPYRIGHT_SERIES_SLUG:-${MANHWA_SERIES_SLUG:-the-eclipse-crown}}"
chapter_number="${MANHWA_COPYRIGHT_CHAPTER_NUMBER:-${MANHWA_CHAPTER_NUMBER:-}}"
scope="${MANHWA_COPYRIGHT_SCOPE:-auto}"
package_file="${MANHWA_COPYRIGHT_PACKAGE_FILE:-${MANHWA_IMAGE_PACKAGE_FILE:-}}"
context_root="${MANHWA_COPYRIGHT_CONTEXT_ROOT:-${MANHWA_CONTEXT_ROOT:-docs/manhwa/context}}"
generated_root="${MANHWA_COPYRIGHT_GENERATED_ROOT:-${MANHWA_PACKAGE_ROOT:-docs/manhwa/generated}}"
private_root="${MANHWA_COPYRIGHT_PRIVATE_ROOT:-${MANHWA_PUBLIC_ROOT:-docs/manhwa/private}}"
output_root="${MANHWA_COPYRIGHT_OUTPUT_ROOT:-docs/manhwa/copyright}"
allow_incomplete="${MANHWA_COPYRIGHT_ALLOW_INCOMPLETE:-true}"
append_queue="${MANHWA_COPYRIGHT_APPEND_QUEUE:-true}"
paid_filing_intent="${MANHWA_COPYRIGHT_PAID_FILING_INTENT:-false}"

if ! acquire_lock; then
  log "Nayovi manhwa copyright cron is already running; skipping."
  exit 0
fi

if [[ ! -d "${APP_DIR}" ]]; then
  echo "App directory is missing: ${APP_DIR}" >&2
  exit 1
fi

cd "${APP_DIR}"

if [[ ! -f "${builder}" ]]; then
  echo "Copyright package builder is missing: ${builder}" >&2
  exit 1
fi

args=(
  --series-slug
  "${series_slug}"
  --scope
  "${scope}"
  --context-root
  "${context_root}"
  --generated-root
  "${generated_root}"
  --private-root
  "${private_root}"
  --output-root
  "${output_root}"
)

if [[ -n "${chapter_number}" ]]; then
  args+=(--chapter-number "${chapter_number}")
fi

if [[ -n "${package_file}" ]]; then
  args+=(--package-file "${package_file}")
fi

if [[ "${allow_incomplete}" == "true" ]]; then
  args+=(--allow-incomplete)
fi

if [[ "${append_queue}" != "true" ]]; then
  args+=(--no-queue)
fi

if [[ "${paid_filing_intent}" == "true" ]]; then
  args+=(--paid-filing-intent)
fi

log "Building private manhwa copyright package for ${series_slug}."
python3 "${builder}" "${args[@]}"
