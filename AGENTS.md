# tachi-back — Agent Instructions

## State Management
- Always use small, focused Zustand stores (slices) to manage state per module/feature.
- Each feature module should have its own Zustand store rather than a single global store.

## Component Architecture
- Each visual block/section must live in its own dedicated component — no monolithic components.
- Components should only subscribe to the specific slice of data they need (selective Zustand selectors) for optimal re-render performance.
- Named exports with arrow function syntax (`export const Component = () => {}`), never default exports.
- Props typed via an interface with a `Props` suffix (e.g., `MissionCardProps`).

## JS/TS Logic Patterns
- Prefer dictionary/object-map patterns over switch statements or if/else chains for scalability (e.g., `const handlers: Record<Status, () => void> = { ... }`).
- Simple ternary operators are allowed. Nested ternaries are forbidden.
- Avoid `let` declarations that are assigned later inside branching logic. Extract a named function and use readable branching via `getUiState(...).match(...).exhaustive()` or a Remeda-based helper when appropriate.

## TypeScript
- Always use strict, explicit TypeScript typing — no `any`, no implicit types.
- Always reuse the original/source type instead of redeclaring equivalent local types at each usage site. If a type needs to change, update it in one place and consume that shared type everywhere.
- Prefer interfaces for component props, Zod inference (`z.infer<>`) for data shapes.
- Custom hooks must have fully typed input options and return value interfaces.

## File & Naming Conventions
- All files in **kebab-case** (enforced by ESLint `unicorn/filename-case`).
- Hooks prefixed with `use-` (e.g., `use-merchandise-selection.ts`).
- Import paths use the `@/` alias — no relative `../` imports.
- Import order enforced by `eslint-plugin-simple-import-sort`: externals → `@/` absolutes → relatives.

## Styling
- **Tailwind CSS** exclusively — no inline styles, no CSS modules.
- Use `cn()` utility (clsx + tailwind-merge) for conditional/merged classes.
- Use **CVA** (Class Variance Authority) for variant-based component styling.

## Forms & Validation
- **React Hook Form** for form state.
- When a field interaction can drive behavior directly, prefer handling it in that field's `onChange` instead of introducing a `useEffect`.
- **Zod** schemas for validation — schemas defined as factory functions (`const zSchema = () => z.object({...})`).
- Types inferred from Zod: `type Schema = z.infer<ReturnType<typeof zSchema>>`.
- Do not manually traverse `formState.errors` with ad hoc object guards. Use `getFieldState(...)` or `useFormState(...)` for readable, targeted field error access.

## Data Fetching
- **TanStack React Query** + **ORPC** for type-safe data fetching.
- Pattern: `useQuery(orpc.router.procedure.queryOptions({ input: {...} }))`.

## Internationalization
- **react-i18next** with namespace-based JSON files under `src/locales/{en,fr}/`.
- Always use `t('namespace:key')` — never hardcode user-facing strings.

## Testing
- **Vitest** — unit tests: `.unit.spec.ts`, browser tests: `.browser.spec.tsx`.
- Storybook stories: `.stories.tsx`.

## UI Components
- Radix UI primitives wrapped in `src/components/ui/`.
- Icons from **Lucide React**.
- Toasts via **Sonner**.

## Backend / API
- **ORPC** routers with `protectedProcedure` / `publicProcedure`.
- Business logic in service files under `src/server/services/`.
- Errors thrown as `ORPCError` with structured `data` payloads.
- **Prisma** as ORM.
- **Prisma migrations must never be created manually** (`migrate diff`, hand-written migration folders/files, or edited SQL as the primary migration path are forbidden).
- Always create schema migrations with `pnpm prisma migrate dev --name ...`.
- **`pnpm db:push` / `prisma db push` is forbidden** unless the user explicitly asks for it.
- If `pnpm prisma migrate dev --name ...` is blocked by environment/runtime constraints, stop and report the issue instead of falling back to a manual migration workflow.

## Vercel Production Deploy
- **IMPORTANT AUTO-DEPLOY:** pushing this repository to GitHub can trigger an automatic Vercel production deployment. Before pushing, confirm that this production deploy side effect is intended. After a GitHub push, do not also run a manual production deploy unless the user explicitly asks for it.
- **Canonical command:** when the user says "deploy", "push and deploy", or "deploy prod", run `pnpm deploy:prod` from `/Users/macbookpro/Documents/p2/tachi/tachi-back`. Do not start with raw Vercel commands.
- `pnpm deploy:prod` owns the exact sequence, including type-checking, `vercel pull`, production build, prebuilt deploy, deployment inspection, and mobile route health verification.
- Vercel writes sensitive pulled secrets such as `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY` as empty strings in `.vercel/.env.production.local`; this is expected. The deploy script overlays the local `.env` R2 values only for the local prebuilt build validation, without printing them.
- For `tachi-back`, prefer the prebuilt deployment path. A direct `vercel deploy --prod --yes` has failed before with `deploy_failed`, an empty CLI message, and a zero-millisecond Vercel build. Do not waste time retrying that path first.
- Use the NAEST Vercel team scope explicitly: `maleks-projects-5ef1c03`.
- Deploy from this directory only: `/Users/macbookpro/Documents/p2/tachi/tachi-back`.
- Standard production deploy sequence:

```bash
pnpm deploy:prod
```

- `vercel build --prod` runs the configured production build using pulled Vercel env vars and runs `pnpm db:migrate:deploy`; confirm there are no pending migration failures before deploying.
- Never commit `.vercel/.env.production.local` or any pulled Vercel env file.
- After deployment, verify the alias and route health:

```bash
vercel inspect <deployment-url> --scope maleks-projects-5ef1c03
curl -i -s -X POST https://tachi-back.vercel.app/api/mobile/subscription/cancel
```

- The unauthenticated mobile cancel check should return `401` with `{"error":{"code":"invalid_session"},"ok":false}`. That confirms the route is live without requiring a real mobile token.
