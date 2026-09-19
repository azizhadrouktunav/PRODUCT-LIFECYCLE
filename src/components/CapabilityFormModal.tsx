import { useEffect, useMemo, useState } from 'react';
import { CheckIcon } from 'lucide-react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { ProductMultiSelect } from './ProductMultiSelect';
import { useAuth } from '../contexts/AuthContext';
import { useRegistry } from '../contexts/RegistryContext';
import type { Capability } from '../types/registry';
import { usesEquipment } from '../types/registry';
import { sharesProducts } from '../lib/rbac';

interface Props {
  open: boolean;
  onClose: () => void;
  /** When provided the modal edits this capability instead of creating a new one. */
  capability?: Capability | null;
  /** Fired after a brand new capability is registered, so the caller can open its breakdown. */
  onCreated?: (capability: Capability) => void;
}

export function CapabilityFormModal({ open, onClose, capability = null, onCreated }: Props) {
  const { groups, equipment, addCapability, updateCapability, getLifecycle } = useRegistry();
  const { entityVisible } = useAuth();
  const isEdit = !!capability;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [groupId, setGroupId] = useState('');
  const [productIds, setProductIds] = useState<string[]>([]);
  const [equipmentIds, setEquipmentIds] = useState<string[]>([]);
  const [touched, setTouched] = useState(false);

  const eligibleGroups = useMemo(() => {
    const visible = groups.filter((g) => entityVisible(g.productIds));
    if (productIds.length === 0) return visible;
    return visible.filter((g) => sharesProducts(g.productIds, productIds));
  }, [groups, entityVisible, productIds]);

  const eligibleEquipment = useMemo(() => {
    const visible = equipment.filter((e) => entityVisible(e.productIds));
    if (productIds.length === 0) return visible;
    return visible.filter((e) => sharesProducts(e.productIds, productIds));
  }, [equipment, entityVisible, productIds]);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    if (capability) {
      setName(capability.name);
      setDescription(capability.description);
      setGroupId(capability.groupId);
      setProductIds(capability.productIds ?? []);
      setEquipmentIds(capability.equipmentIds);
    } else {
      setName('');
      setDescription('');
      setGroupId('');
      setProductIds([]);
      setEquipmentIds([]);
    }
  }, [open, capability]);

  useEffect(() => {
    if (!open) return;
    if (groupId && eligibleGroups.some((g) => g.id === groupId)) return;
    setGroupId(eligibleGroups[0]?.id ?? '');
  }, [open, groupId, eligibleGroups]);

  const trackId = groups.find((g) => g.id === groupId)?.track ?? '';
  const lifecycle = getLifecycle(trackId);
  const isHardware = usesEquipment(lifecycle);
  const valid = name.trim().length > 1 && productIds.length > 0 && groupId !== '';

  function toggleEquip(id: string) {
    setEquipmentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function submit() {
    setTouched(true);
    if (!valid) return;
    if (capability) {
      updateCapability(capability.id, {
        name: name.trim(),
        description: description.trim(),
        groupId,
        productIds,
        jiraEpic: capability.jiraEpic,
        equipmentIds: isHardware ? equipmentIds : [],
      });
    } else {
      const created = addCapability({
        name: name.trim(),
        description: description.trim(),
        groupId,
        productIds,
        jiraEpic: '',
        equipmentIds: isHardware ? equipmentIds : [],
      });
      onCreated?.(created);
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit capability' : 'Register a capability'}
      subtitle={
        isEdit
          ? `${capability?.id} · progress and status follow the lifecycle automatically`
          : 'An ID is assigned automatically. Next you will break it into epics, features and user stories.'
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
      }
    >
      <div className="space-y-5">
        <Field label="Capability name" required>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Tire Pressure Anomaly Detection"
          />
        </Field>

        <Field label="Description">
          <textarea
            className={`${inputClass} min-h-[84px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What the capability does, and where its boundary sits."
          />
        </Field>

        <ProductMultiSelect productIds={productIds} onChange={setProductIds} />

        <Field label="Capability group" required>
          {eligibleGroups.length === 0 ? (
            <p className="rounded-md border border-line-strong bg-ink-900 p-3 text-xs text-mute">
              {productIds.length === 0
                ? 'Select products first, then pick a group that shares them.'
                : 'No group shares these products. Create one on Capability Groups.'}
            </p>
          ) : (
            <select
              className={inputClass}
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
            >
              {eligibleGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} — {getLifecycle(g.track).label}
                </option>
              ))}
            </select>
          )}
        </Field>

        {isHardware && (
          <div>
            <span className="mb-1.5 flex items-baseline gap-2 text-xs font-medium text-soft">
              Equipment compatibility
              <span className="font-normal text-mute">required for hardware capabilities</span>
            </span>
            {eligibleEquipment.length === 0 ? (
              <p className="rounded-md border border-line-strong bg-ink-900 p-3 text-xs text-mute">
                No equipment shares these products yet.
              </p>
            ) : (
              <div className="grid gap-1.5 rounded-md border border-line-strong bg-ink-900 p-3 sm:grid-cols-2">
                {eligibleEquipment.map((eq) => {
                  const active = equipmentIds.includes(eq.id);
                  return (
                    <button
                      key={eq.id}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleEquip(eq.id)}
                      className={`flex items-center justify-between gap-3 rounded border px-2.5 py-2 text-left transition-colors duration-150 ease-out ${
                        active
                          ? 'border-aqua/50 bg-aqua/5'
                          : 'border-transparent hover:border-line-strong'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-xs text-strong">{eq.name}</span>
                        <span className="block truncate text-2xs text-mute">{eq.type}</span>
                      </span>
                      {active && <CheckIcon className="h-3.5 w-3.5 shrink-0 text-aqua" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {touched && !valid && (
          <p className="text-xs text-danger">
            Give the capability a name, at least one product, and a matching group.
          </p>
        )}
      </div>
    </Modal>
  );
}
