# Contabo Migration Runbook

This runbook prepares a Contabo VPS deployment for `tachi-back` without using Vercel production deploy commands.

## Recommended Target

- Contabo Cloud VPS 20 or larger for the first production cutover.
- Ubuntu 24.04 LTS.
- SSH key authentication enabled during provisioning.
- Contabo Firewall open for `22/tcp`, `80/tcp`, and `443/tcp`; restrict `22/tcp` to trusted IPs after initial setup.
- Keep S3-compatible object storage external for the first migration if production is already on R2/S3. Moving uploads/results/logs to self-hosted MinIO should be a separate migration with backup/restore rehearsed first.

Contabo Linux servers are administered through SSH. Prefer SSH keys over password login.

If an account or server password has been shared in a screenshot or chat, rotate it after SSH key access is confirmed.

## Order-Time Choices

1. Select a Cloud VPS plan.
2. Select Ubuntu 24.04 LTS.
3. Add an SSH public key if the order flow offers it. Cloud-init is also acceptable for provisioning keys.
4. Do not complete payment/order changes until the production migration window is intended.

## Server Bootstrap

After Contabo sends the server IP and login data:

```bash
ssh root@SERVER_IP
curl -fsSLo /tmp/bootstrap-server.sh https://raw.githubusercontent.com/borjiomar38/tachi-back/master/deploy/contabo/bootstrap-server.sh
bash /tmp/bootstrap-server.sh
```

If this branch is not on `master` yet, copy `deploy/contabo/bootstrap-server.sh` to the server manually instead of using the raw GitHub URL.

Then reconnect as the deploy user:

```bash
ssh deploy@SERVER_IP
cd /opt/tachi-back
git clone git@borjiomar38:borjiomar38/tachi-back.git .
```

## Environment File

Create `/opt/tachi-back/.env.production` from `deploy/contabo/.env.production.example`.

Required production checks:

- `VITE_BASE_URL` matches the final HTTPS domain.
- `APP_DOMAIN` matches the domain Caddy should serve.
- `AUTH_ALLOWED_HOSTS` and `AUTH_TRUSTED_ORIGINS` match the final domain.
- `DATABASE_URL` points at `postgres:5432` if using the bundled Postgres service.
- `CRON_SECRET`, `AUTH_SECRET`, `MOBILE_API_JWT_SECRET`, and `POSTGRES_PASSWORD` are generated random values.
- Lemon Squeezy webhook URL is updated to `https://DOMAIN/api/payments/webhook`.
- DNS `A` record points the domain to the Contabo IPv4 address before starting Caddy for real TLS.

Do not commit real `.env.production` files.

## Database Migration

For a live migration from the current production database:

```bash
pg_dump "$CURRENT_PRODUCTION_DATABASE_URL" --format=custom --no-owner --no-acl --file=/tmp/tachi-back.dump
scp /tmp/tachi-back.dump deploy@SERVER_IP:/opt/tachi-back/deploy/contabo/postgres-backups/
```

On the server:

```bash
docker compose --env-file /opt/tachi-back/.env.production -f deploy/contabo/docker-compose.yml up -d postgres
docker compose --env-file /opt/tachi-back/.env.production -f deploy/contabo/docker-compose.yml exec -T postgres \
  pg_restore --clean --if-exists --no-owner --no-acl -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  /backups/tachi-back.dump
```

For a fresh database only:

```bash
docker compose --env-file /opt/tachi-back/.env.production -f deploy/contabo/docker-compose.yml up -d postgres
docker compose --env-file /opt/tachi-back/.env.production -f deploy/contabo/docker-compose.yml --profile tools run --rm migrate
```

Do not run `pnpm db:seed` against production unless demo data is explicitly intended.

## Start App

```bash
docker compose --env-file /opt/tachi-back/.env.production -f deploy/contabo/docker-compose.yml up -d --build app caddy
docker compose --env-file /opt/tachi-back/.env.production -f deploy/contabo/docker-compose.yml ps
```

Verify:

```bash
curl -i -s -X POST https://DOMAIN/api/mobile/subscription/cancel
```

Expected: HTTP `401` with `{"error":{"code":"invalid_session"},"ok":false}`.

## Cron Replacement

Vercel currently runs `/api/cron/generate-blog-article` daily. On Contabo, install a host cron after the app is live:

```bash
sudo install -m 0755 deploy/contabo/run-blog-cron.sh /usr/local/bin/tachi-back-blog-cron
sudo crontab -e
```

Cron entry:

```cron
0 1 * * * TACHI_ENV_FILE=/opt/tachi-back/.env.production /usr/local/bin/tachi-back-blog-cron >> /var/log/tachi-back-blog-cron.log 2>&1
```

## Updates

```bash
cd /opt/tachi-back
git pull --ff-only
docker compose --env-file /opt/tachi-back/.env.production -f deploy/contabo/docker-compose.yml --profile tools run --rm migrate
docker compose --env-file /opt/tachi-back/.env.production -f deploy/contabo/docker-compose.yml up -d --build app caddy
```

Pushing `master` still deploys the existing Vercel production path until that automation is removed or changed.
