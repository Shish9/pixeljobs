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
