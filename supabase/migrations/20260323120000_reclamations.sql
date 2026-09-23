-- Reclamations / demandes: create by anyone; see own or assigned; manage_reclamations sees all.

-- ---------------------------------------------------------------------------
-- Permission: manage_reclamations
-- ---------------------------------------------------------------------------
alter table public.app_role_permissions
  drop constraint if exists app_role_permissions_action_check;

alter table public.app_role_permissions
  add constraint app_role_permissions_action_check check (
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
      'import_export',
      'manage_reclamations'
    )
  );

insert into public.app_role_permissions (role_slug, action)
values ('administrator', 'manage_reclamations')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.reclamations (
  id text primary key,
  title text not null,
  description text not null default '',
  category text not null
    check (category in ('technique', 'produit', 'it')),
  status text not null default 'Open'
    check (status in ('Open', 'In Progress', 'Resolved', 'Closed')),
  product_ids text[] not null default '{}',
  assignee_id uuid references public.app_users (id) on delete set null,
  assignee_name text not null default '',
  created_by uuid not null references public.app_users (id) on delete cascade,
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reclamations_category_rules check (
    (category = 'technique' and assignee_id is not null)
    or (category = 'it' and assignee_id is not null)
    or (category = 'produit' and cardinality(product_ids) > 0)
  )
);

create index if not exists reclamations_created_by_idx on public.reclamations (created_by);
create index if not exists reclamations_assignee_id_idx on public.reclamations (assignee_id);
create index if not exists reclamations_category_idx on public.reclamations (category);
create index if not exists reclamations_status_idx on public.reclamations (status);

comment on table public.reclamations is
  'User reclamations / demandes. Visibility: author, assignee, or manage_reclamations.';

alter table public.reclamations enable row level security;

drop policy if exists "reclamations select own assigned or manage" on public.reclamations;
create policy "reclamations select own assigned or manage"
  on public.reclamations for select to authenticated
  using (
    created_by = (select public.app_uid())
    or assignee_id = (select public.app_uid())
    or public.app_has('manage_reclamations')
  );

drop policy if exists "reclamations insert authenticated" on public.reclamations;
create policy "reclamations insert authenticated"
  on public.reclamations for insert to authenticated
  with check (
    (select public.app_uid()) is not null
    and created_by = (select public.app_uid())
  );

drop policy if exists "reclamations update own assigned or manage" on public.reclamations;
create policy "reclamations update own assigned or manage"
  on public.reclamations for update to authenticated
  using (
    created_by = (select public.app_uid())
    or assignee_id = (select public.app_uid())
    or public.app_has('manage_reclamations')
  )
  with check (
    created_by = (select public.app_uid())
    or assignee_id = (select public.app_uid())
    or public.app_has('manage_reclamations')
  );

drop policy if exists "reclamations delete author or manage" on public.reclamations;
create policy "reclamations delete author or manage"
  on public.reclamations for delete to authenticated
  using (
    created_by = (select public.app_uid())
    or public.app_has('manage_reclamations')
  );

grant select, insert, update, delete on public.reclamations to authenticated;

-- ---------------------------------------------------------------------------
-- Assignable users by role (TM / PM pickers) — security definer
-- ---------------------------------------------------------------------------
create or replace function public.app_list_users_by_role(p_role text)
returns table (
  user_id uuid,
  email text,
  display_name text,
  role text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.user_id,
    coalesce(p.email, '')::text,
    coalesce(p.display_name, '')::text,
    p.role::text
  from public.app_profiles p
  where p.role = p_role
    and public.app_uid() is not null
  order by lower(coalesce(nullif(p.display_name, ''), p.email));
$$;

revoke all on function public.app_list_users_by_role(text) from public;
grant execute on function public.app_list_users_by_role(text) to authenticated;
