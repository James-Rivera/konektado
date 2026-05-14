-- Split address refinements for fixed service-area onboarding.
-- Existing columns remain for backward compatibility; new fields keep
-- public approximate location separate from private coordination details.

alter table public.profiles
  add column if not exists province text,
  add column if not exists subdivision_area text,
  add column if not exists landmark_note text;

update public.profiles
set
  province = coalesce(nullif(province, ''), 'Batangas'),
  city = case
    when city in ('Sto. Tomas', 'Sto Tomas') then 'Santo Tomas'
    else coalesce(nullif(city, ''), 'Santo Tomas')
  end,
  barangay = case
    when barangay in ('Barangay San Pedro', 'Brgy. San Pedro', 'Brgy San Pedro') then 'San Pedro'
    else coalesce(nullif(barangay, ''), 'San Pedro')
  end;

notify pgrst, 'reload schema';
