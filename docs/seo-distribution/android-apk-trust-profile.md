# Nayovi Android APK Trust Profile

This owned trust profile is maintained by the SEO distribution agent for app reviewers, directory editors, Android newsletters, creator-platform teams, and partner diligence. It is safe to cite as a repo-native packet when a landing page feels too promotional.

## Source of Truth

- Product name: Nayovi
- Primary product domain: https://nayovi.com
- Official Android APK source: https://tachiyomiat.com/download
- Hosted OCR and AI translation page: https://tachiyomiat.com/translate-manhwa-ai
- Pricing: https://tachiyomiat.com/pricing
- Support: https://tachiyomiat.com/support
- Responsible workflow guide: https://tachiyomiat.com/guides/translation-support-workflow
- Comic OCR checklist: https://tachiyomiat.com/guides/comic-ocr-translation-checklist
- Privacy: https://tachiyomiat.com/legal/privacy
- Terms: https://tachiyomiat.com/legal/terms
- Official sources and takedown policy: https://tachiyomiat.com/legal/official-sources-takedown

## Public Description

Nayovi is an Android APK and hosted OCR/AI translation workflow for manga, manhwa, and manhua reader workflows. It provides official APK download, free trial access, redeem-code activation, monthly token plans, support paths, and hosted OCR/AI translation.

Nayovi does not host or distribute chapters. It supports owned content, public-domain material, official samples, or content users have permission to process.

## Reviewer Metadata Checklist

Reviewers and directory editors should attach these fields before publishing:

- Official APK URL from `tachiyomiat.com/download`.
- Current file name, build label, size, and SHA-256 from the download page.
- Package name only after owner confirmation.
- Signing-certificate fingerprint only after owner confirmation.
- Android developer verification status only after owner confirmation.
- Pricing, support, privacy, terms, and responsible-use links.
- Screenshot scope and sample permission notes.
- Whether the reviewer used free trial, redeem-code access, or a private partner code.

Do not infer package ownership, signing-certificate details, or developer verification status from the APK filename, third-party mirrors, or screenshots.

## Safe Test Scope

Approved testing can use:

- Public-domain pages.
- Creator-provided samples.
- Official previews where the rights holder permits processing.
- Content owned by the tester.
- Partner-provided pages with written approval.

Unsafe testing includes licensed chapter rips, paywalled pages, scraped uploads, or screenshots that expose private reader data.

## Directory Listing Filter

Use a directory only when it can preserve the official source links and accurate pricing language.

Acceptable listing language:

- Android APK with hosted OCR and AI translation.
- Free trial access plus paid monthly token plans.
- Official download and support through `tachiyomiat.com`.
- Permission-safe use for owned, public-domain, official-sample, or approved content.

Reject or hold listings that require:

- Dofollow reciprocal backlinks.
- Paid placement as a condition for indexing.
- Review swaps or incentivized ratings.
- Mirror-first APK redistribution.
- Misleading labels such as forever-free, open-source, chapter source, or official manga catalog.

## Partner and Press Handoff

Use this packet when a press contact, app-testing service, Android newsletter, APK directory, creator platform, localization team, or investor asks for proof before coverage.

Recommended handoff:

1. Send the official download page.
2. Send this trust profile.
3. Send the reviewer screenshot policy.
4. Offer a redeem code only after the owner approves the tester scope.
5. Use approved samples only.
6. Keep public screenshots private until publication rights are confirmed.

## Pre-Submission Gate

Before Nayovi is submitted to an app-testing portal, APK review site, AI directory, startup directory, newsletter, or public launch page, verify these gates:

- Source links: the listing can keep `https://tachiyomiat.com/download`, pricing, support, privacy, terms, and responsible-use links visible.
- APK identity: file name, build label, size, and SHA-256 are current; package name, signing fingerprint, and developer verification status stay pending unless owner-confirmed.
- Sample safety: test pages are owned, public-domain, official-sample, or explicitly permission-approved.
- Screenshot safety: private codes, emails, payment data, device identifiers, and unauthorized chapter pages are hidden or omitted.
- Pricing accuracy: the listing can say free trial plus paid monthly token plans; it must not call Nayovi forever-free, open-source, a chapter source, or an official manga catalog.
- Review integrity: the surface does not require fake reviews, incentivized ratings, vote requests, dofollow reciprocal backlinks, mirror-first APK redistribution, or paid placement as a backlink condition.
- Owner approval: any APK upload, tester campaign, public report, launch submission, or directory form remains owner-reviewed until an authorized platform/API workflow is configured.

If any gate fails, keep the opportunity in `watch`, `hold`, or `OWNER_REVIEW_REQUIRED` status instead of submitting.

## Credential Boundary

No credentials, tokens, identity documents, account screenshots, cookies, recovery codes, or verification challenges belong in this document. Store only non-secret references in setup docs. Actual values belong in `/opt/tachi-back/.env.seo-distribution-agent` with strict permissions or another approved secret store.
