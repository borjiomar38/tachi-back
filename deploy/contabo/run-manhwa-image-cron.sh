#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${TACHI_APP_DIR:-/opt/tachi-back}"
ENV_FILE="${MANHWA_AGENT_ENV_FILE:-${APP_DIR}/.env.manhwa-production}"
LOCK_FILE="${MANHWA_IMAGE_LOCK_FILE:-/var/lock/tachi-manhwa-image-cron.lock}"

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

renderer="${MANHWA_IMAGE_RENDERER_PATH:-${APP_DIR}/deploy/contabo/render-manhwa-chapter-images.py}"
package_file="${MANHWA_IMAGE_PACKAGE_FILE:-docs/manhwa/generated/the-eclipse-crown-chapter-001.json}"
output_root="${MANHWA_IMAGE_OUTPUT_ROOT:-docs/manhwa/private}"
codex_image_script="${MANHWA_IMAGE_SCRIPT_PATH:-/usr/local/bin/tachi-codex-image-generator}"
context_dir="${MANHWA_CONTEXT_DIR:-docs/manhwa/context/the-eclipse-crown}"
daily_limit="${MANHWA_IMAGE_DAILY_LIMIT:-1}"
allow_unapproved="${MANHWA_IMAGE_ALLOW_UNAPPROVED:-false}"
force="${MANHWA_IMAGE_FORCE:-false}"
require_character_references="${MANHWA_IMAGE_REQUIRE_CHARACTER_REFERENCES:-true}"

if ! acquire_lock; then
  log "Nayovi manhwa image cron is already running; skipping."
  exit 0
fi

if [[ ! -d "${APP_DIR}" ]]; then
  echo "App directory is missing: ${APP_DIR}" >&2
  exit 1
fi

cd "${APP_DIR}"

if [[ ! -f "${package_file}" ]]; then
  echo "Manhwa package file is missing: ${package_file}" >&2
  exit 1
fi

if [[ ! -f "${renderer}" ]]; then
  echo "Manhwa image renderer is missing: ${renderer}" >&2
  exit 1
fi

if [[ "${require_character_references}" == "true" ]]; then
  character_index="${context_dir%/}/characters/index.json"
  if [[ ! -f "${character_index}" ]]; then
    echo "Character asset index is missing: ${character_index}" >&2
    echo "Run the character reference cron before rendering chapter panels." >&2
    exit 44
  fi

  python3 - "${character_index}" <<'PY'
import json
import pathlib
import sys

index_path = pathlib.Path(sys.argv[1])
index = json.loads(index_path.read_text(encoding="utf-8"))
status = index.get("reference_status") or {}
missing_count = int(status.get("missing_count") or 0)
next_missing = status.get("next_missing_reference")

if missing_count > 0:
    print(
        f"Character references are incomplete: {missing_count} missing. "
        f"Next missing: {next_missing}",
        file=sys.stderr,
    )
    raise SystemExit(44)
PY
fi

args=(
  --package-file
  "${package_file}"
  --output-root
  "${output_root}"
  --codex-image-script
  "${codex_image_script}"
  --context-dir
  "${context_dir}"
  --next-missing
  --limit
  "${daily_limit}"
)

if [[ "${allow_unapproved}" == "true" ]]; then
  args+=(--allow-unapproved)
fi

if [[ "${force}" == "true" ]]; then
  args+=(--force)
fi

log "Rendering up to ${daily_limit} missing manhwa panel image(s) from ${package_file}."
python3 "${renderer}" "${args[@]}"
