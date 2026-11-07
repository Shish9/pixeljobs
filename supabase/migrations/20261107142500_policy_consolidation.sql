-- Performance/linter tidy-up. Same access semantics as before (verified by supabase/tests/rls_foundation.sql).

-- Lint 0006: merge multiple permissive SELECT policies into one per table.
drop policy "Public profiles are visible to everyone" on public.profiles;
drop policy "Users can view their own profile" on public.profiles;
drop policy "Staff can view all profiles" on public.profiles;
create policy "Profiles are visible when public, own, or to staff"
  on public.profiles for select to anon, authenticated
  using (
    (visibility = 'public' and account_status = 'active' and onboarded_at is not null)
    or id = (select auth.uid())
    or (select private.is_staff())
  );

drop policy "Users can view their own roles" on public.user_roles;
drop policy "Admins can view all roles" on public.user_roles;
create policy "Roles are visible to their owner and to admins"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_role('admin')));

-- Lint 0001: cover the currency foreign key.
create index profiles_preferred_currency_idx on public.profiles (preferred_currency);

-- Lints 0026/0027: the app uses the REST API only. Hide the GraphQL endpoint from API roles.
-- Reversible with: grant usage on schema graphql to anon, authenticated;
revoke usage on schema graphql from anon, authenticated;
