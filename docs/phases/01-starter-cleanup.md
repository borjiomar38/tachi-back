# Phase 01 - Starter Cleanup

## Objective

Turn the imported Start UI starter into a clean Tachiyomi Back base before real feature work starts.

## Validation Summary

This phase is confirmed as necessary after reviewing both repositories.

### Confirmed Starter Remnants In `tachi-back`

- Package metadata still points to the imported template in `package.json`.
- The main README is still the Start UI starter README.
- Public branding still says `Start UI` in the manifest, page title helpers, logo, and email footer.
- The Prisma schema still contains demo business models: `Book`, `Author`, `Genre`, and `Publisher`.
- The server router still exposes demo routers for `book` and `genre`.
- Demo features, demo locales, and demo manager/app pages are still wired into the app shell.
- Prisma seed data still creates demo books and genres.

### Confirmed Constraints From TachiyomiAT Mobile

- The Android app currently expects local engines and local provider keys in `TextTranslators` and `TranslationPreferences`.
- The backend is not yet integrated into the mobile app, so Phase 01 must not attempt API contract changes for Android.
- The future backend will need to support a hosted engine path, but Phase 01 only needs to preserve reusable backend foundations: auth, env handling, DB access, upload/storage utilities, API routing, and manager shell.

## Keep vs Remove

### Keep In Phase 01

- `src/server/auth.tsx` and the Better Auth setup for internal admin access.
- `src/routes/login/**`, `src/routes/logout.tsx`, and manager auth guards.
- `src/server/db/**`, `src/server/s3.ts`, `src/server/openapi.ts`, `src/server/orpc.ts`, and shared env validation.
- `src/routes/api/**` route plumbing, even if some handlers will be replaced later.
- `src/routes/manager/users/**`, `src/features/user/**`, and admin account management scaffolding as a temporary internal admin base.

### Remove Or Replace In Phase 01

- `src/routes/app/books/**`
- `src/routes/manager/books/**`
- `src/features/book/**`
- `src/features/genre/**`
- `src/features/demo/**`
- `src/features/home/app/page-home.tsx` if it still exists only to render demo content
- `src/server/routers/book.ts`
- `src/server/routers/genre.ts`
- `src/server/routers/book.unit.spec.ts`
- `src/server/routers/genre.unit.spec.ts`
- `src/server/upload/book-cover.ts`
- `prisma/seed/book.ts`
- `prisma/seed/book-data.json`
- Demo locale namespaces and imports that only exist for starter content

## Detailed Tasks

- Rename visible product naming from `Start UI` and `start-ui-web` to `tachi-back` or a temporary Tachiyomi Back brand name.
- Update `package.json` metadata so the package name, description, homepage, repository, and issue tracker no longer point at the upstream starter.
- Replace the starter README with a project-specific README covering local setup, current scope, retained stack pieces, and the roadmap location.
- Replace public branding references in `public/site.webmanifest`, page-title helpers, logos, email footer, and visible UI copy that still says `Start UI`.
- Remove starter business domain code for books, authors, genres, publishers, and any demo content that has nothing to do with payments, licenses, devices, tokens, providers, or translation jobs.
- Remove or archive starter routes that will confuse the next phases, especially `src/routes/app/books`, `src/routes/manager/books`, and pages that only render demo content.
- Remove starter server routers and unit tests for books and genres so the API surface stops advertising irrelevant business objects.
- Remove starter upload handlers tied only to the book demo flow.
- Remove starter Prisma models that are only demo content and keep auth-related models plus any real Tachiyomi Back placeholders you decide to introduce immediately after cleanup.
- Remove starter seed logic for books and genres and keep only admin/auth seed logic that is still useful.
- Replace starter locale strings and locale namespace imports that reference books, demos, or Start UI marketing copy.
- Regenerate the route tree and Prisma client after cleanup so generated files stop referencing removed routes and models.
- Keep Better Auth, oRPC, OpenAPI, Prisma, S3/MinIO wiring, and manager shell structure because those are still useful foundations for later phases.
- Explicitly document that mobile end-user authentication will not use the current Better Auth flow; Better Auth is retained here for internal backoffice admins only.
- Keep the `docs/phases` entry point so the repo has a clear product direction from day one.

## Outputs

- A cleaned project with no demo business entities left.
- A project README that describes Tachiyomi Back, not Start UI.
- A repo structure ready for payment, license, device, and job features.
- A clear boundary between retained technical scaffolding and removed starter business logic.

## Done When

- There are no visible `book` CRUD flows or demo marketing widgets in the UI.
- The server router no longer exposes `book` or `genre` APIs.
- The Prisma schema only contains auth models plus real Tachiyomi Back models or deliberate placeholders.
- Prisma seed no longer creates demo books or genres.
- Generated route and Prisma files have been refreshed after the cleanup.
- New contributors can clone the repo and understand the product scope, kept foundations, and next phases from the README and docs.

## Not Part Of Phase 01

- Stripe integration
- Token ledger implementation
- License or device activation flows
- OCR or translation provider proxying
- Android API integration
