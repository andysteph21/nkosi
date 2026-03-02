-- Restrict favorite writes to users with the 'client' role.
-- The previous policy only checked ownership (profile_id = current_profile_id()),
-- allowing any authenticated user to insert favorites via direct DB access.

drop policy if exists favorite_self_write on public.favorite;
create policy favorite_self_write on public.favorite
for all
using (
  profile_id = public.current_profile_id()
  and public.current_profile_role() = 'client'
)
with check (
  profile_id = public.current_profile_id()
  and public.current_profile_role() = 'client'
);
