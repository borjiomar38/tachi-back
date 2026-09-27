# Implementation and verification

## Page and content quality

- Satisfy one identifiable audience intent and make the answer easy to find.
- Add original, product-grounded value. Do not paraphrase competitors or pad to a
  target word count.
- Keep every claim accurate, public, and supportable from the product or a cited
  authoritative source.
- Use a descriptive, non-sensational title and one clear page-level H1.
- Avoid duplicating an existing Nayovi page's primary intent. Prefer consolidating or
  improving the established page.
- Do not change a published or updated date unless the visible content changed
  substantially enough to justify it.
- Preserve accessibility, semantic landmarks, heading order, focus behavior, and
  useful alt text.

## Technical SEO

- Confirm the route returns the expected successful status and meaningful rendered
  HTML without authentication.
- Use one absolute, self-referential canonical for an indexable primary page unless
  a deliberate alternate canonical is documented.
- Keep canonical signals consistent across redirects, HTML, and sitemap.
- Include only preferred, indexable canonical URLs in the sitemap.
- Ensure robots directives do not accidentally block the target page or required
  resources. Never index staging or preview hosts.
- Make important links crawlable `<a href>` links with concise contextual anchor
  text; do not rely only on client-side click handlers.
- Add structured data only for a Google-supported type that matches the visible main
  content. JSON-LD is preferred. Never mark up hidden, fake, or irrelevant content,
  and never assume valid markup guarantees a rich result.
- Keep metadata unique and accurate. A meta description is a snippet candidate, not
  a ranking guarantee.
- Preserve mobile usability and performance. Do not add heavy dependencies for a
  minor SEO change.

## Repository conventions

- Read and follow `AGENTS.md` before editing.
- Keep changes inside the automation's public-site allowlist.
- Use named exports, strict source types, kebab-case files, Tailwind conventions,
  and the project's component architecture when applicable.
- Never add hardcoded user-facing copy. Use `t('namespace:key')` and update the
  required `src/locales/{en,fr}/` namespace files. Preserve other supported locales
  according to the repository's fallback policy.
- Reuse or extend an existing policy/resolver function for business-critical rules.
- Add focused Vitest coverage for metadata, schema, sitemap, linking, routing, or
  rendered copy changed by the proposal.

## Verification sequence

Run the narrow checks first, then the full gates owned by the automation:

1. Inspect `git diff --check` and the complete diff.
2. Run the focused unit/browser test for every changed behavior.
3. Run lint and TypeScript validation.
4. Run the full test suite in CI/headless mode.
5. Run the production build.
6. Inspect the built or server-rendered target route and verify:
   - title and meta description;
   - one intended H1;
   - canonical URL;
   - robots directives;
   - relevant hreflang only when implemented correctly;
   - structured data parses and matches visible content;
   - internal links are real anchors;
   - target URL is present in the sitemap when appropriate;
   - preview host is not indexable.
7. If visual output changed, complete the PNG-target workflow and save desktop and
   mobile real-app screenshots for comparison.
8. Re-run relevant checks after every autonomous repair and validate the exact PR
   head SHA before requesting owner approval.

Do not hide, weaken, or remove a failing test to make the proposal pass. Repair the
root cause while remaining in the approved public scope. If an external dependency
is unavailable, report the limitation and do not claim that check passed.

## Post-deployment measurement

- Annotate the merge/deploy date and exact target page.
- Check indexing/canonical status separately from performance.
- Recheck the selected page/query after enough data has accumulated; use 14 days as
  a first directional checkpoint and 28 days as the default comparison unless volume
  requires a longer window.
- Compare the primary Search Console metric and secondary GA4/product metric against
  the recorded baseline.
- Prefer trends in qualified clicks and impressions over position alone.
- Label the result as positive, neutral, negative, or inconclusive. Keep or iterate
  based on evidence; do not rewrite history or overstate causality.

## Primary references

- Google link and anchor guidance
  https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- Google canonical guidance
  https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Google sitemap guidance
  https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview
- Google structured-data quality guidelines
  https://developers.google.com/search/docs/appearance/structured-data/sd-policies
