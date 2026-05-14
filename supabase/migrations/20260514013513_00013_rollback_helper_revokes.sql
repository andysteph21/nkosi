-- HOTFIX: an earlier attempt at function hardening (00008) revoked EXECUTE
-- on the SECURITY DEFINER RLS helpers from `anon` and `authenticated`. Even
-- though those functions are SECURITY DEFINER, the calling role still needs
-- EXECUTE to invoke them — and our RLS policies on restaurant / ad / plate
-- / etc. call them transitively. Result: guests and signed-in users started
-- seeing "permission denied for function current_profile_id" and a fully
-- blank home.
--
-- Restore the grants. The Supabase advisors will flag these helpers as
-- "callable via /rest/v1/rpc/..." (lints 0028 / 0029) — that's a known
-- tradeoff we'll fix later by moving the helpers to a non-PostgREST
-- schema (e.g. `private`).

grant execute on function public.current_profile_id()    to anon, authenticated;
grant execute on function public.current_profile_role()  to anon, authenticated;
grant execute on function public.is_admin_like()         to anon, authenticated;
grant execute on function public.is_super_admin()        to anon, authenticated;
