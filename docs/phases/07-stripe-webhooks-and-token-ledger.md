# Phase 07 - Stripe Webhooks And Token Ledger

## Objective

Convert successful Stripe payments into durable internal orders, redeem codes, and token credits.

## Validation Summary

This phase is confirmed as necessary after reviewing both repositories.

### Confirmed Current State In `tachi-back`

- The backend now has a dedicated public Stripe webhook route for the initial paid checkout completion path.
- The env contract already defines `STRIPE_WEBHOOK_SECRET`, and webhook verification is now wired for that first path.
- The real commerce entities this phase depends on already exist in the schema: `Order`, `License`, `RedeemCode`, `TokenLedger`, and `StripeEvent`.
- The public pricing site and Stripe Checkout entry route now exist, so webhook processing should extend that flow instead of assuming checkout is still hypothetical.
- The webhook still needs to stay as a dedicated public server route and not be mixed into Better Auth or admin routers.
- The repo already has useful email infrastructure that should be reused for receipts and redeem instructions:
  `src/server/email.tsx`
  React Email templates
  and local Maildev support for development.
- The initial fulfillment slice now handles `checkout.session.completed` events for paid one-time checkout sessions, but broader Stripe event coverage and replay tooling are still follow-up work.

### Confirmed Constraints From TachiyomiAT Mobile

- TachiyomiAT still has no redeem-code activation flow, no device-binding UI, and no token-balance UI.
- The Android app still runs OCR and translation directly with user-supplied provider keys today.
- Because there is still no end-user login model and no activated device identity, webhook crediting must not depend on a signed-in customer account.
- This phase should therefore create a durable post-payment entitlement state that later phases can activate on-device, rather than trying to finish the mobile flow now.
- The safest first version is to make one successful purchase produce one traceable entitlement path:
  one order
  one license
  one redeem code
  and one or more ledger credit entries tied to that order.

## Keep vs Replace

### Keep In Phase 07

- The public checkout entry created in Phase 06.
- The real `TokenPack.stripePriceId` mapping introduced for checkout.
- Existing typed env validation and server route patterns.
- Existing email sending infrastructure for transactional emails.

### Add Or Tighten In Phase 07

- Keep the public Stripe webhook endpoint signature-verified and isolated from admin auth.
- Keep durable idempotency records for webhook events.
- Keep token ledger crediting append-only.
- Keep redeem-code issuance tied to a persisted paid order.
- Tighten fulfillment idempotency so one order maps to one redeem path and one purchase-credit reference.

## Detailed Tasks

- Tighten Stripe webhook env validation and webhook secret handling before adding runtime logic.
- Implement a dedicated public webhook route that verifies Stripe signatures using the raw request body.
- Keep webhook handling separate from Better Auth and admin session middleware. Stripe must be able to call it anonymously.
- Persist webhook event IDs and enough event metadata to support idempotency, replay, and auditability.
- Decide the minimum Stripe events you will trust for launch, including delayed-payment flows if you plan to support them.
- On successful payment confirmation, create or update the internal `Order` using Stripe IDs as durable reconciliation keys.
- Make the order record capture enough support context:
  payer email
  Stripe session ID
  payment intent or equivalent payment reference
  token pack
  purchased token amount
  payment state
  and environment.
- Decide the initial entitlement model for purchases. Because there is no customer login yet, prefer a deterministic first version where one successful paid order creates one `License` and one redeemable activation path.
- Generate a one-time `RedeemCode` tied to that order and license.
- Create `TokenLedger` credit entries for the purchased amount.
- Treat the ledger as append-only. Do not model balance as an arbitrary mutable number without a corresponding ledger trail.
- Prefer explicit fulfillment keys or idempotency keys for redeem codes and purchase credits instead of hoping duplicate-event code paths never race.
- Define the initial ledger entry types needed now, at minimum purchase credit, and ensure later reserve/spend/refund entries can reuse the same model cleanly.
- Ensure webhook replays, duplicate deliveries, and out-of-order deliveries cannot duplicate token credit or redeem-code generation.
- Decide when outbound email is sent:
  only after durable order plus ledger success
  and never before the entitlement state is committed.
- Reuse the existing `src/server/email.tsx` infrastructure and add real receipt or activation email templates.
- Include redeem instructions in the purchase email, but keep the wording accurate:
  activation happens in a later phase
  and support may initially need a manual flow until Android integration exists.
- Add admin tooling, support scripts, or a documented manual procedure to replay failed webhooks safely.
- Add structured logging around the full payment-to-ledger path so support can diagnose mismatches later.
- Add tests for:
  duplicate webhook delivery
  out-of-order events
  partial failure after order creation but before ledger creation
  and email-send failure after successful crediting.
- Document the accounting flow clearly so finance and support can trace any granted tokens back to a Stripe event and internal order.

## Outputs

- Verified webhook processing.
- Idempotent order creation and entitlement issuance.
- Append-only token credit ledger entries.
- Redeem code generation tied to paid orders.

## Done When

- A successful Stripe payment results in one credited order only once.
- Replayed Stripe events do not duplicate token credit.
- Support can trace any credit back to an order and webhook event.
- Receipt or activation email sending is decoupled from payment correctness, so an email failure does not lose paid credit.
- No device binding or mobile session is required for payment crediting to succeed.

## Not Part Of Phase 07

- Device binding or app activation
- Mobile session issuance
- OCR or translation job spending
- Admin backoffice screens for licenses and devices
- Provider-side token burn accounting
