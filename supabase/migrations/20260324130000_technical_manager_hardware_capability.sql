-- Technical Managers may create hardware capabilities for their assigned products.
-- They still cannot create delivery/software capabilities or write capability rows outside
-- their product scope.

create or replace function public.app_group_uses_equipment(
  p_group_id text,
  p_product_ids text[]
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.capability_groups g
    join public.lifecycles l on l.id = g.track
    where g.id = p_group_id
      and public.app_sees_products(g.product_ids)
      and coalesce(g.product_ids, '{}'::text[]) && coalesce(p_product_ids, '{}'::text[])
      and (
        l.decomposition = 'none'
        or coalesce(jsonb_array_length(l.work_item_types), 0) = 0
      )
  );
$$;

revoke all on function public.app_group_uses_equipment(text, text[]) from public;
grant execute on function public.app_group_uses_equipment(text, text[]) to authenticated;

drop policy if exists "Allow all for anon and authenticated on capabilities" on public.capabilities;
drop policy if exists "manage_equipment inserts hardware capabilities" on public.capabilities;
create policy "manage_equipment inserts hardware capabilities"
  on public.capabilities for insert to authenticated
  with check (
    public.app_has('manage_equipment')
    and public.app_sees_products(product_ids)
    and public.app_group_uses_equipment(group_id, product_ids)
  );

update public.app_roles
set description = 'Manage equipment and add hardware capabilities for assigned products.'
where slug = 'technical_manager';
