import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { TrackId } from '../types/registry';
import { TRACKS } from '../types/registry';

export function AddGroupModal({ open, onClose }: {open: boolean;onClose: () => void;}) {
  const { addGroup } = useRegistry();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [track, setTrack] = useState<TrackId>('delivery');
  const [process, setProcess] = useState('');

  const valid = name.trim().length > 1;

  function submit() {
    if (!valid) return;
    addGroup(name, description, track, process);
    setName('');
    setDescription('');
    setProcess('');
    setTrack('delivery');
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-xl"
      title="Add a capability group"
      subtitle="Groups classify capabilities by the layer that delivers them, and decide which lifecycle they follow."
      footer={
      <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid}>
            Add group
          </Button>
        </>
      }>
      
      <div className="space-y-5">
        <Field label="Group name" required>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Integration Capability" />
          
        </Field>
        <Field label="Description">
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What belongs in this group, and what does not." />
          
        </Field>

        <div>
          <span className="mb-1.5 block text-xs font-medium text-soft">Lifecycle</span>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(TRACKS) as TrackId[]).map((id) => {
              const t = TRACKS[id];
              const active = track === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTrack(id)}
                  className={`rounded-md border px-3 py-2.5 text-left transition-colors duration-150 ease-out ${
                  active ? 'border-brand bg-brand/5' : 'border-line-strong hover:border-brand'}`
                  }>
                  
                  <span className="block text-xs font-medium text-strong">{t.label}</span>
                  <span className="mt-1 block text-2xs leading-relaxed text-mute">
                    {t.stages.length} stages · {id === 'hardware' ? 'no decomposition' : 'epics → features → stories'}
                  </span>
                </button>);

            })}
          </div>
        </div>

        <Field label="Process description" hint="shown behind the info icon">
          <textarea
            className={`${inputClass} min-h-[96px] resize-y`}
            value={process}
            onChange={(e) => setProcess(e.target.value)}
            placeholder="How capabilities in this group are worked, from identification to release." />
          
        </Field>
      </div>
    </Modal>);

}