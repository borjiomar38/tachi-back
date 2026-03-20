# Phase 06 - Stripe Catalog And Checkout

## Objective

Connect the public website to Stripe so users can start buying token packs safely, without crediting tokens or activating devices until later phases.

## Validation Summary

This phase is confirmed as necessary after reviewing both repositories.

### Confirmed Current State In `tachi-back`

- There is still no Stripe runtime integration in the app yet.
- The backend env contract already defines Stripe keys and per-pack price placeholders, but the runtime and docs need to catch up to that contract.
- The current package setup does not yet include Stripe server/client dependencies.
- The starter `book` and `genre` domain is already removed, and the Phase 03 schema now includes `TokenPack`, `Order`, and `StripeEvent`.
- The public landing page and pricing routes already exist, and pricing cards are sourced from the real `TokenPack` records created in Postgres.
- The existing repo already has useful primitives that should be reused for this phase:
  typed env validation
  server-side route handling
  public server procedures
  and a clean split between public pages and internal backoffice pages.

### Confirmed Constraints From TachiyomiAT Mobile

- TachiyomiAT still has no purchase, redeem-code, activation, license summary, or token-balance UI.
- The Android app still expects user-supplied provider API keys and still calls OCR/translation providers directly today.
- Because there is no customer login and no mobile activation flow yet, checkout cannot assume an existing customer account in the backend.
- This means Phase 06 must collect enough durable purchase context for later support and activation, especially payer email and selected token pack.
- The post-checkout UX must not claim that tokens are already usable in the app until webhook crediting and redeem flow phases are implemented.

## Keep vs Replace

### Keep In Phase 06

- The public pricing surface from Phase 05.
- Typed env validation and server-side routing patterns already used in `tachi-back`.
- Server ownership of all trusted business logic.

### Add Or Tighten In Phase 06

- Add Stripe dependencies and tighten env validation for checkout initiation only.
- Add the first trusted product-to-Stripe price mapping flow.
- Add checkout session creation endpoints or procedures that resolve token packs on the server.
- Add success and cancel pages that fit the no-login, redeem-code-based product model.

## Detailed Tasks

- Add Stripe dependencies and wire the already-defined env contract into runtime code.
- Keep `STRIPE_WEBHOOK_SECRET` out of the hard requirement for this phase if webhook handling is still deferred to Phase 07.
- Decide how `TokenPack` maps to Stripe pricing:
  database-backed `TokenPack.stripePriceId`
  or a temporary server-side config mapping until the real schema is live.
  Prefer the database-backed path once Phase 03 exists.
- Create Stripe products and one-time prices for each active token pack.
- Decide whether token packs are fixed-price only for launch. Keep the first version simple unless you have a concrete need for regional pricing.
- Build a server-only endpoint or public procedure that accepts a token-pack identifier and creates a Stripe Checkout Session.
- Make the server resolve the trusted token pack, Stripe price ID, amount, and active status. Never trust price or token amounts from the client.
- Add validation for inactive, archived, missing, or malformed token-pack selections so stale pricing links cannot sell the wrong product.
- Decide what purchase-time customer data is required. At minimum, collect payer email because the product has no end-user login and later phases need a contact path for receipts and redeem instructions.
- Store Stripe session metadata that helps later reconciliation, such as:
  token pack ID
  purchase source
  environment
  and a snapshot of expected token amount for debugging.
  Treat that metadata as diagnostic context, not the final source of truth for crediting.
- Add success and cancel pages on the public site.
- Make the success page message accurate for the current product state:
  payment started or completed at Stripe
  internal crediting happens only after webhook confirmation
  activation and device binding come later.
- Make the pricing UI honest in partially configured environments:
  if a pack has no Stripe price mapping yet, keep it visible publicly but do not pretend it is purchasable.
- Decide whether abandoned or cancelled checkout attempts should be logged now or deferred until the order/webhook phase. Document that decision.
- Add tests for checkout session creation, invalid token pack selection, inactive packs, and missing Stripe mapping.
- Mock Stripe in tests so validation logic is covered without requiring live payment calls.

## Outputs

- Checkout initiation flow from the public website.
- Trusted Stripe price mapping for token packs.
- Success and cancel UX that matches the no-login product model.

## Done When

- A user can start checkout from a real pricing card.
- The server controls the final product and price mapping.
- Checkout does not trust client-supplied price or token values.
- Success and cancel pages do not imply that payment credit, redeem-code creation, or activation already happened.
- No tokens are credited at this phase without webhook confirmation.

## Not Part Of Phase 06

- Crediting paid token purchases
- Creating licenses or redeem codes
- Device binding or mobile activation
- Token ledger bookkeeping
- Refund tooling or Stripe Customer Portal
