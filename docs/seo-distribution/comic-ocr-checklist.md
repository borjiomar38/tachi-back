# Comic OCR Translation QA Checklist

This neutral checklist is maintained as a linkable Nayovi trust asset for reviewer packets, GitHub maintainer questions, Android/newsletter submissions, and community moderator review. It is intentionally useful without requiring a product link.

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


## SEO Linkability Additions (2026-05-30)

### Compliance-first workflow section
- Add one comparative matrix for: manual screenshot OCR, built-in mobile OCR, and Nayovi mobile workflow.
- Publish this matrix with explicit fields: input ownership, permission handling, cloud usage, offline mode readiness, and expected accuracy.
- Add `FAQ` blocks with direct anchor opportunities to owned pages (`/support`, `/permissions`, `/terms`) without external claims.
- Include internal links to trial activation and pricing page from checklist steps so outbound referral flow remains high quality and user-task aligned.
