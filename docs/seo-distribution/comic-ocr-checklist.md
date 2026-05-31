# Comic OCR Translation QA Checklist

This neutral checklist is maintained as a linkable Nayovi trust asset for reviewer packets, GitHub maintainer questions, Android/newsletter submissions, and community moderator review. It is intentionally useful without requiring a product link.

## How to cite this asset

- Owned review packet link: `https://tachiyomiat.com/guides/comic-ocr-translation-checklist`
- Supporting flow page: `https://tachiyomiat.com/guides/translation-support-workflow`
- Responsible-sample policy: `https://tachiyomiat.com/guides/permission-safe-manga-translation-pilot`
- Android verification context language: `docs/seo-distribution/android-verification-public-profile-packet.md`

## Index snippet

Use this short summary in directories, newsletters, and community posts where a structured trust signal is needed:

`Nayovi uses a structured comic OCR reviewer checklist for manga, manhwa, and webtoon workflows. The review process verifies sample permission, text-region coverage, reading-order handling, OCR completeness, and glossary consistency before translation quality conclusions. The checklist is product-light and links to public permission and support assets only when rules allow links.`

## Structured publishing fields

- Audience fit: app reviewers, localization teams, OCR researchers, technical communities
- Search intent: OCR checklist, manga/manhwa AI translation QA, Android direct APK trust
- Recommended anchor text: "comic OCR translation QA checklist"
- No-spam policy: no link required in the first response unless rules and context allow explicit references

## Responsible Sample Scope

- Confirm the sample is owned, public-domain, an official preview, creator-approved, or otherwise permission-approved for OCR and translation testing.
- Do not use platform catalog pages, paid chapters, or third-party scans as public demo material without explicit permission.
- Keep source, permission status, language pair, and review date with the QA notes.
- Do not share translated output publicly until the permission status supports that use.

## Pre-OCR Capture

- Confirm the full page, double-page spread, or long-strip segment is present before OCR starts.
- Check that speech bubbles, narration boxes, side comments, small labels, handwritten effects, and vertical text are visible enough to inspect.
- Record whether the sample is manga, manhwa, manhua, webtoon, western comic, or mixed format because reading order changes the review.
- Keep a copy of the original page image beside the OCR output during review.

## OCR Completeness

- Count whether all visible text regions were detected.
- Flag missing text regions before judging translation quality.
- Mark uncertain regions where stylized lettering, low contrast, or small print may need manual correction.
- Keep original OCR text visible so reviewers can distinguish OCR mistakes from translation mistakes.

## Reading Order And Grouping

- Compare OCR block order with the page's actual reading flow.
- Check that unrelated speech bubbles, captions, and sound effects were not merged into one translation unit.
- Check that a single sentence split across bubbles has not been separated in a way that changes meaning.
- Review long-strip ordering separately from page-by-page ordering.

## Translation Review

- Track glossary decisions for names, places, ranks, techniques, honorifics, and recurring terms.
- Verify that speaker tone and relationship context survive the translation.
- Check that UI labels, source names, filenames, and other non-dialogue metadata were not translated accidentally.
- Review failed OCR blocks before retrying translation so the model is not asked to fix missing or corrupted input.

## Share Or Submit Decision

- For public examples, include only approved samples and summarize sensitive details when permission is narrow.
- For GitHub or newsletter submissions, use this checklist as the resource and mention Nayovi only when the context allows affiliation disclosure.
- For forums, Reddit, Q&A, or community replies, use a no-link version unless product links are explicitly allowed and useful.
- For Android reviewers and directories, pair the checklist with official source links, support path, pricing, privacy, terms, and responsible-use notes.


## SEO Linkability Additions (2026-05-31)

### Compliance-first workflow matrix

| Approach | Input ownership | Permission handling | Cloud use | Offline readiness | Expected accuracy profile |
| --- | --- | --- | --- | --- | --- |
| Manual screenshot OCR review | User-owned screenshot or approved sample page | Explicit sample-by-sample rights confirmation before sharing or review | Optional (optional upload or manual transfer steps) | High (no network needed for local review workflows) | Strong on small, high-contrast text; weakest on stylized sound effects and dense layout |
| Device-native OCR tools | Device/system OCR output only | Usually user-managed, no explicit translator workflow scope | Usually on-device with optional cloud fallback | Very high | Good for discoverability and speed; low control over post-processing policy |
| Nayovi Android workflow | User-owned/public-domain/chapter-safe sample, no catalog assumption | Requires explicit approval boundaries, no chapter-collection or replacement promises, and human-in-the-loop review | Optional if user enabled online mode in trial/paid settings | Medium-to-high when cache + retry strategy are enabled | Useful for manga/manhwa workflow consistency when combined with post-translation review checks |

### FAQ for internal linking

- What is the best way to keep translation quality high?  
  Start from clean source images, verify OCR completeness, then review glossary continuity before any final merge.
- What should users check after a bad line breaks OCR?  
  Check reading order first, then compare OCR boundaries and sentence grouping before trusting the translated output.
- Which legal or permission checks matter before sharing results?  
  Use only owned, public-domain, or explicit-approval content; never process private catalog content or unsupported chapter archives.

### Structured internal link path

- Link this checklist to support-facing, permission, and onboarding pages where users expect trust signals: `https://tachiyomiat.com/support`, `https://tachiyomiat.com/permissions`, `https://tachiyomiat.com/terms`.
- Keep a direct path from trial and pricing pages to the checklist so the trust layer remains conversion-relevant.
- Use `docs/seo-distribution/android-newsletter-resource-pitch.md` and the reviewer packet as canonical companion assets when sharing externally.
