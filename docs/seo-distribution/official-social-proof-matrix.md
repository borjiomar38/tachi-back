# Nayovi Official Social Proof Matrix

This file is maintained by the SEO distribution agent.

Purpose: keep official Nayovi profile setup tied to trust signals that reviewers, directories, partners, investors, and communities can verify. Do not list private credentials, verification tokens, cookies, recovery codes, or account screenshots here.

## Source-Of-Truth Links

- Brand domain: `https://nayovi.com`
- Primary product site: `https://tachiyomiat.com`
- Official APK download: `https://tachiyomiat.com/download`
- Pricing: `https://tachiyomiat.com/pricing`
- Support: `https://tachiyomiat.com/support`
- OCR workflow: `https://tachiyomiat.com/translate-manhwa-ai`
- Comic OCR checklist: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- Reviewer packet: `docs/nayovi-apk-review-packet.md`
- Android trust profile: `docs/seo-distribution/android-apk-trust-profile.md`

## Profile Trust Matrix

| Priority | Surface | Trust signal | Public profile copy | Owner blocker | Credential reference | Agent capability after connection |
| --- | --- | --- | --- | --- | --- | --- |
| high | Google Search Console | Verified domain ownership, sitemap coverage, indexing diagnostics | Not public-facing; use verified properties for `tachiyomiat.com`, `nayovi.com`, and `translate-manhwa-ai.com` | Owner verifies properties and submits sitemap | `SEO_AGENT_GOOGLE_SEARCH_CONSOLE_CREDENTIALS` | Inspect indexing and sitemap issues only after API credential is connected |
| high | Bing Webmaster Tools | Secondary verified search ownership and crawl diagnostics | Not public-facing; mirror verified properties and sitemap | Owner imports from GSC or verifies manually | `SEO_AGENT_BING_WEBMASTER_API_KEY` | Inspect Bing indexing and submit sitemap after API access |
| high | GitHub official profile/repo | Repo-native docs, reviewer packets, release proof, technical credibility | `Nayovi builds an Android OCR and AI translation workflow for manga, manhwa, and manhua reader workflows. Official APK, free trial, redeem-code activation, token plans, support, and permission-safe sample testing.` | Owner confirms whether the official surface is org, founder profile, or repo-only docs | `SEO_AGENT_GITHUB_TOKEN` optional; SSH remote currently enough for docs | Maintain owned docs, profile README draft, review packets, and release notes |
| high | LinkedIn company/founder page | Partner, investor, and press identity check | `Nayovi is an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows. It supports official APK access, free trial, redeem-code activation, monthly token plans, and permission-safe sample testing.` | Owner creates/connects official page and confirms public founder/company fields | `SEO_AGENT_LINKEDIN_ACCESS_TOKEN`, `SEO_AGENT_LINKEDIN_ORGANIZATION_ID` | Draft or publish owner-approved company posts only after API access and scope are configured |
| high | YouTube official channel | Demo proof for reviewers, directories, launch communities, and partner diligence | `Official Nayovi demos: Android APK install, redeem-code activation, hosted OCR/AI translation, support paths, and permission-safe sample testing. Nayovi does not host or distribute chapters.` | Owner creates channel, approves demo media, and accepts terms manually | `SEO_AGENT_YOUTUBE_REFRESH_TOKEN`, optional `SEO_AGENT_DEMO_VIDEO_REFERENCE` | Prepare/update approved video metadata after OAuth connection |
| high | Android developer verification / Play Console identity | Package ownership, signing confidence, independent APK review readiness | Public copy must stay pending until owner confirms package, signing fingerprint, and verification state | Owner completes identity/package/terms steps and confirms facts | `SEO_AGENT_ANDROID_DEVELOPER_VERIFICATION_REFERENCE`, `SEO_AGENT_GOOGLE_PLAY_CONSOLE_REFERENCE`, `SEO_AGENT_ANDROID_PACKAGE_REFERENCE` | Cite only owner-confirmed verification/package facts in reviewer packets |
| medium | DEV / Medium technical profile | Canonical technical publishing and OCR QA authority | `Android OCR and AI translation workflow for manga, manhwa, and manhua reader workflows. Permission-safe samples only; no chapter hosting.` | Owner creates/connects official profile and approves canonical policy | `SEO_AGENT_DEVTO_API_KEY`, `SEO_AGENT_MEDIUM_INTEGRATION_TOKEN` | Publish owner-approved canonical articles only after account/API access |
| medium | Product Hunt maker/company | Launch credibility and early-adopter feedback | `Android OCR translation workflow for manga and manhwa reader workflows.` | Owner creates/connects maker profile and chooses launch timing | `SEO_AGENT_PRODUCTHUNT_TOKEN` | Prepare launch listing and maker comments only after authorized account connection |
| medium | Reddit official/founder account | Transparent community listening and no-link feedback | `Building Nayovi, an Android hosted OCR and AI translation workflow for manga, manhwa, and manhua reader workflows. Permission-safe samples only; no chapter hosting.` | Owner creates official/founder account and reviews current subreddit rules | `SEO_AGENT_REDDIT_CLIENT_ID`, `SEO_AGENT_REDDIT_CLIENT_SECRET`, `SEO_AGENT_REDDIT_REFRESH_TOKEN` | Draft rule-compliant posts; publish only after explicit community/action approval |
| medium | Substack/newsletter official profile | Owned update archive for APK trust, release notes, and reviewer context | `Official Nayovi updates about Android APK trust, OCR QA, review-code access, and permission-safe sample testing.` | Owner creates profile, chooses handle, and approves first issue | `SEO_AGENT_SUBSTACK_PROFILE_REFERENCE` | Draft owner-approved issues; no contact import or bulk send |
| medium | Bluesky/Mastodon official social profiles | Lightweight official source-of-truth profile signals | `Android OCR and AI translation workflow for manga, manhwa, and manhua reader workflows. No chapter hosting; use with owned, public-domain, official-sample, or permission-approved content.` | Owner chooses handle/instance and stores app token only if API posting is wanted | `SEO_AGENT_BLUESKY_APP_PASSWORD`, `SEO_AGENT_MASTODON_ACCESS_TOKEN` | Draft concise official updates after rules and account scope are confirmed |

## Citation Rules

- Cite only profiles that the owner has confirmed are official and live.
- If an account is not configured, use `AUTHORIZED_ACCOUNT_REQUIRED` or `OWNER_ACTION_REQUIRED` in drafts.
- Prefer no-link community drafts unless the current rules clearly allow official product links.
- Never imply Google Play approval, Android developer verification, publisher permission, WEBTOON affiliation, or directory acceptance until the owner confirms it.
- Do not store credential values, verification tokens, account screenshots, private phone numbers, or private emails in Git.

## Owner Action Priority

1. Verify GSC and Bing properties for `tachiyomiat.com`, `nayovi.com`, and `translate-manhwa-ai.com`.
2. Confirm Android package name, signing-certificate fingerprint, SHA-256 process, and developer verification/package registration status.
3. Approve the public screenshot/demo asset set and safe sample scope.
4. Create/connect LinkedIn and YouTube official profiles.
5. Create/connect DEV or Medium only after canonical article policy is approved.
6. Create/connect Reddit, Product Hunt, Substack, Bluesky, or Mastodon only if the owner will review rules and handle community replies manually.
