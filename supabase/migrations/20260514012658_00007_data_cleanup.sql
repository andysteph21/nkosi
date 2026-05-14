-- Phase 5a — small data fixes accumulated during the audit.

-- 1) The handle_user_confirmed trigger only fires on UPDATE of
--    auth.users.email_confirmed_at. Profiles created before its activation,
--    or whose users were already confirmed via auth API at creation time,
--    have profile.confirmed_at = NULL even though auth.users.email_confirmed_at
--    is set. Backfill from the source of truth.
update public.profile p
   set confirmed_at = u.email_confirmed_at,
       updated_at   = now()
  from auth.users u
 where p.user_id = u.id
   and p.confirmed_at is null
   and u.email_confirmed_at is not null;

-- 2) Cuisine name was inserted with a trailing pipe character (probable
--    copy/paste error). Update referenced restaurants automatically via the
--    foreign key on restaurant_cuisine — only the cuisine.name string changes.
update public.cuisine
   set name = 'Fastfood',
       updated_at = now()
 where name = 'Fastfood |';
