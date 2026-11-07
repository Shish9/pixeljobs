-- Restores the previous (insecure) state. Only use if the legacy ingestion depended on anon writes.
grant insert, update, delete, truncate, references, trigger on table public.jobs to anon, authenticated;
create policy "Service role can insert jobs" on public.jobs for insert to public with check (true);
create policy "Service role can update jobs" on public.jobs for update to public using (true);
alter function public.update_updated_at_column() reset search_path;
grant execute on function public.rls_auto_enable() to public, anon, authenticated;
