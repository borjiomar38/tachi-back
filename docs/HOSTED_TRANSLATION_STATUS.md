# Hosted Translation Technical Status

> Updated: 2026-04-07
>
> This document is the detailed engineering note for the hosted translation
> rollout, the current worktree changes, and the remaining implementation and
> deployment steps.

---

## Scope

This document is now the technical index and overall status hub.

Detailed execution docs are split one task per file under `docs/tasks/`.

Task files:

- `docs/tasks/01-provider-routing-runtime-config.md`
- `docs/tasks/02-production-hosted-translation-e2e.md`
- `docs/tasks/03-billing-post-purchase-ops.md`
- `docs/tasks/04-local-prisma-runtime-config-migration.md`

---

## Current Product Truth

### Billing and activation truth

- Billing is now Lemon Squeezy, not Stripe
- Plans are monthly token plans
- Backend currently creates and manages the redeem flow
- Android activates with a `redeem code`
- Hosted mobile auth is enabled in production

### Translation truth

- OCR is server-side
- Translation is server-side
- Mobile app should not choose the translation provider anymore
- Provider choice should be controlled by admin in the backoffice
- Current admin runtime config work only supports `gemini` and `openai`
  selection in the manager UI
- Anthropic remains implemented in the gateway, but it is not part of the new
  admin routing UI yet
- Production currently falls back to Gemini OCR because the configured Google
  Cloud Vision project is not actually enabled

### Device access truth

- Device access is now intended to be unlimited
- Token balance is the real commercial limiter
- This is already aligned with the recent device-limit changes

---

## Production Status

### Vercel production envs already in place

- [x] Lemon Squeezy envs
- [x] Mobile API enabled
- [x] Mobile JWT secret configured
- [x] OCR provider env configured
- [x] Gemini key configured
- [x] OpenAI key configured
- [x] Default translation provider env configured

### Production behavior confirmed

- `POST /api/mobile/auth/activate` no longer returns `mobile_api_disabled`
- Invalid redeem requests now fail correctly as `invalid_redeem_code`
- The previous `Invalid provider` job failure was caused by provider config
  resolution, not by auth or redeem
- Production hosted translation completed successfully with `gemini`
- Production hosted translation completed successfully with `openai`
- Runtime provider switching changes the live translation stage as intended
- Token reservation and spend were confirmed against the production DB
- Result manifest retrieval now succeeds after the stored-manifest date hydration
  fix

### Production work still pending

- [x] Deploy runtime provider config backend changes
- [x] Apply runtime config DB migration
- [ ] Validate manager-side provider selection in production through the real UI
- [x] Run end-to-end production mobile-contract translation successfully
- [ ] Validate final Android reader-side UX smoke after the backend fixes
- [ ] Replace placeholder object storage env with real production storage
- [ ] Enable Google Cloud Vision API in the configured Google project or make
      Gemini OCR fallback the explicit primary production policy

---

## Task Breakdown

### Task 1

Admin-controlled provider routing runtime config:

- `docs/tasks/01-provider-routing-runtime-config.md`

### Task 2

Production Android hosted translation validation:

- `docs/tasks/02-production-hosted-translation-e2e.md`

### Task 3

Billing and post-purchase follow-up:

- `docs/tasks/03-billing-post-purchase-ops.md`

### Task 4

Local Prisma drift and runtime-config migration handling:

- `docs/tasks/04-local-prisma-runtime-config-migration.md`

---

## Android Integration State

Relevant mobile-side product decisions already made:

- translation engine is fixed to `Tachiyomi Back [TOKENS]`
- backend URL is fixed to `https://tachiyomiat.com`
- end user should only provide redeem code
- provider choice must not be a mobile setting anymore

Mobile code areas touched in the recent work:

- `../TachiyomiAT/domain/src/main/java/tachiyomi/domain/translation/TranslationPreferences.kt`
- `../TachiyomiAT/app/src/main/java/eu/kanade/translation/hosted/TachiyomiBackClient.kt`
- `../TachiyomiAT/app/src/main/java/eu/kanade/presentation/more/settings/screen/SettingsTranslationScreen.kt`

UX direction already established:

- if redeem/session/token state is invalid, the app should show a clear hosted
  access prompt
- that prompt should let the user enter a redeem code or open Tachi Back pricing

---

## What Is Done vs What Remains

### Backend runtime provider routing

- [x] Define runtime config structure
- [x] Add Prisma model
- [x] Add migration file
- [x] Add runtime config service
- [x] Add provider router endpoints
- [x] Add provider manager UI
- [x] Run typecheck/build and targeted tests after current changes
- [x] Apply migration in production DB
- [x] Deploy backend changes
- [x] Validate runtime-config persistence against production DB
- [ ] Validate save/load from manager UI
- [x] Validate live job resolution from selected provider/model

### Hosted production activation

- [x] Enable mobile API in production
- [x] Configure mobile JWT secret
- [x] Test activation endpoint behavior
- [x] Generate and use production redeem code
- [x] Confirm production chapter translation end to end after runtime-config
      deploy

### Hosted provider infra

- [x] Configure OCR env on Vercel production
- [x] Configure Gemini env on Vercel production
- [x] Configure OpenAI env on Vercel production
- [x] Configure env default provider
- [x] Validate `gemini` translation runtime in production
- [x] Validate `openai` translation runtime in production
- [ ] Add admin operational guidance for switching providers safely
- [ ] Decide whether Anthropic should enter the admin routing UI later
- [ ] Fix manual-grant null-expiry bug for support-created redeem codes

### Billing follow-up

- [x] Lemon Squeezy checkout and webhook basics are live
- [x] Redeem fulfillment path exists
- [ ] Refund flow
- [ ] Existing-license top-up flow
- [ ] Customer-facing balance/subscription support UX refinement

---

## Local Development Reality

### Prisma caveat

Local Prisma migration flow is currently messy because the local dev database
still carries old Stripe-era schema drift.

Observed issue:

- `pnpm db:migrate:dev --name provider_runtime_config` does not apply cleanly on
  the current local DB
- the drift includes old Stripe-era values and tables

What this means:

- the SQL migration file exists and is the correct source of truth for the new
  table
- but local DB sync may require either:
  - a local reset, or
  - `pnpm db:push --accept-data-loss` if local data can be discarded

Do not do that blindly on any shared or production database.

---

## Execution Docs

Use the task files for deployment and validation checklists:

- `docs/tasks/01-provider-routing-runtime-config.md`
- `docs/tasks/02-production-hosted-translation-e2e.md`
- `docs/tasks/03-billing-post-purchase-ops.md`
- `docs/tasks/04-local-prisma-runtime-config-migration.md`

---

## Backoffice Acceptance Checklist

- [ ] Admin can open `Provider Ops`
- [ ] Admin sees OCR readiness status
- [ ] Admin sees Gemini readiness status
- [ ] Admin sees OpenAI readiness status
- [ ] Admin cannot save a disabled provider
- [ ] Admin can save provider/model selection successfully
- [ ] Reload shows persisted selection
- [ ] New jobs reflect chosen provider

---

## Android Acceptance Checklist

- [ ] User cannot change translation engine
- [ ] User cannot change backend URL
- [ ] User can enter redeem code
- [ ] User can activate hosted access
- [ ] Invalid redeem shows clear error
- [ ] Missing session shows clear hosted access prompt
- [ ] Zero-token state shows clear hosted access prompt
- [ ] Buy-tokens CTA opens Tachi Back pricing
- [ ] Successful translation returns chapter output

## Production Caveats Confirmed On 2026-04-07

- Production object storage env is still configured with placeholder localhost
  values, so production currently relies on the inline storage fallback in the
  backend.
- `GOOGLE_CLOUD_VISION_API_KEY` is present, but the actual Cloud Vision API is
  disabled for the configured Google project, so production OCR succeeds via
  Gemini fallback.
- Manual support grants should omit `redeemCodeExpiresAt` for now. Passing
  `null` is currently coerced to `1970-01-01T00:00:00.000Z`, which makes a fresh
  redeem code immediately unavailable.

---

## Remaining Product Work After This Runtime Config Step

These are not blockers for the provider-routing deploy itself, but they remain
real work items.

### High priority after first green translation

- [ ] Add refund handling
- [ ] Add top-up packs or explicit policy for exhausted monthly balance
- [ ] Add better backoffice customer/subscription view
- [ ] Clean remaining stale docs and terminology

### Medium priority

- [ ] Improve Android balance/status visibility
- [ ] Add operator runbooks
- [ ] Add metrics/alerting for provider failures and latency
- [ ] Review cost controls and anomaly handling

---

## Short Recommendation

The correct next technical move is:

1. validate the authenticated manager `Provider Ops` UI against the persisted
   runtime config
2. replace placeholder object storage env with a real production storage target
3. enable Google Cloud Vision in the configured Google project or officially
   keep Gemini OCR as the production fallback policy
4. run one final Android reader-side smoke pass after the backend fixes
5. then move to top-ups, refund flows, and broader backoffice refinements

---

## Task Index

The canonical task list is:

- `docs/tasks/README.md`
