# Evidence and opportunity selection

## Source roles

Use the sources for what they actually measure:

| Source | Supports | Does not prove |
| --- | --- | --- |
| Search Console | Google queries, impressions, clicks, CTR, average position, page/query trends | On-site engagement, trial quality, revenue, or a guaranteed rank |
| GA4 | Sessions, landing pages, engagement, key events, device and country behavior after arrival | Search query demand or Google rank |
| Live page and repository | What users and crawlers can access now | How Google currently ranks it |
| Live search results | Current result types, intent patterns, and competing coverage | Private competitor data or future rank |

When Search Console access is missing, label the snapshot
`searchConsole.status = unavailable`. Never silently substitute GA4 sessions for
impressions, clicks, CTR, or position.

## Windows and comparisons

- Exclude today because GA4 and Search Console data can be incomplete.
- Default to the last 28 complete days versus the previous 28 complete days.
- For low-volume queries, also inspect 90 days and compare like-for-like periods.
- Compare page/query pairs when possible. Site-wide average position can hide useful
  movement and varies with query mix.
- Record brand versus non-brand behavior separately when enough data exists.
- Treat recent values as directional when Search Console marks them preliminary.
- Do not infer causality from a single before/after movement. Note releases,
  seasonality, indexing delay, and major traffic-source changes.

## Candidate generation

Look first for:

1. A relevant page/query pair with meaningful impressions and weak CTR where the
   title or description poorly communicates the real page value.
2. A page ranking outside the leading results for an intent it already answers, but
   with a clear content gap that Nayovi can fill from real product expertise.
3. An important public page with crawl, canonical, sitemap, structured-data, or
   internal-link problems.
4. An organic landing page with traffic but a weak, measurable path to the APK
   download or free trial.
5. A genuinely useful question from Nayovi's audience that no current page answers,
   provided the new page will be substantial, original, internally linked, and not
   cannibalize another page.

Do not manufacture a daily change. If no candidate clears the evidence and safety
gate, produce an audit result with no code change.

## Scoring

Score each viable candidate from 0 to 3 on:

- business relevance to qualified Nayovi users;
- strength of Search Console or observed user evidence;
- match between query intent and target page;
- size and clarity of the current gap;
- ability to measure the outcome;
- low implementation and regression risk.

Subtract 0 to 3 for each risk:

- cannibalization or duplicate intent;
- unverifiable or time-sensitive claims;
- visual scope that cannot complete the PNG workflow;
- need to touch private or disallowed surfaces;
- change whose only justification is adding keywords or content volume.

Choose the highest-scoring candidate only if it has a clear user benefit, measurable
primary metric, and no blocking risk. Keep the score and rationale in the internal
report.

## Hypothesis template

```text
Audience/intent:
Observed evidence:
Target page:
Single change:
Why it should help the visitor:
Primary metric (Search Console):
Secondary metric (GA4/product):
Baseline window:
Review window/date:
Confounders and limitations:
```

## Primary references

- Google Search Central: helpful, reliable, people-first content
  https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google Search Central: SEO Starter Guide
  https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Search Console Performance report metrics
  https://support.google.com/webmasters/answer/7576553
- Search Console performance-analysis guidance
  https://support.google.com/webmasters/answer/17010961
- Search Console API query method
  https://developers.google.com/webmaster-tools/v1/searchanalytics/query
