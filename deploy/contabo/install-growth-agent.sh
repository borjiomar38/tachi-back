#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${TACHI_APP_DIR:-/opt/tachi-back}"
SERVICE_NAME="${TACHI_GROWTH_SERVICE_NAME:-tachi-growth-agent}"
MAIL_BRIDGE_SERVICE_NAME="${TACHI_GROWTH_MAIL_BRIDGE_SERVICE_NAME:-tachi-growth-mail-bridge}"
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

ensure_env_default() {
  local key="$1"
  local value="$2"

  if ! grep -qE "^${key}=" "${ENV_FILE}"; then
    printf '%s=%s\n' "${key}" "${value}" >>"${ENV_FILE}"
  fi
}

install -m 0755 -d /usr/local/lib/tachi-back
install -m 0755 "${APP_DIR}/deploy/contabo/run-codex-growth-agent.sh" /usr/local/bin/tachi-growth-agent
install -m 0755 "${APP_DIR}/deploy/contabo/create-lws-mailbox.py" /usr/local/bin/tachi-create-lws-mailbox
install -m 0755 "${APP_DIR}/deploy/contabo/send-growth-owner-notification.py" /usr/local/bin/tachi-growth-owner-notify
install -m 0755 "${APP_DIR}/deploy/contabo/send-growth-outreach.py" /usr/local/bin/tachi-growth-outreach-send
install -m 0755 "${APP_DIR}/deploy/contabo/growth-mail-bridge.py" /usr/local/bin/tachi-growth-mail-bridge
apt-get update
apt-get install -y ca-certificates curl ffmpeg file git jq poppler-utils python3 ripgrep

install -m 0755 -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /opt/tachi-growth-agent
install -m 0755 -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/lib/tachi-growth-agent
install -m 0755 -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/lib/tachi-growth-agent/inbound
install -m 0755 -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/lib/tachi-growth-agent/inbound/queue
install -m 0755 -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/lib/tachi-growth-agent/inbound/attachments
install -m 0755 -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/lib/tachi-growth-agent/inbound/processed
install -m 0755 -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/log/tachi-growth-agent

if [[ ! -f "${ENV_FILE}" ]]; then
  cat >"${ENV_FILE}" <<EOF
GROWTH_AGENT_ENABLED=true
GROWTH_AGENT_RUN_FOREVER=true
GROWTH_AGENT_INTERVAL_SECONDS=60
GROWTH_AGENT_CODEX_CLI_PATH=codex
GROWTH_AGENT_CODEX_MODEL=gpt-5.5
GROWTH_AGENT_CODEX_REASONING_EFFORT=low
GROWTH_AGENT_CODEX_SEARCH_ENABLED=true
GROWTH_AGENT_CODEX_SANDBOX=danger-full-access
GROWTH_AGENT_REPO_DIR=${REPO_DIR}
GROWTH_AGENT_REPO_URL=${REPO_URL}
GROWTH_AGENT_GIT_BRANCH=growth/autonomous
GROWTH_AGENT_GIT_BRANCH_PREFIX=growth/autonomous
GROWTH_AGENT_PER_CYCLE_BRANCHES=true
GROWTH_AGENT_AUTO_CHECKOUT_BRANCH=true
GROWTH_AGENT_GIT_AUTHOR_NAME="Nayovi Growth Agent"
GROWTH_AGENT_GIT_AUTHOR_EMAIL=growth-agent@nayovi.com
GROWTH_AGENT_GIT_PUSH_ENABLED=true
GROWTH_AGENT_AUTO_MERGE_TO_MASTER=true
GROWTH_AGENT_AUTO_MERGE_BASE_BRANCH=master
GROWTH_AGENT_AUTONOMOUS_MODE=true
GROWTH_AGENT_AUTONOMOUS_OUTREACH_ENABLED=true
GROWTH_AGENT_AUTONOMOUS_PROSPECT_APPROVAL_ENABLED=true
GROWTH_AGENT_EMAIL_SEND_MODE=send
GROWTH_AGENT_MAX_OUTREACH_EMAILS_PER_DAY=10
GROWTH_AGENT_NOTIFY_ENABLED=true
GROWTH_AGENT_NOTIFY_EMAIL=borjiomar38@gmail.com
GROWTH_AGENT_NOTIFY_ENV_FILE=${APP_DIR}/.env.production
GROWTH_AGENT_NOTIFY_SUBJECT_PREFIX="Nayovi growth lead"
GROWTH_AGENT_NOTIFY_ON_INBOUND=true
GROWTH_AGENT_NOTIFY_KEYWORDS="OWNER_ACTION_REQUIRED,EMERGENCY_OWNER_REPLY_REQUIRED,MEETING_REQUIRED,CALL_REQUIRED,cannot continue without owner,cant continue without owner,can not continue without owner,owner reply required"
GROWTH_AGENT_DAILY_SUMMARY_ENABLED=true
GROWTH_AGENT_DAILY_SUMMARY_INTERVAL_SECONDS=86400
GROWTH_AGENT_TRIGGER_FILE=/var/lib/tachi-growth-agent/run-now
GROWTH_AGENT_INBOUND_ENABLED=false
GROWTH_AGENT_INBOUND_ALLOWED_SENDERS=borjiomar38@gmail.com
GROWTH_AGENT_INBOUND_REQUIRE_AUTHENTICATED_SENDER=true
GROWTH_AGENT_INBOUND_IMAP_HOST=
GROWTH_AGENT_INBOUND_IMAP_PORT=993
GROWTH_AGENT_INBOUND_IMAP_USER=
GROWTH_AGENT_INBOUND_IMAP_PASSWORD=
GROWTH_AGENT_INBOUND_IMAP_MAILBOX=INBOX
GROWTH_AGENT_INBOUND_IMAP_SSL=true
GROWTH_AGENT_INBOUND_POLL_SECONDS=60
GROWTH_AGENT_INBOUND_MAX_MESSAGES=10
GROWTH_AGENT_INBOUND_MAX_ATTACHMENT_MB=100
GROWTH_AGENT_INBOUND_MAX_VIDEO_FRAMES=8
GROWTH_AGENT_INBOUND_MAX_VIDEO_AUDIO_SECONDS=600
GROWTH_AGENT_INBOUND_MARK_SEEN=true
GROWTH_AGENT_INBOUND_CONFIRMATION_ENABLED=false
GROWTH_AGENT_STATUS_REPLY_ENABLED=true
GROWTH_AGENT_STATUS_REPLY_KEYWORDS="avancement,status,update,tu fais quoi,tu fais quoi la,tu fais quoi là,avance sur quoi,quoi maintenant,progress,what are you doing,what are u doing,what r u doing,what you doing"
GROWTH_AGENT_VALIDATION_COMMAND="./node_modules/.bin/tsc --noEmit"
GROWTH_AGENT_PRIMARY_SITE=https://tachiyomiat.com
GROWTH_AGENT_BRAND_SITE=https://nayovi.com
GROWTH_AGENT_SEO_SITE=https://translate-manhwa-ai.com
GROWTH_AGENT_SEO_DISTRIBUTION_STATE_DIR=/var/lib/tachi-seo-distribution-agent
EOF
  chmod 600 "${ENV_FILE}"
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${ENV_FILE}"
fi

ensure_env_default GROWTH_AGENT_NOTIFY_ON_INBOUND true
ensure_env_default GROWTH_AGENT_INTERVAL_SECONDS 60
ensure_env_default GROWTH_AGENT_GIT_BRANCH_PREFIX growth/autonomous
ensure_env_default GROWTH_AGENT_PER_CYCLE_BRANCHES true
ensure_env_default GROWTH_AGENT_AUTO_MERGE_TO_MASTER true
ensure_env_default GROWTH_AGENT_AUTO_MERGE_BASE_BRANCH master
ensure_env_default GROWTH_AGENT_DAILY_SUMMARY_ENABLED true
ensure_env_default GROWTH_AGENT_DAILY_SUMMARY_INTERVAL_SECONDS 86400
ensure_env_default GROWTH_AGENT_TRIGGER_FILE /var/lib/tachi-growth-agent/run-now
ensure_env_default GROWTH_AGENT_INBOUND_ENABLED false
ensure_env_default GROWTH_AGENT_INBOUND_ALLOWED_SENDERS borjiomar38@gmail.com
ensure_env_default GROWTH_AGENT_INBOUND_REQUIRE_AUTHENTICATED_SENDER true
ensure_env_default GROWTH_AGENT_INBOUND_IMAP_HOST ''
ensure_env_default GROWTH_AGENT_INBOUND_IMAP_PORT 993
ensure_env_default GROWTH_AGENT_INBOUND_IMAP_USER ''
ensure_env_default GROWTH_AGENT_INBOUND_IMAP_PASSWORD ''
ensure_env_default GROWTH_AGENT_INBOUND_IMAP_MAILBOX INBOX
ensure_env_default GROWTH_AGENT_INBOUND_IMAP_SSL true
ensure_env_default GROWTH_AGENT_INBOUND_POLL_SECONDS 60
ensure_env_default GROWTH_AGENT_INBOUND_MAX_MESSAGES 10
ensure_env_default GROWTH_AGENT_INBOUND_MAX_ATTACHMENT_MB 100
ensure_env_default GROWTH_AGENT_INBOUND_MAX_VIDEO_FRAMES 8
ensure_env_default GROWTH_AGENT_INBOUND_MAX_VIDEO_AUDIO_SECONDS 600
ensure_env_default GROWTH_AGENT_INBOUND_MARK_SEEN true
ensure_env_default GROWTH_AGENT_INBOUND_CONFIRMATION_ENABLED false
ensure_env_default GROWTH_AGENT_STATUS_REPLY_ENABLED true
ensure_env_default GROWTH_AGENT_STATUS_REPLY_KEYWORDS '"avancement,status,update,tu fais quoi,tu fais quoi la,tu fais quoi là,avance sur quoi,quoi maintenant,progress,what are you doing,what are u doing,what r u doing,what you doing"'
ensure_env_default GROWTH_AGENT_AUTONOMOUS_MODE true
ensure_env_default GROWTH_AGENT_AUTONOMOUS_OUTREACH_ENABLED true
ensure_env_default GROWTH_AGENT_AUTONOMOUS_PROSPECT_APPROVAL_ENABLED true
ensure_env_default GROWTH_AGENT_VALIDATION_COMMAND '"./node_modules/.bin/tsc --noEmit"'
ensure_env_default GROWTH_AGENT_NOTIFY_KEYWORDS '"OWNER_ACTION_REQUIRED,EMERGENCY_OWNER_REPLY_REQUIRED,MEETING_REQUIRED,CALL_REQUIRED,cannot continue without owner,cant continue without owner,can not continue without owner,owner reply required"'
ensure_env_default GROWTH_AGENT_SEO_DISTRIBUTION_STATE_DIR /var/lib/tachi-seo-distribution-agent
chmod 600 "${ENV_FILE}"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${ENV_FILE}"

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

cat >/etc/systemd/system/${MAIL_BRIDGE_SERVICE_NAME}.service <<EOF
[Unit]
Description=Nayovi growth agent inbound mail bridge
After=network-online.target ${SERVICE_NAME}.service
Wants=network-online.target

[Service]
Type=simple
User=${DEPLOY_USER}
Group=${DEPLOY_USER}
WorkingDirectory=${APP_DIR}
Environment=TACHI_APP_DIR=${APP_DIR}
Environment=TACHI_GROWTH_ENV_FILE=${ENV_FILE}
ExecStart=/usr/local/bin/tachi-growth-mail-bridge --loop
Restart=always
RestartSec=60
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload

if [[ "${ENABLE_SERVICE}" == "true" ]]; then
  systemctl enable --now "${SERVICE_NAME}.service"
  systemctl enable --now "${MAIL_BRIDGE_SERVICE_NAME}.service"
else
  echo "Installed ${SERVICE_NAME}.service. Start with: sudo systemctl enable --now ${SERVICE_NAME}.service"
  echo "Installed ${MAIL_BRIDGE_SERVICE_NAME}.service. Start with: sudo systemctl enable --now ${MAIL_BRIDGE_SERVICE_NAME}.service"
fi
