-- Store provider onboarding work setup separately from official taxonomy services.

alter table public.user_preferences
  add column if not exists offered_delivery_mode text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'user_preferences_offered_delivery_mode_supported'
  ) then
    alter table public.user_preferences
      add constraint user_preferences_offered_delivery_mode_supported
      check (
        offered_delivery_mode is null
        or offered_delivery_mode in ('on_site', 'online', 'both')
      );
  end if;
end $$;

notify pgrst, 'reload schema';
