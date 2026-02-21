create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
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
security definer
set search_path = public
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
security definer
set search_path = public
as $$
  select public.current_profile_role() in ('admin','super_admin');
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_profile_role() = 'super_admin';
$$;

revoke all on function public.current_profile_role() from public;
revoke all on function public.current_profile_id() from public;
revoke all on function public.is_admin_like() from public;
revoke all on function public.is_super_admin() from public;

grant execute on function public.current_profile_role() to anon, authenticated, service_role;
grant execute on function public.current_profile_id() to anon, authenticated, service_role;
grant execute on function public.is_admin_like() to anon, authenticated, service_role;
grant execute on function public.is_super_admin() to anon, authenticated, service_role;
