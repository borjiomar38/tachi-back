# Phase 10 - OCR And Translation Provider Gateway

## Objective

Move OCR and translation provider usage fully to the backend and normalize their behavior behind one server contract.

## Validation Summary

This phase is confirmed as necessary after reviewing both repositories.

### Confirmed Current State In `tachi-back`

- The backend env contract already includes provider secret placeholders, but there is still no runtime gateway layer using them yet.
- `ProviderUsage` and `TranslationJob` already exist in the schema, so this phase can add usage helpers and normalized provider contracts without redesigning the database first.
- The current upload and job runtime are still not the translation pipeline, so this phase should focus on provider adapters, normalization, and secret handling, not on async chapter processing or result storage orchestration.

### Confirmed Constraints From TachiyomiAT Mobile

- TachiyomiAT still performs OCR and translation directly on-device or directly against third-party providers today.
- OCR and rendering are tightly coupled to the app’s real page payload shape:
  page image width and height
  source and target language
  translator type
  and block geometry including `x`, `y`, `width`, `height`, `symWidth`, `symHeight`, and `angle`.
- The current AI translators operate on batches of OCR block text encoded as JSON and expect JSON back, while geometry stays attached to each block in the app.
- The current OCR path prefers Google Cloud Vision because it provides structured block coordinates that are suitable for overlay rendering.
- The app still has legacy/local engine concerns such as MLKit, Google Cloud Translation, and OpenRouter, but the hosted backend direction is server-owned OCR plus translation with provider secrets removed from the app.

## Keep vs Replace

### Keep In Phase 10

- Google Cloud Vision as the primary OCR reference path for hosted mode.
- A normalized page/block data contract that stays compatible with TachiyomiAT rendering needs.
- The idea of provider-specific prompts and optional manga-context enrichment.

### Add Or Tighten In Phase 10

- Add backend provider adapter modules.
- Add provider-specific error normalization and retry policy.
- Add prompt and model version tracking.
- Add explicit launch-scope decisions for which translation providers are first-class versus optional compatibility adapters.

### Launch Decision For This Phase

- Primary hosted OCR provider: Google Cloud Vision
- Primary hosted translation providers: Gemini, OpenAI, Anthropic
- Compatibility-only placeholders for later review: Google Cloud Translation, OpenRouter

## Detailed Tasks

- Decide the launch provider set explicitly.
- Keep Google Cloud Vision as the primary OCR provider for hosted mode.
- For translation, prioritize direct first-class adapters for Gemini, OpenAI, and Anthropic because those match the intended hosted product direction.
- Decide whether Google Cloud Translation and OpenRouter are:
  launch providers
  temporary compatibility adapters
  or intentionally excluded from hosted mode.
  Document that choice instead of leaving it implicit.
- Add server env validation for every enabled provider secret and model/config input.
- Move all hosted provider keys to server env and remove any hosted-flow assumption that the app will keep provider secrets.
- Create provider client modules for the enabled OCR and translation providers.
- Define a normalized OCR result shape that preserves what the Android app actually needs:
  page dimensions
  detected source language
  source text
  and block geometry including coordinates and symbol sizing.
- Keep the normalized OCR shape close enough to `PageTranslation` and `TranslationBlock` that Android integration does not need a lossy transform later.
- Define a normalized translation result shape that preserves:
  translated text by block
  provider
  model
  token or character usage where available
  finish reason or stop reason
  latency
  and any provider request identifiers useful for debugging.
- Keep translation normalization separate from OCR normalization.
  Translation providers mostly operate on arrays of block text, not on visual coordinates directly.
- Add prompt-building utilities on the backend instead of scattering prompt strings across provider adapters.
- Version translation prompts explicitly so behavior changes can be traced and rolled back later.
- Decide whether manga-context enrichment is part of the hosted pipeline from day one.
  If yes, treat it as a reusable helper with its own prompt version and provider-usage tracking.
  If not, document it as a later extension.
- Add provider timeout, retry, and backoff rules.
- Distinguish retryable failures from non-retryable failures:
  rate limits
  transient upstream/network failures
  malformed model output
  auth/config errors
  quota exhaustion
  and content/policy blocks.
- Add provider error normalization so the rest of the backend sees stable internal categories instead of raw vendor-specific failures.
- Track provider usage and estimated cost in `ProviderUsage` or the equivalent schema introduced earlier.
- Capture enough data to support pricing review later without storing unnecessary sensitive payloads.
- Decide whether to store raw prompts, raw model responses, redacted excerpts, or only metadata.
  Keep privacy and retention concerns explicit.
- Preserve a place for watermark-removal or content-cleanup rules if you want parity with current AI translation behavior, but do not let that leak into the OCR geometry contract.
- Add tests for:
  OCR normalization
  translation result normalization
  malformed provider JSON
  timeout/rate-limit mapping
  and provider selection/fallback behavior.
- If you want full-page vision fallback or multimodal page translation later, document it as an extension point.
  Do not let that turn Phase 10 into the full worker/job pipeline.

## Outputs

- Unified provider gateway.
- Server-only provider secrets.
- Usage and cost tracking foundation.
- Normalized OCR and translation contracts compatible with TachiyomiAT rendering.

## Done When

- The backend can OCR and translate a page without any provider secret in the app.
- Provider failures return clean internal error categories.
- Usage data is captured per provider and model.
- OCR normalization preserves the geometry and metadata the Android app needs for overlay rendering.
- Phase 10 can be used by a later worker/job pipeline without rethinking provider contracts.

## Not Part Of Phase 10

- Async chapter job orchestration
- Page upload flow and storage retention implementation
- Token reservation and refund logic
- Full Android hosted-engine integration
