-- Phase 6: marketplace core. Additive only.
-- Profiles (skills, languages, availability, rate, links, entries), portfolio, services + packages, service requests,
-- client projects, proposals, saved items, public media bucket. Every table has RLS; status changes are validated by
-- triggers that know WHO is changing WHAT; basic anti-spam daily limits are enforced in the database.

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create domain public.category_key as text
  check (value in ('design', 'development', 'writing', 'translation', 'marketing', 'video', 'business', 'engineering'));
create domain public.city_key as text
  check (value in ('erbil', 'sulaymaniyah', 'duhok', 'halabja', 'kirkuk', 'baghdad', 'basra', 'mosul', 'najaf', 'karbala', 'other'));
create domain public.lang_key as text check (value in ('ckb', 'kmr', 'ar', 'en', 'tr', 'fa'));

-- Every element non-empty and at most max_len characters.
create function private.text_array_ok(arr text[], max_len int)
returns boolean language sql immutable set search_path = ''
as $$ select coalesce(bool_and(char_length(btrim(x)) between 1 and max_len), true) from unnest(arr) as x $$;
grant execute on function private.text_array_ok(text[], int) to anon, authenticated;

create function private.email_confirmed()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from auth.users u where u.id = (select auth.uid()) and u.email_confirmed_at is not null) $$;
revoke all on function private.email_confirmed() from public;
grant execute on function private.email_confirmed() to authenticated;

-- Raises when the current user created `max_count` rows in `tbl` (owner column `col`) within 24 hours.
create function private.enforce_daily_limit(tbl regclass, col text, max_count int)
returns void language plpgsql security definer set search_path = ''
as $$
declare n int;
begin
  execute format('select count(*) from %s where %I = $1 and created_at > now() - interval ''24 hours''', tbl, col)
    into n using (select auth.uid());
  if n >= max_count then
    raise exception 'rate_limited' using errcode = 'P0001', hint = 'daily limit reached';
  end if;
end;
$$;
revoke all on function private.enforce_daily_limit(regclass, text, int) from public;
grant execute on function private.enforce_daily_limit(regclass, text, int) to authenticated;

-- Is this account active? (bypasses profile visibility: a client with a private profile can still list projects)
create function private.is_active_profile(uid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles p where p.id = uid and p.account_status = 'active') $$;
revoke all on function private.is_active_profile(uuid) from public;
grant execute on function private.is_active_profile(uuid) to anon, authenticated;

-- Users may move their content between draft / published / archived. Staff decisions (suspended, rejected,
-- pending_review) are made by staff only, and a suspended item cannot be re-published by its owner.
create function private.guard_content_status()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;
  if not (select private.is_staff()) then
    if new.status not in ('draft', 'published', 'archived') then
      raise exception 'status_not_allowed' using errcode = 'P0001';
    end if;
    if tg_op = 'UPDATE' and old.status in ('suspended', 'rejected') then
      raise exception 'status_locked' using errcode = 'P0001';
    end if;
    if new.status = 'published' and not (select private.email_confirmed()) then
      raise exception 'email_not_confirmed' using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Profile details
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column skills text[] not null default '{}'
    check (cardinality(skills) <= 15 and private.text_array_ok(skills, 40)),
  add column languages public.lang_key[] not null default '{}' check (cardinality(languages) <= 6),
  add column availability text not null default 'available' check (availability in ('available', 'busy', 'unavailable')),
  add column rate_minor bigint check (rate_minor is null or rate_minor between 1 and 100000000000),
  add column rate_currency char(3) not null default 'IQD' references public.currencies (code),
  add column website_url text check (website_url is null or (website_url ~ '^https?://[^\s]+$' and char_length(website_url) <= 300));
grant update (skills, languages, availability, rate_minor, rate_currency, website_url) on table public.profiles to authenticated;
create index profiles_username_idx on public.profiles (username) where username is not null;
create index profiles_rate_currency_idx on public.profiles (rate_currency);

create table public.profile_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('experience', 'education', 'certification')),
  title text not null check (char_length(title) between 2 and 120),
  organization text check (char_length(organization) <= 120),
  start_year smallint check (start_year between 1950 and 2100),
  end_year smallint check (end_year between 1950 and 2100),
  description text check (char_length(description) <= 1000),
  created_at timestamptz not null default now(),
  check (end_year is null or start_year is null or end_year >= start_year)
);
create index profile_entries_user_idx on public.profile_entries (user_id, kind);

-- ---------------------------------------------------------------------------
-- Portfolio
-- ---------------------------------------------------------------------------
create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  description text check (char_length(description) <= 2000),
  image_path text check (char_length(image_path) <= 300),
  link_url text check (link_url is null or (link_url ~ '^https?://[^\s]+$' and char_length(link_url) <= 300)),
  skills text[] not null default '{}' check (cardinality(skills) <= 10 and private.text_array_ok(skills, 40)),
  outcome text check (char_length(outcome) <= 300),
  status public.content_status not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index portfolio_items_owner_idx on public.portfolio_items (owner_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Services + packages
-- ---------------------------------------------------------------------------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 10 and 100),
  category public.category_key not null,
  description text not null default '' check (char_length(description) <= 5000),
  requirements text check (char_length(requirements) <= 2000),
  cover_path text check (char_length(cover_path) <= 300),
  city public.city_key,
  languages public.lang_key[] not null default '{}' check (cardinality(languages) <= 6),
  faqs jsonb not null default '[]' check (jsonb_typeof(faqs) = 'array' and jsonb_array_length(faqs) <= 10 and octet_length(faqs::text) <= 12000),
  status public.content_status not null default 'draft',
  published_at timestamptz,
  search tsvector generated always as (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index services_public_idx on public.services (status, published_at desc);
create index services_owner_idx on public.services (owner_id);
create index services_category_idx on public.services (category);
create index services_search_idx on public.services using gin (search);

create table public.service_packages (
  service_id uuid not null references public.services (id) on delete cascade,
  tier text not null check (tier in ('basic', 'standard', 'premium')),
  title text not null check (char_length(title) between 2 and 60),
  description text check (char_length(description) <= 500),
  price_minor bigint not null check (price_minor between 1 and 100000000000),
  currency char(3) not null default 'IQD' references public.currencies (code),
  delivery_days smallint not null check (delivery_days between 1 and 120),
  revisions smallint not null default 1 check (revisions between 0 and 20),
  deliverables text[] not null default '{}' check (cardinality(deliverables) <= 10 and private.text_array_ok(deliverables, 120)),
  primary key (service_id, tier)
);
create index service_packages_currency_idx on public.service_packages (currency);

-- Publishing a service needs a confirmed email (guard_content_status), at least one package and a real description.
create function private.services_before_write()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if not exists (select 1 from public.service_packages p where p.service_id = new.id) then
      raise exception 'service_needs_package' using errcode = 'P0001';
    end if;
    if char_length(new.description) < 50 then
      raise exception 'service_needs_description' using errcode = 'P0001';
    end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  if tg_op = 'INSERT' then
    perform private.enforce_daily_limit('public.services', 'owner_id', 10);
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Service requests (client asks a freelancer for a package)
-- ---------------------------------------------------------------------------
create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete restrict,
  tier text not null check (tier in ('basic', 'standard', 'premium')),
  client_id uuid not null references public.profiles (id) on delete cascade,
  freelancer_id uuid not null references public.profiles (id) on delete cascade,
  price_minor bigint not null,
  currency char(3) not null references public.currencies (code),
  delivery_days smallint not null,
  message text not null check (char_length(message) between 20 and 2000),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index service_requests_client_idx on public.service_requests (client_id, created_at desc);
create index service_requests_freelancer_idx on public.service_requests (freelancer_id, created_at desc);
create index service_requests_service_idx on public.service_requests (service_id);
create index service_requests_currency_idx on public.service_requests (currency);

-- Fills the request from the published service/package (clients only send service, tier and message).
create function private.service_requests_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  svc record;
  pkg record;
begin
  new.client_id := (select auth.uid());
  new.status := 'pending';
  if not (select private.email_confirmed()) then raise exception 'email_not_confirmed' using errcode = 'P0001'; end if;
  select s.id, s.owner_id, s.status into svc from public.services s where s.id = new.service_id;
  if svc.id is null or svc.status <> 'published' then raise exception 'service_unavailable' using errcode = 'P0001'; end if;
  if svc.owner_id = new.client_id then raise exception 'own_service' using errcode = 'P0001'; end if;
  select p.price_minor, p.currency, p.delivery_days into pkg from public.service_packages p
    where p.service_id = new.service_id and p.tier = new.tier;
  if pkg.price_minor is null then raise exception 'package_unavailable' using errcode = 'P0001'; end if;
  perform private.enforce_daily_limit('public.service_requests', 'client_id', 20);
  new.freelancer_id := svc.owner_id;
  new.price_minor := pkg.price_minor;
  new.currency := pkg.currency;
  new.delivery_days := pkg.delivery_days;
  return new;
end;
$$;

-- Freelancer: pending → accepted | declined; accepted → completed. Client: pending | accepted → cancelled.
create function private.service_requests_before_update()
returns trigger language plpgsql set search_path = ''
as $$
declare me uuid := (select auth.uid());
begin
  new.updated_at := now();
  if new.status = old.status then return new; end if;
  if me = old.freelancer_id and (
       (old.status = 'pending' and new.status in ('accepted', 'declined'))
    or (old.status = 'accepted' and new.status = 'completed')) then
    return new;
  end if;
  if me = old.client_id and old.status in ('pending', 'accepted') and new.status = 'cancelled' then
    return new;
  end if;
  raise exception 'transition_not_allowed' using errcode = 'P0001';
end;
$$;

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 10 and 120),
  description text not null check (char_length(description) between 30 and 5000),
  category public.category_key not null,
  skills text[] not null default '{}' check (cardinality(skills) <= 10 and private.text_array_ok(skills, 40)),
  budget_type text not null default 'fixed' check (budget_type in ('fixed', 'hourly')),
  budget_min_minor bigint check (budget_min_minor is null or budget_min_minor between 1 and 100000000000),
  budget_max_minor bigint check (budget_max_minor is null or budget_max_minor between 1 and 100000000000),
  currency char(3) not null default 'IQD' references public.currencies (code),
  timeline text not null default '1_4w' check (timeline in ('lt_1w', '1_4w', '1_3m', 'gt_3m')),
  experience_level text not null default 'intermediate' check (experience_level in ('entry', 'intermediate', 'expert')),
  city public.city_key,
  visibility text not null default 'public' check (visibility in ('public', 'members')),
  status text not null default 'draft'
    check (status in ('draft', 'open', 'in_review', 'assigned', 'in_progress', 'completed', 'cancelled', 'closed')),
  moderation text not null default 'ok' check (moderation in ('ok', 'suspended')),
  published_at timestamptz,
  search tsvector generated always as (to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (budget_max_minor is null or budget_min_minor is null or budget_max_minor >= budget_min_minor)
);
create index projects_public_idx on public.projects (status, published_at desc);
create index projects_client_idx on public.projects (client_id, created_at desc);
create index projects_search_idx on public.projects using gin (search);
create index projects_currency_idx on public.projects (currency);

-- Client-controlled lifecycle; 'assigned' is only reached by accepting a proposal.
create function private.projects_before_write()
returns trigger language plpgsql set search_path = ''
as $$
declare ok boolean := false;
begin
  new.updated_at := now();
  if tg_op = 'INSERT' then
    perform private.enforce_daily_limit('public.projects', 'client_id', 10);
    if new.status not in ('draft', 'open') then raise exception 'transition_not_allowed' using errcode = 'P0001'; end if;
  elsif new.status is distinct from old.status and coalesce(current_setting('pixeljobs.system_update', true), '') <> 'on' then
    ok := case old.status
      when 'draft'       then new.status in ('open', 'cancelled')
      when 'open'        then new.status in ('in_review', 'closed', 'cancelled')
      when 'in_review'   then new.status in ('open', 'closed', 'cancelled')
      when 'assigned'    then new.status in ('in_progress', 'completed', 'cancelled')
      when 'in_progress' then new.status in ('completed', 'cancelled')
      else false
    end;
    if not ok then raise exception 'transition_not_allowed' using errcode = 'P0001'; end if;
  end if;
  if new.status = 'open' and (tg_op = 'INSERT' or old.status is distinct from 'open') then
    if not (select private.email_confirmed()) then raise exception 'email_not_confirmed' using errcode = 'P0001'; end if;
    new.published_at := coalesce(new.published_at, now());
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Proposals
-- ---------------------------------------------------------------------------
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  freelancer_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  cover_letter text not null check (char_length(cover_letter) between 50 and 5000),
  bid_minor bigint not null check (bid_minor between 1 and 100000000000),
  currency char(3) not null default 'IQD' references public.currencies (code),
  timeline_days smallint not null check (timeline_days between 1 and 365),
  portfolio_item_ids uuid[] not null default '{}' check (cardinality(portfolio_item_ids) <= 5),
  answers text check (char_length(answers) <= 2000),
  status text not null default 'submitted'
    check (status in ('submitted', 'shortlisted', 'accepted', 'rejected', 'withdrawn', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, freelancer_id)
);
create index proposals_freelancer_idx on public.proposals (freelancer_id, created_at desc);
create index proposals_client_idx on public.proposals (client_id);
create index proposals_currency_idx on public.proposals (currency);

create function private.proposals_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare prj record;
begin
  new.freelancer_id := (select auth.uid());
  new.status := 'submitted';
  if not (select private.email_confirmed()) then raise exception 'email_not_confirmed' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.profiles p where p.id = new.freelancer_id and p.is_freelancer and p.account_status = 'active') then
    raise exception 'not_freelancer' using errcode = 'P0001';
  end if;
  select pr.id, pr.client_id, pr.status, pr.moderation, pr.currency into prj from public.projects pr where pr.id = new.project_id;
  if prj.id is null or prj.status <> 'open' or prj.moderation <> 'ok' then raise exception 'project_not_open' using errcode = 'P0001'; end if;
  if prj.client_id = new.freelancer_id then raise exception 'own_project' using errcode = 'P0001'; end if;
  -- Only the freelancer's own published portfolio items may be attached.
  if exists (
    select 1 from unnest(new.portfolio_item_ids) as pid
    where not exists (select 1 from public.portfolio_items pi where pi.id = pid and pi.owner_id = new.freelancer_id and pi.status = 'published')
  ) then
    raise exception 'invalid_portfolio' using errcode = 'P0001';
  end if;
  perform private.enforce_daily_limit('public.proposals', 'freelancer_id', 30);
  new.client_id := prj.client_id;
  new.currency := prj.currency;
  return new;
end;
$$;

-- Freelancer: submitted | shortlisted → withdrawn.
-- Client: submitted → shortlisted | rejected | archived; shortlisted → accepted | rejected | archived | submitted;
--         rejected → archived. Accepting assigns the project.
create function private.proposals_before_update()
returns trigger language plpgsql set search_path = ''
as $$
declare me uuid := (select auth.uid());
begin
  new.updated_at := now();
  if new.status = old.status then return new; end if;
  if me = old.freelancer_id and old.status in ('submitted', 'shortlisted') and new.status = 'withdrawn' then
    return new;
  end if;
  if me = old.client_id and (
       (old.status = 'submitted' and new.status in ('shortlisted', 'rejected', 'archived', 'accepted'))
    or (old.status = 'shortlisted' and new.status in ('accepted', 'rejected', 'archived', 'submitted'))
    or (old.status = 'rejected' and new.status = 'archived')) then
    return new;
  end if;
  raise exception 'transition_not_allowed' using errcode = 'P0001';
end;
$$;

create function private.proposals_after_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    if not exists (select 1 from public.projects p where p.id = new.project_id and p.status in ('open', 'in_review')) then
      raise exception 'project_not_open' using errcode = 'P0001';
    end if;
    perform set_config('pixeljobs.system_update', 'on', true);
    update public.projects set status = 'assigned' where id = new.project_id;
    perform set_config('pixeljobs.system_update', 'off', true);
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- Saved items
-- ---------------------------------------------------------------------------
create table public.saved_items (
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  item_type text not null check (item_type in ('service', 'freelancer', 'project')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, item_type, item_id)
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------
create trigger portfolio_items_status before insert or update on public.portfolio_items
  for each row execute function private.guard_content_status();
create trigger portfolio_items_updated before update on public.portfolio_items
  for each row execute function private.set_updated_at();
create trigger services_status before insert or update on public.services
  for each row execute function private.guard_content_status();
create trigger services_write before insert or update on public.services
  for each row execute function private.services_before_write();
create trigger service_requests_insert before insert on public.service_requests
  for each row execute function private.service_requests_before_insert();
create trigger service_requests_update before update on public.service_requests
  for each row execute function private.service_requests_before_update();
create trigger projects_write before insert or update on public.projects
  for each row execute function private.projects_before_write();
create trigger proposals_insert before insert on public.proposals
  for each row execute function private.proposals_before_insert();
create trigger proposals_update before update on public.proposals
  for each row execute function private.proposals_before_update();
create trigger proposals_after_update after update on public.proposals
  for each row execute function private.proposals_after_update();

revoke all on function private.service_requests_before_insert() from public, anon, authenticated;
revoke all on function private.proposals_before_insert() from public, anon, authenticated;
revoke all on function private.proposals_after_update() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Privileges + RLS
-- ---------------------------------------------------------------------------
alter table public.profile_entries enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.services enable row level security;
alter table public.service_packages enable row level security;
alter table public.service_requests enable row level security;
alter table public.projects enable row level security;
alter table public.proposals enable row level security;
alter table public.saved_items enable row level security;

revoke all on table public.profile_entries, public.portfolio_items, public.services, public.service_packages,
  public.service_requests, public.projects, public.proposals, public.saved_items from anon, authenticated;

grant select on table public.profile_entries, public.portfolio_items, public.services, public.service_packages,
  public.projects to anon, authenticated;
grant insert, update, delete on table public.profile_entries, public.portfolio_items, public.service_packages to authenticated;
grant insert (title, category, description, requirements, cover_path, city, languages, faqs, status) on table public.services to authenticated;
grant update (title, category, description, requirements, cover_path, city, languages, faqs, status) on table public.services to authenticated;
grant delete on table public.services to authenticated;
grant select on table public.service_requests to authenticated;
grant insert (service_id, tier, message) on table public.service_requests to authenticated;
grant update (status) on table public.service_requests to authenticated;
grant insert (title, description, category, skills, budget_type, budget_min_minor, budget_max_minor, timeline,
  experience_level, city, visibility, status) on table public.projects to authenticated;
grant update (title, description, category, skills, budget_type, budget_min_minor, budget_max_minor, timeline,
  experience_level, city, visibility, status) on table public.projects to authenticated;
grant delete on table public.projects to authenticated;
grant select on table public.proposals to authenticated;
grant insert (project_id, cover_letter, bid_minor, timeline_days, portfolio_item_ids, answers) on table public.proposals to authenticated;
grant update (status) on table public.proposals to authenticated;
grant select, delete on table public.saved_items to authenticated;
grant insert (item_type, item_id) on table public.saved_items to authenticated;

-- profile_entries: visible wherever the profile is visible (profiles RLS applies inside the subquery)
create policy "Entries follow profile visibility" on public.profile_entries for select to anon, authenticated
  using (exists (select 1 from public.profiles p where p.id = user_id));
create policy "Owners manage their entries" on public.profile_entries for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- portfolio_items
create policy "Published portfolio of visible profiles, or own, or staff" on public.portfolio_items for select to anon, authenticated
  using (
    (status = 'published' and exists (select 1 from public.profiles p where p.id = owner_id))
    or owner_id = (select auth.uid())
    or (select private.is_staff())
  );
create policy "Owners insert portfolio" on public.portfolio_items for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "Owners update portfolio" on public.portfolio_items for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners delete portfolio" on public.portfolio_items for delete to authenticated
  using (owner_id = (select auth.uid()));

-- services
create policy "Published services of visible profiles, or own, or staff" on public.services for select to anon, authenticated
  using (
    (status = 'published' and exists (select 1 from public.profiles p where p.id = owner_id))
    or owner_id = (select auth.uid())
    or (select private.is_staff())
  );
create policy "Freelancers create services" on public.services for insert to authenticated
  with check (owner_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_freelancer and p.account_status = 'active'));
create policy "Owners update services" on public.services for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "Owners delete draft services" on public.services for delete to authenticated
  using (owner_id = (select auth.uid()) and status = 'draft');

-- service_packages: visible with their service; managed by the service owner
create policy "Packages follow service visibility" on public.service_packages for select to anon, authenticated
  using (exists (select 1 from public.services s where s.id = service_id));
create policy "Owners manage packages" on public.service_packages for all to authenticated
  using (exists (select 1 from public.services s where s.id = service_id and s.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.services s where s.id = service_id and s.owner_id = (select auth.uid())));

-- service_requests: only the two parties (and staff)
create policy "Parties see requests" on public.service_requests for select to authenticated
  using (client_id = (select auth.uid()) or freelancer_id = (select auth.uid()) or (select private.is_staff()));
create policy "Clients create requests" on public.service_requests for insert to authenticated
  with check (client_id = (select auth.uid()));
create policy "Parties update requests" on public.service_requests for update to authenticated
  using (client_id = (select auth.uid()) or freelancer_id = (select auth.uid()))
  with check (client_id = (select auth.uid()) or freelancer_id = (select auth.uid()));

-- projects
create policy "Listed projects, own, or staff" on public.projects for select to anon, authenticated
  using (
    (status in ('open', 'in_review', 'assigned', 'in_progress', 'completed') and moderation = 'ok'
      and (visibility = 'public' or (select auth.uid()) is not null)
      and (select private.is_active_profile(client_id)))
    or client_id = (select auth.uid())
    or (select private.is_staff())
  );
create policy "Clients create projects" on public.projects for insert to authenticated
  with check (client_id = (select auth.uid())
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.is_client and p.account_status = 'active'));
create policy "Clients update own projects" on public.projects for update to authenticated
  using (client_id = (select auth.uid())) with check (client_id = (select auth.uid()));
create policy "Clients delete draft projects" on public.projects for delete to authenticated
  using (client_id = (select auth.uid()) and status = 'draft');

-- proposals: the freelancer who sent it and the client who owns the project (and staff)
create policy "Parties see proposals" on public.proposals for select to authenticated
  using (freelancer_id = (select auth.uid()) or client_id = (select auth.uid()) or (select private.is_staff()));
create policy "Freelancers send proposals" on public.proposals for insert to authenticated
  with check (freelancer_id = (select auth.uid()));
create policy "Parties update proposals" on public.proposals for update to authenticated
  using (freelancer_id = (select auth.uid()) or client_id = (select auth.uid()))
  with check (freelancer_id = (select auth.uid()) or client_id = (select auth.uid()));

-- saved_items: private to the user
create policy "Users manage their saved items" on public.saved_items for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Public media bucket (portfolio images, service covers): owner-folder writes, no listing.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Users read own media objects" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users upload own media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users delete own media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
