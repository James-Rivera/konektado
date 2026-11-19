-- Additive complaint/review repair. Historical reports/reviews are retained.
begin;

alter table public.reports
  add column review_id uuid references public.reviews(id) on delete restrict,
  add column resolution_message text;
create index reports_review_id_idx on public.reports(review_id) where review_id is not null;
alter table public.reports drop constraint reports_target_check;
alter table public.reports add constraint reports_target_check check (
  reported_user_id is not null or job_id is not null or service_id is not null
  or conversation_id is not null or review_id is not null);

-- Internal state and append-only decisions are deliberately outside the API schema.
create table app_private.review_moderation (
  review_id uuid primary key references public.reviews(id) on delete restrict,
  hidden boolean not null,
  updated_at timestamptz not null default now()
);
create table app_private.report_decisions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete restrict,
  reviewed_by uuid not null references public.profiles(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  status text not null check (status in ('open','reviewing','resolved','dismissed')),
  admin_notes text,
  resolution_message text,
  review_action text check (review_action in ('hide','restore'))
);
revoke all on app_private.review_moderation, app_private.report_decisions from public, anon, authenticated;

create function public.is_review_visible(p_review_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists(select 1 from app_private.review_moderation m
    where m.review_id = p_review_id and m.hidden);
$$;
revoke all on function public.is_review_visible(uuid) from public, anon;
grant execute on function public.is_review_visible(uuid) to authenticated;
-- Restrictive policy composes with the existing completed/hired relationship policy.
create policy reviews_hide_moderated on public.reviews as restrictive for select to authenticated
using (public.is_review_visible(id));

create function app_private.guard_report_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare r public.reviews%rowtype; c public.conversations%rowtype; owner_id uuid;
begin
  if auth.uid() is null or new.reporter_id is distinct from auth.uid() then
    raise exception 'Reports must belong to the signed-in resident.';
  end if;
  if new.status is distinct from 'open' or new.reviewed_by is not null
    or new.reviewed_at is not null or new.admin_notes is not null or new.resolution_message is not null then
    raise exception 'New reports must be open without administrative review fields.';
  end if;
  new.created_at := now(); new.updated_at := now();
  new.reason := nullif(trim(new.reason), '');
  new.details := nullif(trim(new.details), '');
  if new.reason is null or length(new.reason)>200 or length(coalesce(new.details,''))>10000 then
    raise exception 'Enter a report reason (up to 200 characters) and details up to 10000 characters.';
  end if;
  if new.review_id is not null then
    if not public.is_verified_profile(auth.uid()) then raise exception 'Barangay verification is required to report a review.'; end if;
    select v.* into r from public.reviews v join public.jobs j on j.id=v.job_id
    where v.id=new.review_id and public.is_review_visible(v.id) and j.status='completed'
      and ((v.reviewer_id=coalesce(j.client_id,j.owner_id) and v.reviewee_id=j.accepted_provider_id)
        or (v.reviewer_id=j.accepted_provider_id and v.reviewee_id=coalesce(j.client_id,j.owner_id)))
      and exists(select 1 from public.conversations x where x.job_id=j.id
        and x.client_id=coalesce(j.client_id,j.owner_id) and x.provider_id=j.accepted_provider_id and x.hired_at is not null);
    if r.id is null or new.conversation_id is not null or new.service_id is not null
      or (new.job_id is not null and new.job_id<>r.job_id)
      or (new.reported_user_id is not null and new.reported_user_id<>r.reviewer_id) then
      raise exception 'Choose a visible completed-job review without conflicting report targets.';
    end if;
    new.job_id := r.job_id; new.reported_user_id := r.reviewer_id;
  elsif new.conversation_id is not null then
    select * into c from public.conversations where id=new.conversation_id;
    if c.id is null or auth.uid() not in (c.client_id,c.provider_id)
      or (new.job_id is not null and new.job_id is distinct from c.job_id)
      or (new.service_id is not null and new.service_id is distinct from c.service_id) then
      raise exception 'Only participants can report this conversation with its actual context.';
    end if;
    owner_id := case when c.client_id=auth.uid() then c.provider_id else c.client_id end;
    if new.reported_user_id is not null and new.reported_user_id<>owner_id then
      raise exception 'The reported resident must match this conversation.';
    end if;
    new.job_id:=c.job_id; new.service_id:=c.service_id; new.reported_user_id:=owner_id;
  elsif new.job_id is not null then
    select coalesce(j.client_id,j.owner_id) into owner_id from public.jobs j where j.id=new.job_id
      and (coalesce(j.client_id,j.owner_id)=auth.uid() or j.accepted_provider_id=auth.uid()
        or public.is_barangay_admin() or (j.status in ('open','reviewing') and public.is_verified_profile(coalesce(j.client_id,j.owner_id))));
    if owner_id is null or new.service_id is not null
      or (new.reported_user_id is not null and new.reported_user_id<>owner_id) then
      raise exception 'Choose an accessible job with its actual owner and no conflicting service target.';
    end if;
    new.reported_user_id:=owner_id;
  elsif new.service_id is not null then
    select s.provider_id into owner_id from public.services s where s.id=new.service_id
      and (s.provider_id=auth.uid() or public.is_barangay_admin() or (s.is_active and public.is_verified_profile(s.provider_id)));
    if owner_id is null or (new.reported_user_id is not null and new.reported_user_id<>owner_id) then
      raise exception 'Choose an accessible service with its actual provider.';
    end if;
    new.reported_user_id:=owner_id;
  end if;
  return new;
end;
$$;
revoke all on function app_private.guard_report_insert() from public, anon, authenticated;
create trigger guard_report_insert before insert on public.reports
for each row execute function app_private.guard_report_insert();

create or replace function public.protect_report_immutable_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (new.id,new.reporter_id,new.reported_user_id,new.job_id,new.service_id,new.conversation_id,
      new.review_id,new.reason,new.details,new.created_at)
    is distinct from (old.id,old.reporter_id,old.reported_user_id,old.job_id,old.service_id,old.conversation_id,
      old.review_id,old.reason,old.details,old.created_at) then
    raise exception 'Report target and content fields cannot be changed after submission.';
  end if;
  return new;
end;
$$;
revoke all on function public.protect_report_immutable_fields() from public, anon, authenticated;

-- A row policy cannot protect a confidential column. Remove table and column
-- grants first; admins use checked RPCs rather than the resident table API.
revoke select, insert, update, delete, truncate, references, trigger on public.reports from public,anon,authenticated;
do $$ declare cols text; begin
  select string_agg(quote_ident(attname),', ') into cols from pg_attribute
  where attrelid='public.reports'::regclass and attnum>0 and not attisdropped;
  execute format('revoke select (%1$s), insert (%1$s), update (%1$s), references (%1$s) on public.reports from public,anon,authenticated',cols);
end $$;
grant select(id,reporter_id,reported_user_id,job_id,service_id,conversation_id,review_id,reason,details,status,
  created_at,updated_at,reviewed_at,resolution_message) on public.reports to authenticated;
grant insert(id,reporter_id,reported_user_id,job_id,service_id,conversation_id,review_id,reason,details)
  on public.reports to authenticated;

create function public.get_admin_report_page(p_limit integer default 30,p_offset integer default 0,
  p_statuses text[] default null,p_received_only boolean default false)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if auth.uid() is null or not public.is_barangay_admin() then raise exception 'Barangay admin access is required.'; end if;
  if p_statuses is not null and not p_statuses <@ array['open','reviewing','resolved','dismissed']::text[] then raise exception 'Choose a valid report status.'; end if;
  with filtered as (
    select r.* from public.reports r where (p_statuses is null or r.status=any(p_statuses))
      and (not coalesce(p_received_only,false) or (r.status='open' and r.reviewed_at is null))
  ), page as (
    select f.*, (f.review_id is not null and not public.is_review_visible(f.review_id)) as review_hidden
    from filtered f order by f.created_at desc,f.id desc
    limit least(greatest(coalesce(p_limit,30),1),100) offset greatest(coalesce(p_offset,0),0)
  )
  select jsonb_build_object('reports',coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id desc) from page p),'[]'::jsonb),
    'total',(select count(*) from filtered),
    'counts',(select jsonb_build_object('open',count(*) filter(where status='open'),
      'reviewing',count(*) filter(where status='reviewing'),'resolved',count(*) filter(where status='resolved'),
      'dismissed',count(*) filter(where status='dismissed'),'received',count(*) filter(where status='open' and reviewed_at is null)) from public.reports)) into result;
  return result;
end;
$$;
revoke all on function public.get_admin_report_page(integer,integer,text[],boolean) from public,anon;
grant execute on function public.get_admin_report_page(integer,integer,text[],boolean) to authenticated;

create function public.get_admin_report_detail(p_report_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r public.reports%rowtype; target jsonb; history jsonb;
begin
  if auth.uid() is null or not public.is_barangay_admin() then raise exception 'Barangay admin access is required.'; end if;
  select * into r from public.reports where id=p_report_id;
  if r.id is null then raise exception 'Report not found.'; end if;
  if r.review_id is not null then
    select jsonb_build_object('title','Reported review','body',v.comment,'rating',v.rating)
      into target from public.reviews v where v.id=r.review_id;
  elsif r.conversation_id is not null then
    if not app_private.can_moderate_reported_conversation(r.conversation_id) then raise exception 'Reported conversation access is required.'; end if;
    select jsonb_build_object('title','Reported conversation','body',null,'messages',coalesce(jsonb_agg(to_jsonb(m) order by m."createdAt",m.id),'[]'::jsonb)) into target
    from (select id,sender_id as "senderId",body,created_at as "createdAt" from public.messages
      where conversation_id=r.conversation_id order by created_at desc,id desc limit 50) m;
  elsif r.job_id is not null then
    select jsonb_build_object('title',title,'body',description) into target from public.jobs where id=r.job_id;
  elsif r.service_id is not null then
    select jsonb_build_object('title',title,'body',description) into target from public.services where id=r.service_id;
  else
    select jsonb_build_object('title',full_name,'body',about) into target from public.profiles where id=r.reported_user_id;
  end if;
  select coalesce(jsonb_agg(to_jsonb(d) order by d.reviewed_at desc,d.id desc),'[]'::jsonb) into history
    from app_private.report_decisions d where d.report_id=r.id;
  return to_jsonb(r)||jsonb_build_object('review_hidden',r.review_id is not null and not public.is_review_visible(r.review_id),
    'target_details',target,'decisions',history);
end;
$$;
revoke all on function public.get_admin_report_detail(uuid) from public,anon;
grant execute on function public.get_admin_report_detail(uuid) to authenticated;

create function public.review_report(p_report_id uuid,p_status text,p_admin_notes text default null,
  p_resolution_message text default null,p_review_action text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.reports%rowtype; note text:=nullif(trim(p_admin_notes),''); outcome text:=nullif(trim(p_resolution_message),'');
begin
  if auth.uid() is null or not public.is_barangay_admin() then raise exception 'Barangay admin access is required.'; end if;
  if p_status is null or p_status not in ('open','reviewing','resolved','dismissed') then raise exception 'Choose a valid report status.'; end if;
  if length(coalesce(note,''))>10000 or length(coalesce(outcome,''))>2000 then raise exception 'Notes or outcome are too long.'; end if;
  if p_status in ('resolved','dismissed') and outcome is null then raise exception 'Explain the outcome to the reporter before closing this report.'; end if;
  select * into r from public.reports where id=p_report_id for update;
  if r.id is null then raise exception 'Report not found.'; end if;
  if p_review_action is not null then
    if p_review_action not in ('hide','restore') or r.review_id is null or note is null then
      raise exception 'Review moderation requires a review report and an internal reason.';
    end if;
    perform 1 from public.reviews where id=r.review_id for update;
    insert into app_private.review_moderation(review_id,hidden) values(r.review_id,p_review_action='hide')
      on conflict(review_id) do update set hidden=excluded.hidden,updated_at=now();
  end if;
  update public.reports set status=p_status,admin_notes=note,resolution_message=outcome,
    reviewed_by=auth.uid(),reviewed_at=now() where id=r.id;
  insert into app_private.report_decisions(report_id,reviewed_by,status,admin_notes,resolution_message,review_action)
    values(r.id,auth.uid(),p_status,note,outcome,p_review_action);
  return public.get_admin_report_detail(r.id);
end;
$$;
revoke all on function public.review_report(uuid,text,text,text,text) from public,anon;
grant execute on function public.review_report(uuid,text,text,text,text) to authenticated;

create or replace function public.get_public_profile_trust_summary(
  p_user_id uuid,
  p_role text,
  p_limit integer default 6
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  safe_limit integer := least(greatest(coalesce(p_limit, 6), 1), 12);
begin
  if p_role not in ('worker', 'client') then
    raise exception 'Choose worker or client trust history.';
  end if;

  if not exists (
    select 1 from public.profiles p
    where p.id = p_user_id
      and (
        public.is_verified_profile(p.id)
        or p.id = auth.uid()
        or public.is_barangay_admin()
      )
  ) then
    return null;
  end if;

  with valid_reviews as (
    select
      r.id,
      r.job_id,
      r.reviewer_id,
      r.reviewee_id,
      r.rating,
      r.comment,
      r.created_at,
      j.title as job_title,
      coalesce(j.service_needed, j.category) as service_label,
      coalesce(j.closed_at, j.updated_at) as completed_at
    from public.reviews r
    join public.jobs j on j.id = r.job_id and j.status = 'completed'
    where r.reviewee_id = p_user_id and public.is_review_visible(r.id)
      and (
        (
          p_role = 'worker'
          and j.accepted_provider_id = p_user_id
          and r.reviewer_id = coalesce(j.client_id, j.owner_id)
        )
        or
        (
          p_role = 'client'
          and coalesce(j.client_id, j.owner_id) = p_user_id
          and r.reviewer_id = j.accepted_provider_id
        )
      )
      and exists (
        select 1 from public.conversations c
        where c.job_id = j.id
          and c.client_id = coalesce(j.client_id, j.owner_id)
          and c.provider_id = j.accepted_provider_id
          and c.hired_at is not null
      )
  ),
  role_jobs as (
    select
      j.id,
      j.title,
      coalesce(j.service_needed, j.category) as service_label,
      coalesce(j.closed_at, j.updated_at) as completed_at
    from public.jobs j
    where j.status = 'completed'
      and (
        (p_role = 'worker' and j.accepted_provider_id = p_user_id)
        or
        (p_role = 'client' and coalesce(j.client_id, j.owner_id) = p_user_id)
      )
      and exists (
        select 1 from public.conversations c
        where c.job_id = j.id
          and c.client_id = coalesce(j.client_id, j.owner_id)
          and c.provider_id = j.accepted_provider_id
          and c.hired_at is not null
      )
  )
  select jsonb_build_object(
    'averageRating', (select avg(rating)::numeric(3,2) from valid_reviews),
    'reviewCount', (select count(*) from valid_reviews),
    'completedJobsCount', (select count(*) from role_jobs),
    'jobsPostedCount', (
      select case when p_role = 'client' then count(*) else 0 end
      from public.jobs j
      where coalesce(j.client_id, j.owner_id) = p_user_id
    ),
    'recentReviews', coalesce((
      select jsonb_agg(to_jsonb(review_rows) order by review_rows.created_at desc)
      from (
        select *
        from valid_reviews
        order by created_at desc
        limit safe_limit
      ) review_rows
    ), '[]'::jsonb),
    'recentHistory', coalesce((
      select jsonb_agg(to_jsonb(history_rows) order by history_rows.completed_at desc)
      from (
        select *
        from role_jobs
        order by completed_at desc
        limit safe_limit
      ) history_rows
    ), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

revoke all on function public.get_public_profile_trust_summary(uuid, text, integer) from public, anon;
grant execute on function public.get_public_profile_trust_summary(uuid, text, integer) to authenticated;


-- Only the explicitly reporter-facing message enters the resident notification.
create or replace function public.notify_report_status_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status is not distinct from old.status and new.resolution_message is not distinct from old.resolution_message then return new; end if;
  insert into public.notifications(user_id,type,title,body,route,metadata)
  values(new.reporter_id,'report_status_updated','Report updated',
    'Your report is now marked as '||replace(new.status,'_',' ')||'.'||case when nullif(trim(new.resolution_message),'') is not null then E'\n\n'||new.resolution_message else '' end,
    null,jsonb_build_object('report_id',new.id,'status',new.status));
  return new;
end;
$$;
revoke all on function public.notify_report_status_change() from public,anon,authenticated;
drop trigger if exists notify_report_status_after_update on public.reports;
create trigger notify_report_status_after_update after update of status,resolution_message on public.reports
for each row execute function public.notify_report_status_change();

notify pgrst, 'reload schema';
commit;
