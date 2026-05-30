# Nayovi Android Verification Public Profile Packet

Maintained by the SEO distribution agent. This is a setup and review packet only; it is not proof that any developer verification, package registration, store listing, or APK review has been completed.

## Purpose

Android reviewers, APK directories, app-testing portals, AI directories, newsletters, partners, and investors need a stable way to distinguish official Nayovi sources from mirrors, reposts, or unsupported claims.

Use this packet when preparing official Nayovi-owned profiles or source-first review notes for Android-facing surfaces.

## Public Profile Copy

Display name: `Nayovi`

Short description: `Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows.`

Responsible-use line: `Nayovi does not host or distribute chapters. Use it only with owned, public-domain, official-sample, creator-provided, or otherwise permission-approved material.`

Source-of-truth links:
- Brand domain: `https://nayovi.com`
- Primary app site: `https://tachiyomiat.com`
- Official APK source: `https://tachiyomiat.com/download`
- Pricing: `https://tachiyomiat.com/pricing`
- Support: `https://tachiyomiat.com/support`
- OCR checklist: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`

## Owner-Confirmed Fields Required Before External Use

- Package name.
- Current APK filename and version.
- APK SHA-256 hash.
- Signing-certificate fingerprint.
- Developer verification status wording.
- Whether a Play Console, Android Developer Console, or other official package registration path exists.
- Approved screenshots, demo clips, and sample pages.
- Whether a reviewer may receive a private review code or only public free-trial access.
- Whether any third-party app-testing report may be public.

## Credential References

Store secret values only in `/opt/tachi-back/.env.seo-distribution-agent` or an approved secret store. Use these non-secret references in docs:

- `SEO_AGENT_ANDROID_DEVELOPER_CONSOLE_REFERENCE`
- `SEO_AGENT_PLAY_CONSOLE_REFERENCE`
- `SEO_AGENT_APK_DIRECTORY_PROFILE_REFERENCE`
- `SEO_AGENT_APP_TESTING_PORTAL_REFERENCE`
- `SEO_AGENT_REVIEW_CODE_POLICY_REFERENCE`
- `SEO_AGENT_SCREENSHOT_ASSET_REFERENCE`

## Agent Capability After Connection

After owner verification and authorized credentials exist, the agent can prepare source-first metadata, reviewer replies, directory listing fields, and sitemap/indexing notes.

The agent must not create accounts, accept terms, verify identity, upload APKs, submit packages, grant private review codes, publish screenshots, or claim verification status automatically.

## Public Pending-Language Template

Use this only until the owner confirms exact package/signing/developer-verification facts:

`Nayovi is distributed from the official source links listed here. Package, signing, hash, and Android developer-verification details should be confirmed from the owner-approved release packet before any third-party listing, review, or testing report publishes technical claims.`

## Directory And Reviewer Stop Conditions

Stop and require owner review when a surface:

- Requires APK mirroring before source links are reviewed.
- Removes pricing, support, privacy, or responsible-use context.
- Requires a paid or reciprocal backlink for review.
- Asks for fake reviews, votes, ratings, or engagement.
- Labels Nayovi as open source, forever-free, or Play-Store-only without owner confirmation.
- Wants unapproved screenshots, unauthorized pages, private codes, or unpublished package data.

## 2026-05-30 Owned SEO Linkable asset refresh

- Added public pending-language wording for unverified Android verification fields so no external surface can claim verified status before the owner confirms package and signing facts.
- Added explicit directory- and review-facing stop conditions for APKPure/app-testing/editorial channels where APK mirror, fake reviews, private review codes, or unapproved screenshot requests are required.
- Added a canonical link set note for `https://tachiyomiat.com/guides/free-trial-vs-paid-token-plan` as optional supporting context for paid-plan clarity in Android reviewer conversations.
