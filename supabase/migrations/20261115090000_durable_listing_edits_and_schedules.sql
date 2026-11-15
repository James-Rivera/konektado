-- DEC-141: durable private edits, optimistic concurrency and structured schedules.
begin;
drop trigger validate_job_publish on public.jobs;
drop trigger validate_service_publish on public.services;
alter table public.jobs add column content_version bigint not null default 1;
alter table public.services add column content_version bigint not null default 1;
alter table app_private.marketplace_publications add column draft_revision bigint;
alter table public.jobs
 add column scheduled_date date,
 add column time_preference text,
 add column exact_time time,
 add column schedule_flexibility text,
 add column schedule_timezone text not null default 'Asia/Manila';
alter table public.job_drafts
 add column scheduled_date date,
 add column time_preference text,
 add column exact_time time,
 add column schedule_flexibility text,
 add column schedule_timezone text not null default 'Asia/Manila';
grant select(scheduled_date,time_preference,exact_time,schedule_flexibility,schedule_timezone) on public.jobs to authenticated;
create function app_private.parse_legacy_job_schedule(value text) returns jsonb language plpgsql immutable set search_path=public as $$
declare parts text[]; day date; clock time;
begin
 parts:=regexp_match(btrim(value),'^([A-Z][a-z]{2} [0-9]{1,2}, [0-9]{4}) · (Morning|Afternoon|Evening|Anytime|([1-9]|1[0-2]):[0-5][0-9] (AM|PM)) · (Must be this time|Can coordinate|Fixed|Flexible)$');
 if parts is null then return null; end if;
 day:=to_date(parts[1],'Mon DD, YYYY');
 if to_char(day,'Mon FMDD, YYYY')<>parts[1] then return null; end if;
 if parts[2]~'[AP]M$' then clock:=parts[2]::time; end if;
 return jsonb_build_object('scheduled_date',day,'time_preference',case when clock is not null then 'exact' else lower(parts[2]) end,'exact_time',clock,'schedule_flexibility',case when parts[5] in ('Fixed','Must be this time') then 'fixed' else 'flexible' end,'schedule_timezone','Asia/Manila');
exception when others then return null;
end; $$;
revoke all on function app_private.parse_legacy_job_schedule(text) from public,anon,authenticated;
update public.jobs t set
 scheduled_date=(p.data->>'scheduled_date')::date,time_preference=p.data->>'time_preference',exact_time=(p.data->>'exact_time')::time,schedule_flexibility=p.data->>'schedule_flexibility'
 from (select id,app_private.parse_legacy_job_schedule(schedule_text) data from public.jobs) p
 where t.id=p.id and p.data is not null;
update public.job_drafts t set
 scheduled_date=(p.data->>'scheduled_date')::date,time_preference=p.data->>'time_preference',exact_time=(p.data->>'exact_time')::time,schedule_flexibility=p.data->>'schedule_flexibility'
 from (select id,app_private.parse_legacy_job_schedule(schedule_text) data from public.job_drafts) p
 where t.id=p.id and p.data is not null;
alter table public.job_drafts
 add column source_listing_id uuid references public.jobs(id) on delete cascade,
 add column source_version bigint,
 add column revision bigint not null default 1 check(revision>0),
 add constraint job_draft_source_pair check((source_listing_id is null)=(source_version is null));
create unique index job_edit_draft_per_owner on public.job_drafts(user_id,source_listing_id) where source_listing_id is not null;
alter table public.service_drafts
 add column source_listing_id uuid references public.services(id) on delete cascade,
 add column source_version bigint,
 add column revision bigint not null default 1 check(revision>0),
 add constraint service_draft_source_pair check((source_listing_id is null)=(source_version is null));
create unique index service_edit_draft_per_owner on public.service_drafts(user_id,source_listing_id) where source_listing_id is not null;
create function app_private.bump_listing_version() returns trigger language plpgsql set search_path=public as $$
begin new.content_version:=old.content_version+1; new.updated_at:=clock_timestamp(); return new; end; $$;
create trigger a_job_content_version before update on public.jobs for each row execute function app_private.bump_listing_version();
create trigger a_service_content_version before update on public.services for each row execute function app_private.bump_listing_version();
create function app_private.guard_draft_revision() returns trigger language plpgsql set search_path=public as $$
begin
 if tg_op='INSERT' then
   new.revision:=1;
   if current_user in ('authenticated','anon') and new.source_listing_id is not null then raise exception 'Start an edit from your owned listing.'; end if;
 else
   if new.source_listing_id is distinct from old.source_listing_id or new.user_id is distinct from old.user_id then raise exception 'Draft source cannot be changed.'; end if;
   if current_user in ('authenticated','anon') and new.source_version is distinct from old.source_version then raise exception 'Draft source cannot be changed.'; end if;
   new.revision:=old.revision+1;
 end if;
 new.updated_at:=clock_timestamp(); return new;
end; $$;
create trigger draft_revision before insert or update on public.job_drafts for each row execute function app_private.guard_draft_revision();
create trigger draft_revision before insert or update on public.service_drafts for each row execute function app_private.guard_draft_revision();
create or replace function app_private.validate_listing_payload(kind text, payload jsonb)
returns void language plpgsql set search_path=public as $$
declare lo numeric; hi numeric; unit text; canonical_category text; custom_text text; blocked text;
begin
  if nullif(btrim(payload->>'title'),'') is null or length(payload->>'title') > (case when kind='service' then 80 else 120 end)
    or nullif(btrim(payload->>'description'),'') is null or length(payload->>'description') > 5000 then
    raise exception 'Add a valid title and description before publishing.';
  end if;
  if nullif(btrim(coalesce(payload->>'location_text',payload->>'barangay')),'') is null then raise exception 'Choose a service area.'; end if;
  unit := payload->>'rate_type';
  if unit is null or unit not in ('per_job','per_service','hourly','daily','weekly','per_project','per_visit','per_load','per_order','per_meal','per_session') then raise exception 'Choose a supported price unit.'; end if;
  lo := (payload->>(case when kind='job' then 'budget_min' else 'rate_min' end))::numeric;
  hi := (payload->>(case when kind='job' then 'budget_max' else 'rate_max' end))::numeric;
  if lo is null or hi is null or lo::text in ('NaN','Infinity','-Infinity') or hi::text in ('NaN','Infinity','-Infinity')
    or lo<=0 or hi<lo or round(lo,2)<>lo or round(hi,2)<>hi then raise exception 'Enter a valid price range with at most two decimal places.'; end if;
  if kind='job' then
    select category into canonical_category from (values ('Cleaning','Home & Local Help'),
('Laundry help','Home & Local Help'),
('Errands','Home & Local Help'),
('Delivery help','Home & Local Help'),
('Home assistance','Home & Local Help'),
('Minor home fix help','Home & Local Help'),
('Yard or outdoor help','Home & Local Help'),
('Carpentry','Home & Local Help'),
('Painting','Home & Local Help'),
('Furniture repair or assembly','Home & Local Help'),
('Tutoring','Learning & Digital Help'),
('Encoding','Learning & Digital Help'),
('Canva layout','Learning & Digital Help'),
('Presentation design','Learning & Digital Help'),
('Social media help','Learning & Digital Help'),
('Basic computer lessons','Learning & Digital Help'),
('School project guidance','Learning & Digital Help'),
('Computer setup','Tech & Document Support'),
('Phone setup','Tech & Document Support'),
('WiFi/router help','Tech & Document Support'),
('Printer setup','Tech & Document Support'),
('Basic troubleshooting','Tech & Document Support'),
('Document formatting','Tech & Document Support'),
('Resume or form assistance','Tech & Document Support'),
('Phone or computer repair','Tech & Document Support'),
('Baking','Food & Personal Services'),
('Home-cooked meals','Food & Personal Services'),
('Party food trays','Food & Personal Services'),
('Sewing','Food & Personal Services'),
('Clothing alteration or repair','Food & Personal Services'),
('Manicure or pedicure','Food & Personal Services'),
('Haircut','Food & Personal Services'),
('Makeup','Food & Personal Services'),
('Massage','Food & Personal Services')) taxonomy(service,category) where service=payload->>'service_needed';
    if canonical_category is null or canonical_category is distinct from payload->>'category' then raise exception 'Choose a matching category and service.'; end if;
    if coalesce((payload->>'workers_needed')::integer,1)<>1 then raise exception 'Each job supports one hired provider.'; end if;
    if payload->>'scheduled_date' is null then raise exception 'Choose a job date.'; end if;
    if (payload->>'scheduled_date')::date < (now() at time zone 'Asia/Manila')::date then raise exception 'Choose today or a future job date.'; end if;
    if coalesce(payload->>'time_preference','') not in ('morning','afternoon','evening','anytime','exact') then raise exception 'Choose a time preference.'; end if;
    if payload->>'time_preference'='exact' and nullif(payload->>'exact_time','') is null then raise exception 'Choose an exact time.'; end if;
    if payload->>'time_preference'='exact' then perform (payload->>'exact_time')::time; end if;
    if coalesce(payload->>'schedule_flexibility','') not in ('fixed','flexible') or payload->>'schedule_timezone' is distinct from 'Asia/Manila' then raise exception 'Choose time flexibility in Philippine time.'; end if;
  else
    if payload->>'category'<>'Other service' and not exists(select 1 from (values ('Cleaning','Home & Local Help'),
('Laundry help','Home & Local Help'),
('Errands','Home & Local Help'),
('Delivery help','Home & Local Help'),
('Home assistance','Home & Local Help'),
('Minor home fix help','Home & Local Help'),
('Yard or outdoor help','Home & Local Help'),
('Carpentry','Home & Local Help'),
('Painting','Home & Local Help'),
('Furniture repair or assembly','Home & Local Help'),
('Tutoring','Learning & Digital Help'),
('Encoding','Learning & Digital Help'),
('Canva layout','Learning & Digital Help'),
('Presentation design','Learning & Digital Help'),
('Social media help','Learning & Digital Help'),
('Basic computer lessons','Learning & Digital Help'),
('School project guidance','Learning & Digital Help'),
('Computer setup','Tech & Document Support'),
('Phone setup','Tech & Document Support'),
('WiFi/router help','Tech & Document Support'),
('Printer setup','Tech & Document Support'),
('Basic troubleshooting','Tech & Document Support'),
('Document formatting','Tech & Document Support'),
('Resume or form assistance','Tech & Document Support'),
('Phone or computer repair','Tech & Document Support'),
('Baking','Food & Personal Services'),
('Home-cooked meals','Food & Personal Services'),
('Party food trays','Food & Personal Services'),
('Sewing','Food & Personal Services'),
('Clothing alteration or repair','Food & Personal Services'),
('Manicure or pedicure','Food & Personal Services'),
('Haircut','Food & Personal Services'),
('Makeup','Food & Personal Services'),
('Massage','Food & Personal Services')) taxonomy(service,category) where service=payload->>'category') then raise exception 'Choose a supported service.'; end if;
    custom_text := btrim(coalesce(payload->>'custom_category',''));
    if payload->>'category' is null or (payload->>'category'='Other service' and custom_text='') or length(custom_text)>80 then raise exception 'Describe the service you offer.'; end if;
    custom_text := ' ' || btrim(regexp_replace(lower(custom_text),'[^a-z0-9]+',' ','g')) || ' ';
    foreach blocked in array array['electrician','electrical','electrical wiring','electric wiring','kuryente','kuryenteng','wiring','rewiring','plumber','plumbing','tubero','structural construction','house construction','building construction','load bearing','roof framing'] loop
      if strpos(custom_text,' ' || btrim(regexp_replace(lower(blocked),'[^a-z0-9]+',' ','g')) || ' ')>0 then raise exception 'Konektado does not support this type of service yet.'; end if;
    end loop;
  end if;
end; $$;
revoke all on function app_private.validate_listing_payload(text,jsonb) from public,anon,authenticated;

create function app_private.render_job_schedule() returns trigger language plpgsql set search_path=public as $$
declare detail text;
begin
 if new.scheduled_date is not null then
 detail:=case new.time_preference when 'exact' then to_char(new.exact_time,'FMHH12:MI AM') when 'morning' then 'Morning' when 'afternoon' then 'Afternoon' when 'evening' then 'Evening' when 'anytime' then 'Anytime' end;
 new.schedule_text:=to_char(new.scheduled_date,'Mon FMDD, YYYY') || ' · ' || detail || ' · ' || case when new.schedule_flexibility='fixed' then 'Must be this time' else 'Can coordinate' end;
 end if; return new;
end; $$;
create trigger b_job_schedule_summary before insert or update on public.jobs for each row execute function app_private.render_job_schedule();
create or replace function app_private.validate_marketplace_write() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if tg_table_name='jobs' then
  if new.status in ('open','reviewing') then
   if tg_op='INSERT' then perform app_private.validate_listing_payload('job',to_jsonb(new));
   elsif old.status not in ('open','reviewing') or (to_jsonb(new)-array['status','updated_at','content_version','closed_at']) is distinct from (to_jsonb(old)-array['status','updated_at','content_version','closed_at']) then perform app_private.validate_listing_payload('job',to_jsonb(new)); end if;
  end if;
 else
  if new.is_active then
   if tg_op='INSERT' then perform app_private.validate_listing_payload('service',to_jsonb(new));
   elsif not old.is_active or (to_jsonb(new)-array['updated_at','content_version']) is distinct from (to_jsonb(old)-array['updated_at','content_version']) then perform app_private.validate_listing_payload('service',to_jsonb(new)); end if;
  end if;
 end if; return new;
end; $$;
create trigger validate_job_publish before insert or update on public.jobs for each row execute function app_private.validate_marketplace_write();
create trigger validate_service_publish before insert or update on public.services for each row execute function app_private.validate_marketplace_write();
create function public.begin_job_edit(p_listing_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare resident uuid:=auth.uid(); draft_id uuid; listing public.jobs;
begin
 if resident is null then raise exception 'Please sign in again.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(resident::text || ':job-edit:' || p_listing_id::text,0));
 select * into listing from public.jobs where id=p_listing_id and coalesce(client_id,owner_id)=resident for update;
 if not found then raise exception 'Only the owner can edit this listing.'; end if;
 if listing.status not in ('open','reviewing','cancelled') then raise exception 'This job cannot be edited after hiring or completion.'; end if;
 select id into draft_id from public.job_drafts where user_id=resident and source_listing_id=p_listing_id;
 if draft_id is not null then return draft_id; end if;
 insert into public.job_drafts(user_id,source_listing_id,source_version,title,description,category,service_needed,tags,photo_urls,barangay,location_text,public_location_text,private_location_notes,budget_min,budget_max,rate_type,budget_negotiable,workers_needed,scheduled_date,time_preference,exact_time,schedule_flexibility,schedule_timezone,schedule_text,experience_level,certification_required,certification_note,allow_messages)
 values(resident,listing.id,listing.content_version,listing.title,listing.description,listing.category,listing.service_needed,listing.tags,listing.photo_urls,listing.barangay,listing.location_text,listing.public_location_text,listing.private_location_notes,listing.budget_min,listing.budget_max,listing.rate_type,listing.budget_negotiable,listing.workers_needed,listing.scheduled_date,listing.time_preference,listing.exact_time,listing.schedule_flexibility,listing.schedule_timezone,listing.schedule_text,listing.experience_level,listing.certification_required,listing.certification_note,listing.allow_messages) returning id into draft_id;
 return draft_id;
end; $$;
revoke all on function public.begin_job_edit(uuid) from public,anon;
grant execute on function public.begin_job_edit(uuid) to authenticated;
create function public.commit_job_draft(p_draft_id uuid,p_expected_revision bigint) returns uuid language plpgsql security definer set search_path=public as $$
declare resident uuid:=auth.uid(); draft public.job_drafts; listing public.jobs; published uuid; committed_revision bigint;
begin
 if resident is null or not public.is_marketplace_ready(resident,'client') then raise exception 'Complete your Hiring Profile before messaging workers or publishing jobs.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(resident::text || ':job:' || p_draft_id::text,0));
 select listing_id,draft_revision into published,committed_revision from app_private.marketplace_publications where owner_id=resident and kind='job' and draft_id=p_draft_id;
 if published is not null then
  if committed_revision is not null and committed_revision is distinct from p_expected_revision then raise exception 'This review is out of date. Reopen your draft.'; end if;
  return published;
 end if;
 select * into draft from public.job_drafts where id=p_draft_id and user_id=resident for update;
 if not found then raise exception 'Draft not found. Reopen your listing.'; end if;
 if p_expected_revision is null or draft.revision<>p_expected_revision then raise exception 'This draft changed after review. Reopen it before saving.'; end if;
 perform app_private.validate_listing_payload('job',to_jsonb(draft));
 if draft.source_listing_id is not null then
  select * into listing from public.jobs where id=draft.source_listing_id and coalesce(client_id,owner_id)=resident for update;
  if not found or listing.content_version is distinct from draft.source_version then raise exception 'This listing changed in another session. Your draft is safe; reopen the listing before applying changes.'; end if;
  if listing.status not in ('open','reviewing','cancelled') then raise exception 'This job cannot be edited after hiring or completion.'; end if;
  update public.jobs set title=draft.title,description=draft.description,category=draft.category,service_needed=draft.service_needed,tags=draft.tags,photo_urls=draft.photo_urls,barangay=draft.barangay,location_text=draft.location_text,public_location_text=draft.public_location_text,private_location_notes=draft.private_location_notes,budget_min=draft.budget_min,budget_max=draft.budget_max,rate_type=draft.rate_type,budget_negotiable=draft.budget_negotiable,workers_needed=draft.workers_needed,scheduled_date=draft.scheduled_date,time_preference=draft.time_preference,exact_time=draft.exact_time,schedule_flexibility=draft.schedule_flexibility,schedule_timezone=draft.schedule_timezone,schedule_text=draft.schedule_text,experience_level=draft.experience_level,certification_required=draft.certification_required,certification_note=draft.certification_note,allow_messages=draft.allow_messages,auto_reply_enabled=false,auto_close_enabled=false where id=listing.id returning id into published;
 else
  insert into public.jobs(owner_id,client_id,title,description,category,service_needed,tags,photo_urls,barangay,location_text,public_location_text,private_location_notes,budget_min,budget_max,rate_type,budget_negotiable,workers_needed,scheduled_date,time_preference,exact_time,schedule_flexibility,schedule_timezone,schedule_text,experience_level,certification_required,certification_note,allow_messages,status)
  values(resident,resident,draft.title,draft.description,draft.category,draft.service_needed,draft.tags,draft.photo_urls,draft.barangay,draft.location_text,draft.public_location_text,draft.private_location_notes,draft.budget_min,draft.budget_max,draft.rate_type,draft.budget_negotiable,draft.workers_needed,draft.scheduled_date,draft.time_preference,draft.exact_time,draft.schedule_flexibility,draft.schedule_timezone,draft.schedule_text,draft.experience_level,draft.certification_required,draft.certification_note,draft.allow_messages,'open') returning id into published;
 end if;
 insert into app_private.marketplace_publications(owner_id,kind,draft_id,listing_id,draft_revision) values(resident,'job',p_draft_id,published,draft.revision);
 delete from public.job_drafts where id=p_draft_id and user_id=resident;
 return published;
end; $$;
revoke all on function public.commit_job_draft(uuid,bigint) from public,anon;
grant execute on function public.commit_job_draft(uuid,bigint) to authenticated;
-- Compatibility wrapper for older creation clients: edit drafts cannot become duplicate posts.
create or replace function public.publish_job_draft(p_draft_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare revision bigint;
begin
 if exists(select 1 from public.job_drafts where id=p_draft_id and user_id=auth.uid() and source_listing_id is not null) then raise exception 'Review this edit before saving changes.'; end if;
 select d.revision into revision from public.job_drafts d where d.id=p_draft_id and d.user_id=auth.uid();
 if revision is null then select p.draft_revision into revision from app_private.marketplace_publications p where p.owner_id=auth.uid() and p.kind='job' and p.draft_id=p_draft_id; end if;
 return public.commit_job_draft(p_draft_id,revision);
end; $$;
create function public.begin_service_edit(p_listing_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare resident uuid:=auth.uid(); draft_id uuid; listing public.services;
begin
 if resident is null then raise exception 'Please sign in again.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(resident::text || ':service-edit:' || p_listing_id::text,0));
 select * into listing from public.services where id=p_listing_id and provider_id=resident for update;
 if not found then raise exception 'Only the owner can edit this listing.'; end if;
 
 select id into draft_id from public.service_drafts where user_id=resident and source_listing_id=p_listing_id;
 if draft_id is not null then return draft_id; end if;
 insert into public.service_drafts(user_id,source_listing_id,source_version,category,custom_category,title,description,tags,photo_urls,years_experience,availability_text,rate_text,rate_min,rate_max,rate_type,rate_negotiable,experience_level,certification_available,certification_note,barangay,location_text,allow_messages)
 values(resident,listing.id,listing.content_version,listing.category,listing.custom_category,listing.title,listing.description,listing.tags,listing.photo_urls,listing.years_experience,listing.availability_text,listing.rate_text,listing.rate_min,listing.rate_max,listing.rate_type,listing.rate_negotiable,listing.experience_level,listing.certification_available,listing.certification_note,listing.barangay,listing.location_text,listing.allow_messages) returning id into draft_id;
 return draft_id;
end; $$;
revoke all on function public.begin_service_edit(uuid) from public,anon;
grant execute on function public.begin_service_edit(uuid) to authenticated;
create function public.commit_service_draft(p_draft_id uuid,p_expected_revision bigint) returns uuid language plpgsql security definer set search_path=public as $$
declare resident uuid:=auth.uid(); draft public.service_drafts; listing public.services; published uuid; committed_revision bigint;
begin
 if resident is null or not public.is_marketplace_ready(resident,'provider') then raise exception 'Complete your Work Profile before messaging clients or publishing services.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(resident::text || ':service:' || p_draft_id::text,0));
 select listing_id,draft_revision into published,committed_revision from app_private.marketplace_publications where owner_id=resident and kind='service' and draft_id=p_draft_id;
 if published is not null then
  if committed_revision is not null and committed_revision is distinct from p_expected_revision then raise exception 'This review is out of date. Reopen your draft.'; end if;
  return published;
 end if;
 select * into draft from public.service_drafts where id=p_draft_id and user_id=resident for update;
 if not found then raise exception 'Draft not found. Reopen your listing.'; end if;
 if p_expected_revision is null or draft.revision<>p_expected_revision then raise exception 'This draft changed after review. Reopen it before saving.'; end if;
 perform app_private.validate_listing_payload('service',to_jsonb(draft));
 if draft.source_listing_id is not null then
  select * into listing from public.services where id=draft.source_listing_id and provider_id=resident for update;
  if not found or listing.content_version is distinct from draft.source_version then raise exception 'This listing changed in another session. Your draft is safe; reopen the listing before applying changes.'; end if;
  
  update public.services set category=draft.category,custom_category=draft.custom_category,title=draft.title,description=draft.description,tags=draft.tags,photo_urls=draft.photo_urls,years_experience=draft.years_experience,availability_text=draft.availability_text,rate_text=draft.rate_text,rate_min=draft.rate_min,rate_max=draft.rate_max,rate_type=draft.rate_type,rate_negotiable=draft.rate_negotiable,experience_level=draft.experience_level,certification_available=draft.certification_available,certification_note=draft.certification_note,barangay=draft.barangay,location_text=draft.location_text,allow_messages=draft.allow_messages,custom_category_review_status=case when draft.category='Other service' then 'pending' else 'none' end,auto_reply_enabled=false,auto_pause_enabled=false where id=listing.id returning id into published;
 else
  insert into public.services(provider_id,category,custom_category,title,description,tags,photo_urls,years_experience,availability_text,rate_text,rate_min,rate_max,rate_type,rate_negotiable,experience_level,certification_available,certification_note,barangay,location_text,allow_messages,custom_category_review_status,is_active)
  values(resident,draft.category,draft.custom_category,draft.title,draft.description,draft.tags,draft.photo_urls,draft.years_experience,draft.availability_text,draft.rate_text,draft.rate_min,draft.rate_max,draft.rate_type,draft.rate_negotiable,draft.experience_level,draft.certification_available,draft.certification_note,draft.barangay,draft.location_text,draft.allow_messages,case when draft.category='Other service' then 'pending' else 'none' end,true) returning id into published;
 end if;
 insert into app_private.marketplace_publications(owner_id,kind,draft_id,listing_id,draft_revision) values(resident,'service',p_draft_id,published,draft.revision);
 delete from public.service_drafts where id=p_draft_id and user_id=resident;
 return published;
end; $$;
revoke all on function public.commit_service_draft(uuid,bigint) from public,anon;
grant execute on function public.commit_service_draft(uuid,bigint) to authenticated;
-- Compatibility wrapper for older creation clients: edit drafts cannot become duplicate posts.
create or replace function public.publish_service_draft(p_draft_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare revision bigint;
begin
 if exists(select 1 from public.service_drafts where id=p_draft_id and user_id=auth.uid() and source_listing_id is not null) then raise exception 'Review this edit before saving changes.'; end if;
 select d.revision into revision from public.service_drafts d where d.id=p_draft_id and d.user_id=auth.uid();
 if revision is null then select p.draft_revision into revision from app_private.marketplace_publications p where p.owner_id=auth.uid() and p.kind='service' and p.draft_id=p_draft_id; end if;
 return public.commit_service_draft(p_draft_id,revision);
end; $$;
create function public.get_my_listing_repairs() returns table(kind text,listing_id uuid,issues text[]) language plpgsql security definer set search_path=public as $$
declare item record;
begin
 if auth.uid() is null then raise exception 'Please sign in again.'; end if;
 for item in select 'job'::text k,j.id,to_jsonb(j) payload from public.jobs j where coalesce(j.client_id,j.owner_id)=auth.uid() and j.status in ('open','reviewing','cancelled') union all select 'service',s.id,to_jsonb(s) from public.services s where s.provider_id=auth.uid() loop
  begin perform app_private.validate_listing_payload(item.k,item.payload);
  exception when others then kind:=item.k;listing_id:=item.id;issues:=array[sqlerrm];return next; end;
 end loop;
end; $$;
revoke all on function public.get_my_listing_repairs() from public,anon;
grant execute on function public.get_my_listing_repairs() to authenticated;
revoke all on function app_private.bump_listing_version(),app_private.guard_draft_revision(),app_private.render_job_schedule() from public,anon,authenticated;
alter table public.job_drafts add column previous_edit jsonb;
create function public.restart_job_edit(p_draft_id uuid,p_expected_revision bigint) returns uuid language plpgsql security definer set search_path=public as $$
declare draft public.job_drafts; listing public.jobs;
begin
 select * into draft from public.job_drafts where id=p_draft_id and user_id=auth.uid() for update;
 if not found or draft.source_listing_id is null then raise exception 'Owned edit draft not found.'; end if;
 if draft.revision is distinct from p_expected_revision then raise exception 'This draft changed. Reopen it first.'; end if;
 select * into listing from public.jobs where id=draft.source_listing_id and coalesce(client_id,owner_id)=auth.uid() for update;
 if not found then raise exception 'Owned listing not found.'; end if;
 if listing.status not in ('open','reviewing','cancelled') then raise exception 'This job cannot be edited after hiring or completion.'; end if;
 update public.job_drafts set previous_edit=to_jsonb(draft)-'previous_edit',source_version=listing.content_version,editor_state='{}',title=listing.title,description=listing.description,category=listing.category,service_needed=listing.service_needed,tags=listing.tags,photo_urls=listing.photo_urls,barangay=listing.barangay,location_text=listing.location_text,public_location_text=listing.public_location_text,private_location_notes=listing.private_location_notes,budget_min=listing.budget_min,budget_max=listing.budget_max,rate_type=listing.rate_type,budget_negotiable=listing.budget_negotiable,workers_needed=listing.workers_needed,scheduled_date=listing.scheduled_date,time_preference=listing.time_preference,exact_time=listing.exact_time,schedule_flexibility=listing.schedule_flexibility,schedule_timezone=listing.schedule_timezone,schedule_text=listing.schedule_text,experience_level=listing.experience_level,certification_required=listing.certification_required,certification_note=listing.certification_note,allow_messages=listing.allow_messages where id=draft.id;
 return draft.id;
end; $$;
revoke all on function public.restart_job_edit(uuid,bigint) from public,anon;
grant execute on function public.restart_job_edit(uuid,bigint) to authenticated;
alter table public.service_drafts add column previous_edit jsonb;
create function public.restart_service_edit(p_draft_id uuid,p_expected_revision bigint) returns uuid language plpgsql security definer set search_path=public as $$
declare draft public.service_drafts; listing public.services;
begin
 select * into draft from public.service_drafts where id=p_draft_id and user_id=auth.uid() for update;
 if not found or draft.source_listing_id is null then raise exception 'Owned edit draft not found.'; end if;
 if draft.revision is distinct from p_expected_revision then raise exception 'This draft changed. Reopen it first.'; end if;
 select * into listing from public.services where id=draft.source_listing_id and provider_id=auth.uid() for update;
 if not found then raise exception 'Owned listing not found.'; end if;
 
 update public.service_drafts set previous_edit=to_jsonb(draft)-'previous_edit',source_version=listing.content_version,editor_state='{}',category=listing.category,custom_category=listing.custom_category,title=listing.title,description=listing.description,tags=listing.tags,photo_urls=listing.photo_urls,years_experience=listing.years_experience,availability_text=listing.availability_text,rate_text=listing.rate_text,rate_min=listing.rate_min,rate_max=listing.rate_max,rate_type=listing.rate_type,rate_negotiable=listing.rate_negotiable,experience_level=listing.experience_level,certification_available=listing.certification_available,certification_note=listing.certification_note,barangay=listing.barangay,location_text=listing.location_text,allow_messages=listing.allow_messages where id=draft.id;
 return draft.id;
end; $$;
revoke all on function public.restart_service_edit(uuid,bigint) from public,anon;
grant execute on function public.restart_service_edit(uuid,bigint) to authenticated;
commit;
