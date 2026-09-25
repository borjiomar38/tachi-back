#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${TACHI_APP_DIR:-/opt/tachi-back}"
DEPLOY_USER="${TACHI_DEPLOY_USER:-borjiomar38}"
ENV_FILE="${NAYOVI_AUTOMATION_ENV_FILE:-/etc/nayovi-automation.env}"
ENABLE_SERVICES=false

for argument in "$@"; do
  case "${argument}" in
    --enable) ENABLE_SERVICES=true ;;
    *) echo "Unknown argument: ${argument}" >&2; exit 2 ;;
  esac
done

if [[ "${EUID}" -ne 0 ]]; then
  echo 'Run this installer with sudo.' >&2
  exit 1
fi

ensure_env_default() {
  local key="$1"
  local value="$2"
  if ! grep -qE "^${key}=" "${ENV_FILE}"; then
    printf '%s=%s\n' "${key}" "${value}" >>"${ENV_FILE}"
  fi
}

install -m 0755 "${APP_DIR}/deploy/contabo/nayovi_automation.py" /usr/local/bin/nayovi-automation
apt-get update
apt-get install -y ca-certificates curl ffmpeg file git jq poppler-utils python3 ripgrep

install -d -m 0755 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /opt/nayovi-automation
install -d -m 0755 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /opt/nayovi-automation/proposals
install -d -m 0755 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/lib/nayovi-automation
install -d -m 0755 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/log/nayovi-automation

if [[ ! -f "${ENV_FILE}" ]]; then
  install -m 0640 -o root -g "${DEPLOY_USER}" /dev/null "${ENV_FILE}"
fi

ensure_env_default NAYOVI_AUTOMATION_WEBHOOK_SECRET ''
ensure_env_default NAYOVI_AUTOMATION_LISTEN_HOST 127.0.0.1
ensure_env_default NAYOVI_AUTOMATION_LISTEN_PORT 8790
ensure_env_default NAYOVI_AUTOMATION_STATE_DIR /var/lib/nayovi-automation
ensure_env_default NAYOVI_AUTOMATION_LOG_DIR /var/log/nayovi-automation
ensure_env_default NAYOVI_AUTOMATION_WORKSPACE_ROOT /opt/nayovi-automation
ensure_env_default NAYOVI_CODEX_BIN "$(command -v codex)"
ensure_env_default NAYOVI_CODEX_MODEL gpt-5.6-sol
ensure_env_default NAYOVI_CODEX_REASONING_EFFORT xhigh
ensure_env_default NAYOVI_CODEX_TIMEOUT_SECONDS 3600
ensure_env_default NAYOVI_MOBILE_REPO_URL https://github.com/borjiomar38/tachi-mobile.git
ensure_env_default NAYOVI_SITE_REPO_URL https://github.com/borjiomar38/tachi-back.git
ensure_env_default NAYOVI_SITE_BUILD_ENV_FILE /opt/tachi-back/.env.production
ensure_env_default NAYOVI_GA_PROPERTY_ID 551184068
ensure_env_default NAYOVI_OWNER_EMAIL borjiomar38@gmail.com
ensure_env_default NAYOVI_MAIL_ENV_FILE /opt/tachi-back/.env.production
ensure_env_default NAYOVI_GROWTH_ENV_FILE /opt/tachi-back/.env.growth-agent
ensure_env_default NAYOVI_IMAP_POLL_SECONDS 30
ensure_env_default NAYOVI_PREVIEW_BASE_URL https://staging.62.171.171.212.sslip.io
ensure_env_default NAYOVI_STAGING_ENV_FILE /opt/tachi-back-staging/.env.staging
ensure_env_default NAYOVI_STAGING_SOURCE_DIR /opt/tachi-back-staging
ensure_env_default NAYOVI_PREVIEW_WAIT_SECONDS 900
chown root:"${DEPLOY_USER}" "${ENV_FILE}"
chmod 0640 "${ENV_FILE}"

cat >/etc/systemd/system/nayovi-automation-api.service <<EOF
[Unit]
Description=Nayovi signed mobile-update automation API
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${DEPLOY_USER}
Group=${DEPLOY_USER}
Environment=HOME=/home/${DEPLOY_USER}
EnvironmentFile=${ENV_FILE}
WorkingDirectory=/opt/nayovi-automation
ExecStart=/usr/local/bin/nayovi-automation serve
Restart=always
RestartSec=10
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

cat >/etc/systemd/system/nayovi-automation-mail.service <<EOF
[Unit]
Description=Nayovi Analytics proposal email-review bridge
After=network-online.target nayovi-automation-api.service
Wants=network-online.target

[Service]
Type=simple
User=${DEPLOY_USER}
Group=${DEPLOY_USER}
Environment=HOME=/home/${DEPLOY_USER}
EnvironmentFile=${ENV_FILE}
WorkingDirectory=/opt/nayovi-automation
ExecStart=/usr/local/bin/nayovi-automation mail-loop
Restart=always
RestartSec=15
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
EOF

cat >/etc/systemd/system/nayovi-analytics-agent.service <<EOF
[Unit]
Description=Nayovi daily GA4 improvement proposal agent
After=network-online.target nayovi-automation-api.service
Wants=network-online.target

[Service]
Type=oneshot
User=${DEPLOY_USER}
Group=${DEPLOY_USER}
Environment=HOME=/home/${DEPLOY_USER}
EnvironmentFile=${ENV_FILE}
WorkingDirectory=/opt/nayovi-automation
ExecStart=/usr/local/bin/nayovi-automation analytics
TimeoutStartSec=3h
EOF

cat >/etc/systemd/system/nayovi-analytics-agent.timer <<'EOF'
[Unit]
Description=Run the Nayovi GA4 improvement agent daily

[Timer]
OnCalendar=*-*-* 06:00:00 UTC
Persistent=true
RandomizedDelaySec=15m
Unit=nayovi-analytics-agent.service

[Install]
WantedBy=timers.target
EOF

systemctl daemon-reload

# These older broad agents have unsafe auto-merge defaults and must not compete
# with the focused proposal/review flow installed above.
systemctl disable --now tachi-growth-agent.service 2>/dev/null || true
systemctl disable --now tachi-growth-mail-bridge.service 2>/dev/null || true

if [[ "${ENABLE_SERVICES}" == true ]]; then
  secret_value="$(sed -n 's/^NAYOVI_AUTOMATION_WEBHOOK_SECRET=//p' "${ENV_FILE}" | tail -1)"
  if [[ "${#secret_value}" -lt 32 ]]; then
    echo "Set a 32+ character NAYOVI_AUTOMATION_WEBHOOK_SECRET in ${ENV_FILE} before --enable." >&2
    exit 1
  fi
  systemctl enable --now nayovi-automation-api.service
  systemctl enable --now nayovi-automation-mail.service
  systemctl enable --now nayovi-analytics-agent.timer
else
  echo 'Installed. Enable after configuring the webhook secret:'
  echo '  sudo systemctl enable --now nayovi-automation-api.service nayovi-automation-mail.service nayovi-analytics-agent.timer'
fi
