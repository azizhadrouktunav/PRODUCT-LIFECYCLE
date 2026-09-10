import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { useRegistry } from '../contexts/RegistryContext';

export function AddEquipmentTypeModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { addEquipmentType } = useRegistry();
  const [name, setName] = useState('');

  useEffect(() => {
    if (!open) return;
    setName('');
  }, [open]);

  const valid = name.trim().length > 0;

  function submit() {
    if (!valid) return;
    const created = addEquipmentType(name);
    if (created) onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-md"
      title="Add equipment type"
      subtitle="Types classify device models. Create them before registering equipment."
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid}>
            Add type
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
