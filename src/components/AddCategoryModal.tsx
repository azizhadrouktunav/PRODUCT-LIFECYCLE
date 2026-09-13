import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { DomainCategory } from '../types/registry';

/** Initials from words, uppercase, 2–6 chars. Fallback from letters only. */
function basePrefixFromName(name: string): string {
  const words = name
    .trim()
    .split(/[\s/_-]+/)
    .filter(Boolean);
  let prefix = words
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, '')[0] ?? '')
    .join('')
    .toUpperCase();
  if (prefix.length < 2) {
    prefix = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
  }
  if (prefix.length < 2) prefix = 'CAT';
  return prefix.slice(0, 6);
}

function uniquePrefixAndId(
  name: string,
  categories: DomainCategory[]
): { prefix: string; id: string } {
  const base = basePrefixFromName(name);
  const takenIds = new Set(categories.map((c) => c.id));
  const takenPrefixes = new Set(categories.map((c) => c.prefix.toUpperCase()));

  let prefix = base;
  let n = 2;
  while (takenPrefixes.has(prefix) || takenIds.has(`CAT-${prefix}`)) {
    const suffix = String(n);
    prefix = `${base.slice(0, Math.max(1, 6 - suffix.length))}${suffix}`;
    n += 1;
  }
  return { prefix, id: `CAT-${prefix}` };
}

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

  const [catName, setCatName] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    if (category) {
      setCatName(category.name);
      setCatDescription(category.description);
    } else {
      setCatName('');
      setCatDescription('');
    }
  }, [open, category]);

  const generated = useMemo(() => {
    if (isEdit && category) {
      return { prefix: category.prefix, id: category.id };
    }
    if (catName.trim().length < 2) {
      return { prefix: '', id: '' };
    }
    return uniquePrefixAndId(catName, categories);
  }, [isEdit, category, catName, categories]);

  const valid =
    catName.trim().length > 1 && generated.id !== '' && generated.prefix !== '';

  function submit() {
    setTouched(true);
    if (!valid) return;

    const shortName = catName.trim();

    if (isEdit && category) {
      updateCategory(category.id, {
        name: catName,
        shortName,
        description: catDescription,
      });
      onCreated?.(category.id);
      onClose();
      return;
    }

    const created = addCategory({
      id: generated.id,
      name: catName,
      shortName,
      prefix: generated.prefix,
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
          : 'Categories group domains by product surface. ID and prefix are assigned automatically from the name.'
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
        <Field label="Name" required>
          <input
            className={inputClass}
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="TUNAV ONE Core"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category ID" hint="generated automatically">
            <input
              className={`${inputClass} text-mute`}
              value={generated.id || '—'}
              readOnly
              disabled
            />
          </Field>
          <Field label="Prefix" hint="generated automatically">
            <input
              className={`${inputClass} text-mute`}
              value={generated.prefix || '—'}
              readOnly
              disabled
            />
          </Field>
        </div>
        <Field label="Description">
          <textarea
            className={`${inputClass} min-h-[64px] resize-y`}
            value={catDescription}
            onChange={(e) => setCatDescription(e.target.value)}
            placeholder="What this product surface covers."
          />
        </Field>
        {touched && !valid && (
          <p className="text-xs text-red-400">Give the category a name.</p>
        )}
      </div>
    </Modal>
  );
}
