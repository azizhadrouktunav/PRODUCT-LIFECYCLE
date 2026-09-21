import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckIcon,
  EyeIcon,
  MoreVerticalIcon,
  PencilIcon,
  PlusIcon,
  SettingsIcon,
  Trash2Icon,
} from 'lucide-react';
import { AddEquipmentTypeModal } from '../components/AddEquipmentTypeModal';
import { DataTransfer } from '../components/DataTransfer';
import { DetailsModal } from '../components/DetailsModal';
import { EquipmentModal } from '../components/EquipmentModal';
import { Modal } from '../components/Modal';
import { Button, PageHeader, StagePill, StatusTag } from '../components/Primitives';
import { useAuth } from '../contexts/AuthContext';
import { useRegistry } from '../contexts/RegistryContext';
import type { CapabilityStatus, Equipment, EquipmentType } from '../types/registry';
import { MANUAL_CAPABILITY_STATUSES, isAutoManagedStatus } from '../types/registry';

const menuItemClass =
  'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-strong transition-colors duration-150 ease-out hover:bg-ink-700';

function productLabel(
  productIds: string[],
  products: { id: string; name: string }[],
  productVisible: (id: string) => boolean
): string {
  const names = productIds
    .filter((id) => productVisible(id))
    .map((id) => products.find((p) => p.id === id)?.name ?? id)
    .filter(Boolean);
  if (names.length === 0) return '—';
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1}`;
}

export function EquipmentPage() {
  const {
    equipment,
    equipmentTypes,
    hardwareCapabilities,
    products,
    setEquipmentCapabilities,
    removeEquipment,
    removeEquipmentType,
    updateEquipment,
  } = useRegistry();
  const { can, capabilityVisible, entityVisible, productVisible } = useAuth();
  const canEdit = can('manage_equipment');
  const canImportExport = can('import_export');
  const showSettings = canEdit || canImportExport;
  const visibleEquipment = useMemo(
    () => equipment.filter((e) => entityVisible(e.productIds)),
    [equipment, entityVisible]
  );
  const visibleHardware = useMemo(
    () => hardwareCapabilities.filter(capabilityVisible),
    [hardwareCapabilities, capabilityVisible]
  );
  const [activeId, setActiveId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [addingEquipment, setAddingEquipment] = useState(false);
  const [addingType, setAddingType] = useState(false);
  const [editingType, setEditingType] = useState<EquipmentType | null>(null);
  const [manageTypesOpen, setManageTypesOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [viewing, setViewing] = useState<Equipment | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const settingsRef = useRef<HTMLDivElement>(null);
  const rowMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (visibleEquipment.length === 0) {
      setActiveId('');
      return;
    }
    if (!visibleEquipment.some((e) => e.id === activeId)) {
      setActiveId(visibleEquipment[0].id);
    }
  }, [visibleEquipment, activeId]);

  useEffect(() => {
    if (!settingsOpen) return;
    const onDown = (e: MouseEvent) => {
      if (settingsRef.current?.contains(e.target as Node)) return;
      setSettingsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSettingsOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [settingsOpen]);

  useEffect(() => {
    if (!rowMenuId) return;
    const onDown = (e: MouseEvent) => {
      if (rowMenuRef.current?.contains(e.target as Node)) return;
      setRowMenuId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRowMenuId(null);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [rowMenuId]);

  const active = visibleEquipment.find((e) => e.id === activeId) ?? visibleEquipment[0];
  const supported = useMemo(
    () =>
      active ? visibleHardware.filter((c) => c.equipmentIds.includes(active.id)) : [],
    [visibleHardware, active]
  );

  const sortedTypes = useMemo(
    () => [...equipmentTypes].sort((a, b) => a.name.localeCompare(b.name)),
    [equipmentTypes]
  );

  function openAssignFor(item: Equipment) {
    setActiveId(item.id);
    setDraft(
      visibleHardware.filter((c) => c.equipmentIds.includes(item.id)).map((c) => c.id)
    );
    setAssigning(true);
    setRowMenuId(null);
  }

  function save() {
    if (!active) return;
    const visible = new Set(visibleHardware.map((c) => c.id));
    const hidden = hardwareCapabilities
      .filter((c) => !visible.has(c.id) && c.equipmentIds.includes(active.id))
      .map((c) => c.id);
    setEquipmentCapabilities(active.id, [...draft, ...hidden]);
    setAssigning(false);
  }

  function handleDeleteFor(id: string) {
    removeEquipment(id);
    setRowMenuId(null);
  }

  const settingsMenu = showSettings ? (
    <div ref={settingsRef} className="relative">
      <button
        type="button"
        onClick={() => setSettingsOpen((v) => !v)}
        aria-label="Equipment settings"
        aria-expanded={settingsOpen}
        title="Settings"
        className="rounded-md border border-line-strong p-1.5 text-mute transition-colors duration-150 ease-out hover:border-brand hover:text-strong"
      >
        <SettingsIcon className="h-3.5 w-3.5" />
      </button>
      <div
        role="menu"
        hidden={!settingsOpen}
        className="elev absolute right-0 z-[80] mt-1.5 min-w-[180px] rounded-lg border border-line-strong bg-ink-800 p-1 shadow-lg"
      >
        {canEdit && (
          <>
            <button
              type="button"
              role="menuitem"
              className={menuItemClass}
              onClick={() => {
                setSettingsOpen(false);
                setManageTypesOpen(true);
              }}
            >
              Manage types
            </button>
            <button
              type="button"
              role="menuitem"
              className={menuItemClass}
              onClick={() => {
                setSettingsOpen(false);
                setEditingType(null);
                setAddingType(true);
              }}
            >
              Add type
            </button>
            <button
              type="button"
              role="menuitem"
              className={menuItemClass}
              onClick={() => {
                setSettingsOpen(false);
                setAddingEquipment(true);
              }}
            >
              Add equipment
            </button>
          </>
        )}
        {canEdit && canImportExport && (
          <div className="my-1 border-t border-line-soft" role="separator" />
        )}
        {canImportExport && (
          <DataTransfer
            dataset="equipment"
            mode="menuItems"
            onAction={() => setSettingsOpen(false)}
          />
        )}
      </div>
    </div>
  ) : null;

  const modelsHeader = (
    <div className="flex h-12 items-center gap-2 border-b border-line-strong px-3">
      <h2 className="text-2xs uppercase tracking-[0.14em] text-ink-500">
        Models · {visibleEquipment.length}
      </h2>
      {settingsMenu && <div className="ml-auto">{settingsMenu}</div>}
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0">
        <PageHeader title="Equipment" />
      </div>

      {visibleEquipment.length === 0 || !active ? (
        <div className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-line-strong">
          <div className="shrink-0">{modelsHeader}</div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <p className="text-sm text-mute">No models yet.</p>
          </div>
        </div>
      ) : (
        <div className="mt-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-line-strong lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col border-b border-line-strong lg:h-full lg:border-b-0 lg:border-r lg:border-line-strong">
            <div className="shrink-0">{modelsHeader}</div>
            <nav
              aria-label="Equipment models"
              className="min-h-0 flex-1 overflow-y-auto"
            >
              {visibleEquipment.map((e) => {
                const isActive = e.id === active.id;
                const count = visibleHardware.filter((c) =>
                  c.equipmentIds.includes(e.id)
                ).length;
                const menuOpen = rowMenuId === e.id;
                const productsText = productLabel(e.productIds ?? [], products, productVisible);
                return (
                  <div
                    key={e.id}
                    className={`flex items-center gap-1 border-b border-line-soft last:border-b-0 ${
                      isActive ? 'bg-ink-800' : 'hover:bg-ink-800/60'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveId(e.id)}
                      aria-current={isActive}
                      className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left transition-colors duration-150 ease-out"
                    >
                      <span className="min-w-0 flex-1">
                        <span
                          className={`block truncate text-sm ${isActive ? 'text-strong' : 'text-soft'}`}
                        >
                          {e.name}
                        </span>
                        <span className="block truncate text-2xs text-mute">
                          {e.type || '—'} · {productsText}
                        </span>
                      </span>
                      <span className="font-mono text-2xs text-ink-500">{count}</span>
                    </button>
                    <div
                      ref={menuOpen ? rowMenuRef : undefined}
                      className="relative shrink-0 pr-2"
                    >
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setRowMenuId(menuOpen ? null : e.id);
                        }}
                        aria-label={`Actions for ${e.name}`}
                        aria-expanded={menuOpen}
                        title="Actions"
                        className="rounded p-1 text-mute transition-colors duration-150 ease-out hover:text-strong"
                      >
                        <MoreVerticalIcon className="h-3.5 w-3.5" />
                      </button>
                      {menuOpen && (
                        <div
                          role="menu"
                          className="elev absolute right-0 z-[80] mt-1 min-w-[160px] rounded-lg border border-line-strong bg-ink-800 p-1 shadow-lg"
                        >
                          <button
                            type="button"
                            role="menuitem"
                            className={menuItemClass}
                            onClick={() => {
                              setViewing(e);
                              setRowMenuId(null);
                            }}
                          >
                            <EyeIcon className="h-3.5 w-3.5" />
                            View equipment
                          </button>
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                role="menuitem"
                                className={menuItemClass}
                                onClick={() => {
                                  setActiveId(e.id);
                                  setEditing(e);
                                  setRowMenuId(null);
                                }}
                              >
                                <PencilIcon className="h-3.5 w-3.5" />
                                Edit
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                className={menuItemClass}
                                onClick={() => openAssignFor(e)}
                              >
                                <PlusIcon className="h-3.5 w-3.5" />
                                Assign
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                className={`${menuItemClass} text-danger hover:text-danger`}
                                onClick={() => handleDeleteFor(e.id)}
                              >
                                <Trash2Icon className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </nav>
          </div>

          <section className="flex min-h-0 min-w-0 flex-col">
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-line-strong px-4 py-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-lg font-semibold tracking-tight text-strong">
                    {active.name}
                  </h2>
                  <StatusTag status={active.status ?? null} />
                </div>
                <p className="mt-0.5 truncate text-xs text-mute">
                  <span className="font-mono text-ink-500">{active.id}</span> · {active.vendor} ·{' '}
                  {active.model} · {active.type}
                </p>
              </div>
              {canEdit && (
                <div className="flex shrink-0 flex-nowrap items-center gap-1.5">
                  <select
                    className="rounded-md border border-line-strong bg-ink-800 px-2 py-1.5 text-xs text-soft"
                    value={
                      isAutoManagedStatus(active.status) ? '' : (active.status ?? '')
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      updateEquipment(active.id, {
                        status: v === '' ? null : (v as CapabilityStatus),
                      });
                    }}
                    aria-label="Equipment status flag"
                    title="Status flag"
                  >
                    <option value="">Auto</option>
                    {MANUAL_CAPABILITY_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              <h3 className="text-2xs uppercase tracking-[0.14em] text-ink-500">
                Hardware capabilities · {supported.length}
              </h3>

              {supported.length ? (
                <ul className="mt-3 border-t border-line">
                  {supported.map((c) => (
                    <li key={c.id} className="border-b border-line-soft py-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-mono text-2xs text-ink-500">{c.id}</span>
                        <span className="text-sm font-medium text-strong">{c.name}</span>
                        <span className="ml-auto">
                          <StagePill track="hardware" stage={c.progress} />
                        </span>
                      </div>
                      {c.description ? (
                        <p className="mt-1 max-w-3xl text-xs leading-relaxed text-mute">
                          {c.description}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 border-t border-line pt-4 text-sm text-mute">
                  Nothing assigned yet.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      <Modal
        open={manageTypesOpen}
        onClose={() => setManageTypesOpen(false)}
        width="max-w-lg"
        title="Manage equipment types"
        subtitle="View, add, rename, or remove types used by device models"
        footer={
          <div className="flex flex-wrap gap-2">
            <Button variant="quiet" onClick={() => setManageTypesOpen(false)}>
              Close
            </Button>
            {canEdit && (
              <Button
                variant="primary"
                onClick={() => {
                  setEditingType(null);
                  setAddingType(true);
                }}
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add type
              </Button>
            )}
          </div>
        }
      >
        {sortedTypes.length === 0 ? (
          <p className="text-sm text-mute">No types yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {sortedTypes.map((t) => {
              const count = equipment.filter((e) => e.type === t.name).length;
              return (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-line-soft px-3 py-2"
                >
                  <span className="text-xs font-medium text-strong">{t.name}</span>
                  <span className="font-mono text-2xs text-mute">
                    {count} model{count === 1 ? '' : 's'}
                  </span>
                  {canEdit && (
                    <span className="ml-auto flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingType(t);
                          setAddingType(false);
                        }}
                        className="rounded p-0.5 text-mute hover:text-brand-bright"
                        aria-label={`Edit ${t.name}`}
                        title="Edit"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeEquipmentType(t.id)}
                        className="rounded p-0.5 text-mute hover:text-danger"
                        aria-label={`Delete ${t.name}`}
                        title="Delete"
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Modal>

      <Modal
        open={assigning && !!active}
        onClose={() => setAssigning(false)}
        title="Assign hardware capabilities"
        subtitle={active ? `${active.name} · select everything this model supports` : ''}
        footer={
          <>
            <Button variant="quiet" onClick={() => setAssigning(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save}>
              Save {draft.length} selected
            </Button>
          </>
        }
      >
        <ul className="space-y-1">
          {visibleHardware.map((c) => {
            const checked = draft.includes(c.id);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={checked}
                  onClick={() =>
                    setDraft(checked ? draft.filter((x) => x !== c.id) : [...draft, c.id])
                  }
                  className={`flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left transition-colors duration-150 ease-out ${
                    checked
                      ? 'border-brand/50 bg-brand/5'
                      : 'border-transparent hover:border-line-strong'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked ? 'border-brand bg-brand' : 'border-line-strong'
                    }`}
                    aria-hidden="true"
                  >
                    {checked && <CheckIcon className="h-3 w-3 text-white" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-strong">{c.name}</span>
                    {c.description ? (
                      <span className="mt-0.5 block text-xs leading-relaxed text-mute">
                        {c.description}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Modal>

      <AddEquipmentTypeModal
        open={addingType}
        onClose={() => setAddingType(false)}
      />
      <AddEquipmentTypeModal
        open={!!editingType}
        onClose={() => setEditingType(null)}
        equipmentType={editingType}
      />
      <EquipmentModal
        open={addingEquipment}
        onClose={() => setAddingEquipment(false)}
        onCreated={(id) => setActiveId(id)}
      />
      <EquipmentModal open={!!editing} onClose={() => setEditing(null)} equipment={editing} />

      <DetailsModal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.name ?? ''}
        subtitle={viewing ? `${viewing.id} · equipment model` : undefined}
        rows={
          viewing
            ? [
                {
                  label: 'Equipment ID',
                  value: <span className="font-mono text-xs">{viewing.id}</span>,
                },
                { label: 'Name', value: viewing.name },
                { label: 'Vendor', value: viewing.vendor || '—' },
                { label: 'Model', value: viewing.model || '—' },
                { label: 'Type', value: viewing.type || '—' },
                {
                  label: 'Products',
                  value:
                    (viewing.productIds ?? [])
                      .filter((id) => productVisible(id))
                      .map((id) => products.find((p) => p.id === id)?.name ?? id)
                      .join(', ') || '—',
                },
                {
                  label: 'Status',
                  value: <StatusTag status={viewing.status ?? null} />,
                },
                {
                  label: 'Document',
                  value: viewing.documentUrl ? (
                    <a
                      href={viewing.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-all text-brand hover:underline"
                    >
                      {viewing.documentUrl}
                    </a>
                  ) : (
                    '—'
                  ),
                },
              ]
            : []
        }
      />
    </div>
  );
}
