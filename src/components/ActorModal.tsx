import { useEffect, useState } from 'react';
import { CheckIcon } from 'lucide-react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { Actor } from '../types/registry';

function toggle(list: string[], id: string, set: (next: string[]) => void) {
  set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
}

export function ActorModal({
  open,
  onClose,
  actor = null,
}: {
  open: boolean;
  onClose: () => void;
  actor?: Actor | null;
}) {
  const { categories, addActor, updateActor } = useRegistry();
  const isEdit = !!actor;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setName(actor?.name ?? '');
    setDescription(actor?.description ?? '');
    setCategoryIds(actor?.categoryIds ?? []);
  }, [open, actor]);

  const valid = name.trim().length > 1 && categoryIds.length > 0;

  function submit() {
    if (!valid) return;
    const payload = {
      name: name.trim(),
      description: description.trim(),
      categoryIds,
    };
    if (actor) updateActor(actor.id, payload);
    else addActor(payload);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-xl"
      title={isEdit ? 'Edit actor' : 'Add actor'}
      subtitle="Actors are the personas used in user-story statements. Assign one or more domain categories."
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid}>
            {isEdit ? 'Save actor' : 'Add actor'}
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
            placeholder="e.g. Fleet manager"
            autoFocus
          />
        </Field>
        <Field label="Description">
          <textarea
            className={`${inputClass} min-h-[84px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Who this actor is and what they care about."
          />
        </Field>

        <div>
          <span className="mb-1.5 flex items-baseline gap-2 text-xs font-medium text-soft">
            Domain categories <span className="text-brand-bright">*</span>
            <span className="font-normal text-mute">
              {categoryIds.length > 0 ? `${categoryIds.length} selected` : 'select one or more'}
            </span>
          </span>
          {categories.length === 0 ? (
            <p className="rounded-md border border-line-strong bg-ink-900 p-3 text-xs text-mute">
              No domain categories yet. Add categories under Domains first, then assign them to
              actors.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5 rounded-md border border-line-strong bg-ink-900 p-3">
              {categories.map((c) => {
                const active = categoryIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggle(categoryIds, c.id, setCategoryIds)}
                    title={c.description}
                    aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-2xs transition-colors duration-150 ease-out ${
                      active
                        ? 'border-brand bg-brand/10 text-strong'
                        : 'border-line-strong text-mute hover:text-strong'
                    }`}
                  >
                    <span className="font-mono">{c.id}</span>
                    <span className="text-soft">{c.name}</span>
                    {active && <CheckIcon className="h-3 w-3 text-brand-bright" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
