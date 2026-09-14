-- Replace domains / domain_categories with products

create table if not exists public.products (
  id text primary key,
  name text not null,
  description text not null default ''
);

alter table public.capabilities
  add column if not exists product_ids text[] not null default '{}';

alter table public.actors
  add column if not exists product_ids text[] not null default '{}';

-- Seed products from existing domains (keep domain ids so capability links stay valid)
insert into public.products (id, name, description)
select d.id, d.name, coalesce(d.description, '')
from public.domains d
on conflict (id) do nothing;

-- Capabilities: copy domain_ids → product_ids
update public.capabilities
set product_ids = coalesce(domain_ids, '{}')
where coalesce(cardinality(product_ids), 0) = 0
  and coalesce(cardinality(domain_ids), 0) > 0;

-- Actors: expand category_ids → all domain/product ids under those categories
update public.actors a
set product_ids = (
  select coalesce(array_agg(distinct d.id), '{}')
  from unnest(a.category_ids) as cid
  join public.domains d on d.category_id = cid
)
where coalesce(cardinality(a.product_ids), 0) = 0
  and coalesce(cardinality(a.category_ids), 0) > 0;

alter table public.capabilities drop column if exists domain_ids;
alter table public.actors drop column if exists category_ids;

drop table if exists public.domains cascade;
drop table if exists public.domain_categories cascade;

alter table public.products enable row level security;

drop policy if exists "Allow all for anon and authenticated on products" on public.products;

create policy "Allow all for anon and authenticated on products"
  on public.products for all to anon, authenticated
  using (true) with check (true);

grant select, insert, update, delete on public.products to anon, authenticated;
