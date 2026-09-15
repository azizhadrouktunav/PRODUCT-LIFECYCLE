import { supabase } from '../utils/supabase';
import type { AppProfile, RbacAction } from './rbac';
import { isRbacAction } from './rbac';

type ProfileRow = {
  user_id: string;
  email?: string | null;
  display_name?: string | null;
  role: string;
  product_ids?: string[] | null;
  app_roles?: {
    label?: string | null;
    sees_all_products?: boolean | null;
    app_role_permissions?: { action: string }[] | null;
  } | null;
};

function mapPermissions(rows: { action: string }[] | null | undefined): RbacAction[] {
  return (rows ?? [])
    .map((r) => r.action)
    .filter(isRbacAction);
}

function mapProfile(row: ProfileRow): AppProfile {
  const roleMeta = row.app_roles;
  return {
    userId: String(row.user_id),
    email: String(row.email ?? ''),
    displayName: String(row.display_name ?? ''),
    role: String(row.role ?? ''),
    productIds: row.product_ids ?? [],
    roleLabel: roleMeta?.label ?? undefined,
    seesAllProducts: !!roleMeta?.sees_all_products,
    permissions: mapPermissions(roleMeta?.app_role_permissions),
  };
}

const PROFILE_SELECT =
  'user_id, email, display_name, role, product_ids, app_roles(label, sees_all_products, app_role_permissions(action))';

export async function fetchProfile(userId: string): Promise<AppProfile | null> {
  const { data, error } = await supabase
    .from('app_profiles')
    .select(PROFILE_SELECT)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`Load profile: ${error.message}`);
  if (!data) return null;
  return mapProfile(data as unknown as ProfileRow);
}

export async function fetchProfiles(): Promise<AppProfile[]> {
  const { data, error } = await supabase
    .from('app_profiles')
    .select(PROFILE_SELECT)
    .order('email');
  if (error) throw new Error(`Load profiles: ${error.message}`);
  return (data ?? []).map((r) => mapProfile(r as unknown as ProfileRow));
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

export async function inviteUser(payload: {
  email: string;
  displayName: string;
  role: string;
  productIds: string[];
}): Promise<void> {
  const { data, error } = await supabase.functions.invoke('invite-user', {
    body: payload,
  });
  if (error) throw new Error(error.message || 'Invite failed');
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String((data as { error: string }).error));
  }
}

export async function deleteUserAccount(userId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-user', {
    body: { userId },
  });
  if (error) throw new Error(error.message || 'Delete failed');
  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String((data as { error: string }).error));
  }
}
