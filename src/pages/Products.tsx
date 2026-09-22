import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import { DataTransfer } from '../components/DataTransfer';
import { ProductModal } from '../components/ProductModal';
import { Button, PageHeader, StatusTag } from '../components/Primitives';
import { SortableGripButton, SortableList } from '../components/SortableTableBody';
import { useAuth } from '../contexts/AuthContext';
import { useRegistry } from '../contexts/RegistryContext';
import type { Capability, Product } from '../types/registry';
import { sortByOrder, stageIndex } from '../types/registry';

const selectClass =
  'rounded-md border border-line-strong bg-ink-800 px-2.5 py-1.5 text-xs text-soft transition-colors duration-150 ease-out focus:border-brand focus:outline-none';

type SortKey = 'id' | 'name' | 'group' | 'status' | 'progress';
type SortDir = 'asc' | 'desc';

const SORTABLE_COLUMNS: { key: SortKey; label: string; className: string }[] = [
  { key: 'id', label: 'ID', className: 'w-28' },
  { key: 'name', label: 'Name', className: '' },
  { key: 'group', label: 'Group', className: 'w-40' },
  { key: 'status', label: 'Status', className: 'w-32' },
  { key: 'progress', label: 'Progress', className: 'w-40' },
];

function emptyLast(a: string | number, b: string | number): number | null {
  const aEmpty = a === '' || a === -1;
  const bEmpty = b === '' || b === -1;
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  return null;
}

function compareValues(a: string | number, b: string | number, dir: SortDir): number {
  const empty = emptyLast(a, b);
  if (empty !== null) return empty;
  let cmp = 0;
  if (typeof a === 'number' && typeof b === 'number') {
    cmp = a - b;
  } else {
    cmp = String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
  }
  return dir === 'asc' ? cmp : -cmp;
}

export function ProductsPage() {
  const { products, capabilities, groups, getGroup, lifecycleOf, removeProduct, reorderProducts } =
    useRegistry();
  const { can, productVisible, capabilityVisible } = useAuth();
  const canManage = can('manage_products');
  const [activeId, setActiveId] = useState(products[0]?.id ?? '');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [groupFilter, setGroupFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sorted = useMemo(
    () => sortByOrder(products.filter((p) => productVisible(p.id))),
    [products, productVisible]
  );

  useEffect(() => {
    if (sorted.length === 0) {
      setActiveId('');
      return;
    }
    if (!sorted.some((p) => p.id === activeId)) {
      setActiveId(sorted[0].id);
    }
  }, [sorted, activeId]);

  useEffect(() => {
    setGroupFilter('all');
  }, [activeId]);

  const active = sorted.find((p) => p.id === activeId) ?? sorted[0];
  const assigned = useMemo(
    () =>
      active
        ? capabilities.filter(
            (c) =>
              (c.productIds ?? []).includes(active.id) && capabilityVisible(c)
          )
        : [],
    [capabilities, active, capabilityVisible]
  );

  const availableGroups = useMemo(() => {
    const ids = new Set(assigned.map((c) => c.groupId));
    return groups
      .filter((g) => ids.has(g.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [assigned, groups]);

  useEffect(() => {
    if (groupFilter !== 'all' && !availableGroups.some((g) => g.id === groupFilter)) {
      setGroupFilter('all');
    }
  }, [availableGroups, groupFilter]);

  function sortValue(c: Capability, key: SortKey): string | number {
    switch (key) {
      case 'id':
        return c.id;
      case 'name':
        return c.name;
      case 'group':
        return getGroup(c.groupId)?.name ?? '';
      case 'status':
        return c.status ?? '';
      case 'progress': {
        const idx = stageIndex(lifecycleOf(c), c.progress);
        return idx < 0 ? -1 : idx;
      }
      default:
        return '';
    }
  }

  const rows = useMemo(() => {
    const filtered =
      groupFilter === 'all' ? assigned : assigned.filter((c) => c.groupId === groupFilter);
    return [...filtered].sort((a, b) =>
      compareValues(sortValue(a, sortKey), sortValue(b, sortKey), sortDir)
    );
  }, [assigned, groupFilter, getGroup, lifecycleOf, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        count={`${sorted.length} products`}
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            {canManage && <DataTransfer dataset="products" />}
            {canManage && (
              <Button
                variant="primary"
                onClick={() => {
                  setEditing(null);
                  setAdding(true);
                }}
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add product
              </Button>
            )}
          </div>
        }
      />

      {sorted.length === 0 ? (
        <div className="mt-8 border-t border-line pt-12 text-center">
          <PackageIcon className="mx-auto h-8 w-8 text-ink-500" />
          <p className="mt-3 text-sm text-soft">No products yet.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-t border-line pt-3 lg:border-t-0 lg:border-r lg:border-line lg:pr-4 lg:pt-0">
            <p className="mb-2 text-2xs uppercase tracking-[0.14em] text-ink-500">Products</p>
            <SortableList
              items={sorted}
              disabled={!canManage}
              onReorder={reorderProducts}
              className="space-y-0.5"
              renderItem={(p, handle) => {
                const count = capabilities.filter((c) =>
                  (c.productIds ?? []).includes(p.id)
                ).length;
                const isActive = active?.id === p.id;
                return (
                  <div className="flex items-center gap-0.5">
                    {canManage && <SortableGripButton handle={handle} />}
                    <button
                      type="button"
                      onClick={() => setActiveId(p.id)}
                      aria-current={isActive}
                      className={`flex min-w-0 flex-1 items-start justify-between gap-2 rounded-md px-2.5 py-2 text-left transition-colors duration-150 ease-out ${
                        isActive
                          ? 'bg-ink-700 text-strong'
                          : 'text-mute hover:bg-ink-800 hover:text-soft'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <span className="block font-mono text-2xs text-ink-500">{p.id}</span>
                      </span>
                      <span className="shrink-0 text-2xs text-ink-500">{count}</span>
                    </button>
                  </div>
                );
              }}
            />
          </aside>

          {active && (
            <section className="min-w-0 border-t border-line pt-3 lg:border-t-0 lg:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-medium text-strong">{active.name}</h2>
                  <p className="mt-0.5 font-mono text-2xs text-mute">{active.id}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mute">
                    {active.description || 'No description.'}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  {canManage && (
                    <>
                      <button
                        type="button"
                        aria-label={`Edit ${active.name}`}
                        onClick={() => {
                          setEditing(active);
                          setAdding(true);
                        }}
                        className="rounded p-1.5 text-mute transition-colors duration-150 ease-out hover:bg-ink-700 hover:text-strong"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${active.name}`}
                        onClick={() => removeProduct(active.id)}
                        className="rounded p-1.5 text-mute transition-colors duration-150 ease-out hover:bg-ink-700 hover:text-danger"
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-2xs uppercase tracking-[0.14em] text-ink-500">
                    Capabilities · {rows.length}
                    {groupFilter !== 'all' ? ` of ${assigned.length}` : ''}
                  </h3>
                  {assigned.length > 0 && availableGroups.length > 0 && (
                    <select
                      className={selectClass}
                      value={groupFilter}
                      onChange={(e) => setGroupFilter(e.target.value)}
                      aria-label="Filter by capability group"
                    >
                      <option value="all">All groups</option>
                      {availableGroups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {assigned.length === 0 ? (
                  <p className="mt-3 text-sm text-mute">
                    No capabilities assigned to this product yet.
                  </p>
                ) : (
                  <div className="scroll-thin mt-2 overflow-x-auto">
                    <table className="w-full min-w-[640px] border-collapse text-left">
                      <thead>
                        <tr className="text-2xs uppercase tracking-[0.14em] text-ink-500">
                          {SORTABLE_COLUMNS.map((col) => {
                            const isActive = sortKey === col.key;
                            const ariaSort = isActive
                              ? sortDir === 'asc'
                                ? 'ascending'
                                : 'descending'
                              : 'none';
                            return (
                              <th
                                key={col.key}
                                className={`${col.className} py-2 pr-4 font-medium`}
                                aria-sort={ariaSort}
                              >
                                <button
                                  type="button"
                                  onClick={() => toggleSort(col.key)}
                                  className={`inline-flex items-center gap-1 transition-colors duration-150 ease-out hover:text-strong ${
                                    isActive ? 'text-strong' : ''
                                  }`}
                                >
                                  {col.label}
                                  {isActive &&
                                    (sortDir === 'asc' ? (
                                      <ChevronUpIcon
                                        className="h-3 w-3 shrink-0"
                                        aria-hidden="true"
                                      />
                                    ) : (
                                      <ChevronDownIcon
                                        className="h-3 w-3 shrink-0"
                                        aria-hidden="true"
                                      />
                                    ))}
                                </button>
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((c) => (
                          <tr key={c.id} className="border-t border-line-soft">
                            <td className="py-2.5 pr-4 font-mono text-2xs text-mute">
                              <Link
                                to={`/capabilities/${c.id}`}
                                className="hover:text-strong"
                              >
                                {c.id}
                              </Link>
                            </td>
                            <td className="py-2.5 pr-4 text-sm text-strong">
                              <Link
                                to={`/capabilities/${c.id}`}
                                className="hover:text-brand-bright"
                              >
                                {c.name}
                              </Link>
                            </td>
                            <td className="py-2.5 pr-4 text-xs text-mute">
                              {getGroup(c.groupId)?.name ?? c.groupId}
                            </td>
                            <td className="py-2.5 pr-4">
                              <StatusTag status={c.status} />
                            </td>
                            <td className="py-2.5 text-xs text-mute">{c.progress}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      <ProductModal
        open={adding}
        product={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
