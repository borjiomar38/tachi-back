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
daily_limit="${MANHWA_IMAGE_DAILY_LIMIT:-12}"
run_limit="${MANHWA_IMAGE_RUN_LIMIT:-1}"
allow_unapproved="${MANHWA_IMAGE_ALLOW_UNAPPROVED:-false}"
force="${MANHWA_IMAGE_FORCE:-false}"
require_character_references="${MANHWA_IMAGE_REQUIRE_CHARACTER_REFERENCES:-true}"
require_preproduction="${MANHWA_IMAGE_REQUIRE_PREPRODUCTION:-true}"

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

limit_plan="$(
  python3 - "${package_file}" "${output_root}" "${daily_limit}" "${run_limit}" <<'PY'
import datetime as dt
import json
import pathlib
import re
import sys

package_path = pathlib.Path(sys.argv[1])
output_root = pathlib.Path(sys.argv[2])

try:
    daily_limit = int(sys.argv[3])
except ValueError:
    print(f"Invalid MANHWA_IMAGE_DAILY_LIMIT: {sys.argv[3]}", file=sys.stderr)
    raise SystemExit(2)

try:
    run_limit = int(sys.argv[4])
except ValueError:
    print(f"Invalid MANHWA_IMAGE_RUN_LIMIT: {sys.argv[4]}", file=sys.stderr)
    raise SystemExit(2)

if daily_limit < 1:
    print("MANHWA_IMAGE_DAILY_LIMIT must be at least 1.", file=sys.stderr)
    raise SystemExit(2)

if run_limit < 1:
    print("MANHWA_IMAGE_RUN_LIMIT must be at least 1.", file=sys.stderr)
    raise SystemExit(2)

package = json.loads(package_path.read_text(encoding="utf-8"))
series_slug = package.get("series_slug") or (package.get("series") or {}).get("slug")
chapter = package.get("chapter") or {}
chapter_number = int(
    package.get("chapter_number") or chapter.get("chapter_number") or 1
)

if not series_slug:
    print("Package is missing series_slug.", file=sys.stderr)
    raise SystemExit(2)

chapter_dir = output_root / series_slug / f"chapter-{chapter_number:03d}"
today_start = dt.datetime.combine(dt.date.today(), dt.time.min).timestamp()
rendered_today = 0

if chapter_dir.exists():
    for image_path in chapter_dir.iterdir():
        if (
            image_path.is_file()
            and re.fullmatch(r"panel-\d+\.(?:png|jpe?g|webp)", image_path.name, re.I)
            and image_path.stat().st_mtime >= today_start
        ):
            rendered_today += 1

remaining_today = max(daily_limit - rendered_today, 0)
effective_limit = min(run_limit, remaining_today)
print(f"{effective_limit}|{rendered_today}|{remaining_today}|{chapter_dir}")
PY
)"

IFS='|' read -r effective_limit rendered_today remaining_today chapter_output_dir <<<"${limit_plan}"

if [[ "${effective_limit}" -lt 1 ]]; then
  log "Daily manhwa image limit reached (${rendered_today}/${daily_limit}) for ${chapter_output_dir}; skipping."
  exit 0
fi

if [[ "${require_character_references}" == "true" ]]; then
  if [[ "${require_preproduction}" == "true" ]]; then
    preproduction_status="${context_dir%/}/preproduction/status.json"
    if [[ ! -f "${preproduction_status}" ]]; then
      echo "Preproduction status is missing: ${preproduction_status}" >&2
      echo "Run the preproduction cron before chapter panel rendering." >&2
      exit 45
    fi

    python3 - "${preproduction_status}" <<'PY'
import json
import pathlib
import sys

status_path = pathlib.Path(sys.argv[1])
status = json.loads(status_path.read_text(encoding="utf-8"))
if not status.get("ready_for_chapter_generation"):
    print(
        "Manhwa preproduction is not ready for chapter rendering. "
        f"Next task: {status.get('next_task')}",
        file=sys.stderr,
    )
    raise SystemExit(45)
PY
  fi

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
  "${effective_limit}"
)

if [[ "${allow_unapproved}" == "true" ]]; then
  args+=(--allow-unapproved)
fi

if [[ "${force}" == "true" ]]; then
  args+=(--force)
fi

log "Rendering up to ${effective_limit} missing manhwa panel image(s) from ${package_file}; daily ${rendered_today}/${daily_limit}, run limit ${run_limit}."
python3 "${renderer}" "${args[@]}"
