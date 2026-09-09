-- RLS + grants for registry tables (run after prisma db push; no seed)

alter table public.domain_categories enable row level security;
alter table public.domains enable row level security;
alter table public.capability_groups enable row level security;
alter table public.equipment enable row level security;
alter table public.capabilities enable row level security;
alter table public.epics enable row level security;
alter table public.features enable row level security;
alter table public.user_stories enable row level security;
alter table public.waves enable row level security;

drop policy if exists "Allow all for anon and authenticated on domain_categories" on public.domain_categories;
drop policy if exists "Allow all for anon and authenticated on domains" on public.domains;
drop policy if exists "Allow all for anon and authenticated on capability_groups" on public.capability_groups;
drop policy if exists "Allow all for anon and authenticated on equipment" on public.equipment;
drop policy if exists "Allow all for anon and authenticated on capabilities" on public.capabilities;
drop policy if exists "Allow all for anon and authenticated on epics" on public.epics;
drop policy if exists "Allow all for anon and authenticated on features" on public.features;
drop policy if exists "Allow all for anon and authenticated on user_stories" on public.user_stories;
drop policy if exists "Allow all for anon and authenticated on waves" on public.waves;

create policy "Allow all for anon and authenticated on domain_categories"
  on public.domain_categories for all to anon, authenticated
  using (true) with check (true);

create policy "Allow all for anon and authenticated on domains"
  on public.domains for all to anon, authenticated
  using (true) with check (true);

create policy "Allow all for anon and authenticated on capability_groups"
  on public.capability_groups for all to anon, authenticated
  using (true) with check (true);

create policy "Allow all for anon and authenticated on equipment"
  on public.equipment for all to anon, authenticated
  using (true) with check (true);

create policy "Allow all for anon and authenticated on capabilities"
  on public.capabilities for all to anon, authenticated
  using (true) with check (true);

create policy "Allow all for anon and authenticated on epics"
  on public.epics for all to anon, authenticated
  using (true) with check (true);

create policy "Allow all for anon and authenticated on features"
  on public.features for all to anon, authenticated
  using (true) with check (true);

create policy "Allow all for anon and authenticated on user_stories"
  on public.user_stories for all to anon, authenticated
  using (true) with check (true);

create policy "Allow all for anon and authenticated on waves"
  on public.waves for all to anon, authenticated
  using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
