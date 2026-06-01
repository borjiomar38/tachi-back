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
    INTERVAL_SECONDS="${SEO_AGENT_INTERVAL_SECONDS:-86400}" \
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
    "docs/seo-distribution/account-setup.md",
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
  codex_model="${SEO_AGENT_CODEX_MODEL:-gpt-5.3-codex-spark}"
  codex_effort="${SEO_AGENT_CODEX_REASONING_EFFORT:-medium}"
  codex_sandbox="${SEO_AGENT_CODEX_SANDBOX:-danger-full-access}"
  base_branch="${SEO_AGENT_BASE_BRANCH:-master}"
  branch_prefix="${SEO_AGENT_GIT_BRANCH_PREFIX:-seo/distribution}"
  branch="${branch_prefix%/}-${cycle_id}"

  if [[ ! -d "${repo_dir}" ]]; then
    log "Repo directory does not exist: ${repo_dir}"
    json_status "repo_missing" "${cycle_id}" "${branch}" "${report_file}" "${repo_dir}"
    return 1
  fi

  if ! ensure_no_unmerged_agent_branches \
    "${repo_dir}" \
    "${base_branch}" \
    "${report_file}" \
    "${SEO_AGENT_BLOCK_ON_UNMERGED_AGENT_BRANCHES:-false}" \
    "${SEO_AGENT_UNMERGED_BRANCH_PATTERN:-^origin/(growth|seo)/}"; then
    json_status "blocked_unmerged_branches" "${cycle_id}" "${branch}" "${report_file}" "${repo_dir}"
    return 0
  fi

  prepare_git_workspace "${repo_dir}" "${branch}" "${base_branch}"
  write_docs_snapshot "${repo_dir}"
  json_status "running" "${cycle_id}" "${branch}" "${report_file}" "${repo_dir}"

  cat >"${prompt_file}" <<PROMPT
You are the Nayovi social backlink and SEO distribution agent running on the Contabo VPS.

Current date: $(date -u +%Y-%m-%d)
Primary site: ${SEO_AGENT_PRIMARY_SITE:-https://nayovi.com}
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
- Prioritize official Nayovi account setup when SEO_AGENT_ACCOUNT_SETUP_PRIORITY=true: identify official accounts/profiles that Nayovi should own or connect, prepare exact profile fields, bios, descriptions, canonical links, assets, credential storage references, and API/token requirements, then track each setup step in docs/seo-distribution/account-setup.md.
- Use web search to continuously discover currently relevant social/backlink opportunities across high-authority surfaces, not only LinkedIn/Reddit/GitHub. Include Android press, app directories, SaaS/tool directories, AI tool directories, manga/webtoon/creator platforms, newsletters, podcasts, YouTube channels, Product Hunt/launch communities, Indie Hackers/build-in-public communities, Dev.to/Medium/technical blogs, GitHub awesome lists, resource pages, forums, Q&A sites, publisher/platform partner pages, accelerators, investor directories, affiliate/resource pages, and niche localization communities.
- Prioritize opportunities by authority, topical relevance, likelihood of acceptance, traffic quality, compliance risk, and revenue potential. Avoid low-quality link farms even if they are easy.
- Create or improve owned SEO pages, article drafts, comparisons, guides, internal links, metadata, schema, sitemap coverage, and linkable assets on owned properties.
- Maintain docs/seo-distribution/content-calendar.md with article topics, keywords, search intent, target URL, status, and next action.
- Maintain docs/seo-distribution/account-setup.md with official Nayovi account/profile setup tasks. Each row must include priority, platform, purpose, status, owner/manual step, required assets, secret/API variable or credential reference, publish capability after connection, and next action.
- Maintain docs/seo-distribution/platform-drafts.md with platform-specific posts/comments/messages for LinkedIn, Reddit, GitHub, community forums, newsletters, app directories, and partner publications.
- Maintain docs/seo-distribution/social-post-queue.jsonl or the configured SEO_AGENT_SOCIAL_QUEUE_FILE with Facebook Page posts. Use JSONL objects with id, platform, status, message, optional link, optional scheduled_at, optional story_title, optional story_hook, optional genre, optional lead_archetype, optional visual_style, optional image_prompt, optional image_path, and optional image_alt.
- Maintain docs/seo-distribution/facebook-page-info.json or the configured SEO_AGENT_FACEBOOK_PAGE_INFO_FILE with official Facebook Page profile field changes.
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
- Do not create fake accounts, personal-looking personas, employee impersonation accounts, or throwaway accounts. Every account/profile must be an official Nayovi-owned brand/founder/developer account with truthful identity and source-of-truth links.
- Do not create LinkedIn, Reddit, GitHub, forum, directory, or third-party accounts automatically unless the platform provides a compliant official API/account workflow and the required Nayovi-owned credentials/tokens are already configured.
- Do not submit signup forms, verify email/phone, solve CAPTCHAs, upload identity documents, or accept third-party terms automatically. Prepare the exact setup packet and write OWNER_ACTION_REQUIRED: as the first text on a report line only when a human-owned account creation step blocks the next autonomous action.
- Do not log in to third-party platforms, bypass anti-abuse systems, solve CAPTCHAs, evade rate limits, use fake personas, or automate public posting.
- Do not spam comments, issues, discussions, forums, communities, or social feeds with promotional links.
- Do not buy links, use PBNs, mass-submit low-quality articles, scrape private contact data, or produce doorway/thin pages.
- Do not post to Reddit, LinkedIn, GitHub, or any external platform unless an authorized account/API workflow is explicitly configured and the platform/community rules clearly allow that exact action. If not configured, create the draft and mark AUTHORIZED_ACCOUNT_REQUIRED or OWNER_REVIEW_REQUIRED.
- For Facebook Page posting, if SEO_AGENT_FACEBOOK_AUTONOMOUS_APPROVAL_ENABLED=true and SEO_AGENT_FACEBOOK_POSTING_MODE=publish, you may create status=auto_publish queue items for useful official Page posts. Otherwise create only status=draft or status=owner_review_required queue items. Never create manipulative, repetitive, or unsupported posts.
- Facebook posts are for normal manga/manhwa/manhua readers, not developers. Write in English. The post must feel like a teaser for an invented epic manhwa story, not like an app ad, image prompt, or technical update.
- Facebook caption format: invented title in uppercase, then a short cinematic story hook in 5-9 plain English lines, then one reader question, then a final short Nayovi Android CTA. Use https://nayovi.com/download as the CTA link. Do not use tachiyomiat.com in new social posts unless the owner explicitly asks for legacy branding.
- Facebook story captions must narrate the fictional manhwa world and character stakes. Avoid prompt-like summaries such as "a fallen princess wakes under a black sun"; instead write like story copy: "Seraya was born inside the moon..." Avoid internal SEO/developer phrases such as OCR checklist, no-link-first, citation ladder, schema, metadata, compliance, backlinks, ranking, API, or workflow.
- Facebook visuals must be story-first invented manhwa poster art: original strong hero, heroine, duo, team, antihero, or iconic non-human threat, epic background, dramatic powers, no copyrighted characters, no device mockups, no software interface, no Nayovi logo, no translation overlay, no captured screens, no fake readable text, and no sexualized minors.
- Facebook character rotation is required. Do not keep creating female-led posters by default. Across every 10 new Facebook queue items, target roughly 4 male-led stories, 4 female-led stories, and 2 duo/team/antihero/creature-led stories. Avoid repeating the same lead archetype, setting, power color, or title structure from the most recent Facebook queue items. Each new Facebook item should set lead_archetype to one of male_hero, female_heroine, duo_team, antihero, creature_threat, or ensemble.
- Use status=auto_publish only when the queue item already has a high-quality story-poster image_path or image_url. If there is only an image_prompt or visual_style and no generated image asset, keep it as draft or owner_review_required with IMAGE_BACKEND_REQUIRED in the report instead of auto-publishing a weak placeholder.
- For Facebook Page info updates, if SEO_AGENT_FACEBOOK_PAGE_INFO_AUTONOMOUS_ENABLED=true and SEO_AGENT_FACEBOOK_PAGE_INFO_MODE=sync, you may create status=auto_sync changes for truthful official Page profile fields. Otherwise create only status=draft or status=owner_review_required changes.
- Do not run Vercel production deploy commands.
- Do not force-push. Do not print secrets. Do not commit env files, passwords, tokens, SSH keys, cookies, or generated credential files.
- Do not use OPENAI_API_KEY, SEO_AGENT_OPENAI_API_KEY, or direct OpenAI image-generation API calls for social images or social posts. Social images must be generated through the Codex CLI image renderer. If Codex CLI imagegen is unavailable, keep posts in draft/owner_review_required and report IMAGEGEN_TOOL_UNAVAILABLE instead of making placeholders.
- Credentials must never be written to docs, reports, Git, screenshots, email summaries, or backoffice fields. Store only non-secret credential references such as SEO_AGENT_LINKEDIN_ACCESS_TOKEN; actual values belong in /opt/tachi-back/.env.seo-distribution-agent with chmod 600 or another approved secret store.
- Keep changes aligned with existing repo conventions.

Operational preferences:
- Model target: ${codex_model}
- Reasoning effort: ${codex_effort}
- External posting mode: ${SEO_AGENT_EXTERNAL_POSTING_MODE:-draft}
- Account creation enabled: ${SEO_AGENT_EXTERNAL_ACCOUNT_CREATION_ENABLED:-false}
- Account registry: ${STATE_DIR}/accounts.json
- Account setup priority: ${SEO_AGENT_ACCOUNT_SETUP_PRIORITY:-true}
- Facebook posting mode: ${SEO_AGENT_FACEBOOK_POSTING_MODE:-draft}
- Facebook page info mode: ${SEO_AGENT_FACEBOOK_PAGE_INFO_MODE:-draft}
- Facebook autonomous post approval: ${SEO_AGENT_FACEBOOK_AUTONOMOUS_APPROVAL_ENABLED:-false}
- Facebook autonomous page info sync: ${SEO_AGENT_FACEBOOK_PAGE_INFO_AUTONOMOUS_ENABLED:-false}
- Facebook daily post limit: ${SEO_AGENT_FACEBOOK_DAILY_POST_LIMIT:-1}
- Social image directory: ${SEO_AGENT_SOCIAL_IMAGE_DIR:-/var/lib/tachi-seo-distribution-agent/generated-images}
- Social queue file: ${SEO_AGENT_SOCIAL_QUEUE_FILE:-${repo_dir}/docs/seo-distribution/social-post-queue.jsonl}
- Git push enabled: ${SEO_AGENT_GIT_PUSH_ENABLED:-true}
- Auto-merge to production branch: ${SEO_AGENT_AUTO_MERGE_TO_MASTER:-false}
- Validation command: ${SEO_AGENT_VALIDATION_COMMAND:-./node_modules/.bin/tsc --noEmit}

Agent coordination:
- Read docs/growth/backlink-prospects.csv and docs/growth/outreach-drafts.md before drafting social distribution, so the social work supports the active email/partnership pipeline.
- Write social-ready trust assets into docs/seo-distribution/*.md so the main growth agent can cite them in future outreach.
- Read ${STATE_DIR}/accounts.json. If a platform is not configured, draft the post/comment/message and mark AUTHORIZED_ACCOUNT_REQUIRED instead of attempting to post.
- Use docs/seo-distribution/account-setup.md as the shared setup queue. The growth agent should use it to know which accounts can already be cited and which accounts still need owner/API connection.
- If a platform is configured, still check whether the exact action is allowed by that platform/community before posting. If rules are unclear, draft only.
- Prefer owned channels first: owned GitHub docs/repo, Nayovi site pages, official company/founder posts, and app-directory profiles that preserve source-of-truth links.
- Do not repeat the same three platforms every cycle. Rotate discovery across authority categories and add new targets when they are high-fit.

Cycle checklist:
1. Check git status and current branch.
2. If SEO_AGENT_ACCOUNT_SETUP_PRIORITY=true, advance at least 2 official Nayovi account/profile setup tasks in docs/seo-distribution/account-setup.md before choosing normal backlink work. Prefer official owned profiles with high trust value: Google Search Console/Bing Webmaster, GitHub org/repo docs, YouTube channel, LinkedIn company/founder page, Product Hunt maker/company, DEV/Medium technical publishing, Reddit official account, X/Twitter, app-directory developer portals, AI directory accounts, newsletter/community profiles, and partner/publication contributor profiles.
3. For each official account setup task, prepare exact public profile copy, canonical links, asset checklist, verification steps, required secret/API variables, credential storage location reference, and what the agent can do after the account is connected. Use OWNER_ACTION_REQUIRED: only at the beginning of a final report line when manual signup, CAPTCHA, email/phone verification, terms acceptance, or missing token/API access blocks useful autonomous work.
4. Audit owned content and identify 1-3 high-intent SEO or trust-building opportunities.
5. Add or improve one owned SEO/linkable asset where practical.
6. Research at least 3 authority opportunities from different categories and update docs/seo-distribution/authority-opportunities.md.
7. For the best ready opportunity, draft the exact value-first post/comment/message/listing/pitch in docs/seo-distribution/platform-drafts.md. Include target, audience, rules risk, no-link variant, and link variant.
8. Add linkable assets or pitch angles to docs/seo-distribution/link-assets.md.
9. Add Facebook Page posts to the configured social queue when useful. Use status=auto_publish only when autonomous Facebook publishing is enabled and the post already has a high-quality image_path or image_url. Otherwise use status=draft or status=owner_review_required. Write an English invented manhwa teaser story, not product copy: title, cinematic hook, 5-9 short story lines, one reader question, and a final short CTA to https://nayovi.com/download. Set story_title, story_hook, genre, lead_archetype, visual_style, image_prompt, image_path, and image_alt where available. Rotate lead_archetype instead of defaulting to women: use male_hero, female_heroine, duo_team, antihero, creature_threat, and ensemble across cycles. Image concepts must be original and brand-safe: no copyrighted characters, manga panels, third-party logos, device mockups, software interfaces, fake readable text, sexualized minors, or readable unsupported claims.
10. Add or refine Facebook Page profile fields when useful. Use status=auto_sync only when autonomous Page info sync is enabled; otherwise use status=draft.
11. Update docs/seo-distribution/distribution-log.md with concrete work, account setup progress, authority targets discovered, actions prepared, and next steps.
12. Run validation if practical.
13. Commit on ${branch} if files changed.
14. Push ${branch} only if enabled. Never force-push.
15. Write a concise final report with account setup progress, owned content changes, draft distribution assets, validation result, risks, and next social/backlink actions.
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
  maybe_render_social_images "${cycle_id}" "${report_file}" "${repo_dir}"
  maybe_publish_social_queue "${cycle_id}" "${report_file}" "${repo_dir}"
  maybe_send_owner_notification "${cycle_id}" "${report_file}" "${repo_dir}"
  json_status "sleeping" "${cycle_id}" "${branch}" "${report_file}" "${repo_dir}"

  log "Completed SEO distribution cycle ${cycle_id}; report=${report_file}"
}

maybe_render_social_images() {
  local cycle_id="$1"
  local report_file="$2"
  local repo_dir="$3"
  local image_dir image_renderer promote_rendered_status queue_file

  image_renderer="${SEO_AGENT_SOCIAL_IMAGE_RENDERER_PATH:-}"
  queue_file="${SEO_AGENT_SOCIAL_QUEUE_FILE:-${repo_dir}/docs/seo-distribution/social-post-queue.jsonl}"
  image_dir="${SEO_AGENT_SOCIAL_IMAGE_DIR:-/var/lib/tachi-seo-distribution-agent/generated-images}"

  if [[ -z "${image_renderer}" ]]; then
    append_report_note "${report_file}" "Social image renderer disabled; auto-publish requires pre-generated image_path or image_url."
    return 0
  fi

  if [[ ! -x "${image_renderer}" ]]; then
    append_report_note "${report_file}" "Social image renderer not installed at ${image_renderer}; skipped."
    return 0
  fi

  if [[ ! -f "${queue_file}" ]]; then
    append_report_note "${report_file}" "No social queue file at ${queue_file}; social image renderer skipped."
    return 0
  fi

  local renderer_args=(
    --queue-file "${queue_file}"
    --image-dir "${image_dir}"
    --limit "${SEO_AGENT_SOCIAL_IMAGE_RENDER_LIMIT:-20}"
  )

  promote_rendered_status="${SEO_AGENT_SOCIAL_IMAGE_PROMOTE_RENDERED_STATUS:-}"
  if [[ -z "${promote_rendered_status}" \
    && "${SEO_AGENT_FACEBOOK_POSTING_MODE:-draft}" == "publish" \
    && "${SEO_AGENT_FACEBOOK_AUTONOMOUS_APPROVAL_ENABLED:-false}" == "true" ]]; then
    promote_rendered_status="auto_publish"
  fi

  if [[ -n "${promote_rendered_status}" ]]; then
    renderer_args+=(--promote-rendered-status "${promote_rendered_status}")
  fi

  if "${image_renderer}" "${renderer_args[@]}" >>"${report_file}" 2>&1; then
    append_report_note "${report_file}" "Social image renderer checked queue for ${cycle_id}."
  else
    append_report_note "${report_file}" "OWNER_REVIEW_REQUIRED: social image renderer failed for ${cycle_id}; see report output above."
  fi
}

maybe_publish_social_queue() {
  local cycle_id="$1"
  local report_file="$2"
  local repo_dir="$3"
  local facebook_publisher queue_file

  facebook_publisher="${SEO_AGENT_FACEBOOK_PUBLISHER_PATH:-/usr/local/bin/tachi-facebook-page-publisher}"
  queue_file="${SEO_AGENT_SOCIAL_QUEUE_FILE:-${repo_dir}/docs/seo-distribution/social-post-queue.jsonl}"

  if [[ "${SEO_AGENT_FACEBOOK_POSTING_MODE:-draft}" == "off" ]]; then
    append_report_note "${report_file}" "Facebook publisher off for ${cycle_id}."
    return 0
  fi

  if [[ ! -x "${facebook_publisher}" ]]; then
    append_report_note "${report_file}" "Facebook publisher not installed at ${facebook_publisher}; skipped."
    return 0
  fi

  if [[ ! -f "${queue_file}" ]]; then
    append_report_note "${report_file}" "No social queue file at ${queue_file}; Facebook publisher skipped."
    return 0
  fi

  if "${facebook_publisher}" \
    --env-file "${ENV_FILE}" \
    --queue-file "${queue_file}" \
    --limit "${SEO_AGENT_FACEBOOK_POST_LIMIT:-1}" \
    >>"${report_file}" 2>&1; then
    append_report_note "${report_file}" "Facebook publisher checked queue for ${cycle_id}."
  else
    append_report_note "${report_file}" "OWNER_REVIEW_REQUIRED: Facebook publisher failed for ${cycle_id}; see report output above."
  fi
}

maybe_send_owner_notification() {
  local cycle_id="$1"
  local report_file="$2"
  local repo_dir="$3"
  local daily_state_file daily_summary_enabled emergency_match notification_kind notify_env_file notify_keywords notify_to subject

  if [[ "${SEO_AGENT_NOTIFY_ENABLED:-false}" != "true" ]]; then
    return 0
  fi

  notify_to="${SEO_AGENT_NOTIFY_EMAIL:-}"
  notify_env_file="${SEO_AGENT_NOTIFY_ENV_FILE:-${APP_DIR}/.env.growth-mail}"
  if [[ -z "${notify_to}" || ! -s "${report_file}" || ! -f "${notify_env_file}" ]]; then
    return 0
  fi

  daily_state_file="${SEO_AGENT_DAILY_SUMMARY_STATE_FILE:-${STATE_DIR}/last-owner-daily-summary-at}"
  notify_keywords="${SEO_AGENT_NOTIFY_KEYWORDS:-OWNER_ACTION_REQUIRED,EMERGENCY_OWNER_REPLY_REQUIRED,MEETING_REQUIRED,CALL_REQUIRED,cannot continue without owner,cant continue without owner,can not continue without owner,owner reply required}"
  emergency_match="false"
  if report_requires_owner_notification "${report_file}" "${notify_keywords}"; then
    emergency_match="true"
  fi

  if [[ "${emergency_match}" == "true" ]]; then
    notification_kind="emergency"
    subject="${SEO_AGENT_NOTIFY_SUBJECT_PREFIX:-Nayovi SEO distribution}: emergency ${cycle_id}"
  else
    daily_summary_enabled="${SEO_AGENT_DAILY_SUMMARY_ENABLED:-true}"
    if [[ "${daily_summary_enabled}" != "true" ]]; then
      log "No SEO owner action notification matched for ${cycle_id}; daily summary disabled."
      return 0
    fi

    if ! daily_summary_due "${daily_state_file}" "${SEO_AGENT_DAILY_SUMMARY_INTERVAL_SECONDS:-86400}"; then
      log "No SEO owner action notification matched for ${cycle_id}; daily summary not due."
      return 0
    fi

    notification_kind="daily"
    subject="${SEO_AGENT_NOTIFY_SUBJECT_PREFIX:-Nayovi SEO distribution}: daily summary ${cycle_id}"
  fi

  if ! /usr/local/bin/tachi-growth-owner-notify \
    --env-file "${notify_env_file}" \
    --to "${notify_to}" \
    --subject "${subject}" \
    --report-file "${report_file}" \
    --repo-dir "${repo_dir}" \
    --cycle-id "${cycle_id}"; then
    log "SEO owner notification failed for ${cycle_id}; continuing."
    return 0
  fi

  if [[ "${notification_kind}" == "daily" || "${notification_kind}" == "emergency" ]]; then
    mark_daily_summary_sent "${daily_state_file}"
  fi
}

report_requires_owner_notification() {
  local report_file="$1"
  local notify_keywords="${2:-}"

  python3 - "${report_file}" "${notify_keywords}" <<'PY'
import re
import sys
import unicodedata
from pathlib import Path

path = Path(sys.argv[1])
keywords = [item.strip() for item in sys.argv[2].split(",") if item.strip()]

marker_keywords = {
    "OWNER_ACTION_REQUIRED",
    "EMERGENCY_OWNER_REPLY_REQUIRED",
    "MEETING_REQUIRED",
    "CALL_REQUIRED",
}

def normalize(value: str) -> str:
    value = unicodedata.normalize("NFKD", value)
    value = "".join(ch for ch in value if not unicodedata.combining(ch))
    value = value.replace("’", "'")
    return value.lower()

negative_patterns = [
    r"\bno\b.{0,50}\b(owner action|required|meeting|call)\b",
    r"\bnot required\b",
    r"\bno\b.{0,50}\baction is required\b",
    r"\baucun(e)?\b.{0,60}\b(action|besoin|reponse|rdv|rendez|call)\b",
    r"\brien\b.{0,40}\b(pour l'instant|a faire|necessaire)\b",
    r"\bdo not include\b.{0,80}\b(owner_action_required|meeting_required|call_required)\b",
    r"\buse\b.{0,80}\b(owner_action_required|meeting_required|call_required)\b.{0,80}\bonly\b",
]

line_marker_re = re.compile(
    r"^\s{0,3}(?:[-*]\s*)?(?:`{0,3})("
    + "|".join(re.escape(marker) for marker in sorted(marker_keywords))
    + r")(?:`{0,3})\s*[:\-]",
    re.IGNORECASE,
)

positive_phrases = {
    normalize(keyword)
    for keyword in keywords
    if keyword.upper() not in marker_keywords and len(keyword) >= 6
}

try:
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
except FileNotFoundError:
    sys.exit(1)

for raw_line in lines:
    line = raw_line.strip()
    if not line:
        continue

    normalized = normalize(line)
    if any(re.search(pattern, normalized) for pattern in negative_patterns):
        continue

    if line_marker_re.search(line):
        sys.exit(0)

    if any(phrase in normalized for phrase in positive_phrases):
        sys.exit(0)

sys.exit(1)
PY
}

daily_summary_due() {
  local state_file="$1"
  local interval_seconds="$2"
  local last_sent now

  if [[ ! -f "${state_file}" ]]; then
    return 0
  fi

  last_sent="$(cat "${state_file}" 2>/dev/null || printf '0')"
  if ! [[ "${last_sent}" =~ ^[0-9]+$ ]]; then
    return 0
  fi

  now="$(date +%s)"
  (( now - last_sent >= interval_seconds ))
}

mark_daily_summary_sent() {
  local state_file="$1"

  mkdir -p "$(dirname "${state_file}")"
  date +%s >"${state_file}"
}

publish_cycle_branch() {
  local repo_dir="$1"
  local branch="$2"
  local base_branch="$3"
  local cycle_id="$4"
  local report_file="$5"
  local branch_head merge_message remote_base

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
    if ! auto_commit_cycle_changes "${cycle_id}" "${report_file}"; then
      append_report_note "${report_file}" "OWNER_REVIEW_REQUIRED: auto-publish skipped because the cycle left unsafe or uncommittable changes."
      return 0
    fi

    if ! git diff --quiet || ! git diff --cached --quiet; then
      append_report_note "${report_file}" "OWNER_REVIEW_REQUIRED: workspace is still dirty after auto-commit."
      return 0
    fi

    git fetch origin "${base_branch}"
    remote_base="origin/${base_branch}"
    if ! git merge-base --is-ancestor "${remote_base}" HEAD; then
      if ! git merge --no-edit "${remote_base}"; then
        git merge --abort >/dev/null 2>&1 || true
        append_report_note "${report_file}" "OWNER_REVIEW_REQUIRED: auto-publish skipped because ${branch} conflicts with ${remote_base}."
        return 0
      fi
    fi

    if [[ "$(git rev-list --count "${remote_base}..HEAD")" == "0" ]]; then
      append_report_note "${report_file}" "Auto-publish skipped; ${branch} has no commits ahead of ${remote_base}."
      return 0
    fi

    if [[ -n "${SEO_AGENT_VALIDATION_COMMAND:-}" ]]; then
      if ! bash -lc "${SEO_AGENT_VALIDATION_COMMAND}"; then
        append_report_note "${report_file}" "OWNER_REVIEW_REQUIRED: auto-publish skipped because validation failed: ${SEO_AGENT_VALIDATION_COMMAND}"
        return 0
      fi
    fi

    branch_head="$(git rev-parse --short HEAD)"

    if [[ "${SEO_AGENT_GIT_PUSH_ENABLED:-true}" == "true" ]]; then
      if ! git push --no-verify origin "${branch}"; then
        append_report_note "${report_file}" "OWNER_REVIEW_REQUIRED: pushing ${branch} failed."
        return 0
      fi
      append_report_note "${report_file}" "Pushed ${branch}."
    else
      append_report_note "${report_file}" "Git push disabled; left ${branch} local. Master was not pushed."
      return 0
    fi

    if [[ "${SEO_AGENT_AUTO_MERGE_TO_MASTER:-false}" != "true" ]]; then
      append_report_note "${report_file}" "Auto-merge disabled; left ${branch} unmerged."
      return 0
    fi

    git checkout -B "${base_branch}" "${remote_base}"
    merge_message="Merge ${branch} SEO distribution cycle ${cycle_id}"
    if ! git merge --no-ff --no-edit -m "${merge_message}" "${branch}"; then
      git merge --abort >/dev/null 2>&1 || true
      git checkout "${branch}"
      append_report_note "${report_file}" "OWNER_REVIEW_REQUIRED: auto-merge into ${base_branch} failed for ${branch}."
      return 0
    fi

    if ! git push --no-verify origin "${base_branch}"; then
      git checkout "${branch}"
      append_report_note "${report_file}" "OWNER_REVIEW_REQUIRED: ${branch} merged locally, but pushing ${base_branch} failed."
      return 0
    fi
    append_report_note "${report_file}" "Published ${branch} (${branch_head}) to ${base_branch}; production deploy triggered by ${base_branch} push."
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
    return 1
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

ensure_no_unmerged_agent_branches() {
  local repo_dir="$1"
  local base_branch="$2"
  local report_file="$3"
  local enabled="$4"
  local branch_pattern="$5"
  local pending

  if [[ "${enabled}" != "true" ]]; then
    return 0
  fi

  if [[ ! -d "${repo_dir}/.git" ]]; then
    return 0
  fi

  (
    cd "${repo_dir}"

    if ! git fetch --prune origin; then
      append_report_note "${report_file}" "Agent branch guard blocked this SEO distribution cycle because origin/${base_branch} could not be fetched. No new branch was created."
      return 1
    fi

    if ! git rev-parse --verify --quiet "origin/${base_branch}" >/dev/null; then
      append_report_note "${report_file}" "Agent branch guard blocked this SEO distribution cycle because origin/${base_branch} is unavailable. No new branch was created."
      return 1
    fi

    pending="$(git branch -r --no-merged "origin/${base_branch}" --format='%(refname:short)' | grep -E "${branch_pattern}" || true)"
    if [[ -z "${pending}" ]]; then
      return 0
    fi

    append_report_note "${report_file}" "Agent branch guard blocked this SEO distribution cycle because existing agent branches are not merged into origin/${base_branch}. No new branch was created."
    {
      printf '\nPending unmerged agent branches:\n'
      printf '%s\n' "${pending}"
    } >>"${report_file}"

    while IFS= read -r pending_branch; do
      [[ -n "${pending_branch}" ]] && log "Pending unmerged agent branch: ${pending_branch}"
    done <<<"${pending}"

    return 1
  )
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

wait_for_next_cycle() {
  local remaining="$1"
  local step trigger_file

  trigger_file="${SEO_AGENT_TRIGGER_FILE:-${STATE_DIR}/run-now}"
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
}

run_loop() {
  local initial_sleep interval

  initial_sleep="${SEO_AGENT_INITIAL_SLEEP_SECONDS:-0}"
  if (( initial_sleep > 0 )); then
    log "Initial SEO distribution sleep for ${initial_sleep}s before first automatic cycle."
    wait_for_next_cycle "${initial_sleep}"
  fi

  interval="${SEO_AGENT_INTERVAL_SECONDS:-86400}"
  while true; do
    if ! run_codex_cycle; then
      log "SEO distribution cycle failed; continuing after backoff."
      json_status "failed"
    fi

    wait_for_next_cycle "${interval}"
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
