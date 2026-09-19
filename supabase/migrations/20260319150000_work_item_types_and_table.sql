-- Dynamic work-item types on lifecycles + generic work_items table.

alter table public.lifecycles
  add column if not exists work_item_types jsonb not null default '[]'::jsonb;

comment on column public.lifecycles.work_item_types is
  'Ordered hierarchy levels (id, label, parentTypeId, statuses, stages, storage).';

-- Backfill delivery lifecycles from decomposition + story_stages when empty.
update public.lifecycles
set work_item_types = jsonb_build_array(
  jsonb_build_object(
    'id', 'epic',
    'label', 'Epic',
    'pluralLabel', 'Epics',
    'parentTypeId', null,
    'statuses', jsonb_build_array('On Hold', 'In Progress', 'Needs Review', 'Completed'),
    'stages', '[]'::jsonb,
    'storage', 'builtin'
  ),
  jsonb_build_object(
    'id', 'feature',
    'label', 'Feature',
    'pluralLabel', 'Features',
    'parentTypeId', 'epic',
    'statuses', jsonb_build_array('On Hold', 'In Progress', 'Needs Review', 'Completed'),
    'stages', '[]'::jsonb,
    'storage', 'builtin'
  ),
  jsonb_build_object(
    'id', 'story',
    'label', 'User story',
    'pluralLabel', 'User stories',
    'parentTypeId', 'feature',
    'statuses', jsonb_build_array('On Hold', 'In Progress', 'Needs Review', 'Completed'),
    'stages', coalesce(story_stages, '[]'::jsonb),
    'storage', 'builtin'
  )
)
where decomposition = 'delivery'
  and (work_item_types is null or work_item_types = '[]'::jsonb);

create table if not exists public.work_items (
  id text primary key,
  type_id text not null,
  capability_id text not null references public.capabilities (id) on delete cascade,
  parent_id text references public.work_items (id) on delete cascade,
  name text not null,
  description text not null default '',
  status text not null default 'In Progress',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists work_items_capability_id_idx on public.work_items (capability_id);
create index if not exists work_items_type_id_idx on public.work_items (type_id);
create index if not exists work_items_parent_id_idx on public.work_items (parent_id);

alter table public.work_items enable row level security;

-- Read when the parent capability is visible to the user.
drop policy if exists "Signed-in users read work_items" on public.work_items;
create policy "Signed-in users read work_items"
  on public.work_items for select to authenticated
  using (
    exists (
      select 1 from public.capabilities c
      where c.id = work_items.capability_id
        and public.app_sees_products(c.product_ids)
    )
  );

drop policy if exists "manage_capabilities writes work_items" on public.work_items;
create policy "manage_capabilities inserts work_items"
  on public.work_items for insert to authenticated
  with check (
    public.app_has('manage_capabilities')
    and exists (
      select 1 from public.capabilities c
      where c.id = capability_id
        and public.app_sees_products(c.product_ids)
    )
  );

create policy "manage_capabilities updates work_items"
  on public.work_items for update to authenticated
  using (
    public.app_has('manage_capabilities')
    and exists (
      select 1 from public.capabilities c
      where c.id = work_items.capability_id
        and public.app_sees_products(c.product_ids)
    )
  )
  with check (
    public.app_has('manage_capabilities')
    and exists (
      select 1 from public.capabilities c
      where c.id = capability_id
        and public.app_sees_products(c.product_ids)
    )
  );

create policy "manage_capabilities deletes work_items"
  on public.work_items for delete to authenticated
  using (
    public.app_has('manage_capabilities')
    and exists (
      select 1 from public.capabilities c
      where c.id = work_items.capability_id
        and public.app_sees_products(c.product_ids)
    )
  );

grant select, insert, update, delete on public.work_items to authenticated;
