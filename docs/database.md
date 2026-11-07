# Database & migrations

Supabase project: `qguhqutloktoxbkgjhty` (eu-west-1). Migrations in `supabase/migrations` are named with the version
under which they were applied, so `supabase db push` / `supabase migration list` line up with the remote history.

| Migration | Purpose |
| --- | --- |
| `20261107141849_harden_legacy_jobs` | Removes the two `jobs` policies that let **anyone** insert/update jobs; revokes API write privileges; pins `search_path`; blocks RPC access to `rls_auto_enable()`. No data changed. |
| `20261107141935_foundation_accounts` | Enums, `private` schema helpers, `currencies` (IQD default, USD), `profiles`, `account_settings`, `user_roles`, triggers, RLS + column grants. |
| `20261107141942_storage_avatars` | Public `avatars` bucket (2 MB, jpeg/png/webp) with owner-folder write policies, no listing. |
| `20261107142500_policy_consolidation` | Merges SELECT policies (linter 0006), indexes `profiles.preferred_currency`, hides GraphQL from API roles. |

Rollbacks live in `supabase/rollbacks/` (`*.down.sql`). `foundation_accounts.down.sql` destroys account data — only
with explicit approval.

## Model (Phase 5)

- `profiles` — 1:1 with `auth.users`, created by the `on_auth_user_created` trigger. Public fields only; email stays in
  `auth.users`. `is_freelancer` / `is_client` are marketplace *modes* (a user can have both). `onboarded_at` is set by
  trigger once a username and a mode exist. `account_status` (active/suspended/deactivated) is staff-controlled.
- `account_settings` — private per-user preferences.
- `user_roles` — staff roles only (`admin`, `moderator`).
- `currencies` — amounts elsewhere will be **integers in minor units + ISO code** (IQD has 0 minor units).
- `content_status` enum (draft → pending_review → published / rejected / suspended / archived) is created now for the
  listings added in Phase 6.
- `jobs` — legacy table (16 rows from an April 2026 Telegram import, all expired). Read-only in the app.

## Regenerating types

```bash
npx supabase gen types typescript --project-id qguhqutloktoxbkgjhty > src/lib/database.types.ts
```
