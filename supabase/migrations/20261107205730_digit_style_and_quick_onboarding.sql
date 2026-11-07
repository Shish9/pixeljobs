-- Digit style preference (Arabic-Indic ١٢٣ vs Western 123), private per user.
alter table public.account_settings
  add column digit_style text not null default 'native' check (digit_style in ('native', 'latin'));
grant update (digit_style) on table public.account_settings to authenticated;

-- Shorter onboarding: choosing a marketplace mode is enough; the username can be set later in Settings.
create or replace function private.profiles_before_update()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  if new.onboarded_at is null and (new.is_freelancer or new.is_client) then
    new.onboarded_at := now();
  end if;
  return new;
end;
$$;
