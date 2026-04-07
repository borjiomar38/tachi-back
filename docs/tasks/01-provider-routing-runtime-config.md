# Task 01: Provider Routing Runtime Config

> Updated: 2026-04-07

## Objective

Let the admin choose which hosted translation provider users consume in
production, and which model is used for that provider.

## Why

Provider choice must be server-side:

- API keys live on the backend
- quality/cost tradeoffs are product decisions
- fallback behavior should be controlled by admin
- mobile should not expose provider switching anymore

## Current State

### Already done

- [x] `AppConfig` model added in `prisma/schema.prisma`
- [x] SQL migration file created in
      `prisma/migrations/20260407133000_provider_gateway_runtime_config/migration.sql`
- [x] runtime config service added in
      `src/server/provider-gateway/runtime-config.ts`
- [x] runtime-aware manifest added in
      `src/server/provider-gateway/manifest.ts`
- [x] runtime-aware translation model selection added in
      `src/server/provider-gateway/translation.ts`
- [x] runtime-aware provider resolution added in `src/server/jobs/service.ts`
- [x] manager endpoints added in `src/server/routers/provider.ts`
- [x] manager schemas added in `src/server/jobs/backoffice-schema.ts`
- [x] manager UI card added in
      `src/features/provider/manager/page-provider-ops.tsx`
- [x] permission `provider.update` added in
      `src/features/auth/permissions.ts`

### Not done yet

- [ ] Validate manager save/load behavior through the authenticated UI
- [ ] Validate mobile jobs use the selected provider/model end to end from Android

## What

Persist a mutable runtime routing config instead of relying only on env vars.

Stored config:

- `translationProviderPrimary`
- `geminiTranslationModel`
- `openaiTranslationModel`

Current UI-supported providers:

- `gemini`
- `openai`

## Where

### Database

- `prisma/schema.prisma`
- `prisma/migrations/20260407133000_provider_gateway_runtime_config/migration.sql`

### Backend runtime config

- `src/server/provider-gateway/runtime-config.ts`
- `src/server/provider-gateway/manifest.ts`
- `src/server/provider-gateway/translation.ts`
- `src/server/jobs/service.ts`

### Backoffice API

- `src/server/jobs/backoffice-schema.ts`
- `src/server/routers/provider.ts`

### Backoffice UI

- `src/features/provider/manager/page-provider-ops.tsx`
- `src/features/auth/permissions.ts`

## How

### Persistence

- use `AppConfig`
- store a JSON payload under a stable key
- merge stored values with env defaults

### Resolution rules

1. if a preferred provider is explicitly requested and valid, use it
2. otherwise use the admin-selected provider from runtime config
3. otherwise fall back to the first enabled supported provider

### Validation rules

- OCR must be configured
- selected translation provider must be actually enabled
- admin can only choose among supported runtime-config providers

## Recommended Models

### Gemini

- `gemini-2.5-flash`
- `gemini-2.5-pro`
- `gemini-2.0-flash`

### OpenAI

- `gpt-4.1-mini`
- `gpt-4.1`
- `gpt-4o-mini`

## Checklist

### Build and code verification

- [x] Run `pnpm gen:prisma`
- [x] Run `pnpm lint:ts`
- [x] Run `pnpm build`
- [x] Run targeted tests for provider routing and hosted jobs

### DB and deploy

- [x] Ensure migration is committed in the worktree
- [x] Apply migration on production DB
- [x] Deploy `tachi-back`

### Backoffice validation

- [ ] Open Provider Ops
- [ ] Confirm OCR readiness is visible
- [ ] Confirm Gemini readiness is visible
- [ ] Confirm OpenAI readiness is visible
- [ ] Save `gemini` + model
- [ ] Reload and confirm persisted state
- [ ] Save `openai` + model
- [ ] Reload and confirm persisted state

### Runtime validation

- [x] Persist runtime config against production DB
- [x] Read runtime config back from production DB
- [ ] Create mobile job with provider set to `gemini`
- [ ] Confirm job resolves `gemini`
- [ ] Switch runtime config to `openai`
- [ ] Create another mobile job
- [ ] Confirm job resolves `openai`

## Validation Completed

- `pnpm gen:prisma` passed
- `pnpm lint:ts` passed
- `pnpm build` passed
- targeted tests passed:
  - `src/server/jobs/service.unit.spec.ts`
  - `src/server/routers/provider.unit.spec.ts`
  - `src/server/provider-gateway/translation.unit.spec.ts`
- production migration `20260407133000_provider_gateway_runtime_config` applied
- production deploy completed on Vercel
- runtime config write/read was validated against the production database using
  `updateProviderGatewayRuntimeConfig()` and `getProviderGatewayRuntimeConfig()`

## Risks

- local Prisma drift may confuse migration testing
- production env may be correct while DB migration is still missing
- Anthropic exists in gateway code but is not part of the current admin routing UI
- full `pnpm test` still requires Playwright browser binaries on this machine for
  browser tests; that is separate from this task

## Decision Notes

- keep provider choice admin-side, not user-side
- do not expose API keys or provider selection in Android settings
- start with `gemini` and `openai`; add more only if operationally needed
