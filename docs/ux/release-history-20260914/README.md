# Release history — local verification, 14 September 2026

The existing `/manager/versions` page now includes a release-notes section, independently of installed-version statistics. The section uses the protected `mobileRelease.list` ORPC procedure (device-read permission), descending keyset pagination, FR/EN interface labels, and per-release locale selection including RTL content.

## Visual evidence

- `target.png`: built-in ImageGen proposal based on the existing real backoffice capture `docs/ux/device-visited-content-implemented-20260719.png`.
- `implementation-desktop.png`: real Chromium render of the implemented component at 1100×800 with isolated release fixtures.
- `implementation-mobile.png`: real Chromium render at 390×844. Language controls wrap, text stays within the viewport.

Compared with the target: same hierarchy, dark cards, inline desktop language controls and purple selection. The implementation keeps the project's existing typography scale, card background and responsive tokens. These are component QA captures, not screenshots of a deployed or authenticated production page.

## Persistence and tests

- Prisma created migration `20260914120842_mobile_release_history` using `pnpm prisma migrate dev --name mobile_release_history --create-only`, then applied it only to the isolated PostgreSQL database at `127.0.0.1:55439/nayovi_release_history_utf8`.
- Real PostgreSQL test: five concurrent identical registrations produce one row; conflicting content cannot overwrite it; all FR/AR text survives JSONB roundtrip; retries preserve the first publication timestamp. Reusable local-only check: `scripts/test-mobile-release-history.ts` with an explicit generated release-information file.
- 38 targeted backend unit tests and 4 Chromium component tests pass; TypeScript check passes.
- UI tests cover FR/EN/AR switching, empty history, next-page loading, published vs pending, refresh errors retaining existing content, and mobile width.

## Deployment boundary

No production database, R2 policy or GitHub release was modified. Apply the migration and deploy the backend only with production authorization, before a new release with metadata. Version codes 54+ require `releaseInfo`; older policy payloads remain usable for rollback. Archived notes are immutable and are never deleted during a policy rollback. A failed R2 write leaves a pending history entry; uncertain publication confirmation requires readback/retry or rollback.

Historical releases are not automatically fabricated/backfilled. The JSON is the version-controlled authoring source; the database is the durable publication history.

## Image generation prompt

Built-in ImageGen, no API/CLI fallback. Prompt:

Use case: ui-mockup. Create a high-fidelity desktop PNG target for Nayovi backoffice Release notes history component. Reference image is the real existing dark backoffice: keep charcoal cards, subtle gray borders, white Inter-like typography, small purple accents. Frame only a full-width content section at 1100x750, not sidebar. Header 'Notes de publication', subtitle 'Nouveautés archivées par version, indépendamment des installations.' Right small 'Actualiser' button. Below an expanded bordered card: left heading '0.17.44 · Build 54', small badge 'Publication en attente', right inline language buttons 'EN' 'FR' 'AR' with FR selected. Small metadata 'android · standard-release'. Inside: heading 'Une lecture plus fluide'; summary 'Une bibliothèque plus légère, des mises à jour progressives et des actions plus réactives.' Three plain stacked highlights: 'Library et Updates plus fluides' / 'Les chapitres apparaissent progressivement, sans attendre toutes les métadonnées.'; 'Téléchargements réactifs' / 'La demande est prise en compte tout de suite et reste annulable.'; 'Lecture des chapitres traduits' / 'Correction du blocage observé lors de la lecture du chapitre traduit.' Footer subtle text 'Les anciennes versions sans notes archivées ne sont pas reconstituées automatiquement.' Keep layout compact professional with 24px card padding, 16px body and 20px title, no decorative graphics, no invented additional features.
