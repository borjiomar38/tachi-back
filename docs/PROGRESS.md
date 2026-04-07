# TachiyomiAT Backend — Progress & Roadmap

> This document tracks what has been built, what is being worked on right now, and what comes next.
> Updated: 2026-04-06

---

## The Big Picture

**What is this?**
`tachi-back` is the backend and backoffice for **TachiyomiAT** — a fork of the Mihon/Tachiyomi Android manga reader that adds AI-powered translation (Gemini, MLKit, Google Cloud Translation, OpenRouter).

**Why does a manga reader need a backend?**
Local translation requires the user to bring their own API keys (BYOK). To make this accessible to non-technical users, we are building a **hosted translation service** — users pay for token credits, the backend handles OCR and AI translation on their behalf, and the results are delivered back to the Android app seamlessly.

**Why Lemon Squeezy?**
The original design used Stripe. We refactored to **Lemon Squeezy** because it acts as a Merchant of Record — it handles VAT, taxes, and compliance automatically, which removes significant legal and operational overhead for an indie product.

---

## System Overview

```
User buys tokens (Lemon Squeezy)
        ↓
LS generates license key + emails user
        ↓
User enters license key in TachiyomiAT Android app (once)
        ↓
App activates with backend → gets device-bound bearer token
        ↓
App submits manga chapters to backend for translation
        ↓
Backend uses OCR (Google Cloud Vision) + AI (Gemini/OpenAI/Anthropic)
        ↓
Backend returns translated results → app renders them in the reader
        ↓
Tokens deducted per job
```

---

## What We Did (Completed)

### Infrastructure & Foundation
- Cleaned up starter boilerplate, removed demo `book`/`genre` domain
- Set up Prisma + PostgreSQL schema with real product models:
  - `License`, `Device`, `RedeemCode`, `Order`, `TokenPack`
  - `TokenLedger`, `WebhookEvent`, `TranslationJob`
- Set up S3/MinIO with separate buckets: `uploads`, `results`, `logs`
- Local Docker stack: Postgres + MinIO + Maildev

### Auth (Internal Backoffice Only)
- Better Auth scoped to internal staff only (admin + support roles)
- Public signup disabled — customers never use Better Auth
- Backoffice protected routes and RBAC guards

### Public Website
- Landing page, pricing page sourced from real `TokenPack` DB records
- Download, support, and legal placeholder routes

### Payments — Stripe (OLD, now replaced)
- Stripe Checkout integration
- Webhook handler for `checkout.session.completed`
- Created `License` + `RedeemCode` on successful payment
- Token ledger credit entry per order

### Payments — Lemon Squeezy (CURRENT)
- Refactored payment layer from Stripe to Lemon Squeezy
- Products created in LS dashboard:
  - TachiyomiAT Tokens — Starter 500 ($9.99/month)
  - TachiyomiAT Tokens — Pro 2500 ($39.99/month)
  - TachiyomiAT Tokens — Power 7500 ($99.99/month)
- License key generation enabled in LS (LS issues key per purchase, emails customer)

### Mobile Auth (Android Sessions)
- Device-bound mobile session model — separate from Better Auth
- `/api/mobile/activate` — redeem license key, bind to installation ID
- `/api/mobile/refresh` — rotate bearer token
- `/api/mobile/session` — protected session summary
- Installation ID is app-generated, stored in private (non-backup) preferences

### Hosted Provider Gateway
- OCR adapter: Google Cloud Vision
- Translation adapters: Gemini, OpenAI, Anthropic
- Prompt versioning, provider selection, retry/error normalization
- Usage tracking helpers

### Job Pipeline
- `/api/mobile/jobs` — create job, upload pages, poll status, fetch results
- Inline execution mode (no dedicated worker yet)
- Results stored in S3, returned in TachiyomiAT's existing translation file format
- Token reservation and finalization per job

### Backoffice Operations
- Support lookup by license key, redeem code, installation ID, order ID, email
- License detail view (balance, devices, ledger history)
- Device detail + revoke
- Jobs list/detail with lifecycle, asset, and provider usage context
- Provider ops summary (failures, latency, cost concentration)
- Contact form inbox + detail workflow

### Android Integration (Phase 14)
- New `Tachiyomi Back [TOKENS]` engine mode in TachiyomiAT settings
- Hosted URL + license key configuration UI
- Activation flow: app sends license key → backend validates → issues bearer token
- Chapter submission: app uploads pages → backend processes → app downloads results
- Results materialized into existing local translation file format

### Hardening (Phase 15 — partial)
- Request ID correlation (`X-Request-ID` on all hardened routes)
- Dedicated rate limits for checkout initiation routes
- Dedicated rate limits for mobile job create/upload/read routes
- Structured logging for rate-limit hits

---

## What We Are Doing Now

### Lemon Squeezy Webhook Integration
**What:** Wire the LS webhook handler so the backend reacts to purchase events.

**Why:** Products exist in LS but the backend doesn't yet know when a purchase happens. Without this, no `License` or `RedeemCode` is created after a customer pays.

**Where:** `app/api/lemonsqueezy/webhook` (new route)

**Steps:**
1. Add LS env vars to `.env`:
   ```
   LEMONSQUEEZY_API_KEY=
   LEMONSQUEEZY_WEBHOOK_SECRET=
   LEMONSQUEEZY_STORE_ID=
   LEMONSQUEEZY_VARIANT_STARTER=
   LEMONSQUEEZY_VARIANT_PRO=
   LEMONSQUEEZY_VARIANT_POWER=
   ```
2. Register webhook in LS dashboard pointing to `/api/lemonsqueezy/webhook`
3. Implement webhook handler:
   - Verify LS signature (HMAC-SHA256)
   - Handle `order_created` event
   - Map LS variant ID → token pack
   - Create `Order` + `License` + `RedeemCode` + ledger credit entry
   - Best-effort email delivery (send license key to customer)
4. Replace old Stripe webhook handler references

---

## What We Will Do Next

### 1. Android — Lemon Squeezy UX Polish
**What:** Update the Android app's activation screen to reflect the new LS flow (enter license key from LS email, not a redeem code).

**Why:** The activation UX was designed around a "redeem code" concept from the Stripe flow. With LS, the customer receives a "license key" directly — the terminology and instructions in the app need to match.

**Where:** `TachiyomiAT/app/src/main/java/eu/kanade/translation/`

### 2. Balance & License Screen (Android)
**What:** Show the user their current token balance, device info, and license status inside the app.

**Why:** Users need visibility into how many tokens they have left before submitting expensive chapters.

**Where:** New screen in TachiyomiAT settings / translation section.

### 3. Hosted Review Mode (Android)
**What:** After a hosted translation job completes, allow the user to review and optionally correct translations before saving.

**Why:** AI translation is not perfect — giving users a review step improves quality and trust.

**Where:** TachiyomiAT reader / translation result handling.

### 4. Retry & Recovery UX (Android)
**What:** Better in-app handling for revoked sessions, failed uploads, and failed jobs.

**Why:** Currently failures surface as generic errors. Users need clear guidance: "your session expired — tap to re-activate", "upload failed — tap to retry".

**Where:** TachiyomiAT hosted engine client code.

### 5. Phase 15 Remaining Hardening
**What:**
- Metrics and alerting surfaces (track job failure rates, provider latency)
- Backup/restore rehearsal docs and operational runbooks
- Launch checklists and staged rollout criteria
- Token-drain safeguards (anomaly detection for suspicious usage)
- User-facing migration/support documentation

**Why:** Pre-launch hardening. The system works but is not yet safe to expose to real user traffic at scale.

**Where:** Backend infra, docs, and monitoring setup.

### 6. Staged Launch
**What:** Open the hosted service to early users in a controlled rollout.

**Why:** Validate the full flow end-to-end with real purchases, real Android devices, and real manga chapters before full public launch.

**How:** Use a waitlist or invite codes, monitor closely, iterate fast.

---

## Key Files Reference

| Area | Location |
|------|----------|
| Backend root | `/tachi-back/` |
| Phase docs | `/tachi-back/docs/phases/` |
| Prisma schema | `/tachi-back/prisma/schema.prisma` |
| API routes | `/tachi-back/app/api/` |
| Android translation | `/TachiyomiAT/app/src/main/java/eu/kanade/translation/` |
| Android settings UI | `/TachiyomiAT/app/src/main/java/eu/kanade/presentation/more/settings/` |

---

## Decisions Log

| Decision | Reason |
|----------|--------|
| Lemon Squeezy over Stripe | Merchant of Record — handles VAT/taxes automatically, less legal overhead for indie product |
| Token credits over subscriptions | More flexible for users, aligns cost with actual usage |
| Device-bound sessions over user accounts | No sign-up friction, privacy-friendly, simpler auth surface |
| Better Auth for backoffice only | Customers never need an account — license key + device binding is sufficient |
| Inline job execution first | Keeps the stack simple during development; dedicated worker added when needed |
| Google Cloud Vision for OCR | Best accuracy for manga text, well-supported API |
| LS generates license keys | Removes the need for the backend to generate and email keys — LS handles this natively |
