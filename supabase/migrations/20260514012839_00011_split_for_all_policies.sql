-- Phase 5e — split each `owner_write FOR ALL` policy into separate
-- INSERT / UPDATE / DELETE policies so that they no longer pile up on top
-- of the dedicated `_read` policy for SELECT (advisor 0006). Semantics are
-- preserved: FOR ALL = FOR SELECT + INSERT + UPDATE + DELETE, and we now
-- handle SELECT exclusively via the existing read policies.

-- ---------------------------------------------------------------------------
-- ad
-- ---------------------------------------------------------------------------
drop policy if exists ad_admin_write on public.ad;
create policy ad_admin_insert on public.ad
  for insert with check (public.is_admin_like());
create policy ad_admin_update on public.ad
  for update using (public.is_admin_like()) with check (public.is_admin_like());
create policy ad_admin_delete on public.ad
  for delete using (public.is_admin_like());

-- ---------------------------------------------------------------------------
-- category
-- ---------------------------------------------------------------------------
drop policy if exists category_owner_write on public.category;
create policy category_owner_insert on public.category
  for insert with check (
    exists (
      select 1 from public.restaurant r
      where r.id = restaurant_id
        and (r.profile_id = public.current_profile_id() or public.is_admin_like())
    )
  );
create policy category_owner_update on public.category
  for update using (
    exists (
      select 1 from public.restaurant r
      where r.id = restaurant_id
        and (r.profile_id = public.current_profile_id() or public.is_admin_like())
    )
  ) with check (
    exists (
      select 1 from public.restaurant r
      where r.id = restaurant_id
        and (r.profile_id = public.current_profile_id() or public.is_admin_like())
    )
  );
create policy category_owner_delete on public.category
  for delete using (
    exists (
      select 1 from public.restaurant r
      where r.id = restaurant_id
        and (r.profile_id = public.current_profile_id() or public.is_admin_like())
    )
  );

-- ---------------------------------------------------------------------------
-- cuisine
-- ---------------------------------------------------------------------------
drop policy if exists cuisine_admin_write on public.cuisine;
create policy cuisine_admin_insert on public.cuisine
  for insert with check (public.is_admin_like());
create policy cuisine_admin_update on public.cuisine
  for update using (public.is_admin_like()) with check (public.is_admin_like());
create policy cuisine_admin_delete on public.cuisine
  for delete using (public.is_admin_like());

-- ---------------------------------------------------------------------------
-- favorite
-- ---------------------------------------------------------------------------
drop policy if exists favorite_self_write on public.favorite;
create policy favorite_self_insert on public.favorite
  for insert with check (profile_id = public.current_profile_id());
create policy favorite_self_update on public.favorite
  for update using (profile_id = public.current_profile_id())
              with check (profile_id = public.current_profile_id());
create policy favorite_self_delete on public.favorite
  for delete using (profile_id = public.current_profile_id());

-- ---------------------------------------------------------------------------
-- plate
-- ---------------------------------------------------------------------------
drop policy if exists plate_owner_write on public.plate;
create policy plate_owner_insert on public.plate
  for insert with check (
    exists (
      select 1 from public.restaurant r
      where r.id = restaurant_id
        and (r.profile_id = public.current_profile_id() or public.is_admin_like())
    )
  );
create policy plate_owner_update on public.plate
  for update using (
    exists (
      select 1 from public.restaurant r
      where r.id = restaurant_id
        and (r.profile_id = public.current_profile_id() or public.is_admin_like())
    )
  ) with check (
    exists (
      select 1 from public.restaurant r
      where r.id = restaurant_id
        and (r.profile_id = public.current_profile_id() or public.is_admin_like())
    )
  );
create policy plate_owner_delete on public.plate
  for delete using (
    exists (
      select 1 from public.restaurant r
      where r.id = restaurant_id
        and (r.profile_id = public.current_profile_id() or public.is_admin_like())
    )
  );

-- ---------------------------------------------------------------------------
-- restaurant
-- ---------------------------------------------------------------------------
drop policy if exists restaurant_owner_write on public.restaurant;
create policy restaurant_owner_insert on public.restaurant
  for insert with check (
    profile_id = public.current_profile_id() or public.is_admin_like()
  );
create policy restaurant_owner_update on public.restaurant
  for update using (
    profile_id = public.current_profile_id() or public.is_admin_like()
  ) with check (
    profile_id = public.current_profile_id() or public.is_admin_like()
  );
create policy restaurant_owner_delete on public.restaurant
  for delete using (
    profile_id = public.current_profile_id() or public.is_admin_like()
  );

-- ---------------------------------------------------------------------------
-- restaurant_cuisine
-- ---------------------------------------------------------------------------
drop policy if exists restaurant_cuisine_write on public.restaurant_cuisine;
create policy restaurant_cuisine_insert on public.restaurant_cuisine
  for insert with check (
    exists (
      select 1 from public.restaurant r
      where r.id = restaurant_id
        and (r.profile_id = public.current_profile_id() or public.is_admin_like())
    )
  );
create policy restaurant_cuisine_update on public.restaurant_cuisine
  for update using (
    exists (
      select 1 from public.restaurant r
      where r.id = restaurant_id
        and (r.profile_id = public.current_profile_id() or public.is_admin_like())
    )
  ) with check (
    exists (
      select 1 from public.restaurant r
      where r.id = restaurant_id
        and (r.profile_id = public.current_profile_id() or public.is_admin_like())
    )
  );
create policy restaurant_cuisine_delete on public.restaurant_cuisine
  for delete using (
    exists (
      select 1 from public.restaurant r
      where r.id = restaurant_id
        and (r.profile_id = public.current_profile_id() or public.is_admin_like())
    )
  );

-- ---------------------------------------------------------------------------
-- restaurant_schedule
-- ---------------------------------------------------------------------------
drop policy if exists restaurant_schedule_owner_write on public.restaurant_schedule;
create policy restaurant_schedule_owner_insert on public.restaurant_schedule
  for insert with check (
    exists (
      select 1 from public.restaurant r
      where r.id = restaurant_id
        and (r.profile_id = public.current_profile_id() or public.is_admin_like())
    )
  );
create policy restaurant_schedule_owner_update on public.restaurant_schedule
  for update using (
    exists (
      select 1 from public.restaurant r
      where r.id = restaurant_id
        and (r.profile_id = public.current_profile_id() or public.is_admin_like())
    )
  ) with check (
    exists (
      select 1 from public.restaurant r
      where r.id = restaurant_id
        and (r.profile_id = public.current_profile_id() or public.is_admin_like())
    )
  );
create policy restaurant_schedule_owner_delete on public.restaurant_schedule
  for delete using (
    exists (
      select 1 from public.restaurant r
      where r.id = restaurant_id
        and (r.profile_id = public.current_profile_id() or public.is_admin_like())
    )
  );
