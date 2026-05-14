-- Phase 5b — security hardening of SECURITY DEFINER helpers.

-- 1) `set_updated_at` is a trigger, used on most public.* tables. As-is, it
--    has a mutable search_path which would allow an attacker who could
--    create same-named objects in another schema (e.g. session-scoped temp)
--    to subvert the trigger body. Pin the search_path to public/pg_temp.
--    Safe to redefine: triggers reference the function by oid.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 2) Originally this migration revoked EXECUTE on the SECURITY DEFINER
--    helpers (current_profile_id, current_profile_role, is_admin_like,
--    is_super_admin, handle_user_confirmed) from anon and authenticated.
--    That turned out to break RLS itself — even SECURITY DEFINER functions
--    require the caller to hold EXECUTE — see migration 00013 for the
--    rollback. The grants therefore stay in place; the RPC-exposure
--    advisor for these helpers is a tradeoff we accept until the helpers
--    are moved to a non-PostgREST schema (e.g. `private`).

-- handle_user_confirmed is a trigger function on auth.users; client roles
-- have no reason to call it. Safe to revoke.
revoke execute on function public.handle_user_confirmed() from anon, authenticated, public;
