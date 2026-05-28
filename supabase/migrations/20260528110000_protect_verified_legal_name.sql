-- Protect verified/legal profile name fields after barangay verification submission.
-- Normal users may correct the name only when the latest verification was returned
-- for an explicit name mismatch/name correction reason.

create or replace function public.is_name_correction_reviewer_note(p_note text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p_note, '') ~* '(name does not match|name mismatch|name correction|legal name)';
$$;

create or replace function public.protect_profile_verification_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_identity_changed boolean;
  v_latest_status text;
  v_latest_reviewer_note text;
begin
  if public.is_barangay_admin() then
    return new;
  end if;

  if new.verified_at is distinct from old.verified_at
    or new.barangay_verified_at is distinct from old.barangay_verified_at then
    raise exception 'Only barangay admins can update verification fields.';
  end if;

  v_identity_changed :=
    new.first_name is distinct from old.first_name
    or new.last_name is distinct from old.last_name
    or new.full_name is distinct from old.full_name;

  if v_identity_changed then
    select status, reviewer_note
      into v_latest_status, v_latest_reviewer_note
    from public.verifications
    where user_id = old.id
    order by created_at desc
    limit 1;

    if coalesce(old.barangay_verified_at, old.verified_at) is not null
      or v_latest_status in ('pending', 'approved', 'rejected', 'needs_more_info') then
      if v_latest_status = 'needs_more_info'
        and public.is_name_correction_reviewer_note(v_latest_reviewer_note) then
        return new;
      end if;

      raise exception 'Verified/legal name is locked after barangay verification submission. Barangay staff must return the request for name correction before it can be changed.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_verification_fields on public.profiles;
create trigger protect_profile_verification_fields
before update on public.profiles
for each row execute function public.protect_profile_verification_fields();

revoke all on function public.is_name_correction_reviewer_note(text) from public;
grant execute on function public.is_name_correction_reviewer_note(text) to authenticated;

notify pgrst, 'reload schema';
