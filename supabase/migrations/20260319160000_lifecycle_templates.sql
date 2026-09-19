-- User-managed lifecycle templates (system delivery + hardware seeded).

create table if not exists public.lifecycle_templates (
  id text primary key,
  label text not null,
  summary text not null default '',
  decomposition text not null default 'delivery',
  stages jsonb not null default '[]'::jsonb,
  story_stages jsonb not null default '[]'::jsonb,
  work_item_types jsonb not null default '[]'::jsonb,
  automation_rules jsonb not null default '[]'::jsonb,
  product_ids text[] not null default '{}',
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.lifecycle_templates is
  'Reusable lifecycle configurations. System templates (delivery/hardware) are not deletable.';

alter table public.lifecycle_templates enable row level security;

-- Empty product_ids = visible to everyone authenticated (company-wide template).
drop policy if exists "Signed-in users read lifecycle_templates" on public.lifecycle_templates;
create policy "Signed-in users read lifecycle_templates"
  on public.lifecycle_templates for select to authenticated
  using (
    coalesce(cardinality(product_ids), 0) = 0
    or public.app_sees_products(product_ids)
  );

drop policy if exists "manage_lifecycles inserts lifecycle_templates" on public.lifecycle_templates;
create policy "manage_lifecycles inserts lifecycle_templates"
  on public.lifecycle_templates for insert to authenticated
  with check (
    public.app_has('manage_lifecycles')
    and (
      coalesce(cardinality(product_ids), 0) = 0
      or public.app_sees_products(product_ids)
    )
  );

drop policy if exists "manage_lifecycles updates lifecycle_templates" on public.lifecycle_templates;
create policy "manage_lifecycles updates lifecycle_templates"
  on public.lifecycle_templates for update to authenticated
  using (
    public.app_has('manage_lifecycles')
    and (
      coalesce(cardinality(product_ids), 0) = 0
      or public.app_sees_products(product_ids)
    )
  )
  with check (
    public.app_has('manage_lifecycles')
    and (
      coalesce(cardinality(product_ids), 0) = 0
      or public.app_sees_products(product_ids)
    )
  );

drop policy if exists "manage_lifecycles deletes lifecycle_templates" on public.lifecycle_templates;
create policy "manage_lifecycles deletes lifecycle_templates"
  on public.lifecycle_templates for delete to authenticated
  using (
    public.app_has('manage_lifecycles')
    and is_system = false
    and (
      coalesce(cardinality(product_ids), 0) = 0
      or public.app_sees_products(product_ids)
    )
  );

grant select, insert, update, delete on public.lifecycle_templates to authenticated;

-- Placeholder system rows; full stage JSON is upserted by the app from LIFECYCLE_TEMPLATES.
insert into public.lifecycle_templates (id, label, summary, decomposition, is_system)
values
  (
    'tpl-hardware',
    'Hardware review track',
    'Hardware capabilities are not decomposed into epics, features or user stories.',
    'none',
    true
  ),
  (
    'tpl-delivery',
    'Delivery track',
    'Software capabilities decomposed into epics, features and user stories.',
    'delivery',
    true
  )
on conflict (id) do nothing;
