-- Group codes + remapped capability IDs: CAP-{CODE}-{####}

alter table public.capability_groups
  add column if not exists code text;

-- Backfill missing codes from the first letter of the group name (unique per group)
with ranked as (
  select
    id,
    upper(
      left(
        nullif(regexp_replace(split_part(trim(name), ' ', 1), '[^a-zA-Z0-9]', '', 'g'), ''),
        1
      )
    ) as base
  from public.capability_groups
  where code is null or btrim(code) = ''
),
normalized as (
  select
    id,
    coalesce(nullif(base, ''), 'G') as base
  from ranked
),
numbered as (
  select
    id,
    base,
    row_number() over (partition by base order by id) as rn
  from normalized
)
update public.capability_groups g
set code = case
  when n.rn = 1 then n.base
  else n.base || n.rn::text
end
from numbered n
where g.id = n.id
  and (g.code is null or btrim(g.code) = '');

-- Ensure any remaining blanks get a unique fallback
update public.capability_groups
set code = 'G' || substr(md5(id), 1, 4)
where code is null or btrim(code) = '';

update public.capability_groups
set code = upper(btrim(code));

-- Remap legacy capability IDs (CAP-0001) to CAP-{code}-####
create temporary table cap_id_map on commit drop as
select
  c.id as old_id,
  'CAP-' || g.code || '-' || lpad(
    (row_number() over (partition by g.code order by c.id))::text,
    4,
    '0'
  ) as new_id
from public.capabilities c
join public.capability_groups g on g.id = c.group_id
where c.id ~ '^CAP-[0-9]+$'
   or c.id !~ ('^CAP-' || g.code || '-[0-9]{4}$');

-- Skip rows that would not change
delete from cap_id_map where old_id = new_id;

-- Avoid collisions with IDs that already exist and are not being remapped away
update cap_id_map m
set new_id = m.new_id || '-x'
where exists (
  select 1
  from public.capabilities c
  where c.id = m.new_id
    and not exists (select 1 from cap_id_map x where x.old_id = c.id)
);

insert into public.capabilities (
  id,
  name,
  description,
  group_id,
  product_ids,
  jira_epic,
  equipment_ids,
  progress,
  status
)
select
  m.new_id,
  c.name,
  c.description,
  c.group_id,
  c.product_ids,
  c.jira_epic,
  c.equipment_ids,
  c.progress,
  c.status
from public.capabilities c
join cap_id_map m on m.old_id = c.id
on conflict (id) do nothing;

update public.epics e
set capability_id = m.new_id
from cap_id_map m
where e.capability_id = m.old_id;

update public.waves w
set item_ids = coalesce((
  select array_agg(coalesce(m.new_id, x) order by ord)
  from unnest(w.item_ids) with ordinality as u(x, ord)
  left join cap_id_map m on m.old_id = x
), '{}'::text[]);

delete from public.capabilities
where id in (select old_id from cap_id_map);

alter table public.capability_groups
  alter column code set not null;

create unique index if not exists capability_groups_code_uidx
  on public.capability_groups (code);
