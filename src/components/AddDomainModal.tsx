import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { Domain } from '../types/registry';

export function AddDomainModal({
  open,
  onClose,
  onCreated,
  defaultCategoryId = '',
  domain = null,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (categoryId: string, domainId: string) => void;
  defaultCategoryId?: string;
  domain?: Domain | null;
}) {
  const { categories, domains, addDomain, updateDomain } = useRegistry();
  const isEdit = !!domain;

  const [categoryId, setCategoryId] = useState('');
  const [domainId, setDomainId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    if (domain) {
      setCategoryId(domain.categoryId);
      setDomainId(domain.id);
      setName(domain.name);
      setDescription(domain.description);
      return;
    }
    const initial =
      defaultCategoryId && categories.some((c) => c.id === defaultCategoryId)
        ? defaultCategoryId
        : categories[0]?.id ?? '';
    setCategoryId(initial);
    setDomainId('');
    setName('');
    setDescription('');
  }, [open, categories, defaultCategoryId, domain]);

  const hasCategories = categories.length > 0;
  const domainIdTaken = !isEdit && domains.some((d) => d.id === domainId.trim());

  const valid = isEdit
    ? name.trim().length > 1 && categoryId !== ''
    : hasCategories &&
      domainId.trim() !== '' &&
      !domainIdTaken &&
      name.trim().length > 1 &&
      categoryId !== '';

  function submit() {
    setTouched(true);
    if (!valid) return;

    if (isEdit && domain) {
      updateDomain(domain.id, {
        name,
        description,
        categoryId,
      });
      onCreated?.(categoryId, domain.id);
      onClose();
      return;
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
      title={isEdit ? 'Edit domain' : 'Add domain'}
      subtitle={
        isEdit
          ? `${domain?.id} · changes apply across the register immediately`
          : 'Domains sit under a category. Create a category first if none exist.'
      }
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid}>
            {isEdit ? 'Save changes' : 'Add domain'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Category" required>
          {hasCategories ? (
            <select
              className={inputClass}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id})
                </option>
              ))}
            </select>
          ) : (
            <p className="rounded-md border border-line-strong bg-ink-900 px-3 py-2 text-xs text-mute">
              Create a category first from the Domains page.
            </p>
          )}
        </Field>

        <Field label="Domain ID" required hint="e.g. CORE-D01">
          <input
            className={inputClass}
            value={domainId}
            onChange={(e) => setDomainId(e.target.value)}
            placeholder="CORE-D01"
            disabled={isEdit}
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
    </Modal>
  );
}
