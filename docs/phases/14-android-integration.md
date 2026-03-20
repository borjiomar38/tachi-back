# Phase 14 - Android Integration

## Objective

Connect TachiyomiAT to Tachiyomi Back with a hosted engine flow while preserving a safe rollout path.

## Validation Summary

Phase 14 is valid, and the first implementation slice now exists in TachiyomiAT. The doc needed to be updated because parts of it still described Android integration as hypothetical and parts of the backend state were outdated.

The main corrections are:

- TachiyomiAT currently selects local OCR and translation providers directly from `TextTranslators` and `ChapterTranslator`, so the hosted path should be introduced as a distinct engine mode rather than scattered across existing local-engine branches.
- TachiyomiAT already has preference primitives for app-state and private values, and backup creation already excludes app-state keys by default. Phase 14 should use those explicitly for installation IDs and mobile session material.
- The app already has OkHttp-based network infrastructure and interceptor patterns, so the backend client should follow that model instead of inventing a separate networking stack.
- `tachi-back` already exposes the mobile activation, refresh, session, and job endpoints introduced in earlier phases, so Phase 14 is now the Android consumption layer of those contracts rather than a placeholder future phase.
- Launch hardening, rate limiting, abuse controls, and production readiness still belong to Phase 15.

## Confirmed Current State In `tachi-back`

- The internal router now includes `account`, `config`, `device`, `job`, `license`, `provider`, and `user`, which is consistent with the current backoffice and operations surface.
- The backend already exposes the mobile routes required for Android integration, including activation, refresh, session summary, heartbeat, job creation, page upload, upload completion, job status, and result download.
- This means Phase 14 should stay focused on Android consumption and rollout behavior, not on redefining the backend contracts already implemented in earlier phases.

## Confirmed Constraints From TachiyomiAT Mobile

- Translation engine selection is still centered on `TextTranslators`, and the chapter pipeline directly instantiates local OCR and translation engines from preferences.
- The translation settings screen still exposes direct provider-key entry for Gemini, OpenAI, OpenRouter, and Google Cloud.
- The app already has shared preference support for `appStateKey(...)` and `privateKey(...)`, and backup creation excludes app-state keys and optionally excludes private keys.
- The app already has central OkHttp infrastructure plus existing bearer-token interceptor patterns that can be reused for a Tachiyomi Back client.
- The app still stores final translation results locally and reads them back as chapter translation files, so the hosted integration should preserve that downstream reader contract.

## Current Implementation Status

The first real Phase 14 slice is now implemented.

Included in this slice:

- a distinct `Tachiyomi Back [TOKENS]` translation engine option
- hosted-mode preferences for base URL, redeem code, installation identity, device-bound session tokens, and hosted metadata
- a dedicated Android `TachiyomiBackClient` using the existing OkHttp stack
- activation, refresh, session-summary, job-creation, page-upload, completion, status-polling, and result-download calls
- hosted chapter submission integrated into `ChapterTranslator`
- hosted result materialization back into the same local translation JSON shape consumed by the reader
- settings UI for hosted activation, status refresh, session clearing, and installation-ID visibility
- safety gating so hosted mode does not try to use local OCR settings, local provider keys, or manga-context refresh paths that are not supported yet

Still missing inside Phase 14:

- hosted review mode
- richer Android UX for license/device details outside the settings screen
- stronger in-app recovery flows for revoked sessions, upload failures, and partial job failures
- final standard-flavor validation while the repo still has a debug Google Services mismatch for `app.kanade.tachiyomi.at.debug`

## Keep Vs Replace

Keep:

- The existing translation queue, reader overlay, and final local translation-file consumption model.
- Existing network infrastructure based on `NetworkHelper`, `OkHttpClient`, and interceptors.
- Existing local OCR and translation engines during rollout so hosted mode can be enabled gradually.

Replace or add:

- Add a distinct hosted OCR plus translation engine path instead of baking backend conditionals into every current local engine.
- Add dedicated mobile preferences for installation identity, device-bound session state, and hosted-service metadata.
- Add a dedicated Tachiyomi Back API client and session interceptor.
- Gate or hide provider-key entry fields when the hosted engine is selected so the UX does not mix self-managed keys with paid hosted usage.

## Detailed Tasks

- Add a distinct hosted engine option in the Android translation engine model so Tachiyomi Back is selected intentionally and does not overload the semantics of Gemini/OpenAI/Cloud Translate local modes.
- Refactor the translation settings UI so hosted mode presents activation/balance/device information, while local modes continue to expose provider-key and model configuration.
- Add app-side installation ID generation and persist it with an app-state key so backup/restore does not clone a device identity across installations.
- Add dedicated storage for mobile access/refresh/session values using private or otherwise non-user-facing keys, with clear refresh/revoke behavior.
- Build a dedicated Tachiyomi Back API client on top of the app’s existing OkHttp stack, including a bearer/session interceptor and consistent error parsing.
- Add API calls for activation, session refresh if applicable, license summary, token balance, create job, upload pages, poll status, and download result.
- Integrate hosted submission into the current chapter translation workflow without breaking the local queue UX; the user should still see familiar queue/progress concepts even if the backend performs the heavy work.
- Preserve the current final result contract used by the reader by materializing hosted results back into the same local chapter translation file shape that TachiyomiAT already consumes.
- Add activation UI for redeem code entry, license summary, token balance, and device status.
- Add user-facing errors for invalid redeem code, revoked device, no tokens, expired session, upload failure, backend timeout, and provider outage.
- Keep existing local engines available behind a clear distinction during migration so hosted flow rollout can be staged and debugged safely.
- Remove or hide plans to expose provider keys when the hosted engine is selected, so the UX does not imply users must bring their own keys for paid hosted mode.
- Add app and backend correlation metadata to logs where possible, such as installation ID, job ID, and request ID, so first-line failures can be debugged across both systems.
- Write a migration note for users who currently configure their own provider keys and need to understand the difference between local mode and hosted mode.

## Outputs

- First hosted engine integration in TachiyomiAT.
- First activation and status UI in settings.
- End-to-end hosted chapter submission from app to backend and back to the local reader contract.
- Safe rollout path that preserves existing local modes.

## Not Part Of Phase 14

- Production hardening items such as abuse controls, rate limits, privacy review, staging/production release checklists, and final launch policy. Those belong to Phase 15.
- Backoffice support screens and operator dashboards. Those belong to Phases 12 and 13.
- Initial backend schema, payments, activation protocol, provider adapters, and job pipeline design. Those belong to earlier phases and should already exist before Android integration starts.

## Done When

- A tester can pay, redeem, submit a chapter, and read the returned translation without configuring external provider keys.
- App logs and backend logs can be correlated for failed jobs using stable identifiers.
- Hosted flow can be enabled gradually without breaking existing local modes or the current reader translation contract.
