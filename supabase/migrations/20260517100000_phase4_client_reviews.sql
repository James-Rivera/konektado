-- Phase 4: keep the MVP review lifecycle client-to-hired-provider only.

drop policy if exists "reviews_insert_verified_participant" on public.reviews;
create policy "reviews_insert_verified_participant"
on public.reviews for insert
to authenticated
with check (
  reviewer_id = auth.uid()
  and reviewer_id <> reviewee_id
  and public.is_verified_profile(auth.uid())
  and exists (
    select 1
    from public.jobs j
    where j.id = job_id
      and j.status = 'completed'
      and coalesce(j.client_id, j.owner_id) = auth.uid()
      and j.accepted_provider_id = reviewee_id
  )
);

notify pgrst, 'reload schema';
