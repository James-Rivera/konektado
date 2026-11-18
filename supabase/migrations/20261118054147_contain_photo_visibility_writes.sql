-- Keep the six-column legacy reader available while closing the owner-rights write path.
begin;

revoke insert, update, delete, truncate, references, trigger
on public.public_content_visibility from public, anon, authenticated;

-- Table-level REVOKE does not remove independent column grants.
do $$
declare
  column_names text;
  client_role text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum)
  into column_names
  from pg_attribute
  where attrelid = 'public.public_content_visibility'::regclass
    and attnum > 0 and not attisdropped;

  execute format(
    'revoke insert (%1$s), update (%1$s), references (%1$s) on public.public_content_visibility from public, anon, authenticated',
    column_names
  );

  -- Abort rather than commit partial containment if an inherited grant remains.
  foreach client_role in array array['anon', 'authenticated'] loop
    if has_table_privilege(client_role, 'public.public_content_visibility', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      or has_any_column_privilege(client_role, 'public.public_content_visibility', 'INSERT,UPDATE,REFERENCES') then
      raise exception 'Effective write privileges remain on public_content_visibility for %', client_role;
    end if;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
commit;
