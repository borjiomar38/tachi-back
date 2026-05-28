# Nayovi Official Account Setup

This file is maintained by the SEO distribution agent.

Only official Nayovi-owned accounts belong here. Do not add fake personas, throwaway accounts, passwords, tokens, recovery codes, cookies, or private credentials. Store secret values only in `/opt/tachi-back/.env.seo-distribution-agent` with strict permissions or an approved secret store; this document may reference variable names only.

| Priority | Platform | Purpose | Status | Owner/manual step | Required assets | Secret/API variable | Publish capability after connection | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| high | Google Search Console | Search indexing, sitemap monitoring, canonical ownership signal | setup_packet_prepared_owner_action_required | Verify `tachiyomiat.com`, `nayovi.com`, and `translate-manhwa-ai.com` with official owner account | Domains, sitemap URLs, verification method | `SEO_AGENT_GOOGLE_SEARCH_CONSOLE_CREDENTIALS` | Submit sitemaps, monitor indexing, detect SEO issues | Owner verifies properties and submits sitemap; agent can inspect only after API credential is connected. |
| high | Bing Webmaster Tools | Secondary search indexing and sitemap submission | setup_packet_prepared_owner_action_required | Verify domains with official owner account | Domains, sitemap URLs, verification method | `SEO_AGENT_BING_WEBMASTER_API_KEY` | Submit sitemaps and monitor crawl/index data | Owner imports from GSC or verifies manually; agent can inspect only after API credential is connected. |
| high | GitHub official Nayovi repo/profile | Technical trust, docs, release notes, linkable OCR/QA assets | configured_owned_repo | Keep official repo/profile truthful and current | README, demo links, support links, responsible-use copy | SEO_AGENT_GITHUB_TOKEN optional; SSH remote already configured | Publish owned docs and technical assets | Keep owned docs synced with SEO/link assets. |
| high | YouTube official channel | Demo video proof for reviewers, directories, and partners | setup_packet_prepared_owner_action_required | Create/connect official Nayovi channel, upload only approved-sample demo media, and authorize API only if automated metadata updates are wanted | Demo video, poster, avatar/banner, title, description, playlist names, canonical links, screenshot policy | SEO_AGENT_YOUTUBE_REFRESH_TOKEN | Upload/update official demo videos and descriptions after owner approval | Owner creates channel, approves first demo title/description below, and connects OAuth only if automated metadata updates are wanted. |
| high | LinkedIn company/founder profile | Founder/company trust, partner/investor visibility | setup_packet_prepared_owner_action_required | Create/connect official company page or founder-owned page | Logo, banner, company bio, website links | SEO_AGENT_LINKEDIN_ACCESS_TOKEN, SEO_AGENT_LINKEDIN_ORGANIZATION_ID | Publish official build-in-public and partnership posts | Owner creates/connects page and approves first post queue; agent remains draft-only until API access exists. |
| medium | Product Hunt maker/company | Launch credibility and early product feedback | setup_packet_prepared_owner_action_required | Create/connect official maker/company account and accept launch terms manually | Logo, tagline, demo video, product screenshots, pricing/support links, maker comment | SEO_AGENT_PRODUCTHUNT_TOKEN | Prepare launch page and authorized maker comments | Owner chooses launch timing, creates/connects maker profile, and approves the launch packet below; no upvote requests or automated comments. |
| medium | DEV/Medium technical publishing | Technical authority for OCR, merge QA, hosted Android workflow | needs_owner_setup | Connect official publication/profile account | Canonical article drafts, profile bio, logo | SEO_AGENT_DEVTO_API_KEY, SEO_AGENT_MEDIUM_INTEGRATION_TOKEN | Publish canonical technical articles where allowed | Prepare public-safe OCR QA article packet. |
| medium | Reddit official account | Community listening and careful no-link feedback posts | setup_packet_prepared | Create official brand/founder account manually and review subreddit rules | Profile bio, no-link post drafts, support links | SEO_AGENT_REDDIT_CLIENT_ID, SEO_AGENT_REDDIT_CLIENT_SECRET, SEO_AGENT_REDDIT_REFRESH_TOKEN | Draft or post rule-compliant no-link/value-first content | Owner creates official account, reviews target subreddit rules, and connects API only if posting is desired. |
| medium | X/Twitter official account | Lightweight product updates and partner discovery | setup_packet_prepared | Create/connect official Nayovi account | Bio, avatar, banner, first posts | SEO_AGENT_X_ACCESS_TOKEN | Publish concise official updates if API/rules allow | Owner creates official account and confirms whether API posting should be enabled. |
| medium | AI/app directory developer profiles | Directory backlinks and install trust | setup_packet_prepared | Use each directory's official developer portal/form | APK metadata, screenshots, demo, pricing, support, responsible-use copy | Per-directory credential reference only | Submit official listings that preserve source-of-truth links | Owner reviews directory quality filter before any form submission. |
| medium | Hacker News founder account | Technical founder feedback and Show HN readiness | setup_packet_prepared_owner_action_required | Founder uses an existing real account or creates one manually; no automated posting or voting | Founder-approved bio, Show HN title/comment, working APK/demo/support links | `SEO_AGENT_HN_ACCOUNT_REFERENCE`; no password/API secret in docs | Draft manual founder posts and reply notes only | Founder confirms account eligibility and posts manually only when ready to answer comments. |
| medium | Android newsletter submission profiles | Developer-facing trust links for Android newsletters | setup_packet_prepared_owner_action_required | Owner approves official submit-form use and any publication-specific byline | Technical link packet, APK review packet, screenshot policy, non-promotional short note | `SEO_AGENT_ANDROID_WEEKLY_SUBMISSION_REFERENCE`, `SEO_AGENT_KOTLIN_WEEKLY_SUBMISSION_REFERENCE` | Submit owner-approved technical links only through official forms | Owner approves whether Android Weekly/Kotlin Weekly-style link submissions may cite the APK trust packet. |
| medium | App testing and reviewer portals | Third-party install trust evidence before press and directory outreach | setup_packet_prepared | Owner approves exact APK sharing, tester scope, sample pages, and publication rights before any upload | Signed APK link, SHA-256, safe sample plan, redeem code, support link, screenshot rules | Per-platform credential reference only; optional `SEO_AGENT_APP_TESTING_PORTAL_REFERENCE` | Request reviewer/tester reports only through approved portals or official editorial paths | Owner approves whether Nayovi can share APK/redeem-code access with testing services. |
| high | Android developer verification and package registry | APK install trust, package ownership, reviewer confidence | setup_packet_prepared | Owner completes official Android developer verification and package registration when eligible | Package name, signed APK, SHA-256, signing-certificate fingerprint, official domains, support links | `SEO_AGENT_ANDROID_DEVELOPER_VERIFICATION_REFERENCE` | Let agent cite verified/pending status in reviewer packets after owner confirms it | Owner confirms package name, signing fingerprint, and verification status; agent must not infer. |
| medium | Newsletter/podcast contributor profiles | Editorial trust for localization, Android, and creator-platform pitches | setup_packet_prepared | Owner creates official contributor/byline profile only where invited or required | Founder byline, headshot/logo, bio, canonical links, non-promotional article/topic packet | Per-publication credential reference only | Submit owner-approved non-promotional topic pitches or author bios | Owner approves byline and which publications may receive topic notes. |
| medium | Bluesky official account | Lightweight public trust signal, founder/build updates, and source-of-truth profile linking | setup_packet_prepared | Create/connect official Nayovi or founder-owned account manually | Avatar, banner, bio, canonical links, first post queue | `SEO_AGENT_BLUESKY_APP_PASSWORD` only if owner enables API posting | Publish concise official updates if API/rules allow | Owner creates official account, stores app password only in approved secret store, and confirms draft-only or publish scope. |
| medium | Crunchbase organization profile | Investor and partner trust signal for company/entity discovery | setup_packet_prepared | Owner creates or claims official organization profile and completes any verification manually | Company description, website, logo, founding/founder fields, product category, canonical links | `SEO_AGENT_CRUNCHBASE_PROFILE_REFERENCE`; no private login data | Keep public company profile fields consistent after owner approval | Owner verifies whether Nayovi has an eligible company profile and approves public fields before submission. |
| high | Google Business/Profile-style web entity packet | Cross-surface entity consistency for search, AI answers, press, and partner diligence | setup_packet_prepared_owner_action_required | Owner confirms whether Nayovi has an eligible public business/entity profile and completes any manual verification | Legal/public company name, website, logo, support URL, public contact path, service area or online-only positioning | `SEO_AGENT_BUSINESS_PROFILE_REFERENCE`; no private verification data | Let agent keep public entity fields consistent across owned docs, directories, and profile packets | Owner confirms eligibility and public entity fields; agent must not create or verify profiles automatically. |
| medium | Indie Hackers/build-in-public founder profile | Founder credibility, transparent product updates, and revenue/feedback community participation | setup_packet_prepared_owner_action_required | Founder creates or connects an official founder-owned profile with truthful Nayovi affiliation | Founder bio, product URL, no-link launch/update drafts, metrics owner approves for public use | `SEO_AGENT_INDIEHACKERS_PROFILE_REFERENCE`; API token only if a compliant workflow exists | Draft build-in-public posts and answer feedback only from authorized founder account | Owner creates/connects founder profile and approves which metrics, screenshots, or posts can be public. |
| high | Android Play Console / developer identity | Developer verification, package ownership, and APK trust for 2026 Android install changes | setup_packet_prepared_owner_action_required | Owner completes any official developer identity, package registration, ID, fee, and terms steps manually | Package name, signed APK, signing certificate fingerprint, official domains, support URL, privacy/terms URLs | `SEO_AGENT_ANDROID_PLAY_CONSOLE_REFERENCE`; do not store IDs or verification docs | Agent can cite only owner-confirmed verification/package status in reviewer packets | Owner confirms package name, signing fingerprint, developer verification status, and whether Play Console or Android Developer Console access may be referenced. |
| high | GitHub public docs/release surface | Owned technical proof for APK metadata, OCR checklist, and reviewer handoff | configured_owned_repo_needs_content_sync | Use owned repo/docs only; no external PR unless maintainer invites it | Markdown checklist, release notes, APK hash, source links, support links, responsible-use copy | SEO_AGENT_GITHUB_TOKEN optional; SSH remote already configured | Publish owned markdown docs and release proof on the current branch | Agent added website handoff copy 2026-05-28; next mirror the public checklist into an owned GitHub docs page if owner wants an external repository citation. |
| high | Android review packet repository doc | Owned citation surface for app reviewers, directories, newsletters, and partner diligence | configured_owned_repo_content_synced | Keep `docs/nayovi-apk-review-packet.md` current with release metadata and owner-confirmed package facts | APK filename, build label, SHA-256, official links, support/pricing/legal links, responsible-use boundary | SSH remote already configured; `SEO_AGENT_GITHUB_TOKEN` optional for API workflows | Publish and cite an owned Markdown review packet from the current branch | Add package name, signing-certificate fingerprint, and Android developer verification status only after owner confirms them. |
| medium | Startup and launch profile accounts | Product discovery and investor trust across BetaList, launch communities, and startup directories | setup_packet_prepared_owner_action_required | Founder creates/claims only official Nayovi/founder profiles and approves launch timing | Logo, tagline, screenshots, demo video, pricing, support links, public metrics approved by owner | Per-platform non-secret profile reference; `SEO_AGENT_PRODUCTHUNT_TOKEN` only for Product Hunt API | Agent can draft listing copy and launch comments after authorized account connection | Owner chooses which startup profiles are eligible and whether public metrics can be shared. |
| medium | Android newsletter/editorial contributor paths | Editorial trust for Android APK, hosted OCR, and developer-facing checklist content | setup_packet_prepared_owner_action_required | Owner approves byline/contact path and any editor-specific submission before outreach | APK review packet, comic OCR checklist, demo video, screenshot policy, founder byline | Per-publication credential/contact reference only; no passwords or cookies | Agent can prepare individualized newsletter/editorial tips from owned docs | Owner approves whether Android Weekly/Kotlin Weekly-style submissions may cite the owned review packet. |
| high | Official profile field packet | Consistent entity copy across search profiles, launch pages, directories, partner packets, and reviewer handoffs | configured_owned_repo_content_synced | Keep public profile fields synchronized before any owner submits profiles | `docs/nayovi-official-profile-fields.md`, logo, screenshots, canonical links, public contact path | No secret required; use per-platform credential references only when owner connects accounts | Agent can prepare platform-specific profile/listing drafts from one source-of-truth packet | Owner confirms public contact fields and package/signing/verification facts; agent keeps credential values out of docs. |
| medium | Medium publication/profile | Canonical or republished technical articles for OCR QA, APK trust, and permission-safe workflow topics | setup_packet_prepared_owner_action_required | Owner creates/connects official Medium profile or publication and decides canonical/republication policy | Profile bio, logo/avatar, article draft, canonical URL, approved screenshots | `SEO_AGENT_MEDIUM_INTEGRATION_TOKEN` only if owner enables official API workflow | Publish or update owner-approved canonical articles after account connection | Owner confirms whether Medium should be a canonical syndication surface or draft-only profile. |
| high | Google Play Console package identity packet | Independent APK trust and future Android verification proof for reviewers/directories | setup_packet_prepared_owner_action_required | Owner confirms package name, signing-certificate fingerprint, developer account verification status, and whether Play Console package registration exists | Signed APK, SHA-256, package name, signing fingerprint, support/privacy/terms URLs, approved screenshots | `SEO_AGENT_GOOGLE_PLAY_CONSOLE_REFERENCE`; no identity documents or login data | Agent can cite owner-confirmed package/signing/verification status in download-page and reviewer packets | Owner supplies the exact public package/signing/verification facts; agent keeps pending language until then. |
| high | Official screenshot asset library | Reusable approved visual proof for YouTube, Product Hunt, app directories, press, and tester packets | setup_packet_prepared_owner_action_required | Owner approves sample rights, screenshot list, publication scope, and storage location | Logo/avatar, banner, install screen, activation screen, support screen, approved-sample OCR before/after, demo thumbnail | `SEO_AGENT_SCREENSHOT_ASSET_REFERENCE`; no private media credentials | Agent can reuse approved screenshot names/URLs in profile packets and listing drafts after owner approval | Owner adds approved screenshots to an allowed asset store and confirms which can be public. |

## 2026-05-28 Setup Packets

### Google Search Console

Status: OWNER_ACTION_REQUIRED for ownership verification.

Public properties to add:
- `https://tachiyomiat.com/`
- `https://nayovi.com/`
- `https://translate-manhwa-ai.com/`

Sitemap URLs:
- `https://tachiyomiat.com/sitemap.xml`

Verification checklist:
- Prefer DNS verification for each domain when the owner can update DNS.
- If DNS is unavailable, use the HTML tag or uploaded file method generated by Search Console.
- After verification, submit the sitemap, inspect `/download`, `/translate-manhwa-ai`, `/guides/translation-support-workflow`, `/guides/comic-ocr-translation-checklist`, and `/guides/permission-safe-manga-translation-pilot`.
- Do not store verification tokens in docs unless they are public HTML tags already deployed intentionally.

Agent capability after connection:
- The agent can track indexing issues and sitemap coverage only if an approved Search Console API credential is later configured. Use credential reference `SEO_AGENT_GOOGLE_SEARCH_CONSOLE_CREDENTIALS` in `/opt/tachi-back/.env.seo-distribution-agent`.

### Bing Webmaster Tools

Status: OWNER_ACTION_REQUIRED for ownership verification.

Public properties to add:
- `https://tachiyomiat.com/`
- `https://nayovi.com/`
- `https://translate-manhwa-ai.com/`

Sitemap URLs:
- `https://tachiyomiat.com/sitemap.xml`

Verification checklist:
- Import verified sites from Google Search Console if the owner has already connected GSC.
- Otherwise use Bing's DNS CNAME/TXT or meta-tag verification.
- Submit the sitemap and inspect `/download`, `/translate-manhwa-ai`, and the three public guide URLs.

Agent capability after connection:
- The agent can monitor crawl/index diagnostics only after an approved Bing API workflow exists. Use credential reference `SEO_AGENT_BING_WEBMASTER_API_KEY`.

### Bluesky Official Account

Status: OWNER_ACTION_REQUIRED for official account creation, handle selection, and any app-password/API connection.

Profile fields:
- Display name: `Nayovi`
- Handle preference: `@nayovi.com` if domain verification is available, otherwise `@nayovi.app` or owner-approved official handle.
- Bio: `Android OCR and AI translation workflow for manga, manhwa, and manhua reader workflows. No chapter hosting; use with owned, public-domain, official-sample, or permission-approved content.`
- Primary link: `https://nayovi.com`
- Secondary link for posts: `https://tachiyomiat.com/download`

Required assets:
- Square logo/avatar.
- Banner showing neutral Android workflow or approved-sample UI only.
- First post queue:
  - `Nayovi is an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows. It focuses on official APK access, redeem-code activation, support, and permission-safe use.`
  - `We keep a public comic OCR checklist for approved samples: permission scope, OCR coverage, reading order, glossary consistency, reviewer correction, and sharing decisions.`
  - `Looking for feedback from Android reviewers, localization operators, and creator-platform teams on what makes an APK-based OCR workflow trustworthy.`

Credential reference:
- `SEO_AGENT_BLUESKY_APP_PASSWORD` only if the owner creates an official account and enables API posting. Store the actual value only in `/opt/tachi-back/.env.seo-distribution-agent` or an approved secret store.

Agent capability after connection:
- The agent can prepare or publish owner-approved official updates only after API credentials are configured and posting scope is confirmed. No automated replies, trend hijacking, repetitive link posting, or personal-looking persona behavior.

Next action:
- Owner creates or connects the official account, chooses whether to verify a domain handle, and confirms whether the agent remains draft-only.

### Crunchbase Organization Profile

Status: OWNER_ACTION_REQUIRED for profile claim/creation, eligibility review, and any manual verification.

Public profile fields:
- Organization name: `Nayovi`
- Website: `https://nayovi.com`
- Product URL: `https://tachiyomiat.com/download`
- Short description: `Nayovi is an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows.`
- Long description: `Nayovi provides official APK download, free trial access, redeem-code activation, monthly token plans, support paths, and hosted OCR/AI translation for permission-safe reader workflows. Nayovi does not host or distribute chapters; it supports owned content, public-domain material, official samples, or content users have permission to process.`
- Categories: `Android`, `Artificial Intelligence`, `OCR`, `Translation`, `Mobile Apps`, `Language Technology`.

Required assets:
- Logo.
- Approved founder/company details.
- Canonical links to download, pricing, support, and responsible workflow guide.
- Public contact path that does not expose private phone numbers or credentials unless owner explicitly approves.

Credential reference:
- `SEO_AGENT_CRUNCHBASE_PROFILE_REFERENCE` for a non-secret profile/workflow reference only. Do not store login credentials, verification documents, cookies, or private account screenshots in docs or Git.

Agent capability after connection:
- The agent can keep draft profile copy and consistency notes current. It must not create, claim, verify, or submit profile fields automatically unless Crunchbase provides an authorized API workflow and owner-approved credentials are configured.

Next action:
- Owner confirms company/profile eligibility and approves public founder/company fields before any manual submission.

### Search Entity / Business Profile Packet

Status: OWNER_ACTION_REQUIRED for eligibility review, public entity fields, and any manual verification.

Use this packet for search/business/entity profiles that improve trust in public results, AI answers, directory checks, and partner diligence. This is not permission to create accounts automatically.

Public profile fields:
- Public name: `Nayovi`
- Website: `https://nayovi.com`
- Product/download URL: `https://tachiyomiat.com/download`
- Support URL: `https://tachiyomiat.com/support`
- Category language: `Android app`, `AI OCR`, `Translation workflow`, `Language technology`
- Short description: `Nayovi is an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows.`
- Responsible-use line: `Nayovi does not host or distribute chapters; it supports owned content, public-domain material, official samples, or content users have permission to process.`

Required assets:
- Square logo/avatar.
- Public contact path approved by owner.
- Canonical links to download, pricing, support, workflow guide, privacy, and terms.
- Entity details the owner is comfortable making public. Do not infer legal address, phone number, founder identity fields, or verification status.

Credential reference:
- `SEO_AGENT_BUSINESS_PROFILE_REFERENCE` for a non-secret workflow/profile reference only. Do not store verification documents, phone/email challenges, cookies, account screenshots, or recovery details in docs or Git.

Agent capability after connection:
- The agent can keep official profile copy consistent and cite only owner-confirmed public fields. It must not submit verification steps, accept terms, upload identity documents, or publish private contact details.

Next action:
- Owner confirms which search/entity profiles are eligible and approves the exact public contact and company fields.

### Indie Hackers / Build-In-Public Founder Profile

Status: OWNER_ACTION_REQUIRED for founder-owned account creation, community rules review, and public-metric approval.

Profile fields:
- Name/display: owner-approved founder name with clear Nayovi affiliation.
- Bio: `Building Nayovi, an Android hosted OCR and AI translation workflow for manga, manhwa, and manhua reader workflows. Permission-safe samples only; no chapter hosting.`
- Website: `https://nayovi.com`
- Product URL: `https://tachiyomiat.com/download`
- Support/resource link: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`

Required assets:
- Founder-approved avatar or logo.
- Short product screenshot set using only approved sample material.
- Metrics the owner explicitly approves for public mention, such as trial activations, paid subscriptions, retention, or activation-to-paid conversion. If metrics are unavailable, use qualitative progress only.
- First post draft from `docs/seo-distribution/platform-drafts.md`.

Credential reference:
- `SEO_AGENT_INDIEHACKERS_PROFILE_REFERENCE` for a non-secret profile reference. Add an API/token reference only if Indie Hackers or another build-in-public platform exposes an authorized workflow and the owner wants automated publishing.

Agent capability after connection:
- Draft transparent founder updates and reply suggestions. No automated engagement, vote requests, scraped DMs, or repetitive product links.

Next action:
- Founder creates/connects the official profile, confirms whether Nayovi can be mentioned under the founder identity, and approves which product metrics may be public.

### Android Play Console / Developer Identity Packet

Status: OWNER_ACTION_REQUIRED for any identity verification, package registration, fee payment, terms acceptance, or government-ID workflow.

Public fields to confirm before any reviewer or directory packet cites them:
- App/product name: `Nayovi`
- Official website: `https://nayovi.com`
- Official APK/source page: `https://tachiyomiat.com/download`
- Support URL: `https://tachiyomiat.com/support`
- Privacy URL: `https://tachiyomiat.com/legal/privacy`
- Terms URL: `https://tachiyomiat.com/legal/terms`
- Responsible workflow guide: `https://tachiyomiat.com/guides/translation-support-workflow`
- Package name: owner-confirmed value only; do not infer from APK filename.
- Signing-certificate fingerprint: owner-confirmed value only.
- Developer verification status: owner-confirmed `complete`, `pending`, `not started`, or `not applicable`.

Required assets:
- Signed APK or release artifact.
- SHA-256 APK hash.
- Signing-certificate fingerprint.
- Package ownership notes.
- Owner-approved public developer/contact fields.
- Safe screenshot set using install, activation, support, or approved-sample screens only.

Credential reference:
- `SEO_AGENT_ANDROID_PLAY_CONSOLE_REFERENCE` for a non-secret workflow reference only. Do not store identity documents, account screenshots, recovery codes, cookies, phone/email challenges, or verification tokens in docs or Git.

Agent capability after connection:
- The agent can keep reviewer packets consistent and cite only owner-confirmed package and verification facts. It must not upload APKs, accept terms, pay fees, verify identity, or register package ownership automatically.

Next action:
- Owner confirms package name, signing fingerprint, and current verification status so the download-page release packet can stop using pending language.

### GitHub Owned Release Docs Packet

Status: CONFIGURED_OWNED_REPO, content synced for APK review packet.

Recommended public docs:
- `docs/nayovi-apk-review-packet.md`: official APK source, hash, package/signing fields, support, pricing, privacy, terms, and responsible-use links. Created 2026-05-28.
- `docs/comic-ocr-checklist.md`: neutral checklist already maintained in `docs/seo-distribution/comic-ocr-checklist.md`.
- `docs/reviewer-screenshot-policy.md`: screenshot rights, approved samples, device matrix, and no-chapter-hosting boundary.

Required assets:
- Current APK metadata from `src/features/public/download-assets.ts`.
- Owner-confirmed package/signing details.
- Public URLs from the official profile linking checklist.

Credential reference:
- SSH remote is already enough for owned repo work. Use `SEO_AGENT_GITHUB_TOKEN` only if API publishing or release metadata updates are explicitly configured.

Agent capability after connection:
- The agent can publish owned markdown docs, update release notes, and link them from website pages. External awesome-list issues or PRs remain draft-only unless a maintainer asks for the resource.

### Google Play Console Package Identity Packet

Status: OWNER_ACTION_REQUIRED for package identity, signing-certificate, developer verification, fee, ID, terms, or package-registration steps.

Public fields to confirm:
- App/product name: `Nayovi`
- Official website: `https://nayovi.com`
- Official APK source: `https://tachiyomiat.com/download`
- Support URL: `https://tachiyomiat.com/support`
- Privacy URL: `https://tachiyomiat.com/legal/privacy`
- Terms URL: `https://tachiyomiat.com/legal/terms`
- Package name: owner-confirmed value only.
- Signing-certificate fingerprint: owner-confirmed value only.
- Android developer verification status: owner-confirmed value only.
- Package registration status for independently distributed APKs: owner-confirmed value only.

Required assets:
- Signed APK or release artifact reference.
- Current SHA-256 from the official download page.
- Signing-certificate fingerprint.
- Owner-approved public developer/contact fields.
- Approved screenshot set using install, activation, support, or permission-safe sample screens.

Credential reference:
- `SEO_AGENT_GOOGLE_PLAY_CONSOLE_REFERENCE` for a non-secret workflow reference only. Do not store identity documents, account screenshots, phone/email challenges, payment records, cookies, recovery codes, or verification tokens in docs or Git.

Agent capability after connection:
- The agent can update public reviewer packets and directory drafts with owner-confirmed release identity facts. It must not register packages, accept terms, upload identity documents, pay fees, or claim verified status automatically.

Next action:
- Owner confirms package name, signing fingerprint, developer verification status, and whether any Play Console or Android Developer Console package registration can be cited.

### Official Screenshot Asset Library

Status: OWNER_ACTION_REQUIRED for sample rights, screenshot approval, and storage reference.

Recommended public screenshot set:
- Square logo/avatar.
- Wide banner for YouTube, LinkedIn, Product Hunt, and directories.
- Android install/download screen.
- Redeem-code or free-trial activation screen with private codes hidden.
- Token/pricing or account state screen with private data hidden.
- Support/recovery screen.
- Approved-sample OCR input screen.
- Approved-sample OCR block/translation result screen.
- Short demo thumbnail that does not show unauthorized chapter pages.

Publication rules:
- Use only owned, public-domain, official-sample, or partner-approved pages.
- Hide private codes, emails, device identifiers, payment details, and internal admin data.
- Keep creator/publisher/sample credit context attached when applicable.
- Do not publish copyrighted chapter screenshots unless public use is explicitly approved.

Credential reference:
- `SEO_AGENT_SCREENSHOT_ASSET_REFERENCE` for the non-secret asset-library path or approved media-folder reference. Do not store private asset service credentials in docs or Git.

Agent capability after connection:
- The agent can reuse approved screenshots and file names in profile setup packets, app directory listing drafts, Product Hunt launch assets, YouTube metadata, and reviewer handoffs after owner approval.

Next action:
- Owner provides or approves the screenshot library, names which assets are public, and confirms whether they can be used in directory/listing drafts.

Next action:
- Add owner-confirmed package name, signing-certificate fingerprint, and Android developer verification status when available; keep public citation language in pending mode until then.

### Official Profile Field Packet

Status: CONFIGURED_OWNED_REPO, content synced in `docs/nayovi-official-profile-fields.md`.

Purpose:
- Keep Nayovi profile copy consistent across Google/Bing properties, LinkedIn, YouTube, Product Hunt, DEV/Medium, Bluesky, Crunchbase, Android directories, AI directories, app-testing portals, and partner/reviewer handoffs.
- Reduce profile drift between `nayovi.com`, `tachiyomiat.com`, and `translate-manhwa-ai.com`.
- Give the growth agent a public, non-secret source of truth for profile/listing drafts.

Included public fields:
- Short and long descriptions.
- Responsible-use line.
- Canonical links.
- Category tags.
- Asset checklist.
- Credential-handling rules.
- Submission skip rules for paid, reciprocal, mirror-first, fake-review, and misleading free/open-source flows.

Credential reference:
- No secret is required for the owned Markdown packet.
- Per-platform credentials remain referenced only by environment variable name and stored outside Git.

Next action:
- Owner confirms public contact fields, official logo/banner choice, approved screenshot set, package name, signing-certificate fingerprint, and Android developer verification status.

### Medium Official Profile Packet

Status: OWNER_ACTION_REQUIRED for official account/profile creation, publication membership, and integration-token approval.

Profile fields:
- Display name: `Nayovi`
- Bio: `Android OCR and AI translation workflow for manga, manhwa, and manhua reader workflows. Permission-safe samples only; no chapter hosting.`
- Website: `https://nayovi.com`
- Primary article canonical URL: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`

First article angle:
- Title: `A practical OCR QA checklist for comic and webtoon translation samples`
- Canonical source: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- Summary: explain permission scope, OCR coverage, reading order, merged bubbles, glossary consistency, human review, and share decisions without making the app the whole article.

Required assets:
- Logo/avatar.
- Approved sample screenshots only if rights are clear.
- Canonical URL decision: keep `tachiyomiat.com` as source of truth unless owner explicitly wants Medium-first publication.

Credential reference:
- `SEO_AGENT_MEDIUM_INTEGRATION_TOKEN` only if the owner enables official API publishing. Store the actual token only in `/opt/tachi-back/.env.seo-distribution-agent`.

Agent capability after connection:
- Prepare canonical article drafts and update owner-approved posts through official API workflow if available.
- No automated comments, claps, follows, scraping, or publication submissions.

Next action:
- Owner creates/connects official Medium profile, confirms canonical policy, and approves whether the first article should be syndicated after the public guide is screenshot-ready.

### Startup and Launch Profile Packet

Status: OWNER_ACTION_REQUIRED for any account creation, profile claim, launch submission, terms acceptance, or paid placement decision.

Profile fields:
- Product name: `Nayovi`
- Tagline: `Android OCR and AI translation workflow for manga and manhwa reader workflows.`
- Website: `https://nayovi.com`
- Primary product URL: `https://tachiyomiat.com/download`
- Short description: `Nayovi is an Android APK with hosted OCR, AI translation, free trial access, redeem-code activation, monthly token plans, and support for permission-safe manga, manhwa, and manhua reader workflows.`
- Responsible-use line: `Nayovi does not host or distribute chapters; it supports owned content, public-domain material, official samples, or content users have permission to process.`

### YouTube Official Channel Packet

Status: OWNER_ACTION_REQUIRED for channel creation, brand verification, video upload, terms acceptance, and any OAuth connection.

Profile fields:
- Channel name: `Nayovi`
- Handle preference: `@nayovi` if available, otherwise owner-approved official handle.
- Description: `Nayovi is an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows. Official APK access, free trial, redeem-code activation, monthly token plans, support, and permission-safe sample testing are available from the official site. Nayovi does not host or distribute chapters.`
- Primary link: `https://nayovi.com`
- Product/download link: `https://tachiyomiat.com/download`
- Support link: `https://tachiyomiat.com/support`

First demo metadata:
- Title: `Nayovi Android OCR Translation Workflow Demo`
- Description: `A short official demo of Nayovi's Android APK, hosted OCR/AI translation flow, activation path, and support links. Demo media should use owned, public-domain, official-sample, or permission-approved content only. Official APK: https://tachiyomiat.com/download`
- Playlist: `Nayovi demos`
- Visibility: owner-approved public or unlisted only; no automated upload until OAuth and approval are configured.

Required assets:
- Square logo/avatar and banner.
- 30-90 second demo video using only approved samples.
- Poster image that does not expose copyrighted chapter pages without permission.
- Reviewer screenshot policy: `docs/reviewer-screenshot-policy.md`.

Credential reference:
- `SEO_AGENT_YOUTUBE_REFRESH_TOKEN` only if the owner explicitly enables API metadata updates. Store the actual token only in `/opt/tachi-back/.env.seo-distribution-agent` or an approved secret store.

Agent capability after connection:
- The agent can prepare metadata, captions, descriptions, playlists, and source links. It must not upload videos, reply to comments, or publish Shorts automatically unless the owner approves the exact scope.

Next action:
- Owner creates/connects the official channel, approves safe demo assets, and confirms whether the agent remains draft-only or may update metadata through the API.

### Product Hunt Launch Packet

Status: OWNER_ACTION_REQUIRED for maker profile creation, launch scheduling, terms acceptance, and any API connection.

Launch fields:
- Product name: `Nayovi`
- Tagline: `Android OCR translation workflow for manga and manhwa`
- Website: `https://tachiyomiat.com/download`
- Short description: `Nayovi is an Android APK with hosted OCR, AI translation, free trial access, redeem-code activation, monthly token plans, and support for permission-safe manga, manhwa, and manhua reader workflows.`
- Topics: `Android`, `AI`, `OCR`, `Translation`, `Language Learning`, `Productivity`

Maker comment:
`I built Nayovi for Android readers who want manga, manhwa, and manhua OCR translation without managing provider API keys on the phone. The product is intentionally narrow: official APK download, hosted OCR and translation, redeem-code activation, free trial access, token plans, and support. It does not host or distribute chapters, and it is designed for owned content, public-domain material, official samples, or permission-approved use. I am looking for feedback from Android reviewers, localization operators, creator platforms, and readers who know where OCR translation workflows break.`

Required assets:
- Logo/avatar and gallery screenshots.
- Demo video from the YouTube packet or an owner-approved upload.
- Three to five safe screenshots following `docs/reviewer-screenshot-policy.md`.
- Pricing and support summary.
- Owner-approved public metrics, if any.

Credential reference:
- `SEO_AGENT_PRODUCTHUNT_TOKEN` only if Product Hunt exposes an authorized workflow and the owner enables it. Store the actual value only in `/opt/tachi-back/.env.seo-distribution-agent` or an approved secret store.

Agent capability after connection:
- The agent can keep launch copy current and draft authorized maker replies. It must not request upvotes, automate comments, use fake makers, or post from unauthorized accounts.

Next action:
- Owner creates/connects the maker profile, chooses launch timing, approves the screenshot/video packet, and confirms whether any API workflow is allowed.

Required assets:
- Logo/avatar and banner.
- Demo video and poster.
- Three to five safe screenshots from install, activation, support, demo, or approved-sample flows.
- Pricing summary and support URL.
- Owner-approved public metrics, if any. If metrics are unavailable, use qualitative product progress only.

Credential reference:
- Use a per-platform non-secret profile reference such as `SEO_AGENT_BETALIST_PROFILE_REFERENCE` or `SEO_AGENT_STARTUP_DIRECTORY_REFERENCE`.
- Use `SEO_AGENT_PRODUCTHUNT_TOKEN` only for an official Product Hunt workflow authorized by the owner.

Agent capability after connection:
- Draft launch copy, maker comments, and profile fields. No account creation, terms acceptance, paid priority placement, upvote requests, or automated comment engagement.

Next action:
- Owner confirms which launch/startup profiles are eligible and whether Nayovi should wait for package/signing fields before submitting.

### Android Newsletter / Editorial Contributor Packet

Status: OWNER_ACTION_REQUIRED for any byline approval, editorial submission, or publication-specific account setup.

Submission angle:
- Developer-facing: independent APK review packet, hosted OCR workflow, and responsible test plan.
- Technical-resource: comic OCR checklist for permission status, OCR coverage, reading order, merged blocks, glossary consistency, and reviewer correction.
- Reviewer-facing: source-of-truth APK metadata, hash, support/pricing/legal links, and screenshot boundaries.

Required assets:
- `docs/nayovi-apk-review-packet.md`.
- `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`.
- Demo video/poster.
- Owner-approved founder byline or official Nayovi team byline.
- Screenshot rights note for approved samples only.

Credential reference:
- Per-publication non-secret reference only, such as `SEO_AGENT_ANDROID_WEEKLY_SUBMISSION_REFERENCE` or `SEO_AGENT_EDITORIAL_CONTACT_REFERENCE`.

Agent capability after connection:
- Prepare individualized tips and article queries. No mass submissions, sponsored placement decisions, or claims of Android developer verification until owner confirms the underlying facts.

Next action:
- Owner approves whether Android Weekly, Kotlin Weekly, or similar editorial submissions can cite the owned review packet.

### LinkedIn Company / Founder Profile

Status: OWNER_ACTION_REQUIRED for official page/profile creation, organization ID confirmation, and any OAuth/API connection.

Company page fields:
- Page name: `Nayovi`
- Tagline: `Android OCR and AI translation workflow for manga, manhwa, and manhua reader workflows.`
- Website: `https://nayovi.com`
- Product/download URL for posts: `https://tachiyomiat.com/download`
- Description: `Nayovi is an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows. It provides official APK download, free trial access, redeem-code activation, monthly token plans, and support paths. Nayovi does not host or distribute chapters; it supports owned content, public-domain material, official samples, or content users have permission to process.`
- Specialties: `Android apps`, `OCR`, `AI translation`, `language technology`, `manga workflow`, `manhwa workflow`.

Required assets:
- Square logo/avatar.
- Banner with neutral Android workflow or approved-sample UI only.
- Founder-approved public byline if posting from a personal/founder profile.
- Canonical links to `https://nayovi.com`, `https://tachiyomiat.com/download`, `https://tachiyomiat.com/pricing`, `https://tachiyomiat.com/support`, and `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`.

First post queue:
- Build-in-public: APK trust is now part of the product, covering official source links, APK hash, package/signing fields when available, review codes, and screenshot rights.
- Partner-facing: Looking for Android reviewers, localization operators, and creator-platform teams willing to critique approved-sample OCR QA workflows.
- Technical: A short checklist for comic OCR review before translation: permission status, OCR completeness, reading order, merged bubbles, glossary consistency, and human correction.

Credential reference:
- `SEO_AGENT_LINKEDIN_ACCESS_TOKEN` and `SEO_AGENT_LINKEDIN_ORGANIZATION_ID` only after owner-approved OAuth/API setup. Store actual values only in `/opt/tachi-back/.env.seo-distribution-agent` or an approved secret store.

Agent capability after connection:
- Draft or publish owner-approved company posts if the API workflow is configured and posting scope is explicit. No automated DMs, scraped lead outreach, engagement pods, repetitive promotional comments, or personal-looking persona behavior.

Next action:
- Owner creates/connects the official company page or founder-owned profile, confirms the organization ID, and approves whether public metrics can be mentioned.

### YouTube Official Channel

Status: OWNER_ACTION_REQUIRED for channel creation, terms acceptance, and OAuth connection.

Profile copy:
- Channel name: `Nayovi`
- Handle preference: `@nayovi`
- Description: `Nayovi is an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows. It does not host or distribute chapters; it supports content users own, public-domain material, official samples, or content they have permission to process.`
- Primary link: `https://tachiyomiat.com/download`
- Secondary links: `https://nayovi.com`, `https://tachiyomiat.com/guides/translation-support-workflow`, `https://tachiyomiat.com/support`

Required assets:
- Square logo/avatar.
- Channel banner.
- 30-90 second narrated Android workflow demo.
- Thumbnail showing Android app flow without copyrighted chapter pages.

First upload metadata:
- Title: `Nayovi Android OCR Translation Workflow Demo`
- Description: `Official Nayovi demo for Android APK install, redeem-code activation, hosted OCR, and AI translation support. Nayovi does not host or distribute chapters; use it with owned, public-domain, official-sample, or permission-approved content. Download and support: https://tachiyomiat.com/download`
- Tags: `Nayovi, Android OCR, manga translation workflow, manhwa translation, hosted OCR`

Agent capability after connection:
- Upload/update demo metadata only after `SEO_AGENT_YOUTUBE_REFRESH_TOKEN` is configured. No automatic account creation or terms acceptance.

### LinkedIn Company Page

Status: OWNER_ACTION_REQUIRED for official company/founder page creation and API authorization.

Profile fields:
- Company name: `Nayovi`
- Tagline: `Android OCR and AI translation workflow for manga, manhwa, and manhua readers`
- Website: `https://nayovi.com`
- Primary CTA link: `https://tachiyomiat.com/download`
- Description: `Nayovi provides an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows, with official APK download, free trial access, redeem-code activation, monthly token plans, and support. Nayovi does not host or distribute chapters; it supports owned content, public-domain material, official samples, or content users have permission to process.`

Required assets:
- Logo/avatar.
- Banner that shows the Android app flow or neutral product UI.
- Canonical links to download, pricing, support, and workflow guide.

Agent capability after connection:
- Draft or publish official company posts only after `SEO_AGENT_LINKEDIN_ACCESS_TOKEN` and `SEO_AGENT_LINKEDIN_ORGANIZATION_ID` are configured and the owner approves posting scope.

### Product Hunt Maker/Product Profile

Status: OWNER_ACTION_REQUIRED for official maker account creation, product ownership, launch timing, and any terms acceptance.

Profile fields:
- Product name: `Nayovi`
- Tagline: `Android OCR translation workflow for manga and manhwa`
- Website: `https://tachiyomiat.com/download`
- Brand link: `https://nayovi.com`
- Short description: `Nayovi is an Android APK with hosted OCR, AI translation, redeem-code activation, free trial access, token plans, and support for permission-safe manga, manhwa, and manhua reader workflows.`

Required assets:
- Product logo/avatar.
- 3-5 screenshots showing install, activation, language choice, OCR/translation status, and support/recovery paths without copyrighted chapter pages.
- 30-90 second narrated demo video or GIF.
- Maker comment from `docs/seo-distribution/platform-drafts.md`.
- Responsible-use note and support/pricing links.

Credential reference:
- Use `SEO_AGENT_PRODUCTHUNT_TOKEN` only after the owner connects an official maker/company workflow. Do not request upvotes, automate comments, or create accounts.

Agent capability after connection:
- Prepare launch copy, update draft fields, and publish only when the owner confirms account authorization, launch date, and exact scope.

Next action:
- Owner chooses launch timing and confirms whether Nayovi should launch from a founder-owned maker profile or an official company profile.

### DEV and Medium Technical Publishing

Status: OWNER_ACTION_REQUIRED for official publication/profile creation, canonical-link policy review, and API/token connection.

Profile fields:
- Publication/profile name: `Nayovi`
- Bio: `Android hosted OCR and AI translation workflow for manga, manhwa, and manhua reader workflows, with permission-safe sample review and official APK support.`
- Primary link: `https://nayovi.com`
- Technical resource link: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- Support link: `https://tachiyomiat.com/support`

Required assets:
- Logo/avatar.
- Author/founder byline approved by owner.
- Canonical article drafts from `docs/seo-distribution/platform-drafts.md`.
- Canonical URL pointing to the owned guide when cross-posting is allowed.
- Screenshot or approved-sample visual only when rights context is documented.

Credential references:
- DEV: `SEO_AGENT_DEVTO_API_KEY`
- Medium: `SEO_AGENT_MEDIUM_INTEGRATION_TOKEN`

Agent capability after connection:
- Publish or update canonical technical posts only through authorized API workflows and only where duplicate-content/canonical handling is clear.

Next action:
- Owner creates official publication/profile, reviews byline preference, and connects API tokens if automated publishing is wanted.

### Reddit Official Account

Status: OWNER_ACTION_REQUIRED for account creation, email verification, subreddit rule review, and OAuth connection.

Profile fields:
- Username preference: `NayoviOfficial`, `NayoviApp`, or founder-owned account with clear Nayovi affiliation.
- Display name: `Nayovi`
- Bio: `Official Nayovi account for Android hosted OCR and AI translation workflow feedback. Nayovi does not host or distribute chapters; use it with owned, public-domain, official-sample, or permission-approved content.`
- Primary profile link: `https://nayovi.com`
- Support link when profile supports more than one URL: `https://tachiyomiat.com/support`

Required assets:
- Square logo/avatar.
- Short disclosure line for any subreddit post or comment: `Disclosure: I work on Nayovi.`
- No-link feedback drafts from `docs/seo-distribution/platform-drafts.md`.
- Subreddit rule notes for each exact target before posting; do not rely on old rules or generic Reddit advice.

Credential references:
- `SEO_AGENT_REDDIT_CLIENT_ID`
- `SEO_AGENT_REDDIT_CLIENT_SECRET`
- `SEO_AGENT_REDDIT_REFRESH_TOKEN`

Agent capability after connection:
- The agent can draft and, only after owner authorization plus current community rule review, publish no-link or link-allowed comments through the official Reddit API. No automated replies, voting, brigading, or repeated promotional submissions.

Next action:
- Owner creates the official account manually, confirms whether it is a brand or founder-owned account, and reviews the first target rules for `r/androidapps`, `r/androiddev`, and any manga/manhwa community before API posting is enabled.

### X/Twitter Official Account

Status: OWNER_ACTION_REQUIRED for account creation, phone/email verification, terms acceptance, and API connection.

Profile fields:
- Name: `Nayovi`
- Handle preference: `@nayovi`, `@nayoviapp`, or another owner-approved official handle.
- Bio: `Android OCR and AI translation workflow for manga, manhwa, and manhua reader workflows. No chapter hosting; use with owned, public-domain, official-sample, or permission-approved content.`
- Website: `https://nayovi.com`
- Pinned link target: `https://tachiyomiat.com/download`

Required assets:
- Square logo/avatar.
- Banner that shows neutral Android workflow or approved-sample UI only.
- First post queue:
  - `Nayovi is an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua readers. It focuses on official APK access, redeem-code activation, support, and permission-safe use.`
  - `We published a neutral comic OCR QA checklist for approved samples: permission scope, text coverage, reading order, glossary consistency, and sharing decisions.`
  - `Looking for feedback from Android reviewers, localization operators, and creator-platform teams on what proof makes an APK-based OCR workflow trustworthy.`

Credential reference:
- `SEO_AGENT_X_ACCESS_TOKEN`

Agent capability after connection:
- The agent can prepare or publish concise official updates only after API credentials are configured and owner posting scope is confirmed. No automated replies, trend hijacking, repetitive link posting, or personal-looking persona behavior.

Next action:
- Owner creates/connects the official account, approves the handle and bio, and decides whether the agent should remain draft-only or publish approved posts through the API.

### Android Developer Verification and Package Registry

Status: OWNER_ACTION_REQUIRED for identity verification, terms acceptance, package registration, and any Play Console or Android Developer Console steps.

Public packet fields:
- Official app name: `Nayovi`
- Official download URL: `https://tachiyomiat.com/download`
- Brand URL: `https://nayovi.com`
- Support URL: `https://tachiyomiat.com/support`
- Responsible-use URL: `https://tachiyomiat.com/guides/translation-support-workflow`
- Package name: owner must confirm.
- SHA-256: use the current public value from the download page.
- Signing-certificate fingerprint: owner must confirm from the release signing process.
- Android developer verification status: owner must confirm as `complete`, `pending`, `not started`, or `not applicable`.

Verification checklist:
- Use only the official Google/Android developer verification flow for identity and package registration.
- Do not upload government ID, accept terms, or complete identity checks through the agent.
- Keep package ownership and signing evidence in the release packet before approaching directories, app reviewers, or Android newsletters.
- If verification is incomplete, drafts must say `pending` rather than implying verified status.

Credential reference:
- Store any non-public workflow reference as `SEO_AGENT_ANDROID_DEVELOPER_VERIFICATION_REFERENCE`; do not store identity documents, private keys, signing keys, screenshots with secrets, or console cookies in docs or Git.

Agent capability after connection:
- The agent can update reviewer packets and directory drafts with owner-confirmed package name, signing fingerprint, and verification status. It must not submit identity documents, create developer accounts, or upload packages without explicit owner action.

Next action:
- Owner confirms package name, signing-certificate fingerprint, and Android developer verification status. Then the agent can add those exact public fields to the download-page release packet and directory submissions.

### Newsletter and Podcast Contributor Profiles

Status: OWNER_ACTION_REQUIRED for author/byline approval and publication-specific account setup.

Profile fields:
- Contributor name: owner-approved founder or official Nayovi team byline.
- Short bio: `Nayovi builds an Android hosted OCR and AI translation workflow for manga, manhwa, and manhua reader workflows, with permission-safe sample review and official APK support.`
- Long bio: `Nayovi provides an Android APK and hosted OCR/AI translation workflow for manga, manhwa, manhua, webtoon, and comic reader workflows. It does not host or distribute chapters; it supports owned content, public-domain material, official samples, or content users have permission to process.`
- Primary link: `https://nayovi.com`
- Technical link: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- APK trust link: `https://tachiyomiat.com/download`

Required assets:
- Founder-approved byline and optional headshot, or official logo when a publication accepts company bylines.
- Non-promotional topic packet for Android APK trust, OCR QA for visual storytelling, human review, or approved-sample workflow design.
- Screenshot/demo assets that avoid copyrighted chapter pages.

Credential references:
- Use publication-specific references only, such as `SEO_AGENT_ANDROID_WEEKLY_SUBMISSION_REFERENCE`, `SEO_AGENT_TLDR_AI_SUBMISSION_REFERENCE`, or `SEO_AGENT_NIMDZI_TOPIC_REFERENCE`, after owner approval. Do not store publication passwords, cookies, or editor correspondence secrets.

Agent capability after connection:
- Prepare and submit owner-approved topic notes only through official submission forms or editor-approved paths. No automated podcast booking, newsletter spam, or syndicated article posting without a publication's explicit workflow.

Next action:
- Owner approves the contributor byline and whether Android Weekly, TLDR AI, Nimdzi LIVE, or similar outlets may receive non-promotional topic notes.

### AI and App Directory Developer Profiles

Status: OWNER_ACTION_REQUIRED for any directory account creation, terms acceptance, paid listing decision, or form submission.

Listing fields:
- Product name: `Nayovi`
- Category: `Android app`, `AI OCR`, `manga translation workflow`, `manhwa translation`, `language technology`
- Website: `https://tachiyomiat.com/download`
- Brand URL: `https://nayovi.com`
- Technical URL: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- Pricing URL: `https://tachiyomiat.com/pricing`
- Support URL: `https://tachiyomiat.com/support`
- Short description: `Nayovi is an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua readers, with free trial access, redeem-code activation, monthly token plans, and official support.`
- Responsible-use note: `Nayovi does not host or distribute chapters; it supports content users own, public-domain material, official samples, or content they have permission to process.`

Directory quality filter:
- Use only official submit, claim, or developer-owner paths.
- Skip directories that require paid link packages, reciprocal backlinks, hidden redirects, mirror-first APK links, fake reviews, or unclear pricing/support fields.
- Prefer listings that can show official website, pricing, screenshots, support, and responsible-use context together.
- If the directory accepts `Free trial`, `Freemium`, or `Paid` labels, use the accurate pricing label rather than forcing Nayovi into a free-only category.

Required assets:
- Logo/avatar.
- 3-5 screenshots using approved or neutral sample material.
- Demo video URL when available.
- Current APK filename, build label, size, SHA-256, package name, signing fingerprint, and Android verification status once owner confirms them.

Credential references:
- Use per-platform non-secret references only, for example `SEO_AGENT_TOOLWORTHY_ACCOUNT_REFERENCE`, `SEO_AGENT_AIMATCH_ACCOUNT_REFERENCE`, or `SEO_AGENT_DIRECTORY_PORTAL_REFERENCE`.
- Do not store directory passwords, cookies, payment details, or verification tokens in docs or Git.

Agent capability after connection:
- Prepare and submit owner-approved listings only where the platform preserves source-of-truth links and does not require paid/reciprocal link placement. No account creation, CAPTCHA, payment, or terms acceptance through the agent.

Next action:
- Owner approves the directory quality filter and confirms whether ToolWorthy-style directories can be used when paid submissions exist but editorial criteria are applied equally.

### App Testing and Reviewer Portals

Status: OWNER_ACTION_REQUIRED for APK sharing, tester/reviewer access, redeem-code issuance, terms acceptance, or any paid testing decision.

Test profile fields:
- App name: `Nayovi`
- Official download URL: `https://tachiyomiat.com/download`
- Support URL: `https://tachiyomiat.com/support`
- Responsible workflow URL: `https://tachiyomiat.com/guides/translation-support-workflow`
- Test goal: `Validate install trust, redeem-code activation, hosted OCR progress, translation review, and support clarity for permission-safe sample pages.`

Required assets:
- Current APK metadata and SHA-256.
- Owner-approved redeem code or free-trial path.
- Public-domain, official-sample, or owner-approved test images.
- Screenshot/video publication rules.
- Device/Android-version matrix if the tester portal requests it.

Credential reference:
- `SEO_AGENT_APP_TESTING_PORTAL_REFERENCE` or a per-platform reference after the owner connects an official workflow. Do not store APK portal passwords, payment details, identity checks, or tester personal data in docs.

Agent capability after connection:
- Prepare test instructions and ingest non-secret report summaries after owner-approved testing. The agent must not upload APKs, issue redeem codes, start paid campaigns, or publish test videos without explicit owner action.

Next action:
- Owner decides whether to use a human app-testing service before the next Android press or directory push, and confirms which approved sample pages may be used.

### Hacker News Founder Account / Show HN Packet

Status: OWNER_ACTION_REQUIRED for founder-owned account use, manual posting, and manual reply handling.

Use case:
- Only use Hacker News if Nayovi is ready for technical scrutiny: working APK download, clear support path, pricing, responsible-use guide, and no misleading claims about hosted content.
- The agent must not create accounts, post automatically, request votes, generate reply floods, or post from a brand/fake persona.

Profile and submission fields:
- Account: founder-owned real account, not a throwaway.
- Title option: `Show HN: Nayovi - Android APK for hosted manga OCR translation`
- URL option: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist` if the founder wants a technical checklist-first submission, or `https://tachiyomiat.com/download` if the APK itself is the main thing being shown.
- First comment summary: `I am building Nayovi as an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows. The product does not host chapters. I am looking for technical feedback on APK source-of-truth links, hosted OCR flow, OCR block ordering, glossary consistency, and permission-safe sample handling.`

Required assets:
- Founder-approved public identity.
- Current APK metadata and source-of-truth download link.
- Technical checklist URL.
- Demo or screenshots using approved samples only.
- Support/pricing/privacy/terms links.

Credential reference:
- `SEO_AGENT_HN_ACCOUNT_REFERENCE` for a non-secret workflow note only. Do not store passwords, session cookies, recovery details, or private HN messages in docs or Git.

Agent capability after connection:
- The agent can prepare title/comment variants and summarize feedback after the founder posts manually. It must not publish, vote, reply, or automate engagement.

Next action:
- Founder confirms whether Nayovi is ready for a manual Show HN and whether the checklist-first or download-first URL is safer for the first submission.

### Android Newsletter Submission Profiles

Status: OWNER_ACTION_REQUIRED for owner-approved byline, submit-form use, and publication-specific rules review.

Use case:
- Android Weekly, Kotlin Weekly, and similar developer newsletters are useful only for developer-facing assets, not consumer app promotion.
- The strongest angle is independent APK trust plus hosted OCR workflow review: source-of-truth download, SHA-256, package/signing placeholders, safe samples, screenshot policy, and support links.

Submission fields:
- Suggested title: `A source-of-truth checklist for reviewing an independent Android OCR APK`
- Suggested URL: `docs/nayovi-apk-review-packet.md` until a public GitHub URL is chosen, or `https://tachiyomiat.com/guides/comic-ocr-translation-checklist` for a public web URL.
- Short note: `This is a developer-facing checklist for reviewing an independent Android APK with hosted OCR/AI translation: official source links, SHA-256, support/pricing/legal links, safe sample handling, and screenshot boundaries. It is useful for Android builders and reviewers evaluating direct APK distribution without mirror-first listings.`

Required assets:
- Public URL for the APK review packet or checklist.
- Owner-confirmed package name, signing fingerprint, and developer verification status when available.
- Approved screenshots or demo references.
- Non-promotional submitter byline.

Credential references:
- `SEO_AGENT_ANDROID_WEEKLY_SUBMISSION_REFERENCE`
- `SEO_AGENT_KOTLIN_WEEKLY_SUBMISSION_REFERENCE`

Agent capability after connection:
- The agent can prepare owner-approved link submissions and submit only through official newsletter forms if current rules allow. No paid sponsored submission, reciprocal links, or generic consumer app pitches without explicit owner approval.

Next action:
- Owner chooses the public URL to cite and confirms whether Android newsletter submissions should wait for package/signing fields or proceed with pending-language placeholders.
