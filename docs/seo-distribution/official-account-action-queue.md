# Nayovi Official Account Action Queue

This queue converts account setup packets into owner-safe manual steps. It is maintained by the SEO distribution agent and must never contain passwords, tokens, verification codes, recovery details, cookies, identity documents, or private account screenshots.

| Priority | Account/profile | Manual action | Public fields to use | Required assets | Credential reference | Agent capability after connection | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| high | Google Search Console | Verify `tachiyomiat.com`, `nayovi.com`, and `translate-manhwa-ai.com`; submit `https://tachiyomiat.com/sitemap.xml` | Site owner account only; no public profile copy | DNS or Search Console verification method, sitemap URL | `SEO_AGENT_GOOGLE_SEARCH_CONSOLE_CREDENTIALS` | Inspect indexing and sitemap coverage after API access exists | OWNER_ACTION_REQUIRED |
| high | Bing Webmaster Tools | Import from GSC or verify the three domains manually; submit sitemap | Site owner account only; no public profile copy | DNS/CNAME/meta verification method, sitemap URL | `SEO_AGENT_BING_WEBMASTER_API_KEY` | Inspect crawl/index data after API access exists | OWNER_ACTION_REQUIRED |
| high | Google Play Console / Android developer identity | Confirm package name, signing-certificate fingerprint, developer verification status, and package registration status | Public developer name and support links only after owner approval | Signed APK, SHA-256, support/privacy/terms URLs, approved screenshots | `SEO_AGENT_GOOGLE_PLAY_CONSOLE_REFERENCE` | Cite only owner-confirmed package/signing/verification facts in reviewer packets | OWNER_ACTION_REQUIRED |
| high | LinkedIn company/founder page | Create or connect official Nayovi company page or founder-owned profile | `Nayovi` / founder-approved affiliation; `https://nayovi.com`; `https://tachiyomiat.com/download` | Logo, banner, short bio, first post queue | `SEO_AGENT_LINKEDIN_ACCESS_TOKEN`, `SEO_AGENT_LINKEDIN_ORGANIZATION_ID` | Draft or publish owner-approved company/founder updates if API scope is connected | OWNER_ACTION_REQUIRED |
| high | YouTube official channel | Create/connect official channel; upload only owner-approved approved-sample demo media | Display `Nayovi`; link `https://nayovi.com`; description uses responsible-use line | Avatar, banner, demo video, thumbnail, approved sample policy | `SEO_AGENT_YOUTUBE_REFRESH_TOKEN` | Update owner-approved video metadata and descriptions if OAuth is connected | OWNER_ACTION_REQUIRED |
| medium | DEV Community official profile | Create/connect official profile for technical checklist syndication | Name `Nayovi`; bio focused on Android OCR workflow; canonical URL back to owned guide | Logo/avatar, canonical markdown draft, tags, approved screenshots | `SEO_AGENT_DEVTO_API_KEY` | Publish owner-approved canonical technical articles only | OWNER_ACTION_REQUIRED |
| medium | Medium publication/profile | Create/connect official profile or publication; decide canonical/republication policy | Name `Nayovi`; URL `https://nayovi.com`; canonical link to owned guide | Logo/avatar, canonical article draft, approved screenshots | `SEO_AGENT_MEDIUM_INTEGRATION_TOKEN` | Publish owner-approved canonical articles if integration token exists | OWNER_ACTION_REQUIRED |
| medium | Reddit official/founder account | Create/connect a truthful brand or founder account; review subreddit rules manually | Disclosure: `I am building Nayovi`; omit links by default | No-link drafts, subreddit rules notes, support URL if requested | `SEO_AGENT_REDDIT_CLIENT_ID`, `SEO_AGENT_REDDIT_CLIENT_SECRET`, `SEO_AGENT_REDDIT_REFRESH_TOKEN` | Draft rule-compliant feedback posts/comments only where allowed | OWNER_ACTION_REQUIRED |
| medium | Product Hunt maker/company | Create/connect maker/company account and choose launch timing | Tagline: `Android OCR translation workflow for manga and manhwa` | Logo, gallery screenshots, demo video, maker comment, pricing/support links | `SEO_AGENT_PRODUCTHUNT_TOKEN` | Prepare launch fields and owner-approved maker comment | OWNER_ACTION_REQUIRED |
| medium | Official screenshot asset library | Approve which screenshots and sample images can be public | Use file names or public URLs only after approval | Install, activation, OCR before/after with approved samples, support screen, thumbnail | `SEO_AGENT_SCREENSHOT_ASSET_REFERENCE` | Reuse approved asset references in profile, listing, and reviewer packets | OWNER_ACTION_REQUIRED |
| medium | AI directory submitter profiles | Create/connect official submitter profiles only for directories that pass the quality filter | Name `Nayovi`; pricing `free trial plus monthly token plans`; primary URL `https://tachiyomiat.com/download` | Logo, screenshots, listing copy, support/pricing links, responsible-use line | `SEO_AGENT_AI_DIRECTORY_PROFILE_REFERENCE` | Prepare or submit owner-approved listings after rules and account access are confirmed | OWNER_ACTION_REQUIRED |
| medium | Android app review/submission profiles | Approve portal account, APK sharing scope, review-code access, and screenshot rights before any upload | Name `Nayovi`; official source URL and review packet only | APK review packet, SHA-256, approved screenshots, support/pricing/legal links | `SEO_AGENT_ANDROID_REVIEW_PORTAL_REFERENCE` | Prepare portal-specific reviewer packets after owner confirms portal quality and test scope | OWNER_ACTION_REQUIRED |

Short bio:
`Nayovi is an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows.`

Responsible-use line:
`Nayovi does not host or distribute chapters; it supports owned content, public-domain material, official samples, or content users have permission to process.`

Canonical links:
- Brand: `https://nayovi.com`
- Official APK/download: `https://tachiyomiat.com/download`
- Pricing: `https://tachiyomiat.com/pricing`
- Support: `https://tachiyomiat.com/support`
- Comic OCR checklist: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- Responsible workflow guide: `https://tachiyomiat.com/guides/translation-support-workflow`

Store actual secret values only in `/opt/tachi-back/.env.seo-distribution-agent` with strict permissions or another approved secret store.
