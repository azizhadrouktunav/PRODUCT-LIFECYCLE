import { supabase } from '../utils/supabase';
import type { AppRoleRecord, RbacAction } from './rbac';
import { isRbacAction } from './rbac';

type RoleRow = {
  slug: string;
  label: string;
  description?: string | null;
  sees_all_products?: boolean | null;
  is_system?: boolean | null;
  app_role_permissions?: { action: string }[] | null;
};

function mapRole(row: RoleRow): AppRoleRecord {
  return {
    slug: row.slug,
    label: row.label,
    description: String(row.description ?? ''),
    seesAllProducts: !!row.sees_all_products,
    isSystem: !!row.is_system,
    permissions: (row.app_role_permissions ?? [])
      .map((p) => p.action)
      .filter(isRbacAction),
  };
}

const ROLE_SELECT =
  'slug, label, description, sees_all_products, is_system, app_role_permissions(action)';

export async function fetchRoles(): Promise<AppRoleRecord[]> {
  const { data, error } = await supabase
    .from('app_roles')
    .select(ROLE_SELECT)
    .order('label');
  if (error) throw new Error(`Load roles: ${error.message}`);
  return (data ?? []).map((r) => mapRole(r as unknown as RoleRow));
}

export async function upsertRole(role: {
  slug: string;
  label: string;
  description: string;
  seesAllProducts: boolean;
  isSystem?: boolean;
}): Promise<void> {
  const { error } = await supabase.from('app_roles').upsert({
    slug: role.slug,
    label: role.label,
    description: role.description,
    sees_all_products: role.seesAllProducts,
    is_system: role.isSystem ?? false,
  });
  if (error) throw new Error(`Save role: ${error.message}`);
}

export async function setRolePermissions(
  roleSlug: string,
  actions: RbacAction[]
): Promise<void> {
  const { error: delError } = await supabase
    .from('app_role_permissions')
    .delete()
    .eq('role_slug', roleSlug);
  if (delError) throw new Error(`Clear permissions: ${delError.message}`);

  if (actions.length === 0) return;

  const { error } = await supabase.from('app_role_permissions').insert(
    actions.map((action) => ({ role_slug: roleSlug, action }))
  );
  if (error) throw new Error(`Save permissions: ${error.message}`);
}

export async function deleteRole(slug: string): Promise<void> {
  const { error } = await supabase.from('app_roles').delete().eq('slug', slug);
  if (error) throw new Error(`Delete role: ${error.message}`);
}
