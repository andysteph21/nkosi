alter table public.profile enable row level security;
alter table public.cuisine enable row level security;
alter table public.restaurant enable row level security;
alter table public.restaurant_schedule enable row level security;
alter table public.restaurant_cuisine enable row level security;
alter table public.category enable row level security;
alter table public.plate enable row level security;
alter table public.ad enable row level security;
alter table public.favorite enable row level security;
alter table public.visibility_request enable row level security;
alter table public.notification enable row level security;

create or replace function public.current_profile_role()
returns text
language sql
stable
as $$
  select role
  from public.profile
  where user_id = auth.uid()
  limit 1;
$$;

create or replace function public.current_profile_id()
returns bigint
language sql
stable
as $$
  select id
  from public.profile
  where user_id = auth.uid()
  limit 1;
$$;

create or replace function public.is_admin_like()
returns boolean
language sql
stable
as $$
  select public.current_profile_role() in ('admin','super_admin');
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
as $$
  select public.current_profile_role() = 'super_admin';
$$;

drop policy if exists profile_self_read on public.profile;
create policy profile_self_read on public.profile
for select using (
  user_id = auth.uid() or public.is_admin_like()
);

drop policy if exists profile_update_self_or_super on public.profile;
create policy profile_update_self_or_super on public.profile
for update using (
  user_id = auth.uid() or public.is_super_admin()
)
with check (
  user_id = auth.uid() or public.is_super_admin()
);

drop policy if exists profile_insert_self on public.profile;
create policy profile_insert_self on public.profile
for insert with check (
  user_id = auth.uid() or public.is_super_admin()
);

drop policy if exists cuisine_public_read on public.cuisine;
create policy cuisine_public_read on public.cuisine
for select using (true);

drop policy if exists cuisine_admin_write on public.cuisine;
create policy cuisine_admin_write on public.cuisine
for all using (public.is_admin_like())
with check (public.is_admin_like());

drop policy if exists restaurant_public_read on public.restaurant;
create policy restaurant_public_read on public.restaurant
for select using (
  (not is_restricted and is_visible) or public.is_admin_like() or profile_id = public.current_profile_id()
);

drop policy if exists restaurant_owner_write on public.restaurant;
create policy restaurant_owner_write on public.restaurant
for all using (
  profile_id = public.current_profile_id() or public.is_admin_like()
)
with check (
  profile_id = public.current_profile_id() or public.is_admin_like()
);

drop policy if exists restaurant_schedule_read on public.restaurant_schedule;
create policy restaurant_schedule_read on public.restaurant_schedule
for select using (
  exists (
    select 1 from public.restaurant r
    where r.id = restaurant_id
    and ((not r.is_restricted and r.is_visible) or r.profile_id = public.current_profile_id() or public.is_admin_like())
  )
);

drop policy if exists restaurant_schedule_owner_write on public.restaurant_schedule;
create policy restaurant_schedule_owner_write on public.restaurant_schedule
for all using (
  exists (
    select 1 from public.restaurant r
    where r.id = restaurant_id
    and (r.profile_id = public.current_profile_id() or public.is_admin_like())
  )
)
with check (
  exists (
    select 1 from public.restaurant r
    where r.id = restaurant_id
    and (r.profile_id = public.current_profile_id() or public.is_admin_like())
  )
);

drop policy if exists restaurant_cuisine_read on public.restaurant_cuisine;
create policy restaurant_cuisine_read on public.restaurant_cuisine
for select using (true);

drop policy if exists restaurant_cuisine_write on public.restaurant_cuisine;
create policy restaurant_cuisine_write on public.restaurant_cuisine
for all using (
  exists (
    select 1 from public.restaurant r
    where r.id = restaurant_id
    and (r.profile_id = public.current_profile_id() or public.is_admin_like())
  )
)
with check (
  exists (
    select 1 from public.restaurant r
    where r.id = restaurant_id
    and (r.profile_id = public.current_profile_id() or public.is_admin_like())
  )
);

drop policy if exists category_read on public.category;
create policy category_read on public.category
for select using (true);

drop policy if exists category_owner_write on public.category;
create policy category_owner_write on public.category
for all using (
  exists (
    select 1 from public.restaurant r
    where r.id = restaurant_id
    and (r.profile_id = public.current_profile_id() or public.is_admin_like())
  )
)
with check (
  exists (
    select 1 from public.restaurant r
    where r.id = restaurant_id
    and (r.profile_id = public.current_profile_id() or public.is_admin_like())
  )
);

drop policy if exists plate_public_read on public.plate;
create policy plate_public_read on public.plate
for select using (
  is_visible and exists (
    select 1 from public.restaurant r
    where r.id = restaurant_id and not r.is_restricted and r.is_visible
  )
  or exists (
    select 1 from public.restaurant r
    where r.id = restaurant_id and (r.profile_id = public.current_profile_id() or public.is_admin_like())
  )
);

drop policy if exists plate_owner_write on public.plate;
create policy plate_owner_write on public.plate
for all using (
  exists (
    select 1 from public.restaurant r
    where r.id = restaurant_id and (r.profile_id = public.current_profile_id() or public.is_admin_like())
  )
)
with check (
  exists (
    select 1 from public.restaurant r
    where r.id = restaurant_id and (r.profile_id = public.current_profile_id() or public.is_admin_like())
  )
);

drop policy if exists ad_public_read on public.ad;
create policy ad_public_read on public.ad
for select using (is_active and (end_date is null or end_date > now()) or public.is_admin_like());

drop policy if exists ad_admin_write on public.ad;
create policy ad_admin_write on public.ad
for all using (public.is_admin_like())
with check (public.is_admin_like());

drop policy if exists favorite_self_read on public.favorite;
create policy favorite_self_read on public.favorite
for select using (profile_id = public.current_profile_id() or public.is_admin_like());

drop policy if exists favorite_self_write on public.favorite;
create policy favorite_self_write on public.favorite
for all using (profile_id = public.current_profile_id())
with check (profile_id = public.current_profile_id());

drop policy if exists visibility_read on public.visibility_request;
create policy visibility_read on public.visibility_request
for select using (
  public.is_admin_like()
  or exists (
    select 1 from public.restaurant r
    where r.id = restaurant_id and r.profile_id = public.current_profile_id()
  )
);

drop policy if exists visibility_create_owner on public.visibility_request;
create policy visibility_create_owner on public.visibility_request
for insert with check (
  exists (
    select 1 from public.restaurant r
    where r.id = restaurant_id and r.profile_id = public.current_profile_id()
  )
);

drop policy if exists visibility_admin_update on public.visibility_request;
create policy visibility_admin_update on public.visibility_request
for update using (public.is_admin_like())
with check (public.is_admin_like());

drop policy if exists notification_self_read on public.notification;
create policy notification_self_read on public.notification
for select using (profile_id = public.current_profile_id() or public.is_admin_like());

drop policy if exists notification_self_update on public.notification;
create policy notification_self_update on public.notification
for update using (profile_id = public.current_profile_id())
with check (profile_id = public.current_profile_id());

drop policy if exists notification_admin_insert on public.notification;
create policy notification_admin_insert on public.notification
for insert with check (public.is_admin_like());
