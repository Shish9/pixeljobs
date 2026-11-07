# Architecture

```
src/
  proxy.ts                    Locale redirect, Supabase session refresh, optimistic route guards
  app/
    [lang]/                   Every page lives under a locale segment (en | ar | ckb | kmr)
      layout.tsx              <html lang dir>, fonts, header/footer
      (auth)/                 sign-in, sign-up, forgot-password, reset-password + server actions
      onboarding/ settings/ admin/ jobs/ search/
      services/ services/[id]     Browse + detail (packages, FAQs, request form, save)
      projects/ projects/[id]     Browse + detail (proposal form)
      u/[username]                Public freelancer profile
      dashboard/                  Overview + profile, portfolio, services(/new,/[id]), requests, projects(/new,/[id]), proposals, saved
      account-actions.ts      Server actions for onboarding/profile/preferences/privacy/avatar
    auth/callback|confirm/    Email link handlers (PKCE code / token-hash)
  components/ui               Design-system primitives (Button, Field, Alert, Card…)
  components/layout           Header, footer, language menu, user menu, mobile bottom tab bar
  components/search           "I need … in [city]" search sentence + accessible CityPicker (combobox/listbox)
  components/account          Client forms for onboarding + settings
  i18n/                       Locale registry, dictionaries, translate(), Intl formatting
  lib/                        auth (getViewer/require*), validation (zod), supabase clients, currency, jobs
  lib/market.ts               Marketplace reads — batched related queries (no per-row N+1), RLS-scoped
  lib/actions/market.ts       Marketplace server actions; echo submitted values so forms never lose input
  lib/taxonomy.ts             Categories, languages, tiers, timelines, status transitions (mirror DB triggers)
  components/market           Cards, rows, status badges, save/status buttons, dashboard shell, client forms
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

## Design system ("second look", approved in design review)

Tokens live in `src/app/globals.css` (`@theme`):
- **Colour:** warm paper `#FBF9F4`, ink `#161512`, Zagros green `#1F4D3F` (`brand-*`) for actions and links,
  saffron `#E5A230` (`accent-*`) only for prices and highlight underlines. Focus outlines are ink (≥ 3:1).
- **Shape:** thin ink rules and ruled lists instead of rounded cards; corners 2–8px.
- **Type:** one scale (`text-display`, `text-h1`, `text-h2`, Tailwind defaults below that); Plus Jakarta Sans for
  Latin, Noto Naskh Arabic for Arabic/Kurdish with a larger RTL root size.
- **States:** every button has hover, pressed (1px nudge), focus-visible, disabled and loading states.
- **Navigation:** desktop header links; on phones a bottom tab bar (Home, Search, Jobs, Dashboard/Sign in) and a
  globe-only language button.
Layout uses logical properties (`ms-`, `pe-`, `start-`, `text-start`) so components mirror in RTL; directional icons
use `rtl:-scale-x-100`. The home page shows no sample listings — real services and projects arrive in Phase 6.
