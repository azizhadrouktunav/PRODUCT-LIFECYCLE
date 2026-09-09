import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { useRegistry } from '../contexts/RegistryContext';

const NEW_CATEGORY = '__new__';

export function AddDomainModal({
  open,
  onClose,
  onCreated,
  defaultCategoryId = '',
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (categoryId: string, domainId: string) => void;
  defaultCategoryId?: string;
}) {
  const { categories, domains, addCategory, addDomain } = useRegistry();

  const [categoryChoice, setCategoryChoice] = useState(NEW_CATEGORY);
  const [catId, setCatId] = useState('');
  const [catName, setCatName] = useState('');
  const [catShortName, setCatShortName] = useState('');
  const [catPrefix, setCatPrefix] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [domainId, setDomainId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    const initial =
      defaultCategoryId && categories.some((c) => c.id === defaultCategoryId)
        ? defaultCategoryId
        : categories[0]?.id ?? NEW_CATEGORY;
    setCategoryChoice(initial);
    setCatId('');
    setCatName('');
    setCatShortName('');
    setCatPrefix('');
    setCatDescription('');
    setDomainId('');
    setName('');
    setDescription('');
  }, [open, categories, defaultCategoryId]);

  const creatingCategory = categoryChoice === NEW_CATEGORY;
  const categoryId = creatingCategory ? catId.trim() : categoryChoice;

  const categoryValid =
    !creatingCategory ||
    (catId.trim() !== '' &&
      catName.trim().length > 1 &&
      catShortName.trim() !== '' &&
      catPrefix.trim() !== '');

  const domainIdTaken = domains.some((d) => d.id === domainId.trim());
  const categoryIdTaken =
    creatingCategory && categories.some((c) => c.id === catId.trim());

  const valid =
    categoryValid &&
    !categoryIdTaken &&
    domainId.trim() !== '' &&
    !domainIdTaken &&
    name.trim().length > 1 &&
    categoryId !== '';

  function submit() {
    setTouched(true);
    if (!valid) return;

    if (creatingCategory) {
      addCategory({
        id: catId,
        name: catName,
        shortName: catShortName,
        prefix: catPrefix,
        description: catDescription,
      });
    }

    const created = addDomain({
      id: domainId,
      name,
      description,
      categoryId,
    });
    onCreated?.(categoryId, created.id);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-xl"
      title="Add domain"
      subtitle="Domains sit under a category. Create a category first if the register is empty."
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid}>
            Add domain
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Category" required>
          <select
            className={inputClass}
            value={categoryChoice}
            onChange={(e) => setCategoryChoice(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.id})
              </option>
            ))}
            <option value={NEW_CATEGORY}>Create new category…</option>
          </select>
        </Field>

        {creatingCategory && (
          <div className="space-y-4 rounded-md border border-line-strong p-3">
            <p className="text-2xs uppercase tracking-[0.14em] text-ink-500">New category</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category ID" required hint="e.g. CAT-CORE">
                <input
                  className={inputClass}
                  value={catId}
                  onChange={(e) => setCatId(e.target.value)}
                  placeholder="CAT-CORE"
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
        )}

        <div className="space-y-4 border-t border-line pt-4">
          <p className="text-2xs uppercase tracking-[0.14em] text-ink-500">Domain</p>
          <Field label="Domain ID" required hint="e.g. CORE-D01">
            <input
              className={inputClass}
              value={domainId}
              onChange={(e) => setDomainId(e.target.value)}
              placeholder="CORE-D01"
            />
          </Field>
          <Field label="Name" required>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Foundation"
            />
          </Field>
          <Field label="Description">
            <textarea
              className={`${inputClass} min-h-[72px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this domain owns in the register."
            />
          </Field>
          {touched && domainIdTaken && (
            <p className="text-xs text-red-400">A domain with this ID already exists.</p>
          )}
        </div>
      </div>
    </Modal>
  );
}
