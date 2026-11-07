-- RLS / privilege tests for the foundation schema.
--
-- Run with any SQL client connected as `postgres` (Supabase SQL editor, psql, or the MCP execute_sql tool).
-- The whole script is ONE transaction-scoped DO block that always ends by raising an exception, so every
-- test row is rolled back. Expected final output:  ERROR: RLS_TESTS_PASSED (<n> checks)
-- Any failure aborts early with:                  ERROR: RLS_TEST_FAILED: <description>
do $tests$
declare
  a uuid := gen_random_uuid(); -- onboarded public freelancer
  b uuid := gen_random_uuid(); -- onboarded private client
  c uuid := gen_random_uuid(); -- not onboarded yet
  m uuid := gen_random_uuid(); -- moderator
  s uuid := gen_random_uuid(); -- admin
  n int;
  checks int := 0;
  denied boolean;

  -- helpers implemented inline via nested blocks below
begin
  ---------------------------------------------------------------------------
  -- Setup (as postgres)
  ---------------------------------------------------------------------------
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values
    (a, a || '@test.local', 'authenticated', 'authenticated', '{"display_name":"Aram","preferred_locale":"ckb"}'),
    (b, b || '@test.local', 'authenticated', 'authenticated', '{"display_name":"Bahar","preferred_locale":"xx"}'),
    (c, c || '@test.local', 'authenticated', 'authenticated', '{}'),
    (m, m || '@test.local', 'authenticated', 'authenticated', '{}'),
    (s, s || '@test.local', 'authenticated', 'authenticated', '{}');

  -- trigger created profiles + settings
  select count(*) into n from public.profiles where id in (a, b, c, m, s);
  if n <> 5 then raise exception 'RLS_TEST_FAILED: new-user trigger created % profiles', n; end if;
  select count(*) into n from public.account_settings where user_id in (a, b, c, m, s);
  if n <> 5 then raise exception 'RLS_TEST_FAILED: new-user trigger created % settings rows', n; end if;
  if (select preferred_locale from public.profiles where id = a) <> 'ckb' then
    raise exception 'RLS_TEST_FAILED: preferred_locale metadata not applied';
  end if;
  if (select preferred_locale from public.profiles where id = b) <> 'en' then
    raise exception 'RLS_TEST_FAILED: invalid locale metadata not rejected';
  end if;
  checks := checks + 4;

  update public.profiles set username = 'aram.design', is_freelancer = true where id = a;
  update public.profiles set username = 'bahar', is_client = true, visibility = 'private' where id = b;
  update public.profiles set username = 'mod_one', is_client = true where id = m;
  update public.profiles set username = 'admin_one', is_client = true where id = s;
  insert into public.user_roles (user_id, role) values (m, 'moderator'), (s, 'admin');

  if (select onboarded_at from public.profiles where id = a) is null then
    raise exception 'RLS_TEST_FAILED: onboarding trigger did not set onboarded_at';
  end if;
  checks := checks + 1;

  ---------------------------------------------------------------------------
  -- Anonymous visitor
  ---------------------------------------------------------------------------
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);

  select count(*) into n from public.profiles where id in (a, b, c, m, s);
  -- a, m, s are public + onboarded; b is private; c is not onboarded
  if n <> 3 then raise exception 'RLS_TEST_FAILED: anon sees % profiles (expected 3)', n; end if;
  if exists (select 1 from public.profiles where id in (b, c)) then
    raise exception 'RLS_TEST_FAILED: anon can see private or non-onboarded profile';
  end if;
  select count(*) into n from public.currencies;
  if n < 2 then raise exception 'RLS_TEST_FAILED: anon cannot read currencies'; end if;
  checks := checks + 3;

  denied := false;
  begin update public.profiles set display_name = 'x' where id = a; exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'RLS_TEST_FAILED: anon can update profiles'; end if;
  denied := false;
  begin perform 1 from public.account_settings; exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'RLS_TEST_FAILED: anon can read account_settings'; end if;
  denied := false;
  begin perform 1 from public.user_roles; exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'RLS_TEST_FAILED: anon can read user_roles'; end if;
  denied := false;
  begin
    insert into public.jobs (slug, job_title, company_name, role_category, job_type, remote_policy)
    values ('rls-test', 'x', 'x', 'UI/UX Design', 'Full-time', 'Remote');
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'RLS_TEST_FAILED: anon can insert legacy jobs'; end if;
  denied := false;
  begin update public.jobs set job_title = 'x'; exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'RLS_TEST_FAILED: anon can update legacy jobs'; end if;
  checks := checks + 5;

  reset role;

  ---------------------------------------------------------------------------
  -- Client B (private profile)
  ---------------------------------------------------------------------------
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);

  select count(*) into n from public.profiles where id in (a, b, c, m, s);
  if n <> 4 then raise exception 'RLS_TEST_FAILED: client sees % profiles (expected 4: a, m, s, self)', n; end if;
  if exists (select 1 from public.profiles where id = c) then
    raise exception 'RLS_TEST_FAILED: user can see another non-onboarded profile';
  end if;

  update public.profiles set display_name = 'Bahar K.' where id = b;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'RLS_TEST_FAILED: user cannot update own profile'; end if;

  update public.profiles set display_name = 'hacked' where id = a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS_TEST_FAILED: user can update another profile'; end if;
  checks := checks + 4;

  denied := false;
  begin update public.profiles set account_status = 'active' where id = b; exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'RLS_TEST_FAILED: user can change own account_status'; end if;
  denied := false;
  begin update public.profiles set onboarded_at = null where id = b; exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'RLS_TEST_FAILED: user can change onboarded_at'; end if;
  denied := false;
  begin update public.profiles set id = gen_random_uuid() where id = b; exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'RLS_TEST_FAILED: user can change profile id'; end if;
  checks := checks + 3;

  select count(*) into n from public.account_settings;
  if n <> 1 then raise exception 'RLS_TEST_FAILED: user sees % settings rows (expected 1)', n; end if;
  update public.account_settings set marketing_emails = true where user_id = a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS_TEST_FAILED: user can update another user''s settings'; end if;

  select count(*) into n from public.user_roles;
  if n <> 0 then raise exception 'RLS_TEST_FAILED: regular user sees % role rows', n; end if;

  denied := false;
  begin insert into public.user_roles (user_id, role, granted_by) values (b, 'admin', b);
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'RLS_TEST_FAILED: user can self-grant admin'; end if;

  -- storage: own folder allowed, other folder denied
  insert into storage.objects (bucket_id, name, owner_id) values ('avatars', b || '/avatar.png', b::text);
  denied := false;
  begin insert into storage.objects (bucket_id, name, owner_id) values ('avatars', a || '/avatar.png', b::text);
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'RLS_TEST_FAILED: user can write into another user''s avatar folder'; end if;
  checks := checks + 6;

  reset role;

  ---------------------------------------------------------------------------
  -- User C: onboarding through their own update
  ---------------------------------------------------------------------------
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  update public.profiles set username = 'new.user', is_freelancer = true where id = c;
  if (select onboarded_at from public.profiles where id = c) is null then
    raise exception 'RLS_TEST_FAILED: onboarding via own update did not set onboarded_at';
  end if;
  denied := false;
  begin update public.profiles set username = 'admin' where id = c; exception when check_violation then denied := true; end;
  if not denied then raise exception 'RLS_TEST_FAILED: reserved username accepted'; end if;
  checks := checks + 2;
  reset role;

  ---------------------------------------------------------------------------
  -- Moderator M
  ---------------------------------------------------------------------------
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', m, 'role', 'authenticated')::text, true);
  select count(*) into n from public.profiles where id in (a, b, c, m, s);
  if n <> 5 then raise exception 'RLS_TEST_FAILED: moderator sees % profiles (expected 5)', n; end if;
  select count(*) into n from public.user_roles;
  if n <> 1 then raise exception 'RLS_TEST_FAILED: moderator sees % role rows (expected own only)', n; end if;
  denied := false;
  begin insert into public.user_roles (user_id, role, granted_by) values (c, 'moderator', m);
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'RLS_TEST_FAILED: moderator can grant roles'; end if;
  update public.profiles set display_name = 'x' where id = a;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS_TEST_FAILED: moderator can edit other profiles directly'; end if;
  checks := checks + 4;
  reset role;

  ---------------------------------------------------------------------------
  -- Admin S
  ---------------------------------------------------------------------------
  set local role authenticated;
  perform set_config('request.jwt.claims', json_build_object('sub', s, 'role', 'authenticated')::text, true);
  select count(*) into n from public.user_roles where user_id in (m, s);
  if n <> 2 then raise exception 'RLS_TEST_FAILED: admin sees % role rows (expected 2)', n; end if;
  insert into public.user_roles (user_id, role, granted_by) values (c, 'moderator', s);
  denied := false;
  begin insert into public.user_roles (user_id, role, granted_by) values (a, 'moderator', b);
  exception when insufficient_privilege then denied := true; end;
  if not denied then raise exception 'RLS_TEST_FAILED: admin can forge granted_by'; end if;
  delete from public.user_roles where user_id = s;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'RLS_TEST_FAILED: admin can remove own admin role (lockout risk)'; end if;
  delete from public.user_roles where user_id = c and role = 'moderator';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'RLS_TEST_FAILED: admin cannot revoke another user''s role'; end if;
  checks := checks + 4;
  reset role;

  raise exception 'RLS_TESTS_PASSED (% checks)', checks;
end
$tests$;
