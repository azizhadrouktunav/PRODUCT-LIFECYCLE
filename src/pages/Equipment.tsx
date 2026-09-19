import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckIcon,
  ChevronDownIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import { AddEquipmentTypeModal } from '../components/AddEquipmentTypeModal';
import { DataTransfer } from '../components/DataTransfer';
import { EquipmentModal } from '../components/EquipmentModal';
import { Modal } from '../components/Modal';
import { Button, PageHeader, StagePill } from '../components/Primitives';
import { useAuth } from '../contexts/AuthContext';
import { useRegistry } from '../contexts/RegistryContext';
import type { Equipment } from '../types/registry';

const menuItemClass =
  'flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs font-medium text-strong transition-colors duration-150 ease-out hover:bg-ink-700';

export function EquipmentPage() {
  const {
    equipment,
    equipmentTypes,
    hardwareCapabilities,
    setEquipmentCapabilities,
    removeEquipment,
    removeEquipmentType,
  } = useRegistry();
  const { can, capabilityVisible, entityVisible } = useAuth();
  const canEdit = can('manage_equipment');
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
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [draft, setDraft] = useState<string[]>([]);
  const addMenuRef = useRef<HTMLDivElement>(null);

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
    if (!addMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (addMenuRef.current?.contains(e.target as Node)) return;
      setAddMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAddMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [addMenuOpen]);

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

  function openAssign() {
    if (!active) return;
    setDraft(supported.map((c) => c.id));
    setAssigning(true);
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

  function handleDelete() {
    if (!active) return;
    removeEquipment(active.id);
  }

  return (
    <div>
      <PageHeader
        title="Equipment"
        count={`${visibleEquipment.length} models`}
        action={
          canEdit ? (
            <div className="flex flex-nowrap items-center gap-1.5">
              <DataTransfer dataset="equipment" />
              <div ref={addMenuRef} className="relative">
                <Button variant="primary" onClick={() => setAddMenuOpen((v) => !v)}>
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add
                  <ChevronDownIcon className="h-3.5 w-3.5" />
                </Button>
                {addMenuOpen && (
                  <div
                    role="menu"
                    className="elev absolute right-0 z-[80] mt-1.5 min-w-[160px] rounded-lg border border-line-strong bg-ink-800 p-1 shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      className={menuItemClass}
                      onClick={() => {
                        setAddMenuOpen(false);
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
                        setAddMenuOpen(false);
                        setAddingEquipment(true);
                      }}
                    >
                      Add equipment
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : undefined
        }
      />

      <section className="mt-5">
        <h2 className="text-2xs uppercase tracking-[0.14em] text-ink-500">
          Equipment types · {sortedTypes.length}
        </h2>
        {sortedTypes.length === 0 ? (
          <p className="mt-3 text-sm text-mute">No types yet.</p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {sortedTypes.map((t) => {
              const count = visibleEquipment.filter((e) => e.type === t.name).length;
              return (
                <li
                  key={t.id}
                  className="inline-flex items-center gap-2 rounded border border-line-strong px-2.5 py-1.5"
                >
                  <span className="text-xs text-strong">{t.name}</span>
                  <span className="font-mono text-2xs text-ink-500">{count}</span>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => removeEquipmentType(t.id)}
                      aria-label={`Delete type ${t.name}`}
                      title="Delete type"
                      className="rounded p-0.5 text-mute transition-colors duration-150 ease-out hover:text-danger"
                    >
                      <Trash2Icon className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {visibleEquipment.length === 0 || !active ? (
        <div className="mt-6 rounded-md border border-line-strong px-4 py-4">
          <p className="text-sm text-mute">No models yet.</p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-md border border-line-strong lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="border-b border-line-strong lg:border-b-0 lg:border-r lg:border-line-strong">
            <div className="flex h-12 items-center border-b border-line-strong px-3">
              <h2 className="text-2xs uppercase tracking-[0.14em] text-ink-500">
                Models · {visibleEquipment.length}
              </h2>
            </div>
            <nav aria-label="Equipment models">
              {visibleEquipment.map((e) => {
                const isActive = e.id === active.id;
                const count = visibleHardware.filter((c) =>
                  c.equipmentIds.includes(e.id)
                ).length;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setActiveId(e.id)}
                    aria-current={isActive}
                    className={`flex w-full items-center gap-3 border-b border-line-soft px-3 py-2.5 text-left transition-colors duration-150 ease-out last:border-b-0 ${
                      isActive ? 'bg-ink-800' : 'hover:bg-ink-800/60'
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-sm ${isActive ? 'text-strong' : 'text-soft'}`}
                      >
                        {e.name}
                      </span>
                      <span className="block truncate text-2xs text-mute">{e.type}</span>
                    </span>
                    <span className="font-mono text-2xs text-ink-500">{count}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <section className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-strong px-4 py-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold tracking-tight text-strong">
                  {active.name}
                </h2>
                <p className="mt-0.5 truncate text-xs text-mute">
                  <span className="font-mono text-ink-500">{active.id}</span> · {active.vendor} ·{' '}
                  {active.model} · {active.type}
                </p>
              </div>
              {canEdit && (
                <div className="flex shrink-0 flex-nowrap items-center gap-1.5">
                  <Button
                    variant="quiet"
                    onClick={() => setEditing(active)}
                    className="!px-2"
                    title="Edit"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="quiet"
                    onClick={handleDelete}
                    className="!px-2"
                    title="Delete"
                  >
                    <Trash2Icon className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="primary" onClick={openAssign}>
                    <PlusIcon className="h-3.5 w-3.5" />
                    Assign
                  </Button>
                </div>
              )}
            </div>

            <div className="px-4 py-4">
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

      <AddEquipmentTypeModal open={addingType} onClose={() => setAddingType(false)} />
      <EquipmentModal
        open={addingEquipment}
        onClose={() => setAddingEquipment(false)}
        onCreated={(id) => setActiveId(id)}
      />
      <EquipmentModal open={!!editing} onClose={() => setEditing(null)} equipment={editing} />
    </div>
  );
}
