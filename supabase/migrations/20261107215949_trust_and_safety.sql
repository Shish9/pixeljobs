-- Phase 7: trust & safety. Additive only.
-- Conversations tied to a service request or a proposal, messages, read markers, two-sided blind reviews,
-- user reports with a snapshot of the reported content, a staff-only moderation log and one staff-only RPC
-- (public.moderate) through which every moderation decision goes.
--
-- Privacy rule: staff can NOT browse conversations. They only see the text of a message someone reported
-- (copied into reports.snapshot when the report is filed).

-- ---------------------------------------------------------------------------
-- Conversations
-- ---------------------------------------------------------------------------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid unique references public.service_requests (id) on delete cascade,
  proposal_id uuid unique references public.proposals (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  freelancer_id uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz,
  last_message_preview text not null default '' check (char_length(last_message_preview) <= 140),
  last_sender_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(request_id, proposal_id) = 1),
  check (client_id <> freelancer_id)
);
create index conversations_client_idx on public.conversations (client_id, last_message_at desc nulls last);
create index conversations_freelancer_idx on public.conversations (freelancer_id, last_message_at desc nulls last);
create index conversations_last_sender_idx on public.conversations (last_sender_id);

create function private.is_participant(conv uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.conversations c
    where c.id = conv and (select auth.uid()) in (c.client_id, c.freelancer_id)
  )
$$;
revoke all on function private.is_participant(uuid) from public;
grant execute on function private.is_participant(uuid) to authenticated;

-- One conversation per request / proposal, opened automatically.
create function private.open_conversation()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_table_name = 'service_requests' then
    insert into public.conversations (request_id, client_id, freelancer_id) values (new.id, new.client_id, new.freelancer_id)
      on conflict do nothing;
  else
    insert into public.conversations (proposal_id, client_id, freelancer_id) values (new.id, new.client_id, new.freelancer_id)
      on conflict do nothing;
  end if;
  return null;
end;
$$;
revoke all on function private.open_conversation() from public, anon, authenticated;
create trigger service_requests_conversation after insert on public.service_requests
  for each row execute function private.open_conversation();
create trigger proposals_conversation after insert on public.proposals
  for each row execute function private.open_conversation();

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) <= 4000),
  hidden_at timestamptz,
  created_at timestamptz not null default now(),
  check (hidden_at is not null or char_length(btrim(body)) >= 1)
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);
create index messages_sender_idx on public.messages (sender_id, created_at desc);

-- Text of hidden messages, kept for appeals / restore. No API access at all.
create table private.hidden_message_bodies (
  message_id uuid primary key references public.messages (id) on delete cascade,
  body text not null,
  hidden_at timestamptz not null default now()
);

-- Can this conversation still take messages, and may the caller send one?
--  * requests: pending, accepted or completed (declined/cancelled threads become read-only)
--  * proposals: submitted, shortlisted or accepted. While a proposal is only "submitted", the freelancer
--    cannot write first: the client opens the conversation (anti-spam: the cover letter is the first message).
create function private.messages_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  conv record;
  st text;
begin
  new.sender_id := (select auth.uid());
  new.hidden_at := null;
  new.created_at := now();
  select c.* into conv from public.conversations c where c.id = new.conversation_id;
  if conv.id is null or new.sender_id not in (conv.client_id, conv.freelancer_id) then
    raise exception 'not_participant' using errcode = 'P0001';
  end if;
  if not (select private.email_confirmed()) then raise exception 'email_not_confirmed' using errcode = 'P0001'; end if;
  if not private.is_active_profile(conv.client_id) or not private.is_active_profile(conv.freelancer_id) then
    raise exception 'conversation_closed' using errcode = 'P0001';
  end if;
  if conv.request_id is not null then
    select r.status into st from public.service_requests r where r.id = conv.request_id;
    if st not in ('pending', 'accepted', 'completed') then raise exception 'conversation_closed' using errcode = 'P0001'; end if;
  else
    select p.status into st from public.proposals p where p.id = conv.proposal_id;
    if st not in ('submitted', 'shortlisted', 'accepted') then raise exception 'conversation_closed' using errcode = 'P0001'; end if;
    if st = 'submitted' and new.sender_id = conv.freelancer_id
       and not exists (select 1 from public.messages m where m.conversation_id = conv.id and m.sender_id = conv.client_id) then
      raise exception 'awaiting_client' using errcode = 'P0001';
    end if;
  end if;
  perform private.enforce_daily_limit('public.messages', 'sender_id', 300);
  return new;
end;
$$;

create function private.messages_after_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  update public.conversations
     set last_message_at = new.created_at,
         last_message_preview = left(regexp_replace(new.body, '\s+', ' ', 'g'), 140),
         last_sender_id = new.sender_id
   where id = new.conversation_id;
  -- Sending implies having read the thread.
  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
    values (new.conversation_id, new.sender_id, new.created_at)
    on conflict (conversation_id, user_id) do update set last_read_at = excluded.last_read_at;
  return null;
end;
$$;
revoke all on function private.messages_before_insert() from public, anon, authenticated;
revoke all on function private.messages_after_insert() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Read markers (unread counts)
-- ---------------------------------------------------------------------------
create table public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
create index conversation_reads_user_idx on public.conversation_reads (user_id);

create trigger messages_insert before insert on public.messages
  for each row execute function private.messages_before_insert();
create trigger messages_after_insert after insert on public.messages
  for each row execute function private.messages_after_insert();

create function public.mark_conversation_read(p_conversation uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_participant(p_conversation) then raise exception 'not_participant' using errcode = 'P0001'; end if;
  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
    values (p_conversation, (select auth.uid()), now())
    on conflict (conversation_id, user_id) do update set last_read_at = excluded.last_read_at;
end;
$$;
revoke all on function public.mark_conversation_read(uuid) from public, anon;
grant execute on function public.mark_conversation_read(uuid) to authenticated;

-- Number of conversations with messages from the other person that the caller has not read.
create function public.unread_conversation_count()
returns int language sql stable security definer set search_path = ''
as $$
  select count(*)::int from public.conversations c
  left join public.conversation_reads r on r.conversation_id = c.id and r.user_id = (select auth.uid())
  where (select auth.uid()) in (c.client_id, c.freelancer_id)
    and c.last_message_at is not null
    and c.last_sender_id is distinct from (select auth.uid())
    and (r.last_read_at is null or r.last_read_at < c.last_message_at)
$$;
revoke all on function public.unread_conversation_count() from public, anon;
grant execute on function public.unread_conversation_count() to authenticated;

-- ---------------------------------------------------------------------------
-- Reviews (two-sided, blind)
-- ---------------------------------------------------------------------------
-- Both parties of a COMPLETED request, or of an accepted proposal on a COMPLETED project, may review each other
-- once. A review stays hidden from everyone but its author until the other side has also reviewed, or 14 days
-- have passed, so neither side can retaliate. Reviews cannot be edited or deleted by users.
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references public.service_requests (id) on delete cascade,
  proposal_id uuid references public.proposals (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  reviewer_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reviewee_id uuid not null references public.profiles (id) on delete cascade,
  reviewer_role text not null check (reviewer_role in ('client', 'freelancer')),
  rating smallint not null check (rating between 1 and 5),
  body text check (body is null or char_length(body) between 10 and 2000),
  status text not null default 'published' check (status in ('published', 'hidden')),
  visible_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now(),
  check (num_nonnulls(request_id, proposal_id) = 1),
  check (reviewer_id <> reviewee_id),
  unique (request_id, reviewer_id),
  unique (proposal_id, reviewer_id)
);
create index reviews_reviewee_idx on public.reviews (reviewee_id, visible_at desc);
create index reviews_reviewer_idx on public.reviews (reviewer_id);
create index reviews_service_idx on public.reviews (service_id);

create function private.reviews_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  eng record;
begin
  new.reviewer_id := me;
  new.status := 'published';
  new.created_at := now();
  new.visible_at := now() + interval '14 days';
  new.service_id := null;
  if not (select private.email_confirmed()) then raise exception 'email_not_confirmed' using errcode = 'P0001'; end if;
  if new.request_id is not null then
    select r.client_id, r.freelancer_id, r.service_id, r.status = 'completed' as done into eng
      from public.service_requests r where r.id = new.request_id;
    new.service_id := eng.service_id;
  elsif new.proposal_id is not null then
    select p.client_id, p.freelancer_id, null::uuid as service_id,
           (p.status = 'accepted' and pr.status = 'completed') as done into eng
      from public.proposals p join public.projects pr on pr.id = p.project_id where p.id = new.proposal_id;
  end if;
  if eng.client_id is null or me not in (eng.client_id, eng.freelancer_id) then
    raise exception 'not_participant' using errcode = 'P0001';
  end if;
  if not eng.done then raise exception 'not_completed' using errcode = 'P0001'; end if;
  if me = eng.client_id then
    new.reviewer_role := 'client';
    new.reviewee_id := eng.freelancer_id;
  else
    new.reviewer_role := 'freelancer';
    new.reviewee_id := eng.client_id;
    new.service_id := null;  -- service ratings come from clients only
  end if;
  return new;
end;
$$;

-- When the second side reviews, both become visible now.
create function private.reviews_after_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if exists (
    select 1 from public.reviews r
    where r.id <> new.id and r.reviewer_id = new.reviewee_id
      and (r.request_id = new.request_id or r.proposal_id = new.proposal_id)
  ) then
    update public.reviews set visible_at = least(visible_at, now())
     where (request_id = new.request_id or proposal_id = new.proposal_id);
  end if;
  return null;
end;
$$;
revoke all on function private.reviews_before_insert() from public, anon, authenticated;
revoke all on function private.reviews_after_insert() from public, anon, authenticated;
create trigger reviews_insert before insert on public.reviews
  for each row execute function private.reviews_before_insert();
create trigger reviews_after_insert after insert on public.reviews
  for each row execute function private.reviews_after_insert();

-- Aggregates over what the caller is allowed to see (security_invoker keeps the reviews RLS in force).
create view public.review_stats with (security_invoker = true) as
  select reviewee_id, count(*)::int as review_count, round(avg(rating)::numeric, 2) as rating_avg
  from public.reviews
  where status = 'published' and visible_at <= now()
  group by reviewee_id;
create view public.service_review_stats with (security_invoker = true) as
  select service_id, count(*)::int as review_count, round(avg(rating)::numeric, 2) as rating_avg
  from public.reviews
  where status = 'published' and visible_at <= now() and service_id is not null
  group by service_id;

-- ---------------------------------------------------------------------------
-- Reports
-- ---------------------------------------------------------------------------
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('user', 'service', 'project', 'portfolio', 'message', 'review')),
  target_id uuid not null,
  target_owner uuid references public.profiles (id) on delete set null,
  reason text not null check (reason in ('spam', 'scam', 'offensive', 'inappropriate', 'fake', 'other')),
  details text check (char_length(details) <= 1000),
  snapshot text check (char_length(snapshot) <= 4200),
  status text not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  resolution_note text check (char_length(resolution_note) <= 1000),
  handled_by uuid references public.profiles (id) on delete set null,
  handled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_id, target_type, target_id)
);
create index reports_queue_idx on public.reports (status, created_at);
create index reports_target_idx on public.reports (target_type, target_id);
create index reports_owner_idx on public.reports (target_owner);
create index reports_handled_by_idx on public.reports (handled_by);

-- The reporter must be able to see what they report (a message only by a conversation participant).
-- The owner and a copy of the reported text are captured so evidence survives edits and deletion.
create function private.reports_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  owner uuid;
  snap text;
begin
  new.reporter_id := me;
  new.status := 'open';
  new.resolution_note := null;
  new.handled_by := null;
  new.handled_at := null;
  new.created_at := now();
  case new.target_type
    when 'user' then
      select p.id, coalesce(p.display_name, '') || ' @' || coalesce(p.username, '') || E'\n' || coalesce(left(p.bio, 1000), '')
        into owner, snap from public.profiles p where p.id = new.target_id;
    when 'service' then
      select s.owner_id, s.title || E'\n' || left(s.description, 1500) into owner, snap
        from public.services s where s.id = new.target_id and s.status = 'published';
    when 'project' then
      select p.client_id, p.title || E'\n' || left(p.description, 1500) into owner, snap
        from public.projects p where p.id = new.target_id and p.status <> 'draft';
    when 'portfolio' then
      select pi.owner_id, pi.title || E'\n' || coalesce(left(pi.description, 1500), '') into owner, snap
        from public.portfolio_items pi where pi.id = new.target_id and pi.status = 'published';
    when 'message' then
      select m.sender_id, m.body into owner, snap
        from public.messages m join public.conversations c on c.id = m.conversation_id
        where m.id = new.target_id and me in (c.client_id, c.freelancer_id) and m.hidden_at is null;
    when 'review' then
      select r.reviewer_id, r.rating || '/5' || E'\n' || coalesce(r.body, '') into owner, snap
        from public.reviews r
        where r.id = new.target_id and r.status = 'published' and (r.visible_at <= now() or r.reviewee_id = me);
    else
      raise exception 'not_found' using errcode = 'P0001';
  end case;
  if owner is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  if owner = me then raise exception 'own_content' using errcode = 'P0001'; end if;
  perform private.enforce_daily_limit('public.reports', 'reporter_id', 20);
  new.target_owner := owner;
  new.snapshot := left(snap, 4200);
  return new;
end;
$$;
revoke all on function private.reports_before_insert() from public, anon, authenticated;
create trigger reports_insert before insert on public.reports
  for each row execute function private.reports_before_insert();

-- ---------------------------------------------------------------------------
-- Moderation log + the one moderation entry point
-- ---------------------------------------------------------------------------
create table public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  report_id uuid references public.reports (id) on delete set null,
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now()
);
create index moderation_actions_created_idx on public.moderation_actions (created_at desc);
create index moderation_actions_actor_idx on public.moderation_actions (actor_id);
create index moderation_actions_target_idx on public.moderation_actions (target_type, target_id);
create index moderation_actions_report_idx on public.moderation_actions (report_id);

-- Staff only. Moderators cannot act on staff accounts; nobody can act on themselves or on an admin.
-- Every call writes to moderation_actions. Passing p_report_id resolves that report (and other open reports on
-- the same target) as actioned, or dismissed for the 'dismiss' action.
create function public.moderate(
  p_target_type text, p_target_id uuid, p_action text, p_note text default null, p_report_id uuid default null
)
returns void language plpgsql security definer set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  owner uuid;
  hidden_body text;
  n int;
begin
  if not (select private.is_staff()) then raise exception 'forbidden' using errcode = '42501'; end if;
  if p_note is not null and char_length(p_note) > 1000 then raise exception 'note_too_long' using errcode = 'P0001'; end if;

  if p_action in ('dismiss', 'reviewing') then
    if p_report_id is null then raise exception 'report_required' using errcode = 'P0001'; end if;
    update public.reports
       set status = case when p_action = 'dismiss' then 'dismissed' else 'reviewing' end,
           resolution_note = coalesce(p_note, resolution_note),
           handled_by = me, handled_at = now()
     where id = p_report_id and status in ('open', 'reviewing');
    get diagnostics n = row_count;
    if n = 0 then raise exception 'not_found' using errcode = 'P0001'; end if;
    insert into public.moderation_actions (actor_id, action, target_type, target_id, report_id, note)
      values (me, p_action, p_target_type, p_target_id, p_report_id, p_note);
    return;
  end if;

  owner := case p_target_type
    when 'user' then (select id from public.profiles where id = p_target_id)
    when 'service' then (select owner_id from public.services where id = p_target_id)
    when 'project' then (select client_id from public.projects where id = p_target_id)
    when 'portfolio' then (select owner_id from public.portfolio_items where id = p_target_id)
    when 'message' then (select sender_id from public.messages where id = p_target_id)
    when 'review' then (select reviewer_id from public.reviews where id = p_target_id)
  end;
  if owner is null then raise exception 'not_found' using errcode = 'P0001'; end if;
  if owner = me then raise exception 'own_content' using errcode = 'P0001'; end if;
  if exists (select 1 from public.user_roles where user_id = owner and role = 'admin')
     or (not (select private.has_role('admin')) and exists (select 1 from public.user_roles where user_id = owner)) then
    raise exception 'target_protected' using errcode = 'P0001';
  end if;

  case p_target_type || ':' || p_action
    when 'user:suspend' then update public.profiles set account_status = 'suspended' where id = p_target_id;
    when 'user:reinstate' then update public.profiles set account_status = 'active' where id = p_target_id and account_status = 'suspended';
    when 'service:suspend' then update public.services set status = 'suspended' where id = p_target_id;
    when 'service:restore' then update public.services set status = 'published' where id = p_target_id and status = 'suspended';
    when 'portfolio:suspend' then update public.portfolio_items set status = 'suspended' where id = p_target_id;
    when 'portfolio:restore' then update public.portfolio_items set status = 'published' where id = p_target_id and status = 'suspended';
    when 'project:suspend' then update public.projects set moderation = 'suspended' where id = p_target_id;
    when 'project:restore' then update public.projects set moderation = 'ok' where id = p_target_id;
    when 'review:hide' then update public.reviews set status = 'hidden' where id = p_target_id;
    when 'review:restore' then update public.reviews set status = 'published' where id = p_target_id;
    when 'message:hide' then
      select body into hidden_body from public.messages where id = p_target_id and hidden_at is null;
      if hidden_body is not null then
        insert into private.hidden_message_bodies (message_id, body) values (p_target_id, hidden_body)
          on conflict (message_id) do update set body = excluded.body, hidden_at = now();
        update public.messages set body = '', hidden_at = now() where id = p_target_id;
        update public.conversations c set last_message_preview = ''
          where c.id = (select conversation_id from public.messages where id = p_target_id)
            and c.last_message_at = (select created_at from public.messages where id = p_target_id);
      end if;
    when 'message:restore' then
      update public.messages m set body = h.body, hidden_at = null
        from private.hidden_message_bodies h where h.message_id = m.id and m.id = p_target_id;
      delete from private.hidden_message_bodies where message_id = p_target_id;
    else
      raise exception 'unknown_action' using errcode = 'P0001';
  end case;

  if p_report_id is not null then
    update public.reports set status = 'actioned', resolution_note = coalesce(p_note, resolution_note),
           handled_by = me, handled_at = now()
     where status in ('open', 'reviewing')
       and (id = p_report_id or (target_type = p_target_type and target_id = p_target_id));
  end if;
  insert into public.moderation_actions (actor_id, action, target_type, target_id, report_id, note)
    values (me, p_action, p_target_type, p_target_id, p_report_id, p_note);
end;
$$;
revoke all on function public.moderate(text, uuid, text, text, uuid) from public, anon;
grant execute on function public.moderate(text, uuid, text, text, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Privileges + RLS
-- ---------------------------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.conversation_reads enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;
alter table private.hidden_message_bodies enable row level security;

revoke all on table public.conversations, public.messages, public.conversation_reads, public.reviews,
  public.reports, public.moderation_actions from anon, authenticated;
revoke all on table private.hidden_message_bodies from public, anon, authenticated;
revoke all on table public.review_stats, public.service_review_stats from anon, authenticated;

grant select on table public.conversations to authenticated;
grant select on table public.messages to authenticated;
grant insert (conversation_id, body) on table public.messages to authenticated;
grant select on table public.conversation_reads to authenticated;
grant select on table public.reviews to anon, authenticated;
grant insert (request_id, proposal_id, rating, body) on table public.reviews to authenticated;
grant select on table public.review_stats, public.service_review_stats to anon, authenticated;
grant select on table public.reports to authenticated;
grant insert (target_type, target_id, reason, details) on table public.reports to authenticated;
grant select on table public.moderation_actions to authenticated;

create policy "Participants see their conversations" on public.conversations for select to authenticated
  using ((select auth.uid()) in (client_id, freelancer_id));

create policy "Participants read messages" on public.messages for select to authenticated
  using ((select private.is_participant(conversation_id)));
create policy "Participants send messages" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and (select private.is_participant(conversation_id)));

create policy "Users see their read markers" on public.conversation_reads for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Visible reviews, own, or staff" on public.reviews for select to anon, authenticated
  using (
    (status = 'published' and visible_at <= now() and exists (select 1 from public.profiles p where p.id = reviewee_id))
    or reviewer_id = (select auth.uid())
    or (select private.is_staff())
  );
create policy "Parties write reviews" on public.reviews for insert to authenticated
  with check (reviewer_id = (select auth.uid()));

create policy "Reporters see own reports, staff see all" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select private.is_staff()));
create policy "Users file reports" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

create policy "Staff read the moderation log" on public.moderation_actions for select to authenticated
  using ((select private.is_staff()));
