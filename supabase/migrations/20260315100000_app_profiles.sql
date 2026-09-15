-- App user profiles for role-based access
--
-- First Administrator setup (after creating the user in Supabase Auth → Users):
--   insert into public.app_profiles (user_id, email, display_name, role, product_ids)
--   values ('<auth-user-uuid>', 'admin@example.com', 'Admin', 'administrator', '{}');

create table if not exists public.app_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  display_name text not null default '',
  role text not null check (
    role in (
      'administrator',
      'technical_manager',
      'project_manager',
      'product_owner',
      'ceo'
    )
  ),
  product_ids text[] not null default '{}'
);

alter table public.app_profiles enable row level security;

drop policy if exists "Users can read own profile" on public.app_profiles;
drop policy if exists "Authenticated can read profiles" on public.app_profiles;
drop policy if exists "Administrators can manage profiles" on public.app_profiles;

-- Any authenticated user can read profiles (needed for Users admin list + own profile).
create policy "Authenticated can read profiles"
  on public.app_profiles for select to authenticated
  using (true);

-- Users can update their own display_name only via app; admins manage all via role check in app.
-- For v1 allow authenticated upserts so Administrator UI can update roles (tighten later).
create policy "Authenticated can upsert profiles"
  on public.app_profiles for all to authenticated
  using (true) with check (true);

grant select, insert, update, delete on public.app_profiles to authenticated;
grant select on public.app_profiles to anon;
