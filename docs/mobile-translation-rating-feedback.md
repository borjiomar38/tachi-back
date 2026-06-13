# Mobile Translation Rating Feedback

The backend/backoffice implementation is in this repo. The mobile app source was
not present on this VPS, so the mobile client work remains blocked here.
Database migration generation is also blocked in this checkout because
`DATABASE_URL` is not set. Run
`pnpm prisma migrate dev --name add_translation_rating_feedback` in an
environment with database access; do not hand-write the migration.

## VPS paths checked

- `/home`
- `/opt`
- `/srv`
- `/var/www`

Searched for `package.json`, Expo/React Native manifests (`app.json`,
`app.config.*`, `eas.json`, `metro.config.*`), and Flutter manifests
(`pubspec.yaml`). No mobile app repository was found.

## Backend endpoint

Mobile clients can submit feedback with:

```http
POST /api/mobile/translation-rating-feedback
Authorization: Bearer <mobile access token>
Content-Type: application/json
```

Required fields:

- `rating`: integer from `1` to `5`
- `targetLanguage`: translated language code
- one stable chapter signal: `chapterCacheKey`, `chapterIdentity`,
  `translationCacheKey`, or `translationJobId`

Optional fields:

- `comment`: max 1000 characters
- `chapterIdentity`: existing chapter identity shape
- `sourceLanguage`, `translationCacheKey`, `translationJobId`,
  `providerSignature`
- `clientSessionId`, `readDurationMs`, `pageCount`

The server deduplicates by license, device, chapter fingerprint, and target
language, and returns `duplicate: true` for repeated submissions.

## Required mobile implementation

- Hook the reader/chapter exit path for hardware back and app back controls.
- Do not block navigation: start exit immediately after submit, skip, or dismiss.
- Show the prompt only after meaningful translated reading. Suggested
  conservative threshold: at least 60 seconds in the translated reader or at
  least 40 percent of translated pages viewed, whichever is reached first.
- Persist local state per chapter/target language for submitted and dismissed
  prompts.
- Persist a do-not-show-again preference using the app's existing local
  settings/account storage pattern.
- Add a session cooldown, for example at least 30 minutes between prompts, so
  leaving multiple chapters does not ask repeatedly.
- Use localized copy if the app has i18n, with short English fallback:
  "How was this translation?", "Tell us what felt off", "Submit", "Skip",
  "Don't ask again".
- Use a native bottom sheet/dialog with a 1-5 star selector, optional textarea,
  submit, skip, and do-not-show-again checkbox/toggle.
- On offline/server failure, store a pending submission if the app already has an
  outbox pattern; otherwise dismiss cleanly and avoid re-prompting for that exit.
