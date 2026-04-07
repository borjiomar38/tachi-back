# Task 02: Production Hosted Translation End-to-End

> Updated: 2026-04-07

## Objective

Prove the live production mobile contract end to end, from redeem activation to
successful translated result delivery, for both supported runtime translation
providers.

## Why

This is the core proof that the hosted backend is usable in production and that
admin-side provider switching actually changes live job execution.

## Current State

### Already true in production

- [x] Mobile API is enabled
- [x] mobile JWT secret is configured
- [x] redeem activation path is live
- [x] OCR env is configured
- [x] Gemini env is configured
- [x] OpenAI env is configured
- [x] default translation provider env exists
- [x] Android app is fixed to hosted mode and fixed backend URL
- [x] runtime provider config backend changes are deployed
- [x] runtime config DB migration is applied
- [x] one real production translation run succeeded with `gemini`
- [x] one real production translation run succeeded with `openai`

### Live production evidence captured on 2026-04-07

- `gemini` validation job: `cmnopw22a0006jv04cx6awbia`
- `openai` validation job: `cmnopxl3m000ojv041yiuuul8`
- both jobs completed on `https://tachi-back.vercel.app`
- both jobs reserved `5` tokens and spent `5` tokens
- both result manifests returned `200`
- runtime config was restored to `gemini` after the `openai` validation run

### Important production caveats discovered during validation

- Production object storage env is still placeholder/localhost, so production is
  currently relying on the inline storage fallback introduced in the backend.
- `GOOGLE_CLOUD_VISION_API_KEY` exists in production, but the actual Google
  Cloud Vision API is disabled for the configured Google project.
- Because of that, production OCR currently falls back to Gemini OCR at runtime
  when Google Vision fails.
- Manual support grants currently have a bug if `redeemCodeExpiresAt: null` is
  passed. `z.coerce.date().optional()` coerces that `null` to
  `1970-01-01T00:00:00.000Z`, which makes the redeem immediately unavailable.
  For this validation, the field had to be omitted entirely.

## What

Validate:

1. redeem activation
2. session creation
3. job creation
4. upload
5. OCR
6. translation
7. token reserve/spend
8. result delivery to the app

## Where

### Backend auth

- `src/routes/api/mobile/auth/activate.ts`
- `src/routes/api/mobile/auth/refresh.ts`
- `src/server/mobile-auth/session.ts`

### Backend jobs

- `src/server/jobs/service.ts`
- `src/server/provider-gateway/translation.ts`
- `src/server/provider-gateway/manifest.ts`

### Android

- `../TachiyomiAT/domain/src/main/java/tachiyomi/domain/translation/TranslationPreferences.kt`
- `../TachiyomiAT/app/src/main/java/eu/kanade/translation/hosted/TachiyomiBackClient.kt`
- `../TachiyomiAT/app/src/main/java/eu/kanade/presentation/more/settings/screen/SettingsTranslationScreen.kt`

## How

### Validation method used

This task was validated against the live production mobile HTTP contract using
the same endpoints and payload shape as the Android app:

1. create a fresh production redeem/license grant
2. activate hosted access through `/api/mobile/auth/activate`
3. confirm session through `/api/mobile/auth/session`
4. create a job through `/api/mobile/jobs`
5. upload a real PNG page
6. complete the upload phase
7. poll job status until `completed`
8. fetch `/api/mobile/jobs/$jobId/result`
9. inspect `translation_jobs`, `provider_usages`, and `token_ledger` in the
   production database

### Validation image

- file: `../TachiyomiAT/.github/assets/gemini.png`
- checksum: `de15f000c70571d3555eface58d8ab16bdb571e3eba5f5057e442bebde1da106`
- size: `1231441` bytes

## Checklist

### Redeem and auth

- [x] Use a fresh production redeem code
- [x] Activate successfully
- [x] Confirm session summary loads

### Translation flow: `gemini`

- [x] Set runtime config to `gemini`
- [x] Translate one small page in production
- [x] Confirm job completes
- [x] Confirm result manifest returns successfully
- [x] Confirm provider usage shows `gemini` for translation
- [x] Confirm token reserve/spend entries are correct

### Provider switch validation

- [x] Switch runtime config to `openai`
- [x] Translate another small page in production
- [x] Confirm provider usage shows `openai`
- [x] Confirm result still returns correctly
- [x] Restore production default back to `gemini`

### Error handling UX

- [x] Invalid redeem shows clear activation error
- [ ] Missing or revoked session opens hosted prompt
- [ ] Insufficient token state opens hosted prompt
- [ ] Buy-tokens CTA opens Tachi Back pricing

## Risks

- manager UI save/load was not used for this validation; provider switching was
  done through the persisted runtime config directly in production DB
- production OCR success currently depends on the Gemini fallback because
  Google Vision is not actually enabled server-side
- production uploads currently depend on the inline storage fallback because
  object storage env is not configured with a real reachable host
- fresh redeem codes created for this task are consumed during validation and
  should not be reused
- the manual-grant null-expiry bug can generate false-negative activation
  failures during support testing

## Exit Criteria

- [x] one successful `gemini` translation in production
- [x] one successful `openai` translation in production
- [ ] manager UI reflects the selected provider/model through authenticated save
      and reload

## Result

Task 02 is complete at the backend/mobile-contract level.

What is proven:

- production redeem activation works
- production hosted session issuance works
- production upload and processing works
- production token reserve/spend works
- production result delivery works
- admin runtime provider choice affects live translation execution

What is intentionally left to other tasks:

- authenticated manager UI validation belongs to Task 01
- object storage cleanup and Google Vision enablement are production infra
  follow-ups, not blockers for the validated fallback path
- Android reader-side UX smoke after the backend fix remains recommended, but
  it is no longer a backend blocker
