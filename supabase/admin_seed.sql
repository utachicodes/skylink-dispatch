-- Seed script to create an initial SkyLink admin user.
-- Run this once in the Supabase SQL editor.
--
-- 1) Adjust the email and password below to what you want.
-- 2) Run the whole file.
-- 3) Log in with that email/password in the app – the user will have admin access.

-- STEP 1: Create auth user (if it does not already exist)
insert into auth.users (email, encrypted_password)
values (
  'admin@skylink.local',                    -- change this to your admin email
  crypt('SkyLinkAdmin!2025', gen_salt('bf')) -- change this to a strong password
)
on conflict (email) do nothing;

-- STEP 2: Look up the user's id
-- NOTE: You can run this SELECT alone after the INSERT to see the id.
-- select id, email from auth.users where email = 'admin@skylink.local';

-- STEP 3: Promote the user to admin
-- This uses a subquery to avoid manually copying the UUID.
insert into public.user_roles (user_id, role)
select id, 'admin'::public.app_role
from auth.users
where email = 'admin@skylink.local'
on conflict (user_id, role) do nothing;

-- After running this:
--   Email:    admin@skylink.local
--   Password: SkyLinkAdmin!2025
-- can be used to log in, and that account will have admin access (/admin).


