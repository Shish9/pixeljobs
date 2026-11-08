# Roles & permissions

| Actor | How identified | Can |
| --- | --- | --- |
| Visitor | no session (`anon`) | Read public, active, onboarded profiles; read currencies; read active jobs. Nothing else. |
| Member | signed in (`authenticated`) | Everything a visitor can + read/update **own** profile (allowed columns only) and own settings; manage files in `avatars/<own id>/`. |
| Freelancer | `profiles.is_freelancer` | Edit freelancer details and portfolio; create/publish services and packages (confirmed email); accept/decline/complete incoming requests; send and withdraw proposals on open projects. |
| Client | `profiles.is_client` | Request service packages (confirmed email); cancel own requests; create/publish/pause/close/cancel projects; shortlist, accept, decline and archive proposals on own projects. |
| Everyone signed in | — | Save services, projects and freelancers privately. Both modes can be active on one account; you can never request your own service or propose on your own project. |
| Moderator | `user_roles.role = 'moderator'` | Read all profiles (incl. private / suspended); access `/admin`. Cannot grant roles or edit users directly. |
| Admin | `user_roles.role = 'admin'` | Moderator rights + grant/revoke roles of *other* users (cannot remove own admin role). |

Enforcement layers: proxy (optimistic redirect) → server guards (`requireViewer`, `requireStaff`) → zod validation →
**RLS policies + column-level GRANTs** (authoritative). Users cannot change `id`, `account_status`, `onboarded_at` or
timestamps, cannot self-grant roles, and cannot read other users' settings.

## Bootstrapping the first admin

After the owner signs up and onboards, run in the Supabase SQL editor:

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'owner@example.com';
```

## Phase 7 additions

| Data | Visitor | Client / Freelancer | Moderator | Admin |
| --- | --- | --- | --- | --- |
| Conversations + messages | none | only the two participants | **none** | **none** |
| Reviews | published and past `visible_at` | also their own pending reviews; write once per completed engagement | read all, hide/restore via `moderate()` | same |
| Reports | none | file reports, read their own | read all, resolve via `moderate()` | same |
| Moderation log | none | none | read | read |
| Suspend/reinstate users | no | no | members only (not staff) | members and moderators; never self or admins |

All moderation goes through `public.moderate()` (security definer, staff-only, logs every call). Hidden message text is kept in `private.hidden_message_bodies`, unreachable by API roles, so a decision can be reversed.
