#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${TACHI_APP_DIR:-/opt/tachi-back}"
SERVICE_NAME="${TACHI_SEO_AGENT_SERVICE_NAME:-tachi-seo-distribution-agent}"
ENV_FILE="${TACHI_SEO_AGENT_ENV_FILE:-${APP_DIR}/.env.seo-distribution-agent}"
REPO_DIR="${TACHI_SEO_AGENT_REPO_DIR:-/opt/tachi-seo-distribution-agent/repo}"
REPO_URL="${TACHI_SEO_AGENT_REPO_URL:-git@borjiomar38:borjiomar38/tachi-back.git}"
DEPLOY_USER="${TACHI_DEPLOY_USER:-borjiomar38}"
ENABLE_SERVICE="false"

for arg in "$@"; do
  case "${arg}" in
    --enable)
      ENABLE_SERVICE="true"
      ;;
    *)
      echo "Unknown argument: ${arg}" >&2
      exit 2
      ;;
  esac
done

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run this script with sudo on the Contabo VPS." >&2
  exit 1
fi

ensure_env_default() {
  local key="$1"
  local value="$2"

  if ! grep -qE "^${key}=" "${ENV_FILE}"; then
    printf '%s=%s\n' "${key}" "${value}" >>"${ENV_FILE}"
  fi
}

install -m 0755 "${APP_DIR}/deploy/contabo/run-codex-seo-distribution-agent.sh" /usr/local/bin/tachi-seo-distribution-agent
install -m 0755 "${APP_DIR}/deploy/contabo/run-seo-distribution-cron.sh" /usr/local/bin/tachi-seo-distribution-cron
install -m 0755 "${APP_DIR}/deploy/contabo/generate-codex-image.sh" /usr/local/bin/tachi-codex-image-generator
install -m 0755 "${APP_DIR}/deploy/contabo/publish-facebook-page-post.py" /usr/local/bin/tachi-facebook-page-publisher
install -m 0755 "${APP_DIR}/deploy/contabo/render-social-image.py" /usr/local/bin/tachi-social-image-renderer
apt-get update
apt-get install -y ca-certificates curl git jq python3 ripgrep

install -m 0755 -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /opt/tachi-seo-distribution-agent
install -m 0755 -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/lib/tachi-seo-distribution-agent
install -m 0755 -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/lib/tachi-seo-distribution-agent/prompts
install -m 0755 -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/lib/tachi-seo-distribution-agent/reports
install -m 0755 -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/lib/tachi-seo-distribution-agent/generated-images
install -m 0755 -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/log/tachi-seo-distribution-agent

if [[ ! -f "${ENV_FILE}" ]]; then
  cat >"${ENV_FILE}" <<EOF
SEO_AGENT_ENABLED=true
SEO_AGENT_RUN_FOREVER=true
SEO_AGENT_INTERVAL_SECONDS=86400
SEO_AGENT_CODEX_CLI_PATH=codex
SEO_AGENT_CODEX_MODEL=gpt-5.5
SEO_AGENT_CODEX_REASONING_EFFORT=medium
SEO_AGENT_CODEX_SEARCH_ENABLED=true
SEO_AGENT_CODEX_SANDBOX=danger-full-access
SEO_AGENT_REPO_DIR=${REPO_DIR}
SEO_AGENT_REPO_URL=${REPO_URL}
SEO_AGENT_BASE_BRANCH=master
SEO_AGENT_GIT_BRANCH_PREFIX=seo/distribution
SEO_AGENT_AUTO_CHECKOUT_BRANCH=true
SEO_AGENT_BLOCK_ON_UNMERGED_AGENT_BRANCHES=false
SEO_AGENT_GIT_AUTHOR_NAME="Nayovi SEO Distribution Agent"
SEO_AGENT_GIT_AUTHOR_EMAIL=seo-agent@nayovi.com
SEO_AGENT_GIT_PUSH_ENABLED=true
SEO_AGENT_AUTO_MERGE_TO_MASTER=false
SEO_AGENT_EXTERNAL_POSTING_MODE=draft
SEO_AGENT_EXTERNAL_ACCOUNT_CREATION_ENABLED=false
SEO_AGENT_ACCOUNT_SETUP_PRIORITY=true
SEO_AGENT_LINKEDIN_ACCESS_TOKEN=
SEO_AGENT_LINKEDIN_ORGANIZATION_ID=
SEO_AGENT_REDDIT_CLIENT_ID=
SEO_AGENT_REDDIT_CLIENT_SECRET=
SEO_AGENT_REDDIT_REFRESH_TOKEN=
SEO_AGENT_GITHUB_TOKEN=
SEO_AGENT_X_ACCESS_TOKEN=
SEO_AGENT_PRODUCTHUNT_TOKEN=
SEO_AGENT_DEVTO_API_KEY=
SEO_AGENT_MEDIUM_INTEGRATION_TOKEN=
SEO_AGENT_YOUTUBE_REFRESH_TOKEN=
SEO_AGENT_SOCIAL_QUEUE_FILE=/var/lib/tachi-seo-distribution-agent/social-post-queue.jsonl
SEO_AGENT_FACEBOOK_POSTING_MODE=draft
SEO_AGENT_FACEBOOK_PAGE_INFO_MODE=draft
SEO_AGENT_FACEBOOK_GRAPH_VERSION=v25.0
SEO_AGENT_FACEBOOK_PAGE_ID=
SEO_AGENT_FACEBOOK_PAGE_ACCESS_TOKEN=
SEO_AGENT_FACEBOOK_APP_ID=
SEO_AGENT_FACEBOOK_APP_SECRET=
SEO_AGENT_FACEBOOK_PAGE_INFO_FILE=/var/lib/tachi-seo-distribution-agent/facebook-page-info.json
SEO_AGENT_FACEBOOK_POST_LIMIT=1
SEO_AGENT_FACEBOOK_DAILY_POST_LIMIT=1
SEO_AGENT_FACEBOOK_AUTONOMOUS_APPROVAL_ENABLED=false
SEO_AGENT_FACEBOOK_PAGE_INFO_AUTONOMOUS_ENABLED=false
SEO_AGENT_FACEBOOK_ALLOWED_LINK_DOMAINS=nayovi.com,tachiyomiat.com,translate-manhwa-ai.com
SEO_AGENT_SOCIAL_IMAGE_DIR=/var/lib/tachi-seo-distribution-agent/generated-images
SEO_AGENT_SOCIAL_IMAGE_REQUIRED=true
SEO_AGENT_SOCIAL_IMAGE_RENDERER_PATH=/usr/local/bin/tachi-social-image-renderer
SEO_AGENT_SOCIAL_IMAGE_RENDER_LIMIT=20
SEO_AGENT_NOTIFY_ENABLED=false
SEO_AGENT_NOTIFY_EMAIL=borjiomar38@gmail.com
SEO_AGENT_NOTIFY_ENV_FILE=${APP_DIR}/.env.growth-mail
SEO_AGENT_NOTIFY_SUBJECT_PREFIX="Nayovi SEO distribution"
SEO_AGENT_DAILY_SUMMARY_ENABLED=true
SEO_AGENT_DAILY_SUMMARY_INTERVAL_SECONDS=86400
SEO_AGENT_NOTIFY_KEYWORDS="OWNER_ACTION_REQUIRED,EMERGENCY_OWNER_REPLY_REQUIRED,MEETING_REQUIRED,CALL_REQUIRED,cannot continue without owner,cant continue without owner,can not continue without owner,owner reply required"
SEO_AGENT_TRIGGER_FILE=/var/lib/tachi-seo-distribution-agent/run-now
SEO_AGENT_VALIDATION_COMMAND="./node_modules/.bin/tsc --noEmit"
SEO_AGENT_PRIMARY_SITE=https://nayovi.com
SEO_AGENT_BRAND_SITE=https://nayovi.com
SEO_AGENT_SEO_SITE=https://translate-manhwa-ai.com
EOF
  chmod 600 "${ENV_FILE}"
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${ENV_FILE}"
fi

ensure_env_default SEO_AGENT_RUN_FOREVER true
ensure_env_default SEO_AGENT_INTERVAL_SECONDS 86400
ensure_env_default SEO_AGENT_CODEX_CLI_PATH codex
ensure_env_default SEO_AGENT_CODEX_MODEL gpt-5.5
ensure_env_default SEO_AGENT_CODEX_REASONING_EFFORT medium
ensure_env_default SEO_AGENT_CODEX_SEARCH_ENABLED true
ensure_env_default SEO_AGENT_CODEX_SANDBOX danger-full-access
ensure_env_default SEO_AGENT_REPO_DIR "${REPO_DIR}"
ensure_env_default SEO_AGENT_REPO_URL "${REPO_URL}"
ensure_env_default SEO_AGENT_BASE_BRANCH master
ensure_env_default SEO_AGENT_GIT_BRANCH_PREFIX seo/distribution
ensure_env_default SEO_AGENT_AUTO_CHECKOUT_BRANCH true
ensure_env_default SEO_AGENT_BLOCK_ON_UNMERGED_AGENT_BRANCHES false
ensure_env_default SEO_AGENT_GIT_AUTHOR_NAME '"Nayovi SEO Distribution Agent"'
ensure_env_default SEO_AGENT_GIT_AUTHOR_EMAIL seo-agent@nayovi.com
ensure_env_default SEO_AGENT_GIT_PUSH_ENABLED true
ensure_env_default SEO_AGENT_AUTO_MERGE_TO_MASTER false
ensure_env_default SEO_AGENT_EXTERNAL_POSTING_MODE draft
ensure_env_default SEO_AGENT_EXTERNAL_ACCOUNT_CREATION_ENABLED false
ensure_env_default SEO_AGENT_ACCOUNT_SETUP_PRIORITY true
ensure_env_default SEO_AGENT_LINKEDIN_ACCESS_TOKEN '""'
ensure_env_default SEO_AGENT_LINKEDIN_ORGANIZATION_ID '""'
ensure_env_default SEO_AGENT_REDDIT_CLIENT_ID '""'
ensure_env_default SEO_AGENT_REDDIT_CLIENT_SECRET '""'
ensure_env_default SEO_AGENT_REDDIT_REFRESH_TOKEN '""'
ensure_env_default SEO_AGENT_GITHUB_TOKEN '""'
ensure_env_default SEO_AGENT_X_ACCESS_TOKEN '""'
ensure_env_default SEO_AGENT_PRODUCTHUNT_TOKEN '""'
ensure_env_default SEO_AGENT_DEVTO_API_KEY '""'
ensure_env_default SEO_AGENT_MEDIUM_INTEGRATION_TOKEN '""'
ensure_env_default SEO_AGENT_YOUTUBE_REFRESH_TOKEN '""'
ensure_env_default SEO_AGENT_SOCIAL_QUEUE_FILE /var/lib/tachi-seo-distribution-agent/social-post-queue.jsonl
ensure_env_default SEO_AGENT_FACEBOOK_POSTING_MODE draft
ensure_env_default SEO_AGENT_FACEBOOK_PAGE_INFO_MODE draft
ensure_env_default SEO_AGENT_FACEBOOK_GRAPH_VERSION v25.0
ensure_env_default SEO_AGENT_FACEBOOK_PAGE_ID '""'
ensure_env_default SEO_AGENT_FACEBOOK_PAGE_ACCESS_TOKEN '""'
ensure_env_default SEO_AGENT_FACEBOOK_APP_ID '""'
ensure_env_default SEO_AGENT_FACEBOOK_APP_SECRET '""'
ensure_env_default SEO_AGENT_FACEBOOK_PAGE_INFO_FILE /var/lib/tachi-seo-distribution-agent/facebook-page-info.json
ensure_env_default SEO_AGENT_FACEBOOK_POST_LIMIT 1
ensure_env_default SEO_AGENT_FACEBOOK_DAILY_POST_LIMIT 1
ensure_env_default SEO_AGENT_FACEBOOK_AUTONOMOUS_APPROVAL_ENABLED false
ensure_env_default SEO_AGENT_FACEBOOK_PAGE_INFO_AUTONOMOUS_ENABLED false
ensure_env_default SEO_AGENT_FACEBOOK_ALLOWED_LINK_DOMAINS nayovi.com,tachiyomiat.com,translate-manhwa-ai.com
ensure_env_default SEO_AGENT_SOCIAL_IMAGE_DIR /var/lib/tachi-seo-distribution-agent/generated-images
ensure_env_default SEO_AGENT_SOCIAL_IMAGE_REQUIRED true
ensure_env_default SEO_AGENT_SOCIAL_IMAGE_RENDERER_PATH /usr/local/bin/tachi-social-image-renderer
ensure_env_default SEO_AGENT_SOCIAL_IMAGE_RENDER_LIMIT 20
ensure_env_default SEO_AGENT_NOTIFY_ENABLED false
ensure_env_default SEO_AGENT_NOTIFY_EMAIL borjiomar38@gmail.com
ensure_env_default SEO_AGENT_NOTIFY_ENV_FILE "${APP_DIR}/.env.growth-mail"
ensure_env_default SEO_AGENT_NOTIFY_SUBJECT_PREFIX '"Nayovi SEO distribution"'
ensure_env_default SEO_AGENT_DAILY_SUMMARY_ENABLED true
ensure_env_default SEO_AGENT_DAILY_SUMMARY_INTERVAL_SECONDS 86400
ensure_env_default SEO_AGENT_NOTIFY_KEYWORDS '"OWNER_ACTION_REQUIRED,EMERGENCY_OWNER_REPLY_REQUIRED,MEETING_REQUIRED,CALL_REQUIRED,cannot continue without owner,cant continue without owner,can not continue without owner,owner reply required"'
ensure_env_default SEO_AGENT_TRIGGER_FILE /var/lib/tachi-seo-distribution-agent/run-now
ensure_env_default SEO_AGENT_VALIDATION_COMMAND '"./node_modules/.bin/tsc --noEmit"'
ensure_env_default SEO_AGENT_PRIMARY_SITE https://nayovi.com
ensure_env_default SEO_AGENT_BRAND_SITE https://nayovi.com
ensure_env_default SEO_AGENT_SEO_SITE https://translate-manhwa-ai.com
chmod 600 "${ENV_FILE}"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${ENV_FILE}"

if [[ ! -d "${REPO_DIR}/.git" ]]; then
  if sudo -u "${DEPLOY_USER}" git ls-remote "${REPO_URL}" HEAD >/dev/null 2>&1; then
    sudo -u "${DEPLOY_USER}" git clone "${REPO_URL}" "${REPO_DIR}"
  else
    echo "GitHub SSH is not ready on the VPS; skipping repo clone for now." >&2
    echo "The service can still be installed, but cycles need ${REPO_DIR}." >&2
  fi
fi

cat >/etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=Nayovi SEO distribution agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${DEPLOY_USER}
Group=${DEPLOY_USER}
WorkingDirectory=${APP_DIR}
Environment=TACHI_APP_DIR=${APP_DIR}
Environment=TACHI_SEO_AGENT_ENV_FILE=${ENV_FILE}
ExecStart=/usr/local/bin/tachi-seo-distribution-agent
Restart=always
RestartSec=60
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

if [[ "${ENABLE_SERVICE}" == "true" ]]; then
  systemctl enable --now "${SERVICE_NAME}.service"
else
  echo "Installed ${SERVICE_NAME}.service. Start with: sudo systemctl enable --now ${SERVICE_NAME}.service"
fi
