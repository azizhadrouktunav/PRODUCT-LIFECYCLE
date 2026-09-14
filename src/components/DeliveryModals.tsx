import React, { useEffect, useMemo, useState } from 'react';
import { CheckIcon } from 'lucide-react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { CapabilityStatus, Epic, Feature, UserStory } from '../types/registry';
import { CAPABILITY_STATUSES, DEFAULT_STORY_STAGES } from '../types/registry';

function StatusField({
  value,
  onChange,
}: {
  value: CapabilityStatus | '';
  onChange: (v: CapabilityStatus | '') => void;
}) {
  return (
    <Field label="Status">
      <select
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value as CapabilityStatus | '')}
      >
        <option value="">No status</option>
        {CAPABILITY_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function EpicModal({
  open,
  onClose,
  capabilityId,
  epic,
  suggestedKey = '',
}: {
  open: boolean;
  onClose: () => void;
  capabilityId: string;
  epic?: Epic | null;
  suggestedKey?: string;
}) {
  const { addEpic, updateEpic } = useRegistry();
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<CapabilityStatus | ''>('');

  useEffect(() => {
    if (!open) return;
    setKey(epic?.key ?? suggestedKey);
    setName(epic?.name ?? '');
    setDescription(epic?.description ?? '');
    setStatus(epic?.status ?? '');
  }, [open, epic, suggestedKey]);

  const valid = name.trim().length > 1;

  function submit() {
    if (!valid) return;
    const payload = { key, name, description, status: status === '' ? null : status };
    if (epic) updateEpic(epic.id, payload);
    else addEpic(capabilityId, payload);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-xl"
      title={epic ? 'Edit epic' : 'Add epic'}
      subtitle={
        epic
          ? `${epic.id} · part of ${capabilityId}`
          : `Epics are the delivery slices of ${capabilityId}. Features go inside them.`
      }
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid}>
            {epic ? 'Save epic' : 'Add epic'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-[160px_minmax(0,1fr)]">
          <Field label="Jira key" hint="optional">
            <input
              className={inputClass}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="FIQ-2210"
            />
          </Field>
          <Field label="Epic name" required>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Drain detection engine"
            />
          </Field>
        </div>
        <Field label="Description">
          <textarea
            className={`${inputClass} min-h-[84px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this epic delivers, and where it stops."
          />
        </Field>
        <StatusField value={status} onChange={setStatus} />
      </div>
    </Modal>
  );
}

export function FeatureModal({
  open,
  onClose,
  epicId,
  epicName,
  feature,
}: {
  open: boolean;
  onClose: () => void;
  epicId: string;
  epicName: string;
  feature?: Feature | null;
}) {
  const { addFeature, updateFeature } = useRegistry();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<CapabilityStatus | ''>('');

  useEffect(() => {
    if (!open) return;
    setName(feature?.name ?? '');
    setDescription(feature?.description ?? '');
    setStatus(feature?.status ?? '');
  }, [open, feature]);

  const valid = name.trim().length > 1;

  function submit() {
    if (!valid) return;
    const payload = { name, description, status: status === '' ? null : status };
    if (feature) updateFeature(feature.id, payload);
    else addFeature(epicId, payload);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-xl"
      title={feature ? 'Edit feature' : 'Add feature'}
      subtitle={`Inside epic · ${epicName}`}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid}>
            {feature ? 'Save feature' : 'Add feature'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Feature name" required>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Refuel exclusion logic"
          />
        </Field>
        <Field label="Description">
          <textarea
            className={`${inputClass} min-h-[84px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="The behaviour this feature adds."
          />
        </Field>
        <StatusField value={status} onChange={setStatus} />
      </div>
    </Modal>
  );
}

export function StoryModal({
  open,
  onClose,
  featureId,
  featureName,
  story,
}: {
  open: boolean;
  onClose: () => void;
  featureId: string;
  featureName: string;
  story?: UserStory | null;
}) {
  const { addStory, updateStory, getFeature, getEpic, capabilityOfEpic, lifecycleOf, actors } =
    useRegistry();
  const feature = getFeature(featureId);
  const epic = feature ? getEpic(feature.epicId) : undefined;
  const capability = epic ? capabilityOfEpic(epic.id) : undefined;
  const lifecycle = capability ? lifecycleOf(capability) : undefined;
  const storyStages =
    lifecycle && lifecycle.storyStages.length > 0 ? lifecycle.storyStages : DEFAULT_STORY_STAGES;
  const architectureStage =
    storyStages.find((s) => /architecture/i.test(s.name))?.name ?? storyStages[1]?.name ?? '';

  const availableActors = useMemo(() => {
    const domainIds = capability?.domainIds ?? [];
    if (domainIds.length === 0) return [];
    return actors
      .filter((a) => a.domainIds.some((d) => domainIds.includes(d)))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [actors, capability]);

  const [title, setTitle] = useState('');
  const [actorIds, setActorIds] = useState<string[]>([]);
  const [want, setWant] = useState('');
  const [benefit, setBenefit] = useState('');
  const [criteria, setCriteria] = useState('');
  const [stage, setStage] = useState<string>(storyStages[0]?.name ?? '');
  const [status, setStatus] = useState<CapabilityStatus | ''>('');

  useEffect(() => {
    if (!open) return;
    setTitle(story?.title ?? '');
    setActorIds(story?.actorIds ?? []);
    setWant(story?.want ?? '');
    setBenefit(story?.benefit ?? '');
    setCriteria(story?.criteria.join('\n') ?? '');
    setStage(story?.stage ?? storyStages[0]?.name ?? '');
    setStatus(story?.status ?? '');
  }, [open, story, lifecycle?.id]);

  const stageIdx = storyStages.findIndex((s) => s.name === stage);
  const archIdx = storyStages.findIndex((s) => s.name === architectureStage);
  const adrBlocked = archIdx >= 0 && stageIdx > archIdx && !(story?.adrApproved ?? false);
  const valid = title.trim().length > 1 && !adrBlocked;

  function toggleActor(id: string) {
    setActorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function submit() {
    if (!valid) return;
    const selectedNames = actorIds
      .map((id) => actors.find((a) => a.id === id)?.name)
      .filter((n): n is string => !!n && n.trim() !== '');
    const payload = {
      title,
      actorIds,
      role: selectedNames.join('; '),
      want,
      benefit,
      criteria: criteria.split('\n').map((c) => c.replace(/^[-•]\s*/, '').trim()),
      points: story?.points ?? null,
      stage,
      status: status === '' ? null : status,
      adrContext: story?.adrContext ?? '',
      adrDecision: story?.adrDecision ?? '',
      adrTechnical: story?.adrTechnical ?? '',
      adrConsequences: story?.adrConsequences ?? '',
      adrApproved: story?.adrApproved ?? false,
    };
    if (story) updateStory(story.id, payload);
    else addStory(featureId, payload);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-xl"
      title={story ? 'Edit user story' : 'Add user story'}
      subtitle={`Inside feature · ${featureName}`}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid}>
            {story ? 'Save story' : 'Add story'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Story title" required>
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Flag a sudden drop while parked"
          />
        </Field>

        <div className="rounded-md border border-line-strong bg-ink-900 p-3">
          <p className="mb-3 text-2xs uppercase tracking-[0.14em] text-ink-500">Story statement</p>
          <div className="space-y-3">
            <div>
              <span className="mb-1.5 flex items-baseline gap-2 text-xs font-medium text-soft">
                As a
                <span className="font-normal text-mute">
                  {actorIds.length > 0
                    ? `${actorIds.length} selected`
                    : 'select one or more actors'}
                </span>
              </span>
              {!(capability?.domainIds?.length) ? (
                <p className="rounded-md border border-line-strong bg-ink-800 p-2.5 text-2xs text-mute">
                  This capability has no domains yet, so no actors are available. Assign domains on
                  the capability first.
                </p>
              ) : availableActors.length === 0 ? (
                <p className="rounded-md border border-line-strong bg-ink-800 p-2.5 text-2xs text-mute">
                  No actors match this capability’s domains. Add actors under Actors and assign them
                  to those domains.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {availableActors.map((a) => {
                    const active = actorIds.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleActor(a.id)}
                        title={a.description || undefined}
                        aria-pressed={active}
                        className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-2xs transition-colors duration-150 ease-out ${
                          active
                            ? 'border-brand bg-brand/10 text-strong'
                            : 'border-line-strong text-mute hover:text-strong'
                        }`}
                      >
                        <span className="text-soft">{a.name}</span>
                        {active && <CheckIcon className="h-3 w-3 text-brand-bright" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <Field label="I want to">
              <input
                className={inputClass}
                value={want}
                onChange={(e) => setWant(e.target.value)}
                placeholder="be alerted when the level drops with the engine off"
              />
            </Field>
            <Field label="So that">
              <input
                className={inputClass}
                value={benefit}
                onChange={(e) => setBenefit(e.target.value)}
                placeholder="I can act on a theft the same day"
              />
            </Field>
          </div>
        </div>

        <Field label="Acceptance criteria" hint="one per line">
          <textarea
            className={`${inputClass} min-h-[96px] resize-y`}
            value={criteria}
            onChange={(e) => setCriteria(e.target.value)}
            placeholder={'Threshold is configurable per tank size\nAlert carries location and time'}
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <StatusField value={status} onChange={setStatus} />
          <Field label="Progress stage">
            <select className={inputClass} value={stage} onChange={(e) => setStage(e.target.value)}>
              {storyStages.map((s, i) => (
                <option key={s.name} value={s.name}>
                  {i + 1}. {s.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {adrBlocked && (
          <p className="text-2xs leading-relaxed text-orange">
            “{stage}” is blocked until the ADR is technically approved. Set the architecture decision
            record from the story actions menu.
          </p>
        )}
      </div>
    </Modal>
  );
}
