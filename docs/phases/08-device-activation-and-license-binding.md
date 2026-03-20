# Phase 08 - Device Activation And License Binding

## Objective

Bind purchased tokens to app installations without requiring a TachiyomiAT user account.

## Validation Summary

This phase is confirmed as necessary after reviewing both repositories.

### Confirmed Current State In `tachi-back`

- The real `Device`, `License`, `RedeemCode`, and `LicenseDevice` schema is now present from earlier phases.
- The Stripe webhook flow already issues one redeem code per paid order, so this phase should build on that entitlement path instead of inventing a separate purchase model.
- There is still no public redeem endpoint yet before this phase starts.
- There is no mobile-authenticated API surface yet; Better Auth is still only the admin/backoffice auth foundation.
- This means Phase 08 must focus on redeeming and binding, not on full mobile session design.
- Full manager UI for licenses and devices belongs later; Phase 08 only needs the minimal backend operations and contracts required for activation.

### Confirmed Constraints From TachiyomiAT Mobile

- TachiyomiAT currently has no activation UI, no redeem-code entry flow, no license summary, and no token-balance screen.
- The app also has no existing installation-ID concept in the translation product today.
- The app uses `PreferenceStore`, and normal preferences are included in TachiyomiAT’s in-app backup flow unless they are marked as app-state.
- That matters here: an installation ID must not be restored across devices from backup, or multiple devices could appear to be the same installation.
- The Android app currently still exposes user-supplied provider keys and local translation engines, so activation must be designed as a new hosted-service path rather than pretending the current app already uses backend entitlements.

## Keep vs Replace

### Keep In Phase 08

- The no-login product model: redeem code plus installation identity instead of customer accounts.
- The future separation between admin auth and mobile device auth.

### Add Or Tighten In Phase 08

- Add a redeem contract that is public, rate-limited, and idempotent.
- Add installation-scoped device identity rules for Android.
- Add license-binding rules that support support workflows later without requiring Stripe changes.

## Detailed Tasks

- Define the app-side installation identity contract.
- Use an app-generated random installation ID, not a hardware identifier.
- In TachiyomiAT, store that installation ID in a way that is excluded from the app’s backup/restore flow.
  Because ordinary preferences are backed up, prefer an app-state key rather than a normal persisted preference key for the installation ID.
- Decide reinstall behavior explicitly:
  reinstall should normally create a new installation ID
  backup restore should not clone the prior installation identity onto another device
  and support must have a documented recovery path when a user loses access to the old device.
- Build a public redeem endpoint that accepts at minimum:
  redeem code
  installation ID
  app version or version code
  platform metadata
  and any optional integrity or build channel data you want later.
- Keep the redeem endpoint separate from Better Auth admin sessions. Mobile users are still anonymous at this point.
- Make redeem idempotent for safe client retries. The same redeem code retried by the same installation should not create duplicate device/license state.
- Reject conflicting reuse cleanly when a redeem code has already been consumed by a different installation, unless your policy explicitly allows unbound-first-use transfer.
- Create the first `Device` record on successful activation.
- Bind the `Device` to the related `License`.
- Decide whether the redeem code becomes permanently consumed on first success, or whether support/admin flows can reset it later.
- Define device limits per license and document the policy in a way support can actually enforce.
- Decide how reinstall, factory reset, lost device, and manual transfer will work.
- If a `LicenseDevice` join or history model exists, use it to preserve transfer history rather than overwriting past bindings.
- Add the minimal server endpoints needed for later support visibility:
  list active devices for a license
  revoke a device
  and inspect current activation state.
  Full manager UI can come later.
- Add support endpoints, scripts, or minimal admin operations to issue manual redeem codes without Stripe for testing and support cases.
- Add rate limits, abuse protections, and logging for redeem attempts.
- Decide what metadata to store for support and fraud review:
  app version
  platform
  created at
  last seen at
  optional integrity signal
  and revoke reason/status.
- Define activation error responses clearly so the Android integration later has stable behavior for:
  invalid redeem code
  expired or revoked redeem code
  device limit reached
  revoked license
  and transient server failure.

## Outputs

- Redeem flow contract.
- Device binding flow.
- Minimal support/manual grant flow for support.

## Done When

- A paid user can activate tokens on a device using only a redeem code and app installation ID.
- Support can revoke or reissue activation without touching Stripe.
- Device identity is installation-scoped and not based on forbidden hardware IDs.
- The chosen installation ID storage does not get copied by TachiyomiAT backup/restore as if it were a normal user preference.
- Activation works without requiring mobile session design to be finished yet.

## Not Part Of Phase 08

- Full mobile session or API-token issuance
- Full Android activation UI
- Backoffice license/device screens
- OCR or translation job submission
