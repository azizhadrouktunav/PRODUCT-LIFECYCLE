import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { Equipment } from '../types/registry';

export function EquipmentModal({
  open,
  onClose,
  onCreated,
  equipment = null,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: string) => void;
  equipment?: Equipment | null;
}) {
  const { addEquipment, updateEquipment, equipmentTypes } = useRegistry();
  const isEdit = !!equipment;
  const [name, setName] = useState('');
  const [vendor, setVendor] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState('');

  const sortedTypes = useMemo(
    () => [...equipmentTypes].sort((a, b) => a.name.localeCompare(b.name)),
    [equipmentTypes]
  );

  useEffect(() => {
    if (!open) return;
    if (equipment) {
      setName(equipment.name);
      setVendor(equipment.vendor);
      setModel(equipment.model);
      setType(equipment.type || '');
    } else {
      setName('');
      setVendor('');
      setModel('');
      setType(equipmentTypes[0]?.name ?? '');
    }
  }, [open, equipment, equipmentTypes]);

  const hasTypes = sortedTypes.length > 0;
  const valid =
    name.trim().length > 1 &&
    vendor.trim() !== '' &&
    model.trim() !== '' &&
    type.trim() !== '' &&
    hasTypes;

  function submit() {
    if (!valid) return;
    if (equipment) {
      updateEquipment(equipment.id, { name, vendor, model, type });
    } else {
      const created = addEquipment({ name, vendor, model, type });
      onCreated?.(created.id);
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-lg"
      title={isEdit ? 'Edit equipment' : 'Add equipment'}
      subtitle={
        isEdit
          ? `${equipment?.id} · changes apply across the register immediately`
          : 'Register a device model so hardware capabilities can be assigned to it.'
      }
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid}>
            {isEdit ? 'Save changes' : 'Add equipment'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Display name" required hint="how it appears in the register">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Teltonika FMB640"
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Vendor" required>
            <input
              className={inputClass}
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Teltonika"
            />
          </Field>
          <Field label="Model" required>
            <input
              className={inputClass}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="FMB640"
            />
          </Field>
        </div>
        <Field label="Type" required>
          {hasTypes ? (
            <select
              className={inputClass}
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {sortedTypes.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="rounded-md border border-line-strong bg-ink-900 px-3 py-2 text-xs text-mute">
              Create an equipment type first from the Equipment page.
            </p>
          )}
        </Field>
      </div>
    </Modal>
  );
}
