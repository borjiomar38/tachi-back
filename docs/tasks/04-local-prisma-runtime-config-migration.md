# Task 04: Local Prisma Runtime-Config Migration Cleanup

> Updated: 2026-04-07

## Objective

Get local development into a clean state for the new runtime-config table
without confusing local Stripe-era drift with the production rollout.

## Why

The new runtime-config work is correct, but local Prisma workflow is blocked by
old schema drift in the local dev database.

## Current State

### Already done

- [x] `AppConfig` model added to Prisma schema
- [x] manual migration SQL file created
- [x] Prisma client generation succeeded previously

### Current blocker

- [ ] `pnpm db:migrate:dev` does not apply cleanly on current local DB
- [ ] local DB still contains Stripe-era drift

## What

Separate two concerns:

1. production rollout for the new `app_configs` table
2. local developer database cleanup

The local DB issue should not block the product docs or the production plan, but
it does block smooth local migration testing.

## Where

- `prisma/schema.prisma`
- `prisma/migrations/20260407133000_provider_gateway_runtime_config/migration.sql`

## Known Drift

The local database still contains old Stripe-era remnants such as:

- old enum values like `stripe`
- old Stripe payment columns
- old webhook/event tables from the previous architecture

## How

### Safe production path

- treat the checked-in migration file as the source of truth
- apply it to production deliberately
- do not base production confidence on the dirty local DB

### Safe local path options

Option A:

- reset local DB if local data is disposable

Option B:

- use `pnpm db:push --accept-data-loss` only if local data can be discarded

Option C:

- manually reconcile local drift before re-running Prisma migrate

## Checklist

### Production-safe checklist

- [ ] Ensure migration SQL file is committed
- [ ] Apply migration to production DB
- [ ] Verify `app_configs` table exists

### Local cleanup checklist

- [ ] Decide whether local DB data matters
- [ ] If no, reset or push with accepted data loss
- [ ] If yes, inspect and manually reconcile local drift first
- [ ] Re-run Prisma workflow after cleanup

### Verification checklist

- [ ] Prisma client generates cleanly
- [ ] runtime config can read/write `AppConfig`
- [ ] manager provider routing load/save works locally

## Risks

- accidental local reset on a database someone still cares about
- assuming local drift reflects production state
- mixing old Stripe migration noise with the new runtime-config change set

## Recommendation

Use the migration file as the canonical change for production.

Treat local DB cleanup as a separate developer-maintenance task, not as proof
that the runtime-config feature itself is wrong.
