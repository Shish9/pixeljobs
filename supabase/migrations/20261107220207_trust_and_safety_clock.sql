-- Message times and read markers use clock_timestamp() so that several messages written in one transaction
-- keep their order and "read up to" comparisons stay correct. Same behaviour otherwise.
create or replace function private.messages_before_insert()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  conv record;
  st text;
begin
  new.sender_id := (select auth.uid());
  new.hidden_at := null;
  new.created_at := clock_timestamp();
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

create or replace function public.mark_conversation_read(p_conversation uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not private.is_participant(p_conversation) then raise exception 'not_participant' using errcode = 'P0001'; end if;
  insert into public.conversation_reads (conversation_id, user_id, last_read_at)
    values (p_conversation, (select auth.uid()), clock_timestamp())
    on conflict (conversation_id, user_id) do update set last_read_at = greatest(public.conversation_reads.last_read_at, excluded.last_read_at);
end;
$$;
