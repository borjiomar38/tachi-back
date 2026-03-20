# Phase 03 - Core Data Model

## Objective

Create the first real database schema for payments, licenses, devices, tokens, and translation jobs.

## Validation Summary

This phase is confirmed as necessary after reviewing both repositories.

### Confirmed Current State In `tachi-back`

- The current Prisma schema only contains Better Auth tables. The starter `book`/`genre` domain has already been removed.
- The backend no longer exposes starter `book` or `genre` routers, but it still lacks real product models for payments, licenses, devices, tokens, and jobs.
- The seed logic is minimal today and still needs real product seed data such as token packs.
- The current repo scripts are still centered on `prisma db push`, and there is still no checked-in Prisma migration history yet.

### Confirmed Constraints From TachiyomiAT Mobile

- TachiyomiAT currently has no login flow for end users and no existing backend identity model.
- The future backend data model must not assume that mobile customers are `User` records in Better Auth.
- The future device model must represent an app installation, not a hardware identifier.
- The Android app’s translation result shape is already page-and-block structured JSON with image dimensions, source language, target language, translator type, and OCR block geometry.
- The backend job model should therefore keep business state relational, while allowing final translation payloads to live as JSON or object-storage assets rather than forcing every OCR block into first-class SQL tables.

## Keep vs Replace

### Keep In Phase 03

- Better Auth tables already required for internal admin access: `User`, `Session`, `Account`, and `Verification`.
- Existing Prisma client generation pattern and DB wiring.

### Replace Or Add In Phase 03

- Replace demo business models with product models for payments, licenses, devices, tokens, jobs, and provider usage.
- Replace demo seed logic with token-pack seed logic and minimal admin seed logic.
- Introduce the first real migration history for Tachiyomi Back instead of relying only on demo-oriented `db push`.
- Keep the current internal `user/admin` Better Auth role shape temporarily if needed; the role and permission refactor belongs to Phase 04.

## Detailed Tasks

- Keep Better Auth tables that are already required for internal admin access.
- Explicitly document that Better Auth `User` records are for backoffice admins and staff, not mobile customers.
- If Phase 01 cleanup has not been executed yet, remove starter demo models as part of this phase’s schema replacement work.
- Add `License` as the entitlement and token-balance owner. Do not force it to belong to a Better Auth `User`.
- Add `Device` to represent one TachiyomiAT installation, not a hardware identifier. Include installation-scoped identity, status, app version metadata, and last-seen timestamps.
- Decide whether device binding is modeled as:
  a direct `licenseId` on `Device`, or a join/history table such as `LicenseDevice`.
  Prefer the join/history option if you want clean transfer and audit history later.
- Add `RedeemCode` for one-time activation codes created from successful payments or manual grants.
- Add `TokenPack` to represent purchasable products and token amounts.
- Add `Order` to represent one Stripe checkout result and payer contact data.
- Add `StripeEvent` or `WebhookEvent` for idempotent webhook processing.
- Add `TokenLedger` for all credit, reserve, spend, refund, expiration, and admin adjustment movements.
- Add `TranslationJob` for chapter processing state, token reservation state, provider selection, source and target language, and result status.
- Add `JobAsset` or an equivalent storage-oriented table for uploaded pages, result manifests, and optional debug artifacts.
- Add `ProviderUsage` to store provider, model, timing, cost, page count, and billing metrics per job or per stage.
- Add enums for job state, payment state, ledger entry type, provider type, redeem code state, and device state.
- Keep business-critical workflow state relational. Do not normalize every OCR block into SQL unless a real query need justifies it.
- Model final translated chapter results in a way that matches the Android app’s page/block payload shape, likely as JSON metadata plus object-storage assets.
- Add indexes for lookup paths that will be used heavily: redeem code, device installation ID, active license, order by Stripe session ID, job state, and ledger by license/date.
- Replace demo seed logic with token-pack seed data and minimal admin/support seed data only.
- Write the first real Prisma migration for Tachiyomi Back and document any destructive replacement of starter models.
- Review package scripts and document when to use a real migration workflow versus `db push` convenience commands in local development.

## Outputs

- A real Prisma schema for Tachiyomi Back.
- Seed data for initial token packs.
- Migration docs with notes about destructive starter model removal.
- A documented boundary between admin-auth tables and customer/license/device data.

## Done When

- The schema can express a full path from payment to redeem code to device to job to ledger spend.
- Better Auth `User` is not overloaded as the mobile customer identity model.
- The schema can support token ownership and device activation without requiring end-user login.
- No critical business workflow is hidden inside unstructured blobs when a typed relational model is clearly needed.
- Translation result payloads are modeled in a way that matches the Android app’s real page/block data shape.
- Seeded local data supports the next payment and admin phases.

## Not Part Of Phase 03

- Implementing Stripe checkout logic
- Implementing webhook handlers
- Implementing provider gateway clients
- Implementing Android activation and session flows
- Building the async worker pipeline
