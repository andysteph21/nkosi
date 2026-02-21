create extension if not exists "pgcrypto";

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profile (
  id bigserial primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  email text not null unique,
  role text not null check (role in ('super_admin', 'admin', 'restaurateur', 'client')),
  is_active boolean not null default true,
  must_change_password boolean not null default false,
  invited_at timestamptz,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cuisine (
  id bigserial primary key,
  name text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurant (
  id bigserial primary key,
  profile_id bigint not null unique references public.profile(id) on delete cascade,
  name text not null,
  description text check (char_length(description) <= 200),
  city text not null,
  neighborhood text not null,
  address text not null,
  logo jsonb,
  cover jsonb,
  is_restricted boolean not null default true,
  is_visible boolean not null default false,
  view_count integer not null default 0,
  like_count integer not null default 0,
  click_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurant_schedule (
  id bigserial primary key,
  restaurant_id bigint not null references public.restaurant(id) on delete cascade,
  day_of_week text not null check (day_of_week in ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  is_closed boolean not null default false,
  open_time time,
  close_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(restaurant_id, day_of_week)
);

create table if not exists public.restaurant_cuisine (
  restaurant_id bigint not null references public.restaurant(id) on delete cascade,
  cuisine_id bigint not null references public.cuisine(id) on delete cascade,
  is_main boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (restaurant_id, cuisine_id)
);

create unique index if not exists restaurant_main_cuisine_unique
on public.restaurant_cuisine (restaurant_id)
where is_main = true;

create table if not exists public.category (
  id bigserial primary key,
  name text not null,
  restaurant_id bigint not null references public.restaurant(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(name, restaurant_id)
);

create table if not exists public.plate (
  id bigserial primary key,
  restaurant_id bigint not null references public.restaurant(id) on delete cascade,
  category_id bigint references public.category(id) on delete set null,
  name text not null,
  price integer not null check (price >= 0),
  image jsonb not null,
  video jsonb,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(name, restaurant_id)
);

create table if not exists public.ad (
  id bigserial primary key,
  media_url text not null,
  media_type text not null check (media_type in ('image','video')),
  alt_text text,
  link_url text,
  is_active boolean not null default false,
  end_date timestamptz,
  sort_order integer not null default 0,
  created_by bigint references public.profile(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.favorite (
  profile_id bigint not null references public.profile(id) on delete cascade,
  restaurant_id bigint not null references public.restaurant(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, restaurant_id)
);

create table if not exists public.visibility_request (
  id bigserial primary key,
  restaurant_id bigint not null unique references public.restaurant(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','refused')),
  refusal_message text check (char_length(refusal_message) <= 500),
  reviewed_by bigint references public.profile(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notification (
  id bigserial primary key,
  profile_id bigint not null references public.profile(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.handle_user_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profile
  set confirmed_at = now(), updated_at = now()
  where user_id = new.id and confirmed_at is null and new.email_confirmed_at is not null;
  return new;
end;
$$;

create or replace function public.increment_restaurant_views(p_restaurant_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.restaurant
  set view_count = view_count + 1,
      updated_at = now()
  where id = p_restaurant_id;
$$;

create or replace function public.increment_restaurant_likes(p_restaurant_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.restaurant
  set like_count = like_count + 1,
      updated_at = now()
  where id = p_restaurant_id;
$$;

create or replace function public.decrement_restaurant_likes(p_restaurant_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.restaurant
  set like_count = greatest(like_count - 1, 0),
      updated_at = now()
  where id = p_restaurant_id;
$$;

create or replace function public.increment_restaurant_clicks(p_restaurant_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.restaurant
  set click_count = click_count + 1,
      updated_at = now()
  where id = p_restaurant_id;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
after update of email_confirmed_at on auth.users
for each row execute function public.handle_user_confirmed();

drop trigger if exists profile_updated_at on public.profile;
create trigger profile_updated_at before update on public.profile
for each row execute function public.set_updated_at();

drop trigger if exists cuisine_updated_at on public.cuisine;
create trigger cuisine_updated_at before update on public.cuisine
for each row execute function public.set_updated_at();

drop trigger if exists restaurant_updated_at on public.restaurant;
create trigger restaurant_updated_at before update on public.restaurant
for each row execute function public.set_updated_at();

drop trigger if exists restaurant_schedule_updated_at on public.restaurant_schedule;
create trigger restaurant_schedule_updated_at before update on public.restaurant_schedule
for each row execute function public.set_updated_at();

drop trigger if exists category_updated_at on public.category;
create trigger category_updated_at before update on public.category
for each row execute function public.set_updated_at();

drop trigger if exists plate_updated_at on public.plate;
create trigger plate_updated_at before update on public.plate
for each row execute function public.set_updated_at();

drop trigger if exists ad_updated_at on public.ad;
create trigger ad_updated_at before update on public.ad
for each row execute function public.set_updated_at();

drop trigger if exists visibility_request_updated_at on public.visibility_request;
create trigger visibility_request_updated_at before update on public.visibility_request
for each row execute function public.set_updated_at();
