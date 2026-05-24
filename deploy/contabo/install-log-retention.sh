#!/usr/bin/env bash
set -euo pipefail

log_root="${TACHI_LOG_ROOT:-/var/log/tachi-back}"
deploy_user="${TACHI_DEPLOY_USER:-borjiomar38}"

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root on the Contabo host." >&2
  exit 1
fi

install -d -m 0755 "${log_root}"
install -d -m 0755 "${log_root}/caddy"
install -d -m 0755 "${log_root}/production"
install -d -m 0755 "${log_root}/staging"

cat >/usr/local/bin/tachi-follow-docker-logs <<'SCRIPT'
#!/usr/bin/env bash
set -euo pipefail

container_name="${1:?container name required}"

while true; do
  if docker inspect "${container_name}" >/dev/null 2>&1; then
    exec docker logs --timestamps --follow --since=1m "${container_name}"
  fi

  sleep 5
done
SCRIPT
chmod 0755 /usr/local/bin/tachi-follow-docker-logs

create_log_service() {
  local env_slug="$1"
  local container_name="tachi-${env_slug}-app"
  local log_file="${log_root}/${env_slug}/app.log"
  local service_name="tachi-${env_slug}-app-log-persist"

  touch "${log_file}"
  chown root:adm "${log_file}"
  chmod 0640 "${log_file}"

  cat >"/etc/systemd/system/${service_name}.service" <<EOF
[Unit]
Description=Persist ${container_name} Docker logs
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=${deploy_user}
Group=docker
ExecStart=/usr/local/bin/tachi-follow-docker-logs ${container_name}
Restart=always
RestartSec=5
StandardOutput=append:${log_file}
StandardError=append:${log_file}

[Install]
WantedBy=multi-user.target
EOF

  systemctl enable --now "${service_name}.service"
}

create_log_service production
create_log_service staging

cat >/etc/logrotate.d/tachi-back <<EOF
${log_root}/production/*.log ${log_root}/staging/*.log ${log_root}/caddy/*.log {
  daily
  rotate 10
  missingok
  notifempty
  compress
  delaycompress
  copytruncate
  dateext
  create 0640 root adm
}
EOF

systemctl daemon-reload
systemctl restart tachi-production-app-log-persist.service
systemctl restart tachi-staging-app-log-persist.service

echo "Installed tachi-back log persistence under ${log_root}."
