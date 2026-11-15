-- DEC-140: apply before deploying the corresponding profile/publish client.
-- No reset, seed rewrite, or relaxation of resident verification/ownership.
begin;

-- Unfinished input stays private; publication never copies editor_state.
alter table public.job_drafts add column editor_state jsonb not null default '{}';
alter table public.service_drafts add column editor_state jsonb not null default '{}';
alter table public.job_drafts add constraint job_draft_editor_state_object check (jsonb_typeof(editor_state) = 'object' and octet_length(editor_state::text) <= 4096);
alter table public.service_drafts add constraint service_draft_editor_state_object check (jsonb_typeof(editor_state) = 'object' and octet_length(editor_state::text) <= 4096);
alter table public.provider_profiles add column services_confirmed boolean not null default false;
alter table public.client_profiles add column services_confirmed boolean not null default false;
create or replace function public.is_marketplace_ready(p_user_id uuid, p_role text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select
    public.is_verified_profile(p.id)
    and nullif(trim(coalesce(nullif(trim(p.full_name), ''), concat_ws(' ', p.first_name, p.last_name))), '') is not null
    and nullif(trim(p.street), '') is not null
    and nullif(trim(p.preferred_contact_method), '') is not null
    and case p_role
      when 'provider' then
        nullif(trim(coalesce(nullif(trim(w.bio), ''), nullif(trim(w.headline), ''), case when not w.services_confirmed then coalesce(nullif(trim(w.service_type), ''), p.about) end)), '') is not null
        and nullif(trim(w.availability), '') is not null
        and nullif(trim(coalesce(nullif(trim(w.service_area), ''), concat_ws(', ', p.barangay, p.city))), '') is not null
        and exists (select 1 from unnest(
          coalesce(string_to_array(w.service_type, ','), '{}') || coalesce(w.custom_offered_services, '{}') ||
          case when coalesce(w.services_confirmed,false) then '{}'::text[] else coalesce(pref.offered_services, '{}') || coalesce(pref.custom_offered_services, '{}') end) s
          where nullif(trim(s), '') is not null and trim(s) <> 'Others / Specify')
      when 'client' then
        nullif(trim(coalesce(nullif(trim(h.headline), ''), nullif(trim(h.bio), ''), case when not coalesce(h.services_confirmed,false) then p.about end)), '') is not null
        and nullif(trim(h.coordination_style), '') is not null
        and nullif(trim(h.preferred_schedule), '') is not null
        and exists (select 1 from unnest(coalesce(h.needed_services, '{}') || coalesce(h.custom_needed_services, '{}') ||
          case when coalesce(h.services_confirmed,false) then '{}'::text[] else coalesce(pref.needed_services, '{}') || coalesce(pref.custom_needed_services, '{}') end) s
          where nullif(trim(s), '') is not null and trim(s) <> 'Others / Specify')
      else false end
    from public.profiles p
    left join public.provider_profiles w on w.user_id = p.id
    left join public.client_profiles h on h.user_id = p.id
    left join public.user_preferences pref on pref.user_id = p.id
    where p.id = p_user_id), false);
$$;
revoke all on function public.is_marketplace_ready(uuid, text) from public;
grant execute on function public.is_marketplace_ready(uuid, text) to authenticated, service_role;


revoke all on function public.is_marketplace_ready(uuid,text) from anon;

create or replace function app_private.validate_listing_payload(kind text, payload jsonb)
returns void language plpgsql set search_path=public as $$
declare lo numeric; hi numeric; unit text; canonical_category text; custom_text text; blocked text; schedule_parts text[]; scheduled_date date;
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
    schedule_parts := regexp_match(btrim(payload->>'schedule_text'), '^([A-Z][a-z]{2} [0-9]{1,2}, [0-9]{4}) · (Morning|Afternoon|Evening|Anytime|([1-9]|1[0-2]):[0-5][0-9] (AM|PM)) · (Must be this time|Can coordinate|Fixed|Flexible)$');
    if schedule_parts is null then raise exception 'Choose a job date and time preference.'; end if;
    begin scheduled_date := to_date(schedule_parts[1], 'Mon DD, YYYY');
    exception when others then raise exception 'Choose a valid job date.'; end;
    if to_char(scheduled_date,'Mon FMDD, YYYY') <> schedule_parts[1] then raise exception 'Choose a valid job date.'; end if;
    if scheduled_date < (now() at time zone 'Asia/Manila')::date then raise exception 'Choose today or a future job date.'; end if;
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

create or replace function app_private.validate_marketplace_write() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if tg_table_name='jobs' then
    if new.status in ('open','reviewing') then perform app_private.validate_listing_payload('job',to_jsonb(new)); end if;
  else
    if new.is_active then perform app_private.validate_listing_payload('service',to_jsonb(new)); end if;
  end if;
  return new;
end; $$;
revoke all on function app_private.validate_marketplace_write() from public,anon,authenticated;
create trigger validate_job_publish before insert or update of title,description,location_text,barangay,category,service_needed,budget_min,budget_max,rate_type,workers_needed,schedule_text,status on public.jobs for each row execute function app_private.validate_marketplace_write();
create trigger validate_service_publish before insert or update of title,description,location_text,barangay,category,custom_category,rate_min,rate_max,rate_type,is_active on public.services for each row execute function app_private.validate_marketplace_write();

-- Private durable tombstones survive draft deletion, allowing safe response-loss retries.
create table app_private.marketplace_publications (
 owner_id uuid not null references public.profiles(id) on delete cascade,
 kind text not null check(kind in ('job','service')), draft_id uuid not null,
 listing_id uuid not null, created_at timestamptz not null default now(), primary key(owner_id,kind,draft_id)
);
revoke all on table app_private.marketplace_publications from public,anon,authenticated;

create function public.publish_job_draft(p_draft_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); draft public.job_drafts; published uuid;
begin
 if owner is null or not public.is_marketplace_ready(owner,'client') then raise exception 'Complete your Hiring Profile before messaging workers or publishing jobs.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(owner::text || ':job:' || p_draft_id::text,0));
 select listing_id into published from app_private.marketplace_publications where owner_id=owner and kind='job' and draft_id=p_draft_id;
 if published is not null then return published; end if;
 select * into draft from public.job_drafts where id=p_draft_id and user_id=owner for update;
 if not found then raise exception 'Draft not found.'; end if;
 perform app_private.validate_listing_payload('job',to_jsonb(draft));
 insert into public.jobs(owner_id,client_id,title,description,category,service_needed,tags,photo_urls,barangay,location,location_text,public_location_text,private_location_notes,budget_min,budget_max,rate_type,budget_negotiable,workers_needed,schedule_text,experience_level,certification_required,certification_note,allow_messages,auto_reply_enabled,auto_close_enabled,status)
 values(owner,owner,btrim(draft.title),btrim(draft.description),draft.category,draft.service_needed,draft.tags,draft.photo_urls,draft.barangay,draft.location_text,draft.location_text,draft.location_text,draft.private_location_notes,draft.budget_min,draft.budget_max,draft.rate_type,draft.budget_negotiable,1,draft.schedule_text,draft.experience_level,draft.certification_required,draft.certification_note,draft.allow_messages,false,false,'open') returning id into published;
 insert into app_private.marketplace_publications(owner_id,kind,draft_id,listing_id) values(owner,'job',p_draft_id,published);
 delete from public.job_drafts where id=p_draft_id and user_id=owner;
 return published;
end; $$;

create function public.publish_service_draft(p_draft_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare owner uuid:=auth.uid(); draft public.service_drafts; published uuid;
begin
 if owner is null or not public.is_marketplace_ready(owner,'provider') then raise exception 'Complete your Work Profile before messaging clients or publishing services.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(owner::text || ':service:' || p_draft_id::text,0));
 select listing_id into published from app_private.marketplace_publications where owner_id=owner and kind='service' and draft_id=p_draft_id;
 if published is not null then return published; end if;
 select * into draft from public.service_drafts where id=p_draft_id and user_id=owner for update;
 if not found then raise exception 'Draft not found.'; end if;
 perform app_private.validate_listing_payload('service',to_jsonb(draft));
 insert into public.services(provider_id,category,custom_category,custom_category_review_status,title,description,tags,photo_urls,years_experience,availability_text,rate_text,rate_min,rate_max,rate_type,rate_negotiable,experience_level,certification_available,certification_note,barangay,location_text,allow_messages,auto_reply_enabled,auto_pause_enabled,is_active)
 values(owner,draft.category,draft.custom_category,case when draft.category='Other service' then 'pending' else 'none' end,btrim(draft.title),btrim(draft.description),draft.tags,draft.photo_urls,draft.years_experience,draft.availability_text,draft.rate_text,draft.rate_min,draft.rate_max,draft.rate_type,draft.rate_negotiable,draft.experience_level,draft.certification_available,draft.certification_note,draft.barangay,draft.location_text,draft.allow_messages,false,false,true) returning id into published;
 insert into app_private.marketplace_publications(owner_id,kind,draft_id,listing_id) values(owner,'service',p_draft_id,published);
 delete from public.service_drafts where id=p_draft_id and user_id=owner;
 return published;
end; $$;
revoke all on function public.publish_job_draft(uuid),public.publish_service_draft(uuid) from public,anon;
grant execute on function public.publish_job_draft(uuid),public.publish_service_draft(uuid) to authenticated;
commit;
