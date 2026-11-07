-- WARNING: destroys ALL marketplace data (services, requests, projects, proposals, portfolio, saved items,
-- profile details). Requires explicit approval. Empty the `media` bucket via the Storage API first.
drop policy if exists "Users read own media objects" on storage.objects;
drop policy if exists "Users upload own media" on storage.objects;
drop policy if exists "Users delete own media" on storage.objects;
drop table if exists public.saved_items, public.proposals, public.projects, public.service_requests,
  public.service_packages, public.services, public.portfolio_items, public.profile_entries cascade;
drop function if exists private.proposals_after_update(), private.proposals_before_update(), private.proposals_before_insert(),
  private.projects_before_write(), private.service_requests_before_update(), private.service_requests_before_insert(),
  private.services_before_write(), private.guard_content_status(), private.is_active_profile(uuid),
  private.enforce_daily_limit(regclass, text, int), private.email_confirmed();
alter table public.profiles drop column if exists website_url, drop column if exists rate_currency,
  drop column if exists rate_minor, drop column if exists availability, drop column if exists languages, drop column if exists skills;
drop function if exists private.text_array_ok(text[], int);
drop domain if exists public.lang_key, public.city_key, public.category_key;
