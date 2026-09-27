---
name: nayovi-seo-growth
description: Evidence-led, white-hat SEO growth for Nayovi. Use when analyzing GA4 or Google Search Console, choosing an organic-search opportunity, improving a public Nayovi page, metadata, internal links, sitemap, canonical tags, or structured data, validating an SEO proposal, or measuring whether a deployed SEO change worked. Do not use for private dashboards, paid acquisition, unrelated product work, or mobile-app release notes.
---

# Nayovi SEO Growth

Improve qualified organic discovery without inventing evidence or weakening the
product. Optimize for users who can benefit from Nayovi, not for raw visit counts.

## Required reading

For a proposal or implementation, read all three:

- `references/evidence-and-opportunity.md`
- `references/audience-copy-and-conversion.md`
- `references/implementation-and-verification.md`

For a measurement-only request, read the evidence reference. For a code-review-only
request, read the implementation reference.

## Non-negotiable rules

1. Treat GA4 and Search Console as different evidence sources. GA4 explains what
   visitors do after arrival. Only Search Console supplies Google queries,
   impressions, clicks, CTR, and average position.
2. Never state that rankings improved from GA4 traffic alone. If Search Console is
   unavailable, record that limitation and choose a reversible improvement based on
   user intent, crawlability, page quality, or conversion evidence.
3. Select one focused opportunity per proposal. Improve an existing relevant page
   before creating a thin or overlapping page.
4. Stay on public website surfaces. Never expose private Analytics rows, user data,
   credentials, infrastructure, internal paths, unpublished product plans, or admin
   information.
5. Follow the repository `AGENTS.md`. In particular, do not introduce hardcoded
   user-facing strings: use the existing react-i18next namespace pattern and update
   every supported locale required by the repository.
6. Do not use keyword stuffing, doorway pages, mass-generated content, fake reviews,
   fabricated expertise, misleading dates, hidden text, paid-link schemes, or claims
   Nayovi cannot substantiate.
7. Do not promise a position. State a hypothesis and a measurement window. Search
   performance is influenced by external systems and normally changes over time.
8. Do not change layout or visual hierarchy without the required PNG mockup and real
   screenshot comparison workflow. Prefer a non-visual improvement when the visual
   workflow cannot be completed in the same proposal.
9. Write public content for ordinary readers, not developers. Lead with what Nayovi
   helps them do and why it matters. Use simple English, concrete benefits, and one
   obvious next step; keep implementation details out of customer-facing copy.

## Working sequence

1. Establish the evidence window and data availability.
2. Inspect the current public page, rendered metadata, canonical, robots behavior,
   sitemap inclusion, structured data, internal links, mobile behavior, and existing
   tests before proposing a change.
3. Examine the live search result landscape for the target intent. Use it to
   understand expectations and gaps, never to copy competitors.
4. Define the reader, their problem, the desired outcome, and the single action the
   page should make easy. Apply the audience and conversion reference.
5. Score candidate opportunities using the evidence reference and pick only the
   strongest one that fits the public allowlist.
6. Write the hypothesis before editing: audience, observed evidence, intended
   change, primary search metric, secondary product metric, and observation window.
7. Implement the smallest complete change that satisfies the intent and adds unique,
   accurate value.
8. Run the checks in the implementation reference. Repair failures autonomously and
   remain in scope.
9. Produce the report contract below. Do not commit, push, open or merge a PR,
   deploy, or send mail when the outer automation owns those actions.

## Report contract

End implementation reports with all three markers, each on one line:

```text
OWNER_CHANGE: <one short, non-technical French sentence explaining what changed>
OWNER_BENEFIT: <one short, non-technical French sentence explaining the expected visitor benefit>
PREVIEW_PATH: /public-route-to-review
```

Before the markers, include:

- evidence used and evidence unavailable;
- the selected query/topic and page;
- the hypothesis and baseline;
- files changed and checks run;
- the primary Search Console metric and secondary GA4/product metric to recheck;
- limitations and the earliest sensible review date.

Keep the two owner sentences factual. Say “devrait aider” or “vise à” for an expected
effect; do not present an unmeasured result as achieved.
