#!/usr/bin/env bash
set -euo pipefail

# Deliberately separate from production's source tree and shared Caddy deployment.
app_dir="${TACHI_APP_DIR:-/opt/tachi-back-staging}"
[[ "${app_dir}" == /opt/tachi-back-staging ]] || { echo 'Refusing non-staging source directory' >&2; exit 1; }
cd "${app_dir}"
[[ "$(pwd -P)" == /opt/tachi-back-staging ]] || exit 1
exec 9>/tmp/tachi-back-deploy.lock
flock 9

compose=(docker compose --env-file "${app_dir}/.env.staging" -p tachi-staging -f deploy/contabo/docker-compose.app.yml)
"${compose[@]}" --profile tools config --format json | jq -e '
  .services.app.container_name == "tachi-staging-app" and
  .services.postgres.container_name == "tachi-staging-postgres" and
  .volumes["postgres-data"].name == "tachi-staging-postgres-data" and
  .services.postgres.environment.POSTGRES_DB == "tachi_back_staging" and
  (.services.app.environment.DATABASE_URL | test("@postgres:5432/tachi_back_staging(\\?|$)")) and
  .services.app.environment.DATABASE_URL == .services.migrate.environment.DATABASE_URL and
  .services.app.environment.VITE_BASE_URL == "https://staging.62.171.171.212.sslip.io" and
  .services.app.environment.VITE_ENV_NAME == "STAGING" and
  .services.app.environment.VITE_ANDROID_APP_ID == "app.tachiback.tachiyomi.at.tokenstest" and
  .services.app.environment.LEMONSQUEEZY_TEST_MODE == "true" and
  all(.services.app.volumes[]; .source | startswith("/opt/tachi-back-staging/"))
' >/dev/null || { echo 'Staging isolation checks failed' >&2; exit 1; }

backup_dir="/opt/tachi-staging-backups/$(date -u +%Y%m%dT%H%M%SZ)"
install -m 700 -d "${backup_dir}"
docker inspect tachi-staging-app --format '{{.Image}}' > "${backup_dir}/previous-image.txt"
docker exec tachi-staging-postgres sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "${backup_dir}/database.dump"
chmod 600 "${backup_dir}/database.dump"
[[ -s "${backup_dir}/database.dump" ]] || exit 1
echo "Staging backup saved in ${backup_dir}"

"${compose[@]}" build app migrate
"${compose[@]}" up -d postgres
"${compose[@]}" --profile tools run --rm migrate
docker exec -i tachi-staging-postgres sh -c 'exec psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < deploy/contabo/seed-token-packs-staging.sql
"${compose[@]}" up -d --no-build app

# The existing proxy already routes this container. Never restart or rewrite Caddy here.
for attempt in {1..30}; do
  if curl -fsS --max-time 10 https://staging.62.171.171.212.sslip.io/api/mobile/token-packs |
    jq -e '[.. | objects | select(.key? == "starter-tokens" or .key? == "pro-tokens" or .key? == "power-tokens")] | length == 3' >/dev/null; then
    echo 'Staging token catalog is healthy'
    "${compose[@]}" ps
    exit 0
  fi
  sleep 5
done
echo 'Staging token catalog health check failed' >&2
exit 1
