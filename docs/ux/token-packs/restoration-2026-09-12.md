# Historical presentation restored — local verification

## Scope

Restore the production presentation from commit `6e83673` (10 September), changing only offer copy and catalog values. No new design. The current one-time checkout, independent wallets, payment return, backend catalog, and mobile app remain untouched.

## Visual reference

- `docs/ux/final-tour/desktop-1280x900-pricing.png`
- `docs/ux/implemented-home-pricing-coffee-copy-2026-07-31.png`

Both were inspected before restoring the historical components. Exact historical source, rather than a regenerated mockup, is the layout authority.

## Verification

- AST comparison against `6e83673`: all class attributes match, allowing only class ordering. Landing: 94/94; pricing: 52/52; shared offer card: 23/23.
- TypeScript: `pnpm exec tsc --noEmit` passed.
- Public feature tests: `pnpm exec vitest run --project unit src/features/public` — 36 passed.
- Real browser captures were taken and displayed in the task: pricing desktop (1280 × 900), homepage pricing desktop (1280 × 900), homepage pricing intermediate (1024 × 768), and pricing mobile (390 × 844). The browser full-page export was malformed, so normal viewport captures were used for comparison.
- No horizontal page overflow at 1024 px or 390 px. Four original columns on wide desktop, two at the intermediate breakpoint, one on mobile.
- Catalog-render tests verify all three new checkout URLs, current token packs, trial/support routing, changed token amounts and prices, and server-provided consumption costs (including non-default test values).
- The restored information block displays the configured chapter and advanced-search costs, not estimated chapter allowances or a future Pro translation mode.

## Local preview

- Home: http://127.0.0.1:5181/#pricing
- Pricing: http://127.0.0.1:5181/pricing

The preview uses the dedicated local database, with payments, external email and AI providers disabled. Accordingly, paid cards show Contact support locally; catalog-enabled purchase buttons and their new checkout destinations are covered by the render tests.

Initial validation was local-only. Production deployment was subsequently authorized by the user on 12 September and uses the existing master-push workflow. This restoration does not change products, payment settings, wallets, or database records.
