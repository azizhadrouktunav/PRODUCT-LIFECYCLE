import { supabase } from '../utils/supabase';
import type {
  Reclamation,
  ReclamationCategory,
  ReclamationInput,
  ReclamationStatus,
} from '../types/reclamations';

type ReclamationRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  status: string;
  product_ids: string[] | null;
  assignee_id: string | null;
  assignee_name: string | null;
  created_by: string;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
};

export type AssignableUser = {
  userId: string;
  email: string;
  displayName: string;
  role: string;
};

function mapReclamation(row: ReclamationRow): Reclamation {
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description ?? ''),
    category: row.category as ReclamationCategory,
    status: row.status as ReclamationStatus,
    productIds: row.product_ids ?? [],
    assigneeId: row.assignee_id ? String(row.assignee_id) : null,
    assigneeName: String(row.assignee_name ?? ''),
    createdBy: String(row.created_by),
    createdByName: String(row.created_by_name ?? ''),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toRow(
  rec: Reclamation
): Record<string, unknown> {
  return {
    id: rec.id,
    title: rec.title,
    description: rec.description,
    category: rec.category,
    status: rec.status,
    product_ids: rec.productIds,
    assignee_id: rec.assigneeId,
    assignee_name: rec.assigneeName,
    created_by: rec.createdBy,
    created_by_name: rec.createdByName,
    updated_at: new Date().toISOString(),
  };
}

export async function fetchReclamations(): Promise<Reclamation[]> {
  const { data, error } = await supabase
    .from('reclamations')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Load reclamations: ${error.message}`);
  return (data ?? []).map((r) => mapReclamation(r as ReclamationRow));
}

export async function upsertReclamation(rec: Reclamation): Promise<void> {
  const { error } = await supabase.from('reclamations').upsert(toRow(rec));
  if (error) throw new Error(`Save reclamation: ${error.message}`);
}

export async function deleteReclamation(id: string): Promise<void> {
  const { error } = await supabase.from('reclamations').delete().eq('id', id);
  if (error) throw new Error(`Delete reclamation: ${error.message}`);
}

export async function listUsersByRole(
  roleSlug: string
): Promise<AssignableUser[]> {
  const { data, error } = await supabase.rpc('app_list_users_by_role', {
    p_role: roleSlug,
  });
  if (error) throw new Error(`Load users by role: ${error.message}`);
  return (data ?? []).map(
    (r: { user_id: string; email: string; display_name: string; role: string }) => ({
      userId: String(r.user_id),
      email: String(r.email ?? ''),
      displayName: String(r.display_name ?? ''),
      role: String(r.role ?? ''),
    })
  );
}

export function buildReclamation(
  id: string,
  input: ReclamationInput,
  createdBy: string,
  createdByName: string,
  existing?: Reclamation | null
): Reclamation {
  const now = new Date().toISOString();
  return {
    id,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    status: input.status ?? existing?.status ?? 'Open',
    productIds: input.productIds,
    assigneeId: input.assigneeId,
    assigneeName: input.assigneeName,
    createdBy: existing?.createdBy ?? createdBy,
    createdByName: existing?.createdByName ?? createdByName,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export function nextReclamationId(existing: { id: string }[]): string {
  const max = existing.reduce((acc, item) => {
    if (!item.id.startsWith('REC-')) return acc;
    const n = Number(item.id.slice(4));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `REC-${String(max + 1).padStart(3, '0')}`;
}

export function validateReclamationInput(input: ReclamationInput): string | null {
  if (input.title.trim().length < 2) return 'Title is required';
  if (input.category === 'technique' || input.category === 'it') {
    if (!input.assigneeId) return 'Assignee is required for this category';
  }
  if (input.category === 'produit' && input.productIds.length === 0) {
    return 'Select at least one product';
  }
  return null;
}
