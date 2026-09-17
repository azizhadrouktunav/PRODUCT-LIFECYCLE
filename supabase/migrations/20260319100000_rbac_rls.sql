-- Role and product scoped RLS.
--
-- Until now every table carried `for all to anon using (true)`, so the browser
-- could read and write anything, including its own row in app_profiles. The
-- Edge Functions now hand the browser a signed JWT whose `sub` is the
-- app_users id (functions/_shared/jwt.ts), which is what the helpers below
-- resolve the caller's role, permissions and assigned products from.
--
-- Edge Functions keep using the service role key and bypass all of this.

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- The app_users id behind the request, or null when the JWT is missing or
-- malformed (which every policy below then treats as "not signed in").
create or replace function public.app_uid()
returns uuid
language plpgsql
stable
as $$
declare
  claim text;
begin
  claim := nullif(
    current_setting('request.jwt.claims', true)::jsonb ->> 'sub',
    ''
  );
  if claim is null then
    return null;
  end if;
  return claim::uuid;
exception
  when others then
    return null;
end;
$$;

-- security definer so the permission tables themselves can stay locked down.
create or replace function public.app_has(p_action text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_profiles p
    join public.app_role_permissions rp on rp.role_slug = p.role
    where p.user_id = public.app_uid()
      and rp.action in (p_action, 'edit_all')
  );
$$;

create or replace function public.app_sees_all()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select r.sees_all_products
      from public.app_profiles p
      join public.app_roles r on r.slug = p.role
      where p.user_id = public.app_uid()
    ),
    false
  );
$$;

-- The caller's assigned products. Empty means "assigned to nothing", not
-- "unrestricted": every policy pairs this with app_sees_all().
create or replace function public.app_products()
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.product_ids from public.app_profiles p where p.user_id = public.app_uid()),
    '{}'::text[]
  );
$$;

-- Plain SQL so the planner inlines it into the policy, where the two sub-selects
-- become one-time InitPlans instead of a role lookup per row.
create or replace function public.app_sees_products(p_product_ids text[])
returns boolean
language sql
stable
as $$
  select (select public.app_sees_all())
      or coalesce(p_product_ids, '{}'::text[]) && (select public.app_products());
$$;

create or replace function public.app_sees_capability(p_capability_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.app_sees_all()
      or exists (
        select 1
        from public.capabilities c
        where c.id = p_capability_id
          and c.product_ids && public.app_products()
      );
$$;

create or replace function public.app_sees_epic(p_epic_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.app_sees_all()
      or exists (
        select 1
        from public.epics e
        where e.id = p_epic_id
          and public.app_sees_capability(e.capability_id)
      );
$$;

create or replace function public.app_sees_feature(p_feature_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.app_sees_all()
      or exists (
        select 1
        from public.features f
        where f.id = p_feature_id
          and public.app_sees_epic(f.epic_id)
      );
$$;

revoke all on function public.app_uid() from public;
revoke all on function public.app_has(text) from public;
revoke all on function public.app_sees_all() from public;
revoke all on function public.app_products() from public;
revoke all on function public.app_sees_products(text[]) from public;
revoke all on function public.app_sees_capability(text) from public;
revoke all on function public.app_sees_epic(text) from public;
revoke all on function public.app_sees_feature(text) from public;

grant execute on function public.app_uid() to authenticated;
grant execute on function public.app_has(text) to authenticated;
grant execute on function public.app_sees_all() to authenticated;
grant execute on function public.app_products() to authenticated;
grant execute on function public.app_sees_products(text[]) to authenticated;
grant execute on function public.app_sees_capability(text) to authenticated;
grant execute on function public.app_sees_epic(text) to authenticated;
grant execute on function public.app_sees_feature(text) to authenticated;

-- Assigning capabilities to equipment writes capabilities.equipment_ids, which
-- manage_equipment alone must not be able to reach through a plain update: that
-- would hand the Technical Manager every other column too. This function is the
-- one door, and it only ever touches equipment_ids.
create or replace function public.app_set_equipment_capabilities(
  p_equipment_id text,
  p_capability_ids text[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  wanted text[] := coalesce(p_capability_ids, '{}'::text[]);
begin
  if not public.app_has('manage_equipment') then
    raise exception 'manage_equipment required' using errcode = '42501';
  end if;

  update public.capabilities c
  set equipment_ids = array_remove(c.equipment_ids, p_equipment_id)
  where p_equipment_id = any (c.equipment_ids)
    and not (c.id = any (wanted))
    and public.app_sees_capability(c.id);

  update public.capabilities c
  set equipment_ids = c.equipment_ids || p_equipment_id
  where c.id = any (wanted)
    and not (p_equipment_id = any (c.equipment_ids))
    and public.app_sees_capability(c.id);
end;
$$;

revoke all on function public.app_set_equipment_capabilities(text, text[]) from public;
grant execute on function public.app_set_equipment_capabilities(text, text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Registry tables
-- ---------------------------------------------------------------------------

drop policy if exists "Allow all for anon and authenticated on capability_groups" on public.capability_groups;
drop policy if exists "Allow all for anon and authenticated on equipment" on public.equipment;
drop policy if exists "Allow all for anon and authenticated on equipment_types" on public.equipment_types;
drop policy if exists "Allow all for anon and authenticated on capabilities" on public.capabilities;
drop policy if exists "Allow all for anon and authenticated on epics" on public.epics;
drop policy if exists "Allow all for anon and authenticated on features" on public.features;
drop policy if exists "Allow all for anon and authenticated on user_stories" on public.user_stories;
drop policy if exists "Allow all for anon and authenticated on waves" on public.waves;
drop policy if exists "Allow all for anon and authenticated on actors" on public.actors;
drop policy if exists "Allow all for anon and authenticated on lifecycles" on public.lifecycles;
drop policy if exists "Allow all for anon and authenticated on products" on public.products;

-- Products: only the ones the caller is assigned to.
create policy "Signed-in users read assigned products"
  on public.products for select to authenticated
  using (
    (select public.app_sees_all())
    or id = any ((select public.app_products()))
  );

-- Spelled out per command rather than `for all`, which would OR a second,
-- unscoped read path onto the select policy above.
create policy "manage_products inserts products"
  on public.products for insert to authenticated
  with check (public.app_has('manage_products'));

create policy "manage_products updates products"
  on public.products for update to authenticated
  using (public.app_has('manage_products'))
  with check (public.app_has('manage_products'));

create policy "manage_products deletes products"
  on public.products for delete to authenticated
  using (public.app_has('manage_products'));

-- Capabilities: product scoped on both sides, so a write cannot move a row out
-- of the caller's scope either.
create policy "Signed-in users read scoped capabilities"
  on public.capabilities for select to authenticated
  using (public.app_sees_products(product_ids));

create policy "add_capability inserts capabilities"
  on public.capabilities for insert to authenticated
  with check (
    public.app_has('add_capability')
    and public.app_sees_products(product_ids)
  );

create policy "edit_capability updates capabilities"
  on public.capabilities for update to authenticated
  using (
    (public.app_has('edit_capability') or public.app_has('edit_capability_progress'))
    and public.app_sees_products(product_ids)
  )
  with check (
    (public.app_has('edit_capability') or public.app_has('edit_capability_progress'))
    and public.app_sees_products(product_ids)
  );

create policy "delete_capability deletes capabilities"
  on public.capabilities for delete to authenticated
  using (
    public.app_has('delete_capability')
    and public.app_sees_products(product_ids)
  );

-- Epics, features and stories inherit scope from the capability above them.
create policy "Signed-in users read scoped epics"
  on public.epics for select to authenticated
  using (
    (select public.app_sees_all())
    or public.app_sees_capability(capability_id)
  );

create policy "edit_capability writes epics"
  on public.epics for all to authenticated
  using (
    public.app_has('edit_capability')
    and public.app_sees_capability(capability_id)
  )
  with check (
    public.app_has('edit_capability')
    and public.app_sees_capability(capability_id)
  );

create policy "Signed-in users read scoped features"
  on public.features for select to authenticated
  using (
    (select public.app_sees_all())
    or public.app_sees_epic(epic_id)
  );

create policy "edit_capability writes features"
  on public.features for all to authenticated
  using (
    public.app_has('edit_capability')
    and public.app_sees_epic(epic_id)
  )
  with check (
    public.app_has('edit_capability')
    and public.app_sees_epic(epic_id)
  );

create policy "Signed-in users read scoped stories"
  on public.user_stories for select to authenticated
  using (
    (select public.app_sees_all())
    or public.app_sees_feature(feature_id)
  );

create policy "edit_capability inserts stories"
  on public.user_stories for insert to authenticated
  with check (
    public.app_has('edit_capability')
    and public.app_sees_feature(feature_id)
  );

-- edit_story_stage is the Project Manager's surface: they move stories along
-- without being able to create or delete them.
create policy "edit_capability or edit_story_stage updates stories"
  on public.user_stories for update to authenticated
  using (
    (public.app_has('edit_capability') or public.app_has('edit_story_stage'))
    and public.app_sees_feature(feature_id)
  )
  with check (
    (public.app_has('edit_capability') or public.app_has('edit_story_stage'))
    and public.app_sees_feature(feature_id)
  );

create policy "edit_capability deletes stories"
  on public.user_stories for delete to authenticated
  using (
    public.app_has('edit_capability')
    and public.app_sees_feature(feature_id)
  );

-- Actors carry products directly; one with no products is company-wide.
create policy "Signed-in users read scoped actors"
  on public.actors for select to authenticated
  using (
    (select public.app_uid()) is not null
    and (
      coalesce(cardinality(product_ids), 0) = 0
      or public.app_sees_products(product_ids)
    )
  );

create policy "manage_actors inserts actors"
  on public.actors for insert to authenticated
  with check (public.app_has('manage_actors'));

create policy "manage_actors updates actors"
  on public.actors for update to authenticated
  using (public.app_has('manage_actors'))
  with check (public.app_has('manage_actors'));

create policy "manage_actors deletes actors"
  on public.actors for delete to authenticated
  using (public.app_has('manage_actors'));

-- Equipment is company-wide by design: the Technical Manager's write surface.
create policy "Signed-in users read equipment"
  on public.equipment for select to authenticated
  using ((select public.app_uid()) is not null);

create policy "manage_equipment writes equipment"
  on public.equipment for all to authenticated
  using (public.app_has('manage_equipment'))
  with check (public.app_has('manage_equipment'));

create policy "Signed-in users read equipment types"
  on public.equipment_types for select to authenticated
  using ((select public.app_uid()) is not null);

create policy "manage_equipment writes equipment types"
  on public.equipment_types for all to authenticated
  using (public.app_has('manage_equipment'))
  with check (public.app_has('manage_equipment'));

-- Groups and lifecycles are structure, not product data: readable by everyone
-- signed in, writable only by the roles that own them.
create policy "Signed-in users read groups"
  on public.capability_groups for select to authenticated
  using ((select public.app_uid()) is not null);

create policy "manage_groups writes groups"
  on public.capability_groups for all to authenticated
  using (public.app_has('manage_groups'))
  with check (public.app_has('manage_groups'));

create policy "Signed-in users read lifecycles"
  on public.lifecycles for select to authenticated
  using ((select public.app_uid()) is not null);

create policy "manage_lifecycles writes lifecycles"
  on public.lifecycles for all to authenticated
  using (public.app_has('manage_lifecycles'))
  with check (public.app_has('manage_lifecycles'));

-- waves.item_ids mixes capability, epic, feature and story ids, so resolving
-- scope per row in a policy would cost more than it protects. The Waves page
-- filters the items it renders instead.
create policy "Signed-in users read waves"
  on public.waves for select to authenticated
  using ((select public.app_uid()) is not null);

create policy "manage_waves writes waves"
  on public.waves for all to authenticated
  using (public.app_has('manage_waves'))
  with check (public.app_has('manage_waves'));

-- ---------------------------------------------------------------------------
-- Profiles, roles and permissions
--
-- These carried `for all to anon using (true)`, which let any visitor set their
-- own role to administrator straight from the browser console.
-- ---------------------------------------------------------------------------

drop policy if exists "Users can read own profile" on public.app_profiles;
drop policy if exists "Authenticated can read profiles" on public.app_profiles;
drop policy if exists "Authenticated can upsert profiles" on public.app_profiles;
drop policy if exists "Administrators can manage profiles" on public.app_profiles;
drop policy if exists "Anon can read profiles" on public.app_profiles;
drop policy if exists "Anon can upsert profiles" on public.app_profiles;

create policy "Users read own profile, manage_users reads all"
  on public.app_profiles for select to authenticated
  using (
    user_id = (select public.app_uid())
    or (select public.app_has('manage_users'))
  );

create policy "manage_users writes profiles"
  on public.app_profiles for all to authenticated
  using (public.app_has('manage_users'))
  with check (public.app_has('manage_users'));

drop policy if exists "Authenticated can read roles" on public.app_roles;
drop policy if exists "Authenticated can manage roles" on public.app_roles;
drop policy if exists "Anon can read roles" on public.app_roles;
drop policy if exists "Anon can manage roles" on public.app_roles;
drop policy if exists "Authenticated can read role permissions" on public.app_role_permissions;
drop policy if exists "Authenticated can manage role permissions" on public.app_role_permissions;
drop policy if exists "Anon can read role permissions" on public.app_role_permissions;
drop policy if exists "Anon can manage role permissions" on public.app_role_permissions;

create policy "Signed-in users read roles"
  on public.app_roles for select to authenticated
  using ((select public.app_uid()) is not null);

create policy "manage_users writes roles"
  on public.app_roles for all to authenticated
  using (public.app_has('manage_users'))
  with check (public.app_has('manage_users'));

create policy "Signed-in users read role permissions"
  on public.app_role_permissions for select to authenticated
  using ((select public.app_uid()) is not null);

create policy "manage_users writes role permissions"
  on public.app_role_permissions for all to authenticated
  using (public.app_has('manage_users'))
  with check (public.app_has('manage_users'));

-- app_user_status runs with the view owner's rights, so a grant is the whole
-- access check. Filtering inside it keeps activation state and last-login times
-- for the Users admin screen only.
create or replace view public.app_user_status as
select
  u.id as user_id,
  (u.password_hash is not null and not u.disabled) as is_active,
  u.last_login_at
from public.app_users u
where public.app_has('manage_users') or u.id = public.app_uid();

-- ---------------------------------------------------------------------------
-- Grants: the browser is `authenticated` now, never `anon`
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

-- app_users, app_sessions and app_user_tokens stay service-role only.
revoke all on public.app_users from anon, authenticated;
revoke all on public.app_sessions from anon, authenticated;
revoke all on public.app_user_tokens from anon, authenticated;

grant select on public.app_user_status to authenticated;
