-- Run only against a disposable database after migrations. Fixtures roll back.
\set ON_ERROR_STOP on
begin;
create function pg_temp.photo_assert(label text, actual boolean) returns void
language plpgsql security invoker as $$
begin
  if actual is distinct from true then raise exception 'FAIL: %', label; end if;
end;
$$;
create function pg_temp.photo_denied(statement text) returns void
language plpgsql security invoker as $$
begin
  begin
    execute statement;
  exception when insufficient_privilege then
    return;
  end;
  raise exception 'FAIL: photo visibility write unexpectedly succeeded';
end;
$$;

grant execute on function pg_temp.photo_assert(text, boolean),
  pg_temp.photo_denied(text) to anon, authenticated, service_role;

insert into auth.users(id, email) values
 ('91000000-0000-4000-8000-000000000001', 'photo-admin@example.invalid'),
 ('91000000-0000-4000-8000-000000000002', 'photo-resident@example.invalid');
insert into public.profiles(id, full_name, first_name, last_name)
values
 ('91000000-0000-4000-8000-000000000001', 'Photo Admin', 'Photo', 'Admin'),
 ('91000000-0000-4000-8000-000000000002', 'Photo Resident', 'Photo', 'Resident');
insert into public.user_roles(user_id, role)
values ('91000000-0000-4000-8000-000000000001', 'barangay_admin');
insert into public.content_visibility(content_type, content_id, visibility, hidden_reason)
values ('job_photo', 'photo-test-hidden', 'hidden', 'Private moderation reason');

set local role anon;
select pg_temp.photo_assert('anon can still read hidden marker',
 exists(select 1 from public.public_content_visibility where content_id='photo-test-hidden' and visibility='hidden'));
select pg_temp.photo_denied($q$insert into public.public_content_visibility(content_type,content_id,visibility)
 values('job_photo','photo-test-injected','visible')$q$);
select pg_temp.photo_denied($q$update public.public_content_visibility set visibility='visible' where content_id='photo-test-hidden'$q$);
select pg_temp.photo_denied($q$delete from public.public_content_visibility where content_id='photo-test-hidden'$q$);

set local role authenticated;
select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000002',true);
select pg_temp.photo_assert('resident can still read hidden marker',
 exists(select 1 from public.public_content_visibility where content_id='photo-test-hidden' and visibility='hidden'));
select pg_temp.photo_denied($q$insert into public.public_content_visibility(content_type,content_id,visibility)
 values('job_photo','photo-test-injected','visible')$q$);
select pg_temp.photo_denied($q$update public.public_content_visibility set visibility='visible' where content_id='photo-test-hidden'$q$);
select pg_temp.photo_denied($q$delete from public.public_content_visibility where content_id='photo-test-hidden'$q$);
select pg_temp.photo_assert('resident cannot read full moderation records',
 not exists(select 1 from public.content_visibility where content_id='photo-test-hidden'));
select pg_temp.photo_denied($q$insert into public.content_visibility(content_type,content_id)
 values('job_photo','photo-test-injected')$q$);
update public.content_visibility set visibility='visible' where content_id='photo-test-hidden';
select pg_temp.photo_assert('resident base-table update does not change hidden marker',
 exists(select 1 from public.public_content_visibility where content_id='photo-test-hidden' and visibility='hidden'));

select set_config('request.jwt.claim.sub','91000000-0000-4000-8000-000000000001',true);
insert into public.content_visibility(content_type,content_id,visibility)
values('service_photo','photo-test-admin-created','hidden');
update public.content_visibility set visibility='visible' where content_id='photo-test-hidden';
select pg_temp.photo_assert('admin base-table clear remains available',
 exists(select 1 from public.public_content_visibility where content_id='photo-test-hidden' and visibility='visible'));
select pg_temp.photo_assert('admin base-table insert remains available',
 exists(select 1 from public.public_content_visibility where content_id='photo-test-admin-created' and visibility='hidden'));
select pg_temp.photo_assert('admin can read private moderation reason',
 exists(select 1 from public.content_visibility where content_id='photo-test-hidden' and hidden_reason='Private moderation reason'));

reset role;
select pg_temp.photo_assert('public view retains exactly the legacy safe columns',
 (select array_agg(attname::text order by attnum) from pg_attribute
  where attrelid='public.public_content_visibility'::regclass and attnum>0 and not attisdropped)
 = array['content_type','content_id','source_id','owner_id','image_url','visibility']);
select pg_temp.photo_assert('effective table and column writes denied for both client roles',
 not exists(select 1 from unnest(array['anon','authenticated']) role_name
 where has_table_privilege(role_name,'public.public_content_visibility','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    or has_any_column_privilege(role_name,'public.public_content_visibility','INSERT,UPDATE,REFERENCES')));
rollback;
