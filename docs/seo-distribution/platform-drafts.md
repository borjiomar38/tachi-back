# Nayovi Platform Drafts

This file is maintained by the SEO distribution agent.

External platform drafts are for authorized-account posting only. Do not create accounts, bypass platform login, or post promotional backlinks automatically. Every draft should be useful without the backlink and should include a no-link variant when the community may reject links.

## Draft Queue

| Status | Platform | Community/location | Draft topic | Link target | Review notes |
| --- | --- | --- | --- | --- | --- |
| draft | LinkedIn | Nayovi company page or founder profile | Short build-in-public post showing Android OCR translation workflow and responsible-use stance | https://tachiyomiat.com/download | AUTHORIZED_ACCOUNT_REQUIRED: needs official LinkedIn account/session or API workflow. |
| draft | Reddit | Manga/manhwa reader communities that allow tools discussion | How to evaluate an OCR translator for panel order, language choice, and privacy | https://tachiyomiat.com/translate-manhwa-ai | OWNER_REVIEW_REQUIRED: check subreddit rules; use no-link variant first if unsure. |
| draft | GitHub | Owned Nayovi docs or a relevant awesome-list candidate | Technical note on OCR block merging, translation QA, and hosted Android workflow | https://tachiyomiat.com/translate-manhwa-ai | Use owned repo/docs unless a maintainer explicitly welcomes a resource PR. |

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
