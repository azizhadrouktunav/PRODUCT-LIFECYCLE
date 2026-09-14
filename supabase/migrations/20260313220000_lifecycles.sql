-- Dynamic lifecycles registry (seed hardware + delivery from former hardcoded tracks)

create table if not exists public.lifecycles (
  id text primary key,
  label text not null,
  summary text not null default '',
  decomposition text not null check (decomposition in ('none', 'delivery')),
  stages jsonb not null default '[]'::jsonb,
  story_stages jsonb not null default '[]'::jsonb
);

insert into public.lifecycles (id, label, summary, decomposition, stages, story_stages)
values
  (
    'hardware',
    'Hardware review track',
    'Hardware capabilities are not decomposed into epics, features or user stories. Once identified they are made ready for assignment, linked to the equipment models that support them, and then activated.',
    'none',
    '[
      {"name":"Identified","description":"The hardware capability has been identified and documented.","tone":"blue","requirement":"none"},
      {"name":"Ready for Assignment","description":"Approved and ready to be assigned to compatible equipment.","tone":"violet","requirement":"none"},
      {"name":"Assigned to Equipment","description":"The capability has been linked to one or more equipment models.","tone":"blue","requirement":"equipment"},
      {"name":"Active","description":"The capability is officially active and usable.","tone":"green","requirement":"equipment"}
    ]'::jsonb,
    '[]'::jsonb
  ),
  (
    'delivery',
    'Delivery track',
    'Software capabilities are approved, decomposed into epics, then features, then user stories, and follow those stories through design, development, testing and release.',
    'delivery',
    '[
      {"name":"Identified","description":"The capability has been identified and written down.","tone":"blue","requirement":"none"},
      {"name":"Epic Definition","description":"The capability is being divided into epics.","tone":"violet","requirement":"none"},
      {"name":"Feature Definition","description":"Each epic is being divided into features.","tone":"violet","requirement":"epics"},
      {"name":"User Story Definition","description":"Each feature is being divided into user stories.","tone":"violet","requirement":"features"}
    ]'::jsonb,
    '[
      {"name":"In UI/UX Design","description":"UI/UX design is in progress.","tone":"pink","requirement":"none"},
      {"name":"In Architecture","description":"The story is analysed for feasibility and given a technical approval, recorded as an ADR with the technical information needed to build it.","tone":"orange","requirement":"none"},
      {"name":"In Development","description":"Development is in progress.","tone":"cyan","requirement":"none"},
      {"name":"In Testing","description":"The functionality is being tested.","tone":"violet","requirement":"none"},
      {"name":"Ready for Deploy","description":"The work is finished and being deployed.","tone":"green","requirement":"none"},
      {"name":"Released","description":"The story is released and available.","tone":"blue","requirement":"none"}
    ]'::jsonb
  )
on conflict (id) do nothing;

-- Drop the hardware/delivery-only check so groups can reference any lifecycle id.
do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  join pg_namespace nsp on nsp.oid = rel.relnamespace
  where nsp.nspname = 'public'
    and rel.relname = 'capability_groups'
    and con.contype = 'c'
    and pg_get_constraintdef(con.oid) ilike '%track%';

  if constraint_name is not null then
    execute format('alter table public.capability_groups drop constraint %I', constraint_name);
  end if;
end $$;

-- Ensure seeded lifecycles exist before adding the FK (groups may already reference them).
alter table public.capability_groups
  drop constraint if exists capability_groups_track_fkey;

alter table public.capability_groups
  add constraint capability_groups_track_fkey
  foreign key (track) references public.lifecycles (id) on delete restrict;

alter table public.lifecycles enable row level security;

drop policy if exists "Allow all for anon and authenticated on lifecycles" on public.lifecycles;

create policy "Allow all for anon and authenticated on lifecycles"
  on public.lifecycles for all to anon, authenticated
  using (true) with check (true);

grant select, insert, update, delete on public.lifecycles to anon, authenticated;
