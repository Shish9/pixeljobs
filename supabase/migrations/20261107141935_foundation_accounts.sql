-- Foundation: currencies, profiles, private account settings, staff roles, helpers and triggers.
-- Additive only. RLS is enabled on every table; API roles get the minimum privileges they need.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('admin', 'moderator');
create type public.locale_code as enum ('en', 'ar', 'ckb', 'kmr');
create type public.account_status as enum ('active', 'suspended', 'deactivated');
create type public.profile_visibility as enum ('public', 'private');
-- Shared lifecycle for user-generated listings (services, projects, portfolio items) in later phases.
create type public.content_status as enum ('draft', 'pending_review', 'published', 'rejected', 'suspended', 'archived');

-- Security-definer helpers live in a schema that is NOT exposed through the Data API.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Currencies (reference data). Amounts elsewhere are integers in minor units + currency code.
-- ---------------------------------------------------------------------------
create table public.currencies (
  code char(3) primary key check (code ~ '^[A-Z]{3}$'),
  minor_units smallint not null check (minor_units between 0 and 4),
  is_active boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index currencies_single_default on public.currencies (is_default) where is_default;

insert into public.currencies (code, minor_units, is_active, is_default) values
  ('IQD', 0, true, true),
  ('USD', 2, true, false);

alter table public.currencies enable row level security;
revoke all on table public.currencies from anon, authenticated;
grant select on table public.currencies to anon, authenticated;
create policy "Currencies are readable by everyone"
  on public.currencies for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Profiles: one row per auth user. Public-facing data only (email stays in auth.users).
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique
    check (username ~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$')
    check (username <> all (array[
      'admin', 'administrator', 'moderator', 'staff', 'support', 'help', 'root', 'system',
      'pixeljobs', 'api', 'auth', 'settings', 'dashboard', 'onboarding', 'jobs', 'services',
      'projects', 'messages', 'null', 'undefined'
    ])),
  display_name text not null default '' check (char_length(display_name) <= 80),
  headline text check (char_length(headline) <= 120),
  bio text check (char_length(bio) <= 2000),
  avatar_path text check (char_length(avatar_path) <= 300),
  city text check (char_length(city) <= 60),
  country_code char(2) not null default 'IQ' check (country_code ~ '^[A-Z]{2}$'),
  preferred_locale public.locale_code not null default 'en',
  preferred_currency char(3) not null default 'IQD' references public.currencies (code),
  is_freelancer boolean not null default false,
  is_client boolean not null default false,
  visibility public.profile_visibility not null default 'public',
  account_status public.account_status not null default 'active',
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.profiles is 'Public profile per user. Users act as freelancer, client or both.';
create index profiles_created_at_idx on public.profiles (created_at desc);

-- Private per-user settings, never visible to other users.
create table public.account_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  marketing_emails boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Staff roles. Marketplace modes (freelancer/client) are profile flags, not roles.
create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);
create index user_roles_granted_by_idx on public.user_roles (granted_by);

-- ---------------------------------------------------------------------------
-- Helper functions (used inside RLS policies)
-- ---------------------------------------------------------------------------
create function private.has_role(_role public.app_role)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role = _role
  );
$$;

create function private.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid()) and ur.role in ('admin', 'moderator')
  );
$$;

revoke all on function private.has_role(public.app_role) from public;
revoke all on function private.is_staff() from public;
grant execute on function private.has_role(public.app_role) to anon, authenticated;
grant execute on function private.is_staff() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create function private.set_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Marks onboarding complete once a username and at least one marketplace mode are set.
create function private.profiles_before_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.onboarded_at is null and new.username is not null and (new.is_freelancer or new.is_client) then
    new.onboarded_at := now();
  end if;
  return new;
end;
$$;

-- Creates the profile + settings rows for every new auth user.
create function private.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  _locale public.locale_code := 'en';
  _requested text := new.raw_user_meta_data ->> 'preferred_locale';
begin
  if _requested in ('en', 'ar', 'ckb', 'kmr') then
    _locale := _requested::public.locale_code;
  end if;

  insert into public.profiles (id, display_name, preferred_locale)
  values (
    new.id,
    left(coalesce(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 80),
    _locale
  );
  insert into public.account_settings (user_id) values (new.id);
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger profiles_before_update
  before update on public.profiles
  for each row execute function private.profiles_before_update();

create trigger account_settings_set_updated_at
  before update on public.account_settings
  for each row execute function private.set_updated_at();

-- ---------------------------------------------------------------------------
-- Privileges + RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.account_settings enable row level security;
alter table public.user_roles enable row level security;

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.account_settings from anon, authenticated;
revoke all on table public.user_roles from anon, authenticated;

grant select on table public.profiles to anon, authenticated;
-- Column-level: users cannot change id, account_status, onboarded_at or timestamps.
grant update (
  username, display_name, headline, bio, avatar_path, city, country_code,
  preferred_locale, preferred_currency, is_freelancer, is_client, visibility
) on table public.profiles to authenticated;

grant select on table public.account_settings to authenticated;
grant update (marketing_emails) on table public.account_settings to authenticated;

grant select, insert, delete on table public.user_roles to authenticated;

-- profiles
create policy "Public profiles are visible to everyone"
  on public.profiles for select to anon, authenticated
  using (visibility = 'public' and account_status = 'active' and onboarded_at is not null);

create policy "Users can view their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Staff can view all profiles"
  on public.profiles for select to authenticated
  using ((select private.is_staff()));

create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- account_settings
create policy "Users can view their own settings"
  on public.account_settings for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can update their own settings"
  on public.account_settings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- user_roles
create policy "Users can view their own roles"
  on public.user_roles for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Admins can view all roles"
  on public.user_roles for select to authenticated
  using ((select private.has_role('admin')));

create policy "Admins can grant roles"
  on public.user_roles for insert to authenticated
  with check ((select private.has_role('admin')) and granted_by = (select auth.uid()));

create policy "Admins can revoke other users' roles"
  on public.user_roles for delete to authenticated
  using ((select private.has_role('admin')) and user_id <> (select auth.uid()));
