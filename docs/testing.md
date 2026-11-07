# Testing

| Layer | Command | Covers |
| --- | --- | --- |
| Types | `npx next typegen && npm run typecheck` | strict TS, typed routes, dictionary completeness |
| Lint | `npm run lint` | Next + TS rules |
| Unit | `npm test` | locale matching, path localization, IQD/number/date formatting, dictionary parity, zod schemas, open-redirect guard, image magic-byte sniffing, HTML→text sanitizer, profile completion |
| E2E | `npm run test:e2e` | all 4 locales render with correct `lang`/`dir`, locale redirect, language switcher, protected-route redirects, bad auth-callback handling, localized server-side validation, wrong-password error from real Supabase, no horizontal overflow (desktop + Pixel 7), **axe WCAG 2.1 AA** on 6 pages |
| E2E (signed in) | `E2E_EMAIL=… E2E_PASSWORD=… npm run test:e2e -- tests/e2e/account.spec.ts --project=desktop` | sign-in → onboarding validation → dashboard mode tabs → profile save → avatar upload → spoofed-file rejection → privacy → guest-page bounce → admin 404 (or admin view with `E2E_EXPECT_ADMIN=1`) → sign-out |
| RLS | paste `supabase/tests/rls_foundation.sql` into the SQL editor | 36 checks as anon, client, private user, new user, moderator, admin. Always ends with `RLS_TESTS_PASSED (36 checks)` and rolls everything back. |

Sandboxes without Playwright's pinned browser: `PW_CHROMIUM_PATH=/path/to/chrome npm run test:e2e`.

The signed-in suite needs a **confirmed, not-yet-onboarded** account. Create one in a dev/staging project (Auth →
Users → Add user, "Auto confirm"), run the suite, then delete the user. Do not keep test accounts in production.
