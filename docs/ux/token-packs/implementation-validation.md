# Nayovi one-time tokens — local implementation and validation

Status: implemented locally, awaiting the user's production validation. No push, deployment, production migration, live Lemon Squeezy catalog change, real payment, or Android release was performed. Do not deploy without a separate explicit GO.

## Implemented

- One server-owned catalog powers Android and the website. New pack keys: `starter-tokens` (250 / USD 2), `pro-tokens` (1,250 / USD 10), `power-tokens` (2,750 / USD 20). These are separate from legacy subscriptions. Seed/provisioning preserves existing catalog records and balances.
- Fixed purple/gold wallet on the right, only after onboarding, never in `ReaderActivity`. In-app balance, pack selection, usage, redeem, free-trial, pending and success dialogs share the approved visual style.
- Android purchase UX now follows the approved simplified chooser and native information PNGs: Continue retains the chosen offer and opens “Before you pay”; only “Proceed to payment” requests checkout. Back preserves selection, X closes, “How it works” remains optional, and checkout errors stay concise on the information screen.
- Reading is free. Translations and optional AI features use tokens. No subscription required. No chapter equivalents in purchase cards. Translation starts directly without any cost or download confirmation modal; missing pages download automatically. Only the initial target-language choice (if unset) and genuine access/balance errors can interrupt the flow. The server remains authoritative for token costs and available balance. Translate Pro is not introduced or priced by this change.
- HTTPS Lemon Squeezy checkout in a Custom Tab, with external-browser fallback. Checkout snapshots quantity, currency, amount, variant, environment and intended account/device. Subscription variants are rejected for new token packs.
- Only a verified paid webhook grants tokens. Transaction locks and unique ledger/order keys prevent double credit. Existing-account top-ups retain the old balance; an unclaimed web purchase can attach to the current app account.
- Return URL `/app/payment#ticket=…` uses a temporary opaque ticket, not a redeem code. The public return page is outside the authenticated `/app` layout, strips the fragment from browser history, skips analytics initialization, polls payment status, and provides an explicit app-open action and email recovery.
- HTTPS Android App Link parsing validates host, path, ticket and intent extras. Payment stays pending until the server confirms it. Same-device retries, wrong-account/device checks and expired-link email recovery are covered.
- Email outbox retries independently of fulfillment, with a lease, exponential backoff and authenticated cron endpoint. The backup code and the return ticket recover the same grant. EN/FR receipt copy is separated from the delivery worker; known French app devices receive French copy.
- Legacy renewal/expiry/upgrade accounting protects the one-time token pool. Existing subscriptions are not cancelled or converted. Refund balance adjustments retain the existing support-managed policy; automatic partial-refund proration is not added here. Non-purchase webhook types do not mint tokens.

## Isolated verification environment

- PostgreSQL: loopback port 55438, dedicated database `nayovi_token_packs`. Never run fixture scripts against `.env.local`'s remote database.
- Website: `http://127.0.0.1:5179/pricing`; Lemon checkout disabled, no real payments or external emails.
- Android: `Nayovi_16GB`, accessed exclusively through `TachiyomiAT/scripts/nayovi-emulator.sh`.
- Separate application ID: `app.tachiback.tachiyomi.at.tokenstest`. Original production/debug apps and their data/storage were not cleared or overwritten.
- Separate storage folder: `NayoviTokenTests`. Local reader fixtures use an existing Nayovi illustration, not a fetched chapter.
- Local demo redeem code: `TB-LOCA-LWAL-LETD` (2,450 initial test tokens, no monetary value). `--simulate-purchase-return` adds exactly one local 250-token grant and prints a local-only UI return ticket. This fixture simulates an already-paid database state, not an actual provider payment; signature/fulfillment validation is tested separately.

## Automated checks

- Android: `assembleDevDebug testDevDebugUnitTest` — 250 tests across 42 suites, 0 failures/errors/skips. Includes native purchase navigation and checkout eligibility/selection policy tests. Latest Android-only UX update did not rerun the earlier web checks listed below.
- Web: TypeScript check and production build.
- Web unit suite: 777 passed; 9 PostgreSQL integration cases intentionally skipped in the default run.
- Explicit isolated PostgreSQL suite: 9/9 passed, including duplicate/concurrent webhooks, immutable snapshots, pending/expired return links, top-ups, account/device mismatch, backup-code idempotency, email retry and recurring-variant rejection.
- Added wallet visibility tests cover incomplete onboarding, the onboarding screen still open, completed onboarding, and normal app visibility. Reader exclusion is structural: MainActivity owns wallet dialogs; Home/Browse own their capsule placement, with no capsule or host in ReaderActivity.

Commands (run from the corresponding repository):

```sh
./gradlew assembleDevDebug testDevDebugUnitTest -PtachiyomiBackBaseUrl=http://127.0.0.1:5179 -PnayoviDebugSuffix=.tokenstest
scripts/nayovi-emulator.sh adb install -r app/build/outputs/apk/dev/debug/app-dev-arm64-v8a-debug.apk
scripts/nayovi-emulator.sh adb reverse tcp:5179 tcp:5179
pnpm exec tsc --noEmit
pnpm exec vitest run --project unit
NAYOVI_PURCHASE_TEST_DB=postgresql://macbookpro@127.0.0.1:55438/nayovi_token_packs pnpm exec vitest run --project unit src/server/payments/token-purchase.integration.unit.spec.ts
```

The old JitPack FlexibleAdapter revision was unavailable (404; its upstream build failed on a removed build dependency). The official Maven Central `eu.davidea:flexible-adapter:5.1.0` dependency compiles successfully. Comparison with the pinned upstream source found two filtering/restoration implementation differences; this is not claimed to be a byte-identical replacement. Android Custom Tabs uses `androidx.browser:browser:1.8.0`.

## Visual artifacts

- Approved targets: `token-packs-desktop-mockup.png`, `TachiyomiAT/docs/ux/token-balance/token-packs-mobile-v3-simplified-mockup.png` and `token-purchase-details-mobile-v1-mockup.png` in the same Android folder. Mobile v2 is superseded.
- Real website screenshots: `verification/desktop-1280x900.png`, `verification/mobile-390x844.png`, `verification/mobile-full.png`.
- Real Android screenshots: `TachiyomiAT/docs/ux/token-balance/verification/`.
- Android `android-token-packs-final.png` is a historical v2 capture, superseded by `android-token-packs-v3-en.png`. The v3 picker and native information screen are now approved and implemented, with real EN/FR captures. `android-onboarding-no-wallet.png` and `android-onboarding-permissions.png` prove the onboarding exclusion.
- `android-reader-no-wallet.png` shows the local illustration in ReaderActivity without the wallet. The earlier `android-cost-preview.png` is a superseded development capture: the user rejected that confirmation, and its UI, saved quote preference and API quote gate have been removed.
- `android-direct-translation-offline.png` verifies the revised Translate action proceeds straight to the server access check without a cost/download confirmation. The test temporarily removed only the localhost port forwarding, producing the expected connection-error snackbar without starting any paid translation; forwarding was restored afterwards.
- `android-purchase-return-success.png` shows actual intent routing and auto-activation against the local backend. The browser then reports activation in `verification/payment-activated-mobile.png`. The simulated 250-token purchase leaves the original 2,450-token test balance intact (2,700 total), with one credit only.
- Continue now works even when local checkout is disabled, because reviewing an offer does not create a payment. The final payment action remains disabled against the real local backend until valid test variants are configured. A read-only loopback QA proxy temporarily simulated enabled catalog flags while refusing every payment POST: 0 checkout requests after Continue, exactly 1 for `pro-tokens` after Proceed to payment, and a concise simulated failure. The local purchase count remained 44 and balance remained 2,700. Proxy stopped and original port forwarding restored; no provider payment was made.
- Browse overlap correction (2026-09-11): a fixed 64dp shelf below the top tabs now contains the unchanged capsule; list content begins below it. Sources, Extensions and Migrate were tapped successfully, Migrate's selected state was captured, scrolling leaves the capsule fixed, and opening the wallet still works in Browse and Library. Android rebuild/tests pass (243). Real screenshots and exact ImageGen prompts: `TachiyomiAT/docs/ux/token-balance/browse-wallet-and-checkout-step-2.md`.
- `token-checkout-mobile-step-2-mockup.png` illustrates hosted Lemon checkout based on the provider's official checkout reference. It is a proposal, not an actual configured checkout; provider appearance and final tax/payment fields remain provider-controlled. The native Nayovi information screen now precedes this provider step; it introduces no chapter-translation confirmation.
- Latest Android implementation report: `TachiyomiAT/docs/ux/token-balance/purchase-flow-implementation-validation.md`. Captures include `android-purchase-details-enabled-en.png` (safe simulated availability), `android-purchase-details-disabled-en.png` (restored local backend), `android-purchase-details-fr.png` and `android-token-packs-v3-fr-selection-retained.png`. The dev-only resource filter now includes French; production flavor settings are unchanged.

## Production checklist — only after explicit validation

1. Create/verify NEW one-time Lemon Squeezy variants. Do not change monthly variants or existing subscribers. Map them through the `token_packs.lsVariantId` catalog fields, or set the three `LEMONSQUEEZY_ONE_TIME_VARIANT_*` variables before provisioning missing packs. The provisioning script previews by default and never overwrites existing pack values.
2. Apply the generated Prisma migration `20260910223203_one_time_token_purchases` through the normal authorized deployment path. `master` push deploys production automatically; no manual Vercel deployment.
3. Confirm correct store, webhook signing secret, environment/test-mode separation and `order_created` webhook delivery. Complete a real Lemon test-mode purchase on a separately configured staging environment before enabling live checkout.
4. Configure `ANDROID_APP_LINK_SHA256_FINGERPRINTS` with comma-separated SHA-256 release-signing fingerprints. Verify `/.well-known/assetlinks.json` on the production HTTPS hosts, then test a signed app's domain verification and browser return. Local debug intent routing does not prove public Android domain verification.
5. Configure SMTP and `CRON_SECRET`; verify hosting-plan support for the proposed five-minute email retry schedule. Test delayed/failing SMTP and receipt recovery. SMTP acceptance is not proof of inbox delivery.
6. Verify refund/support procedures and legacy subscriber behavior using staging data. No automatic subscription migration or refund policy change is authorized by this implementation.
7. Perform Android release only using the repository's mandatory release skill after a separate release GO. Rebuild with the real backend URL and normal release application ID; never distribute the localhost `.tokenstest` build.
