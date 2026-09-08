import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { useRegistry } from '../contexts/RegistryContext';

const TYPES = [
'GPS Tracker',
'MDVR / Video',
'AI Dashcam',
'Fuel Sensor',
'Tire Sensor',
'CAN Reader',
'OEM Gateway',
'Temperature Sensor'];


export function EquipmentModal({
  open,
  onClose,
  onCreated




}: {open: boolean;onClose: () => void;onCreated?: (id: string) => void;}) {
  const { addEquipment } = useRegistry();
  const [name, setName] = useState('');
  const [vendor, setVendor] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState(TYPES[0]);

  useEffect(() => {
    if (!open) return;
    setName('');
    setVendor('');
    setModel('');
    setType(TYPES[0]);
  }, [open]);

  const valid = name.trim().length > 1 && vendor.trim() !== '' && model.trim() !== '';

  function submit() {
    if (!valid) return;
    const created = addEquipment({ name, vendor, model, type });
    onCreated?.(created.id);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-lg"
      title="Add equipment"
      subtitle="Register a device model so hardware capabilities can be assigned to it."
      footer={
      <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid}>
            Add equipment
          </Button>
        </>
      }>
      
      <div className="space-y-5">
        <Field label="Display name" required hint="how it appears in the register">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Teltonika FMB640" />
          
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Vendor" required>
            <input
              className={inputClass}
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Teltonika" />
            
          </Field>
          <Field label="Model" required>
            <input
              className={inputClass}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="FMB640" />
            
          </Field>
        </div>
        <Field label="Type">
          <select className={inputClass} value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) =>
            <option key={t} value={t}>
                {t}
              </option>
            )}
          </select>
        </Field>
      </div>
    </Modal>);

}