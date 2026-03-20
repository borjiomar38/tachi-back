# Phase 11 - Job Pipeline And Storage

## Objective

Process chapter translation asynchronously so the mobile app can submit work and poll for results.

## Validation Summary

This phase is confirmed as necessary after reviewing both repositories.

### Confirmed Current State In `tachi-back`

- The backend still has no job runner, queue system, or worker entrypoint today.
- There are no queue or background-processing dependencies in the current package setup.
- The current upload path is still the starter `bookCover` flow, protected by admin auth and designed for browser UI, not for mobile chapter submission.
- `tachi-back` already has usable storage foundations:
  MinIO/S3 wiring
  a general upload route
  and environment-backed object storage configuration.
- This means Phase 11 must introduce the first real mobile/job upload contract and worker execution path, rather than trying to stretch the existing manager upload flow.

### Confirmed Constraints From TachiyomiAT Mobile

- TachiyomiAT currently processes chapter translation locally as an async pipeline:
  load chapter pages from disk or archive
  OCR each page
  translate in batches
  and save one JSON file per chapter.
- The app preserves page identity by original filename and natural page order when reading chapter images.
- The saved translation artifact is effectively a `Map<String, PageTranslation>` keyed by page filename, and later reader rendering expects the same page/block geometry contract.
- The app currently supports chapters stored either as folders of images or archive files.
- There is still no hosted mobile upload client, polling client, or result-download flow yet, so Phase 11 must define contracts that Android can implement later without losing parity with the current local result format.

## Keep vs Replace

### Keep In Phase 11

- Object storage as the backing store for raw uploads and result artifacts.
- A final result shape that stays close to the current chapter translation JSON contract used by TachiyomiAT.
- Explicit token reservation and refund behavior instead of implicit balance mutation.

### Add Or Tighten In Phase 11

- Add a real job state machine and worker model.
- Add a mobile-friendly upload strategy instead of reusing the admin `bookCover` route as-is.
- Add storage lifecycle rules for raw pages, intermediate artifacts, and final result manifests.
- The first implementation slice can use authenticated server-mediated page uploads and inline processing, as long as it preserves the later path toward a dedicated worker.

## Detailed Tasks

- Design the translation job lifecycle explicitly.
- The states should cover at least:
  created
  uploading
  queued
  processing
  completed
  failed
  canceled
  and refunded or refund-pending if refunds are tracked separately.
- Decide whether upload completion is represented as:
  a single manifest-confirmed transition
  or page-by-page upload progress.
  Keep the first version simple but durable.
- Define the chapter upload contract.
- Preserve original page filenames and natural order, because the Android app currently keys translation results by filename and expects stable page identity.
- Decide what the client sends before upload begins:
  chapter/job metadata
  declared page count
  source and target languages
  OCR/translation profile hints if any
  and installation/license context from prior phases.
- Decide whether uploads go directly to storage with signed URLs or pass through the app server first.
  Given the current repo only has browser-oriented upload helpers and no mobile upload path yet, document the first implementation choice clearly.
  A server-mediated first version may be simpler to ship; signed uploads may scale better later.
- Do not assume the current `bookCover` upload route can be reused unchanged for mobile chapter uploads.
- Add a job manifest model or equivalent metadata structure that records:
  job ID
  page filenames and order
  upload completion
  artifact keys
  and processing status.
- Build a worker flow that:
  reads uploaded pages in the declared order
  runs OCR
  builds translation batches
  calls provider adapters from Phase 10
  and writes final result artifacts.
- Keep worker execution idempotent enough that a retry does not double-charge tokens or corrupt result state.
- Decide how work is triggered.
  For example:
  inline enqueue in the app server with DB-backed polling
  or a separate worker process/runner.
  Document the first production-safe approach.
- Add token reservation before expensive processing starts.
- Decide the exact reservation point.
  Prefer reserving only after upload is complete and the job is valid enough to enter processing, not at the first incomplete client request.
- Finalize token spend only when the job reaches a real success state.
- Refund or release reserved tokens on failure, cancellation, or unrecoverable validation problems.
- Persist final result files and structured metadata needed by the Android app.
- Keep the final result contract close to the app’s current chapter JSON:
  page filename -> `PageTranslation`
  with image dimensions, source/target language, translator type, and block geometry preserved.
- Decide whether intermediate OCR outputs, provider raw responses, and debug artifacts are stored.
  If they are, define retention and access rules explicitly.
- Add polling endpoints for:
  job creation acknowledgment
  job status
  progress
  final result availability
  and terminal failure reasons.
- Ensure failure reasons are stable enough for later Android UX and support tooling.
- Add cleanup rules for raw uploads, temporary OCR artifacts, failed partial outputs, and completed result retention.
- Define retention separately for:
  raw uploaded images
  final translated result manifests
  and operational metadata.
- Add retry rules for transient provider failures and clear terminal states for non-retryable failures.
- Decide whether failed jobs can be resumed from partial page/OCR state or must restart from the beginning.
- Add tests for:
  job state transitions
  token reservation/release behavior
  upload completion validation
  result manifest generation
  and duplicate/retried worker execution.

## Outputs

- Async chapter processing pipeline.
- Upload and result storage strategy.
- Token reservation and refund logic.
- Result artifacts compatible with TachiyomiAT’s current chapter translation format.

## Done When

- The mobile app can submit a chapter, poll status, and fetch finished results.
- Failed jobs do not silently burn tokens.
- Raw uploads have a documented retention and deletion policy.
- Page identity and order are preserved from upload through final result manifest.
- The job pipeline does not depend on admin-only upload/auth code paths.

## Not Part Of Phase 11

- Provider adapter implementation details beyond what Phase 10 already defined
- Backoffice job dashboards and operator UI
- Full Android hosted-engine UI rollout
