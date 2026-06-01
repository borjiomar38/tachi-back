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

codex_bin="${codex_bin:-codex}"
codex_model="${codex_model:-gpt-5.5}"
codex_reasoning_effort="${codex_reasoning_effort:-xhigh}"
codex_search_enabled="${codex_search_enabled:-true}"

if [[ -z "${base_url}" || -z "${cron_secret}" ]]; then
  echo "VITE_BASE_URL and CRON_SECRET must be set in ${ENV_FILE}" >&2
  exit 1
fi

tmp_dir="$(mktemp -d)"
prompt_file="${tmp_dir}/codex-blog-prompt.txt"
draft_file="${tmp_dir}/codex-blog-draft.json"

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

curl -fsS \
  -X POST \
  -H "Authorization: Bearer ${cron_secret}" \
  -H "Content-Type: application/json" \
  -H "X-Codex-Model: ${codex_model}" \
  -H "X-Codex-Reasoning-Effort: ${codex_reasoning_effort}" \
  --data-binary "@${draft_file}" \
  "${base_url%/}/api/cron/publish-codex-blog-article"
