import { supabase } from '../utils/supabase';
import { sessionHeaders } from './authApi';
import type { AppProfile, RbacAction } from './rbac';
import { isRbacAction } from './rbac';

type ProfileRow = {
  user_id: string;
  email?: string | null;
  display_name?: string | null;
  role: string;
  product_ids?: string[] | null;
};

type RoleMeta = {
  label: string;
  seesAllProducts: boolean;
  permissions: RbacAction[];
};

const PROFILE_SELECT = 'user_id, email, display_name, role, product_ids';

function mapBaseProfile(row: ProfileRow): AppProfile {
  return {
    userId: String(row.user_id),
    email: String(row.email ?? ''),
    displayName: String(row.display_name ?? ''),
    role: String(row.role ?? ''),
    productIds: row.product_ids ?? [],
  };
}

async function fetchRoleMetaBySlugs(slugs: string[]): Promise<Map<string, RoleMeta>> {
  const unique = [...new Set(slugs.filter(Boolean))];
  const map = new Map<string, RoleMeta>();
  if (unique.length === 0) return map;

  const { data: roles, error: rolesError } = await supabase
    .from('app_roles')
    .select('slug, label, sees_all_products')
    .in('slug', unique);
  if (rolesError) throw new Error(`Load roles: ${rolesError.message}`);

  const { data: perms, error: permsError } = await supabase
    .from('app_role_permissions')
    .select('role_slug, action')
    .in('role_slug', unique);
  if (permsError) throw new Error(`Load role permissions: ${permsError.message}`);

  const permsBySlug = new Map<string, RbacAction[]>();
  for (const row of perms ?? []) {
    const slug = String((row as { role_slug: string }).role_slug);
    const action = String((row as { action: string }).action);
    if (!isRbacAction(action)) continue;
    const list = permsBySlug.get(slug) ?? [];
    list.push(action);
    permsBySlug.set(slug, list);
  }

  for (const row of roles ?? []) {
    const slug = String((row as { slug: string }).slug);
    map.set(slug, {
      label: String((row as { label: string }).label ?? slug),
      seesAllProducts: !!(row as { sees_all_products?: boolean }).sees_all_products,
      permissions: permsBySlug.get(slug) ?? [],
    });
  }

  return map;
}

function withRoleMeta(profile: AppProfile, meta: RoleMeta | undefined): AppProfile {
  if (!meta) {
    return {
      ...profile,
      roleLabel: profile.role,
      seesAllProducts: false,
      permissions: [],
    };
  }
  return {
    ...profile,
    roleLabel: meta.label,
    seesAllProducts: meta.seesAllProducts,
    permissions: meta.permissions,
  };
}

export async function fetchProfile(userId: string): Promise<AppProfile | null> {
  const { data, error } = await supabase
    .from('app_profiles')
    .select(PROFILE_SELECT)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`Load profile: ${error.message}`);
  if (!data) return null;

  const base = mapBaseProfile(data as unknown as ProfileRow);
  const roleMap = await fetchRoleMetaBySlugs([base.role]);
  return withRoleMeta(base, roleMap.get(base.role));
}

export async function fetchProfiles(): Promise<AppProfile[]> {
  const { data, error } = await supabase
    .from('app_profiles')
    .select(PROFILE_SELECT)
    .order('email');
  if (error) throw new Error(`Load profiles: ${error.message}`);

  const bases = (data ?? []).map((r) => mapBaseProfile(r as unknown as ProfileRow));
  const roleMap = await fetchRoleMetaBySlugs(bases.map((p) => p.role));
  return bases.map((p) => withRoleMeta(p, roleMap.get(p.role)));
}

export async function upsertProfile(profile: AppProfile): Promise<void> {
  const { error } = await supabase.from('app_profiles').upsert({
    user_id: profile.userId,
    email: profile.email,
    display_name: profile.displayName,
    role: profile.role,
    product_ids: profile.productIds,
  });
  if (error) throw new Error(`Save profile: ${error.message}`);
}

export async function ensureProfileStub(
  userId: string,
  email: string
): Promise<AppProfile | null> {
  const existing = await fetchProfile(userId);
  if (existing) return existing;
  void email;
  return null;
}

/** Privileged call: the Edge Function checks manage_users on our own session. */
async function callAdminFunction(
  name: string,
  body: Record<string, unknown>,
  fallback: string
): Promise<void> {
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: sessionHeaders(),
  });

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String((data as { error: string }).error));
  }
  if (error) {
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const payload = (await context.json()) as { error?: string };
        if (payload?.error) throw new Error(payload.error);
      } catch (parsed) {
        if (parsed instanceof Error && parsed.message) throw parsed;
      }
    }
    throw new Error(error.message || fallback);
  }
}

export async function inviteUser(payload: {
  email: string;
  displayName: string;
  role: string;
  productIds: string[];
}): Promise<void> {
  await callAdminFunction('invite-user', payload, 'Invite failed');
}

export async function deleteUserAccount(userId: string): Promise<void> {
  await callAdminFunction('delete-user', { userId }, 'Delete failed');
}

export type AuthUserStatus = 'pending' | 'active';

/**
 * Account status from the app_user_status view, which exposes activation state
 * without ever revealing password hashes.
 */
export async function fetchAuthStatuses(): Promise<Record<string, AuthUserStatus>> {
  const { data, error } = await supabase
    .from('app_user_status')
    .select('user_id, is_active');
  if (error) throw new Error(`Load auth status: ${error.message}`);

  const statuses: Record<string, AuthUserStatus> = {};
  for (const row of data ?? []) {
    const { user_id: userId, is_active: isActive } = row as {
      user_id: string;
      is_active: boolean | null;
    };
    statuses[String(userId)] = isActive ? 'active' : 'pending';
  }
  return statuses;
}

export async function resendInvite(userId: string): Promise<void> {
  await callAdminFunction('resend-invite', { userId }, 'Resend invite failed');
}

export async function resetPassword(userId: string): Promise<void> {
  await callAdminFunction('reset-password', { userId }, 'Reset password failed');
}
