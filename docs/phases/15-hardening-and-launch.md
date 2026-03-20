# Phase 15 - Hardening And Launch

## Objective

Prepare Tachiyomi Back for real users with stronger security, observability, and release discipline.

## Validation Summary

Phase 15 is valid, and the first implementation slice now exists. The doc was still too generic and did not reflect the actual state of the backend and Android app.

The main corrections are:

- `tachi-back` already has a useful baseline for env validation, structured logging, and local Docker health checks, so this phase should harden and extend that foundation rather than describe production readiness from zero.
- Earlier phases already introduced in-memory redeem and mobile-auth throttles, but checkout initiation and mobile job routes still lacked dedicated launch-facing hardening. This phase should extend the protection boundary instead of pretending nothing exists yet.
- `tachi-back` still has no metrics surface, backup/restore playbooks, or release checklists, so those remain real launch blockers.
- TachiyomiAT still publicly documents a bring-your-own-provider-key model and still exposes direct provider-key settings, so launch messaging and rollout documentation must clearly distinguish local mode from paid hosted mode.
- TachiyomiAT backup behavior already excludes app-state keys and can exclude private keys, so Phase 15 must explicitly verify reinstall/backup/restore behavior for hosted installation IDs and mobile sessions before launch.
- Mobile privacy/telemetry additions must align with the app’s existing user-facing privacy controls instead of silently broadening data collection.

## Confirmed Current State In `tachi-back`

- The backend already has typed env validation and structured `pino` logging.
- Local Docker services already expose health checks for Postgres, MinIO, and MailDev.
- Earlier phases already added in-memory rate limits for redeem and mobile auth activation/refresh.
- The first Phase 15 slice now adds dedicated rate limits for public checkout initiation and authenticated mobile job create/write/read routes, plus shared request-ID helpers for hardened API responses.
- There is still no production metrics surface, incident runbook set, restore rehearsal doc, or staging/production release checklist in the current repo surface.
- That means Phase 15 is the first real production-hardening pass, not just a final polish step.

## Confirmed Constraints From TachiyomiAT Mobile

- The mobile README still tells users to add their own API keys for API-based translators.
- The translation settings UI still exposes direct provider-key configuration.
- The app already has backup filtering that excludes app-state keys and optionally excludes private keys, which is useful for hosted identity/session safety but must be verified end to end.
- The app already exposes privacy-related user controls for crash reporting and analytics, so any hosted-flow telemetry or debugging additions need to respect that posture.
- Launch readiness must include user-facing migration guidance because existing users are accustomed to self-managed provider keys, not hosted token balances and redeem flows.

## Keep Vs Replace

Keep:

- Existing env validation and structured logging foundation.
- Existing Docker health checks and local infrastructure bootstrap.
- Existing mobile privacy and backup primitives that support safer hosted rollout.

Replace or add:

- Add first-class rate limiting, abuse controls, and launch-grade observability around public and mobile entry points.
- Add explicit backup/restore and disaster-recovery procedures instead of relying on local Docker defaults.
- Add staged-release checklists, smoke tests, incident playbooks, and support documentation that match the real hosted workflow.
- Replace ambiguous user messaging about API keys with a clear distinction between local mode and hosted mode.

## Current Implementation Status

The first real Phase 15 slice is now implemented.

Included in this slice:

- dedicated env-backed rate limits for public Stripe checkout initiation
- dedicated env-backed rate limits for authenticated mobile job creation, write operations, and read/polling routes
- shared request-context helpers that preserve or generate request IDs and attach `X-Request-ID` headers to hardened API responses
- route-level structured logging for checkout and mobile-job rate-limit events
- updated env and docs so these controls are configurable instead of hardcoded

Still missing inside Phase 15:

- metrics, dashboards, and alerting
- backup/restore and disaster-recovery runbooks
- staged release checklists and go/no-go criteria
- richer abuse detection beyond request throttling
- end-to-end hosted launch documentation and migration/support material

## Detailed Tasks

- Extend structured logging around payments, activation, jobs, ledger changes, and provider calls so production incidents can be traced across the full workflow.
- Add metrics for checkout conversion, payment success, redeem success, activation success, job completion, retry rate, token burn, provider cost, and support-relevant failure classes.
- Add request rate limits for public checkout helpers, webhook-adjacent public surfaces where relevant, redeem endpoints, session issuance/refresh, and mobile job creation/upload flows.
- Add abuse controls such as redeem throttling, device/session anomaly detection, token-drain safeguards, and optional integrity/attestation hooks for later rollout stages.
- Review raw image retention, result retention, privacy policy wording, data deletion rules, and support-access boundaries for manga page data processed by the backend.
- Define and rehearse backup and restore procedures for Postgres and object storage, including recovery point expectations and who is allowed to run them.
- Verify mobile reinstall, backup, and restore behavior for hosted installation IDs and session data so cloned backups do not silently duplicate device identity or preserve invalid sessions.
- Add staging and production deployment checklists covering secrets, migrations, object storage, Stripe/webhook config, provider keys, and rollback expectations.
- Add incident runbooks for provider outage, Stripe outage, storage outage, webhook backlog, stuck worker backlog, and broken migration rollback.
- Add smoke tests for the pay -> redeem -> activate -> submit job -> read result workflow, plus negative-path checks for no tokens, revoked device, and provider failure handling.
- Review pricing against real provider costs, refund behavior, and support burden, then adjust token economics before public launch.
- Update Android and web user-facing copy so hosted mode, local mode, and provider-key expectations are not mixed together.
- Add release notes, support macros, FAQ entries, and migration documentation for first hosted users.
- Define the staged rollout plan explicitly, such as internal testers -> limited beta -> wider release, with go/no-go criteria for each stage.

## Outputs

- Production readiness checklist.
- Observability and incident response baseline.
- Final launch policy and support docs.
- Staged rollout and rollback plan.

## Not Part Of Phase 15

- Designing the core product architecture, schema, checkout flow, activation protocol, provider adapters, or job pipeline. Those belong to earlier phases and should already exist.
- Building the main Android hosted integration itself. That belongs to Phase 14.
- Backoffice commerce or operator UI feature design beyond what is required to support launch hardening. Those belong to Phases 12 and 13.

## Done When

- You can detect failures before users report them.
- Core business workflows have monitoring, rate limits, recovery procedures, and rollback plans.
- Mobile reinstall/backup/restore behavior for hosted identity and sessions has been validated.
- User-facing documentation and in-app messaging no longer confuse hosted mode with bring-your-own-key local mode.
- The system is ready for staged launch instead of one unobserved big release.
