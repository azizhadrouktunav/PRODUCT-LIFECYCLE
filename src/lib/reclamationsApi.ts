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
  assignee_ids: string[] | null;
  assignee_name: string | null;
  response: string | null;
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
  productIds: string[];
};

function assigneeIdsOf(row: ReclamationRow): string[] {
  const many = (row.assignee_ids ?? []).map(String).filter(Boolean);
  if (many.length > 0) return many;
  return row.assignee_id ? [String(row.assignee_id)] : [];
}

function mapReclamation(row: ReclamationRow): Reclamation {
  const assigneeIds = assigneeIdsOf(row);
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description ?? ''),
    category: row.category as ReclamationCategory,
    status: row.status as ReclamationStatus,
    productIds: row.product_ids ?? [],
    assigneeIds,
    assigneeId: assigneeIds[0] ?? null,
    assigneeName: String(row.assignee_name ?? ''),
    response: String(row.response ?? ''),
    createdBy: String(row.created_by),
    createdByName: String(row.created_by_name ?? ''),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function toRow(rec: Reclamation): Record<string, unknown> {
  return {
    id: rec.id,
    title: rec.title,
    description: rec.description,
    category: rec.category,
    status: rec.status,
    product_ids: rec.productIds,
    assignee_id: rec.assigneeIds[0] ?? null,
    assignee_ids: rec.assigneeIds,
    assignee_name: rec.assigneeName,
    response: rec.response,
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
  roleSlug: string | null,
  productIds?: string[]
): Promise<AssignableUser[]> {
  const { data, error } = await supabase.rpc('app_list_users_by_role', {
    p_role: roleSlug,
    p_product_ids: productIds && productIds.length > 0 ? productIds : null,
  });
  if (error) throw new Error(`Load users by role: ${error.message}`);
  return (data ?? []).map(
    (r: {
      user_id: string;
      email: string;
      display_name: string;
      role: string;
      product_ids?: string[] | null;
    }) => ({
      userId: String(r.user_id),
      email: String(r.email ?? ''),
      displayName: String(r.display_name ?? ''),
      role: String(r.role ?? ''),
      productIds: r.product_ids ?? [],
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
  const assigneeIds = [...new Set(input.assigneeIds.filter(Boolean))];
  return {
    id,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    status: input.status ?? existing?.status ?? 'Open',
    productIds: input.productIds,
    assigneeIds,
    assigneeId: assigneeIds[0] ?? null,
    assigneeName: input.assigneeName,
    response: input.response ?? existing?.response ?? '',
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
  if (
    input.category === 'technique' ||
    input.category === 'it' ||
    input.category === 'support'
  ) {
    if (input.assigneeIds.length === 0) return 'Assign at least one person';
  }
  if (input.category === 'produit') {
    if (input.productIds.length === 0) return 'Select at least one product';
    if (input.assigneeIds.length === 0) return 'Assign at least one Product Owner';
  }
  return null;
}

export function isAssignee(rec: Pick<Reclamation, 'assigneeIds' | 'assigneeId'>, userId: string): boolean {
  if (!userId) return false;
  return rec.assigneeIds.includes(userId) || rec.assigneeId === userId;
}
