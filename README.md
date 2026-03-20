# Tachiyomi Back

`tachi-back` is the backend and backoffice for hosted OCR and translation features used by TachiyomiAT.

The repository is currently in early Phase 15 hardening work: the starter domain is gone, the backend secret contract exists, the first product schema is in place, internal backoffice auth is tightened, the public landing/pricing surface is live, checkout is wired, Stripe fulfillment creates redeemable entitlements, anonymous activation exists, device-bound mobile bearer sessions exist, the first server-owned OCR and translation gateway layer is in place, the first mobile job/upload/status/result backend flow is live, the first support-facing manager views for licenses and devices are in place, the first jobs/provider-ops manager surfaces now exist, the first Android hosted-engine slice now consumes those backend contracts, and the first launch-hardening slice now covers request correlation plus dedicated rate limits for checkout and mobile job routes.

## Current Scope

- internal admin auth and manager shell
- public landing and pricing surface
- Stripe Checkout and initial webhook fulfillment for paid checkout completions
- first anonymous redeem and installation-binding backend path
- first device-bound mobile access and refresh session endpoints
- first hosted provider gateway foundation for OCR and translation
- first mobile job creation, page upload, queueing, polling, and result-manifest endpoints
- first backoffice support lookup plus license/device detail views
- first backoffice jobs list/detail and provider-ops summary views
- first Android hosted engine option, activation/session storage, settings UI, and chapter submission path
- first Phase 15 hardening slice for request IDs and dedicated checkout/mobile-job rate limits
- TanStack Start web app and API route plumbing
- Prisma, Postgres, Better Auth, and S3/MinIO foundations
- roadmap docs for the staged implementation plan

Not implemented yet:

- complete mobile auth hardening and richer protected endpoints
- durable worker runtime, cleanup tooling, and richer retries on top of the first inline job pipeline
- remaining Phase 12/13 backoffice coverage for orders, redeem-code lists, audit views, manual support actions, and operator actions such as retry/cancel/refund review
- remaining Android hosted UX polish such as review mode, richer retry/recovery UX, and broader hosted-only reader surfaces
- broader Phase 15 work such as metrics, restore rehearsals, launch checklists, incident runbooks, and richer abuse controls
- replay tooling and broader Stripe event support beyond the first paid checkout completion path

## Stack Kept From The Starter

- React + TanStack Start
- Prisma + PostgreSQL
- Better Auth for internal admin access
- oRPC + OpenAPI
- S3/MinIO upload infrastructure
- Storybook, Vitest, and Playwright setup

## Environment Contract

Public client variables:

- `VITE_BASE_URL`
- `VITE_ENV_NAME`, `VITE_ENV_EMOJI`, `VITE_ENV_COLOR`
- `VITE_IS_DEMO`
- `VITE_STRIPE_PUBLIC_KEY`
- `VITE_S3_BUCKET_PUBLIC_URL`

Server-only variables:

- auth and session secrets
- Stripe secret and webhook secrets
- provider API keys
- mobile API signing secrets
- S3 credentials and bucket names
- Stripe price IDs for each sellable token pack
- job-runtime and observability configuration

## Local Setup

```bash
cp .env.example .env
pnpm install
pnpm dk:init
pnpm db:init
```

If Docker services are already created but stopped:

```bash
pnpm dk:start
```

If you change Docker port mappings in `.env`, use `docker compose up -d <service>` instead of `pnpm dk:start`, because `docker compose start` will not recreate containers with new port bindings.

Run the app:

```bash
pnpm dev
```

## Database Notes

- `pnpm db:init` is the local convenience bootstrap and still uses `db push` before seeding.
- `pnpm db:migrate:dev` is the real development migration workflow for new schema changes.
- `pnpm db:migrate:deploy` applies checked-in migrations without editing them.
- `pnpm db:seed` assumes the schema already exists.
- The seed now creates internal admin/staff accounts and initial token packs instead of demo business data.

## Development URLs

- app: `http://localhost:3000`
- OpenAPI: `http://localhost:3000/api/openapi/app`
- Maildev UI: `http://localhost:${DOCKER_MAILDEV_UI_PORT}` from your local `.env` (default example: `http://localhost:1080`)
- Storybook: `http://localhost:6006`

## Test Accounts

After `pnpm db:init`, the seed creates:

- admin: `admin@tachi-back.local`
- support: `support@tachi-back.local`

These are internal backoffice accounts only. TachiyomiAT customers will not use Better Auth login for hosted access.

## Roadmap

The implementation roadmap lives in [`docs/phases/README.md`](./docs/phases/README.md).

The high-level order is:

1. starter cleanup and backend foundations
2. payments, activation, and mobile auth/session contracts
3. provider gateway, jobs, and backoffice operations
4. Android integration
5. hardening and staged launch

## Phase 2 Intent

Phase 2 defines the environment and local infrastructure contract for the real product.

That means:

- add server-only env placeholders for Stripe, provider APIs, mobile sessions, and observability
- separate object-storage buckets for uploads, results, and logs
- document the backend-only secret boundary so mobile and browser clients never receive provider secrets
- keep early job execution in the main app process for now with `JOB_RUNTIME_MODE="inline"`

## Phase 3 Intent

Phase 3 introduces the first real product data model for Tachiyomi Back.

That means:

- keep Better Auth `User` for internal backoffice staff only
- add relational models for licenses, devices, redeem codes, token packs, orders, webhook events, ledger entries, and translation jobs
- keep the Android chapter translation payload as JSON/object-storage oriented assets instead of flattening OCR blocks into SQL tables
- start using real Prisma migration history while keeping `db push` available as a local bootstrap shortcut

## Phase 4 Intent

Phase 4 tightens internal admin auth and RBAC for the backoffice.

That means:

- disable public Better Auth signup for this repo
- keep Better Auth scoped to internal staff only, not TachiyomiAT customers
- replace starter `user/admin` assumptions with `support/admin` internal roles
- align UI guards and server permissions around staff, sessions, and future privileged operations
- remove leftover native/mobile Better Auth assumptions from the admin auth surface

## Phase 5 Intent

Phase 5 introduces the public website and pricing surface.

That means:

- replace the `/` redirect with a real public landing page
- add pricing, activation/how-it-works, download, support, and legal placeholder routes
- source public pricing from the real `TokenPack` records instead of hardcoded demo copy
- keep public messaging honest about the current Android state while explaining the hosted direction
- stop short of Stripe Checkout wiring, which stays in Phase 6

## Phase 6 Intent

Phase 6 connects the public pricing site to Stripe Checkout without crediting tokens yet.

That means:

- use server-controlled token-pack to Stripe price mapping
- collect payer email as part of checkout initiation because there is no customer login
- redirect customers to Stripe Checkout from real pricing cards
- add success and cancel pages that stay accurate about webhook crediting and redeem timing
- keep token ledger posting, redeem-code generation, and activation in later phases

## Phase 7 Intent

Phase 7 turns successful Stripe payments into durable internal entitlements.

That means:

- verify Stripe webhooks on a dedicated public route using the raw request body
- persist Stripe events for idempotency, replay, and auditability
- create or update paid `Order` records from Stripe checkout sessions
- issue one `License`, one `RedeemCode`, and one append-only purchase credit ledger entry per successful paid order
- treat email delivery as best-effort after durable fulfillment so email failure never loses paid credit

## Phase 8 Intent

Phase 8 binds purchased entitlements to app installations without introducing end-user accounts.

That means:

- add a public redeem endpoint that binds a redeem code to an installation ID
- keep the installation ID app-generated and separate from forbidden hardware identifiers
- make redeem idempotent for safe retries from the same installation
- add minimal internal support APIs for license inspection, manual grant, and device revoke flows
- keep mobile session issuance and full Android UI for later phases

## Phase 9 Intent

Phase 9 gives the app a dedicated bearer-token auth path that stays separate from Better Auth.

That means:

- define a device-bound mobile session model with refresh rotation and revocation
- expose public mobile auth activation and refresh endpoints
- expose protected session summary and heartbeat endpoints using `Authorization: Bearer`
- keep mobile auth separate from `/api/auth/$` and Better Auth cookie sessions
- preserve the Android requirement that non-portable session state lives in app-state storage, not normal backupable preferences

## Phase 10 Intent

Phase 10 moves provider access behind a normalized backend gateway.

That means:

- keep Google Cloud Vision as the primary hosted OCR path
- add direct hosted translation adapters for Gemini, OpenAI, and Anthropic
- treat Google Cloud Translate and OpenRouter as compatibility-only, not first-class launch providers
- normalize OCR and translation results so they stay compatible with TachiyomiAT page/block rendering
- add prompt versioning, provider selection, retry/error normalization, and usage-tracking helpers before the job pipeline exists

## Phase 11 Intent

Phase 11 introduces the first hosted job pipeline and storage flow for mobile chapter processing.

That means:

- create protected mobile job creation, upload, completion, status, and result endpoints
- preserve page filename identity and the existing TachiyomiAT result contract
- reserve and finalize token usage around hosted processing
- keep the first execution mode inline while the dedicated worker runtime is still pending

## Phase 12 Intent

Phase 12 introduces the first internal support surfaces for commerce, licenses, and device-bound access.

That means:

- redirect the manager entry point toward support lookup instead of the old dashboard-first flow
- add backoffice search by license key, redeem code, installation ID, order ID, Stripe identifiers, and email
- add first license and device detail pages so support can explain entitlements, balance changes, and device bindings
- keep heavy operations dashboards, full order/redeem-code management, and customer-facing Android UI in later phases

## Phase 13 Intent

Phase 13 introduces the first internal operations visibility for hosted jobs and provider behavior.

That means:

- add manager jobs list/detail views with lifecycle, asset, provider usage, and token-ledger context
- add provider ops summaries around recent failures, latency, cost concentration, and stage/provider health
- keep this slice internal and operator-facing, because TachiyomiAT still has no hosted job correlation UI
- leave retry/cancel/refund-review actions, richer alerting, and dedicated worker/runtime separation as the remaining Phase 13 follow-up work

## Phase 14 Intent

Phase 14 integrates TachiyomiAT with the hosted backend flow while preserving local engines during rollout.

That means:

- add a distinct `Tachiyomi Back [TOKENS]` engine mode in Android instead of overloading local provider modes
- store installation identity in app-state preferences and store session tokens in private preferences
- add a dedicated Android client for activation, refresh, session summary, job creation, page upload, polling, and result download
- materialize hosted results back into the existing local chapter translation file format used by the reader
- keep current local OCR/translation engines available during rollout

Current Phase 14 slice already implemented:

- hosted engine option in TachiyomiAT translation settings
- hosted URL plus redeem-code configuration
- device-bound activation, session refresh, and hosted status display
- hosted chapter submission from Android to the backend job pipeline
- hosted result download back into the existing local translation file contract

Still pending in Phase 14:

- hosted review mode
- richer Android balance/device/license screens beyond the settings surface
- better in-app recovery UX for revoked sessions, uploads, and failed jobs
- end-to-end standard flavor validation once the repo's Google Services configuration is fixed for the debug app id

## Phase 15 Intent

Phase 15 hardens the hosted system for staged launch instead of adding new core product flows.

That means:

- add launch-grade request controls, observability, and failure correlation around public and mobile entry points
- add restore/runbook/checklist documentation instead of relying on local-only setup habits
- verify that Android hosted identity/session behavior remains safe across reinstall and backup boundaries
- keep hosted rollout messaging clear so local bring-your-own-key mode is not confused with paid hosted mode

Current Phase 15 slice already implemented:

- dedicated env-backed rate limits for public Stripe checkout initiation
- dedicated env-backed rate limits for authenticated mobile job create, upload/complete, and read routes
- shared request-context helpers that issue or preserve request IDs and attach `X-Request-ID` headers to the hardened API responses
- structured route logging for rate-limit hits and checkout/mobile-job request handling

Still pending in Phase 15:

- metrics and alerting surfaces
- backup/restore rehearsal docs and operational runbooks
- launch checklists and staged rollout criteria
- richer anomaly detection and token-drain safeguards
- user-facing migration/support documentation for hosted launch

## Local Infra Notes

- local Docker covers Postgres, MinIO, and Maildev
- MinIO bucket bootstrap now creates `default`, `uploads`, `results`, and `logs`
- early phases still use the main app process for job execution; no dedicated worker service is scaffolded yet
- Stripe webhooks and provider calls will still rely on remote services or local CLI tunnels when those phases begin

## Secrets Policy

- never place provider secrets or mobile signing secrets in `VITE_` variables
- treat `VITE_STRIPE_PUBLIC_KEY` as public by design
- production secrets should live in deployment secret storage, not committed env files
- the current Better Auth setup is for internal admin users only, not for TachiyomiAT end-user identity
- validation for implementation work should include `pnpm lint`

## Phase 1 Intent

Phase 1 removes the starter `book`/`genre` product domain while keeping the reusable infrastructure that Tachiyomi Back actually needs.

That means:

- remove demo business entities, routes, seeds, and demo pages
- keep auth, env handling, DB access, API plumbing, and manager shell
- replace repo branding and docs so new contributors see the real product direction
