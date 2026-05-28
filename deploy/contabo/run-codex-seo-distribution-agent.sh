#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${TACHI_APP_DIR:-/opt/tachi-back}"
ENV_FILE="${TACHI_SEO_AGENT_ENV_FILE:-${APP_DIR}/.env.seo-distribution-agent}"
LOCK_FILE="${TACHI_SEO_AGENT_LOCK_FILE:-/tmp/tachi-seo-distribution-agent.lock}"
STATE_DIR="${TACHI_SEO_AGENT_STATE_DIR:-/var/lib/tachi-seo-distribution-agent}"
LOG_DIR="${TACHI_SEO_AGENT_LOG_DIR:-/var/log/tachi-seo-distribution-agent}"

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

write_account_registry() {
  local accounts_file="${STATE_DIR}/accounts.json"

  mkdir -p "${STATE_DIR}"
  LINKEDIN_ACCESS_TOKEN_PRESENT="${SEO_AGENT_LINKEDIN_ACCESS_TOKEN:+true}" \
    LINKEDIN_ORGANIZATION_ID_PRESENT="${SEO_AGENT_LINKEDIN_ORGANIZATION_ID:+true}" \
    REDDIT_CLIENT_ID_PRESENT="${SEO_AGENT_REDDIT_CLIENT_ID:+true}" \
    REDDIT_CLIENT_SECRET_PRESENT="${SEO_AGENT_REDDIT_CLIENT_SECRET:+true}" \
    REDDIT_REFRESH_TOKEN_PRESENT="${SEO_AGENT_REDDIT_REFRESH_TOKEN:+true}" \
    GITHUB_TOKEN_PRESENT="${SEO_AGENT_GITHUB_TOKEN:+true}" \
    X_ACCESS_TOKEN_PRESENT="${SEO_AGENT_X_ACCESS_TOKEN:+true}" \
    PRODUCTHUNT_TOKEN_PRESENT="${SEO_AGENT_PRODUCTHUNT_TOKEN:+true}" \
    DEVTO_API_KEY_PRESENT="${SEO_AGENT_DEVTO_API_KEY:+true}" \
    MEDIUM_TOKEN_PRESENT="${SEO_AGENT_MEDIUM_INTEGRATION_TOKEN:+true}" \
    YOUTUBE_REFRESH_TOKEN_PRESENT="${SEO_AGENT_YOUTUBE_REFRESH_TOKEN:+true}" \
    GITHUB_REPO_URL="${SEO_AGENT_REPO_URL:-}" \
    EXTERNAL_POSTING_MODE="${SEO_AGENT_EXTERNAL_POSTING_MODE:-draft}" \
    ACCOUNT_CREATION_ENABLED="${SEO_AGENT_EXTERNAL_ACCOUNT_CREATION_ENABLED:-false}" \
    python3 - "${accounts_file}" <<'PY'
import json
import os
import pathlib
import sys
from datetime import datetime, timezone

target = pathlib.Path(sys.argv[1])

def present(name):
    return os.environ.get(name) == "true"

def account(platform, display_name, configured, required, action_mode, notes):
    return {
        "platform": platform,
        "displayName": display_name,
        "configured": configured,
        "actionMode": action_mode,
        "requiredSecretNames": required,
        "notes": notes,
    }

posting_mode = os.environ["EXTERNAL_POSTING_MODE"]
accounts = [
    account(
        "linkedin",
        "LinkedIn company/founder account",
        present("LINKEDIN_ACCESS_TOKEN_PRESENT") and present("LINKEDIN_ORGANIZATION_ID_PRESENT"),
        ["SEO_AGENT_LINKEDIN_ACCESS_TOKEN", "SEO_AGENT_LINKEDIN_ORGANIZATION_ID"],
        posting_mode,
        "Use official LinkedIn API/OAuth only. No password, cookie, captcha, or fake-account automation.",
    ),
    account(
        "reddit",
        "Reddit official/community account",
        present("REDDIT_CLIENT_ID_PRESENT") and present("REDDIT_CLIENT_SECRET_PRESENT") and present("REDDIT_REFRESH_TOKEN_PRESENT"),
        ["SEO_AGENT_REDDIT_CLIENT_ID", "SEO_AGENT_REDDIT_CLIENT_SECRET", "SEO_AGENT_REDDIT_REFRESH_TOKEN"],
        posting_mode,
        "Use Reddit API only where subreddit rules allow the exact post/comment.",
    ),
    account(
        "github",
        "GitHub owned repo and docs",
        present("GITHUB_TOKEN_PRESENT") or bool(os.environ.get("GITHUB_REPO_URL")),
        ["SEO_AGENT_GITHUB_TOKEN optional; SSH remote is enough for owned repo branches"],
        "owned-repo" if not present("GITHUB_TOKEN_PRESENT") else posting_mode,
        "Use owned repos/docs by default. External PRs/issues only when genuinely useful and allowed.",
    ),
    account(
        "directories",
        "App directories and listing portals",
        False,
        ["Per-platform account/API token when available"],
        "draft",
        "Use official submit paths only after reputation and listing rules are checked.",
    ),
    account(
        "press-newsletters-podcasts",
        "Press, newsletters, podcasts, and resource pages",
        False,
        ["Public editorial contact or official submission form"],
        "draft",
        "Discover high-authority editorial surfaces continuously; use individualized pitches, not bulk outreach.",
    ),
    account(
        "creator-platforms",
        "Manga, webtoon, and localization partners",
        False,
        ["Public business contact or official partner form"],
        "draft",
        "Use permission-safe partnership angles for approved samples, pilots, accessibility, or reader research.",
    ),
    account(
        "x-twitter",
        "X/Twitter official account",
        present("X_ACCESS_TOKEN_PRESENT"),
        ["SEO_AGENT_X_ACCESS_TOKEN"],
        posting_mode,
        "Use official API/OAuth only and avoid repetitive promotional posting.",
    ),
    account(
        "producthunt",
        "Product Hunt and launch communities",
        present("PRODUCTHUNT_TOKEN_PRESENT"),
        ["SEO_AGENT_PRODUCTHUNT_TOKEN"],
        posting_mode,
        "Prepare launch assets and comments; post only through official account/API workflow when allowed.",
    ),
    account(
        "devto-medium",
        "Dev.to, Medium, and technical blogs",
        present("DEVTO_API_KEY_PRESENT") or present("MEDIUM_TOKEN_PRESENT"),
        ["SEO_AGENT_DEVTO_API_KEY", "SEO_AGENT_MEDIUM_INTEGRATION_TOKEN"],
        posting_mode,
        "Publish technical trust assets only where canonical links and duplicate-content handling are clear.",
    ),
    account(
        "youtube",
        "YouTube demo and video surfaces",
        present("YOUTUBE_REFRESH_TOKEN_PRESENT"),
        ["SEO_AGENT_YOUTUBE_REFRESH_TOKEN"],
        posting_mode,
        "Use official API/OAuth only for owned video uploads, descriptions, and channel updates.",
    ),
    account(
        "forums-qa-communities",
        "Forums, Q&A, and niche communities",
        False,
        ["Per-community authorized account when available"],
        "draft",
        "Research rules first; contribute useful answers without links unless links are clearly welcome.",
    ),
]

payload = {
    "version": "seo-distribution-agent-accounts.v1",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "accountCreationEnabled": os.environ["ACCOUNT_CREATION_ENABLED"] == "true",
    "externalPostingMode": posting_mode,
    "accounts": accounts,
}

tmp = target.with_suffix(".tmp")
tmp.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
tmp.replace(target)
PY
}

json_status() {
  local stage="$1"
  local cycle_id="${2:-}"
  local branch="${3:-}"
  local report_file="${4:-}"
  local repo_dir="${5:-${SEO_AGENT_REPO_DIR:-${APP_DIR}}}"
  local status_file="${STATE_DIR}/status.json"

  mkdir -p "${STATE_DIR}"
  write_account_registry
  STAGE="${stage}" \
    CYCLE_ID="${cycle_id}" \
    BRANCH="${branch}" \
    REPORT_FILE="${report_file}" \
    REPO_DIR="${repo_dir}" \
    STATE_DIR="${STATE_DIR}" \
    INTERVAL_SECONDS="${SEO_AGENT_INTERVAL_SECONDS:-60}" \
    EXTERNAL_POSTING_MODE="${SEO_AGENT_EXTERNAL_POSTING_MODE:-draft}" \
    ACCOUNT_CREATION_ENABLED="${SEO_AGENT_EXTERNAL_ACCOUNT_CREATION_ENABLED:-false}" \
    GIT_PUSH_ENABLED="${SEO_AGENT_GIT_PUSH_ENABLED:-true}" \
    AUTO_MERGE_TO_MASTER="${SEO_AGENT_AUTO_MERGE_TO_MASTER:-false}" \
    python3 - "${status_file}" <<'PY'
import json
import os
import pathlib
import subprocess
import sys
from datetime import datetime, timezone

status_path = pathlib.Path(sys.argv[1])
repo_dir = pathlib.Path(os.environ["REPO_DIR"])
report_file = pathlib.Path(os.environ["REPORT_FILE"]) if os.environ["REPORT_FILE"] else None

def git_output(*args):
    try:
        return subprocess.check_output(
            ["git", *args],
            cwd=repo_dir,
            stderr=subprocess.DEVNULL,
            text=True,
        ).strip()
    except Exception:
        return None

def report_excerpt(path):
    if not path or not path.exists():
        return ""
    text = path.read_text(encoding="utf-8", errors="replace").strip()
    return text[:5000]

payload = {
    "version": "seo-distribution-agent-status.v1",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "stage": os.environ["STAGE"],
    "cycleId": os.environ["CYCLE_ID"] or None,
    "branch": os.environ["BRANCH"] or git_output("branch", "--show-current"),
    "commit": git_output("rev-parse", "--short", "HEAD"),
    "repoDir": str(repo_dir),
    "stateDir": os.environ["STATE_DIR"],
    "intervalSeconds": int(os.environ["INTERVAL_SECONDS"] or "60"),
    "externalPostingMode": os.environ["EXTERNAL_POSTING_MODE"],
    "accountCreationEnabled": os.environ["ACCOUNT_CREATION_ENABLED"] == "true",
    "gitPushEnabled": os.environ["GIT_PUSH_ENABLED"] == "true",
    "autoMergeToMaster": os.environ["AUTO_MERGE_TO_MASTER"] == "true",
    "reportFile": str(report_file) if report_file else None,
    "reportExcerpt": report_excerpt(report_file),
    "accountsFile": str(pathlib.Path(os.environ["STATE_DIR"]) / "accounts.json"),
}

tmp = status_path.with_suffix(".tmp")
tmp.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
tmp.replace(status_path)
PY
}

write_docs_snapshot() {
  local repo_dir="$1"
  local snapshot_file="${STATE_DIR}/docs-snapshot.json"

  mkdir -p "${STATE_DIR}"
  REPO_DIR="${repo_dir}" python3 - "${snapshot_file}" <<'PY'
import json
import os
import pathlib
from datetime import datetime, timezone

repo = pathlib.Path(os.environ["REPO_DIR"])
snapshot = pathlib.Path(__import__("sys").argv[1])
files = {}
for rel in [
    "docs/seo-distribution/content-calendar.md",
    "docs/seo-distribution/platform-drafts.md",
    "docs/seo-distribution/authority-opportunities.md",
    "docs/seo-distribution/link-assets.md",
    "docs/seo-distribution/distribution-log.md",
    "docs/growth/backlink-prospects.csv",
    "docs/growth/outreach-drafts.md",
]:
    path = repo / rel
    if path.exists():
        files[rel] = path.read_text(encoding="utf-8", errors="replace")

payload = {
    "version": "seo-distribution-agent-docs.v1",
    "generatedAt": datetime.now(timezone.utc).isoformat(),
    "repoDir": str(repo),
    "files": files,
}
tmp = snapshot.with_suffix(".tmp")
tmp.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
tmp.replace(snapshot)
PY
}

run_codex_cycle() {
  local base_branch branch branch_prefix codex_bin codex_effort codex_model codex_sandbox cycle_id prompt_file report_file repo_dir

  mkdir -p "${STATE_DIR}/prompts" "${STATE_DIR}/reports" "${LOG_DIR}"
  cycle_id="$(date -u +%Y%m%dT%H%M%SZ)"
  prompt_file="${STATE_DIR}/prompts/seo-distribution-${cycle_id}.md"
  report_file="${STATE_DIR}/reports/seo-distribution-${cycle_id}.md"
  repo_dir="${SEO_AGENT_REPO_DIR:-${APP_DIR}}"
  codex_bin="${SEO_AGENT_CODEX_CLI_PATH:-codex}"
  codex_model="${SEO_AGENT_CODEX_MODEL:-gpt-5.5}"
  codex_effort="${SEO_AGENT_CODEX_REASONING_EFFORT:-low}"
  codex_sandbox="${SEO_AGENT_CODEX_SANDBOX:-danger-full-access}"
  base_branch="${SEO_AGENT_BASE_BRANCH:-master}"
  branch_prefix="${SEO_AGENT_GIT_BRANCH_PREFIX:-seo/distribution}"
  branch="${branch_prefix%/}-${cycle_id}"

  if [[ ! -d "${repo_dir}" ]]; then
    log "Repo directory does not exist: ${repo_dir}"
    json_status "repo_missing" "${cycle_id}" "${branch}" "${report_file}" "${repo_dir}"
    return 1
  fi

  prepare_git_workspace "${repo_dir}" "${branch}" "${base_branch}"
  write_docs_snapshot "${repo_dir}"
  json_status "running" "${cycle_id}" "${branch}" "${report_file}" "${repo_dir}"

  cat >"${prompt_file}" <<PROMPT
You are the Nayovi social backlink and SEO distribution agent running on the Contabo VPS.

Current date: $(date -u +%Y-%m-%d)
Primary site: ${SEO_AGENT_PRIMARY_SITE:-https://tachiyomiat.com}
Brand domain: ${SEO_AGENT_BRAND_SITE:-https://nayovi.com}
SEO domain: ${SEO_AGENT_SEO_SITE:-https://translate-manhwa-ai.com}
Repo directory: ${repo_dir}
Working branch: ${branch}
Production branch: ${base_branch}

Business goal:
- Build trust signals before outreach so Nayovi emails do not look isolated or spammy.
- Create durable owned content, useful public assets, and legitimate backlink opportunities.
- Increase qualified traffic, creator/platform partnerships, investor interest, and paid subscriptions.
- Work continuously and autonomously, but do not violate platform rules or automate spam.

What Nayovi is:
- Nayovi is an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua readers.
- It has official APK download, free trial access, redeem-code activation, monthly token plans, support paths, and permission-safe positioning.
- Nayovi does not host or distribute chapters; it supports content users own, public-domain material, official samples, or content they have permission to process.

Allowed work:
- Inspect the repo and public sites.
- Use web search to continuously discover currently relevant social/backlink opportunities across high-authority surfaces, not only LinkedIn/Reddit/GitHub. Include Android press, app directories, SaaS/tool directories, AI tool directories, manga/webtoon/creator platforms, newsletters, podcasts, YouTube channels, Product Hunt/launch communities, Indie Hackers/build-in-public communities, Dev.to/Medium/technical blogs, GitHub awesome lists, resource pages, forums, Q&A sites, publisher/platform partner pages, accelerators, investor directories, affiliate/resource pages, and niche localization communities.
- Prioritize opportunities by authority, topical relevance, likelihood of acceptance, traffic quality, compliance risk, and revenue potential. Avoid low-quality link farms even if they are easy.
- Create or improve owned SEO pages, article drafts, comparisons, guides, internal links, metadata, schema, sitemap coverage, and linkable assets on owned properties.
- Maintain docs/seo-distribution/content-calendar.md with article topics, keywords, search intent, target URL, status, and next action.
- Maintain docs/seo-distribution/platform-drafts.md with platform-specific posts/comments/messages for LinkedIn, Reddit, GitHub, community forums, newsletters, app directories, and partner publications.
- Maintain docs/seo-distribution/authority-opportunities.md as the discovery pipeline for high-authority sites and communities. Each row must include authority tier, category, target, URL, fit, action type, account/API requirement, risk, status, and next action.
- Maintain docs/seo-distribution/link-assets.md with linkable resources, assets, comparisons, tutorials, data points, screenshots, demo video angles, and GitHub-ready documentation ideas.
- Maintain docs/seo-distribution/distribution-log.md with cycle results, drafts prepared, owned content changed, links discovered, and next actions.
- Maintain docs/growth/backlink-prospects.csv when a backlink/contact opportunity belongs in the broader outreach tracker.
- Prepare LinkedIn/Reddit/GitHub comments only when they are useful without the backlink. Include a link only when contextually helpful and likely allowed.
- For GitHub, prioritize owned repositories/docs, awesome-list candidates, relevant discussions only where invited, and issue/PR contributions only when genuinely helpful.
- For Reddit, identify exact subreddits, likely rule risks, post angle, value-first title/body, and whether a link should be omitted.
- For LinkedIn, identify partner/investor/persona targets, post ideas, DM drafts, and company-page content plans.
- Work only on the branch named ${branch}. Commit focused changes there. Push the branch only when SEO_AGENT_GIT_PUSH_ENABLED=true.

Hard constraints:
- Do not create LinkedIn, Reddit, GitHub, forum, directory, or third-party accounts automatically.
- Do not log in to third-party platforms, bypass anti-abuse systems, solve CAPTCHAs, evade rate limits, use fake personas, or automate public posting.
- Do not spam comments, issues, discussions, forums, communities, or social feeds with promotional links.
- Do not buy links, use PBNs, mass-submit low-quality articles, scrape private contact data, or produce doorway/thin pages.
- Do not post to Reddit, LinkedIn, GitHub, or any external platform unless an authorized account/API workflow is explicitly configured and the platform/community rules clearly allow that exact action. If not configured, create the draft and mark AUTHORIZED_ACCOUNT_REQUIRED or OWNER_REVIEW_REQUIRED.
- Do not run Vercel production deploy commands.
- Do not force-push. Do not print secrets. Do not commit env files, passwords, tokens, SSH keys, cookies, or generated credential files.
- Keep changes aligned with existing repo conventions.

Operational preferences:
- Model target: ${codex_model}
- Reasoning effort: ${codex_effort}
- External posting mode: ${SEO_AGENT_EXTERNAL_POSTING_MODE:-draft}
- Account creation enabled: ${SEO_AGENT_EXTERNAL_ACCOUNT_CREATION_ENABLED:-false}
- Account registry: ${STATE_DIR}/accounts.json
- Git push enabled: ${SEO_AGENT_GIT_PUSH_ENABLED:-true}
- Auto-merge to production branch: ${SEO_AGENT_AUTO_MERGE_TO_MASTER:-false}
- Validation command: ${SEO_AGENT_VALIDATION_COMMAND:-./node_modules/.bin/tsc --noEmit}

Agent coordination:
- Read docs/growth/backlink-prospects.csv and docs/growth/outreach-drafts.md before drafting social distribution, so the social work supports the active email/partnership pipeline.
- Write social-ready trust assets into docs/seo-distribution/*.md so the main growth agent can cite them in future outreach.
- Read ${STATE_DIR}/accounts.json. If a platform is not configured, draft the post/comment/message and mark AUTHORIZED_ACCOUNT_REQUIRED instead of attempting to post.
- If a platform is configured, still check whether the exact action is allowed by that platform/community before posting. If rules are unclear, draft only.
- Prefer owned channels first: owned GitHub docs/repo, Nayovi site pages, official company/founder posts, and app-directory profiles that preserve source-of-truth links.
- Do not repeat the same three platforms every cycle. Rotate discovery across authority categories and add new targets when they are high-fit.

Cycle checklist:
1. Check git status and current branch.
2. Audit owned content and identify 1-3 high-intent SEO or trust-building opportunities.
3. Add or improve one owned SEO/linkable asset where practical.
4. Research at least 3 authority opportunities from different categories and update docs/seo-distribution/authority-opportunities.md.
5. For the best ready opportunity, draft the exact value-first post/comment/message/listing/pitch in docs/seo-distribution/platform-drafts.md. Include target, audience, rules risk, no-link variant, and link variant.
6. Add linkable assets or pitch angles to docs/seo-distribution/link-assets.md.
7. Update docs/seo-distribution/distribution-log.md with concrete work, authority targets discovered, actions prepared, and next steps.
8. Run validation if practical.
9. Commit on ${branch} if files changed.
10. Push ${branch} only if enabled. Never force-push.
11. Write a concise final report with owned content changes, draft distribution assets, validation result, risks, and next social/backlink actions.
PROMPT

  log "Starting SEO distribution cycle ${cycle_id} in ${repo_dir}"

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
  if [[ "${SEO_AGENT_CODEX_SEARCH_ENABLED:-true}" == "false" ]]; then
    "${codex_bin}" -a never "${codex_args[@]}" <"${prompt_file}"
  else
    "${codex_bin}" --search -a never "${codex_args[@]}" <"${prompt_file}"
  fi

  publish_cycle_branch "${repo_dir}" "${branch}" "${base_branch}" "${cycle_id}" "${report_file}"
  write_docs_snapshot "${repo_dir}"
  maybe_send_owner_notification "${cycle_id}" "${report_file}" "${repo_dir}"
  json_status "sleeping" "${cycle_id}" "${branch}" "${report_file}" "${repo_dir}"

  log "Completed SEO distribution cycle ${cycle_id}; report=${report_file}"
}

maybe_send_owner_notification() {
  local cycle_id="$1"
  local report_file="$2"
  local repo_dir="$3"
  local notify_env_file notify_to subject

  if [[ "${SEO_AGENT_NOTIFY_ENABLED:-false}" != "true" ]]; then
    return 0
  fi

  notify_to="${SEO_AGENT_NOTIFY_EMAIL:-}"
  notify_env_file="${SEO_AGENT_NOTIFY_ENV_FILE:-${APP_DIR}/.env.growth-mail}"
  if [[ -z "${notify_to}" || ! -s "${report_file}" || ! -f "${notify_env_file}" ]]; then
    return 0
  fi

  subject="${SEO_AGENT_NOTIFY_SUBJECT_PREFIX:-Nayovi SEO distribution}: ${cycle_id}"
  if ! /usr/local/bin/tachi-growth-owner-notify \
    --env-file "${notify_env_file}" \
    --to "${notify_to}" \
    --subject "${subject}" \
    --report-file "${report_file}" \
    --repo-dir "${repo_dir}" \
    --cycle-id "${cycle_id}"; then
    log "SEO owner notification failed for ${cycle_id}; continuing."
  fi
}

publish_cycle_branch() {
  local repo_dir="$1"
  local branch="$2"
  local base_branch="$3"
  local cycle_id="$4"
  local report_file="$5"

  if [[ ! -d "${repo_dir}/.git" ]]; then
    return 0
  fi

  (
    cd "${repo_dir}"
    cleanup_transient_runtime_files

    git config user.name "${SEO_AGENT_GIT_AUTHOR_NAME:-Nayovi SEO Distribution Agent}"
    git config user.email "${SEO_AGENT_GIT_AUTHOR_EMAIL:-seo-agent@nayovi.com}"

    if ! git show-ref --verify --quiet "refs/heads/${branch}"; then
      append_report_note "${report_file}" "Branch ${branch} does not exist; nothing to publish."
      return 0
    fi

    git checkout "${branch}"
    auto_commit_cycle_changes "${cycle_id}" "${report_file}"

    if ! git diff --quiet || ! git diff --cached --quiet; then
      append_report_note "${report_file}" "OWNER_REVIEW_REQUIRED: workspace is still dirty after auto-commit."
      return 0
    fi

    if [[ "${SEO_AGENT_GIT_PUSH_ENABLED:-true}" == "true" ]]; then
      if ! git push --no-verify origin "${branch}"; then
        append_report_note "${report_file}" "OWNER_REVIEW_REQUIRED: pushing ${branch} failed."
        return 0
      fi
      append_report_note "${report_file}" "Pushed ${branch}. Master was not pushed."
    else
      append_report_note "${report_file}" "Git push disabled; left ${branch} local. Master was not pushed."
    fi

    if [[ "${SEO_AGENT_AUTO_MERGE_TO_MASTER:-false}" == "true" ]]; then
      append_report_note "${report_file}" "OWNER_REVIEW_REQUIRED: SEO_AGENT_AUTO_MERGE_TO_MASTER is disabled for this social/backlink runner; master was not pushed."
    fi
  )
}

auto_commit_cycle_changes() {
  local cycle_id="$1"
  local report_file="$2"
  local status_output

  cleanup_transient_runtime_files
  status_output="$(git status --porcelain=v1)"
  if [[ -z "${status_output}" ]]; then
    return 0
  fi

  if has_sensitive_status_paths "${status_output}"; then
    append_report_note "${report_file}" "OWNER_REVIEW_REQUIRED: refusing to auto-commit sensitive-looking paths."
    return 0
  fi

  git add -A
  if git diff --cached --quiet; then
    return 0
  fi

  git commit -m "SEO distribution cycle ${cycle_id}"
}

has_sensitive_status_paths() {
  local status_output="$1"

  printf '%s\n' "${status_output}" \
    | sed -E 's/^...//' \
    | grep -Eiq '(^|/)(\.env($|[.])|id_rsa|id_dsa|id_ecdsa|id_ed25519|[^/]*(secret|token|credential|cookie|session|private-key|private_key)[^/]*|[^/]*\.(pem|key|p12|pfx))($|[[:space:]]| -> )'
}

cleanup_transient_runtime_files() {
  if [[ -f pnpm-workspace.yaml ]] \
    && ! git ls-files --error-unmatch pnpm-workspace.yaml >/dev/null 2>&1 \
    && grep -q 'allowBuilds:' pnpm-workspace.yaml \
    && grep -q 'set this to true or false' pnpm-workspace.yaml; then
    rm -f pnpm-workspace.yaml
  fi
}

append_report_note() {
  local report_file="$1"
  local message="$2"

  {
    printf '\n\n## Runner Publication\n\n'
    printf '%s\n' "${message}"
  } >>"${report_file}"
  log "${message}"
}

prepare_git_workspace() {
  local repo_dir="$1"
  local branch="$2"
  local base_branch="$3"

  if [[ ! -d "${repo_dir}/.git" ]]; then
    return 0
  fi

  (
    cd "${repo_dir}"

    git config user.name "${SEO_AGENT_GIT_AUTHOR_NAME:-Nayovi SEO Distribution Agent}"
    git config user.email "${SEO_AGENT_GIT_AUTHOR_EMAIL:-seo-agent@nayovi.com}"
    cleanup_transient_runtime_files

    if [[ "${SEO_AGENT_AUTO_CHECKOUT_BRANCH:-true}" != "true" ]]; then
      return 0
    fi

    if ! git diff --quiet || ! git diff --cached --quiet; then
      log "Git workspace has local changes; skipping branch sync."
      return 0
    fi

    git fetch origin "${base_branch}"
    git checkout -B "${branch}" "origin/${base_branch}"
  )
}

run_loop() {
  local interval remaining step trigger_file

  interval="${SEO_AGENT_INTERVAL_SECONDS:-60}"
  while true; do
    if ! run_codex_cycle; then
      log "SEO distribution cycle failed; continuing after backoff."
      json_status "failed"
    fi

    trigger_file="${SEO_AGENT_TRIGGER_FILE:-${STATE_DIR}/run-now}"
    remaining="${interval}"
    while (( remaining > 0 )); do
      if [[ -f "${trigger_file}" ]]; then
        rm -f "${trigger_file}"
        log "Run-now trigger detected; starting next SEO distribution cycle."
        break
      fi
      step=60
      if (( remaining < step )); then
        step="${remaining}"
      fi
      sleep "${step}"
      remaining=$(( remaining - step ))
    done
  done
}

main() {
  load_env_file "${ENV_FILE}"

  if [[ "${SEO_AGENT_ENABLED:-false}" != "true" ]]; then
    log "SEO distribution agent disabled. Set SEO_AGENT_ENABLED=true in ${ENV_FILE}."
    exit 0
  fi

  mkdir -p "${STATE_DIR}" "${LOG_DIR}"
  json_status "starting"

  exec 9>"${LOCK_FILE}"
  if ! flock -n 9; then
    log "SEO distribution agent is already running; exiting."
    exit 0
  fi

  if [[ "${SEO_AGENT_RUN_FOREVER:-true}" == "true" ]]; then
    run_loop
  else
    run_codex_cycle
  fi
}

main "$@"
