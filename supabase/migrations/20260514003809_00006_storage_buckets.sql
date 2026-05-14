-- =============================================================================
-- 00006_storage_buckets.sql
--
-- Create the two public Storage buckets used by NKOSI and the RLS policies that
-- govern who can write to them. Reading is anonymous so that CDN URLs work
-- without an auth context.
--
-- Convention de chemins:
--   restaurants/<profile_id>/<restaurant_id>/cover-<uuid>.webp
--   restaurants/<profile_id>/<restaurant_id>/logo-<uuid>.webp
--   restaurants/<profile_id>/<restaurant_id>/plates/<plate_id>-<uuid>.webp
--   restaurants/<profile_id>/<restaurant_id>/plates/<plate_id>-<uuid>.mp4
--   ads/<uuid>.webp
--
-- The first segment `<profile_id>` is checked against
-- `public.current_profile_id()` so that restaurateurs can only upload to their
-- own folder. Admins (`is_admin_like()`) bypass that constraint.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Buckets
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('restaurants', 'restaurants', true, 5242880,
     array['image/jpeg','image/png','image/webp','video/mp4']),
  ('ads',         'ads',         true, 5242880,
     array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public            = excluded.public,
      file_size_limit   = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- RLS policies on storage.objects (RLS already enabled by Supabase)
-- ---------------------------------------------------------------------------

-- NOTE: pas de policy SELECT.
-- Les buckets sont marqués `public = true` → Supabase sert les fichiers via
-- `/storage/v1/object/public/...` SANS consulter RLS. Une policy SELECT sur
-- storage.objects activerait l'opération `list()` (énumération du contenu)
-- via supabase-js, ce qui ferait fuiter l'inventaire (advisor
-- `public_bucket_allows_listing`). On la laisse donc absente : l'accès par
-- URL fonctionne toujours.

-- Écriture restaurants : propriétaire (premier segment du path = profile_id) OU admin.
drop policy if exists "owner_insert_restaurants" on storage.objects;
create policy "owner_insert_restaurants" on storage.objects
  for insert
  with check (
    bucket_id = 'restaurants'
    and (
      public.is_admin_like()
      or (storage.foldername(name))[1] = public.current_profile_id()::text
    )
  );

drop policy if exists "owner_update_restaurants" on storage.objects;
create policy "owner_update_restaurants" on storage.objects
  for update
  using (
    bucket_id = 'restaurants'
    and (
      public.is_admin_like()
      or (storage.foldername(name))[1] = public.current_profile_id()::text
    )
  )
  with check (
    bucket_id = 'restaurants'
    and (
      public.is_admin_like()
      or (storage.foldername(name))[1] = public.current_profile_id()::text
    )
  );

drop policy if exists "owner_delete_restaurants" on storage.objects;
create policy "owner_delete_restaurants" on storage.objects
  for delete
  using (
    bucket_id = 'restaurants'
    and (
      public.is_admin_like()
      or (storage.foldername(name))[1] = public.current_profile_id()::text
    )
  );

-- Écriture publicités : admin uniquement.
drop policy if exists "admin_insert_ads" on storage.objects;
create policy "admin_insert_ads" on storage.objects
  for insert
  with check (bucket_id = 'ads' and public.is_admin_like());

drop policy if exists "admin_update_ads" on storage.objects;
create policy "admin_update_ads" on storage.objects
  for update
  using      (bucket_id = 'ads' and public.is_admin_like())
  with check (bucket_id = 'ads' and public.is_admin_like());

drop policy if exists "admin_delete_ads" on storage.objects;
create policy "admin_delete_ads" on storage.objects
  for delete
  using (bucket_id = 'ads' and public.is_admin_like());
