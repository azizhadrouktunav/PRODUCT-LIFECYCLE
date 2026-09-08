import React, { useMemo, useState } from 'react';
import { CheckIcon, PlusIcon } from 'lucide-react';
import { DataTransfer } from '../components/DataTransfer';
import { EquipmentModal } from '../components/EquipmentModal';
import { Modal } from '../components/Modal';
import { Button, PageHeader, StagePill } from '../components/Primitives';
import { useRegistry } from '../contexts/RegistryContext';

export function EquipmentPage() {
  const { equipment, hardwareCapabilities, setEquipmentCapabilities } = useRegistry();
  const [activeId, setActiveId] = useState(equipment[0]?.id ?? '');
  const [assigning, setAssigning] = useState(false);
  const [addingEquipment, setAddingEquipment] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);

  const active = equipment.find((e) => e.id === activeId) ?? equipment[0];
  const supported = useMemo(
    () => hardwareCapabilities.filter((c) => c.equipmentIds.includes(active.id)),
    [hardwareCapabilities, active.id]
  );

  function openAssign() {
    setDraft(supported.map((c) => c.id));
    setAssigning(true);
  }

  function save() {
    setEquipmentCapabilities(active.id, draft);
    setAssigning(false);
  }

  return (
    <div>
      <PageHeader
        title="Equipment"
        count={`${equipment.length} models`}
        description="What each device model can actually do. Hardware capabilities are assigned here, and the assignment is the same record the register reads from."
        action={
        <div className="flex flex-wrap items-center gap-1.5">
            <DataTransfer dataset="equipment" />
            <Button variant="primary" onClick={() => setAddingEquipment(true)}>
              <PlusIcon className="h-3.5 w-3.5" />
              Add equipment
            </Button>
          </div>
        } />
      

      <div className="mt-4 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Equipment models" className="border-t border-line">
          {equipment.map((e) => {
            const isActive = e.id === active.id;
            const count = hardwareCapabilities.filter((c) => c.equipmentIds.includes(e.id)).length;
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => setActiveId(e.id)}
                aria-current={isActive}
                className={`flex w-full items-center gap-3 border-b border-line-soft px-2 py-2.5 text-left transition-colors duration-150 ease-out ${
                isActive ? 'bg-ink-800' : 'hover:bg-ink-800/60'}`
                }>
                
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm ${isActive ? 'text-strong' : 'text-soft'}`}>
                    {e.name}
                  </span>
                  <span className="block truncate text-2xs text-mute">{e.type}</span>
                </span>
                <span className="font-mono text-2xs text-ink-500">{count}</span>
              </button>);

          })}
        </nav>

        <section>
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-strong">{active.name}</h2>
              <p className="mt-1 text-xs text-mute">
                <span className="font-mono text-ink-500">{active.id}</span> · {active.vendor} · {active.model} ·{' '}
                {active.type}
              </p>
            </div>
            <Button variant="primary" onClick={openAssign}>
              <PlusIcon className="h-3.5 w-3.5" />
              Assign capabilities
            </Button>
          </div>

          <h3 className="mt-6 text-2xs uppercase tracking-[0.14em] text-ink-500">
            Hardware capabilities · {supported.length}
          </h3>

          {supported.length ?
          <ul className="mt-3 border-t border-line">
              {supported.map((c) =>
            <li key={c.id} className="border-b border-line-soft py-3">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="font-mono text-2xs text-ink-500">{c.id}</span>
                    <span className="text-sm font-medium text-strong">{c.name}</span>
                    <span className="ml-auto">
                      <StagePill track="hardware" stage={c.progress} />
                    </span>
                  </div>
                  <p className="mt-1 max-w-3xl text-xs leading-relaxed text-mute">{c.description}</p>
                </li>
            )}
            </ul> :

          <p className="mt-3 border-t border-line pt-6 text-sm text-mute">
              Nothing assigned yet. Use{' '}
              <span className="text-soft">Assign capabilities</span> to declare what this device supports.
            </p>
          }
        </section>
      </div>

      <Modal
        open={assigning}
        onClose={() => setAssigning(false)}
        title={`Assign hardware capabilities`}
        subtitle={`${active.name} · select everything this model supports`}
        footer={
        <>
            <Button variant="quiet" onClick={() => setAssigning(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={save}>
              Save {draft.length} selected
            </Button>
          </>
        }>
        
        <ul className="space-y-1">
          {hardwareCapabilities.map((c) => {
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
                  checked ? 'border-brand/50 bg-brand/5' : 'border-transparent hover:border-line-strong'}`
                  }>
                  
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                    checked ? 'border-brand bg-brand' : 'border-line-strong'}`
                    }
                    aria-hidden="true">
                    
                    {checked && <CheckIcon className="h-3 w-3 text-white" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm text-strong">{c.name}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-mute">{c.description}</span>
                  </span>
                </button>
              </li>);

          })}
        </ul>
      </Modal>

      <EquipmentModal
        open={addingEquipment}
        onClose={() => setAddingEquipment(false)}
        onCreated={(id) => setActiveId(id)} />
      
    </div>);

}