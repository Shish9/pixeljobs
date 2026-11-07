# Architecture

```
src/
  proxy.ts                    Locale redirect, Supabase session refresh, optimistic route guards
  app/
    [lang]/                   Every page lives under a locale segment (en | ar | ckb | kmr)
      layout.tsx              <html lang dir>, fonts, header/footer
      (auth)/                 sign-in, sign-up, forgot-password, reset-password + server actions
      onboarding/ dashboard/ settings/ admin/ jobs/
      account-actions.ts      Server actions for onboarding/profile/preferences/privacy/avatar
    auth/callback|confirm/    Email link handlers (PKCE code / token-hash)
  components/ui               Design-system primitives (Button, Field, Alert, Card…)
  components/layout           Header, footer, language switcher, menus
  components/account          Client forms for onboarding + settings
  i18n/                       Locale registry, dictionaries, translate(), Intl formatting
  lib/                        auth (getViewer/require*), validation (zod), supabase clients, currency, jobs
supabase/
  migrations/                 SQL migrations (applied in order, file names = applied versions)
  rollbacks/                  Manual down-migrations (review before use)
  tests/rls_foundation.sql    RLS test suite (self-rolling-back)
tests/unit, tests/e2e         Vitest and Playwright suites
```

## Request flow

1. **`proxy.ts`** redirects paths without a locale (cookie → `Accept-Language` → `en`), refreshes the Supabase session
   cookie (`getClaims()`), and does *optimistic* redirects for protected (`/dashboard`, `/settings`, `/onboarding`,
   `/admin`) and guest-only pages.
2. **Server Components** call `getViewer()` (`supabase.auth.getUser()` + profile + roles, memoised per request) and the
   `requireViewer / requireOnboardedViewer / requireStaff` guards. The admin area returns 404 to non-staff.
3. **Server Actions** re-validate input with zod and re-check the session; all queries run with the user's JWT, so
   **Row Level Security and column grants are the final authority**. No service-role key exists in the app.
4. Errors returned from actions are **dictionary keys** (`errors.invalidCredentials`), translated in the UI.

## Design system

Tokens live in `src/app/globals.css` (`@theme`). Brand violet `#6C63FF` is kept from the original site for accents;
text/buttons use `brand-600/700` for WCAG AA contrast. Layout uses logical properties (`ms-`, `pe-`, `start-`,
`text-start`) so components mirror automatically in RTL; directional icons use `rtl:-scale-x-100`.
Fonts: Plus Jakarta Sans (Latin) + Vazirmatn (Arabic/Kurdish), via `next/font`.
