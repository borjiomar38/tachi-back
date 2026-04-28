# TachiyomiAT Hosted Translation Progress

> Updated: 2026-04-07
>
> This document is the product and engineering snapshot for the hosted
> translation stack shared by `tachi-back` and `TachiyomiAT`.

---

## Goal

`tachi-back` is the hosted backend and backoffice for `TachiyomiAT`.

The intended user flow is:

1. User buys a monthly token plan via Lemon Squeezy
2. Backend receives the webhook and creates or updates product-side records
3. Backend generates a redeem code and emails it to the customer
4. User enters the redeem code in the Android app
5. App activates a device-bound hosted session
6. App sends chapters to the backend for OCR + translation
7. Backend spends tokens per job and returns translated results

Important terminology:

- We currently use a `redeem code` for Android activation
- We do not currently expose a Lemon Squeezy-native `license key` flow in the app
- Device access is now unlimited per license because usage is constrained by token
  balance instead

---

## Current State

### What is already working

- [x] Lemon Squeezy checkout route is implemented
- [x] Lemon Squeezy webhook route is implemented
- [x] Lemon Squeezy production env vars are configured on Vercel
- [x] Monthly plans are configured in Lemon Squeezy
- [x] Backend creates licenses, orders, token credits, and redeem codes
- [x] Purchase email flow is wired through SMTP
- [x] Mobile activation API is enabled in production
- [x] Mobile session and hosted auth flow are working in production
- [x] Android app is locked to `Tachiyomi Back [TOKENS]`
- [x] Android app default backend URL is fixed to
      `https://tachiyomiat.com`
- [x] Hosted provider env vars are present in Vercel production for OCR and
      translation
- [x] Device limit is effectively unlimited for hosted licenses
- [x] Production mobile-contract translation completes successfully with
      `gemini`
- [x] Production mobile-contract translation completes successfully with
      `openai`

### What is working in code but still needs finishing steps

- [x] Admin-side provider routing runtime config is implemented in the backend
- [x] Manager UI has been started so admin can choose translation provider and
      model
- [x] Provider resolution in job creation has been updated to use runtime config
- [x] Translation execution has been updated to respect admin-selected model
- [x] Database migration for runtime provider config has been applied in production
- [x] Updated backend changes have been deployed to production
- [x] Runtime config persistence has been validated against the production DB
- [ ] Authenticated manager UI still needs a real save/reload validation in
      production
- [ ] Final Android reader-side smoke test is still recommended after the
      backend fixes

### What is not implemented yet

- [ ] One-shot top-up packs attached to an existing license
- [ ] Refund lifecycle handling for Lemon Squeezy
- [ ] Dedicated subscriber/customer list in backoffice
- [ ] Full launch runbooks and monitoring/alerting
- [ ] Final cleanup of old/stale documentation and terminology
- [ ] Real production object storage config instead of the inline fallback
- [ ] Final Google Vision production enablement or explicit Gemini OCR policy
- [ ] Fix the manual-grant null-expiry bug for support-created redeem codes

---

## What We Have Done

### Payments and licensing

- Migrated the active payment flow from Stripe to Lemon Squeezy
- Added Lemon Squeezy variant-based checkout
- Added Lemon Squeezy webhook processing for orders and subscriptions
- Added backend-generated redeem code fulfillment after purchase
- Wired SMTP delivery for purchase/OTP emails

### Hosted mobile access

- Added mobile activation endpoint
- Added hosted session issuance and refresh
- Added device-bound hosted auth
- Enabled mobile API in production
- Created and tested production redeem codes

### Hosted translation pipeline

- Added OCR provider gateway support for Google Cloud Vision
- Added translation provider gateway support for Gemini/OpenAI/Anthropic
- Added mobile job creation, upload, processing, and result retrieval
- Added token reservation/spend logic for hosted jobs
- Removed user-side provider switching from the Android app
- Moved the product direction toward server-side provider choice
- Added production inline storage fallback so hosted jobs can still complete
  while object storage env is not yet real
- Added Gemini OCR fallback for production when Google Vision is configured but
  the actual Google API is disabled
- Validated live production jobs on both `gemini` and `openai`

### Android product constraints

- Locked translation engine to hosted mode
- Locked backend URL to production backend
- Kept redeem code as the only user-editable hosted credential
- Added hosted access prompt UX when redeem/session/token state is invalid

### Backoffice operations

- Added support lookup across license, redeem code, installation ID, order ID,
  subscription ID, and email
- Added job monitoring screens
- Added provider ops summary
- Started admin-controlled provider/model routing from the manager

---

## Immediate Focus

The current work is now split into individual task files.

### Active task files

- `docs/tasks/01-provider-routing-runtime-config.md`
- `docs/tasks/02-production-hosted-translation-e2e.md`
- `docs/tasks/03-billing-post-purchase-ops.md`
- `docs/tasks/04-local-prisma-runtime-config-migration.md`

### Status summary

- [x] Provider routing runtime-config implementation is deployed and validated
- [ ] Provider routing still needs authenticated manager UI validation
- [x] Production hosted translation runtime is green through the live mobile API
      contract
- [ ] Android reader-side smoke still needs one final manual confirmation pass
- [ ] Billing follow-up still needs refund and top-up design/implementation
- [ ] Local Prisma drift still needs a safe cleanup path for dev

---

## Production Reality

As of this update, production has the critical hosted envs configured:

- [x] `LEMONSQUEEZY_ENABLED`
- [x] `LEMONSQUEEZY_API_KEY`
- [x] `LEMONSQUEEZY_STORE_ID`
- [x] `LEMONSQUEEZY_WEBHOOK_SECRET`
- [x] `LEMONSQUEEZY_VARIANT_TOKENS_STARTER`
- [x] `LEMONSQUEEZY_VARIANT_TOKENS_PRO`
- [x] `LEMONSQUEEZY_VARIANT_TOKENS_POWER`
- [x] `MOBILE_API_ENABLED`
- [x] `MOBILE_API_JWT_SECRET`
- [x] `GOOGLE_CLOUD_VISION_API_KEY`
- [x] `GEMINI_API_KEY`
- [x] `OPENAI_API_KEY`
- [x] `OCR_PROVIDER_PRIMARY=google_cloud_vision`
- [x] `TRANSLATION_PROVIDER_PRIMARY=gemini`

This means the remaining blocker is no longer raw secret wiring. The remaining
blocker is no longer backend provider execution. The remaining gaps are the
authenticated manager UI validation path and the remaining production infra
cleanup around storage and OCR.

---

## Risks and Gaps

### Product gaps

- Customers still activate with redeem codes, not a cleaner subscription-aware
  account surface
- There is no one-shot top-up flow attached to the same hosted license yet
- There is no refund-support lifecycle completed yet

### Engineering gaps

- Local Prisma dev migration is currently blocked by old schema drift from the
  previous Stripe-era local database
- Runtime provider config execution is validated in production, but the manager
  UI save/reload path still needs authenticated confirmation
- Production still depends on fallback behavior because object storage env is
  placeholder and Google Vision is not truly enabled
- Current docs in old branches/phases are not fully aligned with the live flow

### UX gaps

- Android still needs the final post-fix reader-side smoke pass
- Balance visibility and subscription status UX can still be improved
- Support tooling can still be improved with a dedicated subscriptions view

---

## Task Index

Detailed task docs live here:

- `docs/tasks/README.md`
- `docs/tasks/01-provider-routing-runtime-config.md`
- `docs/tasks/02-production-hosted-translation-e2e.md`
- `docs/tasks/03-billing-post-purchase-ops.md`
- `docs/tasks/04-local-prisma-runtime-config-migration.md`

---

## Next Decision Points

- Decide if hosted translation should stay `monthly plans only` for launch or if
  top-up packs must be built before launch
- Decide whether `openai` stays as fallback only or becomes admin-selectable
  primary in production
- Decide whether Anthropic remains supported internally only or should also be
  exposed in the manager later

---

## Companion Doc

For the technical implementation map, open:

- `docs/HOSTED_TRANSLATION_STATUS.md`
