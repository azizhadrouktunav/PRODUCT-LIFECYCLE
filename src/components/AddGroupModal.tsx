import React, { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { ProductMultiSelect } from './ProductMultiSelect';
import { baseGroupCode, uniqueGroupCode, useRegistry } from '../contexts/RegistryContext';
import { useAuth } from '../contexts/AuthContext';
import type { CapabilityGroup, TrackId } from '../types/registry';
import { DECOMPOSITION_LABEL } from '../types/registry';
import { sharesProducts } from '../lib/rbac';

export function AddGroupModal({
  open,
  onClose,
  group = null,
}: {
  open: boolean;
  onClose: () => void;
  group?: CapabilityGroup | null;
}) {
  const { addGroup, updateGroup, lifecycles, groups } = useRegistry();
  const { entityVisible } = useAuth();
  const isEdit = !!group;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [code, setCode] = useState('');
  const [codeTouched, setCodeTouched] = useState(false);
  const [track, setTrack] = useState<TrackId>('');
  const [process, setProcess] = useState('');
  const [productIds, setProductIds] = useState<string[]>([]);

  const visibleLifecycles = useMemo(() => {
    const base = lifecycles.filter((lc) => entityVisible(lc.productIds));
    if (productIds.length === 0) return base;
    return base.filter((lc) => sharesProducts(lc.productIds, productIds));
  }, [lifecycles, entityVisible, productIds]);

  const defaultTrack =
    visibleLifecycles.find((l) => l.decomposition === 'delivery')?.id ??
    visibleLifecycles[0]?.id ??
    '';

  useEffect(() => {
    if (!open) return;
    if (group) {
      setName(group.name);
      setDescription(group.description);
      setCode(group.code);
      setCodeTouched(true);
      setTrack(group.track);
      setProcess(group.process);
      setProductIds(group.productIds ?? []);
    } else {
      setName('');
      setDescription('');
      setCode('');
      setCodeTouched(false);
      setTrack(defaultTrack);
      setProcess('');
      setProductIds([]);
    }
  }, [open, group, defaultTrack]);

  useEffect(() => {
    if (!open || isEdit || codeTouched) return;
    setCode(baseGroupCode(name));
  }, [open, isEdit, codeTouched, name]);

  useEffect(() => {
    if (!open) return;
    if (track && !visibleLifecycles.some((l) => l.id === track)) {
      setTrack(defaultTrack);
    }
  }, [open, track, visibleLifecycles, defaultTrack]);

  const normalizedCode = code.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
  const codeClash = groups.some(
    (g) => g.id !== group?.id && g.code === normalizedCode && normalizedCode !== ''
  );
  const valid =
    name.trim().length > 1 &&
    track !== '' &&
    normalizedCode.length > 0 &&
    !codeClash &&
    productIds.length > 0;

  const previewId = useMemo(() => {
    const c = normalizedCode || uniqueGroupCode(name || 'G', groups, group?.id);
    return `CAP-${c}-0001`;
  }, [normalizedCode, name, groups, group?.id]);

  function submit() {
    if (!valid) return;
    if (group) {
      updateGroup(group.id, {
        name,
        description,
        track,
        process,
        code: normalizedCode,
        productIds,
      });
    } else {
      addGroup({
        name,
        description,
        track,
        process,
        code: normalizedCode,
        productIds,
      });
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-xl"
      title={isEdit ? 'Edit capability group' : 'Add a capability group'}
      subtitle={
        isEdit
          ? `${group?.id} · code ${group?.code} · changes apply across the register immediately`
          : 'Groups classify capabilities by the layer that delivers them, and decide which lifecycle they follow.'
      }
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid}>
            {isEdit ? 'Save changes' : 'Add group'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Group name" required>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Integration Capability"
          />
        </Field>
        <Field
          label="Code"
          required
          hint={`Used in capability IDs · next like ${previewId}`}
        >
          <input
            className={`${inputClass} font-mono uppercase`}
            value={code}
            onChange={(e) => {
              setCodeTouched(true);
              setCode(e.target.value.toUpperCase());
            }}
            placeholder="e.g. S"
            maxLength={6}
          />
          {codeClash && (
            <p className="mt-1 text-2xs text-danger">Another group already uses this code.</p>
          )}
        </Field>
        <Field label="Description">
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What belongs in this group, and what does not."
          />
        </Field>

        <ProductMultiSelect productIds={productIds} onChange={setProductIds} />

        <div>
          <span className="mb-1.5 block text-xs font-medium text-soft">Lifecycle</span>
          {visibleLifecycles.length === 0 ? (
            <p className="text-xs text-mute">
              {productIds.length === 0
                ? 'Select products first, then pick a lifecycle that shares them.'
                : 'No lifecycle shares these products. Create one on the Lifecycles page.'}
            </p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {visibleLifecycles.map((t) => {
                const active = track === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setTrack(t.id)}
                    className={`rounded-md border px-3 py-2.5 text-left transition-colors duration-150 ease-out ${
                      active ? 'border-brand bg-brand/5' : 'border-line-strong hover:border-brand'
                    }`}
                  >
                    <span className="block text-xs font-medium text-strong">{t.label}</span>
                    <span className="mt-1 block text-2xs leading-relaxed text-mute">
                      {t.stages.length} stages · {DECOMPOSITION_LABEL[t.decomposition]}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Field label="Process description" hint="shown behind the info icon">
          <textarea
            className={`${inputClass} min-h-[96px] resize-y`}
            value={process}
            onChange={(e) => setProcess(e.target.value)}
            placeholder="How capabilities in this group are worked, from identification to release."
          />
        </Field>
      </div>
    </Modal>
  );
}
