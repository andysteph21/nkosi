-- The `ads` bucket is no longer referenced by application code (banners now
-- live under `restaurants/__platform/banners/...` to dodge ad-blocker URL
-- filters). Drop the now-orphan storage.objects policies that gated writes
-- to it. The empty bucket itself must be removed via the Storage REST API
-- (Supabase protects `storage.buckets` with a delete trigger) — see Dashboard
-- → Storage → buckets → remove `ads`, or `supabase.storage.deleteBucket('ads')`.

drop policy if exists "admin_insert_ads" on storage.objects;
drop policy if exists "admin_update_ads" on storage.objects;
drop policy if exists "admin_delete_ads" on storage.objects;
