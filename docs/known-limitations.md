# Known limitations (end of Phase 5)

- **Domain:** `pixeljobs.co` serves a registrar parking page; ownership must be confirmed.
- **Email delivery:** custom SMTP is not configured in Supabase yet → real users won't receive confirmation or reset
  emails. Blocking for public launch.
- **Not built yet (Phase 7):** messaging, two-sided reviews and ratings, reports, moderation queues and staff actions
  (e.g. suspending a service or project — the database already reserves those statuses), legal/safety pages.
- **Project attachments** are not supported yet (need private storage with signed links and a malware-scanning
  decision). Clients describe work in text for now.
- **Search** uses Postgres `simple` full-text search over titles and descriptions; there is no ranking, fuzzy matching
  or Kurdish/Arabic stemming yet.
- **Account deletion:** a service with request history cannot be deleted (history is kept on purpose), so deleting a
  freelancer's account needs those requests removed first. A proper account-deletion flow is planned.
- **Ratings/response time** are not shown on cards because there is no review data yet — nothing is invented.
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

## Phase 7 (trust & safety)

- **Legal and safety pages are drafts** (`src/content/legal/*`), marked as such on every page. A lawyer licensed in Iraq / the Kurdistan Region must review them, and the Badini text needs a native reviewer, before launch.
- **No payments or escrow**: messages, terms and safety tips say so explicitly. Reviews are not tied to verified payments.
- **Messaging is polled** (page refresh every 10–30 s while the tab is visible), not real-time; there are no email or push notifications, and no attachments.
- **Moderators cannot read conversations by design.** They see only a copy of a message when someone reports it; unreported abuse in private threads is not visible to staff.
- **Reviews cannot be edited or deleted by their authors**; only staff can hide one. There is no appeal flow yet beyond contacting us.
- **No automated spam/abuse detection** beyond daily rate limits (300 messages, 20 reports per user per day).
- Staff roles are granted in the database (`user_roles`); there is no UI for that yet.
- Deleting an account with open requests/reviews is still blocked by existing foreign keys; test cleanup deletes them first.
