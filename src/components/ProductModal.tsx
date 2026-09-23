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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(product?.name ?? '');
    setDescription(product?.description ?? '');
    setSaving(false);
    setError(null);
  }, [open, product]);

  const valid = name.trim().length > 1;

  async function submit() {
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    const payload = { name: name.trim(), description: description.trim() };
    try {
      if (product) await updateProduct(product.id, payload);
      else await addProduct(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
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
          <Button variant="quiet" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => void submit()}
            disabled={!valid || saving}
          >
            {saving ? 'Saving…' : isEdit ? 'Save product' : 'Add product'}
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
            disabled={saving}
          />
        </Field>
        <Field label="Description">
          <textarea
            className={`${inputClass} min-h-[84px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this product covers."
            disabled={saving}
          />
        </Field>
        {error && <p className="text-xs text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
