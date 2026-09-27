# Audience, copy, and ethical conversion

## Audience

Write for a normal manga or manhwa reader who wants the result but does not care how
the software is built. Assume they are scanning on a phone and may read English as a
second language.

Before writing, state internally:

```text
Reader:
Problem they recognize:
Outcome they want:
Reason they may hesitate:
One action this page should make easy:
```

Do not address developers, infrastructure teams, or AI researchers unless the page's
explicit search intent requires it. Never expose implementation details to make the
product sound sophisticated.

## Simple-English standard

- Prefer familiar words, active voice, and direct verbs.
- Keep most sentences under 20 words and paragraphs to one to three short sentences.
- Make headings meaningful when read alone.
- Explain a necessary term once in ordinary language. For example, write “Android
  app (APK)” before using “APK” alone.
- Remove terms such as pipeline, endpoint, repository, model architecture, OCR
  engine, inference, deployment, and API unless the reader must understand them to
  complete the task. Replace them with the visible outcome.
- Prefer “Translate a chapter while you read” over “Run an OCR and AI translation
  pipeline.”
- Prefer “Try Nayovi free” over vague labels such as “Get started” when that action
  is accurate.
- Do not repeat exact keywords unnaturally. Use the language a reader would use.
- Keep English primary copy plain. Make the French translation equally natural and
  clear rather than translating word for word.

Read the complete page aloud mentally. If a sentence sounds like release notes,
developer documentation, or an internal roadmap, rewrite it for the reader.

## Benefit-first persuasion

Sell the useful outcome, not the technology. Every public section should answer at
least one reader question:

1. Is this for me?
2. What problem will it solve?
3. What will be easier or better after I use it?
4. How does it work in a few simple steps?
5. Can I trust it, and are the claims believable?
6. What should I do next?

Translate a verified feature into a concrete benefit:

```text
Feature -> immediate capability -> reader outcome
```

Examples of the pattern, not facts to copy blindly:

- In-reader translation -> understand a chapter without leaving the reader -> keep
  the story flow.
- Simple installation -> try the app with fewer setup decisions -> reach the first
  useful result sooner.
- A free trial, if currently verified -> experience the real workflow before paying
  -> lower the risk of trying Nayovi.

Inspect the current product and public sources before using any example. Do not claim
speed, accuracy, language support, privacy, pricing, availability, or a free offer
unless the repository or live product verifies it.

## Recommended page flow

Use this as a decision framework, not a mandatory visual redesign:

1. Outcome-led headline: what the reader can accomplish.
2. One-sentence explanation: who it is for and how it helps.
3. Primary CTA: one clear, honest action.
4. Concrete benefits: usually three scannable outcomes, each distinct.
5. Simple process: three or fewer steps when the workflow needs explanation.
6. Trust and objection handling: only real evidence, transparent requirements, and
   accurate limitations.
7. Repeated CTA after the reader has enough information to decide.

Prefer improving the existing hierarchy and copy over adding more sections. More
words do not automatically create more value or better rankings.

## CTA and journey rules

- Choose one primary action per page. Secondary actions must not compete visually or
  semantically with it.
- Use the same name for the same action across the page.
- Make the next step clear before the click: download, try, compare, or read.
- Link benefits to the next logical step instead of dropping unrelated CTAs into
  every paragraph.
- Keep requirements and limitations visible before a download or purchase decision.
- Never use fake urgency, hidden costs, misleading buttons, forced consent, or fear.
- Track the meaningful action using the project's existing privacy and consent
  rules. Do not add surveillance merely to optimize conversion.

## Copy preflight

Before finishing, verify:

- a new visitor can explain Nayovi's value after the hero;
- the first screen contains no unexplained technical jargon;
- each feature statement ends in a real reader benefit;
- claims are verifiable from current public/product evidence;
- the CTA label describes the action and its destination works;
- the copy remains useful without search keywords;
- headings and short paragraphs are easy to scan on mobile;
- English and French user-facing strings use the repository's i18n pattern;
- the proposal names a conversion event that can be compared after deployment.
