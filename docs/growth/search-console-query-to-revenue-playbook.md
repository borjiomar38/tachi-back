# Search Console Query-to-Revenue Playbook

Status: prepared for owner-verified Search Console access
Last updated: 2026-05-29

This playbook turns Google Search Console query and page data into revenue-focused site work. It must not contain exported private dashboard data, verification tokens, API keys, screenshots, or unpublished traction claims.

## Trigger

Use this after `tachiyomiat.com`, `nayovi.com`, and `translate-manhwa-ai.com` are owner-verified in Google Search Console or Bing Webmaster Tools and approved credential references are connected.

The first signal to investigate is the 2026-05-28 Search Console milestone email that reported `tachiyomiat.com` reached 120 clicks over the prior 28 days. Treat that as an internal prioritization signal only, not a public growth claim.

## Export Scope

Export only the minimum working view needed for prioritization:

- Property: `https://tachiyomiat.com`
- Date range: last 28 days, then compare with the previous 28 days when available
- Dimensions: query, page, country, device
- Metrics: clicks, impressions, CTR, average position
- Priority pages: `/download`, `/translate-manhwa-ai`, `/pricing`, `/support`, `/guides/free-trial-vs-paid-token-plan`, `/guides/best-android-manga-translator-apk`, `/guides/mihon-nayovi-setup`, `/guides/mihon-tachiyomiat-setup`, `/guides/comic-ocr-translation-checklist`, `/guides/translation-support-workflow`

Do not store raw exports in Git. Summarize only non-sensitive findings in `docs/growth/growth-log.md`.

## Query Buckets

| Bucket | Examples to look for | Revenue action |
| --- | --- | --- |
| Install intent | `nayovi apk`, `tachiyomiat apk`, `mihon translator apk`, `android manga translator apk` | Strengthen official APK, hash, update, support, free-trial, and pricing handoffs on the ranking page. |
| Paid workflow intent | `free trial manga translator`, `paid manga translator`, `token plan manga translation` | Improve trial-to-plan copy, cancellation clarity, support recovery, and checkout links. |
| Setup help intent | `mihon nayovi setup`, `tachiyomiat setup`, `tachiyomi translator setup` | Add missing setup steps, recovery links, and internal links to download plus pricing. |
| Review or directory intent | `best ai manga translator`, `manga ocr app`, `manhwa ai translator android` | Add reviewer packet links, demo proof, responsible-use language, and no-mirror source guidance. |
| Partner or diligence intent | `manga ocr checklist`, `permission safe manga translation`, `approved sample translation workflow` | Route to pilot scope, review-code gates, and support so serious contacts can reply without founder time. |

## Prioritization Rule

Use this order before creating new broad SEO pages:

1. Fix pages with clicks and low CTR where the query already has install, setup, paid-plan, or review intent.
2. Improve pages ranking positions 4-20 for high-intent queries before chasing low-intent impressions.
3. Add internal links from pages that already receive clicks to `/download`, `/pricing`, `/support`, and the most relevant guide.
4. Update title/meta only when the live query proves a better intent match.
5. Create new content only when multiple qualified queries cannot be served by an existing page.

## Page-Level Action Matrix

| Page | If query data shows | Safe edit |
| --- | --- | --- |
| `/download` | Install or APK trust queries | Clarify official source, hash, update policy, support, trial, pricing, and no-mirror boundaries. |
| `/translate-manhwa-ai` | Broad AI translator or partner queries | Tighten above-the-fold copy around Android hosted OCR, free trial, paid token plans, responsible-use boundaries, and reviewer/partner packets. |
| `/pricing` | Token, paid, trial, or cancellation queries | Make plan fit, checkout route, cancellation, support, and special-access exceptions easier to scan. |
| `/guides/free-trial-vs-paid-token-plan` | Trial, free, paid, or token queries | Add FAQ or internal links that explain when to upgrade, request review access, or stop. |
| Setup guides | Mihon, Tachiyomi, TachiyomiAT setup queries | Add direct recovery paths for official APK, activation, support, and paid-plan readiness. |
| OCR checklist and workflow guides | Review, QA, or partner queries | Preserve product-light checklist value, then route qualified contacts to review-code or pilot gates. |

## Logging Template

Use this concise template in `docs/growth/growth-log.md` after each review:

```text
- Search Console query-to-revenue review: inspected last 28 days for `tachiyomiat.com` after owner-verified access. Priority query/page cluster: [summary only]. Change made: [page/link/meta/content]. Revenue rationale: [download/trial/pricing/support/review-code improvement]. No raw export, private dashboard screenshot, or unpublished metric claim committed.
```

## Hold Conditions

Hold instead of editing or publishing when:

- Search Console or Bing access is not owner-verified.
- The query requires package name, signing fingerprint, Play/Android developer verification, or screenshot facts not yet confirmed by the owner.
- The change would imply revenue, retention, user count, verified package status, or press endorsement without public proof.
- The page would target unauthorized catalog processing, APK mirroring, scraping, or spammy backlink placement.
