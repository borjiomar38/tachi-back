#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${TACHI_APP_DIR:-/opt/tachi-back}"
SERVICE_NAME="${TACHI_TRANSLATION_QA_SERVICE_NAME:-tachi-translation-qa-agent}"
ENV_FILE="${TACHI_TRANSLATION_QA_ENV_FILE:-${APP_DIR}/.env.translation-qa-agent}"
APP_ENV_FILE="${TRANSLATION_QA_AGENT_APP_ENV_FILE:-${APP_DIR}/.env.production}"
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
  local file="$1"
  local key="$2"
  local value="$3"

  touch "${file}"
  if ! grep -qE "^${key}=" "${file}"; then
    printf '%s=%s\n' "${key}" "${value}" >>"${file}"
  fi
}

install -m 0755 "${APP_DIR}/deploy/contabo/run-codex-translation-qa-agent.sh" /usr/local/bin/tachi-translation-qa-agent
apt-get update
apt-get install -y ca-certificates file git jq python3 ripgrep

install -m 0755 -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/lib/tachi-translation-qa-agent
install -m 0755 -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/lib/tachi-translation-qa-agent/work
install -m 0755 -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/lib/tachi-translation-qa-agent/reports
install -m 0755 -d -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" /var/log/tachi-translation-qa-agent

if [[ ! -f "${ENV_FILE}" ]]; then
  cat >"${ENV_FILE}" <<EOF
TRANSLATION_QA_AGENT_ENABLED=true
TRANSLATION_QA_AGENT_RUN_FOREVER=true
TRANSLATION_QA_AGENT_INTERVAL_SECONDS=300
TRANSLATION_QA_AGENT_CODEX_CLI_PATH=codex
TRANSLATION_QA_AGENT_CODEX_MODEL=gpt-5.5
TRANSLATION_QA_AGENT_CODEX_REASONING_EFFORT=low
TRANSLATION_QA_AGENT_CODEX_SANDBOX=danger-full-access
TRANSLATION_QA_AGENT_APP_ENV_FILE=${APP_ENV_FILE}
TRANSLATION_QA_AGENT_REWRITE_DATABASE_URL=true
TRANSLATION_QA_AGENT_POSTGRES_CONTAINER=tachi-production-postgres
TRANSLATION_QA_AGENT_STATE_DIR=/var/lib/tachi-translation-qa-agent
TRANSLATION_QA_AGENT_LOG_DIR=/var/log/tachi-translation-qa-agent
TRANSLATION_QA_AGENT_TRIGGER_FILE=/var/lib/tachi-translation-qa-agent/run-now
EOF
fi

ensure_env_default "${ENV_FILE}" TRANSLATION_QA_AGENT_ENABLED true
ensure_env_default "${ENV_FILE}" TRANSLATION_QA_AGENT_RUN_FOREVER true
ensure_env_default "${ENV_FILE}" TRANSLATION_QA_AGENT_INTERVAL_SECONDS 300
ensure_env_default "${ENV_FILE}" TRANSLATION_QA_AGENT_CODEX_CLI_PATH codex
ensure_env_default "${ENV_FILE}" TRANSLATION_QA_AGENT_CODEX_MODEL gpt-5.5
ensure_env_default "${ENV_FILE}" TRANSLATION_QA_AGENT_CODEX_REASONING_EFFORT low
ensure_env_default "${ENV_FILE}" TRANSLATION_QA_AGENT_CODEX_SANDBOX danger-full-access
ensure_env_default "${ENV_FILE}" TRANSLATION_QA_AGENT_APP_ENV_FILE "${APP_ENV_FILE}"
ensure_env_default "${ENV_FILE}" TRANSLATION_QA_AGENT_REWRITE_DATABASE_URL true
ensure_env_default "${ENV_FILE}" TRANSLATION_QA_AGENT_POSTGRES_CONTAINER tachi-production-postgres
ensure_env_default "${ENV_FILE}" TRANSLATION_QA_AGENT_STATE_DIR /var/lib/tachi-translation-qa-agent
ensure_env_default "${ENV_FILE}" TRANSLATION_QA_AGENT_LOG_DIR /var/log/tachi-translation-qa-agent
ensure_env_default "${ENV_FILE}" TRANSLATION_QA_AGENT_TRIGGER_FILE /var/lib/tachi-translation-qa-agent/run-now
chmod 600 "${ENV_FILE}"
chown "${DEPLOY_USER}:${DEPLOY_USER}" "${ENV_FILE}"

if [[ "${TRANSLATION_QA_AGENT_INSTALL_NODE_MODULES:-true}" == "true" ]]; then
  sudo -u "${DEPLOY_USER}" bash -lc "cd '${APP_DIR}' && pnpm install --frozen-lockfile"
fi

if [[ -f "${APP_ENV_FILE}" ]]; then
  ensure_env_default "${APP_ENV_FILE}" TRANSLATION_QA_AGENT_ENABLED true
  ensure_env_default "${APP_ENV_FILE}" TRANSLATION_QA_UPLOAD_RETENTION_HOURS 168
  chmod 600 "${APP_ENV_FILE}"
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_ENV_FILE}"
else
  echo "Warning: ${APP_ENV_FILE} not found; app runtime env was not updated." >&2
fi

cat >/etc/systemd/system/${SERVICE_NAME}.service <<EOF
[Unit]
Description=Nayovi Codex translation QA agent
After=network-online.target docker.service
Wants=network-online.target

[Service]
Type=simple
User=${DEPLOY_USER}
Group=${DEPLOY_USER}
WorkingDirectory=${APP_DIR}
Environment=TACHI_APP_DIR=${APP_DIR}
Environment=TACHI_TRANSLATION_QA_ENV_FILE=${ENV_FILE}
ExecStart=/usr/local/bin/tachi-translation-qa-agent
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
