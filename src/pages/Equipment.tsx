import { useEffect, useMemo, useState } from 'react';
import { CheckIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { AddEquipmentTypeModal } from '../components/AddEquipmentTypeModal';
import { DataTransfer } from '../components/DataTransfer';
import { EquipmentModal } from '../components/EquipmentModal';
import { Modal } from '../components/Modal';
import { Button, PageHeader, StagePill } from '../components/Primitives';
import { useAuth } from '../contexts/AuthContext';
import { useRegistry } from '../contexts/RegistryContext';
import type { Equipment } from '../types/registry';

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
  // Capabilities assigned to equipment stay product-scoped.
  const visibleHardware = useMemo(
    () => hardwareCapabilities.filter(capabilityVisible),
    [hardwareCapabilities, capabilityVisible]
  );
  const [activeId, setActiveId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [addingEquipment, setAddingEquipment] = useState(false);
  const [addingType, setAddingType] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [draft, setDraft] = useState<string[]>([]);

  useEffect(() => {
    if (visibleEquipment.length === 0) {
      setActiveId('');
      return;
    }
    if (!visibleEquipment.some((e) => e.id === activeId)) {
      setActiveId(visibleEquipment[0].id);
    }
  }, [visibleEquipment, activeId]);

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
    // setEquipmentCapabilities unassigns everything absent from the list, so carry
    // over capabilities outside this user's products rather than dropping them.
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
        description="What each device model can actually do. Hardware capabilities are assigned here, and the assignment is the same record the register reads from."
        action={
          canEdit ? (
            <div className="flex flex-nowrap items-center gap-1.5">
              <DataTransfer dataset="equipment" />
            </div>
          ) : undefined
        }
      />

      <section className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-2xs uppercase tracking-[0.14em] text-ink-500">
            Equipment types · {sortedTypes.length}
          </h2>
          {canEdit && (
            <Button variant="quiet" onClick={() => setAddingType(true)}>
              <PlusIcon className="h-3.5 w-3.5" />
              Add type
            </Button>
          )}
        </div>
        {sortedTypes.length === 0 ? (
          <p className="mt-3 text-sm text-mute">
            No types yet. Use <span className="text-soft">Add type</span> before registering
            equipment models.
          </p>
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
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-line-strong px-4 py-4">
          <p className="text-sm text-mute">
            No equipment models yet. Add a model or import an Equipment sheet to get started.
          </p>
          {canEdit && (
            <Button variant="primary" onClick={() => setAddingEquipment(true)}>
              <PlusIcon className="h-3.5 w-3.5" />
              Add equipment
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-md border border-line-strong lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
          <div className="border-b border-line-strong lg:border-b-0 lg:border-r lg:border-line-strong">
            <div className="flex h-12 items-center justify-between gap-2 border-b border-line-strong px-3">
              <h2 className="text-2xs uppercase tracking-[0.14em] text-ink-500">
                Models · {visibleEquipment.length}
              </h2>
              {canEdit && (
                <Button variant="primary" onClick={() => setAddingEquipment(true)}>
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add equipment
                </Button>
              )}
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
                  <Button variant="quiet" onClick={() => setEditing(active)}>
                    <PencilIcon className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button variant="quiet" onClick={handleDelete}>
                    <Trash2Icon className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                  <Button variant="primary" onClick={openAssign}>
                    <PlusIcon className="h-3.5 w-3.5" />
                    Assign capabilities
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
                      <p className="mt-1 max-w-3xl text-xs leading-relaxed text-mute">
                        {c.description}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 border-t border-line pt-4 text-sm text-mute">
                  Nothing assigned yet. Use{' '}
                  <span className="text-soft">Assign capabilities</span> to declare what this device
                  supports.
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
                    <span className="mt-0.5 block text-xs leading-relaxed text-mute">
                      {c.description}
                    </span>
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
