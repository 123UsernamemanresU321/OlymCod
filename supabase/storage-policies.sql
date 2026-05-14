insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'note-diagrams',
    'note-diagrams',
    false,
    5242880,
    array['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg']
  ),
  (
    'suggestion-diagrams',
    'suggestion-diagrams',
    false,
    5242880,
    array['image/svg+xml', 'image/png', 'image/jpeg', 'image/jpg']
  )
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Owners can read note diagrams and public can read public note diagrams" on storage.objects;
create policy "Owners can read note diagrams and public can read public note diagrams"
on storage.objects for select
to anon, authenticated
using (
  bucket_id = 'note-diagrams'
  and (
    (select public.is_owner())
    or exists (
      select 1
      from public.notes n
      join public.site_settings s on s.id = 'main'
      where s.public_notes_enabled = true
        and n.visibility = 'public'
        and n.is_archived = false
        and n.diagram_urls @> array[name]
    )
  )
);

drop policy if exists "Owners can upload note diagrams" on storage.objects;
create policy "Owners can upload note diagrams"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'note-diagrams'
  and (select public.is_owner())
  and array_length(storage.foldername(name), 1) >= 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Owners can update note diagrams" on storage.objects;
create policy "Owners can update note diagrams"
on storage.objects for update
to authenticated
using (bucket_id = 'note-diagrams' and (select public.is_owner()))
with check (bucket_id = 'note-diagrams' and (select public.is_owner()));

drop policy if exists "Owners can delete note diagrams" on storage.objects;
create policy "Owners can delete note diagrams"
on storage.objects for delete
to authenticated
using (bucket_id = 'note-diagrams' and (select public.is_owner()));

drop policy if exists "Owners and contributors can read suggestion diagrams" on storage.objects;
create policy "Owners and contributors can read suggestion diagrams"
on storage.objects for select
to authenticated
using (
  bucket_id = 'suggestion-diagrams'
  and (
    (select public.is_owner())
    or (
      array_length(storage.foldername(name), 1) >= 2
      and (storage.foldername(name))[1] = (select auth.uid())::text
    )
  )
);

drop policy if exists "Non-banned users can upload own suggestion diagrams" on storage.objects;
create policy "Non-banned users can upload own suggestion diagrams"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'suggestion-diagrams'
  and not (select public.is_banned())
  and array_length(storage.foldername(name), 1) >= 2
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "Owners and contributors can update own suggestion diagrams" on storage.objects;
create policy "Owners and contributors can update own suggestion diagrams"
on storage.objects for update
to authenticated
using (
  bucket_id = 'suggestion-diagrams'
  and (
    (select public.is_owner())
    or (
      not (select public.is_banned())
      and array_length(storage.foldername(name), 1) >= 2
      and (storage.foldername(name))[1] = (select auth.uid())::text
    )
  )
)
with check (
  bucket_id = 'suggestion-diagrams'
  and (
    (select public.is_owner())
    or (
      not (select public.is_banned())
      and array_length(storage.foldername(name), 1) >= 2
      and (storage.foldername(name))[1] = (select auth.uid())::text
    )
  )
);

drop policy if exists "Owners and contributors can delete own suggestion diagrams" on storage.objects;
create policy "Owners and contributors can delete own suggestion diagrams"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'suggestion-diagrams'
  and (
    (select public.is_owner())
    or (
      not (select public.is_banned())
      and array_length(storage.foldername(name), 1) >= 2
      and (storage.foldername(name))[1] = (select auth.uid())::text
    )
  )
);
