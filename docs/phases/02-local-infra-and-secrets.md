# Phase 02 - Local Infra And Secrets

## Objective

Define the environment contract and local infrastructure needed to build and run Tachiyomi Back safely.

## Validation Summary

This phase is confirmed as necessary after reviewing both repositories.

### Confirmed Current State In `tachi-back`

- `tachi-back` already has a typed env layer in `src/env/server.ts` and `src/env/client.ts`.
- Local Docker infrastructure already exists for Postgres, MinIO, and Maildev in `docker-compose.yml`.
- S3/MinIO access is already wired through `src/server/s3.ts`.
- The current upload route is still tied to starter demo content and only exposes a `bookCover` upload path.
- There is no worker process, queue service, or separate job runner scaffold yet.
- The current `.env.example` only covers auth, database, S3, GitHub login, and logging.
- There are no env variables yet for Stripe, OCR providers, translation providers, mobile API signing, or job-processing behavior.

### Confirmed Constraints From TachiyomiAT Mobile

- The Android app currently stores provider keys locally and exposes them in settings.
- The Android app still calls provider APIs directly for Google Cloud Vision, Gemini, OpenAI, and OpenRouter-based flows.
- There is no existing Tachiyomi Back base URL, mobile API token, or redeem/session env contract in the Android app yet.
- Phase 02 must prepare the backend secret model for hosted OCR and translation, but it must not yet try to integrate Android requests.
- After hosted mode is introduced, provider secrets must exist only on the backend and never in mobile settings or client env.

## Keep vs Extend

### Keep In Phase 02

- Existing typed env validation in `src/env/server.ts` and `src/env/client.ts`.
- Existing Docker Compose services for Postgres, MinIO, Maildev, and bucket bootstrap.
- Existing shared DB, S3, logger, and auth env validation patterns.

### Extend In Phase 02

- `.env.example` sections for payments, provider APIs, mobile API auth, storage separation, and future worker settings.
- Server env validation for every new backend-only secret.
- Documentation that separates admin-web variables from server-only variables.
- A documented decision on whether jobs run inside the main app process for now or via a future worker process.

## Detailed Tasks

- Review `.env`, `.env.example`, Docker Compose, and typed env validation in `src/env`.
- Confirm which current env variables are starter leftovers and mark them for rename or replacement.
- Add environment variable sections for:
  `payments`, `providers`, `mobile-api`, `storage`, `jobs`, and `observability`.
- Add placeholders for Stripe keys and webhook verification:
  `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PUBLIC_KEY`, and optional product/price mapping variables if you do not store all mappings in the database.
- Add placeholders for server-only provider credentials:
  Google Cloud Vision, Gemini, OpenAI, and Anthropic.
- Add placeholders for a backend-issued mobile auth secret such as `MOBILE_API_JWT_SECRET` or equivalent signed-session secret.
- Add placeholders for the future TachiyomiAT backend URL contract, but keep them server-only until Android integration begins.
- Add placeholders for object storage bucket separation such as uploads, results, and optional logs instead of assuming one generic bucket forever.
- Decide whether early translation jobs will run inside the main app process or through a dedicated worker. The interim choice for this repo is `JOB_RUNTIME_MODE=inline` because no worker scaffolding exists yet.
- Add env validation so startup fails fast when required server secrets are missing and optional integrations stay truly optional.
- Keep secrets out of `VITE_` variables unless the value is intentionally public.
- Review `AUTH_TRUSTED_ORIGINS` and document that its current template value is only a placeholder until the real Android trusted origin or app scheme is defined.
- Review Docker Compose and confirm that Postgres, MinIO, and Maildev are sufficient for early local development, while Stripe webhooks and provider calls can use remote services or CLI tunnels.
- Document the current upload/storage limitation that the only wired upload route is still `bookCover`, which will need replacement after Phase 01 cleanup.
- Add a short secrets policy in docs covering who can access production keys, where they will be stored, and which keys must never be shared with mobile or browser clients.

## Outputs

- Stable `.env.example` contract.
- Typed server and client env validation.
- Local infrastructure documentation for developers.
- A documented backend-only secret boundary for payments and providers.
- A documented interim runtime decision for background job execution.

## Done When

- A new developer can run local infra without guessing missing variables.
- The app refuses to boot when required server secrets are missing.
- Provider credentials are planned as server-only secrets, never browser or mobile secrets.
- The repo has explicit env placeholders for Stripe, provider gateways, storage buckets, and mobile session signing.
- There is a written decision on job execution strategy for early phases.
- Client env only exposes intentionally public values; no private backend secret leaks into `VITE_` variables.

## Not Part Of Phase 02

- Implementing Stripe payments
- Implementing provider gateway clients
- Implementing translation jobs
- Integrating Android with backend APIs
- Finalizing production deployment platform choice
