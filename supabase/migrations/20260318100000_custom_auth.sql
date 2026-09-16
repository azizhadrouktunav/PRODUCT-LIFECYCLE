-- Custom authentication (replaces Supabase Auth).
--
-- Password hashes live in public.app_users, which has NO grants for anon /
-- authenticated: only the service role key (Edge Functions) can reach it.
-- Sessions are opaque random tokens; only their sha256 is stored server-side.

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  -- null = account created but password never set (pending invite)
  password_hash text,
  disabled boolean not null default false,
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.app_user_tokens (
  -- sha256 hex of the token emailed to the user
  token_hash text primary key,
  user_id uuid not null references public.app_users (id) on delete cascade,
  kind text not null check (kind in ('invite', 'reset')),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists app_user_tokens_user_id_idx
  on public.app_user_tokens (user_id);

create table if not exists public.app_sessions (
  token_hash text primary key,
  user_id uuid not null references public.app_users (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists app_sessions_user_id_idx
  on public.app_sessions (user_id);

-- Carry over existing accounts keeping the same UUIDs so app_profiles rows
-- (role + product assignments) stay intact. password_hash stays null: every
-- user must set a password through an invite email.
insert into public.app_users (id, email)
select user_id, lower(email)
from public.app_profiles
where email <> ''
on conflict (id) do nothing;

-- Re-point app_profiles.user_id from auth.users to app_users.
alter table public.app_profiles
  drop constraint if exists app_profiles_user_id_fkey;

alter table public.app_profiles
  add constraint app_profiles_user_id_fkey
  foreign key (user_id) references public.app_users (id) on delete cascade;

-- Lock the auth tables down: RLS on, no policies, no grants.
alter table public.app_users enable row level security;
alter table public.app_user_tokens enable row level security;
alter table public.app_sessions enable row level security;

revoke all on public.app_users from anon, authenticated;
revoke all on public.app_user_tokens from anon, authenticated;
revoke all on public.app_sessions from anon, authenticated;

-- Account status for the Users admin table, without exposing hashes.
-- Runs with the view owner's privileges (security_invoker defaults to off).
create or replace view public.app_user_status as
select
  u.id as user_id,
  (u.password_hash is not null and not u.disabled) as is_active,
  u.last_login_at
from public.app_users u;

grant select on public.app_user_status to anon, authenticated;

-- The browser no longer carries an `authenticated` JWT, so hand anon the same
-- privileges `authenticated` had on the profile/role tables.
drop policy if exists "Anon can read profiles" on public.app_profiles;
drop policy if exists "Anon can upsert profiles" on public.app_profiles;

create policy "Anon can read profiles"
  on public.app_profiles for select to anon
  using (true);

create policy "Anon can upsert profiles"
  on public.app_profiles for all to anon
  using (true) with check (true);

drop policy if exists "Anon can read roles" on public.app_roles;
drop policy if exists "Anon can manage roles" on public.app_roles;
drop policy if exists "Anon can read role permissions" on public.app_role_permissions;
drop policy if exists "Anon can manage role permissions" on public.app_role_permissions;

create policy "Anon can read roles"
  on public.app_roles for select to anon
  using (true);

create policy "Anon can manage roles"
  on public.app_roles for all to anon
  using (true) with check (true);

create policy "Anon can read role permissions"
  on public.app_role_permissions for select to anon
  using (true);

create policy "Anon can manage role permissions"
  on public.app_role_permissions for all to anon
  using (true) with check (true);

grant select, insert, update, delete on public.app_profiles to anon;
grant select, insert, update, delete on public.app_roles to anon;
grant select, insert, update, delete on public.app_role_permissions to anon;
