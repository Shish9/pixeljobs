-- RLS / trigger tests for Phase 7 (messaging, reviews, reports, moderation). Same contract as the other files:
-- one DO block that always ends with an exception, so everything rolls back.
-- Expected: ERROR: RLS_TESTS_PASSED (<n> checks)
do $tests$
declare
  f uuid := gen_random_uuid();  -- freelancer
  c uuid := gen_random_uuid();  -- client
  x uuid := gen_random_uuid();  -- unrelated freelancer
  m uuid := gen_random_uuid();  -- moderator
  a uuid := gen_random_uuid();  -- admin
  svc uuid; req uuid; req2 uuid; prj uuid; prop uuid; conv uuid; pconv uuid; msg uuid; rev_c uuid; rep uuid;
  n int; checks int := 0; v text;
begin
  insert into auth.users (id, email, aud, role, email_confirmed_at) values
    (f, f || '@test.local', 'authenticated', 'authenticated', now()),
    (c, c || '@test.local', 'authenticated', 'authenticated', now()),
    (x, x || '@test.local', 'authenticated', 'authenticated', now()),
    (m, m || '@test.local', 'authenticated', 'authenticated', now()),
    (a, a || '@test.local', 'authenticated', 'authenticated', now());
  update public.profiles set is_freelancer = true, username = 'trust.free' where id = f;
  update public.profiles set is_client = true, username = 'trust.client' where id = c;
  update public.profiles set is_freelancer = true, is_client = true where id = x;
  update public.profiles set is_client = true where id in (m, a);
  insert into public.user_roles (user_id, role) values (m, 'moderator'), (a, 'admin');

  -------------------------------------------------------------------- setup: service, two requests, project + proposal
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  insert into public.services (title, category, description)
    values ('Bilingual logo design', 'design', repeat('Clear logo work in Kurdish and English. ', 3)) returning id into svc;
  insert into public.service_packages (service_id, tier, title, price_minor, delivery_days) values (svc, 'basic', 'Logo', 150000, 5);
  update public.services set status = 'published' where id = svc;

  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  insert into public.service_requests (service_id, tier, message) values (svc, 'basic', 'We need a logo for our new café in Ankawa.') returning id into req;
  insert into public.service_requests (service_id, tier, message) values (svc, 'basic', 'A second, smaller request for a menu header.') returning id into req2;
  insert into public.projects (title, description, category, status)
    values ('Instagram content for a café', repeat('Weekly photos and captions. ', 3), 'marketing', 'open') returning id into prj;
  select id into conv from public.conversations where request_id = req;
  if conv is null then raise exception 'RLS_TEST_FAILED: no conversation opened for a request'; end if;
  checks := checks + 1;

  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  insert into public.proposals (project_id, cover_letter, bid_minor, timeline_days)
    values (prj, repeat('I shoot café content in Erbil and write captions. ', 2), 550000, 28) returning id into prop;
  select id into pconv from public.conversations where proposal_id = prop;
  if pconv is null then raise exception 'RLS_TEST_FAILED: no conversation opened for a proposal'; end if;
  checks := checks + 1;

  -------------------------------------------------------------------- messaging between the parties
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  insert into public.messages (conversation_id, body) values (conv, 'Hello! Can you start next week?') returning id into msg;
  begin
    insert into public.messages (conversation_id, sender_id, body) values (conv, f, 'spoofed sender');
    raise exception 'RLS_TEST_FAILED: sender_id was writable';
  exception when insufficient_privilege then null; end;
  begin
    update public.messages set body = 'edited' where id = msg;
    raise exception 'RLS_TEST_FAILED: messages are editable';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.messages (conversation_id, body) values (conv, '   ');
    raise exception 'RLS_TEST_FAILED: blank message accepted';
  exception when check_violation then null; end;
  checks := checks + 3;

  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  if public.unread_conversation_count() <> 1 then raise exception 'RLS_TEST_FAILED: freelancer unread count is not 1'; end if;
  perform public.mark_conversation_read(conv);
  if public.unread_conversation_count() <> 0 then raise exception 'RLS_TEST_FAILED: unread count not cleared'; end if;
  insert into public.messages (conversation_id, body) values (conv, 'Yes, Sunday works for me.');
  select count(*) into n from public.messages where conversation_id = conv;
  if n <> 2 then raise exception 'RLS_TEST_FAILED: freelancer sees % messages (expected 2)', n; end if;
  -- proposal thread: the freelancer cannot write first while the proposal is only submitted
  begin
    insert into public.messages (conversation_id, body) values (pconv, 'Following up on my proposal!');
    raise exception 'RLS_TEST_FAILED: freelancer wrote first on a submitted proposal';
  exception when raise_exception then
    if sqlerrm <> 'awaiting_client' then raise exception 'RLS_TEST_FAILED: expected awaiting_client, got %', sqlerrm; end if;
  end;
  checks := checks + 4;

  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  if public.unread_conversation_count() <> 1 then raise exception 'RLS_TEST_FAILED: client unread count is not 1'; end if;
  select last_message_preview into v from public.conversations where id = conv;
  if v <> 'Yes, Sunday works for me.' then raise exception 'RLS_TEST_FAILED: preview not updated (%)', v; end if;
  insert into public.messages (conversation_id, body) values (pconv, 'Thanks for the proposal, a few questions.');
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  insert into public.messages (conversation_id, body) values (pconv, 'Happy to answer.');
  -- a declined request becomes read-only
  update public.service_requests set status = 'declined' where id = req2;
  begin
    insert into public.messages (conversation_id, body) values ((select id from public.conversations where request_id = req2), 'One more thing');
    raise exception 'RLS_TEST_FAILED: message in a declined request';
  exception when raise_exception then
    if sqlerrm <> 'conversation_closed' then raise exception 'RLS_TEST_FAILED: expected conversation_closed, got %', sqlerrm; end if;
  end;
  checks := checks + 4;

  -------------------------------------------------------------------- outsiders and staff cannot read conversations
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  select count(*) into n from public.conversations;
  if n <> 0 then raise exception 'RLS_TEST_FAILED: outsider sees % conversations', n; end if;
  select count(*) into n from public.messages;
  if n <> 0 then raise exception 'RLS_TEST_FAILED: outsider sees % messages', n; end if;
  begin
    insert into public.messages (conversation_id, body) values (conv, 'intruder');
    raise exception 'RLS_TEST_FAILED: outsider posted a message';
  exception when raise_exception or insufficient_privilege then
    if sqlstate = 'P0001' and sqlerrm <> 'not_participant' then raise exception 'RLS_TEST_FAILED: expected not_participant, got %', sqlerrm; end if;
  end;
  begin
    perform public.mark_conversation_read(conv);
    raise exception 'RLS_TEST_FAILED: outsider marked a conversation read';
  exception when raise_exception then
    if sqlerrm <> 'not_participant' then raise exception 'RLS_TEST_FAILED: expected not_participant, got %', sqlerrm; end if;
  end;
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true);
  select count(*) into n from public.messages;
  if n <> 0 then raise exception 'RLS_TEST_FAILED: moderator can browse messages (%)', n; end if;
  checks := checks + 5;
  reset role;

  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  begin perform 1 from public.messages; raise exception 'RLS_TEST_FAILED: anon reads messages';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.reports; raise exception 'RLS_TEST_FAILED: anon reads reports';
  exception when insufficient_privilege then null; end;
  begin perform public.moderate('user', f, 'suspend'); raise exception 'RLS_TEST_FAILED: anon called moderate';
  exception when insufficient_privilege then null; end;
  checks := checks + 3;
  reset role;

  -------------------------------------------------------------------- reviews: only after completion, blind until both
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  begin
    insert into public.reviews (request_id, rating, body) values (req, 5, 'Too early to say anything.');
    raise exception 'RLS_TEST_FAILED: review before completion';
  exception when raise_exception then
    if sqlerrm <> 'not_completed' then raise exception 'RLS_TEST_FAILED: expected not_completed, got %', sqlerrm; end if;
  end;
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  update public.service_requests set status = 'accepted' where id = req;
  update public.service_requests set status = 'completed' where id = req;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  insert into public.reviews (request_id, rating, body) values (req, 5, 'Fast, clear and the logo works in both scripts.') returning id into rev_c;
  if (select reviewee_id from public.reviews where id = rev_c) <> f then raise exception 'RLS_TEST_FAILED: wrong reviewee'; end if;
  if (select service_id from public.reviews where id = rev_c) is distinct from svc then raise exception 'RLS_TEST_FAILED: service not linked'; end if;
  begin
    insert into public.reviews (request_id, rating) values (req, 1);
    raise exception 'RLS_TEST_FAILED: second review by the same person';
  exception when unique_violation then null; end;
  begin
    update public.reviews set rating = 1 where id = rev_c;
    raise exception 'RLS_TEST_FAILED: reviews are editable';
  exception when insufficient_privilege then null; end;
  checks := checks + 5;

  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  begin
    insert into public.reviews (request_id, rating) values (req, 1);
    raise exception 'RLS_TEST_FAILED: outsider reviewed';
  exception when raise_exception then
    if sqlerrm <> 'not_participant' then raise exception 'RLS_TEST_FAILED: expected not_participant, got %', sqlerrm; end if;
  end;
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  select count(*) into n from public.reviews where id = rev_c;
  if n <> 0 then raise exception 'RLS_TEST_FAILED: reviewee saw a blind review'; end if;
  checks := checks + 2;
  reset role;

  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) into n from public.reviews where reviewee_id in (f, c);
  if n <> 0 then raise exception 'RLS_TEST_FAILED: anon saw blind reviews (%)', n; end if;
  checks := checks + 1;
  reset role;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  insert into public.reviews (request_id, rating, body) values (req, 4, 'Clear brief and quick feedback.');
  reset role;

  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) into n from public.reviews where reviewee_id in (f, c);
  if n <> 2 then raise exception 'RLS_TEST_FAILED: both reviews should be visible now (saw %)', n; end if;
  select review_count into n from public.review_stats where reviewee_id = f;
  if n is distinct from 1 then raise exception 'RLS_TEST_FAILED: review_stats wrong (%)', n; end if;
  select review_count into n from public.service_review_stats where service_id = svc;
  if n is distinct from 1 then raise exception 'RLS_TEST_FAILED: service_review_stats wrong (%)', n; end if;
  checks := checks + 3;
  reset role;

  -------------------------------------------------------------------- reports
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  insert into public.reports (target_type, target_id, reason, details) values ('service', svc, 'spam', 'Copied from another site') returning id into rep;
  select snapshot into v from public.reports where id = rep;
  if v not like 'Bilingual logo design%' then raise exception 'RLS_TEST_FAILED: snapshot missing (%)', v; end if;
  begin
    insert into public.reports (target_type, target_id, reason) values ('service', svc, 'scam');
    raise exception 'RLS_TEST_FAILED: duplicate report';
  exception when unique_violation then null; end;
  begin
    insert into public.reports (target_type, target_id, reason) values ('user', x, 'fake');
    raise exception 'RLS_TEST_FAILED: reported self';
  exception when raise_exception then
    if sqlerrm <> 'own_content' then raise exception 'RLS_TEST_FAILED: expected own_content, got %', sqlerrm; end if;
  end;
  begin
    insert into public.reports (target_type, target_id, reason) values ('message', msg, 'offensive');
    raise exception 'RLS_TEST_FAILED: outsider reported a private message';
  exception when raise_exception then
    if sqlerrm <> 'not_found' then raise exception 'RLS_TEST_FAILED: expected not_found, got %', sqlerrm; end if;
  end;
  begin
    perform public.moderate('service', svc, 'suspend');
    raise exception 'RLS_TEST_FAILED: non-staff moderated';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.moderation_actions (action, target_type, target_id) values ('suspend', 'user', f);
    raise exception 'RLS_TEST_FAILED: wrote to the moderation log';
  exception when insufficient_privilege then null; end;
  checks := checks + 6;

  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  insert into public.reports (target_type, target_id, reason) values ('message', msg, 'offensive');
  select count(*) into n from public.reports;
  if n <> 1 then raise exception 'RLS_TEST_FAILED: reporter sees % reports (expected own only)', n; end if;
  checks := checks + 1;

  -------------------------------------------------------------------- moderation by staff
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true);
  select count(*) into n from public.reports;
  if n <> 2 then raise exception 'RLS_TEST_FAILED: moderator sees % reports (expected 2)', n; end if;
  select snapshot into v from public.reports where target_type = 'message';
  if v <> 'Hello! Can you start next week?' then raise exception 'RLS_TEST_FAILED: message snapshot wrong (%)', v; end if;

  perform public.moderate('message', msg, 'hide', 'Rude', (select id from public.reports where target_type = 'message'));
  perform public.moderate('service', svc, 'suspend', 'Copied listing', rep);
  if (select status from public.reports where id = rep) <> 'actioned' then raise exception 'RLS_TEST_FAILED: report not actioned'; end if;
  select count(*) into n from public.moderation_actions;
  if n <> 2 then raise exception 'RLS_TEST_FAILED: moderation log has % rows', n; end if;
  begin
    perform public.moderate('user', a, 'suspend');
    raise exception 'RLS_TEST_FAILED: moderator suspended an admin';
  exception when raise_exception then
    if sqlerrm <> 'target_protected' then raise exception 'RLS_TEST_FAILED: expected target_protected, got %', sqlerrm; end if;
  end;
  begin
    perform public.moderate('user', m, 'suspend');
    raise exception 'RLS_TEST_FAILED: moderator acted on self';
  exception when raise_exception then
    if sqlerrm <> 'own_content' then raise exception 'RLS_TEST_FAILED: expected own_content, got %', sqlerrm; end if;
  end;
  begin
    perform public.moderate('service', svc, 'explode');
    raise exception 'RLS_TEST_FAILED: unknown action accepted';
  exception when raise_exception then
    if sqlerrm <> 'unknown_action' then raise exception 'RLS_TEST_FAILED: expected unknown_action, got %', sqlerrm; end if;
  end;
  checks := checks + 7;

  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  if (select body from public.messages where id = msg) <> '' or (select hidden_at from public.messages where id = msg) is null then
    raise exception 'RLS_TEST_FAILED: hidden message still readable';
  end if;
  begin
    perform 1 from private.hidden_message_bodies;
    raise exception 'RLS_TEST_FAILED: hidden bodies readable';
  exception when insufficient_privilege then null; end;
  if exists (select 1 from public.services where id = svc) then raise exception 'RLS_TEST_FAILED: suspended service still public'; end if;
  select count(*) into n from public.moderation_actions;
  if n <> 0 then raise exception 'RLS_TEST_FAILED: non-staff reads the moderation log'; end if;
  checks := checks + 4;

  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  begin
    update public.services set status = 'published' where id = svc;
    raise exception 'RLS_TEST_FAILED: owner re-published a suspended service';
  exception when raise_exception then
    if sqlerrm <> 'status_locked' then raise exception 'RLS_TEST_FAILED: expected status_locked, got %', sqlerrm; end if;
  end;
  checks := checks + 1;

  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true);
  perform public.moderate('message', msg, 'restore');
  perform public.moderate('service', svc, 'restore');
  perform public.moderate('user', f, 'suspend', 'Test suspension');
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  if (select body from public.messages where id = msg) <> 'Hello! Can you start next week?' then raise exception 'RLS_TEST_FAILED: message not restored'; end if;
  begin
    insert into public.messages (conversation_id, body) values (conv, 'Are you there?');
    raise exception 'RLS_TEST_FAILED: messaged a suspended user';
  exception when raise_exception then
    if sqlerrm <> 'conversation_closed' then raise exception 'RLS_TEST_FAILED: expected conversation_closed, got %', sqlerrm; end if;
  end;
  checks := checks + 2;

  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  perform public.moderate('user', f, 'reinstate');
  perform public.moderate('review', rev_c, 'hide', 'Test hide');
  if (select account_status from public.profiles where id = f) <> 'active' then raise exception 'RLS_TEST_FAILED: not reinstated'; end if;
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true);
  select count(*) into n from public.moderation_actions;
  if n <> 7 then raise exception 'RLS_TEST_FAILED: moderation log has % rows (expected 7)', n; end if;
  checks := checks + 2;
  reset role;

  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) into n from public.reviews where id = rev_c;
  if n <> 0 then raise exception 'RLS_TEST_FAILED: hidden review still public'; end if;
  checks := checks + 1;
  reset role;

  raise exception 'RLS_TESTS_PASSED (% checks)', checks;
end
$tests$;
