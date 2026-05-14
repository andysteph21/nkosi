-- =============================================================================
-- 00006b_storage_no_listing.sql
--
-- Hotfix appliqué juste après 00006_storage_buckets.sql : retirer les policies
-- SELECT sur storage.objects.
--
-- Les buckets `restaurants` et `ads` sont publics (`storage.buckets.public =
-- true`). Supabase sert leur contenu via `/storage/v1/object/public/...` sans
-- passer par RLS. Une policy SELECT activait l'opération `list()` (depuis
-- supabase-js `.list()`), permettant à un anonyme d'énumérer tous les fichiers
-- — c'est ce que signale l'advisor `public_bucket_allows_listing`. L'accès
-- direct par URL fonctionne toujours sans cette policy.
-- =============================================================================

drop policy if exists "public_read_restaurants" on storage.objects;
drop policy if exists "public_read_ads" on storage.objects;
