# Nayovi Open Social Profile Packet

Status: draft owner action required

Use this packet for official open-social profiles such as Mastodon, Bluesky, Fediverse-compatible profiles, and similar public update surfaces. Do not create accounts automatically, do not use personal-looking personas, and do not publish until the owner has created or approved the official profile.

## Public Profile Fields

Display name: `Nayovi`

Short bio:

`Official Nayovi updates for the Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows. No chapter hosting; use only with owned, public-domain, official-sample, creator-provided, or permission-approved material.`

Primary link:

`https://nayovi.com`

Source links:

- `https://tachiyomiat.com/download`
- `https://tachiyomiat.com/translate-manhwa-ai`
- `https://tachiyomiat.com/pricing`
- `https://tachiyomiat.com/support`
- `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`

Profile metadata fields:

- Website: `https://nayovi.com`
- APK source: `https://tachiyomiat.com/download`
- Support: `https://tachiyomiat.com/support`
- Responsible use: `Owned, public-domain, official-sample, creator-provided, or approved material only`

## Asset Checklist

- Square logo/avatar approved by owner.
- Header/banner approved by owner.
- Approved sample-safe screenshot or demo clip only if the platform supports media.
- Package/signing/developer-verification language confirmed by owner before any verified or registered wording is used.
- Public contact path confirmed by owner.

## Credential References

Store only non-secret references in docs:

- `SEO_AGENT_BLUESKY_HANDLE`
- `SEO_AGENT_BLUESKY_APP_PASSWORD`
- `SEO_AGENT_BLUESKY_PDS_URL`
- `SEO_AGENT_MASTODON_INSTANCE_URL`
- `SEO_AGENT_MASTODON_ACCESS_TOKEN`
- `SEO_AGENT_OPEN_SOCIAL_PROFILE_REFERENCE`

Secret values must stay in `/opt/tachi-back/.env.seo-distribution-agent` with strict permissions or another approved secret store.

## First Post Draft

No-link variant:

`Nayovi is setting up its official update trail for Android OCR and AI translation workflow notes. The focus is practical trust: official APK source, support path, free trial and paid token-plan clarity, approved-sample screenshots, and no chapter hosting. We will keep public examples limited to owned, public-domain, official-sample, creator-provided, or otherwise approved material.`

Link variant after owner approval:

`Nayovi is setting up its official update trail for Android OCR and AI translation workflow notes. The source-of-truth download page is https://tachiyomiat.com/download and the OCR QA checklist is https://tachiyomiat.com/guides/comic-ocr-translation-checklist. Public examples stay limited to owned, public-domain, official-sample, creator-provided, or otherwise approved material.`

## Agent Capability After Connection

After an official profile exists and the required API credential is connected, the agent can prepare or publish owner-approved profile metadata and update posts only if the platform rules allow the exact action.

The agent must not create the account, verify email or phone, accept terms, solve CAPTCHA, post repetitive promotional updates, auto-follow, auto-like, auto-reply, scrape DMs, or use the profile as a backlink-drop surface.

## Owner Next Action

Owner chooses the official handle or instance, completes any manual account setup and verification, approves the profile copy and assets, and decides whether API publishing stays disabled or uses the credential references above.
