-- Actors catalog + story actor_ids

create table if not exists public.actors (
  id text primary key,
  name text not null,
  description text not null default '',
  domain_ids text[] not null default '{}'
);

alter table public.user_stories
  add column if not exists actor_ids text[] not null default '{}';

alter table public.actors enable row level security;

drop policy if exists "Allow all for anon and authenticated on actors" on public.actors;

create policy "Allow all for anon and authenticated on actors"
  on public.actors for all to anon, authenticated
  using (true) with check (true);

grant select, insert, update, delete on public.actors to anon, authenticated;
