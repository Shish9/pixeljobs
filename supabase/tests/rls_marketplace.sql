-- RLS / trigger tests for the Phase 6 marketplace tables. Same contract as rls_foundation.sql:
-- one DO block that always ends with an exception, so everything rolls back.
-- Expected: ERROR: RLS_TESTS_PASSED (<n> checks)
do $tests$
declare
  f uuid := gen_random_uuid();  -- confirmed freelancer
  c uuid := gen_random_uuid();  -- confirmed client
  x uuid := gen_random_uuid();  -- second confirmed freelancer
  u uuid := gen_random_uuid();  -- freelancer with UNconfirmed email
  svc uuid; svc_u uuid; req uuid; prj uuid; prop_x uuid; prop_f uuid; port_f uuid; port_x uuid;
  n int; checks int := 0; v text;
begin
  insert into auth.users (id, email, aud, role, email_confirmed_at) values
    (f, f || '@test.local', 'authenticated', 'authenticated', now()),
    (c, c || '@test.local', 'authenticated', 'authenticated', now()),
    (x, x || '@test.local', 'authenticated', 'authenticated', now()),
    (u, u || '@test.local', 'authenticated', 'authenticated', null);
  update public.profiles set is_freelancer = true, username = 'free.lancer' where id = f;
  update public.profiles set is_client = true where id = c;
  update public.profiles set is_freelancer = true where id in (x, u);

  -------------------------------------------------------------------- freelancer F: services + portfolio
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);

  insert into public.services (title, category, description)
    values ('Bilingual logo design', 'design', repeat('Clear logo work in Kurdish and English. ', 3)) returning id into svc;
  begin
    update public.services set status = 'published' where id = svc;
    raise exception 'RLS_TEST_FAILED: published without a package';
  exception when raise_exception then
    if sqlerrm <> 'service_needs_package' then raise exception 'RLS_TEST_FAILED: expected service_needs_package, got %', sqlerrm; end if;
  end;
  insert into public.service_packages (service_id, tier, title, price_minor, delivery_days) values (svc, 'basic', 'Logo', 150000, 5);
  update public.services set status = 'published' where id = svc;
  if (select published_at from public.services where id = svc) is null then raise exception 'RLS_TEST_FAILED: published_at not set'; end if;
  begin
    insert into public.services (title, category, description, status) values ('Sneaky suspended one', 'design', 'x', 'suspended');
    raise exception 'RLS_TEST_FAILED: user set a staff-only status';
  exception when raise_exception then
    if sqlerrm <> 'status_not_allowed' then raise exception 'RLS_TEST_FAILED: expected status_not_allowed, got %', sqlerrm; end if;
  end;
  insert into public.portfolio_items (title) values ('Ankawa bakery logo') returning id into port_f;
  checks := checks + 4;
  reset role;

  -------------------------------------------------------------------- unconfirmed U cannot publish
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true);
  insert into public.services (title, category, description)
    values ('Unconfirmed service here', 'video', repeat('Video editing for events and weddings. ', 3)) returning id into svc_u;
  insert into public.service_packages (service_id, tier, title, price_minor, delivery_days) values (svc_u, 'basic', 'Edit', 90000, 3);
  begin
    update public.services set status = 'published' where id = svc_u;
    raise exception 'RLS_TEST_FAILED: unconfirmed user published';
  exception when raise_exception then
    if sqlerrm <> 'email_not_confirmed' then raise exception 'RLS_TEST_FAILED: expected email_not_confirmed, got %', sqlerrm; end if;
  end;
  checks := checks + 1;
  reset role;

  -------------------------------------------------------------------- anonymous visitor
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) into n from public.services where owner_id in (f, u);
  if n <> 1 then raise exception 'RLS_TEST_FAILED: anon sees % services (expected only the published one)', n; end if;
  select count(*) into n from public.service_packages where service_id in (svc, svc_u);
  if n <> 1 then raise exception 'RLS_TEST_FAILED: anon sees % packages (expected 1)', n; end if;
  select count(*) into n from public.portfolio_items where owner_id = f;
  if n <> 1 then raise exception 'RLS_TEST_FAILED: anon cannot see published portfolio'; end if;
  begin perform 1 from public.service_requests; raise exception 'RLS_TEST_FAILED: anon reads requests';
  exception when insufficient_privilege then null; end;
  begin perform 1 from public.proposals; raise exception 'RLS_TEST_FAILED: anon reads proposals';
  exception when insufficient_privilege then null; end;
  begin insert into public.services (title, category) values ('anon service attempt', 'design'); raise exception 'RLS_TEST_FAILED: anon inserted a service';
  exception when insufficient_privilege then null; end;
  checks := checks + 6;
  reset role;

  -------------------------------------------------------------------- client C: requests + projects
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  begin
    insert into public.services (title, category, description) values ('Client trying to sell', 'design', 'x');
    raise exception 'RLS_TEST_FAILED: non-freelancer created a service';
  exception when insufficient_privilege then null; end;
  insert into public.service_requests (service_id, tier, message)
    values (svc, 'basic', 'Hello, I need a logo for my bakery in Ankawa.') returning id into req;
  select freelancer_id::text || '/' || price_minor::text || '/' || status into v from public.service_requests where id = req;
  if v <> f::text || '/150000/pending' then raise exception 'RLS_TEST_FAILED: request not filled from package (%)', v; end if;
  begin
    update public.service_requests set status = 'accepted' where id = req;
    raise exception 'RLS_TEST_FAILED: client accepted their own request';
  exception when raise_exception then
    if sqlerrm <> 'transition_not_allowed' then raise exception 'RLS_TEST_FAILED: expected transition_not_allowed, got %', sqlerrm; end if;
  end;
  begin
    insert into public.service_requests (service_id, tier, message) values (svc_u, 'basic', 'Requesting an unpublished service now');
    raise exception 'RLS_TEST_FAILED: requested an unpublished service';
  exception when raise_exception then
    if sqlerrm <> 'service_unavailable' then raise exception 'RLS_TEST_FAILED: expected service_unavailable, got %', sqlerrm; end if;
  end;
  insert into public.projects (title, description, category, status, budget_min_minor, budget_max_minor)
    values ('Instagram content for a café', repeat('We need photos and captions every week. ', 2), 'marketing', 'open', 400000, 700000)
    returning id into prj;
  insert into public.saved_items (item_type, item_id) values ('service', svc);
  checks := checks + 5;
  reset role;

  -------------------------------------------------------------------- freelancer F: handles the request
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  select count(*) into n from public.service_requests where id = req;
  if n <> 1 then raise exception 'RLS_TEST_FAILED: freelancer cannot see incoming request'; end if;
  update public.service_requests set status = 'accepted' where id = req;
  update public.service_requests set status = 'completed' where id = req;
  begin
    insert into public.service_requests (service_id, tier, message) values (svc, 'basic', 'Requesting my own service, sneaky');
    raise exception 'RLS_TEST_FAILED: requested own service';
  exception when raise_exception then
    if sqlerrm <> 'own_service' then raise exception 'RLS_TEST_FAILED: expected own_service, got %', sqlerrm; end if;
  end;
  begin
    insert into public.projects (title, description, category) values ('Freelancer project attempt', repeat('x', 40), 'design');
    raise exception 'RLS_TEST_FAILED: non-client created a project';
  exception when insufficient_privilege then null; end;
  select count(*) into n from public.saved_items;
  if n <> 0 then raise exception 'RLS_TEST_FAILED: saw another user''s saved items'; end if;
  checks := checks + 5;
  reset role;

  -------------------------------------------------------------------- proposals
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', x, 'role', 'authenticated')::text, true);
  select count(*) into n from public.service_requests;
  if n <> 0 then raise exception 'RLS_TEST_FAILED: third party sees a request'; end if;
  insert into public.portfolio_items (title) values ('X portfolio') returning id into port_x;
  insert into public.proposals (project_id, cover_letter, bid_minor, timeline_days, portfolio_item_ids)
    values (prj, repeat('I have done café content in Erbil for two years. ', 2), 500000, 28, array[port_x]) returning id into prop_x;
  if (select client_id from public.proposals where id = prop_x) <> c then raise exception 'RLS_TEST_FAILED: proposal client_id not set'; end if;
  begin
    insert into public.proposals (project_id, cover_letter, bid_minor, timeline_days)
      values (prj, repeat('Second proposal to the same project. ', 3), 1, 1);
    raise exception 'RLS_TEST_FAILED: duplicate proposal accepted';
  exception when unique_violation then null; end;
  begin
    update public.proposals set status = 'accepted' where id = prop_x;
    raise exception 'RLS_TEST_FAILED: freelancer accepted own proposal';
  exception when raise_exception then
    if sqlerrm <> 'transition_not_allowed' then raise exception 'RLS_TEST_FAILED: expected transition_not_allowed, got %', sqlerrm; end if;
  end;
  checks := checks + 4;
  reset role;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  begin
    insert into public.proposals (project_id, cover_letter, bid_minor, timeline_days, portfolio_item_ids)
      values (prj, repeat('Attaching someone else''s portfolio item. ', 2), 450000, 21, array[port_x]);
    raise exception 'RLS_TEST_FAILED: attached another user''s portfolio item';
  exception when raise_exception then
    if sqlerrm <> 'invalid_portfolio' then raise exception 'RLS_TEST_FAILED: expected invalid_portfolio, got %', sqlerrm; end if;
  end;
  insert into public.proposals (project_id, cover_letter, bid_minor, timeline_days, portfolio_item_ids)
    values (prj, repeat('Bilingual content is my specialty in Erbil. ', 2), 450000, 21, array[port_f]) returning id into prop_f;
  select count(*) into n from public.proposals;
  if n <> 1 then raise exception 'RLS_TEST_FAILED: freelancer sees % proposals (expected own only)', n; end if;
  update public.proposals set status = 'withdrawn' where id = prop_x;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS_TEST_FAILED: freelancer changed another freelancer''s proposal'; end if;
  checks := checks + 3;
  reset role;

  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  select count(*) into n from public.proposals where project_id = prj;
  if n <> 2 then raise exception 'RLS_TEST_FAILED: client sees % proposals (expected 2)', n; end if;
  update public.proposals set status = 'shortlisted' where id = prop_f;
  update public.proposals set status = 'accepted' where id = prop_f;
  if (select status from public.projects where id = prj) <> 'assigned' then raise exception 'RLS_TEST_FAILED: accepting did not assign the project'; end if;
  begin
    update public.projects set status = 'open' where id = prj;
    raise exception 'RLS_TEST_FAILED: reopened an assigned project';
  exception when raise_exception then
    if sqlerrm <> 'transition_not_allowed' then raise exception 'RLS_TEST_FAILED: expected transition_not_allowed, got %', sqlerrm; end if;
  end;
  update public.projects set status = 'in_progress' where id = prj;
  -- anti-spam: 10 projects per day (1 already)
  for i in 1..9 loop
    insert into public.projects (title, description, category) values ('Draft project number ' || i, repeat('Draft description text. ', 3), 'writing');
  end loop;
  begin
    insert into public.projects (title, description, category) values ('Eleventh project today', repeat('Draft description text. ', 3), 'writing');
    raise exception 'RLS_TEST_FAILED: daily project limit not enforced';
  exception when raise_exception then
    if sqlerrm <> 'rate_limited' then raise exception 'RLS_TEST_FAILED: expected rate_limited, got %', sqlerrm; end if;
  end;
  checks := checks + 4;
  reset role;

  -------------------------------------------------------------------- storage: own folder only
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', f, 'role', 'authenticated')::text, true);
  insert into storage.objects (bucket_id, name, owner_id) values ('media', f || '/cover.png', f::text);
  begin
    insert into storage.objects (bucket_id, name, owner_id) values ('media', c || '/cover.png', f::text);
    raise exception 'RLS_TEST_FAILED: wrote into another user''s media folder';
  exception when insufficient_privilege then null; end;
  checks := checks + 2;
  reset role;

  raise exception 'RLS_TESTS_PASSED (% checks)', checks;
end
$tests$;
