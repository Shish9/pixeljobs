-- Harden the pre-existing legacy `jobs` table (created outside of migrations).
-- Non-destructive: no rows or columns are changed.
--
-- The policies "Service role can insert jobs" / "Service role can update jobs" were attached to the
-- PUBLIC role with `true` expressions, so ANY client holding the public anon key could insert or edit
-- jobs. The service role bypasses RLS and never needed them.

drop policy if exists "Service role can insert jobs" on public.jobs;
drop policy if exists "Service role can update jobs" on public.jobs;

-- Public read of active jobs stays ("Public can view active jobs"). Remove write privileges from API roles.
revoke insert, update, delete, truncate, references, trigger on table public.jobs from anon, authenticated;

-- Linter 0011: pin search_path on the existing trigger function.
alter function public.update_updated_at_column() set search_path = '';

-- Linter 0028/0029: the event-trigger helper must not be callable through the REST API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

comment on table public.jobs is
  'Legacy job board (read-only in the app). Written only with the service role / dashboard.';
