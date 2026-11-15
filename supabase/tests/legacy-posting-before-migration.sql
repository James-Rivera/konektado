-- Scratch-database compatibility fixtures, inserted before DEC-141 only.
insert into auth.users(id,email) values('81000000-0000-4000-8000-000000000001','legacy-owner@example.invalid');
insert into profiles(id,full_name,first_name,last_name,street,barangay,city,preferred_contact_method,verified_at,barangay_verified_at)
values('81000000-0000-4000-8000-000000000001','Legacy Resident','Legacy','Resident','Test area','San Pedro','Santo Tomas','app_message',now(),now());
insert into provider_profiles(user_id,service_type,bio,service_area,availability,services_confirmed)
values('81000000-0000-4000-8000-000000000001','Cleaning','Careful cleaning','San Pedro','Weekends',true);
insert into client_profiles(user_id,bio,needed_services,coordination_style,preferred_schedule,services_confirmed)
values('81000000-0000-4000-8000-000000000001','Home help needed',array['Cleaning'],'App messages','Weekends',true);
alter table jobs disable trigger validate_job_publish;
insert into jobs(id,owner_id,client_id,title,description,category,service_needed,barangay,location_text,budget_min,budget_max,rate_type,workers_needed,schedule_text,status)
values('82000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','Legacy valid','Keep this description','Home & Local Help','Cleaning','San Pedro','San Pedro',200,300,'per_job',1,'Nov 13, 2050 · 9:30 AM · Must be this time','open'),
('82000000-0000-4000-8000-000000000002','81000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','Legacy undated',null,'Old category',null,'San Pedro','San Pedro',200,300,'per_job',3,'Whenever convenient','open'),
('82000000-0000-4000-8000-000000000003','81000000-0000-4000-8000-000000000001','81000000-0000-4000-8000-000000000001','Legacy impossible','Keep this too','Home & Local Help','Cleaning','San Pedro','San Pedro',200,300,'per_job',1,'Feb 30, 2050 · Morning · Can coordinate','open');
alter table jobs enable trigger validate_job_publish;
