grant usage on schema graphql to anon, authenticated;
drop index if exists public.profiles_preferred_currency_idx;
drop policy "Roles are visible to their owner and to admins" on public.user_roles;
create policy "Users can view their own roles" on public.user_roles for select to authenticated using (user_id = (select auth.uid()));
create policy "Admins can view all roles" on public.user_roles for select to authenticated using ((select private.has_role('admin')));
drop policy "Profiles are visible when public, own, or to staff" on public.profiles;
create policy "Public profiles are visible to everyone" on public.profiles for select to anon, authenticated
  using (visibility = 'public' and account_status = 'active' and onboarded_at is not null);
create policy "Users can view their own profile" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "Staff can view all profiles" on public.profiles for select to authenticated using ((select private.is_staff()));
