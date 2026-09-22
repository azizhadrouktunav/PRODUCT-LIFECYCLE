-- Reassign capability sort_order globally (unique 0..n-1).
-- Previous backfill was partitioned by group_id, which duplicated numbers across groups.
with ranked as (
  select
    id,
    (row_number() over (order by sort_order, id) - 1)::integer as rn
  from public.capabilities
)
update public.capabilities c
set sort_order = ranked.rn
from ranked
where c.id = ranked.id;
