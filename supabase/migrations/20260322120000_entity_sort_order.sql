-- Persist display order for catalog and delivery tables.
-- capabilities / work_items already have sort_order.

-- 1) Columns
alter table public.actors
  add column if not exists sort_order int not null default 0;

alter table public.equipment
  add column if not exists sort_order int not null default 0;

alter table public.capability_groups
  add column if not exists sort_order int not null default 0;

alter table public.waves
  add column if not exists sort_order int not null default 0;

alter table public.products
  add column if not exists sort_order int not null default 0;

alter table public.lifecycles
  add column if not exists sort_order int not null default 0;

alter table public.epics
  add column if not exists sort_order int not null default 0;

alter table public.features
  add column if not exists sort_order int not null default 0;

alter table public.user_stories
  add column if not exists sort_order int not null default 0;

-- 2) Global backfill (name, then id)
with ordered as (
  select id, (row_number() over (order by name, id) - 1)::int as ord
  from public.actors
)
update public.actors a
set sort_order = o.ord
from ordered o
where a.id = o.id;

with ordered as (
  select id, (row_number() over (order by name, id) - 1)::int as ord
  from public.equipment
)
update public.equipment e
set sort_order = o.ord
from ordered o
where e.id = o.id;

with ordered as (
  select id, (row_number() over (order by name, id) - 1)::int as ord
  from public.capability_groups
)
update public.capability_groups g
set sort_order = o.ord
from ordered o
where g.id = o.id;

with ordered as (
  select id, (row_number() over (order by name, id) - 1)::int as ord
  from public.waves
)
update public.waves w
set sort_order = o.ord
from ordered o
where w.id = o.id;

with ordered as (
  select id, (row_number() over (order by name, id) - 1)::int as ord
  from public.products
)
update public.products p
set sort_order = o.ord
from ordered o
where p.id = o.id;

with ordered as (
  select id, (row_number() over (order by label, id) - 1)::int as ord
  from public.lifecycles
)
update public.lifecycles l
set sort_order = o.ord
from ordered o
where l.id = o.id;

-- 3) Scoped backfill for delivery children
with ordered as (
  select id,
    (row_number() over (partition by capability_id order by name, id) - 1)::int as ord
  from public.epics
)
update public.epics e
set sort_order = o.ord
from ordered o
where e.id = o.id;

with ordered as (
  select id,
    (row_number() over (partition by epic_id order by name, id) - 1)::int as ord
  from public.features
)
update public.features f
set sort_order = o.ord
from ordered o
where f.id = o.id;

with ordered as (
  select id,
    (row_number() over (partition by feature_id order by title, id) - 1)::int as ord
  from public.user_stories
)
update public.user_stories s
set sort_order = o.ord
from ordered o
where s.id = o.id;
