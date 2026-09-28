import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  InboxIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import { ReclamationModal } from '../components/ReclamationModal';
import { Button, Chip, PageHeader } from '../components/Primitives';
import { useAuth } from '../contexts/AuthContext';
import { useRegistry } from '../contexts/RegistryContext';
import {
  buildReclamation,
  deleteReclamation,
  fetchReclamations,
  isAssignee,
  nextReclamationId,
  upsertReclamation,
} from '../lib/reclamationsApi';
import type {
  Reclamation,
  ReclamationCategory,
  ReclamationInput,
  ReclamationStatus,
} from '../types/reclamations';
import {
  RECLAMATION_CATEGORIES,
  RECLAMATION_CATEGORY_LABEL,
  RECLAMATION_STATUSES,
} from '../types/reclamations';

const selectClass =
  'rounded-md border border-line-strong bg-ink-800 px-2.5 py-1.5 text-xs text-soft transition-colors duration-150 ease-out focus:border-brand focus:outline-none';

type ScopeFilter = 'all' | 'mine' | 'assigned';

function statusClass(status: ReclamationStatus): string {
  switch (status) {
    case 'Open':
      return 'border-brand/40 text-brand-bright';
    case 'In Progress':
      return 'border-aqua/40 text-aqua';
    case 'Resolved':
      return 'border-ok/40 text-ok';
    case 'Closed':
      return 'border-line-strong text-mute';
    default:
      return 'border-line-strong text-mute';
  }
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function ReclamationsPage() {
  const { user, profile, can, role } = useAuth();
  const { products } = useRegistry();
  const canManage = can('manage_reclamations');
  const isAdmin = canManage || role === 'administrator';
  const userId = user?.id ?? profile?.userId ?? '';

  const [items, setItems] = useState<Reclamation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Reclamation | null>(null);

  const [scope, setScope] = useState<ScopeFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<ReclamationCategory | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ReclamationStatus | 'all'>('all');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchReclamations();
      setItems(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (scope === 'mine' && r.createdBy !== userId) return false;
      if (scope === 'assigned' && !isAssignee(r, userId)) return false;
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      return true;
    });
  }, [items, scope, categoryFilter, statusFilter, userId]);

  function productLabels(ids: string[]): string {
    if (ids.length === 0) return '—';
    return ids
      .map((id) => products.find((p) => p.id === id)?.name ?? id)
      .join(', ');
  }

  async function handleSave(input: ReclamationInput) {
    if (!userId) throw new Error('Not signed in');
    const authorName =
      profile?.displayName?.trim() ||
      profile?.email ||
      user?.email ||
      'User';
    const existing = editing;
    const id = existing?.id ?? nextReclamationId(items);
    const rec = buildReclamation(id, input, userId, authorName, existing);
    const mayTreat =
      !!existing &&
      (existing.category === 'support' ? isAdmin : isAssignee(existing, userId));
    if (!mayTreat) {
      rec.status = existing?.status ?? 'Open';
      rec.response = existing?.response ?? '';
    }
    await upsertReclamation(rec);
    await reload();
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this reclamation?')) return;
    try {
      await deleteReclamation(id);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function canTreatRow(r: Reclamation): boolean {
    if (r.category === 'support') return isAdmin;
    return isAssignee(r, userId);
  }

  function canReassignRow(r: Reclamation | null): boolean {
    if (!r) return true;
    if (r.category === 'support') return isAdmin;
    if (r.category === 'demande') return r.createdBy === userId || isAssignee(r, userId);
    return isAssignee(r, userId);
  }

  function canEditRow(r: Reclamation): boolean {
    return canReassignRow(r) || canTreatRow(r);
  }

  function canDeleteRow(r: Reclamation): boolean {
    if (r.category === 'support') return isAdmin;
    if (r.category === 'demande') return r.createdBy === userId;
    return isAssignee(r, userId);
  }

  const modalTarget = editing;
  const modalOpen = adding || !!editing;

  return (
    <div>
      <PageHeader
        title="Reclamations"
        count={`${filtered.length} item${filtered.length === 1 ? '' : 's'}`}
        action={
          <Button
            variant="primary"
            onClick={() => {
              setEditing(null);
              setAdding(true);
            }}
          >
            <PlusIcon className="h-3.5 w-3.5" />
            New reclamation
          </Button>
        }
      />

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <select
          className={selectClass}
          value={scope}
          onChange={(e) => setScope(e.target.value as ScopeFilter)}
          aria-label="Scope filter"
        >
          <option value="all">All</option>
          <option value="mine">Mine</option>
          <option value="assigned">Assigned to me</option>
        </select>
        <select
          className={selectClass}
          value={categoryFilter}
          onChange={(e) =>
            setCategoryFilter(e.target.value as ReclamationCategory | 'all')
          }
          aria-label="Category filter"
        >
          <option value="all">All categories</option>
          {RECLAMATION_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          className={selectClass}
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as ReclamationStatus | 'all')
          }
          aria-label="Status filter"
        >
          <option value="all">All statuses</option>
          {RECLAMATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mt-3 text-xs text-orange">{error}</p>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-mute">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="mt-8 border-t border-line pt-12 text-center">
          <InboxIcon className="mx-auto h-8 w-8 text-ink-500" />
          <p className="mt-3 text-sm text-soft">No reclamations yet.</p>
        </div>
      ) : (
        <div className="scroll-thin mt-3 overflow-x-auto border-t border-line">
          <table className="w-full min-w-[960px] border-collapse text-left">
            <thead>
              <tr className="text-2xs uppercase tracking-[0.14em] text-ink-500">
                <th className="w-24 py-2.5 pr-4 font-medium">ID</th>
                <th className="w-44 py-2.5 pr-4 font-medium">Category</th>
                <th className="py-2.5 pr-4 font-medium">Title</th>
                <th className="w-40 py-2.5 pr-4 font-medium">Product</th>
                <th className="w-40 py-2.5 pr-4 font-medium">Assignee</th>
                <th className="w-28 py-2.5 pr-4 font-medium">Status</th>
                <th className="w-36 py-2.5 pr-4 font-medium">Author</th>
                <th className="w-28 py-2.5 pr-4 font-medium">Date</th>
                <th className="w-20 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-line-soft align-top">
                  <td className="py-3 pr-4 font-mono text-2xs text-mute">{r.id}</td>
                  <td className="py-3 pr-4">
                    <Chip>{RECLAMATION_CATEGORY_LABEL[r.category]}</Chip>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-sm font-medium text-strong">{r.title}</p>
                    {r.description && (
                      <p className="mt-0.5 line-clamp-2 max-w-md text-xs text-mute">
                        {r.description}
                      </p>
                    )}
                    {r.response && (
                      <p className="mt-1 line-clamp-2 max-w-md text-xs text-soft">
                        Reply: {r.response}
                      </p>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-xs text-mute">
                    {productLabels(r.productIds)}
                  </td>
                  <td className="py-3 pr-4 text-xs text-soft">
                    {r.assigneeName || '—'}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`inline-flex whitespace-nowrap rounded border px-1.5 py-0.5 text-2xs font-medium ${statusClass(r.status)}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-xs text-mute">{r.createdByName || '—'}</td>
                  <td className="py-3 pr-4 text-2xs text-mute">
                    {formatDate(r.createdAt)}
                  </td>
                  <td className="py-3 text-right">
                    <div className="inline-flex items-center gap-0.5">
                      {canEditRow(r) && (
                        <button
                          type="button"
                          aria-label={`Edit ${r.title}`}
                          onClick={() => {
                            setAdding(false);
                            setEditing(r);
                          }}
                          className="rounded p-1.5 text-mute transition-colors duration-150 ease-out hover:bg-ink-700 hover:text-strong"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {canDeleteRow(r) && (
                        <button
                          type="button"
                          aria-label={`Delete ${r.title}`}
                          onClick={() => void handleDelete(r.id)}
                          className="rounded p-1.5 text-mute transition-colors duration-150 ease-out hover:bg-ink-700 hover:text-danger"
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ReclamationModal
        open={modalOpen}
        reclamation={modalTarget}
        canManageStatus={!!modalTarget && canTreatRow(modalTarget)}
        canReassign={!modalTarget || canReassignRow(modalTarget)}
        canReply={!!modalTarget && canTreatRow(modalTarget)}
        allowSupport={isAdmin}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />
    </div>
  );
}
