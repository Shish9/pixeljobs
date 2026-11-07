# Known limitations (end of Phase 5)

- **Domain:** `pixeljobs.co` serves a registrar parking page; ownership must be confirmed.
- **Email delivery:** custom SMTP is not configured in Supabase yet → real users won't receive confirmation or reset
  emails. Blocking for public launch.
- **Marketplace features** (services, projects, proposals, messaging, reviews, reports, moderation actions) are not
  built yet; the dashboard's "Coming next" list says so explicitly.
- **Search** currently searches the read-only job board and says plainly that freelancer services open in the next
  update. It will search services and projects once Phase 6 lands.
- **Not yet built from the UX review:** guided request form and trust details on service pages (need Phase 6),
  phone-number sign-in (needs an SMS provider — a cost decision), WhatsApp/SMS notifications, real photography.
- **No payments.** Nothing in the app processes money or implies escrow/guarantees.
- **Badini translation** needs native review; Badini dates/numbers use Sorani ICU data.
- **Abuse controls** rely on Supabase Auth rate limits; there is no CAPTCHA yet (planned before opening sign-ups widely).
- **Change password** uses the current session (no current-password prompt) unless Supabase "Secure password change"
  is enabled.
- **Legacy job board:** all 16 imported jobs expired in May 2026, so the board shows an empty state. The Telegram/Tally
  ingestion is not in this repo; if revived it must write with the service role (anon writes are now blocked).
- Pages render dynamically (the header reads the session). Caching/static shells are a Phase 8 optimisation.
- No Content-Security-Policy header yet; no dark mode.
- The old `pixeljobs-site` repo is untouched and still references the old `/api/send/*` email routes, which are open
  relays — do not redeploy it as-is.
