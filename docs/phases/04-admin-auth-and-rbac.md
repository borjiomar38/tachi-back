# Phase 04 - Admin Auth And RBAC

## Objective

Lock the backoffice behind admin-only access and define who can operate payments, devices, and jobs.

## Validation Summary

This phase is confirmed as necessary after reviewing both repositories.

### Confirmed Current State In `tachi-back`

- `tachi-back` already has a real auth foundation with Better Auth in `src/server/auth.tsx`.
- `/manager` and `/app` route trees are already guarded in the UI through `GuardAuthenticated` and permission checks on `apps`.
- Server-side oRPC procedures already enforce authentication and permissions through `protectedProcedure`, so this is not only a UI concern.
- The starter role model and permission surface have now been tightened into internal `support` and `admin` roles, with permission namespaces aimed at staff, licenses, devices, orders, jobs, providers, and audit visibility instead of starter business entities.
- Public signup is now explicitly disabled through an internal-only auth policy rather than being derived from demo mode.
- The Better Auth Expo plugin has been removed from the server auth path so the repo no longer implies that TachiyomiAT mobile customers should authenticate through Better Auth.
- Current staff-management routes remain useful as the internal admin base, but they still represent internal staff accounts only, not end-user customer identities.

### Confirmed Constraints From TachiyomiAT Mobile

- TachiyomiAT currently has no end-user login flow for this backend.
- The mobile product direction is device activation plus tokens, not email OTP login through Better Auth.
- Phase 04 must keep a clean separation between:
  backoffice admin authentication in `tachi-back`
  and future mobile activation/session auth for TachiyomiAT.
- Mobile customers must not be forced into the same identity model as internal admins.

## Keep vs Replace

### Keep In Phase 04

- Better Auth as the backoffice/admin authentication layer.
- Existing route guard structure for `/manager`.
- Existing server-side permission enforcement through `protectedProcedure`.
- Existing staff/session admin scaffolding that is useful for managing internal backoffice accounts.

### Replace Or Tighten In Phase 04

- Replace any remaining starter `user/admin` role assumptions with product-oriented internal roles.
- Replace any remaining starter resource permissions with permissions relevant to orders, licenses, devices, jobs, and admin management.
- Keep signup under an explicit internal-auth policy.
- Keep trusted origins scoped to the admin web surface instead of implying mobile Better Auth usage.

## Detailed Tasks

- Keep Better Auth for internal admin access instead of using it for end-user mobile accounts.
- Explicitly document that Better Auth users in this repo are internal staff/admin identities, not TachiyomiAT customers.
- Replace the old `AUTH_SIGNUP_ENABLED` starter behavior with an explicit internal-only policy.
- Seed the first admin account or admin email allowlist for local development.
- Protect `/manager` routes with server-side role checks and keep server procedure checks as the source of truth.
- Review `/app` routes and decide whether they remain useful for internal staff, should be merged into manager behavior, or should be removed later.
- Define internal roles such as `owner`, `admin`, `support`, and `operator`, or keep a smaller `admin` plus `support` split if you want to stay simple.
- Replace starter permissions with permissions for sensitive operations such as:
  manual token credit
  device revoke
  redeem code generation
  refund handling
  webhook replay
  provider configuration viewing
  job retry/cancel
- Add route guards and shared helpers so UI and API checks stay aligned.
- Ensure manager-only procedures remain protected server-side even if future UI routes change.
- Review the Better Auth Expo plugin and `AUTH_TRUSTED_ORIGINS` usage and decide whether they belong to admin auth in this repo or should be removed to avoid implying mobile Better Auth support.
- Add audit-log stubs or a documented audit event list for any privileged action, even if the full audit screen comes later.
- Add login, logout, onboarding, and error copy that matches Tachiyomi Back rather than the starter product.
- Document the boundary that future mobile activation/session auth is a separate concern and must not reuse privileged admin sessions.

## Outputs

- Admin-only backoffice access.
- Basic role model.
- Security boundary between public website, mobile API, and internal manager pages.
- A documented internal-auth policy for who can create or access admin accounts.

## Done When

- Anonymous users cannot reach any manager page or manager API.
- Admin privileges are checked server-side, not only hidden in the UI.
- Public signup is disabled or explicitly restricted for internal-only access.
- Better Auth is clearly scoped to internal backoffice identities, not mobile customers.
- Sensitive future actions already have a place for audit logging.

## Not Part Of Phase 04

- Mobile redeem-code activation
- Device-bound mobile session auth
- Stripe customer identity design
- Provider gateway authentication
