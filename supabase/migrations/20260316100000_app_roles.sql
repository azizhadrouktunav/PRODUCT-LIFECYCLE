-- Dynamic roles + permissions (seeded from previous hardcoded RBAC matrix).
-- app_profiles.role becomes a FK to app_roles.slug.

create table if not exists public.app_roles (
  slug text primary key,
  label text not null,
  description text not null default '',
  sees_all_products boolean not null default false,
  is_system boolean not null default false
);

create table if not exists public.app_role_permissions (
  role_slug text not null references public.app_roles (slug) on delete cascade on update cascade,
  action text not null,
  primary key (role_slug, action),
  constraint app_role_permissions_action_check check (
    action in (
      'edit_all',
      'manage_users',
      'manage_equipment',
      'add_capability',
      'edit_capability',
      'delete_capability',
      'edit_capability_progress',
      'edit_story_stage',
      'manage_groups',
      'manage_lifecycles',
      'manage_actors',
      'manage_waves',
      'manage_products',
      'import_export'
    )
  )
);

-- Seed system roles (idempotent).
insert into public.app_roles (slug, label, description, sees_all_products, is_system)
values
  ('administrator', 'Administrator', 'Full access to all settings and data.', true, true),
  ('ceo', 'CEO', 'Read-only access across all products.', true, true),
  ('technical_manager', 'Technical Manager', 'Manage equipment.', false, true),
  ('product_owner', 'Product Owner', 'Manage capabilities and early progress stages.', false, true),
  ('project_manager', 'Project Manager', 'Manage story delivery stages.', false, true)
on conflict (slug) do nothing;

-- Administrator: all actions
insert into public.app_role_permissions (role_slug, action)
select 'administrator', a.action
from (
  values
    ('edit_all'),
    ('manage_users'),
    ('manage_equipment'),
    ('add_capability'),
    ('edit_capability'),
    ('delete_capability'),
    ('edit_capability_progress'),
    ('edit_story_stage'),
    ('manage_groups'),
    ('manage_lifecycles'),
    ('manage_actors'),
    ('manage_waves'),
    ('manage_products'),
    ('import_export')
) as a(action)
on conflict do nothing;

-- technical_manager
insert into public.app_role_permissions (role_slug, action)
values ('technical_manager', 'manage_equipment')
on conflict do nothing;

-- product_owner
insert into public.app_role_permissions (role_slug, action)
values
  ('product_owner', 'add_capability'),
  ('product_owner', 'edit_capability'),
  ('product_owner', 'edit_capability_progress')
on conflict do nothing;

-- project_manager
insert into public.app_role_permissions (role_slug, action)
values ('project_manager', 'edit_story_stage')
on conflict do nothing;

-- ceo: no write permissions (intentionally empty)

-- Relax app_profiles.role CHECK and add FK to app_roles.
alter table public.app_profiles drop constraint if exists app_profiles_role_check;

-- Ensure any unknown roles are remapped before FK (safety for non-seeded data).
update public.app_profiles
set role = 'ceo'
where role not in (
  select slug from public.app_roles
);

alter table public.app_profiles
  drop constraint if exists app_profiles_role_fkey;

alter table public.app_profiles
  add constraint app_profiles_role_fkey
  foreign key (role) references public.app_roles (slug)
  on update cascade
  on delete restrict;

alter table public.app_roles enable row level security;
alter table public.app_role_permissions enable row level security;

drop policy if exists "Authenticated can read roles" on public.app_roles;
drop policy if exists "Authenticated can manage roles" on public.app_roles;
drop policy if exists "Authenticated can read role permissions" on public.app_role_permissions;
drop policy if exists "Authenticated can manage role permissions" on public.app_role_permissions;

create policy "Authenticated can read roles"
  on public.app_roles for select to authenticated
  using (true);

create policy "Authenticated can manage roles"
  on public.app_roles for all to authenticated
  using (true) with check (true);

create policy "Authenticated can read role permissions"
  on public.app_role_permissions for select to authenticated
  using (true);

create policy "Authenticated can manage role permissions"
  on public.app_role_permissions for all to authenticated
  using (true) with check (true);

grant select, insert, update, delete on public.app_roles to authenticated;
grant select on public.app_roles to anon;
grant select, insert, update, delete on public.app_role_permissions to authenticated;
grant select on public.app_role_permissions to anon;
