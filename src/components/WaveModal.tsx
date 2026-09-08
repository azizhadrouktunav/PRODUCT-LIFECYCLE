import React, { useEffect, useMemo, useState } from 'react';
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, SearchIcon } from 'lucide-react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { Wave, WaveState } from '../types/registry';
import { WAVE_STATES } from '../types/registry';

interface Props {
  open: boolean;
  onClose: () => void;
  wave?: Wave | null;
}

function Row({
  depth,
  label,
  meta,
  checked,
  onToggle,
  expandable,
  expanded,
  onExpand









}: {depth: number;label: string;meta: string;checked: boolean;onToggle: () => void;expandable?: boolean;expanded?: boolean;onExpand?: () => void;}) {
  return (
    <div
      className="flex items-center gap-2 rounded py-1.5 pr-2 transition-colors duration-150 ease-out hover:bg-ink-700"
      style={{ paddingLeft: `${depth * 18 + 4}px` }}>
      
      {expandable ?
      <button
        type="button"
        onClick={onExpand}
        aria-label={expanded ? 'Collapse' : 'Expand'}
        className="rounded p-0.5 text-mute transition-colors duration-150 ease-out hover:text-strong">
        
          {expanded ? <ChevronDownIcon className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
        </button> :

      <span className="w-[18px]" />
      }
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={checked}
        className="flex min-w-0 flex-1 items-center gap-2 text-left">
        
        <span
          className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
          checked ? 'border-brand bg-brand' : 'border-line-strong'}`
          }
          aria-hidden="true">
          
          {checked && <CheckIcon className="h-2.5 w-2.5 text-white" />}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-soft">{label}</span>
        <span className="shrink-0 font-mono text-2xs text-ink-500">{meta}</span>
      </button>
    </div>);

}

export function WaveModal({ open, onClose, wave = null }: Props) {
  const { capabilities, epicsOf, featuresOf, storiesOf, addWave, updateWave } = useRegistry();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [state, setState] = useState<WaveState>('Planned');
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setCode(wave?.code ?? '');
    setName(wave?.name ?? '');
    setDescription(wave?.description ?? '');
    setState(wave?.state ?? 'Planned');
    setItemIds(wave?.itemIds ?? []);
    setQuery('');
    setExpanded(wave?.itemIds.filter((id) => id.startsWith('CAP-') || id.startsWith('EPIC-')) ?? []);
  }, [open, wave]);

  const valid = name.trim().length > 1 && code.trim() !== '';

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return capabilities;
    return capabilities.filter(
      (c) => c.name.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)
    );
  }, [capabilities, query]);

  function toggleItem(id: string) {
    setItemIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }
  function toggleExpand(id: string) {
    setExpanded((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }

  function submit() {
    if (!valid) return;
    const payload = {
      code: code.trim(),
      name: name.trim(),
      description: description.trim(),
      state,
      itemIds
    };
    if (wave) updateWave(wave.id, payload);else
    addWave(payload);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={wave ? `Edit ${wave.code}` : 'Define a wave'}
      subtitle="A wave is one increment you can put on production and test as a whole."
      footer={
      <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid}>
            {wave ? 'Save wave' : 'Create wave'}
          </Button>
        </>
      }>
      
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-[120px_minmax(0,1fr)]">
          <Field label="Code" required>
            <input
              className={inputClass}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="W-04" />
            
          </Field>
          <Field label="Wave name" required>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Maintenance increment" />
            
          </Field>
        </div>

        <Field label="Description">
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this increment proves on production." />
          
        </Field>

        <Field label="State">
          <select
            className={inputClass}
            value={state}
            onChange={(e) => setState(e.target.value as WaveState)}>
            
            {WAVE_STATES.map((s) =>
            <option key={s} value={s}>
                {s}
              </option>
            )}
          </select>
        </Field>

        <div>
          <div className="mb-1.5 flex flex-wrap items-baseline gap-2">
            <span className="text-xs font-medium text-soft">Scope</span>
            <span className="text-2xs text-mute">
              Select capabilities, epics, features or individual user stories — {itemIds.length} selected
            </span>
          </div>
          <div className="relative mb-2">
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500" />
            <input
              className={`${inputClass} py-1.5 pl-8 text-xs`}
              placeholder="Filter capabilities"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Filter capabilities" />
            
          </div>
          <div className="scroll-thin max-h-72 overflow-y-auto rounded-md border border-line-strong bg-ink-900 p-1.5">
            {visible.map((c) => {
              const epics = epicsOf(c.id);
              const capExpanded = expanded.includes(c.id);
              return (
                <div key={c.id}>
                  <Row
                    depth={0}
                    label={c.name}
                    meta={c.id}
                    checked={itemIds.includes(c.id)}
                    onToggle={() => toggleItem(c.id)}
                    expandable={epics.length > 0}
                    expanded={capExpanded}
                    onExpand={() => toggleExpand(c.id)} />
                  
                  {capExpanded &&
                  epics.map((epic) => {
                    const features = featuresOf(epic.id);
                    const epicExpanded = expanded.includes(epic.id);
                    return (
                      <div key={epic.id}>
                          <Row
                          depth={1}
                          label={epic.name}
                          meta={epic.id}
                          checked={itemIds.includes(epic.id)}
                          onToggle={() => toggleItem(epic.id)}
                          expandable={features.length > 0}
                          expanded={epicExpanded}
                          onExpand={() => toggleExpand(epic.id)} />
                        
                          {epicExpanded &&
                        features.map((feature) => {
                          const stories = storiesOf(feature.id);
                          const featureExpanded = expanded.includes(feature.id);
                          return (
                            <div key={feature.id}>
                                  <Row
                                depth={2}
                                label={feature.name}
                                meta={feature.id}
                                checked={itemIds.includes(feature.id)}
                                onToggle={() => toggleItem(feature.id)}
                                expandable={stories.length > 0}
                                expanded={featureExpanded}
                                onExpand={() => toggleExpand(feature.id)} />
                              
                                  {featureExpanded &&
                              stories.map((story) =>
                              <Row
                                key={story.id}
                                depth={3}
                                label={story.title}
                                meta={story.id}
                                checked={itemIds.includes(story.id)}
                                onToggle={() => toggleItem(story.id)} />

                              )}
                                </div>);

                        })}
                        </div>);

                  })}
                </div>);

            })}
            {visible.length === 0 &&
            <p className="py-6 text-center text-xs text-mute">No capability matches that filter.</p>
            }
          </div>
        </div>
      </div>
    </Modal>);

}