-- Reassign actors from domains to domain categories

alter table public.actors
  add column if not exists category_ids text[] not null default '{}';

-- Backfill category_ids from domain_ids via domains.category_id
update public.actors a
set category_ids = (
  select coalesce(array_agg(distinct d.category_id), '{}')
  from unnest(a.domain_ids) as did
  join public.domains d on d.id = did
)
where coalesce(cardinality(a.domain_ids), 0) > 0
  and coalesce(cardinality(a.category_ids), 0) = 0;

alter table public.actors
  drop column if exists domain_ids;
