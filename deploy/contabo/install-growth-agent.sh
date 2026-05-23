#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${TACHI_APP_DIR:-/opt/tachi-back}"
SERVICE_NAME="${TACHI_GROWTH_SERVICE_NAME:-tachi-growth-agent}"
ENV_FILE="${TACHI_GROWTH_ENV_FILE:-${APP_DIR}/.env.growth-agent}"
REPO_DIR="${TACHI_GROWTH_REPO_DIR:-/opt/tachi-growth-agent/repo}"
REPO_URL="${TACHI_GROWTH_REPO_URL:-git@borjiomar38:borjiomar38/tachi-back.git}"
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

install -m 0755 -d /usr/local/lib/tachi-back
install -m 0755 "${APP_DIR}/deploy/contabo/run-codex-growth-agent.sh" /usr/local/bin/tachi-growth-agent
install -m 0755 "${APP_DIR}/deploy/contabo/create-lws-mailbox.py" /usr/local/bin/tachi-create-lws-mailbox
install -m 0755 "${APP_DIR}/deploy/contabo/send-growth-owner-notification.py" /usr/local/bin/tachi-growth-owner-notify
apt-get update
apt-get install -y ca-certificates curl git jq python3 ripgrep

install -m 0755 -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /opt/tachi-growth-agent
install -m 0755 -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/lib/tachi-growth-agent
install -m 0755 -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/log/tachi-growth-agent

if [[ ! -f "${ENV_FILE}" ]]; then
  cat >"${ENV_FILE}" <<EOF
GROWTH_AGENT_ENABLED=true
GROWTH_AGENT_RUN_FOREVER=true
GROWTH_AGENT_INTERVAL_SECONDS=21600
GROWTH_AGENT_CODEX_CLI_PATH=codex
GROWTH_AGENT_CODEX_MODEL=gpt-5.5
GROWTH_AGENT_CODEX_REASONING_EFFORT=low
GROWTH_AGENT_CODEX_SEARCH_ENABLED=true
GROWTH_AGENT_CODEX_SANDBOX=danger-full-access
GROWTH_AGENT_REPO_DIR=${REPO_DIR}
GROWTH_AGENT_REPO_URL=${REPO_URL}
GROWTH_AGENT_GIT_BRANCH=growth/autonomous
GROWTH_AGENT_AUTO_CHECKOUT_BRANCH=true
GROWTH_AGENT_GIT_AUTHOR_NAME="Nayovi Growth Agent"
GROWTH_AGENT_GIT_AUTHOR_EMAIL=growth-agent@nayovi.com
GROWTH_AGENT_GIT_PUSH_ENABLED=false
GROWTH_AGENT_EMAIL_SEND_MODE=draft
GROWTH_AGENT_MAX_OUTREACH_EMAILS_PER_DAY=10
GROWTH_AGENT_NOTIFY_ENABLED=true
GROWTH_AGENT_NOTIFY_EMAIL=borjiomar38@gmail.com
GROWTH_AGENT_NOTIFY_ENV_FILE=${APP_DIR}/.env.production
GROWTH_AGENT_NOTIFY_SUBJECT_PREFIX="Nayovi growth lead"
GROWTH_AGENT_VALIDATION_COMMAND="pnpm lint:ts"
GROWTH_AGENT_PRIMARY_SITE=https://tachiyomiat.com
GROWTH_AGENT_BRAND_SITE=https://nayovi.com
GROWTH_AGENT_SEO_SITE=https://translate-manhwa-ai.com
EOF
  chmod 600 "${ENV_FILE}"
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${ENV_FILE}"
fi

if [[ ! -d "${REPO_DIR}/.git" ]]; then
  if sudo -u "${DEPLOY_USER}" git ls-remote "${REPO_URL}" HEAD >/dev/null 2>&1; then
    sudo -u "${DEPLOY_USER}" git clone "${REPO_URL}" "${REPO_DIR}"
  else
    echo "GitHub SSH is not ready on the VPS; skipping repo clone for now." >&2
    echo "The service can still be installed, but Codex cycles need ${REPO_DIR}." >&2
  fi
fi

cat >/etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=Nayovi Codex growth agent
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=${DEPLOY_USER}
Group=${DEPLOY_USER}
WorkingDirectory=${APP_DIR}
Environment=TACHI_APP_DIR=${APP_DIR}
Environment=TACHI_GROWTH_ENV_FILE=${ENV_FILE}
ExecStart=/usr/local/bin/tachi-growth-agent
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
