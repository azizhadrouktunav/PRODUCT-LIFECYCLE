import { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { Product } from '../types/registry';

export function ProductModal({
  open,
  onClose,
  product = null,
}: {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
}) {
  const { addProduct, updateProduct } = useRegistry();
  const isEdit = !!product;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? '');
    setDescription(product?.description ?? '');
  }, [open, product]);

  const valid = name.trim().length > 1;

  function submit() {
    if (!valid) return;
    const payload = { name: name.trim(), description: description.trim() };
    if (product) updateProduct(product.id, payload);
    else addProduct(payload);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-lg"
      title={isEdit ? 'Edit product' : 'Add product'}
      subtitle="Products are assigned to capabilities and actors."
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid}>
            {isEdit ? 'Save product' : 'Add product'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Name" required>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. FleetIQ"
            autoFocus
          />
        </Field>
        <Field label="Description">
          <textarea
            className={`${inputClass} min-h-[84px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this product covers."
          />
        </Field>
      </div>
    </Modal>
  );
}
