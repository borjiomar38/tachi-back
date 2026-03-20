# Tachiyomi Back Phases

This roadmap breaks Tachiyomi Back into small implementation phases across both repositories:

- `tachi-back` for the web app, admin/backoffice, backend APIs, jobs, and payments
- `TachiyomiAT` for the Android client that will consume the hosted service

## Validation Summary

This phase index is valid, but it needed clearer cross-repo framing.

The important realities are:

- `tachi-back` is still largely the imported Start UI starter and still exposes starter entities, routes, permissions, and manager screens.
- TachiyomiAT still behaves as a local or bring-your-own-key translation app today. It still exposes direct provider-key settings and still processes translation work locally.
- There is no customer login in the Android app, so the hosted product must be built around redeem codes, installation identity, device binding, mobile sessions, and token balances instead of user accounts.
- The Android integration must come after the backend contracts are real. The app should not invent or guess backend shapes during integration.

Use these phases in order. Each phase should end with a reviewable branch, tested behavior, and no half-finished schema, payment, activation, or mobile API contracts.

## Confirmed Current State

Backend:

- `tachi-back` still has starter business domains such as `book`, `genre`, and demo manager pages.
- The current server/router/auth surface is useful as infrastructure, but not as product logic.
- The backend does not yet have the real commerce, activation, provider, job, or mobile API surface needed by TachiyomiAT.

Mobile:

- TachiyomiAT still exposes direct API-key settings for hosted AI providers.
- OCR and translation are still executed locally in the app today.
- The app already has the right primitives for future hosted integration, such as app-state/private preference keys, OkHttp infrastructure, queue/progress UI, and local translation file consumption.

## Phase Tracks

The roadmap is intentionally backend-first:

- Phases 01-04: clean the starter and establish backend foundations
- Phases 05-09: public website, payments, activation, and mobile auth/session foundations
- Phases 10-13: provider gateway, job pipeline, and internal backoffice/operator tooling
- Phase 14: Android integration
- Phase 15: hardening and staged launch

## Phase List

1. [01 - Starter Cleanup](./01-starter-cleanup.md)
2. [02 - Local Infra And Secrets](./02-local-infra-and-secrets.md)
3. [03 - Core Data Model](./03-core-data-model.md)
4. [04 - Admin Auth And RBAC](./04-admin-auth-and-rbac.md)
5. [05 - Public Website And Pricing](./05-public-website-and-pricing.md)
6. [06 - Stripe Catalog And Checkout](./06-stripe-catalog-and-checkout.md)
7. [07 - Stripe Webhooks And Token Ledger](./07-stripe-webhooks-and-token-ledger.md)
8. [08 - Device Activation And License Binding](./08-device-activation-and-license-binding.md)
9. [09 - Mobile API Auth And Session](./09-mobile-api-auth-and-session.md)
10. [10 - OCR And Translation Provider Gateway](./10-ocr-and-translation-provider-gateway.md)
11. [11 - Job Pipeline And Storage](./11-job-pipeline-and-storage.md)
12. [12 - Backoffice Commerce And Licenses](./12-backoffice-commerce-and-licenses.md)
13. [13 - Backoffice Jobs And Provider Ops](./13-backoffice-jobs-and-provider-ops.md)
14. [14 - Android Integration](./14-android-integration.md)
15. [15 - Hardening And Launch](./15-hardening-and-launch.md)

## Dependency Rules

- Do not treat Phase 14 as a shortcut around earlier backend phases. Android integration depends on the real activation, mobile session, provider, and job contracts being in place first.
- Do not start Stripe-based paid fulfillment until the ledger model and post-payment crediting path are defined.
- Do not mix admin auth and mobile device auth. Better Auth is for internal staff; mobile access is a separate protocol.
- Do not let the hosted Android flow depend on direct provider keys in the app.
- Do not let jobs/provider operations screens absorb commerce/license support scope, or vice versa. Those are separated on purpose in Phases 12 and 13.

## Delivery Rules

- Keep phases small enough to merge safely.
- Do not start payment collection before the token ledger exists.
- Do not let the Android app call provider APIs directly after the hosted engine is introduced.
- Prefer additive migrations and explicit feature flags while the app is being integrated.
- Preserve the current reader/result contract in TachiyomiAT while hosted integration is being introduced.
- Every phase should end with updated docs, basic tests where applicable, and clear rollback steps.
