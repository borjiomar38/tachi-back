#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${TACHI_APP_DIR:-/opt/tachi-back}"
ENV_FILE="${TACHI_TRANSLATION_QA_ENV_FILE:-${APP_DIR}/.env.translation-qa-agent}"
APP_ENV_FILE="${TRANSLATION_QA_AGENT_APP_ENV_FILE:-${APP_DIR}/.env.production}"
LOCK_FILE="${TRANSLATION_QA_AGENT_LOCK_FILE:-/tmp/tachi-translation-qa-agent.lock}"
STATE_DIR="${TRANSLATION_QA_AGENT_STATE_DIR:-/var/lib/tachi-translation-qa-agent}"
LOG_DIR="${TRANSLATION_QA_AGENT_LOG_DIR:-/var/log/tachi-translation-qa-agent}"

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
  printf '[%s] %s\n' "$(date -Is)" "$*"
}

run_translation_qa_cycle() {
  local codex_bin codex_effort codex_model codex_report_file codex_sandbox complete_result_file cycle_id prepare_result_file prompt_file work_dir

  mkdir -p "${STATE_DIR}/work" "${STATE_DIR}/reports" "${LOG_DIR}"
  cycle_id="$(date -u +%Y%m%dT%H%M%SZ)"
  work_dir="${STATE_DIR}/work/qa-${cycle_id}"
  prepare_result_file="${STATE_DIR}/reports/qa-${cycle_id}-prepare.json"
  complete_result_file="${STATE_DIR}/reports/qa-${cycle_id}-complete.json"
  codex_report_file="${work_dir}/codex-report.json"
  prompt_file="${work_dir}/prompt.md"
  codex_bin="${TRANSLATION_QA_AGENT_CODEX_CLI_PATH:-codex}"
  codex_model="${TRANSLATION_QA_AGENT_CODEX_MODEL:-gpt-5.5}"
  codex_effort="${TRANSLATION_QA_AGENT_CODEX_REASONING_EFFORT:-low}"
  codex_sandbox="${TRANSLATION_QA_AGENT_CODEX_SANDBOX:-danger-full-access}"

  if [[ ! -d "${APP_DIR}" ]]; then
    log "App directory does not exist: ${APP_DIR}"
    return 1
  fi

  cd "${APP_DIR}"
  log "Preparing translation QA cycle ${cycle_id}"

  if ! pnpm translation-qa:agent -- prepare-next --work-dir "${work_dir}" >"${prepare_result_file}"; then
    log "Prepare step failed for ${cycle_id}"
    return 1
  fi

  local status
  status="$(jq -r '.status // "unknown"' "${prepare_result_file}")"

  if [[ "${status}" == "no_work" ]]; then
    log "No completed translation job needs QA right now."
    return 0
  fi

  if [[ "${status}" != "prepared" ]]; then
    log "Unexpected prepare status: ${status}"
    return 1
  fi

  if [[ ! -s "${prompt_file}" ]]; then
    log "Missing prompt file: ${prompt_file}"
    return 1
  fi

  log "Starting Codex translation QA cycle ${cycle_id}"

  local codex_args=(
    exec
    --skip-git-repo-check
    --model
    "${codex_model}"
    -c
    "model_reasoning_effort=\"${codex_effort}\""
    --sandbox
    "${codex_sandbox}"
    --output-last-message
    "${codex_report_file}"
  )

  "${codex_bin}" -a never "${codex_args[@]}" <"${prompt_file}"

  if ! pnpm translation-qa:agent -- complete --work-dir "${work_dir}" >"${complete_result_file}"; then
    log "Complete step failed for ${cycle_id}; original uploads were not cleaned."
    return 1
  fi

  cp "${codex_report_file}" "${STATE_DIR}/reports/qa-${cycle_id}-codex.json"
  log "Completed translation QA cycle ${cycle_id}; result=${complete_result_file}"
}

sleep_until_next_cycle() {
  local interval_seconds trigger_file

  interval_seconds="${TRANSLATION_QA_AGENT_INTERVAL_SECONDS:-300}"
  trigger_file="${TRANSLATION_QA_AGENT_TRIGGER_FILE:-${STATE_DIR}/run-now}"

  if [[ -f "${trigger_file}" ]]; then
    rm -f "${trigger_file}"
    return 0
  fi

  sleep "${interval_seconds}"
}

main() {
  load_env_file "${APP_ENV_FILE}"
  load_env_file "${ENV_FILE}"

  if [[ "${TRANSLATION_QA_AGENT_ENABLED:-true}" != "true" ]]; then
    log "Translation QA agent disabled."
    return 0
  fi

  if [[ "${TRANSLATION_QA_AGENT_RUN_FOREVER:-true}" != "true" ]]; then
    run_translation_qa_cycle
    return $?
  fi

  while true; do
    if ! run_translation_qa_cycle; then
      log "Translation QA cycle failed; retrying after delay."
    fi

    sleep_until_next_cycle
  done
}

(
  flock -n 9 || {
    log "Translation QA agent is already running."
    exit 0
  }
  main
) 9>"${LOCK_FILE}"
