-- Restores the username requirement for onboarding and drops the digit preference (data in that column is lost).
create or replace function private.profiles_before_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if new.onboarded_at is null and new.username is not null and (new.is_freelancer or new.is_client) then
    new.onboarded_at := now();
  end if;
  return new;
end;
$$;
alter table public.account_settings drop column digit_style;
