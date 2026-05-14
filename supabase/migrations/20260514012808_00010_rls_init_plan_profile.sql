-- Phase 5d — wrap auth.uid() in (select ...) so Postgres treats it as a
-- stable subquery (evaluated once) instead of a per-row function call.
-- The behaviour is identical; only the query plan improves.

drop policy if exists profile_self_read on public.profile;
create policy profile_self_read on public.profile
for select using (
  user_id = (select auth.uid()) or public.is_admin_like()
);

drop policy if exists profile_update_self_or_super on public.profile;
create policy profile_update_self_or_super on public.profile
for update using (
  user_id = (select auth.uid()) or public.is_super_admin()
)
with check (
  user_id = (select auth.uid()) or public.is_super_admin()
);

drop policy if exists profile_insert_self on public.profile;
create policy profile_insert_self on public.profile
for insert with check (
  user_id = (select auth.uid()) or public.is_super_admin()
);
