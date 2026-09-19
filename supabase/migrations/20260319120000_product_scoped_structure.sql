-- Product-scope lifecycles, capability groups, equipment and waves.
--
-- Until now only capabilities and actors carried product_ids; these four tables
-- were company-wide. The product rule is now uniform: every registry row is
-- assigned to one or more products, RLS filters with app_sees_products, and
-- the create/edit forms refuse an empty selection.
--
-- Existing rows are backfilled with every current product id so nothing
-- disappears the moment the new policies land. New rows must set product_ids
-- explicitly (UI enforces length > 0).

alter table public.lifecycles
  add column if not exists product_ids text[] not null default '{}';

alter table public.capability_groups
  add column if not exists product_ids text[] not null default '{}';

alter table public.equipment
  add column if not exists product_ids text[] not null default '{}';

alter table public.waves
  add column if not exists product_ids text[] not null default '{}';

update public.lifecycles
set product_ids = coalesce(
  (select array_agg(p.id order by p.id) from public.products p),
  '{}'::text[]
)
where coalesce(cardinality(product_ids), 0) = 0;

update public.capability_groups
set product_ids = coalesce(
  (select array_agg(p.id order by p.id) from public.products p),
  '{}'::text[]
)
where coalesce(cardinality(product_ids), 0) = 0;

update public.equipment
set product_ids = coalesce(
  (select array_agg(p.id order by p.id) from public.products p),
  '{}'::text[]
)
where coalesce(cardinality(product_ids), 0) = 0;

update public.waves
set product_ids = coalesce(
  (select array_agg(p.id order by p.id) from public.products p),
  '{}'::text[]
)
where coalesce(cardinality(product_ids), 0) = 0;

-- Replace company-wide policies with product-scoped ones.
drop policy if exists "Signed-in users read equipment" on public.equipment;
drop policy if exists "manage_equipment writes equipment" on public.equipment;
drop policy if exists "Signed-in users read groups" on public.capability_groups;
drop policy if exists "manage_groups writes groups" on public.capability_groups;
drop policy if exists "Signed-in users read lifecycles" on public.lifecycles;
drop policy if exists "manage_lifecycles writes lifecycles" on public.lifecycles;
drop policy if exists "Signed-in users read waves" on public.waves;
drop policy if exists "manage_waves writes waves" on public.waves;

create policy "Signed-in users read scoped equipment"
  on public.equipment for select to authenticated
  using (public.app_sees_products(product_ids));

create policy "manage_equipment inserts equipment"
  on public.equipment for insert to authenticated
  with check (
    public.app_has('manage_equipment')
    and public.app_sees_products(product_ids)
  );

create policy "manage_equipment updates equipment"
  on public.equipment for update to authenticated
  using (
    public.app_has('manage_equipment')
    and public.app_sees_products(product_ids)
  )
  with check (
    public.app_has('manage_equipment')
    and public.app_sees_products(product_ids)
  );

create policy "manage_equipment deletes equipment"
  on public.equipment for delete to authenticated
  using (
    public.app_has('manage_equipment')
    and public.app_sees_products(product_ids)
  );

create policy "Signed-in users read scoped groups"
  on public.capability_groups for select to authenticated
  using (public.app_sees_products(product_ids));

create policy "manage_groups inserts groups"
  on public.capability_groups for insert to authenticated
  with check (
    public.app_has('manage_groups')
    and public.app_sees_products(product_ids)
  );

create policy "manage_groups updates groups"
  on public.capability_groups for update to authenticated
  using (
    public.app_has('manage_groups')
    and public.app_sees_products(product_ids)
  )
  with check (
    public.app_has('manage_groups')
    and public.app_sees_products(product_ids)
  );

create policy "manage_groups deletes groups"
  on public.capability_groups for delete to authenticated
  using (
    public.app_has('manage_groups')
    and public.app_sees_products(product_ids)
  );

create policy "Signed-in users read scoped lifecycles"
  on public.lifecycles for select to authenticated
  using (public.app_sees_products(product_ids));

create policy "manage_lifecycles inserts lifecycles"
  on public.lifecycles for insert to authenticated
  with check (
    public.app_has('manage_lifecycles')
    and public.app_sees_products(product_ids)
  );

create policy "manage_lifecycles updates lifecycles"
  on public.lifecycles for update to authenticated
  using (
    public.app_has('manage_lifecycles')
    and public.app_sees_products(product_ids)
  )
  with check (
    public.app_has('manage_lifecycles')
    and public.app_sees_products(product_ids)
  );

create policy "manage_lifecycles deletes lifecycles"
  on public.lifecycles for delete to authenticated
  using (
    public.app_has('manage_lifecycles')
    and public.app_sees_products(product_ids)
  );

create policy "Signed-in users read scoped waves"
  on public.waves for select to authenticated
  using (public.app_sees_products(product_ids));

create policy "manage_waves inserts waves"
  on public.waves for insert to authenticated
  with check (
    public.app_has('manage_waves')
    and public.app_sees_products(product_ids)
  );

create policy "manage_waves updates waves"
  on public.waves for update to authenticated
  using (
    public.app_has('manage_waves')
    and public.app_sees_products(product_ids)
  )
  with check (
    public.app_has('manage_waves')
    and public.app_sees_products(product_ids)
  );

create policy "manage_waves deletes waves"
  on public.waves for delete to authenticated
  using (
    public.app_has('manage_waves')
    and public.app_sees_products(product_ids)
  );
