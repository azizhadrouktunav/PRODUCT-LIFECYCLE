-- Dynamic equipment types registry (no default seed)

create table if not exists public.equipment_types (
  id text primary key,
  name text not null unique
);

alter table public.equipment_types enable row level security;

drop policy if exists "Allow all for anon and authenticated on equipment_types" on public.equipment_types;

create policy "Allow all for anon and authenticated on equipment_types"
  on public.equipment_types for all to anon, authenticated
  using (true) with check (true);

grant select, insert, update, delete on public.equipment_types to anon, authenticated;
