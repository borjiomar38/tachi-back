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
GROWTH_AGENT_AUTONOMOUS_PROSPECT_APPROVAL_ENABLED=true
GROWTH_AGENT_EMAIL_SEND_MODE=send
GROWTH_AGENT_GIT_BRANCH=growth/autonomous
GROWTH_AGENT_GIT_BRANCH_PREFIX=growth/autonomous
GROWTH_AGENT_PER_CYCLE_BRANCHES=true
GROWTH_AGENT_AUTO_CHECKOUT_BRANCH=true
GROWTH_AGENT_GIT_PUSH_ENABLED=true
GROWTH_AGENT_AUTO_MERGE_TO_MASTER=true
GROWTH_AGENT_AUTO_MERGE_BASE_BRANCH=master
GROWTH_AGENT_VALIDATION_COMMAND="./node_modules/.bin/tsc --noEmit"
GROWTH_AGENT_INBOUND_ENABLED=false
GROWTH_AGENT_INBOUND_ALLOWED_SENDERS=borjiomar38@gmail.com
GROWTH_AGENT_INBOUND_REQUIRE_AUTHENTICATED_SENDER=true
GROWTH_AGENT_INBOUND_POLL_SECONDS=60
GROWTH_AGENT_NOTIFY_ON_INBOUND=false
GROWTH_AGENT_INBOUND_CONFIRMATION_ENABLED=false
GROWTH_AGENT_STATUS_REPLY_ENABLED=true
GROWTH_AGENT_DAILY_SUMMARY_ENABLED=true
GROWTH_AGENT_DAILY_SUMMARY_INTERVAL_SECONDS=86400
```

`GROWTH_AGENT_EMAIL_SEND_MODE=send` and
`GROWTH_AGENT_AUTONOMOUS_OUTREACH_ENABLED=true` let the agent advance outreach
without owner approval. `GROWTH_AGENT_AUTONOMOUS_PROSPECT_APPROVAL_ENABLED=true`
lets the agent move prospects from draft to approved/contacted using human
business judgment from the app context. It must still use public business
contact paths, individualized messages, opt-out language, and the daily cap.
It must not buy backlinks, use scraped private lists, send deceptive claims, or evade rate
limits. With `GROWTH_AGENT_PER_CYCLE_BRANCHES=true`, each cycle starts from the
latest `master` on a branch named like `growth/autonomous-20260523T190000Z`.
With `GROWTH_AGENT_AUTO_MERGE_TO_MASTER=true`, the runner validates successful
cycle work, pushes the cycle branch, merges it into `master`, and pushes
`master`. Pushing `master` deploys production. The server validation command
uses direct `tsc` by default to avoid interactive `pnpm approve-builds` prompts
blocking autonomous publication on the VPS.

External outreach email is sent through `/usr/local/bin/tachi-growth-outreach-send`,
which enforces the daily cap, requires opt-out language, and logs every delivery
under `/var/lib/tachi-growth-agent/outreach`.

Owner email notifications are intentionally low-volume:

- Immediate email is reserved for blocker/emergency reports where the agent
  cannot continue without an owner reply. The agent marks these reports with
  `OWNER_ACTION_REQUIRED`, `MEETING_REQUIRED`, or `CALL_REQUIRED`.
- Normal progress sends at most one daily summary. If an emergency email was
  sent, the daily summary is skipped until the next summary interval.
- Reply-ingestion confirmations are disabled by default to avoid mail loops and
  noisy acknowledgements.
- Owner status replies are enabled by default. A short authenticated owner mail
  such as `avancement`, `status`, `update`, `tu fais quoi`, or
  `what are u doing` receives an immediate business-readable update from the
  mail bridge and is not queued as growth-agent work. Dates are formatted in
  Tunisia time.
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

Short status-only owner emails are handled before attachment extraction and
before the growth-agent trigger. The bridge replies immediately with a simple
business update: what was done, why it matters, recent contacts, what is in
progress, next actions, and whether the owner is needed. Dates are shown in
Tunisia time. Send `status technique`, `debug`, or `logs` to get the detailed
technical version with services, repo branch/status, commits, queue count,
recent outreach deliveries, and the latest report excerpt. Action emails and
emails with attachments still go into the normal queue for the next growth
cycle. Any owner email that asks for a concrete action, for example
`update the website demo`, `contact APKPure`, or `send the demo to investors`,
is queued as growth-agent work and triggers the agent instead of being treated
as a status reply.

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
GROWTH_AGENT_STATUS_REPLY_ENABLED=true
GROWTH_AGENT_STATUS_REPLY_KEYWORDS="avancement,status,update,tu fais quoi,tu fais quoi la,tu fais quoi là,avance sur quoi,quoi maintenant,progress,what are you doing,what are u doing,what r u doing,what you doing"
```

After changing the env file:

```bash
sudo systemctl restart tachi-growth-mail-bridge
```

## SEO Distribution Agent

The SEO distribution agent is a separate parallel Codex agent focused on
trust-building surfaces that make outreach less isolated. It is not limited to
LinkedIn, Reddit, and GitHub: every cycle should discover and prioritize
high-authority surfaces such as Android press, app directories, SaaS/AI tool
directories, manga/webtoon/creator platforms, newsletters, podcasts, YouTube
channels, Product Hunt/launch communities, Indie Hackers/build-in-public spaces,
Dev.to/Medium technical blogs, GitHub awesome lists, resource pages, forums,
Q&A sites, partner pages, accelerators, investor directories, affiliate/resource
pages, and localization communities. It runs without a GUI on Contabo and uses
Codex web search plus Git. It does not create third-party accounts or bypass
platform auth systems.

Install from the deployed source tree:

```bash
cd /opt/tachi-back
sudo TACHI_DEPLOY_USER=borjiomar38 deploy/contabo/install-seo-distribution-agent.sh --enable
```

Important defaults:

```env
SEO_AGENT_RUN_FOREVER=true
SEO_AGENT_INTERVAL_SECONDS=60
SEO_AGENT_CODEX_MODEL=gpt-5.5
SEO_AGENT_CODEX_REASONING_EFFORT=low
SEO_AGENT_CODEX_SANDBOX=danger-full-access
SEO_AGENT_GIT_PUSH_ENABLED=true
SEO_AGENT_AUTO_MERGE_TO_MASTER=true
SEO_AGENT_EXTERNAL_POSTING_MODE=draft
SEO_AGENT_EXTERNAL_ACCOUNT_CREATION_ENABLED=false
```

The agent writes live status and reports under
`/var/lib/tachi-seo-distribution-agent`. The production app mounts that
directory read-only so the manager page at `/manager/seo-distribution` can show
agent status, current branch, recent reports, configured account capabilities,
authority opportunity pipeline, content backlog, platform drafts, and linkable
assets.

The growth agent reads the SEO distribution state from
`/var/lib/tachi-seo-distribution-agent` before each cycle. This lets the email
outreach agent reuse social/GitHub/Reddit/LinkedIn trust assets instead of
working in isolation. The SEO distribution agent also reads the growth docs
inside the repo so its platform drafts support the active backlink and
partnership pipeline.

The agent can auto-merge owned-site and repo changes after validation, so useful
SEO/linkable assets become visible without waiting for manual approval. External
social posting is draft-only by default. To post on LinkedIn, Reddit,
GitHub, Dev.to, Medium, X/Twitter, YouTube, Product Hunt, or another platform,
configure an official account/API workflow for that
platform first and only enable actions that respect the platform and community
rules. The agent must not create fake accounts, solve CAPTCHAs, mass-comment,
buy backlinks, or post link drops.

Configured account capability is reported through a non-secret
`accounts.json`. Tokens stay in `/opt/tachi-back/.env.seo-distribution-agent`
or another secret store and must never be committed:

```env
SEO_AGENT_LINKEDIN_ACCESS_TOKEN=
SEO_AGENT_LINKEDIN_ORGANIZATION_ID=
SEO_AGENT_REDDIT_CLIENT_ID=
SEO_AGENT_REDDIT_CLIENT_SECRET=
SEO_AGENT_REDDIT_REFRESH_TOKEN=
SEO_AGENT_GITHUB_TOKEN=
SEO_AGENT_X_ACCESS_TOKEN=
SEO_AGENT_PRODUCTHUNT_TOKEN=
SEO_AGENT_DEVTO_API_KEY=
SEO_AGENT_MEDIUM_INTEGRATION_TOKEN=
SEO_AGENT_YOUTUBE_REFRESH_TOKEN=
```

Operational commands:

```bash
sudo systemctl status tachi-seo-distribution-agent --no-pager
sudo journalctl -u tachi-seo-distribution-agent -f
sudo systemctl restart tachi-seo-distribution-agent
sudo touch /var/lib/tachi-seo-distribution-agent/run-now
```

## Translation QA Agent

The Contabo host can run a second, separate Codex agent for translation quality
analysis. This agent does not work on Git branches and does not modify source
code. It scans completed translation jobs, downloads the retained original page
images plus the OCR/debug artifacts, asks Codex CLI for a structured QA report,
stores that report as a `translation-qa-report.json` job debug artifact, and
only then deletes the original page uploads from object storage.

Install from the deployed source tree:

```bash
cd /opt/tachi-back
sudo TACHI_DEPLOY_USER=borjiomar38 deploy/contabo/install-translation-qa-agent.sh --enable
```

Important defaults:

```env
TRANSLATION_QA_AGENT_ENABLED=true
TRANSLATION_QA_UPLOAD_RETENTION_HOURS=168
TRANSLATION_QA_AGENT_RUN_FOREVER=true
TRANSLATION_QA_AGENT_INTERVAL_SECONDS=300
TRANSLATION_QA_AGENT_CODEX_MODEL=gpt-5.5
TRANSLATION_QA_AGENT_CODEX_REASONING_EFFORT=low
TRANSLATION_QA_AGENT_CODEX_SANDBOX=danger-full-access
TRANSLATION_QA_AGENT_REWRITE_DATABASE_URL=true
TRANSLATION_QA_AGENT_POSTGRES_CONTAINER=tachi-production-postgres
```

When `TRANSLATION_QA_AGENT_ENABLED=true`, completed job uploads are marked
`retained_for_translation_qa` instead of being deleted by the normal job
finalizer. The QA service later marks them `deleted` after its report has been
stored. Reports and run files live under
`/var/lib/tachi-translation-qa-agent`; service logs are available through
systemd. Because the production Postgres hostname is normally a Docker-network
alias, the host-side QA service rewrites `postgres:5432` to the current
`tachi-production-postgres` container IP at startup.

Operational commands:

```bash
sudo systemctl status tachi-translation-qa-agent --no-pager
sudo journalctl -u tachi-translation-qa-agent -f
sudo systemctl restart tachi-translation-qa-agent
sudo touch /var/lib/tachi-translation-qa-agent/run-now
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
