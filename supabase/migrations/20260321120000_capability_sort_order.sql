-- Display order for capabilities (IDs stay stable).
alter table public.capabilities
  add column if not exists sort_order integer not null default 0;

comment on column public.capabilities.sort_order is
  'Display order within the register and wave scope; lower first.';

-- Backfill by current id order within each group.
with ranked as (
  select
    id,
    (row_number() over (partition by group_id order by id) - 1)::integer as rn
  from public.capabilities
)
update public.capabilities c
set sort_order = ranked.rn
from ranked
where c.id = ranked.id;
