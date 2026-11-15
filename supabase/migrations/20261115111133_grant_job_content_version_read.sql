begin;

-- Jobs use column-level SELECT grants to protect private_location_notes.
-- New clients read content_version for conflict detection alongside public fields.
grant select (content_version) on public.jobs to authenticated;

commit;
