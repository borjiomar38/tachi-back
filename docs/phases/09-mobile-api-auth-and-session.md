# Phase 09 - Mobile API Auth And Session

## Objective

Give the Android app a secure way to call Tachiyomi Back after activation.

## Validation Summary

This phase is confirmed as necessary after reviewing both repositories.

### Confirmed Current State In `tachi-back`

- The current backend auth stack is still Better Auth for internal/admin use.
- The shared oRPC base middleware currently resolves authentication through `auth.api.getSession(...)`, which is a cookie-session/admin path rather than a device-session mobile path.
- The public auth route `/api/auth/$` is also Better Auth-oriented and should not become the TachiyomiAT mobile session protocol.
- The env contract already defines `MOBILE_API_ENABLED`, `MOBILE_API_JWT_SECRET`, issuer/audience, and token TTL values, but no runtime session layer uses them yet.
- Phase 08 added anonymous redeem and device binding, but it still stops at activation and does not issue a reusable mobile bearer session.
- There is still no mobile-authenticated API surface yet for balance, license summary, refresh, or device heartbeat before this phase starts.

### Confirmed Constraints From TachiyomiAT Mobile

- TachiyomiAT still has no hosted-backend API client, no session token storage for this product, and no activation or balance UI yet.
- The app already has working patterns for authenticated APIs:
  private/app-state preference storage
  OkHttp interceptors
  and `Authorization: Bearer` headers in tracker integrations.
- The app also has a backup system that copies normal preferences, so device-bound mobile session state must not be stored as a normal preference that can move across devices.
- This phase should therefore define a device-bound bearer-session model that fits Android’s existing networking patterns without reusing Better Auth browser/cookie assumptions.

## Keep vs Replace

### Keep In Phase 09

- Better Auth for internal backoffice/admin identities only.
- The existing server route and middleware structure as inspiration for new mobile-authenticated procedures.
- The Android app’s existing OkHttp interceptor pattern for bearer-token APIs.

### Add Or Tighten In Phase 09

- Add a distinct mobile-authenticated API layer that is separate from Better Auth.
- Add device-bound bearer-session validation.
- Add stable contracts for balance, license summary, and session validity checks.

## Detailed Tasks

- Define the mobile session model returned after successful activation.
- Keep it device-bound and separate from redeem codes, Stripe state, and Better Auth admin sessions.
- Decide whether the first version uses:
  one signed bearer token only
  or a short-lived access token plus refresh token/session record pair.
  Prefer the simplest model that still supports revocation and rotation cleanly.
- Add server env validation for any mobile token signing secret, issuer, audience, and expiration settings required by the chosen design.
- Add middleware or a dedicated `mobileProcedure` path that validates mobile bearer auth without relying on `auth.api.getSession(...)`.
- Keep admin-authenticated routes, public routes, and mobile-authenticated routes clearly separate in code and documentation.
- Define how the app sends the token.
  Prefer `Authorization: Bearer <token>` so it fits existing OkHttp interceptor patterns already used elsewhere in TachiyomiAT.
- Define how TachiyomiAT stores device session state locally.
  Do not use a normal preference key that is included in backups.
  Prefer app-state storage for non-portable device session state such as access token, refresh token, or session metadata.
- Decide token lifetime, refresh behavior, rotation rules, and revocation semantics.
- Decide what should happen when:
  the device is revoked
  the license is revoked
  the session expires
  or the app is reinstalled and gets a new installation ID.
- Add an authenticated endpoint for current token balance and active license summary.
- Add an endpoint for session validation or refresh if your token model requires it.
- Add an endpoint for device heartbeat or implicit last-seen updates so backoffice can show recent activity.
- Require client metadata that is useful for support and rollout safety, such as:
  app version or version code
  application ID or build flavor
  platform
  and installation ID where appropriate.
- Decide whether that metadata is sent in headers, body fields, or both. Keep it consistent across mobile endpoints.
- Add per-device and per-session rate limits for sensitive endpoints.
- Add clear error contracts for:
  invalid session
  expired session
  revoked device
  revoked license
  empty token balance
  version unsupported
  and maintenance mode.
- Ensure backend logs tie each protected mobile request to the resolved device/license identity, request ID, and app version.
- Document endpoint classes explicitly:
  public
  admin-authenticated
  mobile-authenticated.
- Document how later phases will reuse the same mobile session for uploads, job creation, polling, and result download.

## Outputs

- Mobile authentication scheme.
- Balance and session validation endpoints.
- Shared error contract for app integration.
- Clear boundary between admin auth and mobile auth.

## Done When

- The app can authenticate without exposing Stripe or provider secrets.
- Revoking a device prevents further protected API usage.
- Support can identify which device and app version made a failing request.
- Mobile auth does not depend on Better Auth browser sessions or the `/api/auth/$` route.
- Device-bound mobile session state is defined in a way that is not accidentally portable via normal app-backup preferences.

## Not Part Of Phase 09

- Full Android activation and balance UI
- OCR or translation job submission
- Public checkout or webhook logic
- Backoffice license/device screens
