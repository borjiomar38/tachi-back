#!/usr/bin/env bash
set -euo pipefail

cd /opt/tachi-back
set -a
# shellcheck disable=SC1091
source /opt/tachi-back/.env.production
set +a

database_ip="$(docker inspect tachi-production-postgres --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')"
export DATABASE_URL="${DATABASE_URL/@postgres:/@$database_ip:}"

exec /usr/bin/flock -n /tmp/tachi-contact-triage.lock \
  /usr/bin/pnpm contact:triage -- --limit=50 --concurrency=3
