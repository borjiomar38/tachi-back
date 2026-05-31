# Nayovi Official Account Setup

This file is maintained by the SEO distribution agent.

Only official Nayovi-owned accounts belong here. Do not add fake personas, throwaway accounts, passwords, tokens, recovery codes, cookies, or private credentials. Store secret values only in `/opt/tachi-back/.env.seo-distribution-agent` with strict permissions or an approved secret store; this document may reference variable names only.

## 2026-05-31 Cycle Owner-Action Advancement

| Priority | Platform | Purpose | Status | Owner/manual step | Required assets | Secret/API variable or credential reference | Publish capability after connection | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| high | Google Search Console | Search indexing and crawl visibility control for owned trust pages | setup_packet_prepared_owner_action_required | OWNER_ACTION_REQUIRED: verify `tachiyomiat.com`, `nayovi.com`, `translate-manhwa-ai.com` in official account and record verification method | Official primary URLs, sitemap endpoints, robots/llms routes, privacy/support links, organization fields | `SEO_AGENT_GOOGLE_SEARCH_CONSOLE_CREDENTIALS` | After owner confirmation, run URL inspection for newly published trust assets and monitor index coverage | Keep status unchanged until owner shares domain verification proof and first crawl audit notes |
| high | Bing Webmaster Tools | Secondary indexing coverage and search-control validation for backlink and trust routes | setup_packet_prepared_owner_action_required | OWNER_ACTION_REQUIRED: claim the same three domains and connect DNS/URL verification through official Microsoft flow | Owned-domain URLs, sitemap links, canonical guide paths, policy/LLM routes, support routes | `SEO_AGENT_BING_WEBMASTER_API_KEY` | After owner verification, monitor index coverage and inspect crawl anomalies before publishing new outbound draft claims | Keep action draft-only until domain verification is confirmed and audit notes are attached |

| Priority | Platform | Purpose | Status | Owner/manual step | Required assets | Secret/API variable | Publish capability after connection | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| high | Official launch/profile readiness packet | Shared profile fields for Product Hunt, YouTube, LinkedIn, DEV, Medium, and launch-community trust surfaces | setup_packet_prepared_owner_action_required | Owner approves official profile identity, public contact path, screenshots/demo media, launch timing, API scope, and package/signing language | `docs/seo-distribution/official-launch-profile-packet.md`, logo/avatar, banner, approved screenshots, demo video, official links, review-code policy reference | `SEO_AGENT_PRODUCTHUNT_TOKEN`, `SEO_AGENT_YOUTUBE_REFRESH_TOKEN`, `SEO_AGENT_LINKEDIN_ACCESS_TOKEN`, `SEO_AGENT_LINKEDIN_ORGANIZATION_ID`, `SEO_AGENT_DEVTO_API_KEY`, `SEO_AGENT_MEDIUM_INTEGRATION_TOKEN`; no secret values in docs | Agent can sync owner-approved copy and metadata after authorized account/API connection; no public posting, upload, comments, DMs, or launch action while accounts are unconfigured | Owner reviews the packet, approves which profiles are official, and confirms screenshots/demo/package facts before any profile goes live. |
| high | Reddit community strategy for Android-app discussion surfaces | Community trust and risk-safe founder visibility in Android discovery spaces | setup_packet_prepared_owner_action_required | Owner confirms eligible Reddit surfaces and official posting mode (community support vs. marketing); creates/uses founder or company account manually; aligns with subreddit rules and auto-filter behavior | Profile handle policy, official disclosure copy, no-link-first answer templates, moderation window notes, sample-safe support links, stop conditions | `SEO_AGENT_REDDIT_CLIENT_ID`, `SEO_AGENT_REDDIT_CLIENT_SECRET`, `SEO_AGENT_REDDIT_REFRESH_TOKEN`, `SEO_AGENT_REDDIT_ROUTING_REFERENCE` | Agent can draft no-link-first support/community content only in approved subreddits after owner confirms rules | Owner confirms whether r/androidapps/r/droidappshowcase pathways are allowed and sets a manual-first or API-posting policy. |
| high | Google Play identity packet for Android trust surface | Package identity and listing consistency for review, directories, and press contact | setup_packet_prepared_owner_action_required | Owner confirms whether official Google Play listing metadata can be published, captures package name/signing status language, and approves screenshot policy | `SEO_AGENT_ANDROID_PACKAGE_REFERENCE`, `SEO_AGENT_ANDROID_DEVELOPER_CONSOLE_REFERENCE`, official APK source/safety links, pricing and support paths | `SEO_AGENT_ANDROID_DEVELOPER_CONSOLE_REFERENCE`; no secret values in docs | Agent can align directory/editorial drafts with source-of-truth package identity after owner-confirmed facts | Owner confirms whether package name, signing details, and developer verification language are ready for public posting and which channels may reference it. |
| medium | Official founder/build-in-public profile | Founder-owned public profile for Indie Hackers, Hacker News, Product Hunt maker, and similar founder communities | setup_packet_prepared_owner_action_required | Founder uses or creates a truthful founder-owned account manually, accepts terms, discloses Nayovi affiliation, and approves no-link-first posts | Founder bio, source links, launch/profile packet, first post drafts, screenshots only if approved | `SEO_AGENT_FOUNDER_PROFILE_REFERENCE`; platform API token only if owner later authorizes official workflow | Agent can prepare founder-approved no-link feedback posts and launch comments; no voting, sockpuppets, DMs, or automated replies | Founder confirms which public founder profile can represent Nayovi and whether posts stay manual-only. |
| high | Official reviewer/source routing packet | Source-of-truth citation path for app reviewers, newsletters, podcasts, AI directories, localization partners, and investor diligence | setup_packet_prepared_owner_action_required | Owner confirms public contact, package facts, screenshot/demo rights, review-code policy, and which third-party reports may cite Nayovi | Official links, APK review packet, OCR checklist, approved-sample pilot guide, reviewer-routing packet, approved screenshot/demo references | `SEO_AGENT_REVIEWER_PACKET_REFERENCE`, `SEO_AGENT_REVIEW_CODE_POLICY_REFERENCE`; no private codes or contacts in docs | Agent can answer qualified reviewer/editor replies with the correct source link packet after owner confirmation; no APK upload or review request without approval | Owner confirms package/signing facts, public media contact, screenshot/demo references, and review-code handling before packet is used externally. |
| high | Official APK directory developer/reviewer profile | Trust-preserving Android APK review/listing profile for directories that can cite official source links without mirroring or mislabeling Nayovi | setup_packet_prepared_owner_action_required | Owner decides whether any APK directory may receive APK metadata, review-code access, screenshots, or upload permission; manual terms/account steps only | Official APK URL, package name, SHA-256, signing fingerprint, support/privacy/terms links, pricing summary, reviewer screenshot policy, no-mirror language | `SEO_AGENT_APK_DIRECTORY_PROFILE_REFERENCE`, `SEO_AGENT_APK_REVIEW_PORTAL_REFERENCE`; no APK credentials or private codes in docs | Agent can draft source-first listing/review packets after owner approval; no form submission, APK upload, mirror permission, or review request without explicit authorization | Owner confirms package/signing facts, APK sharing scope, mirror policy, and which directories may cite public hash/review-code language. |
| medium | Official AI directory submitter profile | Accurate AI-tool discovery profile for directories with Translation/OCR categories, freemium/free-trial pricing, and editorial review | setup_packet_prepared_owner_action_required | Owner creates/approves official submitter identity, public contact path, category, pricing label, and any directory-specific profile manually | One-line description, long description, logo/avatar, screenshots, canonical links, pricing/support URLs, responsible-use line, directory quality filter | `SEO_AGENT_AI_DIRECTORY_PROFILE_REFERENCE`; per-directory token only if official API workflow is later authorized | Agent can prepare category-accurate listing copy and reject low-quality paid/reciprocal/mirror-first flows after account connection | Owner reviews AI Gear Base/Flynto/IAToolFinder-style fields and confirms source-link handling before any manual listing. |
| medium | Crunchbase or equivalent startup profile | Investor, partner, journalist, and startup-directory identity surface with consistent company facts | setup_packet_prepared_owner_action_required | Owner creates or claims official company profile manually, accepts terms, approves public company identity, and decides which metrics can be public | Logo/avatar, company name, brand domain, product URLs, category tags, founder-approved boilerplate, public contact path, no private metrics unless approved | `SEO_AGENT_CRUNCHBASE_PROFILE_REFERENCE`; per-platform API token only if an official workflow is later authorized | Agent can prepare profile copy and keep public company facts consistent after owner confirms the profile; no automated claim, paid upgrade, or metric publication | Owner decides whether Crunchbase or another startup profile belongs in the trust stack and approves public fields before any profile action. |
| high | Android Developer Console verification workflow | Owner-controlled package registration and direct-APK trust under the 2026 Android developer verification rollout | setup_packet_prepared_owner_action_required | Owner completes identity, terms, package registration, and any required signed-APK proof manually; agent must not upload identity documents or accept terms | Package name, signed APK, signing-certificate fingerprint, current SHA-256, official download URL, support/privacy/terms URLs, approved screenshot policy | `SEO_AGENT_ANDROID_DEVELOPER_CONSOLE_REFERENCE`; no identity documents or login data | Agent can update reviewer packets and directory drafts with owner-confirmed public package/signing/verification facts only | Owner confirms whether Nayovi uses Android Developer Console, Play Console, or another official registration path and supplies exact public status language. |
| high | Official press/media kit page | Source-of-truth media packet for journalists, Android reviewers, newsletters, podcasts, AI directories, partners, and investor diligence | setup_packet_prepared_owner_action_required | Owner confirms public media contact, founder quote policy, logo/screenshot/demo rights, package/signing facts, and metrics that may be public | Brand boilerplate, official links, logo/avatar, screenshots, demo video, APK review packet, OCR checklist, approved-sample pilot guide | `SEO_AGENT_PRESS_CONTACT_REFERENCE`, `SEO_AGENT_DEMO_VIDEO_REFERENCE`, `SEO_AGENT_SCREENSHOT_ASSET_REFERENCE` | Agent can maintain an owned media-kit draft and platform-specific pitch packets after assets are approved | Create an owned media kit draft only after owner confirms public contact and approved visual assets; keep private contacts and metrics out of docs. |
| high | Creator platform partner profiles/contact paths | Official approved-sample feedback routing for creator platforms, publisher programs, and webtoon ecosystems | setup_packet_prepared_owner_action_required | Owner chooses eligible platforms/departments and approves no-link-first contact scope manually | Official profile fields, pilot brief, OCR checklist, screenshot-rights packet, approved-sample rules | `SEO_AGENT_CREATOR_PLATFORM_PROFILE_REFERENCE`, `SEO_AGENT_PARTNER_CONTACT_REFERENCE` | Agent can draft department-specific no-link notes after owner approval; no account creation or form submission without authorization | Owner selects correct WEBTOON-style department paths and confirms sample-safe scope before any send. |
| medium | Academic/conference contributor profile | Future non-promotional comics, localization, and OCR QA authority after original measurements exist | setup_packet_prepared_owner_action_required | Owner approves founder/byline, evidence scope, and submission eligibility manually | Founder bio, technical checklist, pilot brief, original approved-sample measurements, approved screenshots | `SEO_AGENT_CONFERENCE_PROFILE_REFERENCE`, `SEO_AGENT_RESEARCH_SUBMISSION_REFERENCE` | Agent can draft abstracts/topic outlines after owner-approved evidence exists; no submission/registration/payment action | Hold until approved-sample measurements and byline policy are ready. |
| high | Google Search Console | Search indexing, sitemap monitoring, canonical ownership signal | setup_packet_prepared_owner_action_required | Verify `tachiyomiat.com`, `nayovi.com`, and `translate-manhwa-ai.com` with official owner account | Domains, sitemap URLs, verification method | `SEO_AGENT_GOOGLE_SEARCH_CONSOLE_CREDENTIALS` | Submit sitemaps, monitor indexing, detect SEO issues | Owner verifies properties and submits sitemap; agent can inspect only after API credential is connected. |
| high | Bing Webmaster Tools | Secondary search indexing and sitemap submission | setup_packet_prepared_owner_action_required | Verify domains with official owner account | Domains, sitemap URLs, verification method | `SEO_AGENT_BING_WEBMASTER_API_KEY` | Submit sitemaps and monitor crawl/index data | Owner imports from GSC or verifies manually; agent can inspect only after API credential is connected. |
| high | GitHub official Nayovi repo/profile | Technical trust, docs, release notes, linkable OCR/QA assets | configured_owned_repo | Keep official repo/profile truthful and current | README, demo links, support links, responsible-use copy | SEO_AGENT_GITHUB_TOKEN optional; SSH remote already configured | Publish owned docs and technical assets | Keep owned docs synced with SEO/link assets. |
| high | Official GitHub trust packet | Owned repo/profile source-of-truth for README, release notes, reviewer docs, and neutral resource-list candidates | configured_owned_repo_packet_prepared | Owner confirms official organization/profile strategy, pinned repo/docs strategy, and public contact fields before any profile metadata changes | `docs/seo-distribution/official-github-trust-packet.md`, official links, logo/avatar, support/pricing links, responsible-use copy, review packet references | `SEO_AGENT_GITHUB_TOKEN` optional, `SEO_AGENT_GITHUB_ORG_REFERENCE`; no token, deploy key, SSH key, cookie, or recovery code in docs | Agent can maintain owned Markdown and branch pushes; external issues/PRs/comments remain blocked unless authorized and genuinely useful | Owner reviews the GitHub trust packet and decides whether the official profile README or pinned docs should be updated from it. |
| high | YouTube official channel | Demo video proof for reviewers, directories, and partners | setup_packet_prepared_owner_action_required | Create/connect official Nayovi channel, upload only approved-sample demo media, and authorize API only if automated metadata updates are wanted | Demo video, poster, avatar/banner, title, description, playlist names, canonical links, screenshot policy | SEO_AGENT_YOUTUBE_REFRESH_TOKEN | Upload/update official demo videos and descriptions after owner approval | Owner creates channel, approves first demo title/description below, and connects OAuth only if automated metadata updates are wanted. |
| high | LinkedIn company/founder profile | Founder/company trust, partner/investor visibility | setup_packet_prepared_owner_action_required | Create/connect official company page or founder-owned page | Logo, banner, company bio, website links | SEO_AGENT_LINKEDIN_ACCESS_TOKEN, SEO_AGENT_LINKEDIN_ORGANIZATION_ID | Publish official build-in-public and partnership posts | Owner creates/connects page and approves first post queue; agent remains draft-only until API access exists. |
| medium | Product Hunt maker/company | Launch credibility and early product feedback | setup_packet_prepared_owner_action_required | Create/connect official maker/company account and accept launch terms manually | Logo, tagline, demo video, product screenshots, pricing/support links, maker comment | SEO_AGENT_PRODUCTHUNT_TOKEN | Prepare launch page and authorized maker comments | Owner chooses launch timing, creates/connects maker profile, and approves the launch packet below; no upvote requests or automated comments. |
| medium | DEV/Medium technical publishing | Technical authority for OCR, merge QA, hosted Android workflow | setup_packet_prepared_owner_action_required | Connect official publication/profile account and approve canonical policy | Canonical article drafts, profile bio, logo, approved screenshots | SEO_AGENT_DEVTO_API_KEY, SEO_AGENT_MEDIUM_INTEGRATION_TOKEN | Publish canonical technical articles where allowed | Owner creates/connects official DEV or Medium profile; agent can publish only after approved API scope exists. |
| medium | Medium official publication/profile | Canonical technical trust archive for OCR QA, APK trust, and responsible-use notes | setup_packet_prepared_owner_action_required | Owner creates/connects official Medium profile or publication and approves canonical import policy manually | Profile bio, logo/avatar, canonical URLs, article draft, approved screenshots only | `SEO_AGENT_MEDIUM_INTEGRATION_TOKEN` | Publish owner-approved canonical posts only after account/API scope exists | Owner confirms whether Medium can syndicate the public comic OCR checklist with canonical URL back to Nayovi. |
| medium | Reddit official account | Community listening and careful no-link feedback posts | setup_packet_prepared_owner_action_required | Create official brand/founder account manually and review subreddit rules | Profile bio, no-link post drafts, support links, affiliation disclosure | SEO_AGENT_REDDIT_CLIENT_ID, SEO_AGENT_REDDIT_CLIENT_SECRET, SEO_AGENT_REDDIT_REFRESH_TOKEN | Draft or post rule-compliant no-link/value-first content | Owner creates official account, reviews target subreddit rules, and connects API only if posting is desired. |
| medium | X/Twitter official account | Lightweight product updates and partner discovery | setup_packet_prepared | Create/connect official Nayovi account | Bio, avatar, banner, first posts | SEO_AGENT_X_ACCESS_TOKEN | Publish concise official updates if API/rules allow | Owner creates official account and confirms whether API posting should be enabled. |
| high | Android editorial/source profile | Official Android reviewer and editorial contact packet for Android Authority, Android Central, newsletters, and app-review surfaces | setup_packet_prepared_owner_action_required | Owner approves public media contact, package/signing facts, screenshot/demo assets, review-code policy, and whether Android press may receive a source-first pitch | Press/media kit, APK review packet, reviewer access packet, Android verification readiness, sample-safe screenshots, demo references | `SEO_AGENT_ANDROID_EDITORIAL_PROFILE_REFERENCE`, `SEO_AGENT_PRESS_CONTACT_REFERENCE`, `SEO_AGENT_REVIEWER_PACKET_REFERENCE`; no private contacts or review codes in docs | Agent can prepare publication-specific no-link or source-first pitches after owner approval; no contact form, email, APK upload, or review-code action automatically | Owner confirms whether Android Authority-style editorial/product-promotion contact paths may receive a manual source-first APK trust note. |
| medium | Open-source AI accelerator/profile | Future accelerator or builder-program profile only if Nayovi has a qualifying open-source component, docs repo, or privacy-preserving AI workflow evidence | setup_packet_prepared_owner_action_required | Owner confirms eligibility, open-source scope, founder identity, application authority, public metrics, and terms acceptance manually | GitHub trust packet, technical docs, public roadmap, approved screenshots/demo, privacy/support links | `SEO_AGENT_ACCELERATOR_PROFILE_REFERENCE`; no application credentials or private metrics in docs | Agent can draft eligibility memos and application copy after owner approval; no application submission, grant claim, or accelerator endorsement automatically | Owner decides whether Mozilla Builders-style programs are relevant now or only a watch target until an open-source companion exists. |
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
| high | Official account action queue | Owner-safe execution list for profile setup and credential connection | configured_owned_repo_content_synced | Owner follows manual steps without exposing secrets | `docs/seo-distribution/official-account-action-queue.md`, official profile fields, approved assets | Non-secret references only; actual values stay in approved secret store | Agent can keep setup packets and draft queues synchronized | Owner works down the queue: webmaster verification, Android package identity, LinkedIn, YouTube, DEV/Medium, Reddit, Product Hunt, screenshots. |
| high | Official profile asset library | Reusable public profile, launch, directory, and reviewer asset packet | configured_owned_repo_content_synced | Owner approves public logo/banner/screenshot/demo references and package facts | `docs/seo-distribution/official-profile-asset-library.md`, official logo, banner, screenshot set, demo video, APK metadata | `SEO_AGENT_LOGO_ASSET_REFERENCE`, `SEO_AGENT_BANNER_ASSET_REFERENCE`, `SEO_AGENT_SCREENSHOT_ASSET_REFERENCE`, `SEO_AGENT_DEMO_VIDEO_REFERENCE`, `SEO_AGENT_ANDROID_PACKAGE_REFERENCE` | Agent can reuse consistent non-secret profile copy and asset references in setup packets and listing drafts | Owner approves asset references and public/private screenshot scope; agent must keep package/signing facts pending until confirmed. |
| high | Google Search Console action packet | Owner-owned search verification and sitemap submission sequence | setup_packet_prepared_owner_action_required | Owner signs in with official Google account, verifies domains, submits sitemap, and stores API credential only if agent monitoring is desired | Domain DNS/meta verification, sitemap URL, priority URL list, support/download/workflow links | `SEO_AGENT_GOOGLE_SEARCH_CONSOLE_CREDENTIALS`; no verification token values in docs | Agent can inspect indexing and sitemap diagnostics only after API credential exists | Owner verifies `tachiyomiat.com`, `nayovi.com`, and `translate-manhwa-ai.com`; first inspections: `/download`, `/translate-manhwa-ai`, `/guides/comic-ocr-translation-checklist`, `/guides/translation-support-workflow`. |
| high | YouTube official profile packet | Public demo proof for app reviewers, Product Hunt, directories, and partner diligence | setup_packet_prepared_owner_action_required | Owner creates official channel, approves demo media, and accepts terms manually | Logo, banner, approved demo video, thumbnail, description, playlist names, canonical links | `SEO_AGENT_YOUTUBE_REFRESH_TOKEN`, optional `SEO_AGENT_DEMO_VIDEO_REFERENCE` | Agent can draft video metadata or update owner-approved descriptions after OAuth connection | Owner confirms approved-sample video assets; first upload should be a no-chapter-hosting demo of install, activation, OCR progress, and support path. |
| high | Android developer verification readiness packet | Independent APK trust and reviewer confidence before Android 2026 verification rollout | configured_owned_repo_content_synced | Owner confirms package name, signing fingerprint, verification status, and package registration state manually | `docs/seo-distribution/android-developer-verification-readiness.md`, APK hash, official download URL, screenshot policy, approved samples | `SEO_AGENT_ANDROID_DEVELOPER_VERIFICATION_REFERENCE`, `SEO_AGENT_GOOGLE_PLAY_CONSOLE_REFERENCE`, `SEO_AGENT_ANDROID_PACKAGE_REFERENCE` | Agent can update review packets and drafts with owner-confirmed public Android identity facts | Owner supplies package/signing/verification facts; agent keeps pending language until confirmed. |
| medium | Substack/newsletter official profile | Owned subscriber channel for APK trust notes, OCR QA updates, and partner-friendly release context | setup_packet_prepared_owner_action_required | Owner creates/connects official Nayovi newsletter profile and accepts terms manually | Profile bio, logo, first issue draft, canonical links, screenshot rules, public contact path | `SEO_AGENT_SUBSTACK_PROFILE_REFERENCE`; optional API/RSS reference only if owner enables it | Agent can draft official newsletter issues or archive links after owner-approved account connection | Owner chooses whether newsletter is manual-only, confirms profile handle, and approves first issue topic. |
| high | GitHub organization/profile polish | Owned technical trust surface for repo docs, review packets, release notes, and official links | setup_packet_prepared_owner_action_required | Owner confirms or creates only an official Nayovi organization/profile and public contact fields | Logo, organization bio, website, pinned docs/repo list, support URL, responsible-use line | `SEO_AGENT_GITHUB_TOKEN` optional for API updates; SSH remote is enough for current repo | Agent can update owned docs, profile README drafts, and release packets after owner confirms org/profile scope | Owner confirms whether the official GitHub surface is a user profile, organization, or repo-only public docs surface. |
| medium | Mastodon/Fediverse official account | Public source-of-truth social profile for Android, localization, and open-web communities | setup_packet_prepared_owner_action_required | Owner creates/connects official Nayovi account manually on an owner-approved instance and accepts terms | Avatar, banner, bio, canonical links, first no-link posts, moderation/rules review | `SEO_AGENT_MASTODON_ACCESS_TOKEN` only if owner enables official API posting | Agent can draft concise official updates after account connection and instance rules review | Owner chooses instance/handle, stores token only in approved secret store if API posting is wanted, and confirms draft-only or publish scope. |
| high | Official social proof matrix | Connect account setup to verifiable public trust signals before outreach | configured_owned_repo_content_synced | Owner uses the matrix to decide which official profiles are live and citable | `docs/seo-distribution/official-social-proof-matrix.md`, official profile fields, screenshot policy, Android package facts | Non-secret references only; actual values stay in approved secret store | Agent can cite only confirmed live official profiles and keep inactive profiles marked owner-action-required | Owner completes GSC/Bing, Android package facts, screenshot assets, LinkedIn, YouTube, and canonical publishing setup in priority order. |
| medium | TikTok/short-video official account | Short demo proof and creator-safe visual snippets for Android reviewers and reader discovery | setup_packet_prepared_owner_action_required | Owner creates/connects official Nayovi account manually and approves short demo media plus platform terms | Avatar, bio, official links, 15-30 second approved-sample clips, no-chapter-hosting captions | `SEO_AGENT_TIKTOK_ACCOUNT_REFERENCE`; API token only if a compliant official workflow is approved | Agent can draft short-video captions and metadata after owner-approved account/media connection | Owner decides whether short video is appropriate, approves sample rights, and keeps account manual unless an official API workflow is configured. |
| medium | Discord/community official server profile | Controlled support/community presence for reviewers, beta testers, and creator-pilot feedback | setup_packet_prepared_owner_action_required | Owner creates/connects only an official Nayovi server/profile and accepts terms manually | Server purpose, rules, support boundaries, approved invite policy, no-piracy/no-chapter-sharing rules | `SEO_AGENT_DISCORD_BOT_TOKEN` only if owner enables a compliant bot workflow; no user tokens | Agent can draft server rules, pinned links, and support handoff copy after owner approval | Owner confirms whether Nayovi should have a Discord server and approves moderation rules before any public invite is cited. |
| high | Official press/media kit page | Owned source-of-truth profile packet for journalists, podcasters, newsletters, directories, and partner diligence | configured_owned_repo_needs_content_sync | Owner confirms public media contact path, founder quote policy, logo/screenshot rights, and which metrics can be public | Brand bio, founder-approved quote, logo/avatar, screenshots, demo video, APK trust packet, public contact path | No secret required; optional `SEO_AGENT_PRESS_CONTACT_REFERENCE` for non-secret routing only | Agent can keep an owned media kit draft and platform-specific media notes synchronized | Create an owned press kit draft that cites download-page citation readiness, OCR checklist, and approved-sample pilot guide without exposing private contacts. |
| medium | Podcast/newsletter source profiles | Public identity consistency for manga podcasts, Android newsletters, and localization newsletters | setup_packet_prepared_owner_action_required | Owner approves whether Nayovi/founder should create any publication-specific profile, byline, or source profile manually | Short bio, one-sentence responsible-use line, topic angles, canonical links, public contact path, approved screenshots only | Per-publication profile reference only; optional `SEO_AGENT_NEWSLETTER_PROFILE_REFERENCE`; no passwords or cookies | Agent can draft topic notes and source bios after owner confirms account/profile scope | Owner chooses which source profiles are appropriate; agent stays draft-only and uses official contact/submission paths. |
| medium | AI directory submitter profiles | Accurate AI/OCR directory discovery without weak link schemes | setup_packet_prepared_owner_action_required | Owner creates/connects only official submitter accounts when a directory requires login, terms acceptance, or email verification | Official profile fields, listing copy, pricing/support links, screenshots, responsible-use line, directory quality filter | `SEO_AGENT_AI_DIRECTORY_PROFILE_REFERENCE`; per-directory token only if official API exists | Agent can prepare or submit owner-approved listings only after the official account/API is connected and rules are checked | Owner approves which directories qualify; skip paid-link, reciprocal-link, forever-free-only, hidden-redirect, or mirror-first flows. |
| medium | Android app review/submission profiles | Reviewer-safe Android listing and app-test access | setup_packet_prepared_owner_action_required | Owner approves any app-review portal account, APK sharing scope, screenshot rights, and review-code access manually | APK review packet, SHA-256, package/signing placeholders, approved screenshots, support/pricing/legal links | `SEO_AGENT_ANDROID_REVIEW_PORTAL_REFERENCE`; no private portal login data | Agent can prepare portal-specific packets after owner confirms portal quality and approved test scope | Owner confirms package facts and whether APK upload or reviewer-code access is allowed before any external submission. |
| high | Owned press/media kit packet | Repo-native source-of-truth packet for journalists, podcasts, newsletters, directories, partners, and investors | owner_review_required | Owner confirms public contact path, profile identity, founder quote policy, logo/screenshot/demo rights, package facts, and public metrics manually | `docs/seo-distribution/press-media-kit-draft.md`, official profile fields, APK review packet, screenshot policy, OCR checklist, approved-sample pilot guide | `SEO_AGENT_PRESS_CONTACT_REFERENCE`, `SEO_AGENT_DEMO_VIDEO_REFERENCE`, `SEO_AGENT_SCREENSHOT_ASSET_REFERENCE`; no secrets in docs | Agent can sync owner-approved media-kit copy into directory, newsletter, podcast, LinkedIn, YouTube, Product Hunt, and partner drafts after approval | Owner reviews `docs/seo-distribution/press-media-kit-draft.md` and decides whether it becomes a public site page, repo-native packet, or both. |
| medium | Official AI directory submitter profile - Cocoon | Accurate reviewed AI-directory listing for Translation category without reciprocal, paid-link, or forever-free mislabeling | setup_packet_prepared_owner_action_required | Owner creates or authorizes official submitter identity, confirms email/contact path, and approves form fields manually | Tool name, website URL, Translation category, Freemium pricing, one-line plain-English description, responsible-use line, official source links | `SEO_AGENT_AI_DIRECTORY_PROFILE_REFERENCE`; per-directory token only if official API exists | Agent can prepare owner-approved listing fields and track review status only after account/contact approval | Owner reviews Cocoon listing packet; no form submission until official account/contact and listing copy are approved. |
| medium | Android newsletter/editorial submitter profile | Technical trust surface for independent APK review and hosted OCR testing resources | setup_packet_prepared_owner_action_required | Owner approves submitter identity, package/signing facts, screenshot set, and publication-specific submission path manually | `docs/seo-distribution/android-newsletter-submission-packet.md`, APK review packet, screenshot policy, package/signing facts, approved screenshots | `SEO_AGENT_ANDROID_NEWSLETTER_SUBMISSION_REFERENCE`; no private editor contacts or account credentials | Agent can prepare official newsletter/editorial submissions after owner confirms exact facts and official paths | Owner reviews the Android newsletter packet and confirms package/signing/screenshot fields before any Android Weekly/Kotlin Weekly/Android Developers-style submission. |
| high | Official app-testing/reviewer portal profiles | Third-party APK trust evidence for reviewers, AI directories, Android newsletters, and partner diligence | setup_packet_prepared_owner_action_required | Owner creates or authorizes only official Nayovi submitter profiles and manually approves any APK upload, tester scope, public report permission, and portal terms | APK review packet, signed APK URL, SHA-256, package/signing placeholders, approved screenshots, reviewer screenshot policy, safe sample plan, support/pricing/legal links | `SEO_AGENT_APP_TESTING_PORTAL_REFERENCE`; per-portal token only if an official API exists; no private login data | Agent can prepare portal-specific test briefs and review packets after owner approval; no upload, campaign, or review request without explicit authorization | Owner reviews AppTester.co/APKLand/AppsTested-style portal quality, confirms package facts and sample rights, and decides whether any public report may cite Nayovi. |
| medium | OCR/resource directory submitter profile | Product-light citation surface for comic OCR QA checklist and hosted Android OCR workflow | setup_packet_prepared_owner_action_required | Owner creates/connects official submitter identity only where a directory requires login or terms acceptance; agent must not submit forms automatically | Checklist title, canonical URL, neutral description, category tags, pricing/support context if product is listed, approved screenshots only if requested | `SEO_AGENT_OCR_RESOURCE_DIRECTORY_REFERENCE`; per-directory API token only if owner enables one | Agent can prepare no-link-first resource notes or accurate listings after current rules review | Owner approves whether OCR Vendors/Capterra-style OCR directories are resource-context only or eligible for an official listing; skip bid-placement, paid-link, reciprocal, or generic document-scanner mislabeling flows. |
| high | Official app testing/reviewer submitter profile | Owner-controlled Android app-health-check and independent review routing without fake reviews, mirror-first APK uploads, or unsafe screenshots | setup_packet_prepared_owner_action_required | Owner chooses eligible portals, approves terms manually, confirms APK sharing scope, sample pages, review-code policy, and whether any public report may cite Nayovi | `docs/seo-distribution/app-testing-review-brief.md`, APK trust profile, screenshot policy, signed APK URL, SHA-256, package/signing pending language, approved sample references | `SEO_AGENT_APP_TESTING_PORTAL_REFERENCE`; per-portal token only if official API exists; no private login data | Agent can prepare portal-specific fit questions and reviewer briefs after owner approval; no upload, tester campaign, public report approval, payment, or review request without explicit authorization | Owner reviews AppTester.co, APKLand, AppsTested, and similar portals against the brief, confirms source-link/no-mirror rules, and decides whether any testing path is allowed. |
| medium | AI/free-trial directory submitter profile | Accurate listing on directories that evaluate free trials, pricing, APIs, OCR, Translation, and workflow categories | setup_packet_prepared_owner_action_required | Owner approves official submitter identity, contact path, pricing label, category, and form-specific source-link handling manually | One-line description, long description, canonical links, pricing/support URLs, responsible-use line, screenshots only if approved, directory quality gate | `SEO_AGENT_AI_FREE_TRIAL_DIRECTORY_REFERENCE`; per-directory token only if official API exists | Agent can prepare eligibility questions for SpotFreeAI, Try.fm, ToolDirectory.AI, AiMatch, and similar surfaces after rules review | Owner confirms Nayovi can be represented as free trial plus paid monthly token plans and rejects forever-free, reciprocal-link, hidden-redirect, paid-placement, or mirror-first flows. |
| high | Official reviewer access packet | Source-of-truth handoff for Android reviewers, app-testing portals, AI directories, newsletters, podcasts, partners, and investor diligence | setup_packet_prepared_owner_action_required | Owner confirms public reviewer contact path, review-code policy, sample/screenshot scope, package facts, and whether any portal may publish test reports | `docs/seo-distribution/reviewer-access-packet.md`, APK review packet, screenshot policy, approved-sample pilot guide, support/pricing/privacy/terms links, approved demo references | `SEO_AGENT_REVIEWER_PACKET_REFERENCE`, `SEO_AGENT_REVIEW_CODE_POLICY_REFERENCE`, `SEO_AGENT_APP_TESTING_PORTAL_REFERENCE`; no private codes in docs | Agent can answer qualified reviewer/listing replies with source links and owner-approved access instructions after account/contact approval | Owner confirms package/signing facts, approved screenshots, review-code expiry/revocation policy, and which reviewers or portals may receive access. |
| medium | Official Q&A/support profile | Truthful support/community profile for Stack Overflow-style, Quora-style, Reddit support, Discord, or forum answers when users ask direct Nayovi questions | setup_packet_prepared_owner_action_required | Owner creates or confirms official support identity manually, accepts terms, approves affiliation disclosure, and decides whether answers remain manual-only | Profile bio, support URL, official source links, no-piracy support rules, no-link answer drafts, escalation policy | `SEO_AGENT_SUPPORT_COMMUNITY_PROFILE_REFERENCE`; per-community token only if owner authorizes an official API workflow | Agent can draft useful no-link support answers and cite official pages only when contextually requested and allowed | Owner chooses eligible Q&A/community surfaces and confirms no automated answers, scraped DMs, or promotional link drops. |
| medium | Official open social profile | Truthful Nayovi-owned public update surface for Mastodon, Bluesky, Fediverse-compatible profiles, and open-web communities | setup_packet_prepared_owner_action_required | Owner chooses official handle/instance, completes manual signup, email verification, terms acceptance, and approves profile copy/assets | `docs/seo-distribution/open-social-profile-packet.md`, logo/avatar, banner, canonical links, approved first post, public contact path | `SEO_AGENT_BLUESKY_HANDLE`, `SEO_AGENT_BLUESKY_APP_PASSWORD`, `SEO_AGENT_BLUESKY_PDS_URL`, `SEO_AGENT_MASTODON_INSTANCE_URL`, `SEO_AGENT_MASTODON_ACCESS_TOKEN`, `SEO_AGENT_OPEN_SOCIAL_PROFILE_REFERENCE` | Agent can prepare or publish owner-approved profile metadata and official updates only after account/API connection and rules review | Owner chooses whether Bluesky, Mastodon, or another open-social profile belongs in the trust stack and whether API posting stays disabled. |
| medium | Startup launch directory profile | Curated startup/launch-directory trust surface for BetaList, MicroLaunch, Uneed, Launching Next, Dev Hunt, and similar launch communities | setup_packet_prepared_owner_action_required | Founder/owner approves submitter identity, product stage, public contact path, terms acceptance, and any paid/priority review decision manually | `docs/seo-distribution/startup-launch-directory-packet.md`, logo/avatar, screenshots, canonical links, pricing/support links, founder-approved copy | `SEO_AGENT_STARTUP_LAUNCH_PROFILE_REFERENCE`, `SEO_AGENT_BETALIST_PROFILE_REFERENCE`, `SEO_AGENT_MICROLAUNCH_PROFILE_REFERENCE`, `SEO_AGENT_UNEED_PROFILE_REFERENCE` | Agent can prepare exact field-level listings and founder/maker comments after owner approval; no form submission or paid listing action automatically | Owner decides whether Nayovi qualifies as recently launched/pre-launch for each directory and rejects paid-backlink, reciprocal, hidden-redirect, or unsupported-metric flows. |
| medium | Free-trial AI directory and APK review handoff | Official submitter/reviewer profile for FreeAIList, SpotFreeAI, Try.fm, ToolsVerse, APKLand, AppTester-style surfaces | setup_packet_prepared_owner_action_required | Owner approves official submitter identity, exact pricing label, package/signing public language, sample-safe screenshots, review-code handling, and any portal terms manually | `docs/seo-distribution/free-trial-and-review-handoff-packet.md`, logo/avatar, approved screenshots, canonical links, pricing/support links, review-code policy reference | `SEO_AGENT_AI_DIRECTORY_PROFILE_REFERENCE`, `SEO_AGENT_APK_DIRECTORY_PROFILE_REFERENCE`, `SEO_AGENT_APK_REVIEW_PORTAL_REFERENCE`, `SEO_AGENT_REVIEW_CODE_POLICY_REFERENCE`, `SEO_AGENT_SCREENSHOT_ASSET_REFERENCE` | Agent can prepare field-level listing and reviewer-fit copy after owner approval; no signup, submission, APK upload, payment, or public review request automatically | Owner decides whether FreeAIList, ToolsVerse, or APKLand may receive an owner-reviewed manual fit question and confirms source-link preservation first. |

## 2026-05-29 Current Cycle Setup Advancement

## 2026-05-31 Current Cycle Setup Advancement

## 2026-05-31 Cycle-Advancement Update (this pass)

### Setup tasks advanced (priority)

| Priority | Platform | Purpose | Status | Owner/manual step | Required assets | Secret/API variable | Publish capability after connection | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| high | X/Twitter official profile | Short-form public trust updates for Android APK ownership and OCR workflow transparency | owner_action_required | Owner creates and confirms official brand or founder account manually; approves anti-spam and no-link-first policy before any API action | `docs/seo-distribution/open-social-profile-packet.md`, brand contact path, profile bio/links, avatar/banner policy | `SEO_AGENT_X_ACCESS_TOKEN` | Manual posts or approved API updates from one official owner profile only; no auto-engagement or mass-post automation | OWNER_ACTION_REQUIRED: confirm official account ownership and allowed posting scope before any outbound drafting goes live |
| high | Product Hunt + LinkedIn launch readiness | Official source-first launch and social trust setup for no-upvote/build-in-public spam controls | owner_action_required | Owner confirms maker/company identity, profile ownership, and launch timing in approved account(s) | `docs/seo-distribution/platform-drafts.md` launch queue, launch-safe checklist, canonical links, demo/screenshot policy, package-fact pending language | `SEO_AGENT_PRODUCTHUNT_TOKEN`, `SEO_AGENT_LINKEDIN_ACCESS_TOKEN`, `SEO_AGENT_LINKEDIN_ORGANIZATION_ID` | Manual/authorized posting only after owner approval; no auto-engagement or upvote tactics | OWNER_ACTION_REQUIRED: official account creation + terms + launch-window confirmation before any publish actions |
| high | Reddit official support/community profile | Official policy-safe support posture for direct Q&A / technical trust questions | owner_action_required | Owner chooses whether official Reddit presence is approved and creates/claims the official account manually | Official one-line bio, disclosure text, no-link answer template, canonical links, test-data permission rules | `SEO_AGENT_REDDIT_CLIENT_ID`, `SEO_AGENT_REDDIT_CLIENT_SECRET`, `SEO_AGENT_REDDIT_REFRESH_TOKEN` | No posting until owner confirms rules and manual review path; no comments without authorization | OWNER_ACTION_REQUIRED: official account setup, subreddit risk review, and approved no-link-first response policy |
| high | Google Search Console + Bing Webmaster verification | Owned trust foundation for crawl/index health before backlink scaling | owner_action_required | Owner verifies all 3 domains in official consoles and approves crawler-safe public language | `docs/seo-distribution/webmaster-and-entity-verification-packet.md`, sitemap URLs, canonical index list, anti-overclaim note | `SEO_AGENT_GOOGLE_SEARCH_CONSOLE_CREDENTIALS`, `SEO_AGENT_BING_WEBMASTER_API_KEY` | Index and entity status monitoring after credentials are connected; no API calls without owner-approved language | OWNER_ACTION_REQUIRED: owner completes verification and publishes only pending/public facts in shared packets |
| medium | Crunchbase and startup profile readiness | Official entity and startup visibility for investors/startup audiences | setup_packet_prepared_owner_action_required | Owner decides if this profile belongs in trust stack, approves company fields, and confirms no inflated metrics are shared | `docs/seo-distribution/official-launch-profile-packet.md`, `docs/seo-distribution/press-media-kit-draft.md`, official company bio/links, logo/avatar | `SEO_AGENT_CRUNCHBASE_PROFILE_REFERENCE`, `SEO_AGENT_STARTUP_DIRECTORY_PROFILE_REFERENCE` | Publisher and diligence teams can cite consistent company facts after profile creation/claim and owner approval of fields | OWNER_ACTION_REQUIRED: no entity claim, no metric publishing, and no paid directory actions without explicit owner authorization |

## 2026-05-31 Setup Progress Addendum

### Additional owner-action tasks advanced

| Priority | Platform | Purpose | Status | Owner/manual step | Required assets | Secret/API variable | Publish capability after connection | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| high | Google Search Console + Bing Webmaster | Owned domain verification and crawl monitoring before trust-surface expansion | owner_action_required | Owner verifies `tachiyomiat.com`, `nayovi.com`, `translate-manhwa-ai.com` and approves allowed public claim language | `docs/seo-distribution/webmaster-and-entity-verification-packet.md`, sitemap URLs, canonical index list, package/signing pending-language gates | `SEO_AGENT_GOOGLE_SEARCH_CONSOLE_CREDENTIALS`, `SEO_AGENT_BING_WEBMASTER_API_KEY` | Index monitoring and owner-reviewed ownership updates after verification status is confirmed | OWNER_ACTION_REQUIRED: complete account verification and refuse overclaim language before any crawl/sitemap claim |
| medium | SaaSHub / AI software profile | Controlled SaaS/AI directory readiness with anti-paid-link posture | owner_action_required | Owner approves if official package, pricing, and responsible-use claims can be represented without paid placement requests | `docs/seo-distribution/directory-submission-scorecard.md`, `docs/seo-distribution/free-trial-directory-listing-brief.md`, official APK/source links | `SEO_AGENT_AI_DIRECTORY_PROFILE_REFERENCE` or per-platform directory profile reference | Draft review notes only; no automated directory submission workflows without explicit authorization | OWNER_ACTION_REQUIRED: confirm directory field parity and review-linking rules before any submission question |
| high | Android app-directory profile readiness | Safe direct-APK editorial and reviewer surface setup without mirror claims | owner_action_required | Owner approves official submitter identity and exact source-link fields for official-source-first fit checks | `docs/seo-distribution/reviewer-access-packet.md`, package/screenshot policy, approved sample safety | Platform-specific form identity reference only (no credential in docs) | No posting until profile and legal-safe language are finalized | OWNER_ACTION_REQUIRED: decide whether a manual app-directory fit question is allowed or if watch-only is safer |

### High-priority official setup packets prepared in this cycle

| Priority | Platform | Purpose | Status | Owner/manual step | Required assets | Secret/API variable | Publish capability after connection | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| high | Product Hunt launch readiness + launch packet | Launch credibility for launch timing, maker review, and no-upvote-request behavior | setup_packet_prepared_owner_action_required | Owner creates or confirms official maker profile, approves launch date, one official launch post, first maker comment, and screenshot policy | `docs/seo-distribution/platform-drafts.md` (Product Hunt launch draft), canonical app links, launch-ready demo screenshot references, source-of-truth language, no-mirror policy notes | `SEO_AGENT_PRODUCTHUNT_TOKEN`, `SEO_AGENT_PRODUCTHUNT_PROFILE_REFERENCE` | Publish only after manual launch approval and optional API connect; no paid/upvote manipulation and no synthetic comments | Owner reviews final launch packet and approves launch-day manual workflow, maker comment policy, and post-launch stop-loss conditions |
| medium | FutureTools AI listing submitter profile | AI-tools discovery and free-trial fit surface for controlled directory exposure | setup_packet_prepared_owner_action_required | Owner approves official submitter identity, category fit, trial/paid-token wording, and live form rules on a per-submission basis | `docs/seo-distribution/free-trial-directory-listing-brief.md`, public link list, category tags, screenshot policy, official support line | `SEO_AGENT_AI_DIRECTORY_PROFILE_REFERENCE` and optional per-platform submission identity reference | Draft-fit checks and owner-approved listing variant can be prepared after setup; posting remains owner/manual unless authorized API workflow is approved | Owner confirms no paid/link-farm fields are required and that free-trial + paid-token positioning is accepted in the live form |
| medium | Android technical community/press contributor identity | Controlled technical editorial relationship for Android authority pages and trusted checklists | setup_packet_prepared_owner_action_required | Owner confirms if XDA-style editorial conversation is appropriate, selects one community identity, and approves no-link fallback | `docs/seo-distribution/platform-drafts.md` (APK trust checklist/tech draft), official profile fields, byline policy, no-link-first note, screenshot rights | `SEO_AGENT_ANDROID_EDITORIAL_PROFILE_REFERENCE` | Agent can prepare no-link and link-safe versions for manual outreach once account/profile is confirmed; no posting without owner review | Owner approves if XDA/community posting can remain no-link-first and not require unsafe screenshot claims |
| high | Google Search Console | Domain ownership and sitemap validation for three properties | setup_packet_prepared_owner_action_required | Owner verifies `tachiyomiat.com`, `nayovi.com`, `translate-manhwa-ai.com` properties and confirms verification method | Domain list, sitemap URLs, crawler-access notes, `docs/seo-distribution/webmaster-and-entity-verification-packet.md` | `SEO_AGENT_GSC_CREDENTIALS_JSON`, `SEO_AGENT_BING_WEBMASTER_CREDENTIALS` | Agent can sync verification status and submit owned sitemap updates after owner approval; no secret values entered | Owner completes verification once credentials are available, then confirm sitemap submission status can be monitored |
| high | Product Hunt + Launch profile readiness | Maker/company trust surface with launch-safe profile copy and no-link-first positioning | setup_packet_prepared_owner_action_required | Owner creates or confirms official maker/company profile, accepts terms, approves launch timing, and approves screenshot/demo rights | Canonical links, launch copy, screenshot set, legal-safe claims checklist, video or image proof references, launch FAQ | `SEO_AGENT_PRODUCTHUNT_TOKEN`, `SEO_AGENT_PRODUCTHUNT_PROFILE_REFERENCE` | Agent can only draft launch packet updates, status text, no-link-first launch checklist, and comments once token/profile is connected | Owner confirms profile ownership and launch timing; then platform-specific draft can proceed with manual posting only |
| medium | GitHub repo docs publisher profile | Repo-native trust surface for SEO, support docs, and reviewer-ready source references | setup_packet_prepared_owner_action_required | Owner confirms official GitHub org/profile ownership and whether a docs-first public profile update is approved | `docs/seo-distribution/official-github-trust-packet.md`, org avatar/logo, social links, support contact path | `SEO_AGENT_GITHUB_ORG_NAME` (reference only), `SEO_AGENT_GITHUB_APP_TOKEN` only if owner enables workflow | Agent can normalize README/docs copy and prepare maintainer-facing review notes after profile settings are connected | Owner confirms if API publishing is allowed or manual update only; then keep all edits owner-approved |
| medium | Android newsletter editor packet (Android Weekly/Kotlin Weekly) | Credible technical editorial submission path for APK trust and checklist assets | setup_packet_prepared_owner_action_required | Owner approves packet ownership fields and editorial style constraints before any outreach | `docs/seo-distribution/android-newsletter-resource-pitch.md`, package facts, screenshot policy, canonical links | `SEO_AGENT_ANDROID_NEWSLETTER_REFERENCE` | Agent can prepare one exact suggestion variant only after owner-approved packet fields and manual submission rules are confirmed | OWNER_ACTION_REQUIRED: official manual submission workflow cannot run autonomously until owner confirms package and sample-safe references |


### Directory and App-Review Submission Registry

Status: OWNER_ACTION_REQUIRED for official submitter identity, manual account setup, terms acceptance, package/signing facts, approved screenshots/demo assets, and per-platform submission approval.

Prepared packet:
- `docs/seo-distribution/directory-submission-scorecard.md`

Public profile fields:
- Display name: `Nayovi`
- Submitter identity: owner-approved official Nayovi, founder, or developer identity only.
- One-line description: `Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows.`
- Primary source: `https://nayovi.com`
- Official APK source: `https://tachiyomiat.com/download`
- Pricing: `https://tachiyomiat.com/pricing`
- Support: `https://tachiyomiat.com/support`
- Responsible-use line: `No chapter hosting; use only with owned, public-domain, official-sample, creator-provided, or permission-approved material.`

Credential references:
- `SEO_AGENT_AI_DIRECTORY_PROFILE_REFERENCE`
- `SEO_AGENT_AI_FREE_TRIAL_DIRECTORY_REFERENCE`
- `SEO_AGENT_APK_DIRECTORY_PROFILE_REFERENCE`
- `SEO_AGENT_APK_REVIEW_PORTAL_REFERENCE`
- `SEO_AGENT_STARTUP_LAUNCH_PROFILE_REFERENCE`
- `SEO_AGENT_APP_TESTING_PORTAL_REFERENCE`

Agent capability after connection:
- The agent can prepare field-level listing copy, score targets with the directory scorecard, and reject paid-link, reciprocal-link, hidden-redirect, mirror-first APK, fake-review, unsafe-screenshot, or misleading pricing flows.
- The agent must not create accounts, submit forms, upload APKs, accept terms, pay for listings, grant review codes, or claim acceptance without explicit owner approval.

Next action:
- Owner chooses which directory/app-review surfaces may receive manual fit questions and confirms package/signing/hash facts, screenshot/demo rights, public submitter identity, and whether any APK upload is allowed.

### Technical Publishing and Newsletter Canonical Profile

Status: OWNER_ACTION_REQUIRED for official byline, account creation or claim, canonical URL policy, visual asset approval, manual terms acceptance, and optional API token connection.

Prepared packets:
- `docs/seo-distribution/technical-publishing-syndication-packet.md`
- `docs/seo-distribution/android-newsletter-submission-packet.md`
- `docs/seo-distribution/official-newsletter-first-issue.md`

Public profile fields:
- Display name: `Nayovi`
- Byline: owner-approved founder name or `Nayovi team`; do not invent a personal persona.
- Bio: `Nayovi builds an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows. No chapter hosting; use only with owned, public-domain, official-sample, creator-provided, or permission-approved material.`
- Canonical URL for OCR article: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- APK source: `https://tachiyomiat.com/download`
- Support: `https://tachiyomiat.com/support`

Credential references:
- `SEO_AGENT_DEVTO_API_KEY`
- `SEO_AGENT_MEDIUM_INTEGRATION_TOKEN`
- `SEO_AGENT_HASHNODE_TOKEN`
- `SEO_AGENT_NEWSLETTER_API_TOKEN`
- `SEO_AGENT_TECHNICAL_PUBLISHING_PROFILE_REFERENCE`

Agent capability after connection:
- The agent can prepare canonical technical posts, newsletter link suggestions, and profile metadata after owner approval and rules review.
- The agent must not publish articles, import contacts, send bulk email, comment, cross-post without canonical handling, or use unsafe screenshots automatically.

Next action:
- Owner chooses DEV, Medium, Hashnode, newsletter archive, or manual-only publishing, approves canonical policy and screenshots, and confirms whether any API publishing is allowed.

### Webmaster and AI Search Entity Verification

Status: OWNER_ACTION_REQUIRED for domain verification, official owner account access, public contact approval, API credential connection, and owner-confirmed package/signing facts.

Prepared packet:
- `docs/seo-distribution/webmaster-and-entity-verification-packet.md`

Public verification fields:
- Primary app site: `https://tachiyomiat.com`
- Brand domain: `https://nayovi.com`
- SEO domain: `https://translate-manhwa-ai.com`
- Primary sitemap: `https://tachiyomiat.com/sitemap.xml`
- Official APK source: `https://tachiyomiat.com/download`
- Workflow page: `https://tachiyomiat.com/translate-manhwa-ai`
- Support: `https://tachiyomiat.com/support`
- Pricing: `https://tachiyomiat.com/pricing`

Credential references:
- `SEO_AGENT_GOOGLE_SEARCH_CONSOLE_CREDENTIALS`
- `SEO_AGENT_BING_WEBMASTER_API_KEY`
- `SEO_AGENT_AI_SEARCH_ENTITY_REFERENCE`
- `SEO_AGENT_CANONICAL_PROFILE_REGISTRY_REFERENCE`

Agent capability after connection:
- The agent can prepare sitemap submission notes, indexing issue summaries, and entity consistency checks after the owner verifies domains and connects approved API credentials.
- The agent must not publish search-console screenshots, private crawl metrics, verification tokens, DNS records, package-signing facts, or dashboard data in docs or Git.

Next action:
- Owner verifies `tachiyomiat.com`, `nayovi.com`, and `translate-manhwa-ai.com` in Google Search Console and Bing Webmaster Tools, approves canonical public profile fields, and confirms which profile links are source-of-truth.

### Official LinkedIn and YouTube Profile Setup

Status: OWNER_ACTION_REQUIRED for official account creation or claim, manual terms acceptance, public identity approval, visual asset approval, optional API/OAuth connection, and post/video approval.

Prepared public profile copy:
- Display name: `Nayovi`
- LinkedIn tagline: `Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows.`
- YouTube description: `Official Nayovi demos and APK trust updates for the Android app and hosted OCR/AI translation workflow. Nayovi does not host chapters; demos should use owned, public-domain, official-sample, creator-provided, or otherwise permission-approved material.`
- Primary link: `https://nayovi.com`
- APK source: `https://tachiyomiat.com/download`
- Workflow link: `https://tachiyomiat.com/translate-manhwa-ai`
- Support: `https://tachiyomiat.com/support`
- Technical checklist: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`

Required assets:
- Logo/avatar, banner image, approved screenshots, approved sample-safe demo video, public support/contact path, pricing/support links, package-fact pending language, and review-code policy reference.

Credential references:
- `SEO_AGENT_LINKEDIN_ACCESS_TOKEN`
- `SEO_AGENT_LINKEDIN_ORGANIZATION_ID`
- `SEO_AGENT_YOUTUBE_REFRESH_TOKEN`
- `SEO_AGENT_DEMO_VIDEO_REFERENCE`
- `SEO_AGENT_SCREENSHOT_ASSET_REFERENCE`

Agent capability after connection:
- The agent can prepare profile metadata updates, post drafts, and video descriptions after owner approval and authorized API connection.
- The agent must not create accounts, verify email/phone, accept terms, scrape targets, send DMs, comment, upload videos, request followers, request upvotes, or publish repetitive backlink posts automatically.

Next action:
- Owner creates or claims official LinkedIn and YouTube surfaces, approves public copy and sample-safe assets, then decides whether posting remains manual-only or uses authorized API credentials.

### Creator Platform / Publisher Contact Profile

Status: OWNER_ACTION_REQUIRED for official byline or brand identity, correct department selection, sample-rights approval, manual terms/contact steps, and any future partner permission.

Prepared packet:
- `docs/seo-distribution/creator-platform-ai-translation-context.md`
- `docs/seo-distribution/creator-platform-screenshot-rights-packet.md`
- `docs/seo-distribution/reviewer-routing-packet.md`

Public profile fields:
- Display name: `Nayovi`
- Byline option: owner-approved founder name or `Nayovi team`; do not invent a personal persona.
- Bio: `Nayovi builds an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows. It does not host chapters and is designed for owned, public-domain, official-sample, creator-provided, or otherwise permission-approved material.`
- Primary source link: `https://nayovi.com`
- Workflow link: `https://tachiyomiat.com/translate-manhwa-ai`
- Approved-sample pilot link: `https://tachiyomiat.com/guides/permission-safe-manga-translation-pilot`

Credential/reference guardrails:
- `SEO_AGENT_CREATOR_PLATFORM_PROFILE_REFERENCE`
- `SEO_AGENT_PARTNER_CONTACT_REFERENCE`
- Store no private platform contacts, unpublished samples, creator emails, partner terms, review codes, or screenshots in docs or Git.

Publish capability after connection:
- Agent can prepare no-link-first platform-specific notes after owner approval. Contact form submission, partner applications, account creation, sample upload, terms acceptance, and public posting remain owner actions unless a compliant official API workflow is explicitly configured.

Next action:
- Owner chooses whether WEBTOON, Lezhin, NEDAMI, Bayi, or another creator/platform surface should receive a no-link approved-sample OCR QA question, then approves byline, department, sample scope, and whether any source links may be included.

### SpotFreeAI / Free-Trial Directory Submitter Profile

Status: OWNER_REVIEW_REQUIRED for official submitter identity, trial/pricing label approval, current submit-field review, and source-link preservation.

Prepared packet:
- `docs/seo-distribution/free-trial-directory-listing-brief.md`
- `docs/seo-distribution/directory-quality-gate.md`

Listing fields:
- Tool name: `Nayovi`
- Short description: `Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows.`
- Pricing label: `Trial Only` or `Freemium` only if the current directory fields preserve paid monthly token-plan context.
- Canonical links: `https://nayovi.com`, `https://tachiyomiat.com/download`, `https://tachiyomiat.com/pricing`, `https://tachiyomiat.com/support`
- Responsible-use line: `No chapter hosting; use with owned, public-domain, official-sample, creator-provided, or permission-approved material.`

Credential/reference guardrails:
- `SEO_AGENT_SPOTFREEAI_PROFILE_REFERENCE`
- `SEO_AGENT_AI_FREE_TRIAL_DIRECTORY_REFERENCE`
- Store no submitter passwords, cookies, email verification links, paid-placement receipts, private review codes, or analytics in docs or Git.

Publish capability after connection:
- Agent can prepare exact field-level listing copy after owner approval and current rules review. The agent must reject flows requiring forever-free wording, paid backlinks, reciprocal links, hidden redirects, open-source mislabeling, mirror-first APK handling, or unsupported ranking claims.

Next action:
- Owner reviews whether SpotFreeAI's current `Trial Only` or `Freemium` filters can accurately represent Nayovi before any manual submit-tool action.

### Official Open Social Profile

## 2026-05-30 Current Cycle Setup Advancement

### Android Verification Public Profile Packet

Status: OWNER_ACTION_REQUIRED for package registration, identity verification, terms acceptance, package/signing/hash confirmation, screenshot/demo approval, and any API credential connection.

Prepared packet:
- `docs/seo-distribution/android-verification-public-profile-packet.md`

Public profile fields:
- Display name: `Nayovi`
- Short description: `Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows.`
- Brand domain: `https://nayovi.com`
- Official APK source: `https://tachiyomiat.com/download`
- Primary app site: `https://tachiyomiat.com`
- Support: `https://tachiyomiat.com/support`
- Responsible-use line: `No chapter hosting; use only with owned, public-domain, official-sample, creator-provided, or permission-approved material.`

Required assets:
- Package name, current APK filename/version, APK SHA-256, signing-certificate fingerprint, developer-verification status wording, approved screenshots, approved demo clips, sample-safe pages, review-code policy, and public support path.

Credential references:
- `SEO_AGENT_ANDROID_DEVELOPER_CONSOLE_REFERENCE`
- `SEO_AGENT_PLAY_CONSOLE_REFERENCE`
- `SEO_AGENT_APK_DIRECTORY_PROFILE_REFERENCE`
- `SEO_AGENT_APP_TESTING_PORTAL_REFERENCE`
- `SEO_AGENT_REVIEW_CODE_POLICY_REFERENCE`
- `SEO_AGENT_SCREENSHOT_ASSET_REFERENCE`

Publish capability after connection:
- Agent can prepare owner-approved Android profile metadata, app-testing briefs, reviewer replies, and directory fields after package facts and official credentials are connected.
- Agent must not create accounts, accept terms, verify identity, upload APKs, submit packages, grant private codes, publish screenshots, or claim verified status automatically.

Next action:
- Owner completes Android developer verification or package-registration steps manually, confirms public package/signing/hash wording, approves screenshot/demo assets, and decides which APK review or app-testing surfaces may receive the packet.

### Pricing-Aware AI Directory Submitter Profile

Status: OWNER_REVIEW_REQUIRED for official submitter identity, source-link behavior, pricing label, terms acceptance, category choice, and any manual listing action.

Prepared packet:
- `docs/seo-distribution/free-trial-directory-listing-brief.md`
- `docs/seo-distribution/directory-submission-scorecard.md`

Public profile fields:
- Tool name: `Nayovi`
- Category candidates: `Translation`, `OCR`, `Productivity`, `Android`, or `Reading` only where the directory supports accurate categorization.
- Pricing label: `Free Trial`, `Trial Only`, or `Freemium` only if paid monthly token plans remain visible.
- Canonical links: `https://nayovi.com`, `https://tachiyomiat.com/download`, `https://tachiyomiat.com/pricing`, `https://tachiyomiat.com/support`
- Responsible-use line: `Nayovi does not host chapters; use only with owned, public-domain, official-sample, creator-provided, or permission-approved material.`

Credential references:
- `SEO_AGENT_AI_DIRECTORY_PROFILE_REFERENCE`
- `SEO_AGENT_AI_FREE_TRIAL_DIRECTORY_REFERENCE`
- `SEO_AGENT_DIRECTORY_SUBMITTER_PROFILE_REFERENCE`

Publish capability after connection:
- Agent can prepare exact field-level copy for SpotFreeAI, FreeAIList, Try.fm, ToolDirectory.AI, AiMatch, AI Cloudbase, and comparable directories after owner approval and live-field review.
- Agent must reject forever-free, open-source, mirror-first APK, reciprocal-link, paid-backlink, hidden-redirect, fake-review, or unsupported-ranking flows.

Next action:
- Owner chooses which pricing-aware directory may receive a manual fit question first and confirms whether trial plus paid-token wording is acceptable for that surface.

## 2026-05-29 Cycle 12 Setup Advancement

### Search and Webmaster Verification Follow-Through

Status: OWNER_ACTION_REQUIRED for domain verification, official owner account access, API credential connection, and confirmation that no verification tokens or dashboard metrics are published.

Prepared public profile fields:
- Primary brand: `Nayovi`
- Primary site: `https://tachiyomiat.com`
- Brand domain: `https://nayovi.com`
- SEO domain: `https://translate-manhwa-ai.com`
- Primary sitemap: `https://tachiyomiat.com/sitemap.xml`
- High-intent pages: `https://tachiyomiat.com/download`, `https://tachiyomiat.com/translate-manhwa-ai`, `https://tachiyomiat.com/guides/best-android-manga-translator-apk`, `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`

Required assets:
- Domain ownership access, sitemap URL list, canonical link list, public support URL, privacy/terms URLs, and owner-approved profile fields.

Credential references:
- `SEO_AGENT_GOOGLE_SEARCH_CONSOLE_CREDENTIALS`
- `SEO_AGENT_BING_WEBMASTER_API_KEY`
- `SEO_AGENT_CANONICAL_PROFILE_REGISTRY_REFERENCE`

Publish capability after connection:
- Agent can prepare sitemap submission notes, indexing issue summaries, and public entity consistency checks after owner connects approved credentials.
- Agent must not write verification tokens, DNS records, dashboard screenshots, private crawl metrics, private query data, or credential values to docs or Git.

Next action:
- Owner verifies the three owned domains in Google Search Console and Bing Webmaster Tools, submits `https://tachiyomiat.com/sitemap.xml`, and approves which public profile URLs may be treated as official citations.

### Localization Media Contributor Profile

Status: OWNER_ACTION_REQUIRED for official byline, public contact path, approved-sample evidence, screenshot/demo approval, and manual acceptance of publication or podcast terms.

Prepared public profile fields:
- Display name: `Nayovi`
- Byline: owner-approved founder name or `Nayovi team`; do not invent a personal persona.
- Bio: `Nayovi builds an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows. It does not host chapters and is designed for owned, public-domain, official-sample, creator-provided, or otherwise permission-approved material.`
- Topic angle: `What Android manga OCR reviewers should check before trusting AI translation output: source permission, text-region coverage, speaker grouping, glossary drift, and human review.`
- Canonical links: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`, `https://tachiyomiat.com/guides/best-android-manga-translator-apk`, `https://tachiyomiat.com/translate-manhwa-ai`

Required assets:
- Approved-sample observations, screenshot rights, owner-approved byline, public contact route, media kit references, and product-light topic outline.

Credential references:
- `SEO_AGENT_MEDIA_CONTRIBUTOR_PROFILE_REFERENCE`
- `SEO_AGENT_SCREENSHOT_ASSET_REFERENCE`
- `SEO_AGENT_DEMO_VIDEO_REFERENCE`

Publish capability after connection:
- Agent can draft no-link-first podcast/newsletter pitches and contributor bios after owner approval.
- Agent must not pitch app installs, claim endorsement, cite private metrics, upload samples, submit forms, or contact editors automatically.

Next action:
- Owner chooses whether SlatorPod, Agile Localization, ROAR, IAMT Journal, or manga-specific media should receive a product-light approved-sample topic after evidence exists.

Status: OWNER_ACTION_REQUIRED for official handle/instance, manual account setup, email verification, terms acceptance, asset approval, and optional API token connection.

Prepared packet:
- `docs/seo-distribution/open-social-profile-packet.md`

Profile fields:
- Display name: `Nayovi`
- Bio: `Official Nayovi updates for the Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows. No chapter hosting; use only with owned, public-domain, official-sample, creator-provided, or permission-approved material.`
- Primary link: `https://nayovi.com`
- APK source: `https://tachiyomiat.com/download`
- Support: `https://tachiyomiat.com/support`
- Technical checklist: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`

Credential references:
- `SEO_AGENT_BLUESKY_HANDLE`
- `SEO_AGENT_BLUESKY_APP_PASSWORD`
- `SEO_AGENT_BLUESKY_PDS_URL`
- `SEO_AGENT_MASTODON_INSTANCE_URL`
- `SEO_AGENT_MASTODON_ACCESS_TOKEN`
- `SEO_AGENT_OPEN_SOCIAL_PROFILE_REFERENCE`

Agent capability after connection:
- The agent can prepare or publish owner-approved profile metadata and public update posts only after an official API workflow exists and the exact action is allowed.
- The agent must not create accounts, verify email/phone, accept terms, solve CAPTCHA, scrape DMs, auto-follow, auto-like, auto-reply, or use the profile for repetitive backlink posting.

Next action:
- Owner chooses official handle/instance, approves profile copy and visual assets, and decides whether open-social posting stays manual-only or API-enabled.

### Startup Launch Directory Profile

Status: OWNER_ACTION_REQUIRED for founder/company submitter identity, product-stage approval, public contact path, manual terms acceptance, visual assets, and any paid/priority-review decision.

Prepared packet:
- `docs/seo-distribution/startup-launch-directory-packet.md`

Listing fields:
- Startup name: `Nayovi`
- One-line description: `Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows.`
- Website: `https://nayovi.com`
- Product/source page: `https://tachiyomiat.com/translate-manhwa-ai`
- APK source: `https://tachiyomiat.com/download`
- Pricing: `https://tachiyomiat.com/pricing`
- Support: `https://tachiyomiat.com/support`

Credential references:
- `SEO_AGENT_STARTUP_LAUNCH_PROFILE_REFERENCE`
- `SEO_AGENT_BETALIST_PROFILE_REFERENCE`
- `SEO_AGENT_MICROLAUNCH_PROFILE_REFERENCE`
- `SEO_AGENT_UNEED_PROFILE_REFERENCE`

Agent capability after connection:
- The agent can prepare exact field-level listing copy and founder/maker comments after owner approval.
- The agent must not submit forms, create accounts, accept terms, pay for priority review, publish unsupported metrics, request votes, or batch-submit directory listings automatically.

Next action:
- Owner confirms whether Nayovi is eligible as pre-launch or recently launched for each directory and approves the startup-directory packet before any manual submission.

### Reviewer Access / Review-Code Routing Profile

Status: OWNER_ACTION_REQUIRED for reviewer contact path, private review-code policy, package facts, screenshot/demo approval, and portal-specific permission.

Prepared packet:
- `docs/seo-distribution/reviewer-access-packet.md`
- `docs/nayovi-apk-review-packet.md`
- `docs/reviewer-screenshot-policy.md`
- `docs/seo-distribution/app-testing-review-brief.md`

Required public fields:
- Product name: `Nayovi`
- Official source: `https://tachiyomiat.com/download`
- Workflow source: `https://tachiyomiat.com/translate-manhwa-ai`
- Support: `https://tachiyomiat.com/support`
- Pricing: `https://tachiyomiat.com/pricing`
- Responsible-use line: `Nayovi does not host or distribute chapters; testing should use owned, public-domain, official-sample, creator-provided, or otherwise permission-approved material.`

Credential references:
- `SEO_AGENT_REVIEWER_PACKET_REFERENCE`
- `SEO_AGENT_REVIEW_CODE_POLICY_REFERENCE`
- `SEO_AGENT_APP_TESTING_PORTAL_REFERENCE`
- Store private codes only in the approved secret store or owner-managed system, never in Git or docs.

Agent capability after connection:
- The agent can reply to qualified reviewer/editor/listing requests with source links and owner-approved access instructions.
- The agent must not generate, publish, email, or grant review codes; upload APKs; approve public reports; or permit screenshots without owner approval.

Next action:
- Owner confirms review-code expiry/revocation policy, public reviewer contact route, package/signing facts, approved screenshot references, and whether AppTester.co/TestFi/APKLand-style portals may receive access.

### Official Q&A / Support Community Profile

Status: OWNER_ACTION_REQUIRED for official identity, platform terms, affiliation disclosure, manual posting policy, and support escalation rules.

Priority surfaces to evaluate:
- Quora-style product questions only if asked organically and answer rules allow affiliation disclosure.
- Stack Exchange-style answers only when the answer is independently useful without a product link.
- Reddit support threads only after current subreddit rules review and official/founder account approval.
- Discord/forum support only if owner approves a no-piracy rule set and moderation scope.

Profile fields:
- Display name: `Nayovi`
- Bio: `Official Nayovi support profile for Android OCR and AI translation workflow questions. No chapter hosting; use with owned, public-domain, official-sample, creator-provided, or permission-approved content.`
- Primary link: `https://nayovi.com`
- Support link: `https://tachiyomiat.com/support`
- Download source: `https://tachiyomiat.com/download`

## 2026-05-29 Cycle 9 Setup Advancement

### App Review / Testing Portal Profile

Status: OWNER_ACTION_REQUIRED for manual portal account steps, APK upload permission, tester scope, screenshot policy, review-code policy, public-report permission, and any payment/terms approval.

Prepared packet:
- `docs/seo-distribution/app-testing-review-brief.md`
- `docs/seo-distribution/reviewer-access-packet.md`
- `docs/seo-distribution/directory-quality-gate.md`
- Public handoff: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`

Profile fields:
- Display name: `Nayovi`
- Product type: `Android APK and hosted OCR/AI translation workflow`
- Test scope: `Install source, permissions, activation, OCR coverage on approved samples, support path, pricing clarity, and screenshot safety.`
- Responsible-use line: `Nayovi does not host or distribute chapters; tests must use owned, public-domain, official-sample, creator-provided, or otherwise permission-approved material.`
- Canonical links: `https://nayovi.com`, `https://tachiyomiat.com/download`, `https://tachiyomiat.com/pricing`, `https://tachiyomiat.com/support`

Credential/reference guardrails:
- `SEO_AGENT_APP_TESTING_PORTAL_REFERENCE`
- `SEO_AGENT_REVIEWER_PACKET_REFERENCE`
- `SEO_AGENT_REVIEW_CODE_POLICY_REFERENCE`
- Store no APK upload credentials, portal passwords, private review codes, tester identities, unpublished reports, device IDs, screenshots, or payment records in docs or Git.

Publish capability after connection:
- Agent can prepare portal-specific test instructions and owner-approved reviewer replies after account/API connection.
- Agent must not upload APKs, start tester campaigns, approve public reports, request ratings, create fake reviews, accept terms, or pay for testing without explicit owner action.

Next action:
- Owner confirms APK filename/build, SHA-256, package name, signing fingerprint, Android developer verification/package-registration language, approved sample pages, screenshot boundaries, review-code expiry/revocation, and whether AppTester.co, APKLand, AppsTested, or similar portals may test Nayovi.

### Manga / Localization Media Contributor Profile

Status: OWNER_REVIEW_REQUIRED for byline, topic scope, approved-sample evidence, screenshots, source citations, and manual editorial contact.

Prepared packet:
- `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- `docs/seo-distribution/creator-platform-ai-translation-context.md`
- `docs/seo-distribution/creator-platform-screenshot-rights-packet.md`
- `docs/seo-distribution/platform-drafts.md`

Contributor fields:
- Byline: owner-approved founder name or `Nayovi team`; do not invent a personal persona.
- Topic: `How to evaluate OCR quality for manga, manhwa, manhua, webtoon, and comic pages before translating approved samples.`
- Source boundary: `No catalog processing, no chapter hosting, no replacement-localization claim, no backlink ask.`
- Source links: checklist first; product links only when the editor asks for implementation context.

Credential/reference guardrails:
- `SEO_AGENT_MEDIA_CONTRIBUTOR_PROFILE_REFERENCE`
- `SEO_AGENT_APPROVED_SAMPLE_EVIDENCE_REFERENCE`
- Store no private editor emails, unpublished screenshots, private samples, contracts, paid placement records, or embargoed media details in docs or Git.

Publish capability after connection:
- Agent can prepare no-link-first topic notes and editor-ready outlines after owner approval.
- Agent must not submit guest pitches, accept publication terms, upload media, claim metrics, or send follow-ups automatically.

Next action:
- Owner approves whether Mangasplaining/MSX, Mangacast, SlatorPod, IAMT Journal, or another media surface should receive a product-light OCR QA topic after approved-sample observations exist.

Credential reference:
- `SEO_AGENT_SUPPORT_COMMUNITY_PROFILE_REFERENCE`; per-community token only if the owner authorizes an official API workflow.

Agent capability after connection:
- The agent can draft no-link-first support answers and cite official support/download pages only when contextually requested and allowed.
- The agent must not scrape questions, auto-answer, create personal personas, send DMs, or use Q&A surfaces for promotional link drops.

Next action:
- Owner decides which support/community surfaces are official enough to cite and whether all answers remain manual-only.

### Free-Trial AI/Software Directory Submitter Profile

Status: OWNER_ACTION_REQUIRED for official submitter identity, directory-specific account or terms steps, category/pricing approval, and source-link preservation.

Prepared packet:
- `docs/seo-distribution/free-trial-directory-listing-brief.md`
- `docs/seo-distribution/directory-quality-gate.md`

Priority surfaces to evaluate from current discovery:
- FreeAIList-style free-credit and free-trial directories.
- AI Cloudbase-style reviewed AI directories with trial/deal context.
- TheAIFest-style editorially verified submit-tool directories.
- SpotFreeAI, Try.fm, ToolDirectory.AI, and AiMatch-style pricing/filter directories already in the queue.

Required public fields:
- Tool name: `Nayovi`
- Short description: `Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows.`
- Pricing: `Free trial` when trial plus paid monthly token plans can be explained; `Freemium` only if paid token-plan context remains visible.
- Canonical links: `https://tachiyomiat.com/download`, `https://tachiyomiat.com/translate-manhwa-ai`, `https://tachiyomiat.com/pricing`, `https://tachiyomiat.com/support`.
- Responsible-use line: `No chapter hosting; use with owned, public-domain, official-sample, creator-provided, or permission-approved material.`

Credential reference:
- `SEO_AGENT_AI_FREE_TRIAL_DIRECTORY_REFERENCE`; per-directory token only if the platform offers an official API workflow and the owner authorizes it.
- Do not store submitter passwords, cookies, email verification links, paid-placement receipts, or private review-code data in docs.

Agent capability after connection:
- The agent can prepare exact listing fields and reject directories that require paid backlinks, reciprocal links, hidden redirects, mirror-first APK handling, forever-free wording, or open-source mislabeling.
- The agent must not submit forms, create accounts, accept terms, pay for listings, or upload APK assets automatically.

Next action:
- Owner approves the official submitter identity and decides whether FreeAIList, AI Cloudbase, TheAIFest, SpotFreeAI, Try.fm, ToolDirectory.AI, or AiMatch preserve source links and pricing context well enough for manual submission.

### Localization Media / Podcast Contributor Profile

Status: OWNER_ACTION_REQUIRED for byline or brand identity, public contact path, approved sample evidence, screenshots, and topic scope.

Priority surfaces to evaluate from current discovery:
- SlatorPod and Slator-style language industry media.
- Mangasplaining/MSX and Mangacast-style manga podcasts/newsletters.
- Android/newsletter surfaces only when the angle is APK trust and hosted OCR testing rather than consumer promotion.

Profile fields:
- Display name: `Nayovi`
- Byline option: owner-approved founder name or `Nayovi team`; do not invent a personal persona.
- Bio: `Nayovi builds an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows. It does not host chapters and is designed for owned, public-domain, official-sample, creator-provided, or otherwise permission-approved material.`
- Primary source link: `https://nayovi.com`
- Workflow source link: `https://tachiyomiat.com/translate-manhwa-ai`
- Technical source link: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`

Credential reference:
- `SEO_AGENT_MEDIA_CONTRIBUTOR_PROFILE_REFERENCE`; no media logins, private contacts, interview notes, embargoed materials, or unpublished metrics in docs.

Agent capability after connection:
- The agent can draft product-light topic notes and source packets after owner approval.
- The agent must not pitch unsupported metrics, claim platform permission, request backlinks, or imply Nayovi can process publisher catalogs.

Next action:
- Owner approves whether the first media angle should be `visual-storytelling OCR QA for approved samples`, `independent Android APK trust checks`, or `reader workflow boundaries for AI translation`.

### Official App Testing / Reviewer Submitter Profile

Status: OWNER_ACTION_REQUIRED for portal choice, manual account or terms steps, APK sharing scope, sample approval, review-code policy, and public-report permission.

Prepared packet:
- `docs/seo-distribution/app-testing-review-brief.md`
- `docs/seo-distribution/android-apk-trust-profile.md`
- `docs/reviewer-screenshot-policy.md`
- `docs/nayovi-apk-review-packet.md`

Profile and submission fields:
- Product name: `Nayovi`
- Category: `Android OCR and AI translation workflow`
- One-line description: `Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows.`
- Official APK URL: `https://tachiyomiat.com/download`
- Brand URL: `https://nayovi.com`
- Support URL: `https://tachiyomiat.com/support`
- Pricing URL: `https://tachiyomiat.com/pricing`
- Responsible-use line: `Nayovi does not host or distribute chapters; testing should use owned, public-domain, official-sample, creator-provided, or otherwise permission-approved material.`

Credential reference:
- `SEO_AGENT_APP_TESTING_PORTAL_REFERENCE` for a non-secret portal/account reference only.
- Per-portal API token only if the owner later authorizes an official API workflow.
- Do not store portal passwords, cookies, verification screenshots, private reviewer codes, or identity documents in docs.

Agent capability after connection:
- The agent can prepare portal-specific fit questions and reviewer briefs.
- The agent must not upload APK files, start tester campaigns, buy reviews, request ratings, approve public reports, or grant mirror permission without explicit owner approval.

Next action:
- Owner reviews AppTester.co, APKLand, AppsTested, and similar portals against `app-testing-review-brief.md`, confirms package/signing facts or pending-language copy, and chooses whether any portal may test from the official download page.

### AI / Free-Trial Directory Submitter Profile

Status: OWNER_ACTION_REQUIRED for official submitter identity, directory-specific rule review, contact path, category, pricing label, and source-link preservation.

Priority surfaces to evaluate:
- SpotFreeAI-style free-tier and trial-only directories.
- Try.fm-style free-trial software directories.
- ToolDirectory.AI-style pricing and category directories.
- AiMatch-style comparison directories with OCR, API, and Translation filters.

Required listing fields:
- Tool name: `Nayovi`
- Short description: `Android hosted OCR and AI translation workflow for manga, manhwa, and manhua reader workflows.`
- Category candidates: `Translation`, `OCR`, `Android`, `AI workflow`, or `Productivity` only if the live form supports accurate labels.
- Pricing: `Free trial` or `Freemium` only when the form allows paid monthly token plans to be described clearly.
- Canonical links: `https://tachiyomiat.com/download`, `https://tachiyomiat.com/translate-manhwa-ai`, `https://tachiyomiat.com/pricing`, `https://tachiyomiat.com/support`.
- Responsible-use line: `No chapter hosting; use with owned, public-domain, official-sample, creator-provided, or permission-approved material.`

Credential reference:
- `SEO_AGENT_AI_FREE_TRIAL_DIRECTORY_REFERENCE`; per-directory token only if the platform provides an official API workflow and owner authorization exists.

Agent capability after connection:
- The agent can prepare exact field-level listing copy and reject low-quality flows.
- The agent must not submit forms, create accounts, accept terms, pay for listings, or add reciprocal backlinks automatically.

Next action:
- Owner approves submitter identity and confirms which directories preserve source links and pricing context before any manual or authorized submission.

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

### GitHub Organization/Profile Polish

Status: OWNER_ACTION_REQUIRED for organization/profile ownership confirmation, public identity fields, and any API token connection.

Public profile fields:
- Name: `Nayovi`
- Bio: `Android OCR and AI translation workflow for manga, manhwa, and manhua reader workflows. Official APK, free trial, redeem-code activation, token plans, and permission-safe sample testing.`
- Website: `https://nayovi.com`
- Product/download link: `https://tachiyomiat.com/download`
- Support link: `https://tachiyomiat.com/support`
- Public docs to pin or cite: `docs/nayovi-apk-review-packet.md`, `docs/seo-distribution/android-apk-trust-profile.md`, `docs/reviewer-screenshot-policy.md`, `docs/seo-distribution/comic-ocr-checklist.md`

Required assets:
- Official logo/avatar.
- Optional profile README that links only to official source-of-truth pages.
- Owner-confirmed public contact path.
- No private emails, phone numbers, tokens, SSH keys, cookies, or verification screenshots.

Credential reference:
- `SEO_AGENT_GITHUB_TOKEN` only if the owner wants API profile/release updates. SSH remote access is already enough for current owned repo docs.

Agent capability after connection:
- The agent can keep owned technical docs, release packets, and profile README drafts current. External issues, PRs, or awesome-list submissions remain draft-only unless maintainer rules clearly allow the exact contribution.

Next action:
- Owner confirms whether Nayovi should present as a GitHub organization, founder-owned profile, or repo-only docs surface and approves the public bio/contact fields.

### Mastodon / Fediverse Official Account

Status: OWNER_ACTION_REQUIRED for instance choice, official account creation, terms acceptance, and any API token connection.

Profile fields:
- Display name: `Nayovi`
- Handle preference: owner-approved official handle on an instance that permits product/company accounts.
- Bio: `Android OCR and AI translation workflow for manga, manhwa, and manhua reader workflows. No chapter hosting; use with owned, public-domain, official-sample, or permission-approved content.`
- Primary link: `https://nayovi.com`
- Secondary link: `https://tachiyomiat.com/download`

First post queue:
- `Nayovi is an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows. It focuses on official APK access, free trial, redeem-code activation, monthly token plans, support, and permission-safe use.`
- `We maintain a public comic OCR checklist for approved samples: permission scope, OCR coverage, reading order, glossary consistency, human correction, and sharing decisions.`
- `Looking for feedback from Android reviewers, localization operators, creator-platform teams, and open-web app testers on what makes a direct APK workflow trustworthy.`

Required assets:
- Square logo/avatar.
- Banner using neutral product UI or approved-sample media only.
- Instance rules review before any post.

Credential reference:
- `SEO_AGENT_MASTODON_ACCESS_TOKEN` only if the owner enables official API posting. Store the actual value only in `/opt/tachi-back/.env.seo-distribution-agent` or an approved secret store.

Agent capability after connection:
- The agent can draft official posts and update owner-approved profile text after token connection. No automated replies, follows, boosts, scraping, or repetitive link posting.

Next action:
- Owner chooses the instance and handle, creates/connects the official account, and confirms whether it remains manual/draft-only.

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

### DEV Community Official Profile

Status: OWNER_ACTION_REQUIRED for official profile creation, API token connection, and canonical article approval.

Profile fields:
- Display name: `Nayovi`
- Username/handle preference: owner-approved official Nayovi handle.
- Bio: `Android OCR and AI translation workflow for manga, manhwa, and manhua reader workflows. No chapter hosting; approved samples and permission-safe use only.`
- Website: `https://nayovi.com`
- Primary article link: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`

First article packet:
- Title: `OCR translation QA checks for manga and manhwa pages`
- Tags: `ocr`, `localization`, `android`, `ai`
- Canonical URL: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- Angle: technical checklist for permission scope, OCR coverage, reading order, merged bubbles, glossary consistency, human correction, and screenshot boundaries.

Required assets:
- Official logo/avatar.
- Owner-approved screenshot references only; no unauthorized chapter pages.
- Canonical markdown draft from `docs/seo-distribution/platform-drafts.md`.

Credential reference:
- `SEO_AGENT_DEVTO_API_KEY` only if the owner enables official API publishing. Store the actual value only in `/opt/tachi-back/.env.seo-distribution-agent` or an approved secret store.

Agent capability after connection:
- The agent can prepare or publish owner-approved canonical DEV posts only when the account and API scope are connected. It must not post comments, automate engagement, or syndicate duplicate content without canonical policy approval.

Next action:
- Owner creates/connects the official DEV profile and approves whether the comic OCR checklist should be syndicated as a canonical post.

### Reddit Official / Founder Account

Status: OWNER_ACTION_REQUIRED for manual account creation, subreddit rules review, and any API connection.

Profile fields:
- Display name: `Nayovi` or founder-approved real identity with clear Nayovi affiliation.
- Bio: `Building Nayovi, an Android hosted OCR and AI translation workflow for manga, manhwa, and manhua reader workflows. Permission-safe samples only; no chapter hosting.`
- Website: omit by default unless profile links are appropriate; if used, prefer `https://nayovi.com`.

Posting rules:
- Use no-link drafts first unless the active subreddit rules clearly allow tool links.
- Disclose affiliation whenever Nayovi is named.
- Do not post in piracy, scanlation-request, free-chapter, or link-dump contexts.
- Do not use Reddit for support spam, automated replies, vote requests, or repeated promotional comments.

Required assets:
- No-link value-first drafts in `docs/seo-distribution/platform-drafts.md`.
- Current subreddit rules notes before each post.
- Support or checklist link only if requested or clearly allowed.

Credential reference:
- `SEO_AGENT_REDDIT_CLIENT_ID`, `SEO_AGENT_REDDIT_CLIENT_SECRET`, and `SEO_AGENT_REDDIT_REFRESH_TOKEN` only after owner-authorized API setup. Store actual values only in the approved secret store.

Agent capability after connection:
- The agent can prepare rule-compliant drafts and, only if explicitly authorized for a specific subreddit/action, publish no-link or link-light posts. If rules are unclear, draft only.

Next action:
- Owner creates/connects an official/founder account, chooses target communities, and confirms whether Reddit remains draft-only.

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

## 2026-05-29 Account Setup Advancement

### Product Hunt Official Maker and Company Packet

Status: OWNER_ACTION_REQUIRED for official maker/company account creation, launch timing, terms acceptance, product screenshots, and any API token connection.

Public profile fields:
- Maker/company name: `Nayovi`
- Tagline: `Android OCR and AI translation workflow for manga, manhwa, and manhua readers.`
- Website: `https://nayovi.com`
- Product URL: `https://tachiyomiat.com/download`
- Support URL: `https://tachiyomiat.com/support`
- Short description: `Nayovi is an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows. It supports official APK access, free trial or redeem-code activation, monthly token plans, and permission-safe testing with owned, public-domain, official-sample, creator-provided, or otherwise approved material.`

Required launch assets:
- Square logo/avatar and Product Hunt thumbnail.
- 3-5 approved screenshots that do not expose unauthorized chapters, private redeem codes, user data, or third-party catalog pages.
- Optional sample-safe demo video using the approved narrated demo or owner-approved replacement.
- Owner-confirmed package name, APK hash, signing fingerprint, Android developer verification status, and package registration state if those facts will be mentioned.
- Pricing summary that distinguishes free trial/redeem-code access from monthly token plans.

Credential reference:
- `SEO_AGENT_PRODUCTHUNT_TOKEN` only if the owner enables an official Product Hunt API workflow. Store the actual token only in `/opt/tachi-back/.env.seo-distribution-agent` or an approved secret store.

Agent capability after connection:
- The agent can keep launch copy, maker comment, screenshot captions, and reply drafts current after owner approval. It must not request upvotes, automate comments, message users, or post from a non-official account.

Next action:
- Owner creates or connects the official maker/company profile, chooses whether Nayovi should launch now or only collect pre-launch feedback, and approves the Product Hunt draft in `docs/seo-distribution/platform-drafts.md`.

### Crunchbase / Startup Entity Profile Packet

Status: OWNER_ACTION_REQUIRED for official company-profile creation or claim, terms acceptance, public company fields, and any verification step.

Public profile fields:
- Organization name: `Nayovi`
- Website: `https://nayovi.com`
- Product/download URL: `https://tachiyomiat.com/download`
- Category tags: `Android`, `OCR`, `AI Translation`, `Manga`, `Manhwa`, `Mobile Apps`, `Localization`
- Short description: `Nayovi is an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows.`
- Responsible-use line: `Nayovi does not host or distribute chapters; use it with owned, public-domain, official-sample, creator-provided, or otherwise permission-approved material.`
- Public contact: owner-approved public support or media path only; do not expose private emails in docs.

Required assets:
- Official logo/avatar.
- Founder/company identity only if owner approves it for public display.
- Approved public boilerplate from `docs/nayovi-official-profile-fields.md`.
- No private revenue, retention, investor, customer, or contact data unless the owner explicitly approves it for public use.

Credential reference:
- `SEO_AGENT_CRUNCHBASE_PROFILE_REFERENCE` or equivalent non-secret startup-profile reference only. Store no login data, cookies, tokens, verification documents, or paid-plan receipts in docs.

Agent capability after connection:
- The agent can keep public company facts synchronized across directory, investor, press, and partner drafts after the owner confirms the live profile. The agent must not claim funding, employees, traction, partnerships, store approvals, or verification status unless owner-confirmed.

Next action:
- Owner decides whether Crunchbase or an equivalent startup profile belongs in the public trust stack, creates/claims the official profile manually, and approves which company fields and metrics are public.

### Medium Canonical Publishing Packet

Status: OWNER_ACTION_REQUIRED for official Medium profile/publication creation, canonical import policy, article approval, and any integration token.

Public profile fields:
- Display name: `Nayovi`
- Bio: `Android OCR and AI translation workflow for manga, manhwa, and manhua reader workflows. No chapter hosting; approved samples and permission-safe use only.`
- Website: `https://nayovi.com`
- Canonical article URL: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- First article title: `OCR translation QA checks for manga and manhwa pages`

Required assets:
- Official logo/avatar.
- Owner-approved screenshot references only; no unauthorized chapter pages.
- Canonical markdown sourced from owned checklist content, with clear affiliation disclosure.
- Link back to the original canonical URL when syndicating.

Credential reference:
- `SEO_AGENT_MEDIUM_INTEGRATION_TOKEN` only if the owner enables official API publishing. Store the actual value only in `/opt/tachi-back/.env.seo-distribution-agent` or another approved secret store.

Agent capability after connection:
- The agent can prepare or publish owner-approved canonical Medium posts only after the official account and token scope are connected. No automated comments, follows, claps, contact scraping, or duplicate-content syndication without a canonical URL.

Next action:
- Owner creates/connects the official Medium profile or publication and approves whether the comic OCR checklist can be syndicated as a canonical, product-light technical article.

### Official Newsletter / Public Update Archive Packet

Status: OWNER_ACTION_REQUIRED for official newsletter account creation, sender identity, terms acceptance, first issue approval, and any API token connection.

Public profile fields:
- Publication name: `Nayovi Notes`
- Description: `Official updates on Nayovi's Android OCR and AI translation workflow, APK trust checks, approved-sample testing, and responsible-use boundaries.`
- Website: `https://nayovi.com`
- Primary source link: `https://tachiyomiat.com/download`
- Recommended footer line: `Nayovi does not host or distribute chapters. Use approved samples, owned material, public-domain works, or content you have permission to process.`

Required assets:
- Logo/avatar and optional banner using approved product UI or neutral brand graphics.
- First issue draft in `docs/seo-distribution/official-newsletter-first-issue.md`.
- Official links: brand domain, APK download, support, pricing, privacy, terms, OCR checklist, approved-sample pilot guide, and `llms.txt`.
- Owner-confirmed sender identity and reply/contact policy.

Credential reference:
- `SEO_AGENT_NEWSLETTER_API_TOKEN` or platform-specific credential reference only after owner enables an official API workflow. Do not store subscriber lists, imports, private emails, or tokens in docs.

Agent capability after connection:
- The agent can prepare owner-approved public archive issues and metadata. It must not import contacts, bulk-send email, scrape subscribers, or publish without explicit owner approval.

Next action:
- Owner creates/connects the official newsletter profile and approves whether the first issue should be published as a public archive post only, an email send, or both.

### Google Search Console and Bing Webmaster Verification Packet

Status: OWNER_ACTION_REQUIRED for owner-controlled domain verification and API credential connection.

Public properties:
- `https://tachiyomiat.com/`
- `https://nayovi.com/`
- `https://translate-manhwa-ai.com/`

Initial sitemap and inspection queue:
- `https://tachiyomiat.com/sitemap.xml`
- `https://tachiyomiat.com/download`
- `https://tachiyomiat.com/translate-manhwa-ai`
- `https://tachiyomiat.com/guides/translation-support-workflow`
- `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- `https://tachiyomiat.com/guides/permission-safe-manga-translation-pilot`
- `https://tachiyomiat.com/llms.txt`

Owner verification steps:
- Prefer DNS verification for each domain so the ownership signal survives deploy changes.
- If DNS is not available, use the owner-generated HTML file or meta-tag method and deploy only the public verification token intentionally.
- Submit the sitemap after verification and inspect the priority URLs above.
- Do not paste verification tokens, API keys, property access screenshots, or account emails into this repo.

Credential references:
- `SEO_AGENT_GOOGLE_SEARCH_CONSOLE_CREDENTIALS`
- `SEO_AGENT_BING_WEBMASTER_API_KEY`

Agent capability after connection:
- Monitor sitemap coverage, indexing status, canonical mismatches, crawl errors, and query/page discovery for the official APK, guide, and trust-packet URLs.
- Keep recommendations in docs only; no domain, DNS, or webmaster account action without owner approval.

Next action:
- Owner verifies all three domains and stores any API credential values only in `/opt/tachi-back/.env.seo-distribution-agent` with strict permissions.

### Official Substack / Newsletter Archive Packet

Status: OWNER_ACTION_REQUIRED for official account creation, sender identity, terms acceptance, and first-issue approval.

Profile fields:
- Publication name: `Nayovi`
- Short description: `Official updates on Nayovi's Android APK, OCR/AI translation workflow, APK trust packets, approved-sample testing, and responsible-use notes.`
- Primary link: `https://nayovi.com`
- Product/download link: `https://tachiyomiat.com/download`
- Technical checklist link: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`

First issue packet:
- Title: `What reviewers should verify before citing an independent Android OCR APK`
- Angle: official source link, APK hash/source context, package/signing fields as owner-confirmed facts only, approved-sample screenshots, support path, pricing/trial context, and no chapter hosting.
- No-link summary: `Nayovi keeps APK review, OCR QA, and approved-sample guidance in public source-of-truth packets so reviewers, partners, and directories do not need to infer identity from mirrors or social posts.`
- Link variant: cite the official download page and the comic OCR checklist only where newsletter platform rules allow canonical links.

Required assets:
- Official avatar/logo.
- Owner-approved banner or neutral product screenshot.
- Public contact path selected by owner.
- No contact imports, scraped subscriber lists, private codes, or customer data.

Credential reference:
- `SEO_AGENT_NEWSLETTER_ACCOUNT_REFERENCE`; optional API/token reference only if the platform provides an approved official API workflow.

Agent capability after connection:
- Draft owner-approved public issues and keep the archive aligned with APK trust, OCR checklist, and partner-pilot updates.
- No bulk sending, audience import, paid promotion, or automated replies without explicit owner approval.

Next action:
- Owner creates/connects the official newsletter profile and approves whether the first issue should stay manual-only or use an authorized API.

Agent capability after connection:
- The agent can prepare or publish owner-approved official updates only after API credentials are configured and posting scope is confirmed. No automated replies, trend hijacking, repetitive link posting, or personal-looking persona behavior.

Next action:
- Owner creates or connects the official account, chooses whether to verify a domain handle, and confirms whether the agent remains draft-only.

### Crunchbase Organization Profile

Status: OWNER_ACTION_REQUIRED for profile claim/creation, eligibility review, and any manual verification.

### Official Press / Media Kit Page

Status: OWNER_REVIEW_REQUIRED for public media contact, logo/screenshot rights, founder quote policy, and any public metrics.

Public profile fields:
- Name: `Nayovi`
- Category: `Android OCR and AI translation workflow for manga, manhwa, and manhua reader workflows`
- Short description: `Nayovi provides an official Android APK and hosted OCR/AI translation workflow for reader-owned, public-domain, official-sample, or permission-approved comic pages. It does not host or distribute chapters.`
- Primary website: `https://nayovi.com`
- APK source: `https://tachiyomiat.com/download`
- OCR QA resource: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- Approved-sample pilot guide: `https://tachiyomiat.com/guides/permission-safe-manga-translation-pilot`

Required assets:
- Official logo/avatar and banner reference.
- Approved screenshots or clear `OWNER_ACTION_REQUIRED` placeholder if screenshots are not yet approved.
- Demo video reference if owner confirms public sample rights.
- Founder-approved quote and whether revenue, trial, token, or usage metrics can be public.
- Public contact path; do not include private phone, WhatsApp, email aliases, credentials, or verification screenshots unless they are already intended for public use.

Credential reference:
- No secret is required for an owned static press kit. Use `SEO_AGENT_PRESS_CONTACT_REFERENCE` only as a non-secret routing label if the owner defines one.

Agent capability after owner approval:
- The agent can maintain an owned media kit draft and reuse it in podcast/newsletter/editorial notes. External publication profiles remain owner-action-required unless an official account/API workflow is connected.

Next action:
- Create the owned press kit draft after owner confirms public contact path, approved visual assets, and whether metrics or founder quotes can be public.

### AI Directory Submitter Profiles

Status: OWNER_ACTION_REQUIRED for any directory account creation, terms acceptance, paid submission decision, or API/token connection.

Profile/listing fields:
- Submitter/public name: `Nayovi`
- Product name: `Nayovi`
- Category: `Android app`, `AI OCR`, `AI translation`, `comic OCR`, or the closest supported directory category.
- One-line description: `Nayovi is an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows.`
- Pricing: `Free trial plus monthly token plans`; never `free forever` unless a directory supports exact trial wording.
- Primary URL: `https://tachiyomiat.com/download`
- Supporting URL: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- Responsible-use line: `Nayovi does not host or distribute chapters; use it with owned, public-domain, official-sample, or permission-approved content.`

Required assets:
- Logo/avatar and screenshots from the owner-approved asset library only.
- Current APK build label and SHA-256 from the official download/review packet.
- Public support, pricing, privacy, terms, and responsible-use links.
- No private portal credentials, cookies, verification codes, or payment details in docs.

Credential reference:
- `SEO_AGENT_AI_DIRECTORY_PROFILE_REFERENCE`; use per-directory credential references only after the owner connects an official workflow. Store actual values only in `/opt/tachi-back/.env.seo-distribution-agent` or another approved secret store.

Agent capability after connection:
- The agent can prepare directory-specific copy and, only after owner approval plus rule review, submit listings that preserve source-of-truth links and accurate pricing. The agent must skip paid-link packages, reciprocal backlinks, hidden redirects, mirror-first APK pages, fake reviews, and misleading free/open-source claims.

Next action:
- Owner approves whether AINovaTools, AI Tools Explorer, Best-AI.org, or similar directories are worth manual account setup after their current submission rules are reviewed.

### Android App Review / Submission Profiles

Status: OWNER_ACTION_REQUIRED for portal account creation, APK upload, reviewer-code issuance, terms acceptance, or public report approval.

Profile/listing fields:
- Product name: `Nayovi`
- Short description: `Official Android APK for hosted OCR and AI translation support in manga, manhwa, and manhua reader workflows.`
- Primary URL: `https://tachiyomiat.com/download`
- Review packet: `docs/nayovi-apk-review-packet.md`
- Screenshot policy: `docs/reviewer-screenshot-policy.md`
- Test boundary: use only owned, public-domain, official-sample, creator-provided, or permission-approved material.

Required assets:
- Signed APK source link from the official site, not a mirror-first upload unless the owner approves the portal.
- SHA-256, package name, signing fingerprint, and Android developer verification status when owner-confirmed.
- Approved screenshots, narrated demo, support URL, pricing URL, privacy URL, terms URL, and takedown policy.
- Review or pilot redeem code only after owner approval.

Credential reference:
- `SEO_AGENT_ANDROID_REVIEW_PORTAL_REFERENCE`; actual account credentials, portal tokens, and private report links stay out of Git and docs.

Agent capability after connection:
- The agent can prepare reviewer-safe portal packets and status notes. It must not upload APKs, start tester campaigns, approve public reports, request positive reviews, or create account sessions without owner approval.

Next action:
- Owner confirms package/signing facts, screenshot assets, and which review portals may receive APK or review-code access.

### Podcast / Newsletter Source Profiles

Status: OWNER_ACTION_REQUIRED for any publication-specific profile, byline, source account, or terms acceptance.

Profile fields:
- Display name: `Nayovi` or founder-approved real founder identity with clear Nayovi affiliation.
- Bio: `Building Nayovi, an Android OCR and AI translation workflow for manga, manhwa, and manhua reader workflows. Permission-safe samples only; no chapter hosting.`
- Primary link: `https://nayovi.com`
- Technical resource link: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- Media/reviewer link: `https://tachiyomiat.com/download`

Topic angles:
- Manga OCR QA before judging AI translation output.
- Why independent Android APK reviews need source-of-truth links, hashes, package identity, and screenshot rules.
- Permission-safe approved-sample pilots for creator platforms and localization teams.

Required assets:
- Founder-approved bio/byline.
- Logo/avatar and optional headshot if owner wants founder-led profiles.
- Approved screenshots only; no copyrighted chapter pages or private tester data.

Credential reference:
- Per-publication source profile reference only. Use `SEO_AGENT_NEWSLETTER_PROFILE_REFERENCE` if the owner later provides a non-secret profile handle/reference. Store actual credentials only in the approved secret store.

Agent capability after connection:
- The agent can prepare source bios and individualized topic pitches. It must not create accounts, subscribe/import contacts, post comments, or submit forms without owner approval and a compliant official workflow.

Next action:
- Owner chooses whether manga podcasts/newsletters, Android newsletters, or localization media should receive source-profile bios; agent prepares drafts only.

## 2026-05-29 Setup Packets

### Official Newsletter / Substack Profile

Status: OWNER_ACTION_REQUIRED for official account creation, terms acceptance, sender identity, and first issue approval.

Public profile fields:
- Publication name: `Nayovi Updates`
- One-line description: `Official notes on Nayovi Android APK trust, OCR translation QA, approved-sample testing, and responsible AI-assisted manga, manhwa, and manhua reader workflows.`
- About text: `Nayovi is an Android APK and hosted OCR/AI translation workflow. It does not host or distribute chapters; it supports owned content, public-domain material, official samples, or content the reader has permission to process.`
- Primary link: `https://nayovi.com`
- APK/source link: `https://tachiyomiat.com/download`
- Technical checklist link: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`

First issue packet:
- Title: `What reviewers should verify before citing an independent Android OCR APK`
- Angle: official source links, package/signing facts as pending until owner-confirmed, screenshot permission, review-code path, support/pricing links, and no chapter hosting.
- Do not import contacts, scrape emails, bulk-send, or turn this into outreach automation.

Required assets:
- Official logo/avatar.
- Optional banner using only product UI or approved-sample visuals.
- Owner-approved public sender/byline.
- Approved screenshot references only; no unauthorized pages or private redeem codes.

Credential reference:
- `SEO_AGENT_NEWSLETTER_API_TOKEN` only if the owner enables a compliant official API workflow. Store actual values only in `/opt/tachi-back/.env.seo-distribution-agent` or approved secret store.

Agent capability after connection:
- The agent can draft official issues, update public profile copy, and prepare canonical links after owner approval. It must not import contacts, send bulk email, or publish issues without explicit account/API authorization.

Next action:
- Owner creates/connects the official newsletter profile, approves sender identity and first issue scope, and confirms whether the agent remains draft-only.

### Medium Official Publication/Profile

Status: OWNER_ACTION_REQUIRED for profile creation, canonical policy approval, and optional API token connection.

Public profile fields:
- Display name: `Nayovi`
- Bio: `Android OCR and AI translation workflow for manga, manhwa, and manhua reader workflows. No chapter hosting; approved samples and permission-safe use only.`
- Website: `https://nayovi.com`
- Primary technical link: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`

First article packet:
- Title: `Comic OCR translation QA checks before judging AI output`
- Canonical URL: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- Angle: sample permission, OCR coverage, reading order, segmentation drift, glossary consistency, human correction, screenshot boundaries, and responsible public sharing.
- Disclosure: `Written by the Nayovi team as a product-light OCR QA checklist; Nayovi is an Android APK and hosted OCR/AI translation workflow.`

Required assets:
- Official logo/avatar.
- Canonical markdown draft from `docs/seo-distribution/platform-drafts.md`.
- Approved screenshots only if the owner confirms sample rights.

Credential reference:
- `SEO_AGENT_MEDIUM_INTEGRATION_TOKEN` only after owner-authorized API setup. Store actual values only in the approved secret store.

Agent capability after connection:
- The agent can prepare or publish owner-approved canonical Medium posts only when profile/API scope is connected. It must not automate claps, follows, replies, or duplicate syndication without canonical handling.

Next action:
- Owner creates/connects the official Medium profile or publication and confirms whether the comic OCR checklist can be syndicated with canonical URL back to Nayovi.

## 2026-05-29 Setup Packet Additions

### Product Hunt Official Maker/Company Profile

Status: OWNER_ACTION_REQUIRED for official maker/company account, launch timing, terms acceptance, and any API token.

Public profile fields:
- Product name: `Nayovi`
- Tagline: `Android OCR translation workflow for manga and manhwa`
- Website: `https://nayovi.com`
- Primary launch URL: `https://tachiyomiat.com/download`
- Short description: `Nayovi is an Android APK with hosted OCR, AI translation, redeem-code activation, free trial access, monthly token plans, and support for permission-safe manga, manhwa, and manhua reader workflows.`
- Responsible-use line: `Nayovi does not host or distribute chapters; use it with owned, public-domain, official-sample, or permission-approved content.`

Required assets:
- Official square logo/avatar.
- Launch gallery screenshots from owner-approved samples only.
- Optional 30-60 second demo video showing install, activation, OCR progress, output, pricing/support path, and no unauthorized pages.
- Maker comment from `docs/seo-distribution/platform-drafts.md`.

Credential reference:
- `SEO_AGENT_PRODUCTHUNT_TOKEN` only if the owner enables a compliant official API workflow. Store the actual value only in `/opt/tachi-back/.env.seo-distribution-agent` or an approved secret store.

Agent capability after connection:
- Prepare owner-approved launch copy, gallery metadata, and maker comments. The agent must not request upvotes, create comments from other accounts, scrape users, or post before owner-selected launch timing.

Next action:
- Owner creates/connects the official maker/company profile, confirms launch timing, and approves screenshots/demo media. Keep Product Hunt draft-only until those steps are complete.

### YouTube Official Demo Metadata

Status: OWNER_ACTION_REQUIRED for official channel creation, approved demo media, terms acceptance, and optional OAuth connection.

Channel fields:
- Channel name: `Nayovi`
- Handle preference: owner-approved official handle.
- Channel description: `Official Nayovi demos for Android OCR and AI translation workflows for manga, manhwa, and manhua reader workflows. Nayovi does not host or distribute chapters; demos use owned, public-domain, official-sample, or permission-approved content.`
- Website links: `https://nayovi.com`, `https://tachiyomiat.com/download`, `https://tachiyomiat.com/support`, `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`

First video metadata:
- Title: `Nayovi Android OCR translation demo with approved samples`
- Description: `This demo shows the official Nayovi APK source, activation flow, OCR progress, translation result, support path, and permission-safe sample boundary. Nayovi does not host or distribute chapters; use it with content you own, public-domain material, official samples, or content you have permission to process.`
- Playlist: `Nayovi Android OCR demos`
- Link order: official download, pricing, support, responsible workflow guide, comic OCR checklist.

Required assets:
- Logo/avatar, channel banner, thumbnail, approved demo clip, sample-rights notes, and screenshot-publication approval.

Credential reference:
- `SEO_AGENT_YOUTUBE_REFRESH_TOKEN` only if the owner wants API-assisted metadata updates. Store the actual value only in the approved secret store.

Agent capability after connection:
- Draft and update owner-approved titles, descriptions, playlists, and link ordering. No upload, comment automation, or community posting occurs without explicit owner approval and configured OAuth.

Next action:
- Owner confirms the official channel, approved demo clip, and whether metadata updates should remain manual or use the YouTube API.

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

## 2026-05-29 Setup Packets

### Official Social Proof Matrix

Status: CONFIGURED_OWNED_REPO_CONTENT_SYNCED.

Owned asset:
- `docs/seo-distribution/official-social-proof-matrix.md`

Use:
- Treat the matrix as the owner/growth-agent checklist for which official profiles are live, citable, still manual, or still blocked on credentials.
- Use the public copy in the matrix for LinkedIn, YouTube, DEV/Medium, Product Hunt, Reddit, Substack, Bluesky, Mastodon, and GitHub profile drafts.
- Do not cite inactive profiles in outreach. Mark them `OWNER_ACTION_REQUIRED` or `AUTHORIZED_ACCOUNT_REQUIRED`.

Next action:
- Owner completes GSC/Bing verification, confirms Android package facts, approves the screenshot/demo asset set, and then creates/connects LinkedIn plus YouTube first.

### TikTok / Short-Video Official Account

Status: OWNER_ACTION_REQUIRED for account creation, terms acceptance, sample rights, and any API connection.

Profile fields:
- Display name: `Nayovi`
- Handle preference: owner-approved official handle, ideally matching Nayovi brand naming.
- Bio: `Android OCR and AI translation workflow for manga, manhwa, and manhua reader workflows. Official APK, free trial, support, and permission-safe samples.`
- Primary link: `https://nayovi.com`
- Demo link for captions when allowed: `https://tachiyomiat.com/download`

First short-video angles:
- Official APK install and source-of-truth check.
- Redeem-code activation and free-trial path without showing private codes.
- OCR progress on an owned, public-domain, official-sample, or permission-approved page.
- Support path and responsible-use boundary.

Required assets:
- Square logo/avatar.
- Approved short demo clips only.
- Caption line: `Nayovi does not host or distribute chapters; use it only with owned, public-domain, official-sample, or permission-approved content.`

Credential reference:
- `SEO_AGENT_TIKTOK_ACCOUNT_REFERENCE`; no password, cookies, private session tokens, or verification screenshots in docs.

Agent capability after connection:
- The agent can draft captions and metadata. It must not upload videos, accept terms, follow accounts, comment, scrape, or automate engagement unless a compliant official API workflow and owner approval exist.

### Discord / Official Community Profile

Status: OWNER_ACTION_REQUIRED for server/profile creation, moderation rules, terms acceptance, and any bot/API connection.

Purpose:
- Support reviewer-code questions, beta-test feedback, creator-pilot discussions, and Android install/support handoff without using unofficial social DMs.

Server rules draft:
- No chapter sharing, piracy requests, scanlation requests, or unauthorized sample uploads.
- Support only official APK/download, activation, OCR workflow, pricing, and permission-safe sample testing.
- Do not post private redeem codes, payment details, phone numbers, or account screenshots.
- Staff/founder identities must be official and disclosed.

Credential reference:
- `SEO_AGENT_DISCORD_BOT_TOKEN` only if the owner later enables a compliant bot workflow. Never store user tokens or private invite controls in docs.

Agent capability after connection:
- The agent can draft server rules, pinned resource links, onboarding copy, and support triage responses. It must not create the server, invite users, DM members, scrape members, or automate replies without explicit authorized workflow.

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

Owned docs created:
- `docs/nayovi-apk-review-packet.md` now provides a GitHub-ready reviewer packet with official links, safe test scope, listing copy, metadata fields that require owner confirmation, and screenshot/publication boundaries.

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
- Pinned comment: `Official links: https://tachiyomiat.com/download for APK access and https://tachiyomiat.com/support for review-code or support questions. Nayovi does not host or distribute chapters; use it with owned, public-domain, official-sample, or permission-approved content.`

Verification steps:
- Owner creates or claims the official channel and accepts any YouTube terms manually.
- Owner uploads only demo footage that avoids copyrighted chapter pages unless explicit permission exists.
- Owner stores OAuth refresh token only as `SEO_AGENT_YOUTUBE_REFRESH_TOKEN` in `/opt/tachi-back/.env.seo-distribution-agent` if agent-assisted uploads/descriptions are wanted.
- Agent remains draft-only until channel, terms, and OAuth scope are confirmed.

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
- Founder-approved public metrics, if any. If metrics are not approved, use product progress and trust-building updates only.

First 3 post drafts:
- APK trust: `We are treating APK trust as part of the product: official source links, support, pricing, privacy, terms, review-code flow, and clear responsible-use boundaries before any reviewer or directory mention.`
- OCR QA: `For manga, manhwa, and manhua OCR, translation quality starts before translation: page flow, bubble order, merged OCR blocks, glossary consistency, and human review on approved samples.`
- Partner feedback: `Nayovi is looking for feedback from Android reviewers, localization operators, creator-platform teams, and publisher partners on permission-safe OCR workflows for approved samples.`

Agent capability after connection:
- Draft or publish official company posts only after `SEO_AGENT_LINKEDIN_ACCESS_TOKEN` and `SEO_AGENT_LINKEDIN_ORGANIZATION_ID` are configured and the owner approves posting scope. No automated DMs, scraped targeting, engagement pods, repetitive promotional comments, or personal-looking impersonation accounts.

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

### LinkedIn Company / Founder Profile Packet

Status: OWNER_ACTION_REQUIRED for official page/profile setup, manual identity steps, and API connection.

Use case:
- LinkedIn is a high-trust surface for partners, Android reviewers, localization operators, investors, and creator-platform teams. Use it for official build updates and partner context, not repeated promotional link drops.
- The agent must not create a LinkedIn page, impersonate a founder, scrape contacts, send DMs, or post without an official owner-connected workflow.

Public profile fields:
- Company/page name: `Nayovi`
- Tagline: `Android OCR and AI translation workflow for manga, manhwa, and manhua reader workflows.`
- Website: `https://nayovi.com`
- Product/download URL in posts: `https://tachiyomiat.com/download`
- About text: `Nayovi provides official APK download, free trial access, redeem-code activation, monthly token plans, support paths, and hosted OCR/AI translation for permission-safe manga, manhwa, and manhua reader workflows. Nayovi does not host or distribute chapters; it supports owned content, public-domain material, official samples, or content users have permission to process.`
- Categories: `Mobile app`, `Language technology`, `AI`, `OCR`, `Translation`, `Android`.

Required assets:
- Official logo/avatar.
- Banner using only owner-approved workflow visuals or neutral brand graphics.
- Public screenshot set governed by `docs/seo-distribution/creator-platform-screenshot-rights-packet.md`.
- Founder-approved public identity if a founder profile is used.
- First post queue from `docs/seo-distribution/platform-drafts.md`.

Credential references:
- `SEO_AGENT_LINKEDIN_ACCESS_TOKEN`
- `SEO_AGENT_LINKEDIN_ORGANIZATION_ID`
- Store actual values only in `/opt/tachi-back/.env.seo-distribution-agent` or an approved secret store.

Agent capability after connection:
- Draft and publish owner-approved official posts only when the account, organization ID, and posting scope are connected. No automated DMs, mass comments, connection scraping, engagement automation, or personal-looking personas.

Next action:
- Owner creates/connects the official company page or founder-owned profile, confirms public founder/company fields, and chooses whether LinkedIn remains manual-only or API-assisted for approved company posts.

### Creator Platform Screenshot Rights Packet

Status: OWNER_ACTION_REQUIRED for approved sample set and public/private asset scope.

Use case:
- YouTube, Product Hunt, LinkedIn, directories, Android reviewers, Reddit drafts, partner pilots, and creator-platform notes all need reusable visuals that do not imply unauthorized catalog processing.
- The agent should reuse `docs/seo-distribution/creator-platform-screenshot-rights-packet.md` before drafting or submitting any screenshot-heavy profile, listing, demo, or review packet.

Required assets:
- Owner-created, public-domain, official-sample, or creator-approved pages.
- Written approval reference for any creator-provided samples.
- Public caption text with no-chapter-hosting and permission-safe boundaries.
- Asset library reference such as `SEO_AGENT_SCREENSHOT_ASSET_REFERENCE`; do not store private contracts, raw credentials, or unpublished user material in docs.

Credential/reference guardrails:
- `SEO_AGENT_SCREENSHOT_ASSET_REFERENCE`
- Optional `SEO_AGENT_DEMO_VIDEO_REFERENCE`
- These are non-secret references only. Actual private asset locations, tokens, or approval documents belong in the approved secret store or owner-controlled storage.

Agent capability after owner confirmation:
- Reuse approved asset references and captions in setup packets, directory drafts, app-review packets, and platform posts. The agent must not publish screenshots, upload videos, or share sample pages externally unless the exact channel/action is owner-approved.

Next action:
- Owner approves the initial screenshot/demo asset set and marks which assets are public, partner-only, private-support-only, or blocked.

### Android Developer Verification Readiness Packet

Status: OWNER_ACTION_REQUIRED for package identity, signing fingerprint, developer verification status, and package registration facts.

Use case:
- Android reviewers, APK directories, app-testing portals, and Android newsletters now need more than a download button. They need official source links, APK hash context, package ownership facts, screenshot boundaries, and clear pending language for Android developer verification.
- The owned packet lives at `docs/seo-distribution/android-developer-verification-readiness.md`.

Public profile fields to confirm:
- Android package name: pending owner confirmation.
- Signing-certificate fingerprint: pending owner confirmation.
- Current APK SHA-256: use the public download page value only.
- Android developer verification status: pending owner confirmation.
- Package registration status: pending owner confirmation.
- Public screenshot/demo set: pending owner confirmation.

Required assets:
- Official APK download URL.
- Current APK metadata and SHA-256.
- Approved sample images or public-domain pages for testing.
- Reviewer screenshot policy.
- Support, pricing, privacy, terms, and responsible-use URLs.

Credential/reference guardrails:
- `SEO_AGENT_ANDROID_DEVELOPER_VERIFICATION_REFERENCE`
- `SEO_AGENT_GOOGLE_PLAY_CONSOLE_REFERENCE`
- `SEO_AGENT_ANDROID_PACKAGE_REFERENCE`
- Store only non-secret references in docs. Do not store identity documents, verification tokens, screenshots of private consoles, login sessions, or signing material in Git.

Agent capability after owner confirmation:
- Update reviewer packets, directory drafts, Android newsletter notes, and public pending/confirmed language. The agent must not complete identity verification, accept terms, upload APKs, or cite verification as complete unless the owner has confirmed the exact public facts.

Next action:
- Owner confirms package name, signing fingerprint, Android developer verification status, package registration state, and which facts may be public.

### Substack / Official Newsletter Profile

Status: OWNER_ACTION_REQUIRED for official account creation, handle choice, terms acceptance, and any publishing workflow.

Use case:
- A lightweight official newsletter gives partners, reviewers, investors, and creator platforms an owned trust surface for release notes, APK verification updates, OCR QA checklists, and approved-sample pilot lessons.
- It should not become a mass-email or scraped-contact channel. Use it only for opt-in subscribers and public archive pages.

Public profile fields:
- Publication name: `Nayovi`
- Tagline: `Android OCR and AI translation workflow notes for manga, manhwa, and manhua reader workflows.`
- About text: `Nayovi shares official APK trust notes, OCR QA checklists, responsible-use updates, and approved-sample workflow lessons for Android manga, manhwa, and manhua translation. Nayovi does not host or distribute chapters; it supports owned, public-domain, official-sample, or permission-approved content.`
- Website: `https://nayovi.com`
- Download URL: `https://tachiyomiat.com/download`
- First issue topic: `What reviewers should verify before citing an independent Android OCR APK`

Required assets:
- Official logo/avatar.
- Public profile copy from `docs/nayovi-official-profile-fields.md`.
- Android developer verification readiness packet.
- Approved screenshot policy.
- Canonical links to download, pricing, support, privacy, terms, and OCR checklist.

Credential/reference guardrails:
- `SEO_AGENT_SUBSTACK_PROFILE_REFERENCE`
- Optional future API/RSS reference only if owner enables a compliant workflow.
- Store no passwords, cookies, recovery codes, subscriber exports, or private account screenshots in docs or Git.

Agent capability after owner connection:
- Draft official newsletter issues and profile updates. Publishing remains owner-reviewed unless a compliant account/API workflow is configured for the exact action.

Next action:
- Owner decides whether an official newsletter profile should exist, chooses a handle, and approves the first issue draft before any public publication.

### Creator Platform Partner Profile / Contact Packet

Status: OWNER_ACTION_REQUIRED for official owner approval, department selection, and any platform-specific profile or contact workflow.

Use case:
- Creator platforms, publisher programs, and webtoon ecosystems can become legitimate partner conversations only when Nayovi asks for approved-sample workflow feedback and avoids catalog-processing or backlink requests.
- The public handoff page is `https://tachiyomiat.com/guides/permission-safe-manga-translation-pilot`.

Public profile/contact fields:
- Name: `Nayovi`
- Category: `Android OCR and AI translation workflow for approved manga, manhwa, and manhua samples`
- Short description: `Nayovi provides an official Android APK and hosted OCR/AI translation workflow for owned, public-domain, official-sample, creator-provided, or permission-approved pages. It does not host or distribute chapters.`
- Primary site: `https://nayovi.com`
- Pilot brief: `https://tachiyomiat.com/guides/permission-safe-manga-translation-pilot`
- OCR checklist: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`

Required assets:
- Official profile fields from `docs/nayovi-official-profile-fields.md`.
- Screenshot-rights packet and approved-sample rules.
- Owner-approved public contact path and founder/company byline.
- Optional reviewer/pilot-code policy after owner approval.

Credential/reference guardrails:
- `SEO_AGENT_CREATOR_PLATFORM_PROFILE_REFERENCE`
- `SEO_AGENT_PARTNER_CONTACT_REFERENCE`
- Store no platform passwords, verification emails, terms-acceptance screenshots, private contacts, or account cookies in docs or Git.

Agent capability after owner connection:
- Draft official partner profile fields and no-link approved-sample notes. The agent must not create profiles, choose departments, submit forms, or imply platform content may be processed without explicit permission.

Next action:
- Owner chooses which creator-platform paths are eligible, confirms the correct public department for each platform, and approves no-link-first copy before any send.

### Academic / Conference Contributor Profile Packet

Status: OWNER_ACTION_REQUIRED for founder/byline approval and formal submission eligibility review.

Use case:
- Comics, localization, and language-technology conferences can provide authority only when Nayovi has original approved-sample evidence, measurable OCR QA notes, and a non-promotional topic.
- This is not a product-submission surface today; it is a future research or practitioner byline setup packet.

Public profile fields:
- Byline: owner-approved founder or Nayovi team identity only.
- Bio: `Building Nayovi, an Android hosted OCR and AI translation workflow for approved manga, manhwa, and manhua reader workflows. Focused on source permission, OCR QA, human review, and safe public evidence.`
- Website: `https://nayovi.com`
- Technical resource: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- Pilot brief: `https://tachiyomiat.com/guides/permission-safe-manga-translation-pilot`

Required assets:
- Original approved-sample measurements before any abstract, talk, or paper.
- Owner-approved screenshots or anonymized QA tables.
- Clear disclosure that Nayovi is a product/workflow and that external research is cited as context only.

Credential/reference guardrails:
- `SEO_AGENT_CONFERENCE_PROFILE_REFERENCE`
- `SEO_AGENT_RESEARCH_SUBMISSION_REFERENCE`
- Store no conference login data, reviewer correspondence, unpublished manuscripts, private sample media, or acceptance documents in Git.

Agent capability after owner connection:
- Draft non-promotional abstracts, contributor bios, and topic outlines after owner confirms evidence and byline scope. No submission, terms acceptance, registration, or payment action is authorized.

Next action:
- Owner confirms whether Nayovi should prepare a future practitioner topic only after approved-sample measurements exist.

### Android Newsletter / Editorial Submission Packet

Status: OWNER_ACTION_REQUIRED for package/signing confirmation, approved screenshots, public submitter identity, and publication-specific path review.

Use case:
- Android newsletters and technical editors can cite a developer-facing trust checklist before app-directory or press outreach scales.
- This should be a technical resource about independent APK verification, hosted OCR testing, approved samples, and screenshot rules, not a consumer app announcement.

Prepared owned asset:
- `docs/seo-distribution/android-newsletter-submission-packet.md`

Required assets:
- Owner-confirmed package name and signing-certificate fingerprint.
- Current APK SHA-256 if a fresh build is cited.
- Owner-confirmed Android developer verification/package registration status.
- Approved screenshot/demo references only.
- Public editor/submission contact path; no private scraped contacts.

Credential/reference guardrails:
- `SEO_AGENT_ANDROID_NEWSLETTER_SUBMISSION_REFERENCE`
- Store no newsletter logins, private editor emails, passwords, cookies, or unpublished correspondence in docs or Git.

Agent capability after owner connection:
- Draft Android Weekly/Kotlin Weekly/Android Developers-style submissions and technical tip copy. The agent remains draft-only until owner confirms the path and account/contact authorization.

Next action:
- Owner reviews the packet and supplies package/signing/screenshot facts before any manual newsletter submission.

### 2026-05-29 Cycle 3 - LinkedIn Official Company/Founder Packet

Status: OWNER_ACTION_REQUIRED for company page or founder-owned profile creation, manual verification, and API connection.

Public profile copy:
- Name: `Nayovi`
- Tagline: `Android OCR and AI translation workflow for manga, manhwa, and manhua reader workflows.`
- About: `Nayovi provides an official Android APK and hosted OCR/AI translation workflow for readers who work with owned, public-domain, official-sample, creator-provided, or otherwise permission-approved manga, manhwa, and manhua pages. It supports official APK access, free trial or redeem-code activation, monthly token plans, support paths, and reviewer-safe testing. Nayovi does not host or distribute chapters.`
- Website: `https://nayovi.com`
- Product/download link for posts: `https://tachiyomiat.com/download`
- Trust asset for posts: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`

Required assets:
- Official logo/avatar and banner.
- Owner-approved founder/company identity.
- Public contact path or company page contact setting.
- Approved screenshots or demo references only.
- Owner-confirmed package/signing/verification facts before any APK trust claims.

Credential/reference guardrails:
- `SEO_AGENT_LINKEDIN_ACCESS_TOKEN`
- `SEO_AGENT_LINKEDIN_ORGANIZATION_ID`
- Store no passwords, cookies, scraped contacts, private DMs, phone-verification data, or verification screenshots in docs or Git.

Publish capability after connection:
- Agent can draft or publish owner-approved company posts only if official API access is connected and the exact action is authorized. Partner DMs, comments, and founder posts remain owner-review/manual unless separately authorized.

Next action:
- Owner creates or connects the official LinkedIn company/founder surface, approves the copy above, and confirms whether API-assisted company posting is allowed.

### 2026-05-29 Cycle 3 - YouTube Official Demo Channel Packet

Status: OWNER_ACTION_REQUIRED for official channel creation, manual terms/verification steps, sample-safe video approval, and optional API connection.

Public channel fields:
- Channel name: `Nayovi`
- Handle preference: owner-approved official handle matching `nayovi` where available.
- Description: `Nayovi is an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows. Videos show official APK access, activation, OCR progress, translation workflow, support paths, and approved-sample testing only. Nayovi does not host or distribute chapters.`
- Primary link: `https://nayovi.com`
- Download link: `https://tachiyomiat.com/download`
- Checklist link: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`

First video packet:
- Title: `Nayovi Android OCR translation workflow demo`
- Description: `Official Nayovi demo using approved sample material only. Nayovi supports Android APK access, hosted OCR/AI translation, free trial or redeem-code activation, monthly token plans, and support paths. It does not host or distribute chapters; use it with owned, public-domain, official-sample, creator-provided, or otherwise permission-approved content.`
- Tags/topics: `Android`, `OCR`, `AI translation`, `manga`, `manhwa`, `workflow`
- Pinned comment draft: `Official links: https://nayovi.com and https://tachiyomiat.com/download. Reviewer checklist: https://tachiyomiat.com/guides/comic-ocr-translation-checklist.`

Required assets:
- Approved demo video or clip.
- Poster/thumbnail image using approved-sample UI only.
- Logo/avatar and banner.
- Screenshot-rights confirmation from `docs/seo-distribution/creator-platform-screenshot-rights-packet.md`.

Credential/reference guardrails:
- `SEO_AGENT_YOUTUBE_REFRESH_TOKEN`
- `SEO_AGENT_DEMO_VIDEO_REFERENCE`
- `SEO_AGENT_SCREENSHOT_ASSET_REFERENCE`
- Store no OAuth refresh-token values, private videos, customer pages, unpublished samples, cookies, or verification documents in docs or Git.

Publish capability after connection:
- Agent can draft metadata and, only if owner approves API scope and the video asset, update official video descriptions or playlists. No automated commenting, subscriber solicitation, or reposting is authorized.

Next action:
- Owner creates or connects the official channel, approves the first demo asset and metadata, and decides whether YouTube API updates are enabled.

### 2026-05-29 Cycle 4 - Crunchbase / Startup Directory Official Profile Packet

Status: OWNER_ACTION_REQUIRED for official company profile creation, founder/company verification, terms acceptance, and any API or editor workflow.

Public profile copy:
- Company name: `Nayovi`
- Short description: `Android OCR and AI translation workflow for manga, manhwa, and manhua reader workflows.`
- Description: `Nayovi provides an official Android APK and hosted OCR/AI translation workflow for readers working with owned, public-domain, official-sample, creator-provided, or otherwise permission-approved manga, manhwa, and manhua pages. Nayovi supports official APK access, free trial or redeem-code activation, monthly token plans, and support paths. It does not host or distribute chapters.`
- Website: `https://nayovi.com`
- Product/download URL: `https://tachiyomiat.com/download`
- Category tags: `Android`, `OCR`, `AI translation`, `creator tools`, `localization workflow`

Required assets:
- Official logo/avatar and optional banner.
- Owner-approved founding/company identity and public contact path.
- Public media-kit packet from `docs/seo-distribution/press-media-kit-draft.md`.
- Owner-confirmed public metrics only; keep private revenue, customer, and investor data out of docs unless explicitly approved.

Credential/reference guardrails:
- `SEO_AGENT_CRUNCHBASE_PROFILE_REFERENCE`
- `SEO_AGENT_STARTUP_DIRECTORY_PROFILE_REFERENCE`
- Store no account passwords, private emails, verification documents, cookies, investor notes, or paid-plan receipts in docs or Git.

Publish capability after connection:
- Agent can keep profile field drafts, founder-safe boilerplate, and directory listing packets current after owner approval. Profile creation, verification, paid upgrades, and public edits remain manual unless an official API workflow is connected and explicitly authorized.

Next action:
- Owner decides whether Crunchbase or an equivalent startup directory should be part of Nayovi's public diligence stack and approves the public company profile fields above.

### 2026-05-29 Cycle 4 - Official Newsletter / Substack Profile Packet

Status: OWNER_ACTION_REQUIRED for official account creation, sender identity, terms acceptance, and first issue approval.

Public profile fields:
- Publication name: `Nayovi Notes`
- Subtitle: `Android APK trust, OCR QA, and permission-safe manga/manhwa translation workflow notes.`
- About: `Nayovi Notes is the official update archive for Nayovi, an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows. Posts cover official APK source checks, reviewer-safe screenshots, OCR QA, approved-sample testing, support paths, and responsible-use boundaries. Nayovi does not host or distribute chapters.`
- Primary link: `https://nayovi.com`
- Download link: `https://tachiyomiat.com/download`
- Checklist link: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`

First issue packet:
- Title: `What reviewers should verify before citing an independent Android OCR APK`
- Angle: source-of-truth download URL, APK hash, package/signing owner-confirmed fields, support/privacy/terms links, approved-sample screenshots, review-code boundaries, and no mirror-first APK uploads.
- Link policy: include official source links only; do not import contacts, bulk-send, scrape subscribers, or ask for backlinks.

Required assets:
- Official logo/avatar.
- Owner-approved sender name and public contact path.
- Approved screenshot/demo references only.
- Package/signing/developer-verification facts remain pending until owner confirms exact public language.

Credential/reference guardrails:
- `SEO_AGENT_SUBSTACK_PROFILE_REFERENCE`
- `SEO_AGENT_NEWSLETTER_PROFILE_REFERENCE`
- Store no subscriber lists, private emails, API tokens, cookies, verification documents, or analytics exports in docs or Git.

Publish capability after connection:
- Agent can draft official issues and update archive copy after owner approval. Publication, subscriber import, paid newsletter setup, and API posting are not authorized without explicit owner action.

Next action:
- Owner creates or connects the official newsletter profile, approves the sender identity, and confirms whether the first APK trust issue should be published manually.

## 2026-05-29 Cycle 8 Account Setup Advancement

### AI Search / AI Answers Entity Profile Packet

Status: OWNER_ACTION_REQUIRED for owner-confirmed public entity fields, domain ownership, and any webmaster or structured-data validation account connection.

Public entity fields:
- Name: `Nayovi`
- Primary website: `https://nayovi.com`
- Product source: `https://tachiyomiat.com/download`
- SEO discovery URL: `https://translate-manhwa-ai.com`
- One-line description: `Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows.`
- Responsible-use line: `Nayovi does not host or distribute chapters; use it with owned, public-domain, official-sample, creator-provided, or otherwise permission-approved content.`
- Support path: `https://tachiyomiat.com/support`
- Trust packet: `https://tachiyomiat.com/llms.txt`

Required assets:
- Owner-confirmed public contact path.
- Official logo/avatar and approved screenshot/demo references.
- Owner-confirmed Android package name, signing fingerprint, developer verification status, and package registration state before any verified-language claims.
- Consistent profile copy from `docs/nayovi-official-profile-fields.md`.

Credential/reference guardrails:
- `SEO_AGENT_GOOGLE_SEARCH_CONSOLE_CREDENTIALS`
- `SEO_AGENT_BING_WEBMASTER_API_KEY`
- `SEO_AGENT_AI_SEARCH_ENTITY_REFERENCE`
- Store no webmaster verification tokens, private contacts, cookies, analytics exports, or API keys in docs or Git.

Publish capability after connection:
- Agent can keep entity fields, `llms.txt` handoff copy, sitemap/indexing notes, and directory profile drafts synchronized after owner approval. It must not claim AI answer inclusion, search ranking, verification, or endorsement.

Next action:
- Owner verifies the three domains in GSC/Bing, confirms public entity fields, and decides whether AI-answer entity tracking remains manual or uses approved API credentials.

### Official Startup Directory Submitter Profile Packet

Status: OWNER_ACTION_REQUIRED for founder-owned profile creation, terms acceptance, public company identity approval, and any paid-feature decision.

Public profile fields:
- Company/product: `Nayovi`
- Tagline: `Android OCR and AI translation workflow for manga, manhwa, and manhua reader workflows.`
- Description: `Nayovi provides an official Android APK and hosted OCR/AI translation workflow for readers testing owned, public-domain, official-sample, creator-provided, or otherwise permission-approved manga, manhwa, and manhua pages. It supports official APK access, free trial or redeem-code activation, monthly token plans, and support paths. Nayovi does not host or distribute chapters.`
- Website: `https://nayovi.com`
- Product URL: `https://tachiyomiat.com/download`
- Category tags: `Android`, `AI translation`, `OCR`, `reader workflow`, `creator tools`
- Pricing line: `Free trial or redeem-code activation, then monthly hosted OCR/translation token plans.`

Required assets:
- Official logo/avatar.
- Approved screenshots or demo video only.
- Public media-kit packet.
- Owner-approved public metrics only; no private revenue, user counts, investor notes, or customer names unless explicitly approved.

Credential/reference guardrails:
- `SEO_AGENT_STARTUP_DIRECTORY_PROFILE_REFERENCE`
- `SEO_AGENT_REVENUEFAST_PROFILE_REFERENCE`
- `SEO_AGENT_PRODUCTHUNT_TOKEN` only for Product Hunt-specific workflows.
- Store no passwords, paid listing receipts, private founder emails, or analytics exports in docs or Git.

Publish capability after connection:
- Agent can prepare directory-specific listing drafts and keep founder-safe copy consistent. Manual signup, email verification, paid upgrades, profile publication, and launch scheduling remain owner actions unless a compliant official API workflow is connected and explicitly authorized.

Next action:
- Owner chooses eligible startup directories, rejects paid-link or reciprocal-link flows, and approves the exact submitter identity before any form is used.

## 2026-05-29 Cycle 9 Account Setup Advancement

### Product Hunt Maker / Company Launch Packet

Status: OWNER_ACTION_REQUIRED for official maker/company profile creation, terms acceptance, launch timing, and any API/token connection.

Public profile and launch fields:
- Product name: `Nayovi`
- Tagline: `Android OCR and AI translation workflow for manga, manhwa, and manhua reader workflows.`
- Short description: `Nayovi provides an official Android APK and hosted OCR/AI translation workflow for readers testing owned, public-domain, official-sample, creator-provided, or otherwise permission-approved pages. It supports official APK access, free trial or redeem-code activation, monthly token plans, and support paths.`
- Website: `https://nayovi.com`
- Launch URL: `https://tachiyomiat.com/download`
- Category tags: `Android`, `AI`, `OCR`, `translation`, `creator tools`
- Maker comment angle: source-of-truth APK access, reviewer-safe screenshots, no chapter hosting, and approved-sample OCR QA.

Required assets:
- Logo/avatar and launch thumbnail.
- Approved screenshot set or sample-safe demo video.
- Public media kit and review packet.
- Owner-approved public metrics only; do not use private revenue, user counts, or investor notes without explicit approval.

Credential/reference guardrails:
- `SEO_AGENT_PRODUCTHUNT_TOKEN`
- `SEO_AGENT_PRODUCTHUNT_PROFILE_REFERENCE`
- Store no passwords, cookies, private founder emails, launch analytics exports, or payment receipts in docs or Git.

Publish capability after connection:
- Agent can prepare launch copy, maker comments, gallery captions, and answer templates after owner approval. Product launch scheduling, public posting, upvote requests, comment replies, paid boosts, and account creation remain owner actions unless a compliant official API workflow is connected and explicitly authorized.

Next action:
- Owner creates/connects the official maker or company profile, approves launch timing, and confirms whether Nayovi should launch only after package/signing facts and screenshots are public.

### Official Newsletter First Issue Packet

Status: OWNER_ACTION_REQUIRED for official newsletter profile creation, sender identity approval, terms acceptance, and publication approval.

Public profile fields:
- Publication name: `Nayovi Notes`
- Subtitle: `Android APK trust, OCR QA, and permission-safe manga/manhwa translation workflow notes.`
- About: `Official updates from Nayovi on APK source checks, reviewer-safe screenshots, OCR QA, approved-sample testing, support paths, and responsible-use boundaries. Nayovi does not host or distribute chapters.`
- Primary link: `https://nayovi.com`
- Download link: `https://tachiyomiat.com/download`
- First issue draft: `docs/seo-distribution/official-newsletter-first-issue.md`

Required assets:
- Official logo/avatar.
- Owner-approved sender name and public contact path.
- Package/signing/developer-verification facts only after owner confirmation.
- Approved screenshot/demo references only.

Credential/reference guardrails:
- `SEO_AGENT_SUBSTACK_PROFILE_REFERENCE`
- `SEO_AGENT_NEWSLETTER_PROFILE_REFERENCE`
- Store no subscriber lists, private emails, cookies, verification documents, tokens, or analytics exports in docs or Git.

Publish capability after connection:
- Agent can keep official issue drafts and profile copy current after owner review. Publication, subscriber import, paid newsletter setup, and API posting are not authorized without explicit owner action.

Next action:
- Owner creates/connects the official newsletter profile, reviews `docs/seo-distribution/official-newsletter-first-issue.md`, and decides whether the first issue should publish manually as an opt-in archive post.

## 2026-05-29 Cycle 10 Setup Advancement

### AI Comparison / Free-Trial Directory Submitter Profile

Status: OWNER_REVIEW_REQUIRED for official submitter identity, current form-field review, pricing label approval, source-link preservation, and any directory terms acceptance.

Prepared packet:
- `docs/seo-distribution/free-trial-directory-listing-brief.md`
- `docs/seo-distribution/directory-quality-gate.md`

Priority surfaces:
- AiMatch-style AI comparison directories with use-case, OCR, Translation, and pricing filters.
- ToolDirectory.AI-style curated AI directories with free, freemium, free-trial, and paid labels.
- Try.fm-style software trial directories only if Android APK, hosted OCR, pricing, support, and responsible-use links stay visible.

Profile/listing fields:
- Tool name: `Nayovi`
- Category: `AI Translation`, `OCR`, or `Android productivity` only where the directory supports an accurate category.
- Short description: `Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows.`
- Pricing label: `Free Trial` plus paid monthly token plans, or `Freemium` only if the directory allows paid-plan context beside the free/trial field.
- Canonical links: `https://nayovi.com`, `https://tachiyomiat.com/download`, `https://tachiyomiat.com/pricing`, `https://tachiyomiat.com/support`
- Responsible-use line: `Nayovi does not host chapters; use with owned, public-domain, official-sample, creator-provided, or permission-approved material.`

Credential/reference guardrails:
- `SEO_AGENT_AI_COMPARISON_DIRECTORY_REFERENCE`
- `SEO_AGENT_AI_FREE_TRIAL_DIRECTORY_REFERENCE`
- Store no submitter passwords, cookies, email verification links, paid-placement receipts, private reviewer codes, or analytics exports in docs or Git.

Publish capability after connection:
- Agent can prepare exact owner-approved listing fields after current directory rules are reviewed.
- Agent must reject paid backlink packages, reciprocal-link gates, hidden redirects, mirror-first APK pages, forever-free wording, open-source mislabeling, generic chatbot categories, or unsupported ranking claims.

Next action:
- Owner reviews whether AiMatch, ToolDirectory.AI, Try.fm, or a similar directory preserves official source links and exact pricing context before any manual form action.

### Official Short-Video Demo Profile

Status: OWNER_ACTION_REQUIRED for official account creation, terms acceptance, handle choice, approved clips, thumbnail/cover assets, sample rights, caption approval, and optional API authorization.

Prepared packet:
- `docs/seo-distribution/official-profile-asset-library.md`
- `docs/seo-distribution/creator-platform-screenshot-rights-packet.md`
- `docs/seo-distribution/reviewer-access-packet.md`

Profile fields:
- Display name: `Nayovi`
- Bio: `Official short demos for Nayovi, the Android APK and hosted OCR/AI translation workflow. No chapter hosting; approved samples only.`
- Primary link: `https://nayovi.com`
- APK/source link: `https://tachiyomiat.com/download`
- Support link: `https://tachiyomiat.com/support`

First demo scope:
- Show official download source, install/activation path, OCR progress, translation result review, support route, and responsible-use caption.
- Use only owner-approved sample pages, public-domain material, official samples, creator-provided pages, or permission-approved material.
- Do not show private redeem codes, account emails, payment details, unpublished content, copyrighted chapter pages without permission, or unsupported Android verification claims.

Credential/reference guardrails:
- `SEO_AGENT_SHORT_VIDEO_PROFILE_REFERENCE`
- `SEO_AGENT_TIKTOK_ACCESS_TOKEN`
- `SEO_AGENT_YOUTUBE_SHORTS_REFERENCE`
- Store no passwords, cookies, recovery codes, account emails, unpublished media, or private tokens in docs or Git.

Publish capability after connection:
- Agent can prepare captions, descriptions, titles, and metadata for owner-approved clips after official account/API connection.
- Agent must not create accounts, upload clips, accept terms, scrape comments, automate follows/likes, or repost the same link repeatedly.

Next action:
- Owner chooses whether TikTok, YouTube Shorts, Instagram Reels, or manual-only video posting belongs in the trust stack and approves the first sample-safe clip/caption set.

## 2026-05-29 Current Branch Cycle Setup Advancement

### DEV / Medium / Technical Publishing Profile

Status: OWNER_ACTION_REQUIRED for official account creation or claim, truthful byline, canonical syndication policy, manual terms acceptance, screenshot rights, and optional API credential connection.

Prepared packet:
- `docs/seo-distribution/technical-publishing-syndication-packet.md`

Profile fields:
- Display name: `Nayovi`
- Bio: `Nayovi builds an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows. It does not host chapters and is intended for owned, public-domain, official-sample, creator-provided, or otherwise permission-approved material.`
- Disclosure: `Posts are maintained by the Nayovi team and link to Nayovi-owned source material.`
- Canonical guide: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- Workflow link: `https://tachiyomiat.com/translate-manhwa-ai`
- APK source: `https://tachiyomiat.com/download`

Required assets:
- Logo/avatar, founder/team byline decision, canonical URL policy, approved screenshots only if sample-safe, article tags, source links, support/pricing links, and owner-confirmed package-fact wording.

Credential references:
- `SEO_AGENT_DEVTO_API_KEY`
- `SEO_AGENT_MEDIUM_INTEGRATION_TOKEN`
- `SEO_AGENT_HASHNODE_TOKEN`
- `SEO_AGENT_TECHNICAL_PUBLISHING_PROFILE_REFERENCE`
- `SEO_AGENT_SCREENSHOT_ASSET_REFERENCE`

Publish capability after connection:
- Agent can prepare owner-approved canonical metadata, excerpts, tags, and article drafts after authorized API connection.
- Agent must not create accounts, accept terms, publish, comment, import contacts, request followers, or cross-post without exact owner approval.

Next action:
- Owner chooses DEV, Medium, Hashnode, or manual-only technical publishing, approves the canonical policy, and confirms whether screenshots may be used.

### Reddit / Q&A Official Support Profile

Status: OWNER_ACTION_REQUIRED for official account identity, affiliation disclosure, subreddit/forum rule review, manual terms acceptance, and optional API credential connection.

Prepared packet:
- `docs/seo-distribution/technical-publishing-syndication-packet.md`
- `docs/seo-distribution/reviewer-routing-packet.md`
- `docs/seo-distribution/official-profile-readiness-checklist.md`

Profile fields:
- Display name: `Nayovi`
- Disclosure: `Official Nayovi account. Answers should disclose affiliation and avoid promotional links unless the community asks for source material.`
- No-link answer theme: `How to evaluate OCR and translation quality for permission-approved manga/manhwa/manhua samples.`
- Canonical source if allowed: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- Support link if directly requested: `https://tachiyomiat.com/support`

Required assets:
- Official account handle, affiliation disclosure, moderator/rule notes per community, no-link answer templates, source-link variants, escalation path for support, and owner-approved blocked-topic list.

Credential references:
- `SEO_AGENT_REDDIT_CLIENT_ID`
- `SEO_AGENT_REDDIT_CLIENT_SECRET`
- `SEO_AGENT_REDDIT_REFRESH_TOKEN`
- `SEO_AGENT_FORUM_QA_PROFILE_REFERENCE`

Publish capability after connection:
- Agent can prepare or publish owner-approved answers only where the exact community rules allow official participation and the answer is useful without a backlink.
- Agent must not create accounts, evade moderation, post promotional threads, send DMs, scrape users, mass-comment, ask for votes, or link unless contextually helpful and allowed.

Next action:
- Owner chooses whether an official support/Q&A profile should exist and which communities are eligible; until then all Reddit/forum/Q&A work remains draft-only.

## 2026-05-29 Current Branch Cycle App Store Setup Advancement

### AlternativeTo / Software Recommendation Official Profile

Status: OWNER_ACTION_REQUIRED for official account creation or claim, truthful company identity, manual terms acceptance, category/pricing approval, and optional credential reference.

Prepared packet:
- `docs/seo-distribution/app-store-source-eligibility-packet.md`
- `docs/nayovi-official-profile-fields.md`

Profile fields:
- Name: `Nayovi`
- Tagline: `Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows.`
- Description: `Nayovi provides an official Android APK download path, hosted OCR/AI translation workflow, free trial or redeem-code activation, support, and monthly token plans. Nayovi does not host or distribute chapters and is intended for owned, public-domain, official-sample, creator-provided, or otherwise permission-approved material.`
- Official website: `https://tachiyomiat.com`
- Download/source URL: `https://tachiyomiat.com/download`
- Pricing URL: `https://tachiyomiat.com/pricing`
- Support/source context: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- Category candidates: Android, OCR, AI Translation, Manga/Manhwa reader workflow, Productivity.

Required assets:
- Official logo/avatar, approved screenshots, package name, SHA-256, signing-certificate fingerprint, developer verification status wording, pricing label, support/privacy/terms links, and no-chapter-hosting line.

Credential references:
- `SEO_AGENT_ALTERNATIVETO_PROFILE_REFERENCE`
- `SEO_AGENT_APP_STORE_PROFILE_REFERENCE`
- No passwords, cookies, recovery codes, or account emails in docs.

Publish capability after connection:
- Agent can prepare owner-approved listing fields and factual updates after the official account or API workflow is connected.
- Agent must not create accounts, vote, like, review, scrape users, request likes, submit duplicate listings, or publish without owner approval.

Next action:
- Owner decides whether AlternativeTo or a similar software recommendation profile belongs in the trust stack, creates or claims the official profile manually, and confirms listing fields before any publication.

### Open-Source Directory Eligibility Guardrail

Status: OWNER_ACTION_REQUIRED only if Nayovi has a genuine qualifying open-source app, build flavor, companion repo, or public docs asset.

Prepared packet:
- `docs/seo-distribution/app-store-source-eligibility-packet.md`
- `docs/seo-distribution/android-apk-trust-profile.md`

Profile fields if a qualifying open-source companion exists:
- Project name: owner-approved companion asset name, not the closed hosted APK unless it qualifies.
- Repository URL: owner-approved public repo only.
- License: owner-confirmed SPDX license.
- Website: `https://tachiyomiat.com`
- Responsible-use context: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`

Required assets:
- Public source repository, license, build instructions, release metadata, signed APK or companion release facts, anti-feature disclosure if relevant, privacy/support links, and maintenance commitment.

Credential references:
- `SEO_AGENT_OPEN_SOURCE_DIRECTORY_REFERENCE`
- `SEO_AGENT_GITHUB_TOKEN` only if owner authorizes official repo metadata updates.

Publish capability after connection:
- Agent can prepare eligibility memos and owner-approved metadata for open-source directories.
- Agent must not submit Nayovi to F-Droid, IzzyOnDroid, OSS directories, or resource lists as open source unless owner confirms the exact qualifying source and license.

Next action:
- Owner confirms whether any open-source companion exists. If not, keep F-Droid/IzzyOnDroid watch-only and use their policies only as APK trust and metadata quality references.

## 2026-05-29 Current Branch Cycle Newsletter Setup Advancement

### Android Newsletter / Resource Curator Profile

Status: OWNER_REVIEW_REQUIRED for editor contact path, owner-approved package facts, sample-safe screenshots, and manual submission approval.

Prepared packet:
- `docs/seo-distribution/android-newsletter-resource-pitch.md`
- `docs/seo-distribution/android-newsletter-submission-packet.md`

Public profile fields:
- Display name: `Nayovi`
- Submitter/byline: owner-approved founder, developer, or `Nayovi team`; do not invent a personal persona.
- One-line resource description: `Reviewer checklist for independent Android APK source links, hosted OCR testing, sample-safe screenshots, and manga/manhwa translation workflows.`
- Primary resource: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- Supporting source: `https://tachiyomiat.com/download`
- Responsible-use line: `No chapter hosting; test only with owned, public-domain, official-sample, creator-provided, or permission-approved material.`

Required assets:
- Owner-confirmed package name, SHA-256, signing-certificate fingerprint if cited, Android developer verification status wording if cited, sample-safe screenshots, public editor contact path, and approved reviewer packet reference.

Credential references:
- `SEO_AGENT_ANDROID_NEWSLETTER_PROFILE_REFERENCE`
- `SEO_AGENT_EDITORIAL_SUBMISSION_REFERENCE`
- `SEO_AGENT_SCREENSHOT_ASSET_REFERENCE`
- No editor login, submission password, private contacts, screenshot files, or dashboard data in docs.

Publish capability after connection:
- Agent can prepare owner-approved link-suggestion copy and field-level resource descriptions after current outlet rules are reviewed.
- Agent must not submit forms, create accounts, accept terms, upload screenshots, send bulk pitches, claim verification, or publish newsletter comments automatically.

Next action:
- Owner confirms package/signing/hash public language, approves screenshots, and chooses whether Android Weekly, Kotlin Weekly, or another Android curator may receive the manual resource suggestion.

### Launch Directory / Indie Maker Profile

Status: OWNER_ACTION_REQUIRED for founder/company submitter identity, terms acceptance, public launch-stage copy, visual assets, and manual submission approval.

Prepared packet:
- `docs/seo-distribution/startup-launch-directory-packet.md`

Public profile fields:
- Product name: `Nayovi`
- Tagline: `Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows.`
- Category candidates: Android, AI, OCR, Translation, Creator Tools, Productivity.
- Website: `https://nayovi.com`
- Official APK/source link: `https://tachiyomiat.com/download`
- Pricing: `https://tachiyomiat.com/pricing`
- Support: `https://tachiyomiat.com/support`
- Responsible-use line: `Nayovi does not host chapters and is intended for owned, public-domain, official-sample, creator-provided, or permission-approved material.`

Required assets:
- Founder/company submitter profile, logo/avatar, approved screenshots, demo video if available, pricing/support links, package-fact safe wording, and no unsupported traction or revenue metrics.

Credential references:
- `SEO_AGENT_STARTUP_LAUNCH_PROFILE_REFERENCE`
- `SEO_AGENT_BETALIST_PROFILE_REFERENCE`
- `SEO_AGENT_FASTLAUNCH_PROFILE_REFERENCE`
- `SEO_AGENT_SMOLLAUNCH_PROFILE_REFERENCE`
- No passwords, payment receipts, vote/review data, private metrics, or account recovery data in docs.

Publish capability after connection:
- Agent can prepare owner-approved listing fields and maker comments after rules review.
- Agent must not create profiles, submit listings, pay for placement, request votes, post comments, import contacts, or claim launch traction automatically.

Next action:
- Owner decides whether launch directories belong in the current trust stack and rejects any flow built around paid backlinks, reciprocal links, hidden redirects, artificial reviews, or vote requests.
## 2026-05-30 Cycle Setup Advancement

- **Priority advanced:** Official Android verification public profile packet
  - **Status:** setup_packet_prepared
  - **Platform:** Android verification profile / public trust copy
  - **Purpose:** Keep one public Android-verification support asset for GSC, app-testing, APK directories, and media contacts so no claim of completed verification is published.
  - **Progress:** Public profile copy and stop conditions were added to `docs/seo-distribution/android-verification-public-profile-packet.md` with non-secret credential references and package/signing gates.
  - **Required assets:** Official domain/app links, package/hash template, pending-language template, screenshot/safety checklist, review-code policy placeholder.
  - **Secret/API reference:** `SEO_AGENT_ANDROID_DEVELOPER_CONSOLE_REFERENCE`, `SEO_AGENT_PLAY_CONSOLE_REFERENCE`, `SEO_AGENT_REVIEW_CODE_POLICY_REFERENCE`.
  - **Publish capability after connection:** Prepare source-first review replies, directory fit questions, and APK/Android verification readiness language only after owner confirms public package/signing facts.
  - **Next action:** Owner creates official Android verification public profile packet in the approved secret store and confirms package name/hash/developer-verification language.

- **Priority advanced:** APKPure / app directory public profile readiness
  - **Status:** setup_packet_prepared_owner_action_required
  - **Platform:** Android app directory (APKPure)
  - **Purpose:** Prepare a no-link-first fit question and owner-approved package fields before any manual form actions.
  - **Progress:** Added owner action and stop conditions; platform requires API/form handling review and no upload without verified package/signing facts.
  - **Required assets:** Official APK source, pricing/support links, screenshot set, package/signing status, review-code policy, responsible-use line.
  - **Secret/API reference:** `SEO_AGENT_APK_DIRECTORY_PROFILE_REFERENCE` (no secret required for draft copy).
  - **Publish capability after connection:** Keep directory drafts review-only until official package metadata and submission authorization are approved.
  - **Next action:** Owner confirms package name and whether APKPure terms allow no-link-first fit question before any contact.

## 2026-05-30 Cycle Additions

| priority | platform | purpose | status | owner/manual step | required assets | secret/API or credential reference | credential storage location | publish capability after connection | next action |
|---|---|---|---|---|---|---|---|---|---|
| P0 | Google Search Console (GSC) | Confirm ownership and index control for trust and search health | setup_packet_prepared_owner_action_required | OWNER_ACTION_REQUIRED: add official property and complete verification in GSC (no automation allowed) | Homepages, sitemap URL, canonical pages, org info for profile | SEO_AGENT_GSC_VERIFICATION_METHOD; SEO_AGENT_GSC_VERIFICATION_TOKEN | `/opt/tachi-back/.env.seo-distribution-agent` (chmod 600) | Run indexing requests and coverage monitoring on key assets once verified | Prepare exact canonical proof copy and request OWNER verification |
| P1 | Bing Webmaster (URL Submission + indexing) | Secondary search/index trust signal and query visibility | setup_packet_prepared_owner_action_required | OWNER_ACTION_REQUIRED: create/claim property and submit sitemap (manual ownership step only) | sitemap.xml, robots.txt, privacy policy, support page | SEO_AGENT_BING_VERIFICATION_TOKEN | `/opt/tachi-back/.env.seo-distribution-agent` (chmod 600) | Enable crawl/coverage checks and submit top priority pages after property ownership | Prepare submission packet with brand profile and legal links |
| P2 | YouTube Brand Channel | Publish workflow demos and permission-safe product education | setup_packet_prepared_owner_action_required | OWNER_ACTION_REQUIRED: create official channel and complete brand setup | Channel banner, profile bio, demo script, 1–2 short videos | SEO_AGENT_YOUTUBE_CHANNEL_ID; SEO_AGENT_YOUTUBE_API_TOKEN | `/opt/tachi-back/.env.seo-distribution-agent` (chmod 600) | Publish no-sales-first tutorials and pinned non-promotional resources | Create publish-ready playlist and ownership links in About |
## 2026-05-31 Cycle-Advancement Update (additional owner-action packets)

### Setup tasks advanced (priority)

| Priority | Platform | Purpose | Status | Owner/manual step | Required assets | Secret/API variable or credential reference | Publish capability after connection | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P0 | Google Search Console (official) | Verify `nayovi.com` and `translate-manhwa-ai.com`, submit sitemaps and monitor coverage for trust pages, SEO guides, and comparison content | OWNER_ACTION_REQUIRED: create/claim domain in official account before index and URL inspection requests can run | Sign in with Google Workspace or personal Google account tied to Nayovi brand owner, add property ownership token at DNS/HTML level, complete verification for both properties, then add XML sitemap URLs from canonical surface | Domain ownership proof, 2 PNG logos, organization profile bio, verified canonical homepage URLs, sitemap export from Next sitemap index | `SEO_AGENT_GSC_SERVICE_ACCOUNT_JSON`, `SEO_AGENT_GSC_PROPERTY_ID` (reference only) | Enable crawl/index monitoring, publish index status summaries, request urgent indexing for newly published trust assets, submit URL-coverage issue reports | Complete verification in GSC and share `property_id` + ownership confirmation in private config; then run `owner review` of crawl anomalies for newly published pages |
| P0 | Bing Webmaster (official) | Verify brand + SEO domains, connect canonical URLs, and activate URL submission / backlink visibility checks for backlink targets | OWNER_ACTION_REQUIRED: manual account creation and Microsoft identity verification required | Register official Bing Webmaster account, add DNS/TXT verification for both Nayovi domains, confirm ownership, submit sitemap and canonical links for all public trust assets | DNS access for TXT verification, homepage canonical links, asset list, optional logo/brand colors | `SEO_AGENT_BING_WEBMASTER_CLIENT_ID`, `SEO_AGENT_BING_WEBMASTER_PASSWORD` (reference only) | Run URL inspection, monitor index coverage and spam/fraud risk signals, and publish domain authority trend reports for outreach planning | Verify each domain manually, then connect export of Coverage/Index Status data for next cycle reporting |
| P1 | Product Hunt Maker / Company | Publish compliant launch-ready listing and company presence for community discovery and founder trust trail | OWNER_ACTION_REQUIRED: manual maker sign-up flow and maker profile confirmation required before live listing | Use founder-authored official profile; upload logo (square + rectangle), cover image, one-sentence mission, short feature bullets, launch page content and pricing summary; keep links limited to official domains and docs | Logo, founder bio, app screenshots, privacy page, support URL, pricing summary | `SEO_AGENT_PRODUCT_HUNT_API_TOKEN` (optional automation), no default secret | Publish company page, run maker launch draft, collect launch engagement signals and referral sources from launch analytics |
| P2 | YouTube Brand Channel | Host permission-safe walkthroughs, OCR workflow tutorials, and creator interviews to earn high-trust educational links | OWNER_ACTION_REQUIRED: owner review required to create/verify brand channel and upload brand assets | Create official YouTube brand account for Nayovi, enable channel verification, add About links, upload identity assets, add playlist structure for OCR demos and comparisons. Include compliance statement in channel description | Brand art, short demo videos, captions, channel links to `nayovi.com`, `translate-manhwa-ai.com`, `support` pages | `SEO_AGENT_YOUTUBE_API_KEY` (for upload metadata automation, optional), `SEO_AGENT_YOUTUBE_CHANNEL_ID` | Publish demos, walkthroughs, and “official update” videos; link assets can be reused in outbound outreach with stable canonical references |

## 2026-05-31 Cycle Additions (Fresh setup rows)

| Priority | Platform | Purpose | Status | Owner/manual step | Required assets | Secret/API variable | Publish capability after connection | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| high | Hacker News founder profile | Founder-led credibility and startup diligence context for controlled founder-first updates | setup_packet_prepared_owner_action_required | Create or claim official founder profile manually, avoid spammy comments, do not engage in vote/manipulation mechanics | Founder bio, company/public link list (`nayovi.com`, `tachiyomiat.com`, `translate-manhwa-ai.com`), public post policy, one process-first draft | `SEO_AGENT_HN_ACCOUNT_REFERENCE` | Publish only process-first, non-promotional technical posts and answer only direct questions; no comment automation | Keep OWNER_ACTION_REQUIRED until founder confirms profile identity and post policy.
| medium | X/Twitter official support updates | Trust and partnership updates for mobile communities, launch notes, and technical Q&A links | setup_packet_prepared_owner_action_required | Owner creates founder/company account, accepts platform rules, and sets public policy note for no-link-first support first | Profile bio, safe link list, identity-safe avatar/banner, byline policy, opt-out terms | `SEO_AGENT_X_ACCESS_TOKEN` (optional) | Author official value-first support updates, founder posts, and response templates after account review | Keep manual until owner confirms API token is provisioned and anti-spam policy path is approved |

## 2026-05-31 Cycle Advancement (Current)

| priority | platform | purpose | status | owner/manual step | required assets | secret/API variable | credential storage | publish capability after connection | next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1 | Crunchbase company profile | Investor and startup partnership trust surface with verifiable company identity fields | setup_packet_prepared_owner_action_required | OWNER_ACTION_REQUIRED: owner creates/claims official founder/company profile, confirms public metrics policy, and approves canonical link set (`nayovi.com`, `tachiyomiat.com`, `translate-manhwa-ai.com`) | Company profile copy, category tags, responsible-use line, support link, legal contact path | `SEO_AGENT_CRUNCHBASE_PROFILE_REFERENCE` | `/opt/tachi-back/.env.seo-distribution-agent` (chmod 600) | Supports diligence checks and allows official references in partner/investor documentation and launch planning | Keep status OWNER_ACTION_REQUIRED until profile is published and owner confirms allowed external references |
| P1 | Substack newsletter profile | Durable opt-in trust update stream for APK trust checks, OCR QA notes, and partner updates | setup_packet_prepared_owner_action_required | OWNER_ACTION_REQUIRED: owner creates/links official Substack profile and defines issue cadence + moderation policy | Newsletter brand profile, first issue draft outline, policy/attribution copy, support link, byline | `SEO_AGENT_SUBSTACK_PROFILE_REFERENCE` | `/opt/tachi-back/.env.seo-distribution-agent` (chmod 600) | Enables owner-reviewed trust updates and public changelog references without contact scraping | Publish first issue only after package/signing wording, screenshot rights, and legal-safe launch summary are approved |

## 2026-05-31 Cycle Task Advancement

| Priority | Platform | Purpose | Status | Owner/manual step | Required assets | Secret/API variable or credential reference | Publish capability after connection | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| high | LinkedIn company page (official brand profile) | Build professional trust for launch, recruiting, and investor-facing discovery with explicit official identity | setup_packet_prepared_owner_action_required | OWNER_ACTION_REQUIRED: create or connect official Nayovi company page and approve profile fields, disclosure language, and canonical website links. | Logo/avatar, banner, company description, official website links, support URL, founder-authorship policy. | `SEO_AGENT_LINKEDIN_ACCESS_TOKEN`, `SEO_AGENT_LINKEDIN_ORGANIZATION_ID` | Share profile metadata and post prepared value-first updates only when tokens and ownership proof are confirmed. | Keep profile edits source-of-truth-aligned and do not post launch claims until Owner approves official launch timeline. |
| high | DEV.to and Medium author profiles | Publish technical trust content and submission-policy posts about permission-safe OCR translation workflows | setup_packet_prepared_owner_action_required | OWNER_ACTION_REQUIRED: create/claim official author profiles and approve first editorial draft. | Author profile metadata, 1 long-form guide draft, technical links, canonical assets. | `SEO_AGENT_DEVTO_API_KEY`, `SEO_AGENT_MEDIUM_INTEGRATION_TOKEN` | Agent can draft and stage technical posts after token-based publish channel is verified. | Post only non-promotional workflow guides that reference `/translate-manhwa-ai`, `/support`, and `/guides/translation-support-workflow`. |

## 2026-05-31 Cycle Task Advancement (Additional Profiles)

| priority | platform | purpose | status | owner/manual step | required assets | secret/API or credential reference | credential storage | publish capability after connection | next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P0 | Reddit official account | Build legitimate community participation path for rule-safe technical help and non-promotional trust updates | setup_packet_prepared_owner_action_required | OWNER_ACTION_REQUIRED: create/claim official Nayovi profile and obtain API authorization where allowed for comments/replies | Verified profile name, short support-first bio, official domain links, canonical byline policy, moderation-safe content templates | `SEO_AGENT_REDDIT_CLIENT_ID`, `SEO_AGENT_REDDIT_CLIENT_SECRET`, `SEO_AGENT_REDDIT_REFRESH_TOKEN` | `/opt/tachi-back/.env.seo-distribution-agent` (chmod 600) | Draft and queue community-fit, no-link-first response variants for app/community questions after account-level rule checks | Keep posting drafts only; do not publish until Owner confirms account ownership and token scope |
| P1 | Product Hunt founder/maker account | Enable compliant launch/feedback posting for founder-led visibility and early adopter trust signals | setup_packet_prepared_owner_action_required | OWNER_ACTION_REQUIRED: official account setup + maker profile approval + profile canonical fields review | Official brand/company copy, launcher FAQ, demo asset checklist, launch window date, support + privacy links | `SEO_AGENT_PRODUCT_HUNT_TOKEN` | `/opt/tachi-back/.env.seo-distribution-agent` (chmod 600) | Publish launch/feedback posts only for community-first visibility and after Owner-approved content policy review | Confirm platform rules, finalize launch timing, and approve first comment/launch page copy |

## 2026-05-31 T173116Z Account Setup Continuation

### Official account setup packets prepared in continuation run

| priority | platform | purpose | status | owner/manual step | required assets | secret/API or credential reference | publish capability after connection | next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P0 | LinkedIn company page (official) | Strengthen enterprise trust and startup diligence signals in founder/investor touchpoints | setup_packet_prepared_owner_action_required | OWNER_ACTION_REQUIRED: create or claim official company page, confirm legal entity name, and upload logo/banner; keep one canonical link set | Logo package (logo + banner), about copy, canonical links to https://nayovi.com, https://translate-manhwa-ai.com, https://tachiyomiat.com, support contact alias | SEO_AGENT_LINKEDIN_ACCESS_TOKEN, SEO_AGENT_LINKEDIN_ORGANIZATION_ID | Publish only value-first updates and occasional launch notes after owner sign-off; no download-first copy in first wave | Keep no-link-first draft ready in docs/seo-distribution/platform-drafts.md; await page ownership confirmation before posting |
| P0 | YouTube channel (official) | Publish permission-safe walkthroughs and review process content with durable canonical links | setup_packet_prepared_owner_action_required | OWNER_ACTION_REQUIRED: create or verify official channel, set compliance-safe channel description, and align about page with permissions policy and support policy | Channel art, intro video transcript, three short demo scripts, support/privacy link set, creator bio | SEO_AGENT_YOUTUBE_API_KEY, SEO_AGENT_YOUTUBE_CHANNEL_ID | Publish workflow demos, translation limitation explanation videos, and changelog clips as owned trust assets | Prepare publish-ready playlist and finalize channel About copy after identity ownership is confirmed |
| P1 | Hacker News founder profile | Prepare compliant founder-first technical disclosures and process updates | setup_packet_prepared_owner_action_required | OWNER_ACTION_REQUIRED: creator confirms profile identity and posting policy; avoid launch hype in first draft until moderation-compatible context exists | Bio with explicit ownership language, no-link-first intro copy, topic list for technical essays | SEO_AGENT_HN_ACCOUNT_REFERENCE | Run technical process-first drafts and answer direct questions only under owner-review guardrails | Keep status as AUTHORIZED_ACCOUNT_REQUIRED until profile verification and moderation policy are approved |

## 2026-05-31 Cycle Additional Progress

| Priority | Platform | Purpose | Status | Owner/manual step | Required assets | Secret/API variable or credential reference | Publish capability after connection | Next action |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| high | Google Play Console + Developer Support | Android APK ownership and support profile clarity | setup_packet_prepared_owner_action_required | OWNER_ACTION_REQUIRED: confirm official package identity, package name, support page, official contact links, and screenshot policy; do not claim verification until package/signing evidence is approved | Official package name, support URL, developer profile links, privacy policy, terms, screenshot policy, verification-safe claims | `SEO_AGENT_GOOGLE_PLAY_CONSOLE_REFERENCE`, `SEO_AGENT_ANDROID_PUBLISHER_CENTER_REFERENCE` | Enables official-safe listing and partner copy only after owner verifies facts | Owner updates package/support details in Play Console then confirms public facts ready for publication |
| medium | Product Hunt maker/company profile | High-trust launch/discovery profile | setup_packet_prepared_owner_action_required | OWNER_ACTION_REQUIRED: confirm who owns the maker/company profile, prepare launch copy, and verify profile handles creator/developer identity | Maker/company handle, launch copy, links to owned domains, contact profile, media assets | `SEO_AGENT_PRODUCTHUNT_TOKEN` | Can publish founder-backed launch draft after profile ownership and rule checks are done | Owner creates/claims Product Hunt presence and shares approval of maker profile + launch messaging |
| medium | LinkedIn page + founder profile | Founder credibility and business outreach base | setup_packet_prepared_owner_action_required | OWNER_ACTION_REQUIRED: choose page vs founder handle path, register identity wording, and define no-link-first response tone | Verified founder/company identity, page/company logo, short positioning copy | `SEO_AGENT_LINKEDIN_ACCESS_TOKEN`, `SEO_AGENT_LINKEDIN_ORGANIZATION_ID` | Owner-approved publishing only; can use as support/partner reference on trusted channels after verification | Owner creates/claims profile and approves first post templates and allowed link policy |
