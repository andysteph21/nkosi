-- Seed super admin and starter cuisines.
-- You can override these values by setting Postgres settings before running seed:
--   alter database postgres set app.settings.super_admin_email = 'admin@example.com';
--   alter database postgres set app.settings.super_admin_password = 'ChangeMe123!';
--   alter database postgres set app.settings.super_admin_first_name = 'Super';
--   alter database postgres set app.settings.super_admin_last_name = 'Admin';

do $$
declare
  v_email text := coalesce(current_setting('app.settings.super_admin_email', true), 'superadmin@nkosi.local');
  v_password text := coalesce(current_setting('app.settings.super_admin_password', true), 'ChangeMe123!');
  v_first_name text := coalesce(current_setting('app.settings.super_admin_first_name', true), 'Super');
  v_last_name text := coalesce(current_setting('app.settings.super_admin_last_name', true), 'Admin');
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = v_email limit 1;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      v_email,
      crypt(v_password, gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('first_name', v_first_name, 'last_name', v_last_name),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      v_user_id,
      v_user_id,
      jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
      'email',
      v_user_id::text,
      now(),
      now(),
      now()
    );
  end if;

  insert into public.profile (user_id, first_name, last_name, email, role, must_change_password, confirmed_at)
  values (v_user_id, v_first_name, v_last_name, v_email, 'super_admin', true, now())
  on conflict (user_id) do update
  set role = excluded.role,
      must_change_password = true,
      first_name = excluded.first_name,
      last_name = excluded.last_name,
      email = excluded.email,
      confirmed_at = coalesce(public.profile.confirmed_at, excluded.confirmed_at),
      updated_at = now();
end $$;

insert into public.cuisine (name)
values
  ('Senegalaise'),
  ('Maliane'),
  ('Ivoirienne'),
  ('Camerounaise'),
  ('Congolaise'),
  ('Nigeriane'),
  ('Ghaneenne'),
  ('Ethiopienne'),
  ('Rwandaise')
on conflict (name) do nothing;
