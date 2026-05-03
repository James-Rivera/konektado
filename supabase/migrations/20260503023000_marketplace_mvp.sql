-- Marketplace MVP surface: services, conversations, messages, saved items,
-- reviews, admin verification review, and compatibility extensions for jobs.

create extension if not exists pgcrypto;

create or replace function public.is_barangay_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'barangay_admin'
  );
$$;

create or replace function public.is_verified_profile(profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = profile_id
      and coalesce(barangay_verified_at, verified_at) is not null
  );
$$;

create or replace function public.protect_profile_verification_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_barangay_admin() then
    return new;
  end if;

  if new.verified_at is distinct from old.verified_at
    or new.barangay_verified_at is distinct from old.barangay_verified_at then
    raise exception 'Only barangay admins can update verification fields.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_verification_fields on public.profiles;
create trigger protect_profile_verification_fields
before update on public.profiles
for each row execute function public.protect_profile_verification_fields();

alter table public.jobs
  add column if not exists client_id uuid references public.profiles(id) on delete cascade,
  add column if not exists category text,
  add column if not exists barangay text default 'Barangay San Pedro',
  add column if not exists location_text text,
  add column if not exists budget_amount numeric,
  add column if not exists schedule_text text,
  add column if not exists accepted_provider_id uuid references public.profiles(id) on delete set null,
  add column if not exists closed_at timestamptz;

update public.jobs
set
  client_id = coalesce(client_id, owner_id),
  location_text = coalesce(location_text, location),
  budget_amount = coalesce(budget_amount, budget)
where client_id is null
   or location_text is null
   or budget_amount is null;

create index if not exists jobs_client_id_idx on public.jobs(client_id);
create index if not exists jobs_category_idx on public.jobs(category);
create index if not exists jobs_barangay_idx on public.jobs(barangay);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles(id) on delete cascade,
  category text not null,
  title text not null,
  description text,
  years_experience numeric,
  availability_text text,
  rate_text text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists services_provider_id_idx on public.services(provider_id);
create index if not exists services_category_idx on public.services(category);
create index if not exists services_is_active_idx on public.services(is_active);

drop trigger if exists set_services_updated_at on public.services;
create trigger set_services_updated_at
before update on public.services
for each row execute function public.set_updated_at();

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.jobs(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  client_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.profiles(id) on delete cascade,
  started_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (
    status in ('active', 'hired', 'declined', 'archived', 'reported')
  ),
  hired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (client_id <> provider_id)
);

create unique index if not exists conversations_job_provider_unique_idx
on public.conversations(job_id, provider_id)
where job_id is not null;

create index if not exists conversations_client_id_idx on public.conversations(client_id);
create index if not exists conversations_provider_id_idx on public.conversations(provider_id);
create index if not exists conversations_updated_at_idx on public.conversations(updated_at desc);

drop trigger if exists set_conversations_updated_at on public.conversations;
create trigger set_conversations_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on public.messages(conversation_id);
create index if not exists messages_created_at_idx on public.messages(created_at);

create table if not exists public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_type text not null check (item_type in ('job', 'provider')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);

create index if not exists saved_items_user_id_idx on public.saved_items(user_id);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete cascade,
  reviewee_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, reviewer_id, reviewee_id)
);

create index if not exists reviews_job_id_idx on public.reviews(job_id);
create index if not exists reviews_reviewee_id_idx on public.reviews(reviewee_id);

drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

alter table public.services enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.saved_items enable row level security;
alter table public.reviews enable row level security;

drop policy if exists "profiles_select_public_or_admin" on public.profiles;
create policy "profiles_select_public_or_admin"
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or coalesce(barangay_verified_at, verified_at) is not null
  or public.is_barangay_admin()
);

drop policy if exists "profiles_update_admin_verification" on public.profiles;
create policy "profiles_update_admin_verification"
on public.profiles for update
to authenticated
using (public.is_barangay_admin())
with check (public.is_barangay_admin());

drop policy if exists "user_roles_select_admin" on public.user_roles;
create policy "user_roles_select_admin"
on public.user_roles for select
to authenticated
using (public.is_barangay_admin());

drop policy if exists "verifications_select_admin" on public.verifications;
create policy "verifications_select_admin"
on public.verifications for select
to authenticated
using (public.is_barangay_admin());

drop policy if exists "verifications_review_admin" on public.verifications;
create policy "verifications_review_admin"
on public.verifications for update
to authenticated
using (public.is_barangay_admin())
with check (public.is_barangay_admin());

drop policy if exists "verification_files_select_admin" on public.verification_files;
create policy "verification_files_select_admin"
on public.verification_files for select
to authenticated
using (public.is_barangay_admin());

drop policy if exists "jobs_select_open_or_participant" on public.jobs;
drop policy if exists "jobs_select_open_or_own" on public.jobs;
create policy "jobs_select_open_or_participant"
on public.jobs for select
to authenticated
using (
  status in ('open', 'reviewing')
  or coalesce(client_id, owner_id) = auth.uid()
  or accepted_provider_id = auth.uid()
  or public.is_barangay_admin()
);

drop policy if exists "jobs_insert_verified_own" on public.jobs;
drop policy if exists "jobs_insert_own" on public.jobs;
create policy "jobs_insert_verified_own"
on public.jobs for insert
to authenticated
with check (
  coalesce(client_id, owner_id) = auth.uid()
  and owner_id = auth.uid()
  and public.is_verified_profile(auth.uid())
);

drop policy if exists "jobs_update_verified_owner" on public.jobs;
drop policy if exists "jobs_update_own" on public.jobs;
create policy "jobs_update_verified_owner"
on public.jobs for update
to authenticated
using (coalesce(client_id, owner_id) = auth.uid() or public.is_barangay_admin())
with check (coalesce(client_id, owner_id) = auth.uid() or public.is_barangay_admin());

drop policy if exists "services_select_active_or_owner" on public.services;
create policy "services_select_active_or_owner"
on public.services for select
to authenticated
using (is_active or provider_id = auth.uid() or public.is_barangay_admin());

drop policy if exists "services_insert_verified_owner" on public.services;
create policy "services_insert_verified_owner"
on public.services for insert
to authenticated
with check (provider_id = auth.uid() and public.is_verified_profile(auth.uid()));

drop policy if exists "services_update_verified_owner" on public.services;
create policy "services_update_verified_owner"
on public.services for update
to authenticated
using (provider_id = auth.uid() or public.is_barangay_admin())
with check (provider_id = auth.uid() or public.is_barangay_admin());

drop policy if exists "conversations_select_participant" on public.conversations;
create policy "conversations_select_participant"
on public.conversations for select
to authenticated
using (client_id = auth.uid() or provider_id = auth.uid() or public.is_barangay_admin());

drop policy if exists "conversations_insert_verified_participant" on public.conversations;
create policy "conversations_insert_verified_participant"
on public.conversations for insert
to authenticated
with check (
  started_by = auth.uid()
  and (client_id = auth.uid() or provider_id = auth.uid())
  and public.is_verified_profile(auth.uid())
);

drop policy if exists "conversations_update_verified_participant" on public.conversations;
create policy "conversations_update_verified_participant"
on public.conversations for update
to authenticated
using (client_id = auth.uid() or provider_id = auth.uid() or public.is_barangay_admin())
with check (client_id = auth.uid() or provider_id = auth.uid() or public.is_barangay_admin());

drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant"
on public.messages for select
to authenticated
using (
  exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (c.client_id = auth.uid() or c.provider_id = auth.uid() or public.is_barangay_admin())
  )
);

drop policy if exists "messages_insert_verified_participant" on public.messages;
create policy "messages_insert_verified_participant"
on public.messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_verified_profile(auth.uid())
  and exists (
    select 1
    from public.conversations c
    where c.id = conversation_id
      and (c.client_id = auth.uid() or c.provider_id = auth.uid())
  )
);

drop policy if exists "saved_items_select_own" on public.saved_items;
create policy "saved_items_select_own"
on public.saved_items for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "saved_items_insert_verified_own" on public.saved_items;
create policy "saved_items_insert_verified_own"
on public.saved_items for insert
to authenticated
with check (user_id = auth.uid() and public.is_verified_profile(auth.uid()));

drop policy if exists "saved_items_delete_own" on public.saved_items;
create policy "saved_items_delete_own"
on public.saved_items for delete
to authenticated
using (user_id = auth.uid());

drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public"
on public.reviews for select
to authenticated
using (true);

drop policy if exists "reviews_insert_verified_participant" on public.reviews;
create policy "reviews_insert_verified_participant"
on public.reviews for insert
to authenticated
with check (
  reviewer_id = auth.uid()
  and public.is_verified_profile(auth.uid())
  and exists (
    select 1
    from public.jobs j
    where j.id = job_id
      and j.status = 'completed'
      and (
        coalesce(j.client_id, j.owner_id) = auth.uid()
        or j.accepted_provider_id = auth.uid()
      )
      and (
        coalesce(j.client_id, j.owner_id) = reviewee_id
        or j.accepted_provider_id = reviewee_id
      )
  )
);

drop policy if exists "reviews_update_own" on public.reviews;
create policy "reviews_update_own"
on public.reviews for update
to authenticated
using (reviewer_id = auth.uid())
with check (reviewer_id = auth.uid());

notify pgrst, 'reload schema';
