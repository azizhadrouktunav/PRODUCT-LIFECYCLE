import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  InfoIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react';
import { FullDataTransfer } from './FullDataTransfer';
import { RowActions } from './RowActions';
import { Button, Chip, PageHeader, StagePill, StatusTag, inputClass } from './Primitives';
import { useAuth } from '../contexts/AuthContext';
import { useCapabilityEditor } from '../contexts/CapabilityEditorContext';
import { useRegistry } from '../contexts/RegistryContext';
import type { Capability } from '../types/registry';
import { CAPABILITY_STATUSES, isStageAhead, stageIndex, usesEquipment } from '../types/registry';

const selectClass =
  'rounded-md border border-line-strong bg-ink-800 px-2.5 py-1.5 text-xs text-soft transition-colors duration-150 ease-out focus:border-brand focus:outline-none';

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50] as const;
const ROW_HEIGHT_REM = 3.25;

type SortKey = 'id' | 'name' | 'group' | 'products' | 'breakdown' | 'progress' | 'status';
type SortDir = 'asc' | 'desc';

export type RegisterFilterOption = { id: string; label: string };

const SORTABLE_COLUMNS: { key: SortKey; label: string; className: string }[] = [
  { key: 'id', label: 'ID', className: 'w-24' },
  { key: 'name', label: 'Capability', className: '' },
  { key: 'group', label: 'Group', className: 'w-36' },
  { key: 'products', label: 'Products', className: 'w-52' },
  { key: 'breakdown', label: 'Breakdown', className: 'w-44' },
  { key: 'progress', label: 'Progress', className: 'w-44' },
  { key: 'status', label: 'Status', className: 'w-28' },
];

function emptyLast(a: string | number, b: string | number, _dir: SortDir): number | null {
  const aEmpty = a === '' || a === -1;
  const bEmpty = b === '' || b === -1;
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;
  return null;
}

function compareValues(a: string | number, b: string | number, dir: SortDir): number {
  const empty = emptyLast(a, b, dir);
  if (empty !== null) return empty;
  let cmp = 0;
  if (typeof a === 'number' && typeof b === 'number') {
    cmp = a - b;
  } else {
    cmp = String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
  }
  return dir === 'asc' ? cmp : -cmp;
}

export function CapabilityRegister({
  groupId,
  lifecycleId,
  hideHeader = false,
  hideGroupFilter = false,
  compact = false,
  onAddCapability,
  lifecycleValue,
  onLifecycleChange,
  lifecycleOptions,
  groupValue,
  onGroupChange,
  groupOptions,
  onGroupProcess,
}: {
  /** When set, only capabilities in this group. */
  groupId?: string | null;
  /** When set (and no groupId), only capabilities whose group uses this lifecycle track. */
  lifecycleId?: string | null;
  hideHeader?: boolean;
  /** Hide the internal group dropdown (e.g. when Structure owns group filter). */
  hideGroupFilter?: boolean;
  /** Tighter chrome for embedding in Structure. */
  compact?: boolean;
  /** Override Add capability (defaults to openCreate with optional groupId). */
  onAddCapability?: () => void;
  /** Controlled Structure lifecycle filter (shown in the same filter row). */
  lifecycleValue?: string;
  onLifecycleChange?: (id: string) => void;
  lifecycleOptions?: RegisterFilterOption[];
  /** Controlled Structure group filter. */
  groupValue?: string;
  onGroupChange?: (id: string) => void;
  groupOptions?: RegisterFilterOption[];
  onGroupProcess?: () => void;
}) {
  const {
    capabilities,
    groups,
    products,
    equipment,
    getGroup,
    getProduct,
    countsOf,
    lifecycleOf,
  } = useRegistry();
  const { can, capabilityVisible, productVisible } = useAuth();
  const getEquipment = (id: string) => equipment.find((e) => e.id === id);
  const { openCreate, openEdit } = useCapabilityEditor();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('id');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const showStructureFilters = Array.isArray(lifecycleOptions) && Array.isArray(groupOptions);

  useEffect(() => {
    const status = searchParams.get('status');
    if (!status) return;
    if (status === 'none' || (CAPABILITY_STATUSES as string[]).includes(status)) {
      setStatusFilter(status);
    } else if (status === 'Blocked' || status === 'Rejected') {
      setStatusFilter('On Hold');
    } else if (status === 'Approved') {
      setStatusFilter('In Progress');
    }
  }, [searchParams]);

  useEffect(() => {
    if (groupId) setGroupFilter(groupId);
  }, [groupId]);

  const visibleProducts = useMemo(
    () => products.filter((p) => productVisible(p.id)),
    [products, productVisible]
  );

  const scopedCapabilities = useMemo(() => {
    let list = capabilities.filter((c) => capabilityVisible(c));
    if (groupId) {
      list = list.filter((c) => c.groupId === groupId);
    } else if (lifecycleId) {
      list = list.filter((c) => getGroup(c.groupId)?.track === lifecycleId);
    }
    return list;
  }, [capabilities, capabilityVisible, groupId, lifecycleId, getGroup]);

  const visibleGroups = useMemo(() => {
    if (groupId) return groups.filter((g) => g.id === groupId);
    if (lifecycleId) return groups.filter((g) => g.track === lifecycleId);
    return groups.filter((g) => scopedCapabilities.some((c) => c.groupId === g.id));
  }, [groups, scopedCapabilities, groupId, lifecycleId]);

  const columns = useMemo(
    () =>
      groupId
        ? SORTABLE_COLUMNS.filter((c) => c.key !== 'group')
        : SORTABLE_COLUMNS,
    [groupId]
  );

  function sortValue(c: Capability, key: SortKey): string | number {
    const lifecycle = lifecycleOf(c);
    const counts = countsOf(c.id);
    switch (key) {
      case 'id':
        return c.id;
      case 'name':
        return c.name;
      case 'group':
        return getGroup(c.groupId)?.name ?? '';
      case 'products':
        return (c.productIds ?? [])
          .map((id) => getProduct(id)?.name ?? id)
          .join('; ')
          .toLowerCase();
      case 'breakdown':
        if (usesEquipment(lifecycle)) return counts.equipment;
        return counts.epics * 1_000_000 + counts.features * 1_000 + counts.stories;
      case 'progress': {
        const idx = stageIndex(lifecycle, c.progress);
        return idx < 0 ? -1 : idx;
      }
      case 'status':
        return c.status ?? '';
      default:
        return '';
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const effectiveGroup = groupId ?? groupFilter;
    const filtered = scopedCapabilities.filter((c) => {
      if (!groupId && effectiveGroup !== 'all' && c.groupId !== effectiveGroup) return false;
      if (statusFilter !== 'all' && (c.status ?? 'none') !== statusFilter) return false;
      if (productFilter !== 'all' && !(c.productIds ?? []).includes(productFilter)) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.jiraEpic.toLowerCase().includes(q) ||
        (c.productIds ?? []).some((d) => d.toLowerCase().includes(q))
      );
    });

    return [...filtered].sort((a, b) =>
      compareValues(sortValue(a, sortKey), sortValue(b, sortKey), sortDir)
    );
  }, [
    scopedCapabilities,
    query,
    groupFilter,
    groupId,
    productFilter,
    statusFilter,
    getProduct,
    getGroup,
    countsOf,
    lifecycleOf,
    sortKey,
    sortDir,
  ]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = rows.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const pageEnd = Math.min(safePage * pageSize, rows.length);
  const pageRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [
    query,
    groupFilter,
    groupId,
    lifecycleId,
    productFilter,
    statusFilter,
    sortKey,
    sortDir,
    pageSize,
    lifecycleValue,
    groupValue,
  ]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const structureFiltersActive =
    showStructureFilters && (!!lifecycleValue || !!groupValue);

  const filtered =
    structureFiltersActive ||
    (!groupId && groupFilter !== 'all') ||
    productFilter !== 'all' ||
    statusFilter !== 'all' ||
    query.trim() !== '';

  function clearFilters() {
    setQuery('');
    if (!groupId) setGroupFilter('all');
    setProductFilter('all');
    setStatusFilter('all');
    if (showStructureFilters) {
      onLifecycleChange?.('');
      onGroupChange?.('');
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function handleAdd() {
    if (onAddCapability) {
      onAddCapability();
      return;
    }
    openCreate(groupId ? { groupId } : undefined);
  }

  const tableMaxHeight = `min(${pageSize * ROW_HEIGHT_REM + 2.75}rem, 70vh)`;

  return (
    <div>
      {!hideHeader && (
        <PageHeader
          title="Capability Register"
          count={`${scopedCapabilities.length} entries`}
          action={
            <div className="flex flex-wrap items-center gap-1.5">
              {can('import_export') && <FullDataTransfer />}
              {can('add_capability') && (
                <Button variant="primary" onClick={handleAdd}>
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add capability
                </Button>
              )}
            </div>
          }
        />
      )}

      <div
        className={`flex flex-wrap items-center gap-2 ${compact ? 'pb-2' : 'py-3'}`}
      >
        {showStructureFilters && (
          <>
            <select
              className={`${selectClass} max-w-[200px]`}
              value={lifecycleValue ?? ''}
              onChange={(e) => onLifecycleChange?.(e.target.value)}
              aria-label="Filter by lifecycle"
            >
              <option value="">All lifecycles</option>
              {(lifecycleOptions ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1">
              <select
                className={`${selectClass} max-w-[200px]`}
                value={groupValue ?? ''}
                onChange={(e) => onGroupChange?.(e.target.value)}
                aria-label="Filter by capability group"
              >
                <option value="">All groups</option>
                {(groupOptions ?? []).map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              {groupValue && onGroupProcess && (
                <button
                  type="button"
                  onClick={onGroupProcess}
                  className="shrink-0 rounded p-1.5 text-mute hover:text-brand-bright"
                  title="View process"
                  aria-label="View group process"
                >
                  <InfoIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </>
        )}

        <div className="relative min-w-[160px] flex-1 sm:max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
          <input
            className={`${inputClass} py-1.5 pl-8 text-xs`}
            placeholder="Search name, ID, epic or product"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search capabilities"
          />
        </div>
        {!hideGroupFilter && !groupId && !showStructureFilters && (
          <select
            className={selectClass}
            value={groupFilter}
            onChange={(e) => setGroupFilter(e.target.value)}
            aria-label="Filter by capability group"
          >
            <option value="all">All groups</option>
            {visibleGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}
        <select
          className={selectClass}
          value={productFilter}
          onChange={(e) => setProductFilter(e.target.value)}
          aria-label="Filter by product"
        >
          <option value="all">All products</option>
          {[...visibleProducts]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <select
          className={selectClass}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">Any status</option>
          <option value="none">No flag</option>
          {CAPABILITY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {filtered && (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center gap-1 px-1 text-xs text-mute transition-colors duration-150 ease-out hover:text-strong"
          >
            <XIcon className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      <div
        className="scroll-thin overflow-auto border-t border-line"
        style={{ maxHeight: tableMaxHeight }}
      >
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead className="sticky top-0 z-[1] bg-ink-900">
            <tr className="text-2xs uppercase tracking-[0.14em] text-ink-500">
              {columns.map((col) => {
                const active = sortKey === col.key;
                const ariaSort = active
                  ? sortDir === 'asc'
                    ? 'ascending'
                    : 'descending'
                  : 'none';
                return (
                  <th
                    key={col.key}
                    className={`${col.className} border-b border-line bg-ink-900 py-2.5 pr-4 font-medium`}
                    aria-sort={ariaSort}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={`inline-flex items-center gap-1 transition-colors duration-150 ease-out hover:text-strong ${
                        active ? 'text-strong' : ''
                      }`}
                    >
                      {col.label}
                      {active &&
                        (sortDir === 'asc' ? (
                          <ChevronUpIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
                        ) : (
                          <ChevronDownIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
                        ))}
                    </button>
                  </th>
                );
              })}
              <th className="w-16 border-b border-line bg-ink-900 py-2.5 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((c) => {
              const counts = countsOf(c.id);
              const lifecycle = lifecycleOf(c);
              const ahead = isStageAhead(lifecycle, c.progress, counts);
              const equipmentBound = usesEquipment(lifecycle);
              return (
                <tr
                  key={c.id}
                  tabIndex={0}
                  onClick={() => navigate(`/capabilities/${c.id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(`/capabilities/${c.id}`);
                  }}
                  className="cursor-pointer border-t border-line-soft align-top transition-colors duration-150 ease-out hover:bg-ink-800"
                >
                  <td className="py-3 pr-4 font-mono text-2xs text-mute">{c.id}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-strong">{c.name}</span>
                      {equipmentBound && <Chip tone="aqua">{counts.equipment} equip.</Chip>}
                    </div>
                    <p className="mt-0.5 line-clamp-1 max-w-xl text-xs text-mute">{c.description}</p>
                  </td>
                  {!groupId && (
                    <td className="py-3 pr-4 text-xs text-soft">
                      {getGroup(c.groupId)?.name ?? '—'}
                    </td>
                  )}
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {(c.productIds ?? []).slice(0, 3).map((id) => (
                        <Chip key={id} tone="brand" title={id}>
                          {getProduct(id)?.name ?? id}
                        </Chip>
                      ))}
                      {(c.productIds ?? []).length > 3 && (
                        <span className="text-2xs text-mute">
                          +{(c.productIds ?? []).length - 3}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    {equipmentBound ? (
                      c.equipmentIds.length === 0 ? (
                        <span className="text-2xs text-ink-500">No equipment</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {c.equipmentIds.slice(0, 2).map((id) => (
                            <Chip key={id} tone="aqua" title={getEquipment(id)?.name}>
                              {getEquipment(id)?.model ?? id}
                            </Chip>
                          ))}
                          {c.equipmentIds.length > 2 && (
                            <span className="text-2xs text-mute">+{c.equipmentIds.length - 2}</span>
                          )}
                        </div>
                      )
                    ) : counts.epics === 0 ? (
                      <span className="text-2xs text-ink-500">Not broken down</span>
                    ) : (
                      <span className="font-mono text-2xs text-soft">
                        {counts.epics}E · {counts.features}F · {counts.stories}S
                      </span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-1.5">
                      <StagePill track={lifecycle.id} stage={c.progress} />
                      {ahead && (
                        <AlertTriangleIcon
                          className="h-3 w-3 shrink-0 text-warn"
                          aria-label="Progress is ahead of the breakdown"
                        />
                      )}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusTag status={c.status} />
                  </td>
                  <td className="py-3 text-right">
                    <RowActions capability={c} onEdit={openEdit} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {rows.length === 0 && (
          <div className="border-t border-line-soft py-16 text-center">
            <p className="text-sm text-soft">No capability matches these filters.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-2 text-xs text-brand-bright transition-colors duration-150 ease-out hover:text-strong"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-t border-line py-2.5">
          <span className="font-mono text-2xs text-ink-500">
            Showing {pageStart}–{pageEnd} of {rows.length}
          </span>
          <label className="inline-flex items-center gap-1.5 text-xs text-mute">
            Rows
            <select
              className={selectClass}
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex items-center gap-1 rounded-md border border-line-strong px-2 py-1 text-xs text-mute transition-colors duration-150 ease-out hover:border-brand hover:text-strong disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeftIcon className="h-3.5 w-3.5" />
              Prev
            </button>
            <span className="px-2 font-mono text-2xs text-ink-500">
              {safePage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex items-center gap-1 rounded-md border border-line-strong px-2 py-1 text-xs text-mute transition-colors duration-150 ease-out hover:border-brand hover:text-strong disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Next page"
            >
              Next
              <ChevronRightIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
