-- Phase 5c — indexes to cover foreign keys and the homepage query.

-- 1) Foreign keys without a covering index. Cascading deletes on a parent
--    row would otherwise sequentially scan the child table.
create index if not exists plate_restaurant_id_idx
  on public.plate (restaurant_id);

create index if not exists plate_category_id_idx
  on public.plate (category_id);

create index if not exists category_restaurant_id_idx
  on public.category (restaurant_id);

create index if not exists favorite_restaurant_id_idx
  on public.favorite (restaurant_id);

create index if not exists restaurant_cuisine_cuisine_id_idx
  on public.restaurant_cuisine (cuisine_id);

create index if not exists notification_profile_id_idx
  on public.notification (profile_id);

create index if not exists ad_created_by_idx
  on public.ad (created_by);

create index if not exists visibility_request_reviewed_by_idx
  on public.visibility_request (reviewed_by);

-- 2) Partial index used by the homepage listing query:
--    where is_visible = true and is_restricted = false
--    order by id
create index if not exists restaurant_visible_id_idx
  on public.restaurant (id)
  where is_visible and not is_restricted;

-- 3) Sort/filter index for ads.getActiveAds (active + sort_order).
create index if not exists ad_active_sort_idx
  on public.ad (sort_order)
  where is_active;
