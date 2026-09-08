import React, { useEffect, useMemo, useState } from 'react';
import { CheckIcon } from 'lucide-react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { Capability, CapabilityStatus } from '../types/registry';
import { CAPABILITY_STATUSES, TRACKS, stageIndex } from '../types/registry';

interface Props {
  open: boolean;
  onClose: () => void;
  /** When provided the modal edits this capability instead of creating a new one. */
  capability?: Capability | null;
  /** Fired after a brand new capability is registered, so the caller can open its breakdown. */
  onCreated?: (capability: Capability) => void;
}

const EPICS = [
'CORE-1001',
'CORE-1042',
'CORE-1120',
'FIQ-2001',
'FIQ-2215',
'FIQ-2301',
'FIQ-2501',
'CIQ-3001',
'CIQ-3050'];


export function CapabilityFormModal({ open, onClose, capability = null, onCreated }: Props) {
  const { groups, domains, categories, equipment, addCapability, updateCapability } = useRegistry();
  const isEdit = !!capability;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groupId, setGroupId] = useState(groups[0]?.id ?? '');
  const [domainIds, setDomainIds] = useState<string[]>([]);
  const [jiraEpic, setJiraEpic] = useState('');
  const [equipmentIds, setEquipmentIds] = useState<string[]>([]);
  const [progress, setProgress] = useState<string>('Identified');
  const [status, setStatus] = useState<CapabilityStatus | ''>('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    if (capability) {
      setName(capability.name);
      setDescription(capability.description);
      setGroupId(capability.groupId);
      setDomainIds(capability.domainIds);
      setJiraEpic(capability.jiraEpic);
      setEquipmentIds(capability.equipmentIds);
      setProgress(capability.progress);
      setStatus(capability.status ?? '');
    } else {
      setName('');
      setDescription('');
      setGroupId(groups[0]?.id ?? '');
      setDomainIds([]);
      setJiraEpic('');
      setEquipmentIds([]);
      setProgress('Identified');
      setStatus('');
    }
  }, [open, capability, groups]);

  const track = groups.find((g) => g.id === groupId)?.track ?? 'delivery';
  const isHardware = track === 'hardware';
  const valid = name.trim().length > 1 && domainIds.length > 0 && groupId !== '';

  // Each lifecycle has its own stages — moving group resets an invalid one.
  useEffect(() => {
    if (stageIndex(track, progress) < 0) setProgress(TRACKS[track].stages[0].name);
  }, [track, progress]);

  const domainsByCategory = useMemo(
    () => categories.map((cat) => ({ cat, items: domains.filter((d) => d.categoryId === cat.id) })),
    [categories, domains]
  );

  function submit() {
    setTouched(true);
    if (!valid) return;
    if (capability) {
      updateCapability(capability.id, {
        name: name.trim(),
        description: description.trim(),
        groupId,
        domainIds,
        jiraEpic: jiraEpic.trim(),
        equipmentIds: isHardware ? equipmentIds : [],
        progress,
        status: status === '' ? null : status
      });
    } else {
      const created = addCapability({ name, description, groupId, domainIds, jiraEpic, equipmentIds });
      onCreated?.(created);
    }
    onClose();
  }

  function toggle(list: string[], id: string, set: (v: string[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit capability' : 'Register a capability'}
      subtitle={
      isEdit ?
      `${capability?.id} · changes apply across the register immediately` :
      'An ID is assigned automatically. Next you will break it into epics, features and user stories.'
      }
      footer={
      <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid && touched}>
            {isEdit ? 'Save changes' : 'Add capability'}
          </Button>
        </>
      }>
      
      <div className="space-y-5">
        <Field label="Capability name" required>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Tire Pressure Anomaly Detection" />
          
        </Field>

        <Field label="Description">
          <textarea
            className={`${inputClass} min-h-[84px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What the capability does, and where its boundary sits." />
          
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Capability group" required>
            <select className={inputClass} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              {groups.map((g) =>
              <option key={g.id} value={g.id}>
                  {g.name} — {TRACKS[g.track].label}
                </option>
              )}
            </select>
          </Field>
          <Field label="Proposed Jira epic" hint="optional">
            <input
              className={inputClass}
              value={jiraEpic}
              onChange={(e) => setJiraEpic(e.target.value)}
              placeholder="CORE-1234"
              list="epic-options" />
            
            <datalist id="epic-options">
              {EPICS.map((e) =>
              <option key={e} value={e} />
              )}
            </datalist>
          </Field>
        </div>

        {isEdit &&
        <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Progress">
              <select
              className={inputClass}
              value={progress}
              onChange={(e) => setProgress(e.target.value)}>
              
                {TRACKS[track].stages.map((s, i) =>
              <option key={s.name} value={s.name}>
                    {i + 1}. {s.name}
                  </option>
              )}
              </select>
            </Field>
            <Field label="Status flag" hint="optional">
              <select
              className={inputClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as CapabilityStatus | '')}>
              
                <option value="">No flag</option>
                {CAPABILITY_STATUSES.map((s) =>
              <option key={s} value={s}>
                    {s}
                  </option>
              )}
              </select>
            </Field>
          </div>
        }

        <div>
          <span className="mb-1.5 flex items-baseline gap-2 text-xs font-medium text-soft">
            Affected domains <span className="text-brand-bright">*</span>
            <span className="font-normal text-mute">
              {domainIds.length > 0 ? `${domainIds.length} selected` : 'select one or more'}
            </span>
          </span>
          <div className="scroll-thin max-h-64 space-y-4 overflow-y-auto rounded-md border border-line-strong bg-ink-900 p-3">
            {domainsByCategory.map(({ cat, items }) =>
            <div key={cat.id}>
                <p className="mb-1.5 text-2xs uppercase tracking-[0.14em] text-ink-500">{cat.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((d) => {
                  const active = domainIds.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => toggle(domainIds, d.id, setDomainIds)}
                      title={d.description}
                      aria-pressed={active}
                      className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-2xs transition-colors duration-150 ease-out ${
                      active ?
                      'border-brand bg-brand/10 text-strong' :
                      'border-line-strong text-mute hover:text-strong'}`
                      }>
                      
                        <span className="font-mono">{d.id}</span>
                        <span className="text-soft">{d.name}</span>
                        {active && <CheckIcon className="h-3 w-3 text-brand-bright" />}
                      </button>);

                })}
                </div>
              </div>
            )}
          </div>
        </div>

        {isHardware &&
        <div>
            <span className="mb-1.5 flex items-baseline gap-2 text-xs font-medium text-soft">
              Equipment compatibility
              <span className="font-normal text-mute">required for hardware capabilities</span>
            </span>
            <div className="grid gap-1.5 rounded-md border border-line-strong bg-ink-900 p-3 sm:grid-cols-2">
              {equipment.map((eq) => {
              const active = equipmentIds.includes(eq.id);
              return (
                <button
                  key={eq.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggle(equipmentIds, eq.id, setEquipmentIds)}
                  className={`flex items-center justify-between gap-3 rounded border px-2.5 py-2 text-left transition-colors duration-150 ease-out ${
                  active ? 'border-aqua/50 bg-aqua/5' : 'border-transparent hover:border-line-strong'}`
                  }>
                  
                    <span className="min-w-0">
                      <span className="block truncate text-xs text-strong">{eq.name}</span>
                      <span className="block truncate text-2xs text-mute">{eq.type}</span>
                    </span>
                    {active && <CheckIcon className="h-3.5 w-3.5 shrink-0 text-aqua" />}
                  </button>);

            })}
            </div>
          </div>
        }

        {touched && !valid &&
        <p className="text-xs text-danger">Give the capability a name and at least one affected domain.</p>
        }
      </div>
    </Modal>);

}