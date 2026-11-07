-- WARNING: destroys all profile, settings and staff-role data. Requires explicit approval.
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.user_roles;
drop table if exists public.account_settings;
drop table if exists public.profiles;
drop table if exists public.currencies;
drop function if exists private.handle_new_user();
drop function if exists private.profiles_before_update();
drop function if exists private.set_updated_at();
drop function if exists private.is_staff();
drop function if exists private.has_role(public.app_role);
drop type if exists public.content_status;
drop type if exists public.profile_visibility;
drop type if exists public.account_status;
drop type if exists public.locale_code;
drop type if exists public.app_role;
drop schema if exists private;
