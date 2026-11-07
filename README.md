# PixelJobs

A local-first freelance marketplace for Kurdistan and Iraq — fixed-price services, client projects and
proposals, in **English, Arabic, Sorani (ckb) and Badini (kmr)** with full right-to-left support.

> Status: **Phase 5 (foundation) complete + design refresh.** Accounts, quick onboarding, roles, settings (incl.
> digit style), localization, the "second look" design system, search with city picker, mobile tab bar, database
> security and the legacy job board are live. Services, projects, proposals, messaging, reviews and
> moderation tools arrive in Phases 6–7. PixelJobs does **not** process payments.

## Stack

Next.js 16 (App Router, `proxy.ts`) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Supabase (Auth, Postgres + RLS,
Storage) via `@supabase/ssr` · zod · Vitest · Playwright + axe.

## Quick start

```bash
cp .env.example .env.local   # fill in the public Supabase URL + publishable key
npm install
npm run dev                  # http://localhost:3000 → redirects to /en, /ar, /ckb or /kmr
```

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Develop / production build / serve |
| `npm run typecheck` | `tsc --noEmit` (run `npx next typegen` first on a fresh clone) |
| `npm run lint` | ESLint (Next core-web-vitals + TypeScript) |
| `npm test` | Vitest unit tests |
| `npm run test:e2e` | Playwright end-to-end + accessibility tests |

## Documentation

- [Architecture](docs/architecture.md)
- [Environment variables & Supabase setup](docs/deployment.md)
- [Database, migrations & RLS](docs/database.md)
- [Roles & permissions](docs/roles-and-permissions.md)
- [Localization & RTL](docs/localization.md)
- [Testing](docs/testing.md)
- [Known limitations](docs/known-limitations.md)
- [Payment-provider integration plan](docs/payments-plan.md)
- [Launch roadmap](docs/roadmap.md)
