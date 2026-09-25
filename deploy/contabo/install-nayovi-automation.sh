#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${TACHI_APP_DIR:-/opt/tachi-back}"
DEPLOY_USER="${TACHI_DEPLOY_USER:-borjiomar38}"
ENV_FILE="${NAYOVI_AUTOMATION_ENV_FILE:-/etc/nayovi-automation.env}"
ENABLE_SERVICES=false
REFRESH_ONLY=false

for argument in "$@"; do
  case "${argument}" in
    --enable) ENABLE_SERVICES=true ;;
    --refresh) REFRESH_ONLY=true ;;
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

configure_proxy_firewall() {
  local listen_host listen_port proxy_bridge proxy_network proxy_network_id proxy_subnet
  listen_host="$(sed -n 's/^NAYOVI_AUTOMATION_LISTEN_HOST=//p' "${ENV_FILE}" | tail -1)"
  listen_port="$(sed -n 's/^NAYOVI_AUTOMATION_LISTEN_PORT=//p' "${ENV_FILE}" | tail -1)"
  proxy_network="${TACHI_PROXY_NETWORK:-tachi-proxy}"

  if [[ "${listen_host}" != 0.0.0.0 ]]; then
    return
  fi
  [[ "${listen_port}" =~ ^[0-9]{1,5}$ ]] || {
    echo "Invalid NAYOVI_AUTOMATION_LISTEN_PORT: ${listen_port}" >&2
    exit 1
  }
  command -v docker >/dev/null || {
    echo 'Docker is required to resolve the Caddy proxy network.' >&2
    exit 1
  }
  command -v ufw >/dev/null || {
    echo 'UFW is required before binding the automation API to 0.0.0.0.' >&2
    exit 1
  }
  ufw status | grep -q '^Status: active' || {
    echo 'UFW must be active before binding the automation API to 0.0.0.0.' >&2
    exit 1
  }
  docker network inspect "${proxy_network}" >/dev/null 2>&1 || {
    echo "Docker network is missing: ${proxy_network}" >&2
    exit 1
  }

  proxy_subnet="$(
    docker network inspect "${proxy_network}" \
      --format '{{(index .IPAM.Config 0).Subnet}}'
  )"
  proxy_bridge="$(
    docker network inspect "${proxy_network}" \
      --format '{{index .Options "com.docker.network.bridge.name"}}'
  )"
  if [[ -z "${proxy_bridge}" || "${proxy_bridge}" == '<no value>' ]]; then
    proxy_network_id="$(
      docker network inspect "${proxy_network}" --format '{{.Id}}'
    )"
    proxy_bridge="br-${proxy_network_id:0:12}"
  fi

  ufw allow in on "${proxy_bridge}" from "${proxy_subnet}" to any \
    port "${listen_port}" proto tcp \
    comment 'Nayovi automation from tachi-caddy'
}

install -m 0755 "${APP_DIR}/deploy/contabo/nayovi_automation.py" /usr/local/bin/nayovi-automation
if [[ "${REFRESH_ONLY}" != true ]]; then
  apt-get update
  apt-get install -y ca-certificates curl ffmpeg file git jq poppler-utils python3 ripgrep
fi

install -d -m 0755 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /opt/nayovi-automation
install -d -m 0755 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /opt/nayovi-automation/proposals
install -d -m 0755 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/lib/nayovi-automation
install -d -m 0755 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/log/nayovi-automation

if [[ ! -f "${ENV_FILE}" ]]; then
  install -m 0640 -o root -g "${DEPLOY_USER}" /dev/null "${ENV_FILE}"
fi

ensure_env_default NAYOVI_AUTOMATION_WEBHOOK_SECRET ''
ensure_env_default NAYOVI_AUTOMATION_LISTEN_HOST 0.0.0.0
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
# Upgrade the original loopback-only default, which Dockerized Caddy cannot reach.
if grep -qx 'NAYOVI_AUTOMATION_LISTEN_HOST=127.0.0.1' "${ENV_FILE}"; then
  sed -i \
    's/^NAYOVI_AUTOMATION_LISTEN_HOST=127\.0\.0\.1$/NAYOVI_AUTOMATION_LISTEN_HOST=0.0.0.0/' \
    "${ENV_FILE}"
fi
chown root:"${DEPLOY_USER}" "${ENV_FILE}"
chmod 0640 "${ENV_FILE}"
configure_proxy_firewall

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
  systemctl enable \
    nayovi-automation-api.service \
    nayovi-automation-mail.service \
    nayovi-analytics-agent.timer
  systemctl restart \
    nayovi-automation-api.service \
    nayovi-automation-mail.service
  systemctl start nayovi-analytics-agent.timer
else
  echo 'Installed. Enable after configuring the webhook secret:'
  echo '  sudo systemctl enable --now nayovi-automation-api.service nayovi-automation-mail.service nayovi-analytics-agent.timer'
fi
