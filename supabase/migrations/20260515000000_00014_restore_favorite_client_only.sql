-- REGRESSION FIX: migration 00011 split favorite_self_write FOR ALL into
-- separate INSERT/UPDATE/DELETE policies but dropped the
-- `current_profile_role() = 'client'` check originally added in 00005.
-- That accidentally re-opened favorite writes to any authenticated user
-- (restaurateur, admin, super_admin) — the UI doesn't expose it, but a
-- direct PostgREST call would succeed.
--
-- Restore the role check on the three write policies. The SELECT policy
-- (favorite_self_read) stays unchanged — admins are allowed to see
-- favorites for moderation.

drop policy if exists favorite_self_insert on public.favorite;
create policy favorite_self_insert on public.favorite
  for insert with check (
    profile_id = public.current_profile_id()
    and public.current_profile_role() = 'client'
  );

drop policy if exists favorite_self_update on public.favorite;
create policy favorite_self_update on public.favorite
  for update using (
    profile_id = public.current_profile_id()
    and public.current_profile_role() = 'client'
  ) with check (
    profile_id = public.current_profile_id()
    and public.current_profile_role() = 'client'
  );

drop policy if exists favorite_self_delete on public.favorite;
create policy favorite_self_delete on public.favorite
  for delete using (
    profile_id = public.current_profile_id()
    and public.current_profile_role() = 'client'
  );
