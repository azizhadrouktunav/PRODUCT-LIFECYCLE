-- Product Lifecycle registry schema (no seed data)

-- Domain categories
create table if not exists public.domain_categories (
  id text primary key,
  name text not null,
  short_name text not null,
  prefix text not null,
  description text not null default ''
);

-- Domains
create table if not exists public.domains (
  id text primary key,
  name text not null,
  description text not null default '',
  category_id text not null references public.domain_categories (id) on delete restrict
);

-- Capability groups
create table if not exists public.capability_groups (
  id text primary key,
  name text not null,
  description text not null default '',
  track text not null check (track in ('hardware', 'delivery')),
  process text not null default ''
);

-- Equipment
create table if not exists public.equipment (
  id text primary key,
  name text not null,
  vendor text not null default '',
  model text not null default '',
  type text not null default ''
);

-- Capabilities
create table if not exists public.capabilities (
  id text primary key,
  name text not null,
  description text not null default '',
  group_id text not null references public.capability_groups (id) on delete restrict,
  domain_ids text[] not null default '{}',
  jira_epic text not null default '',
  equipment_ids text[] not null default '{}',
  progress text not null default 'Identified',
  status text
);

-- Epics
create table if not exists public.epics (
  id text primary key,
  capability_id text not null references public.capabilities (id) on delete cascade,
  key text not null default '',
  name text not null,
  description text not null default '',
  status text
);

-- Features
create table if not exists public.features (
  id text primary key,
  epic_id text not null references public.epics (id) on delete cascade,
  name text not null,
  description text not null default '',
  status text
);

-- User stories
create table if not exists public.user_stories (
  id text primary key,
  feature_id text not null references public.features (id) on delete cascade,
  title text not null,
  role text not null default '',
  want text not null default '',
  benefit text not null default '',
  criteria text[] not null default '{}',
  points integer,
  status text,
  stage text not null default 'In UI/UX Design',
  adr_context text not null default '',
  adr_decision text not null default '',
  adr_technical text not null default '',
  adr_consequences text not null default '',
  adr_approved boolean not null default false
);

-- Waves
create table if not exists public.waves (
  id text primary key,
  code text not null default '',
  name text not null,
  description text not null default '',
  state text not null default 'Planned',
  item_ids text[] not null default '{}'
);

-- Indexes for common filters
create index if not exists epics_capability_id_idx on public.epics (capability_id);
create index if not exists features_epic_id_idx on public.features (epic_id);
create index if not exists user_stories_feature_id_idx on public.user_stories (feature_id);
create index if not exists domains_category_id_idx on public.domains (category_id);
create index if not exists capabilities_group_id_idx on public.capabilities (group_id);

-- RLS: permissive policies for anon/authenticated (no app auth yet)
alter table public.domain_categories enable row level security;
alter table public.domains enable row level security;
alter table public.capability_groups enable row level security;
alter table public.equipment enable row level security;
alter table public.capabilities enable row level security;
alter table public.epics enable row level security;
alter table public.features enable row level security;
alter table public.user_stories enable row level security;
alter table public.waves enable row level security;

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

-- API roles need table privileges (RLS still applies)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;
