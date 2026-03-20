# Phase 13 - Backoffice Jobs And Provider Ops

## Objective

Give operators visibility into running jobs, provider failures, retries, and cost behavior.

## Validation Summary

Phase 13 is valid, but the current doc was too generic and did not reflect the real state of either repo.

The main corrections are:

- `tachi-back` still has no real job dashboard, worker runtime, or queue infrastructure, so this phase must explicitly build the first operational visibility layer instead of assuming it already exists.
- `tachi-back` does already have a generic server logger, which should be reused as the base for structured operational events rather than replaced blindly.
- The manager UI is still starter-shaped, so jobs and provider ops screens still need to be added to the manager IA.
- TachiyomiAT still tracks translation queue/progress locally and has no backend job ID, polling, or provider-health UI, so this phase must stay internal/operator-facing.
- Customer-facing activation, hosted job submission, and app correlation UX belong to Phase 14, not here.

## Confirmed Current State In `tachi-back`

- `package.json` still has no queue/worker runtime or dedicated job-processing scripts.
- The backend does already have `pino`-based structured logging, mainly around procedure execution and request/error handling.
- The manager area now exposes a first jobs list/detail view and a first provider-ops summary view.
- Those new surfaces are still read-only and are built from existing job, asset, provider-usage, and token-ledger records rather than dedicated observability tables.
- There is still no dedicated job event table, no background worker runtime, no alerting surface, and no operator actions such as retry/cancel/refund review yet.
- This means Phase 13 is now partially underway, and the remaining work is about deepening operational visibility and safe operational controls.

## Confirmed Constraints From TachiyomiAT Mobile

- TachiyomiAT still manages a local translation queue through `TranslationManager` and local `Translation` state objects.
- Current progress and status reporting are local concepts such as `QUEUE`, `TRANSLATING`, `TRANSLATED`, and `ERROR`, not backend job lifecycle states.
- The app still reads/writes final chapter translation files locally and does not yet have backend job IDs, polling state, retry actions, or support-facing error correlation.
- That means Phase 13 should not assume support can jump directly from an app screen to a backend job record yet.

## Keep Vs Replace

Keep:

- The existing `pino` logger and request/procedure logging foundation.
- The protected `/manager` shell and the reusable manager table/filter UI patterns.
- Existing server-side permission enforcement.

Replace or add:

- Starter manager navigation with operator-focused sections such as `jobs`, `providers`, and `operations`.
- Generic logs with explicit job lifecycle events, provider result summaries, and structured failure metadata.
- Ad-hoc operational diagnosis with first-class job detail, retry, cancellation, and cost visibility.

## First Slice Implemented

- Added manager navigation entries for `Jobs` and `Providers`.
- Added a jobs list page with search, status filters, token/page counts, and timing summaries.
- Added a job detail page with related license/device links, lifecycle summary, assets, provider usages, token ledger context, and raw error/result payload visibility.
- Added a provider ops page with recent failure summaries, provider/stage health summaries, and recent cost/latency reporting.
- Added protected backend router support for job read-side operations and provider ops summaries.
- Kept this slice read-only and internal-only, matching the current mobile constraint that TachiyomiAT still has no hosted support/debug UX.

## Detailed Tasks

- Add manager sections for `jobs` and `provider ops`, replacing the assumption that the starter manager IA is sufficient.
- Extend the first jobs dashboard with stronger filtering for completion time, source provider(s), and failure class.
- Extend the job detail page with explicit retry history, richer upload metadata, and order linkage where available.
- Define a normalized backend job state model that operators can understand, even if the internal worker pipeline has more granular sub-states.
- Capture an explicit event trail for each job, such as `uploaded`, `validated`, `queued`, `ocr_started`, `ocr_failed`, `translation_started`, `translation_failed`, `completed`, `cancelled`, and `refund_reviewed`.
- Add safe operator actions for retry, cancel, and refund review, with clear rules about when each action is allowed and how token ledger corrections should be triggered.
- Add provider health summaries based on recent failures, latency, timeout rate, and fallback usage, at minimum for OCR and translation providers separately.
- Add usage and cost reporting per provider, model, and workflow stage so pricing decisions can later be based on observed cost concentration.
- Extend structured logging so logs and job records share stable correlation identifiers such as job ID, device ID, license ID, request ID, and provider call ID where available.
- Add alerting hooks or at least machine-usable log patterns for repeated provider failures, queue backlog growth, storage failures, and abnormal completion-rate drops.
- Define operator playbooks for provider outage, storage failure, webhook backlog side effects, and stuck-job recovery.
- Add dashboards or saved queries for daily volume, completion rate, median duration, retry rate, provider fallback rate, and average job cost.
- Handle data-retention boundaries explicitly so raw payloads, provider traces, and user-visible result metadata do not all share the same retention policy.

## Outputs

- First jobs monitoring UI.
- First provider operations visibility.
- First operational playbooks.
- Structured operational events and correlation strategy.

## Not Part Of Phase 13

- End-user mobile UX for activation, token balance, hosted submission, or job polling. That belongs to Phase 14.
- The initial worker/job pipeline implementation itself. That belongs to Phase 11.
- Core provider adapter implementation and normalization. That belongs to Phase 10.
- Commerce and license support screens such as orders, redeem codes, and manual grants. Those belong to Phase 12.

## Done When

- Operators can find failed or stuck jobs quickly and see a coherent lifecycle trail.
- Support and engineering can distinguish provider failures, storage/runtime failures, and business-rule failures such as empty balances or revoked devices.
- Retry, cancel, and refund-review actions are constrained, audited, and understandable from the UI.
- Job and provider metrics are good enough to support outage response and later pricing reviews.
