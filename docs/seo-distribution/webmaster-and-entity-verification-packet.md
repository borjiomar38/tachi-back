# Nayovi Webmaster and Entity Verification Packet

Status: draft owner action required
Last updated: 2026-05-29

This packet prepares official search-console and public-entity setup for Nayovi-owned properties. It must not contain secret values, verification tokens, cookies, private contacts, screenshots of dashboards, or unpublished metrics.

## Properties to Verify

| Priority | Property | Purpose | Sitemap / source URL | Owner action |
| --- | --- | --- | --- | --- |
| high | `https://tachiyomiat.com` | Primary app, APK, pricing, support, guide, and source-of-truth pages | `https://tachiyomiat.com/sitemap.xml` | Verify in Google Search Console and Bing Webmaster Tools with a Nayovi-owned account. |
| high | `https://nayovi.com` | Brand domain and official identity signal | owner-confirmed sitemap or canonical homepage | Verify domain ownership and connect canonical profile references after owner approval. |
| high | `https://translate-manhwa-ai.com` | SEO domain and topical entity signal | owner-confirmed sitemap or canonical homepage | Verify only if it remains an owned SEO property and canonical links are clear. |

## Public Entity Fields

- Official product name: `Nayovi`
- Brand domain: `https://nayovi.com`
- Primary app site: `https://tachiyomiat.com`
- Official APK source: `https://tachiyomiat.com/download`
- Main workflow page: `https://tachiyomiat.com/translate-manhwa-ai`
- Pricing: `https://tachiyomiat.com/pricing`
- Support: `https://tachiyomiat.com/support`
- Technical checklist: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- Responsible-use line: `Nayovi does not host or distribute chapters; use it only with owned, public-domain, official-sample, creator-provided, or otherwise permission-approved material.`

## Required Assets

- Owner-approved logo/avatar and square icon.
- Public contact path for reviewer, directory, partner, and support requests.
- Owner-confirmed package name, APK hash, signing fingerprint, and Android developer verification status before any verified-package language is used.
- Screenshot/demo references only after sample rights are approved.
- Canonical profile list after official social, GitHub, newsletter, YouTube, Product Hunt, and directory profiles are manually created or connected.

## Credential References

- `SEO_AGENT_GOOGLE_SEARCH_CONSOLE_CREDENTIALS`
- `SEO_AGENT_BING_WEBMASTER_API_KEY`
- `SEO_AGENT_AI_SEARCH_ENTITY_REFERENCE`
- `SEO_AGENT_CANONICAL_PROFILE_REGISTRY_REFERENCE`

Secret values belong only in `/opt/tachi-back/.env.seo-distribution-agent` with strict permissions or another approved secret store.

## Agent Capability After Connection

After the owner verifies properties and connects approved API credentials, the agent may prepare crawl/indexing summaries, sitemap-submission notes, and public entity consistency checks. The agent must not publish private search-console data, add verification tokens to docs, claim verified package status without owner-confirmed facts, or submit third-party profiles automatically.

## Pre-Publish Gate

Reject or hold any external profile, directory, or article if it:

- Uses an APK mirror or hides the official APK source.
- Claims Play Store, Android Developer Console, package registration, or signing facts before owner confirmation.
- Describes Nayovi as hosting chapters, scraping publisher catalogs, forever-free, open-source, or a generic chatbot.
- Removes pricing, support, responsible-use, or official-source context.
- Requires paid backlink placement, reciprocal links, hidden redirects, fake reviews, or vote requests.

## Owner Next Action

Verify the three owned domains in Google Search Console and Bing Webmaster Tools, confirm the public contact path, and approve which canonical profile links may be cited before high-volume directory, press, launch, or social outreach scales.
