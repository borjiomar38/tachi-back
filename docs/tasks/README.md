# Hosted Translation Task Index

> Updated: 2026-04-07

This folder splits the current hosted translation work into one task per file.

Use this structure:

- `PROGRESS.md` for the product-level snapshot
- `HOSTED_TRANSLATION_STATUS.md` for the technical status hub
- `docs/tasks/*.md` for execution details

## Task Files

### 1. Provider routing runtime config

File:

- `docs/tasks/01-provider-routing-runtime-config.md`

Use this for:

- backend runtime config persistence
- manager UI for provider/model selection
- provider resolution changes in job creation and translation execution

### 2. Production hosted translation end-to-end validation

File:

- `docs/tasks/02-production-hosted-translation-e2e.md`

Use this for:

- Android activation validation
- provider routing validation in production
- first successful chapter translation test

### 3. Billing and post-purchase operations

File:

- `docs/tasks/03-billing-post-purchase-ops.md`

Use this for:

- refunds
- top-up strategy
- support and backoffice post-purchase gaps

### 4. Local Prisma migration and schema drift cleanup

File:

- `docs/tasks/04-local-prisma-runtime-config-migration.md`

Use this for:

- local DB drift
- safe local migration handling
- development environment cleanup

