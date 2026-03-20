# Phase 05 - Public Website And Pricing

## Objective

Build the public-facing website and pricing surface that explains the hosted translation service and prepares users for the later Stripe checkout flow.

## Validation Summary

This phase is confirmed as necessary after reviewing both repositories.

### Confirmed Current State In `tachi-back`

- The root route `/` needs to become the public website surface instead of acting like part of the internal auth flow.
- There is still no fully launched marketing site yet.
- The only obvious user-facing home content still lives in the authenticated app area and should not be mistaken for the public product site.
- Branding is already `Tachiyomi Back`; the missing part is the public route and content surface, not the repo rename.
- The current route structure already gives a clean separation point:
  `/manager` for internal backoffice
  `/` and future public routes for marketing and pricing
- The existing `/app` route tree is authenticated starter app UI and should not be treated as the public website.

### Confirmed Constraints From TachiyomiAT Mobile

- TachiyomiAT currently still tells users to bring their own API keys.
- Hosted OCR plus translation is the future product direction, but Phase 5 must not overstate what is already live in the app if Android integration has not shipped yet.
- The website therefore needs clear messaging about:
  what TachiyomiAT is today
  what the hosted service enables
  and how activation will work without user login.
- Because the mobile product has no account login, public copy should emphasize redeem-code activation and device binding rather than “create an account”.

## Keep vs Replace

### Keep In Phase 05

- The shared design system, component library, and layout primitives from the starter.
- The root document, i18n setup, and general app shell infrastructure.

### Replace Or Add In Phase 05

- Replace the `/` redirect-to-login behavior with a real public landing page.
- Replace demo landing content and public branding.
- Add dedicated public routes for pricing, activation/how-it-works, support/legal, and download guidance.

## Detailed Tasks

- Replace the root redirect with a real Tachiyomi Back marketing site.
- Keep `/manager` as the internal backoffice area and do not repurpose `/app` as the public website.
- Create a clear value proposition for hosted OCR plus translation with no user API keys required.
- Add pricing cards for token packs using seeded `TokenPack` data or a temporary read-only server source if token-pack CRUD is not live yet.
- Add a simple explanation of how activation works without account login: pay, get a redeem code, bind to device, spend tokens on jobs.
- Make sure public copy does not falsely imply that hosted mode is already available in the Android app if the integration has not shipped yet.
- Add FAQ content for tokens, supported providers, supported languages, device changes, refunds, and privacy.
- Add legal page placeholders for Terms of Service, Privacy Policy, and acceptable use.
- Add a support or contact path.
- Add public routes or sections for:
  landing
  pricing
  activation/how it works
  download
  legal/support
- Add CTA flows for "Buy tokens", "How activation works", and "Download TachiyomiAT".
- In this phase, CTA targets can be placeholders or route stubs; actual Stripe checkout wiring belongs to Phase 06.
- Make sure marketing content can evolve without touching payment logic.
- Replace `Start UI` branding in page titles, logo copy, and manifest metadata so public pages no longer look like the imported starter.
- Keep the design aligned with the existing repo design system so later admin pages still feel cohesive.

## Outputs

- Public landing page.
- Pricing page backed by server data.
- Activation explanation page.
- Public route structure separated cleanly from admin routes.

## Done When

- A new visitor can understand the product, pricing, and activation flow in a few minutes.
- Token pack cards are sourced from real config or database data, not hardcoded demo copy.
- Public pages have no dependency on admin login.
- The root route is a public marketing entry point, not a redirect to `/login`.
- The website messaging is consistent with the current Android reality and does not overpromise shipped backend integration.

## Not Part Of Phase 05

- Implementing Stripe Checkout session creation
- Crediting paid token purchases
- Implementing redeem-code activation APIs
- Integrating the Android app with the hosted backend
