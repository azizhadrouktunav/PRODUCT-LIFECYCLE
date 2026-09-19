import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { EquipmentType } from '../types/registry';

export function AddEquipmentTypeModal({
  open,
  onClose,
  equipmentType = null,
}: {
  open: boolean;
  onClose: () => void;
  equipmentType?: EquipmentType | null;
}) {
  const { addEquipmentType, updateEquipmentType } = useRegistry();
  const [name, setName] = useState('');
  const isEdit = !!equipmentType;

  useEffect(() => {
    if (!open) return;
    setName(equipmentType?.name ?? '');
  }, [open, equipmentType]);

  const valid = name.trim().length > 0;

  function submit() {
    if (!valid) return;
    if (isEdit && equipmentType) {
      const updated = updateEquipmentType(equipmentType.id, name);
      if (updated) onClose();
    } else {
      const created = addEquipmentType(name);
      if (created) onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-md"
      title={isEdit ? 'Edit equipment type' : 'Add equipment type'}
      subtitle={
        isEdit
          ? 'Renaming updates all models that use this type.'
          : 'Types classify device models. Create them before registering equipment.'
      }
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid}>
            {isEdit ? 'Save' : 'Add type'}
          </Button>
        </>
      }
    >
      <Field label="Type name" required>
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. GPS Tracker"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
        />
      </Field>
    </Modal>
  );
}
