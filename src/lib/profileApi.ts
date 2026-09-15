import { supabase } from '../utils/supabase';
import type { AppProfile, AppRole } from './rbac';
import { isAppRole } from './rbac';

function mapProfile(row: Record<string, unknown>): AppProfile {
  const roleRaw = String(row.role ?? '');
  return {
    userId: String(row.user_id),
    email: String(row.email ?? ''),
    displayName: String(row.display_name ?? ''),
    role: isAppRole(roleRaw) ? roleRaw : 'ceo',
    productIds: (row.product_ids as string[] | null) ?? [],
  };
}

export async function fetchProfile(userId: string): Promise<AppProfile | null> {
  const { data, error } = await supabase
    .from('app_profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(`Load profile: ${error.message}`);
  if (!data) return null;
  return mapProfile(data as Record<string, unknown>);
}

export async function fetchProfiles(): Promise<AppProfile[]> {
  const { data, error } = await supabase.from('app_profiles').select('*').order('email');
  if (error) throw new Error(`Load profiles: ${error.message}`);
  return (data ?? []).map((r) => mapProfile(r as Record<string, unknown>));
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
  // Do not auto-create elevated roles; wait for admin assignment.
  // Insert a read-only CEO stub so the user can sign in and wait for assignment,
  // OR return null to block. Plan: return null → show “no profile” message.
  void email;
  return null;
}

export type { AppRole };
