# Nayovi Platform Drafts

This file is maintained by the SEO distribution agent.

External platform drafts are for authorized-account posting only. Do not create accounts, bypass platform login, or post promotional backlinks automatically. Every draft should be useful without the backlink and should include a no-link variant when the community may reject links.

## Draft Queue

| Status | Platform | Community/location | Draft topic | Link target | Review notes |
| --- | --- | --- | --- | --- | --- |
| draft | LinkedIn | Nayovi company page or founder profile | Short build-in-public post showing Android OCR translation workflow and responsible-use stance | https://tachiyomiat.com/download | AUTHORIZED_ACCOUNT_REQUIRED: needs official LinkedIn account/session or API workflow. |
| draft | Reddit | Manga/manhwa reader communities that allow tools discussion | How to evaluate an OCR translator for panel order, language choice, and privacy | https://tachiyomiat.com/translate-manhwa-ai | OWNER_REVIEW_REQUIRED: check subreddit rules; use no-link variant first if unsure. |
| draft | GitHub | Owned Nayovi docs or a relevant awesome-list candidate | Technical note on OCR block merging, translation QA, and hosted Android workflow | https://tachiyomiat.com/translate-manhwa-ai | Use owned repo/docs unless a maintainer explicitly welcomes a resource PR. |
| draft | Product Hunt | Nayovi launch page | Android APK for hosted manga/manhwa OCR translation | https://tachiyomiat.com/download | AUTHORIZED_ACCOUNT_REQUIRED: official maker account only; never request upvotes. |
| draft | DEV Community | Canonical technical post | OCR translation QA checklist for manga and manhwa pages | https://tachiyomiat.com/guides/translation-support-workflow | AUTHORIZED_ACCOUNT_REQUIRED: use canonical_url to owned guide if cross-posting. |
| draft | GlobalComix | Creator/platform partnership contact | Permission-safe OCR workflow feedback for approved samples | https://tachiyomiat.com/guides/translation-support-workflow | OWNER_REVIEW_REQUIRED: official contact path; no catalog translation implication. |

## Draft Bodies

### LinkedIn build-in-public post

Status: draft
Target: official Nayovi company page or founder profile
Risk: low if posted from an owned account and framed as product progress, not a mass pitch.
No-link variant: yes

Post:

I am building Nayovi, an Android APK for manga, manhwa, and manhua readers who need OCR + AI translation without managing provider API keys on the phone.

The hard part is not just translating text. The product has to preserve page flow, language choice, OCR blocks, loading state, and final readable output while staying clear that it does not host or distribute chapters.

Current focus:
- official APK install and support path
- free trial and redeem-code testing for reviewers
- hosted OCR/translation workflow
- QA checks for OCR block merging and translation mistakes

I am looking for feedback from Android reviewers, localization operators, creator platforms, and manga/webtoon teams who care about permission-safe translation workflows.

Link variant: https://tachiyomiat.com/download

### Reddit value-first post

Status: draft
Target: only communities that allow app/tool discussion
Risk: medium; use no-link variant unless rules clearly allow links.

Title:
What would you check before trusting an OCR translator for manhwa pages?

Body:

I have been working on an Android OCR + translation workflow for manga/manhwa/manhua pages, and the biggest quality issues are not always the translation model itself.

The main things I am trying to evaluate:
- whether OCR keeps speech bubbles and narration in the right order
- whether merged OCR blocks accidentally combine unrelated text
- whether names/terms stay consistent across a chapter
- whether the app shows the original, language choice, loading, and final result clearly enough
- whether the tool is explicit that it does not host chapters and should only be used for content the reader can legally process

For readers who use translation tools: what failure would make you stop trusting the result?

No-link variant: omit product name and ask for workflow feedback only.
Link variant only if allowed: https://tachiyomiat.com/translate-manhwa-ai

### GitHub owned docs note

Status: draft
Target: owned GitHub repository or docs page
Risk: low on owned repo; medium/high if proposed to external repos without maintainer invitation.

Title:
OCR block merging checks for manga and manhwa translation workflows

Body:

Nayovi's translation QA workflow compares three artifacts for each completed chapter: full chapter images, original OCR blocks, and merged OCR blocks after grouping. The goal is to detect merge problems before they become translation problems.

Useful checks:
- full chapter image exists before analysis
- original OCR block count is present and non-empty
- merged block count is present and non-empty
- merge output does not combine unrelated bubbles or captions
- translated output does not translate UI labels, source names, or text that should remain original

This is the kind of technical trust asset that can support Android reviewer outreach and developer-facing backlinks without posting promotional comments.

### Product Hunt launch draft

Status: draft
Target: Product Hunt new product submission and maker comment
Audience: makers, Android power users, early adopters, investors
Rules risk: medium; Product Hunt launch should be posted only by an authorized maker account, and the launch must not ask people directly for upvotes.
No-link variant: not applicable for Product Hunt submission; use the official product URL only.
Link variant: https://tachiyomiat.com/download

Tagline:
Android OCR translation workflow for manga and manhwa

Short description:
Nayovi is an Android APK with hosted OCR, AI translation, redeem-code activation, free trial access, token plans, and support for permission-safe manga, manhwa, and manhua reading workflows.

Maker comment:

I built Nayovi for Android readers who want manga, manhwa, and manhua OCR translation without managing provider API keys on the phone.

The product is intentionally narrow: official APK download, hosted OCR and translation, redeem-code activation, free trial access, token plans, and support. It does not host or distribute chapters, and the public workflow guide is explicit about owned content, public-domain material, official samples, and permission-approved use.

The quality work is mostly in the unglamorous parts: OCR block order, merged bubbles, glossary consistency, source-of-truth install links, and recovery/support paths when activation or device setup fails.

I am looking for feedback from Android reviewers, localization operators, creator platforms, and readers who have tried OCR translation tools and know where they break.

### DEV canonical post draft

Status: draft
Target: DEV Community technical article
Audience: developers, localization engineers, technical founders
Rules risk: low if posted from an authorized account with canonical_url set to the owned guide.
No-link variant: publish only as an owned-site article and do not syndicate.
Link variant: canonical_url: https://tachiyomiat.com/guides/translation-support-workflow

Front matter:

```yaml
---
title: "OCR translation QA checks for manga and manhwa pages"
published: false
description: "A practical checklist for reviewing OCR block order, merged bubbles, glossary consistency, and permission-safe comic translation samples."
tags: ocr, localization, android, ai
canonical_url: https://tachiyomiat.com/guides/translation-support-workflow
---
```

Body:

Most OCR translation failures in comics are not only model-quality problems. The failure often happens one step earlier, when text detection, reading order, or grouping turns a clean page into confusing translation input.

Checklist:
- Confirm speech bubbles, narration boxes, vertical text, small labels, and side comments are detected.
- Compare OCR block order against the actual page or long-strip flow.
- Look for unrelated bubbles or captions merged into one translation unit.
- Keep a glossary for names, places, ranks, techniques, and honorific choices.
- Mark whether the sample is approved for processing before judging whether it is ready to share.

This is the review pattern behind Nayovi's hosted Android OCR workflow. The useful part for other builders is simple: do not evaluate the translated sentence until you know the input blocks are complete, ordered, and allowed to be processed.

### GlobalComix partnership feedback draft

Status: draft
Target: GlobalComix official contact path
Audience: creator platform or publisher partnership team
Rules risk: medium; send only through an authorized owner-reviewed channel and avoid implying translation of GlobalComix catalog content without permission.
No-link variant: include the summary only and offer to send the public guide if relevant.
Link variant: https://tachiyomiat.com/guides/translation-support-workflow

Subject:
Approved-sample OCR translation workflow feedback

Message:

Hi GlobalComix team,

I am building Nayovi, an Android APK and hosted OCR/AI translation workflow for manga, manhwa, manhua, and comic readers.

I found GlobalComix while reviewing creator and publisher platforms because your public materials focus on creator control, global reach, digital reading, and publisher partnerships. I wanted to ask whether feedback on a permission-safe OCR translation workflow could be useful from a platform perspective.

The scope would be approved samples only: creator-owned material, public-domain material, official previews, or content where the creator/publisher has explicitly allowed testing. Nayovi does not host or distribute chapters, and it is not a request to translate GlobalComix catalog content without permission.

The public workflow guide covers the current review checklist: OCR block order, merged speech bubbles, glossary consistency, source-of-truth install links, and takedown-ready handling.

If this is relevant, I can send the guide, screenshots, and demo context for feedback. If not, no problem and I will not follow up.

Best,
Nayovi team
