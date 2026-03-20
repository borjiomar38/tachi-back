# Phase 12 - Backoffice Commerce And Licenses

## Objective

Give admins the screens they need to manage purchases, token balances, redeem codes, and device-bound licenses.

## Validation Summary

Phase 12 is valid. This doc now reflects both the original scope and the first implementation slice that has already landed.

The main corrections and confirmations are:

- `tachi-back` manager UI no longer needs to be treated as purely starter-shaped: the first support lookup, license detail, and device detail surfaces now exist, but the broader commerce backoffice is still incomplete.
- Current server permissions and routers now include license/device/order support reads, so the remaining Phase 12 work should build on those real product APIs rather than on starter assumptions.
- TachiyomiAT still has no hosted activation, redeem, balance, or device-status UI, so this phase must be support-centric and admin-facing only.
- Jobs, provider health, retries, and cost operations belong to Phase 13, not here.
- Android customer-facing integration belongs to Phase 14, not here.

## Confirmed Current State In `tachi-back`

- The manager shell now redirects `/manager` to `/manager/licenses`.
- The sidebar now exposes a support entry point for licenses in addition to the remaining staff-management surface.
- The server router already exposes support-oriented reads for license lookup, license devices, license orders, license ledger entries, and device detail.
- First support pages now exist for support lookup, license detail, and device detail.
- Orders lists, redeem-code management views, audit trails, and broader manual support actions are still pending inside Phase 12.

## Confirmed Constraints From TachiyomiAT Mobile

- The Android app still exposes direct provider-key preferences for Gemini, OpenAI, OpenRouter, and Google Cloud.
- The Android app still does not expose hosted redeem code entry, license summary, token balance, device registration, or device-status UI.
- Because there is no end-user account system in the app, support workflows must be able to search by operational identifiers such as redeem code, installation ID, order ID, Stripe session, and email.
- Backoffice screens must not assume users can self-serve through a web account portal or an in-app account area yet.

## Keep Vs Replace

Keep:

- Better Auth admin sessions and the protected `/manager` shell.
- Existing route/layout patterns, tables, forms, and manager scaffolding where they save implementation time.
- Server-side permission enforcement and audit logging expectations.

Replace or add:

- Starter navigation entries with Tachiyomi Back support sections.
- Starter `books` and `users` manager pages with orders, licenses, redeem codes, devices, ledger, and admin audit views.
- Starter-oriented permission vocabulary with product-oriented support and operations permissions.

## Detailed Tasks

- Expand the first support IA into the remaining Tachiyomi Back sections such as `orders`, `redeem codes`, `devices`, and `ledger`.
- Build an orders list and detail flow with filters for payment status, purchase date, Stripe checkout session, payment intent, order ID, and customer email.
- Build a license detail screen that shows current token balance, lifetime credits, lifetime spend, source orders, attached redeem codes, attached devices, and recent adjustments.
- Build a redeem code list/detail flow with status, creation source, related order or manual grant, expiration, redemption timestamp, and redemption target device/license.
- Build a device detail screen showing installation ID, linked license, activation time, last-seen metadata, device status, and manual revoke/rebind actions if allowed by policy.
- Build an append-only ledger view so support can explain every token delta, including purchase credits, manual grants, reservation releases, spend, refunds, and corrective adjustments.
- Add a support search entry point that can search by redeem code, installation ID, order ID, Stripe identifiers, and email.
- Add manual support actions with explicit confirmation UX: credit tokens, create manual redeem code, revoke redeem code, revoke device, and add refund-related ledger adjustments.
- Require every manual action to create a durable admin audit record with actor, timestamp, target entity, reason, and before/after values where applicable.
- Keep permission checks and business rules server-side for every support action. The manager UI must never be the enforcement layer.
- Add empty states and degraded states for data that may not exist yet in early rollout, such as licenses without active devices or orders not yet tied to a redeemed installation.

## Outputs

- Support lookup entry point.
- License and device detail views.
- Orders, redeem codes, and audit/manual-operation surfaces to complete next.

## Not Part Of Phase 12

- Job dashboards, provider health views, retries, and operational failure workflows. Those belong to Phase 13.
- Android redeem screens, token balance UI, hosted-engine settings, or any other customer-facing mobile integration. Those belong to Phase 14.
- Rebuilding the underlying commerce schema, Stripe checkout, webhooks, activation, or mobile session protocols. Those should already exist from earlier phases.
- A customer self-service portal. This phase is internal backoffice only.

## Done When

- Support can answer "who paid", "which license/device is attached", and "why did the balance change" directly from the manager UI.
- Manual grants, revokes, and corrective adjustments are traceable through both the ledger and admin audit trail.
- Sensitive manager actions respect product RBAC and are enforced server-side.
- The remaining starter manager flow is no longer the primary backoffice path for this product.
