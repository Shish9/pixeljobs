# Database & migrations

Supabase project: `qguhqutloktoxbkgjhty` (eu-west-1). Migrations in `supabase/migrations` are named with the version
under which they were applied, so `supabase db push` / `supabase migration list` line up with the remote history.

| Migration | Purpose |
| --- | --- |
| `20261107141849_harden_legacy_jobs` | Removes the two `jobs` policies that let **anyone** insert/update jobs; revokes API write privileges; pins `search_path`; blocks RPC access to `rls_auto_enable()`. No data changed. |
| `20261107141935_foundation_accounts` | Enums, `private` schema helpers, `currencies` (IQD default, USD), `profiles`, `account_settings`, `user_roles`, triggers, RLS + column grants. |
| `20261107141942_storage_avatars` | Public `avatars` bucket (2 MB, jpeg/png/webp) with owner-folder write policies, no listing. |
| `20261107142252_policy_consolidation` | Merges SELECT policies (linter 0006), indexes `profiles.preferred_currency`, hides GraphQL from API roles. |
| `20261107212122_marketplace_core` | Profile details (skills, languages, availability, rate, website) + `profile_entries`; `portfolio_items`; `services` + `service_packages`; `service_requests`; `projects`; `proposals`; `saved_items`; public `media` bucket. Status-transition triggers, daily anti-spam limits, email-confirmation gates, full RLS. |
| `20261107205730_digit_style_and_quick_onboarding` | Adds `account_settings.digit_style` (`native` ١٢٣ / `latin` 123). Onboarding now completes once a marketplace mode is chosen; the username is optional and set later in Settings. |

Rollbacks live in `supabase/rollbacks/` (`*.down.sql`). `foundation_accounts.down.sql` destroys account data — only
with explicit approval.

## Model (Phase 5)

- `profiles` — 1:1 with `auth.users`, created by the `on_auth_user_created` trigger. Public fields only; email stays in
  `auth.users`. `is_freelancer` / `is_client` are marketplace *modes* (a user can have both). `onboarded_at` is set by
  trigger as soon as a mode is chosen; `username` is optional until the user sets it in Settings. `account_status` (active/suspended/deactivated) is staff-controlled.
- `account_settings` — private per-user preferences (`marketing_emails`, `digit_style`).
- `user_roles` — staff roles only (`admin`, `moderator`).
- `currencies` — amounts elsewhere will be **integers in minor units + ISO code** (IQD has 0 minor units).
- `content_status` enum (draft → pending_review → published / rejected / suspended / archived) is created now for the
  listings added in Phase 6.
- `jobs` — legacy table (16 rows from an April 2026 Telegram import, all expired). Read-only in the app.

## Marketplace model (Phase 6)

| Table | Who can read | Who can write | Notes |
| --- | --- | --- | --- |
| `profile_entries` | wherever the profile is visible | owner | experience / education / certification |
| `portfolio_items` | published items of visible profiles; owner; staff | owner | `content_status`; staff-only statuses blocked by trigger |
| `services` | published services of visible profiles; owner; staff | freelancers (insert), owner | publishing needs ≥1 package, a 50-char description and a confirmed email; max 10 new/day |
| `service_packages` | with their service | service owner | tiers `basic`/`standard`/`premium`; prices in minor units + currency |
| `service_requests` | the two parties; staff | clients insert `service_id, tier, message` only; parties update `status` | price/delivery snapshotted from the package by trigger; transitions: freelancer pending→accepted/declined, accepted→completed; client pending/accepted→cancelled; max 20/day |
| `projects` | listed (open…completed, not suspended, active client, public or members-only); owner; staff | clients | lifecycle trigger (draft→open→in_review⇄open→closed/cancelled; assigned only via an accepted proposal; assigned→in_progress→completed); confirmed email to open; max 10/day |
| `proposals` | the freelancer and the project's client; staff | freelancers insert; parties update `status` | one per freelancer per project; only own published portfolio items may be attached; accepting assigns the project; max 30/day |
| `saved_items` | owner | owner | services, projects, freelancers |

Trigger errors surface as short codes (`email_not_confirmed`, `service_needs_package`, `rate_limited`,
`transition_not_allowed`, …) and are mapped to translated messages in `src/lib/db-errors.ts`.

## Regenerating types

```bash
npx supabase gen types typescript --project-id qguhqutloktoxbkgjhty > src/lib/database.types.ts
```

## Phase 7 tables (migrations `20261107215949_trust_and_safety`, `20261107220207_trust_and_safety_clock`)

`conversations` (one per request or proposal, created by triggers), `messages` (insert `conversation_id, body` only), `conversation_reads`, `reviews` (+ views `review_stats`, `service_review_stats`), `reports` (with snapshot), `moderation_actions`, `private.hidden_message_bodies`. RPCs: `mark_conversation_read`, `unread_conversation_count`, `moderate`. Undo script: `supabase/rollbacks/20261107215949_trust_and_safety.down.sql` (destructive; backup first). Tests: `supabase/tests/rls_trust.sql`.
