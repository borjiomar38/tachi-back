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

Vercel currently runs `/api/cron/generate-blog-article` daily. On Contabo,
prefer the Codex CLI cron so the host asks Codex to research a current topic,
then lets the app validate the JSON draft with Zod, reject duplicate titles from
the database, generate the hero image, and publish.

```bash
sudo install -m 0755 deploy/contabo/run-codex-blog-cron.sh /usr/local/bin/tachi-back-codex-blog-cron
sudo crontab -e
```

Cron entry:

```cron
0 1 * * * TACHI_ENV_FILE=/opt/tachi-back/.env.production /usr/local/bin/tachi-back-codex-blog-cron >> /var/log/tachi-back-codex-blog-cron.log 2>&1
```

The Codex cron defaults to `gpt-5.5` with `model_reasoning_effort="xhigh"` and
enables Codex web search. Override only if needed:

```env
BLOG_CODEX_MODEL=gpt-5.5
BLOG_CODEX_REASONING_EFFORT=xhigh
BLOG_CODEX_SEARCH_ENABLED=true
BLOG_CODEX_CLI_PATH=codex
```

The old curl-only script remains available as `/usr/local/bin/tachi-back-blog-cron`
if you explicitly want the app to call its configured LLM API provider instead
of Codex CLI.

## Growth Agent

The Contabo host can also run a supervised Codex growth agent for SEO,
backlinks, partnership research, and outreach drafts. It is intentionally
separate from the production app containers.

Install from the deployed source tree:

```bash
cd /opt/tachi-back
sudo TACHI_DEPLOY_USER=borjiomar38 deploy/contabo/install-growth-agent.sh --enable
```

The installer creates `/opt/tachi-back/.env.growth-agent` from the defaults in
`deploy/contabo/.env.growth-agent.example`, installs
`/usr/local/bin/tachi-growth-agent` plus the optional inbound mail bridge, and
registers `tachi-growth-agent.service` and `tachi-growth-mail-bridge.service`
with `Restart=always`.

Important defaults:

```env
GROWTH_AGENT_CODEX_MODEL=gpt-5.5
GROWTH_AGENT_CODEX_REASONING_EFFORT=low
GROWTH_AGENT_CODEX_SANDBOX=danger-full-access
GROWTH_AGENT_AUTONOMOUS_MODE=true
GROWTH_AGENT_AUTONOMOUS_OUTREACH_ENABLED=true
GROWTH_AGENT_EMAIL_SEND_MODE=send
GROWTH_AGENT_GIT_BRANCH=growth/autonomous
GROWTH_AGENT_GIT_BRANCH_PREFIX=growth/autonomous
GROWTH_AGENT_PER_CYCLE_BRANCHES=true
GROWTH_AGENT_AUTO_CHECKOUT_BRANCH=true
GROWTH_AGENT_GIT_PUSH_ENABLED=true
GROWTH_AGENT_AUTO_MERGE_TO_MASTER=true
GROWTH_AGENT_AUTO_MERGE_BASE_BRANCH=master
GROWTH_AGENT_INBOUND_ENABLED=false
GROWTH_AGENT_INBOUND_ALLOWED_SENDERS=borjiomar38@gmail.com
GROWTH_AGENT_INBOUND_REQUIRE_AUTHENTICATED_SENDER=true
GROWTH_AGENT_NOTIFY_ON_INBOUND=false
GROWTH_AGENT_INBOUND_CONFIRMATION_ENABLED=false
GROWTH_AGENT_DAILY_SUMMARY_ENABLED=true
GROWTH_AGENT_DAILY_SUMMARY_INTERVAL_SECONDS=86400
```

`GROWTH_AGENT_EMAIL_SEND_MODE=send` and
`GROWTH_AGENT_AUTONOMOUS_OUTREACH_ENABLED=true` let the agent advance outreach
without owner approval. It must still use public business contact paths,
individualized messages, opt-out language, and the daily cap. It must not buy
backlinks, use scraped private lists, send deceptive claims, or evade rate
limits. With `GROWTH_AGENT_PER_CYCLE_BRANCHES=true`, each cycle starts from the
latest `master` on a branch named like `growth/autonomous-20260523T190000Z`.
With `GROWTH_AGENT_AUTO_MERGE_TO_MASTER=true`, the runner validates successful
cycle work, pushes the cycle branch, merges it into `master`, and pushes
`master`. Pushing `master` deploys production.

Owner email notifications are intentionally low-volume:

- Immediate email is reserved for blocker/emergency reports where the agent
  cannot continue without an owner reply. The agent marks these reports with
  `OWNER_ACTION_REQUIRED`, `MEETING_REQUIRED`, or `CALL_REQUIRED`.
- Normal progress sends at most one daily summary. If an emergency email was
  sent, the daily summary is skipped until the next summary interval.
- Reply-ingestion confirmations are disabled by default to avoid mail loops and
  noisy acknowledgements.
- Inbound replies are queued only when the sender address is allow-listed and
  the mail server reports passing SPF, DKIM, or DMARC authentication for that
  sender. Other messages are marked seen and never become agent instructions.

Operational commands:

```bash
sudo systemctl status tachi-growth-agent --no-pager
sudo journalctl -u tachi-growth-agent -f
sudo systemctl restart tachi-growth-agent
sudo systemctl status tachi-growth-mail-bridge --no-pager
sudo journalctl -u tachi-growth-mail-bridge -f
```

The inbound mail bridge lets the owner reply to agent emails and attach files
for the next growth cycle. Replies are accepted only from
`GROWTH_AGENT_INBOUND_ALLOWED_SENDERS`; attachments are stored under
`/var/lib/tachi-growth-agent/inbound/attachments`, and queued instructions are
stored under `/var/lib/tachi-growth-agent/inbound/queue`. Video attachments are
kept as files and, when `ffmpeg` is available, the bridge also extracts
`ffprobe` metadata, key frames, and a short audio file for the next Codex cycle
to inspect.

Enable inbound replies only after adding IMAP credentials to
`/opt/tachi-back/.env.growth-agent`:

```env
GROWTH_AGENT_INBOUND_ENABLED=true
GROWTH_AGENT_INBOUND_ALLOWED_SENDERS=borjiomar38@gmail.com
GROWTH_AGENT_INBOUND_IMAP_HOST=imap.example.com
GROWTH_AGENT_INBOUND_IMAP_PORT=993
GROWTH_AGENT_INBOUND_IMAP_USER=growth-agent@nayovi.com
GROWTH_AGENT_INBOUND_IMAP_PASSWORD=change-me
GROWTH_AGENT_INBOUND_IMAP_MAILBOX=INBOX
GROWTH_AGENT_INBOUND_IMAP_SSL=true
```

After changing the env file:

```bash
sudo systemctl restart tachi-growth-mail-bridge
```

The LWS mailbox helper uses `/opt/tachi-back/.env.lws`, which is expected to be
IP-restricted to the Contabo server:

```bash
sudo -u borjiomar38 tachi-create-lws-mailbox partnerships@nayovi.com
```

Generated mailbox credentials are stored under `/opt/tachi-back/.secrets/` with
mode `600` and must not be committed.

## Updates

```bash
cd /opt/tachi-back
git pull --ff-only
docker compose --env-file /opt/tachi-back/.env.production -f deploy/contabo/docker-compose.yml --profile tools run --rm migrate
docker compose --env-file /opt/tachi-back/.env.production -f deploy/contabo/docker-compose.yml up -d --build app caddy
```

Pushing `master` still deploys the existing Vercel production path until that automation is removed or changed.
