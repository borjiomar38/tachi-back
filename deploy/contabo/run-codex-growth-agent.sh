#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${TACHI_APP_DIR:-/opt/tachi-back}"
ENV_FILE="${TACHI_GROWTH_ENV_FILE:-${APP_DIR}/.env.growth-agent}"
LOCK_FILE="${TACHI_GROWTH_LOCK_FILE:-/tmp/tachi-growth-agent.lock}"
STATE_DIR="${TACHI_GROWTH_STATE_DIR:-/var/lib/tachi-growth-agent}"
LOG_DIR="${TACHI_GROWTH_LOG_DIR:-/var/log/tachi-growth-agent}"

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

run_codex_cycle() {
  local cycle_id prompt_file report_file repo_dir codex_bin codex_model codex_effort codex_sandbox branch

  mkdir -p "${STATE_DIR}/prompts" "${STATE_DIR}/reports" "${LOG_DIR}"
  cycle_id="$(date -u +%Y%m%dT%H%M%SZ)"
  prompt_file="${STATE_DIR}/prompts/growth-${cycle_id}.md"
  report_file="${STATE_DIR}/reports/growth-${cycle_id}.md"
  repo_dir="${GROWTH_AGENT_REPO_DIR:-${APP_DIR}}"
  codex_bin="${GROWTH_AGENT_CODEX_CLI_PATH:-codex}"
  codex_model="${GROWTH_AGENT_CODEX_MODEL:-gpt-5.5}"
  codex_effort="${GROWTH_AGENT_CODEX_REASONING_EFFORT:-low}"
  codex_sandbox="${GROWTH_AGENT_CODEX_SANDBOX:-workspace-write}"
  branch="${GROWTH_AGENT_GIT_BRANCH:-growth/autonomous}"

  if [[ ! -d "${repo_dir}" ]]; then
    log "Repo directory does not exist: ${repo_dir}"
    return 1
  fi

  cat >"${prompt_file}" <<PROMPT
You are the Nayovi autonomous growth agent running on the Contabo production VPS.

Current date: $(date -u +%Y-%m-%d)
Primary site: ${GROWTH_AGENT_PRIMARY_SITE:-https://tachiyomiat.com}
Brand domain: ${GROWTH_AGENT_BRAND_SITE:-https://nayovi.com}
SEO domain: ${GROWTH_AGENT_SEO_SITE:-https://translate-manhwa-ai.com}
Repo directory: ${repo_dir}
Working branch: ${branch}

Business goal:
- Increase qualified traffic, backlinks, partnerships, investor interest, and paid subscriptions for Nayovi.
- Prioritize durable revenue signals over vanity traffic.

Allowed work:
- Inspect the repository and public site.
- Improve SEO content, metadata, structured data, sitemap coverage, internal linking, blog topic backlog, and conversion copy.
- Maintain docs/growth/backlink-prospects.csv with relevant, white-hat backlink and partnership opportunities.
- Maintain docs/growth/outreach-drafts.md with concise personalized drafts for agencies, blogs, communities, potential affiliates, and investors.
- Maintain docs/growth/growth-log.md with cycle results, commits, and next actions.
- Create a Git branch named ${branch}, commit focused changes, and push that branch when GROWTH_AGENT_GIT_PUSH_ENABLED=true.

Hard constraints:
- Do not push, merge, rebase, or force-push master.
- Do not run Vercel production deploy commands.
- Do not buy backlinks, use PBNs, scrape private data, evade rate limits, or send spam.
- Do not send outreach email unless a prospect row is explicitly marked approved and GROWTH_AGENT_EMAIL_SEND_MODE=send.
- Prefer public business contact addresses or official forms. Include a clear opt-out line in outreach drafts.
- Do not print secrets. Do not commit env files, passwords, tokens, SSH keys, or generated credential files.
- Keep changes small, testable, and aligned with existing repo conventions.

Operational preferences:
- Model target: ${codex_model}
- Reasoning effort: ${codex_effort}
- Email mode: ${GROWTH_AGENT_EMAIL_SEND_MODE:-draft}
- Daily outreach cap: ${GROWTH_AGENT_MAX_OUTREACH_EMAILS_PER_DAY:-10}
- Git push enabled: ${GROWTH_AGENT_GIT_PUSH_ENABLED:-false}

Cycle checklist:
1. Check git status and current branch.
2. Audit SEO and conversion gaps.
3. Add or refine growth assets/backlink prospects/outreach drafts.
4. Make only safe code/content changes.
5. Run the light validation command if practical: ${GROWTH_AGENT_VALIDATION_COMMAND:-pnpm lint:ts}
6. Commit on ${branch} if files changed.
7. Push ${branch} only if enabled.
8. Write a concise final report with files changed, validation result, risks, and next revenue-focused actions.
PROMPT

  log "Starting Codex growth cycle ${cycle_id} in ${repo_dir}"

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
    "${report_file}"
  )

  cd "${repo_dir}"
  if [[ "${GROWTH_AGENT_CODEX_SEARCH_ENABLED:-true}" == "false" ]]; then
    "${codex_bin}" -a never "${codex_args[@]}" <"${prompt_file}"
  else
    "${codex_bin}" --search -a never "${codex_args[@]}" <"${prompt_file}"
  fi

  log "Completed Codex growth cycle ${cycle_id}; report=${report_file}"
}

run_loop() {
  local interval

  interval="${GROWTH_AGENT_INTERVAL_SECONDS:-21600}"
  while true; do
    if ! run_codex_cycle; then
      log "Growth cycle failed; continuing after backoff."
    fi
    sleep "${interval}"
  done
}

main() {
  load_env_file "${ENV_FILE}"

  if [[ "${GROWTH_AGENT_ENABLED:-false}" != "true" ]]; then
    log "Growth agent disabled. Set GROWTH_AGENT_ENABLED=true in ${ENV_FILE}."
    exit 0
  fi

  exec 9>"${LOCK_FILE}"
  if ! flock -n 9; then
    log "Growth agent is already running; exiting."
    exit 0
  fi

  if [[ "${GROWTH_AGENT_RUN_FOREVER:-true}" == "true" ]]; then
    run_loop
  else
    run_codex_cycle
  fi
}

main "$@"
