#!/usr/bin/env bash
set -euo pipefail

ENV_FILE="${TACHI_ENV_FILE:-/opt/tachi-back/.env.production}"
LOCK_FILE="${TACHI_CODEX_BLOG_LOCK_FILE:-/var/lock/tachi-back-codex-blog-cron.lock}"

read_env_value() {
  local key="$1"

  sed -n "s/^${key}=//p" "${ENV_FILE}" \
    | tail -n 1 \
    | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  echo "Codex blog cron is already running; skipping."
  exit 0
fi

base_url="$(read_env_value VITE_BASE_URL)"
cron_secret="$(read_env_value CRON_SECRET)"
codex_bin="$(read_env_value BLOG_CODEX_CLI_PATH)"
codex_model="$(read_env_value BLOG_CODEX_MODEL)"
codex_reasoning_effort="$(read_env_value BLOG_CODEX_REASONING_EFFORT)"
codex_search_enabled="$(read_env_value BLOG_CODEX_SEARCH_ENABLED)"
codex_image_enabled="$(read_env_value BLOG_CODEX_IMAGE_GENERATION_ENABLED)"
codex_image_required="$(read_env_value BLOG_CODEX_IMAGE_REQUIRED)"
codex_image_script="$(read_env_value BLOG_CODEX_IMAGE_SCRIPT_PATH)"

codex_bin="${codex_bin:-codex}"
codex_model="${codex_model:-gpt-5.5}"
codex_reasoning_effort="${codex_reasoning_effort:-xhigh}"
codex_search_enabled="${codex_search_enabled:-true}"
codex_image_enabled="${codex_image_enabled:-true}"
codex_image_required="${codex_image_required:-true}"
codex_image_script="${codex_image_script:-/usr/local/bin/tachi-codex-image-generator}"

if [[ -z "${base_url}" || -z "${cron_secret}" ]]; then
  echo "VITE_BASE_URL and CRON_SECRET must be set in ${ENV_FILE}" >&2
  exit 1
fi

tmp_dir="$(mktemp -d)"
prompt_file="${tmp_dir}/codex-blog-prompt.txt"
draft_file="${tmp_dir}/codex-blog-draft.json"
image_prompt_file="${tmp_dir}/codex-blog-image-prompt.md"
image_file="${tmp_dir}/codex-blog-hero.png"
payload_file="${tmp_dir}/codex-blog-payload.json"
publish_response_file="${tmp_dir}/codex-blog-publish-response.json"

cleanup() {
  rm -rf "${tmp_dir}"
}
trap cleanup EXIT

curl -fsS \
  -H "Authorization: Bearer ${cron_secret}" \
  "${base_url%/}/api/cron/generate-codex-blog-prompt" \
  >"${prompt_file}"

codex_args=(
  exec
  --skip-git-repo-check
  --ephemeral
  --sandbox
  read-only
  --model
  "${codex_model}"
  -c
  "model_reasoning_effort=\"${codex_reasoning_effort}\""
  --output-last-message
  "${draft_file}"
)

if [[ "${codex_search_enabled}" == "false" ]]; then
  "${codex_bin}" -a never "${codex_args[@]}" <"${prompt_file}"
else
  "${codex_bin}" --search -a never "${codex_args[@]}" <"${prompt_file}"
fi

if [[ ! -s "${draft_file}" ]]; then
  echo "Codex did not produce a blog draft JSON file." >&2
  exit 1
fi

cp "${draft_file}" "${payload_file}"

if [[ "${codex_image_enabled}" != "false" ]]; then
  python3 - "${draft_file}" "${image_prompt_file}" <<'PY'
import json
import pathlib
import sys

draft = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
target = pathlib.Path(sys.argv[2])

title = str(draft.get("title") or "").strip()
manhwa_title = str(draft.get("manhwaTitle") or "").strip()
manhwa_type = str(draft.get("manhwaType") or "manhwa").strip()
search_intent = str(draft.get("searchIntent") or "").strip()
trend = str(draft.get("trendRationale") or "").strip()

prompt = "\n".join([
    "Use case: illustration-story",
    "Asset type: Nayovi blog hero image",
    f"Primary request: original cinematic {manhwa_type}-style blog hero illustration for an article titled {title}.",
    f"Topic: {manhwa_title}",
    f"Search intent: {search_intent}",
    f"Trend context: {trend}",
    "Scene/backdrop: genre-specific manga/manhwa/manhua atmosphere inspired by the topic without copying any official character, logo, costume, panel, symbol, or artwork.",
    "Subject: one original reader-facing hero or heroine, dramatic manga/manhwa energy, strong silhouette, expressive powers or setting cues connected to the article topic.",
    "Composition/framing: 16:9 landscape hero crop, strong focal area on the right, dark readable negative space on the left for article headline overlay, polished social/blog key art.",
    "Lighting/mood: dark cinematic, vivid, premium, sharp, energetic, not cluttered.",
    "Constraints: no readable text, no watermark, no fake UI, no app screenshot, no phone, no Nayovi logo, no copyrighted character likeness, no official artwork, no piracy/source site imagery.",
    "Avoid: generic OCR diagrams, developer imagery, low-detail placeholder graphics, procedural art, stock-photo style.",
  ])

target.write_text(prompt, encoding="utf-8")
PY

  if [[ ! -x "${codex_image_script}" ]]; then
    echo "Codex image script is not installed: ${codex_image_script}" >&2
    if [[ "${codex_image_required}" == "true" ]]; then
      exit 1
    fi
  elif "${codex_image_script}" \
    --prompt-file "${image_prompt_file}" \
    --output-file "${image_file}"; then
    python3 - "${draft_file}" "${payload_file}" "${image_file}" "${image_prompt_file}" <<'PY'
import base64
import json
import pathlib
import sys

draft_path = pathlib.Path(sys.argv[1])
payload_path = pathlib.Path(sys.argv[2])
image_path = pathlib.Path(sys.argv[3])
prompt_path = pathlib.Path(sys.argv[4])

payload = json.loads(draft_path.read_text(encoding="utf-8"))
payload["heroImage"] = {
    "contentType": "image/png",
    "dataBase64": base64.b64encode(image_path.read_bytes()).decode("ascii"),
    "generatedBy": "codex-cli",
    "prompt": prompt_path.read_text(encoding="utf-8"),
}
payload_path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
PY
  elif [[ "${codex_image_required}" == "true" ]]; then
    echo "Codex blog image generation failed and BLOG_CODEX_IMAGE_REQUIRED=true." >&2
    exit 1
  fi
fi

publish_status="$(curl -sS \
  -X POST \
  -H "Authorization: Bearer ${cron_secret}" \
  -H "Content-Type: application/json" \
  -H "X-Codex-Model: ${codex_model}" \
  -H "X-Codex-Reasoning-Effort: ${codex_reasoning_effort}" \
  --data-binary "@${payload_file}" \
  -o "${publish_response_file}" \
  -w "%{http_code}" \
  "${base_url%/}/api/cron/publish-codex-blog-article")"

if [[ ! "${publish_status}" =~ ^2 ]]; then
  echo "Codex blog publish request failed with HTTP ${publish_status}." >&2

  if [[ -s "${publish_response_file}" ]]; then
    echo "Publish response body:" >&2
    cat "${publish_response_file}" >&2
    echo >&2
  fi

  exit 1
fi

cat "${publish_response_file}"
