# Environment variables & deployment

## Variables

| Name | Where | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | `https://<ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client + server | `sb_publishable_…` (or legacy anon key in `NEXT_PUBLIC_SUPABASE_ANON_KEY`) |
| `NEXT_PUBLIC_SITE_URL` | server | Canonical origin used in auth email links, e.g. `https://pixeljobs.co` |

There are **no secret keys** in the app. Never add the service-role/secret key to a `NEXT_PUBLIC_*` variable.
If an admin job ever needs it, use a server-only variable in a separate route with its own authorization.

## Supabase dashboard settings (required before launch)

Authentication → URL Configuration
- **Site URL**: the production origin (`NEXT_PUBLIC_SITE_URL`).
- **Redirect URLs**: `https://<prod>/auth/callback`, `https://<prod>/auth/confirm`, and the same for preview
  (`https://*-<team>.vercel.app/auth/callback`) and `http://localhost:3000/auth/callback`.

Authentication → Emails
- **Custom SMTP is required.** Supabase's built-in sender only delivers to project team members and is heavily
  rate-limited, so real users will not receive confirmation/reset emails without it. The old site used Brevo
  (`smtp-relay.brevo.com:587`) — configure it here (sender on a domain you control).
- Optional, recommended (works across devices): change the templates to the token-hash flow:
  - Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/en/onboarding`
  - Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/en/reset-password`
- Keep **Confirm email** enabled. Consider enabling **Secure password change** and leaked-password protection.
- Review Auth **rate limits** (sign-ups, OTP/email sends per hour) — they are the main brute-force/spam control today.

## Vercel

1. Point the Vercel project at `Shish9/pixeljobs` (root directory `/`, framework Next.js, Node 22).
2. Add the three variables above for Production and Preview.
3. Deploy. Security headers (HSTS, `X-Frame-Options: DENY`, `nosniff`, referrer and permissions policy) are set in
   `next.config.ts`. A Content-Security-Policy is planned (see roadmap).

## Domain

`pixeljobs.co` currently shows a registrar "recently registered" parking page. Confirm ownership before pointing it at
Vercel or configuring email on it. Until then, no `@pixeljobs.co` address is shown in the UI.
