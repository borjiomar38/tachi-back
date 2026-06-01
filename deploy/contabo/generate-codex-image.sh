#!/usr/bin/env bash
set -euo pipefail

codex_bin="${CODEX_IMAGE_CODEX_CLI_PATH:-codex}"
codex_model="${CODEX_IMAGE_CODEX_MODEL:-gpt-5.3-codex-spark}"
codex_reasoning_effort="${CODEX_IMAGE_CODEX_REASONING_EFFORT:-low}"
min_bytes="${CODEX_IMAGE_MIN_BYTES:-500000}"
output_file=""
prompt_file=""
work_dir=""

usage() {
  cat >&2 <<'EOF'
Usage: generate-codex-image.sh --prompt-file PROMPT.md --output-file OUT.png

Environment:
  CODEX_IMAGE_CODEX_CLI_PATH        Codex CLI path, default codex
  CODEX_IMAGE_CODEX_MODEL           Codex model, default gpt-5.3-codex-spark
  CODEX_IMAGE_CODEX_REASONING_EFFORT Reasoning effort, default low
  CODEX_IMAGE_MIN_BYTES             Minimum accepted PNG size, default 500000
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --prompt-file)
      prompt_file="${2:-}"
      shift 2
      ;;
    --output-file)
      output_file="${2:-}"
      shift 2
      ;;
    --work-dir)
      work_dir="${2:-}"
      shift 2
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if [[ -z "${prompt_file}" || -z "${output_file}" ]]; then
  usage
  exit 2
fi

if [[ ! -s "${prompt_file}" ]]; then
  echo "Prompt file is missing or empty: ${prompt_file}" >&2
  exit 2
fi

output_dir="$(dirname "${output_file}")"
mkdir -p "${output_dir}"
work_dir="${work_dir:-${output_dir}}"
mkdir -p "${work_dir}"

marker="$(mktemp)"
report_file="$(mktemp)"
wrapped_prompt="$(mktemp)"
cleanup() {
  rm -f "${marker}" "${report_file}" "${wrapped_prompt}"
}
trap cleanup EXIT
touch "${marker}"

cat >"${wrapped_prompt}" <<EOF
Use the imagegen skill.

Generate a real AI-created raster image with the built-in image_gen tool. Do not use Python, JavaScript, ffmpeg, ImageMagick, SVG, canvas, screenshots, procedural drawing, or placeholder generation.

After generation, the image may stay in \$CODEX_HOME/generated_images or ~/.codex/generated_images. If you can copy the generated PNG to this path, do it:
${output_file}

If the built-in image_gen tool is unavailable, do not create any fallback image. Return exactly IMAGEGEN_TOOL_UNAVAILABLE.

Image prompt:
$(cat "${prompt_file}")
EOF

"${codex_bin}" --search -a never exec \
  --skip-git-repo-check \
  --ephemeral \
  --sandbox workspace-write \
  -C "${work_dir}" \
  --model "${codex_model}" \
  -c "model_reasoning_effort=\"${codex_reasoning_effort}\"" \
  --output-last-message "${report_file}" \
  <"${wrapped_prompt}"

if [[ ! -s "${output_file}" ]]; then
  candidate="$(
    GENERATED_DIR="${CODEX_HOME:-${HOME}/.codex}/generated_images" \
    MARKER="${marker}" \
    python3 - <<'PY' || true
import os
import pathlib

generated_dir = pathlib.Path(os.environ["GENERATED_DIR"])
marker = pathlib.Path(os.environ["MARKER"])

if not generated_dir.exists() or not marker.exists():
    raise SystemExit

marker_time = marker.stat().st_mtime
candidates = [
    path
    for path in generated_dir.rglob("*.png")
    if path.is_file() and path.stat().st_mtime >= marker_time
]

if not candidates:
    raise SystemExit

print(max(candidates, key=lambda path: path.stat().st_mtime))
PY
  )"

  if [[ -n "${candidate}" ]]; then
    cp "${candidate}" "${output_file}"
  fi
fi

if [[ ! -s "${output_file}" ]]; then
  echo "IMAGEGEN_TOOL_UNAVAILABLE: Codex CLI did not produce a built-in image_gen PNG." >&2
  cat "${report_file}" >&2 || true
  exit 17
fi

OUTPUT_FILE="${output_file}" MIN_BYTES="${min_bytes}" python3 - <<'PY'
import os
import pathlib
import struct
import sys

path = pathlib.Path(os.environ["OUTPUT_FILE"])
min_bytes = int(os.environ["MIN_BYTES"])
data = path.read_bytes()

if len(data) < min_bytes:
    print(
        f"Codex image rejected: {path} is only {len(data)} bytes; minimum is {min_bytes}.",
        file=sys.stderr,
    )
    raise SystemExit(18)

if not data.startswith(b"\x89PNG\r\n\x1a\n"):
    print(f"Codex image rejected: {path} is not a PNG.", file=sys.stderr)
    raise SystemExit(18)

if len(data) < 33 or data[12:16] != b"IHDR":
    print(f"Codex image rejected: {path} has no PNG IHDR.", file=sys.stderr)
    raise SystemExit(18)

width, height = struct.unpack(">II", data[16:24])
if width < 1000 or height < 700:
    print(
        f"Codex image rejected: {path} is {width}x{height}; expected at least 1000x700.",
        file=sys.stderr,
    )
    raise SystemExit(18)

print(f"codex_image_ready {path} {len(data)} bytes {width}x{height}")
PY
