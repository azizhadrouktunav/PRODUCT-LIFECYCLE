-- Reclamation categories and multi-assignee routing.
-- demande: every signed-in user can read. Author or assignees can update.
-- technique / produit / it: only assignee_ids can read and treat.
-- support: only administrators (manage_reclamations or assignee) can create, read, treat.

insert into public.app_roles (slug, label, description, sees_all_products, is_system)
values ('it_manager', 'IT Manager', 'Handles assigned IT reclamations.', false, true)
on conflict (slug) do update set
  label = excluded.label,
  description = excluded.description,
  is_system = true;

alter table public.reclamations
  add column if not exists assignee_ids uuid[] not null default '{}',
  add column if not exists response text not null default '';

update public.reclamations
set assignee_ids = array[assignee_id]
where assignee_id is not null
  and coalesce(cardinality(assignee_ids), 0) = 0;

alter table public.reclamations
  drop constraint if exists reclamations_category_check;

alter table public.reclamations
  add constraint reclamations_category_check check (
    category in ('demande', 'technique', 'produit', 'it', 'support')
  );

alter table public.reclamations
  drop constraint if exists reclamations_category_rules;

alter table public.reclamations
  add constraint reclamations_category_rules check (
    (category = 'demande')
    or (category = 'support' and coalesce(cardinality(assignee_ids), 0) > 0)
    or (category in ('technique', 'it') and coalesce(cardinality(assignee_ids), 0) > 0)
    or (
      category = 'produit'
      and cardinality(product_ids) > 0
      and coalesce(cardinality(assignee_ids), 0) > 0
    )
  );

create index if not exists reclamations_assignee_ids_gin_idx
  on public.reclamations using gin (assignee_ids);

create or replace function public.app_reclamation_assignees_match(
  p_category text,
  p_product_ids text[],
  p_assignee_id uuid,
  p_assignee_ids uuid[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with ids as (
    select distinct unnest(
      case
        when coalesce(cardinality(p_assignee_ids), 0) > 0 then p_assignee_ids
        when p_assignee_id is not null then array[p_assignee_id]
        else '{}'::uuid[]
      end
    ) as user_id
  ), expected as (
    select case p_category
      when 'technique' then 'technical_manager'
      when 'produit' then 'product_owner'
      when 'it' then 'it_manager'
      when 'support' then 'administrator'
      else null
    end as role_slug
  )
  select case
    when p_category = 'demande' then true
    when not exists (select 1 from ids) then false
    else not exists (
      select 1
      from ids i
      cross join expected e
      left join public.app_profiles p on p.user_id = i.user_id
      where p.user_id is null
        or p.role <> e.role_slug
        or (
          p_category = 'produit'
          and not (coalesce(p.product_ids, '{}'::text[]) && coalesce(p_product_ids, '{}'::text[]))
        )
    )
  end;
$$;

revoke all on function public.app_reclamation_assignees_match(text, text[], uuid, uuid[]) from public;
grant execute on function public.app_reclamation_assignees_match(text, text[], uuid, uuid[]) to authenticated;

drop policy if exists "reclamations select own assigned or manage" on public.reclamations;
drop policy if exists "reclamations select visible category or assigned" on public.reclamations;
create policy "reclamations select visible category or assigned"
  on public.reclamations for select to authenticated
  using (
    (
      category = 'demande'
      and (select public.app_uid()) is not null
    )
    or (
      category = 'support'
      and (
        public.app_has('manage_reclamations')
        or assignee_id = (select public.app_uid())
        or (select public.app_uid()) = any (assignee_ids)
      )
    )
    or (
      category in ('technique', 'produit', 'it')
      and (
        assignee_id = (select public.app_uid())
        or (select public.app_uid()) = any (assignee_ids)
      )
    )
  );

drop policy if exists "reclamations insert authenticated" on public.reclamations;
create policy "reclamations insert authenticated"
  on public.reclamations for insert to authenticated
  with check (
    (select public.app_uid()) is not null
    and created_by = (select public.app_uid())
    and public.app_reclamation_assignees_match(category, product_ids, assignee_id, assignee_ids)
    and (
      category <> 'support'
      or public.app_has('manage_reclamations')
    )
  );

drop policy if exists "reclamations update own assigned or manage" on public.reclamations;
drop policy if exists "reclamations update assigned or manage" on public.reclamations;
create policy "reclamations update assigned or author"
  on public.reclamations for update to authenticated
  using (
    (
      category = 'demande'
      and (
        created_by = (select public.app_uid())
        or assignee_id = (select public.app_uid())
        or (select public.app_uid()) = any (assignee_ids)
      )
    )
    or (
      category in ('technique', 'produit', 'it')
      and (
        assignee_id = (select public.app_uid())
        or (select public.app_uid()) = any (assignee_ids)
      )
    )
    or (
      category = 'support'
      and public.app_has('manage_reclamations')
    )
  )
  with check (
    (
      (
        category = 'demande'
        and (
          created_by = (select public.app_uid())
          or assignee_id = (select public.app_uid())
          or (select public.app_uid()) = any (assignee_ids)
        )
      )
      or (
        category in ('technique', 'produit', 'it')
        and (
          assignee_id = (select public.app_uid())
          or (select public.app_uid()) = any (assignee_ids)
        )
      )
      or (
        category = 'support'
        and public.app_has('manage_reclamations')
      )
    )
    and public.app_reclamation_assignees_match(category, product_ids, assignee_id, assignee_ids)
  );

drop policy if exists "reclamations delete author or manage" on public.reclamations;
create policy "reclamations delete author or manage"
  on public.reclamations for delete to authenticated
  using (
    (category = 'demande' and created_by = (select public.app_uid()))
    or (
      category in ('technique', 'produit', 'it')
      and (
        assignee_id = (select public.app_uid())
        or (select public.app_uid()) = any (assignee_ids)
      )
    )
    or (category = 'support' and public.app_has('manage_reclamations'))
  );

drop function if exists public.app_list_users_by_role(text);

create or replace function public.app_list_users_by_role(
  p_role text default null,
  p_product_ids text[] default null
)
returns table (
  user_id uuid,
  email text,
  display_name text,
  role text,
  product_ids text[]
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.user_id,
    coalesce(p.email, '')::text,
    coalesce(p.display_name, '')::text,
    p.role::text,
    coalesce(p.product_ids, '{}'::text[])::text[]
  from public.app_profiles p
  where public.app_uid() is not null
    and (p_role is null or p.role = p_role)
    and (
      coalesce(cardinality(p_product_ids), 0) = 0
      or coalesce(p.product_ids, '{}'::text[]) && p_product_ids
    )
  order by lower(coalesce(nullif(p.display_name, ''), p.email));
$$;

revoke all on function public.app_list_users_by_role(text, text[]) from public;
grant execute on function public.app_list_users_by_role(text, text[]) to authenticated;
