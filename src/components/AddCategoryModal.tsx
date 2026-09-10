import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { DomainCategory } from '../types/registry';

export function AddCategoryModal({
  open,
  onClose,
  onCreated,
  category = null,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (categoryId: string) => void;
  category?: DomainCategory | null;
}) {
  const { categories, addCategory, updateCategory } = useRegistry();
  const isEdit = !!category;

  const [catId, setCatId] = useState('');
  const [catName, setCatName] = useState('');
  const [catShortName, setCatShortName] = useState('');
  const [catPrefix, setCatPrefix] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    if (category) {
      setCatId(category.id);
      setCatName(category.name);
      setCatShortName(category.shortName);
      setCatPrefix(category.prefix);
      setCatDescription(category.description);
    } else {
      setCatId('');
      setCatName('');
      setCatShortName('');
      setCatPrefix('');
      setCatDescription('');
    }
  }, [open, category]);

  const categoryIdTaken =
    !isEdit && categories.some((c) => c.id === catId.trim());

  const valid =
    catId.trim() !== '' &&
    catName.trim().length > 1 &&
    catShortName.trim() !== '' &&
    catPrefix.trim() !== '' &&
    !categoryIdTaken;

  function submit() {
    setTouched(true);
    if (!valid) return;

    if (isEdit && category) {
      updateCategory(category.id, {
        name: catName,
        shortName: catShortName,
        prefix: catPrefix,
        description: catDescription,
      });
      onCreated?.(category.id);
      onClose();
      return;
    }

    const created = addCategory({
      id: catId,
      name: catName,
      shortName: catShortName,
      prefix: catPrefix,
      description: catDescription,
    });
    onCreated?.(created.id);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-xl"
      title={isEdit ? 'Edit category' : 'Add category'}
      subtitle={
        isEdit
          ? `${category?.id} · changes apply across the register immediately`
          : 'Categories group domains by product surface. Create one before adding domains.'
      }
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid}>
            {isEdit ? 'Save changes' : 'Add category'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category ID" required hint="e.g. CAT-CORE">
            <input
              className={inputClass}
              value={catId}
              onChange={(e) => setCatId(e.target.value)}
              placeholder="CAT-CORE"
              disabled={isEdit}
            />
          </Field>
          <Field label="Prefix" required hint="used in domain IDs">
            <input
              className={inputClass}
              value={catPrefix}
              onChange={(e) => setCatPrefix(e.target.value)}
              placeholder="CORE"
            />
          </Field>
        </div>
        <Field label="Name" required>
          <input
            className={inputClass}
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="TUNAV ONE Core"
          />
        </Field>
        <Field label="Short name" required>
          <input
            className={inputClass}
            value={catShortName}
            onChange={(e) => setCatShortName(e.target.value)}
            placeholder="TunavOne Core"
          />
        </Field>
        <Field label="Description">
          <textarea
            className={`${inputClass} min-h-[64px] resize-y`}
            value={catDescription}
            onChange={(e) => setCatDescription(e.target.value)}
            placeholder="What this product surface covers."
          />
        </Field>
        {touched && categoryIdTaken && (
          <p className="text-xs text-red-400">A category with this ID already exists.</p>
        )}
      </div>
    </Modal>
  );
}
