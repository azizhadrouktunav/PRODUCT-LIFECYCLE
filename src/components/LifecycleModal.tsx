import React, { useEffect, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type {
  DecompositionMode,
  Lifecycle,
  StageDef,
  StageRequirement,
  StageTone,
} from '../types/registry';
import {
  DECOMPOSITION_LABEL,
  LIFECYCLE_TEMPLATES,
  REQUIREMENT_LABEL,
  STAGE_TONES,
  requirementsForMode,
} from '../types/registry';

function blankStage(_mode: DecompositionMode): StageDef {
  return {
    name: '',
    description: '',
    tone: 'blue',
    requirement: 'none',
  };
}

function StageListEditor({
  title,
  stages,
  mode,
  onChange,
}: {
  title: string;
  stages: StageDef[];
  mode: DecompositionMode;
  onChange: (next: StageDef[]) => void;
}) {
  const allowedReqs = requirementsForMode(mode);

  function updateAt(index: number, patch: Partial<StageDef>) {
    onChange(stages.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= stages.length) return;
    const next = [...stages];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    onChange(next);
  }

  function remove(index: number) {
    if (stages.length <= 1) return;
    onChange(stages.filter((_, i) => i !== index));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-soft">{title}</span>
        <Button
          variant="quiet"
          onClick={() => onChange([...stages, blankStage(mode)])}
          type="button"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add stage
        </Button>
      </div>
      <ol className="space-y-3">
        {stages.map((s, i) => (
          <li key={i} className="rounded-md border border-line-strong p-3">
            <div className="mb-2 flex items-center gap-1">
              <span className="mr-auto font-mono text-2xs text-ink-500">{i + 1}</span>
              <button
                type="button"
                aria-label="Move stage up"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="rounded p-0.5 text-mute hover:text-strong disabled:opacity-30"
              >
                <ChevronUpIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Move stage down"
                disabled={i === stages.length - 1}
                onClick={() => move(i, 1)}
                className="rounded p-0.5 text-mute hover:text-strong disabled:opacity-30"
              >
                <ChevronDownIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Remove stage"
                disabled={stages.length <= 1}
                onClick={() => remove(i)}
                className="rounded p-0.5 text-mute hover:text-danger disabled:opacity-30"
              >
                <Trash2Icon className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Name" required>
                <input
                  className={inputClass}
                  value={s.name}
                  onChange={(e) => updateAt(i, { name: e.target.value })}
                  placeholder="Stage name"
                />
              </Field>
              <Field label="Tone">
                <select
                  className={inputClass}
                  value={s.tone}
                  onChange={(e) => updateAt(i, { tone: e.target.value as StageTone })}
                >
                  {STAGE_TONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Description">
                <input
                  className={inputClass}
                  value={s.description}
                  onChange={(e) => updateAt(i, { description: e.target.value })}
                  placeholder="What this stage means"
                />
              </Field>
              <Field label="Requirement">
                <select
                  className={inputClass}
                  value={allowedReqs.includes(s.requirement) ? s.requirement : 'none'}
                  onChange={(e) =>
                    updateAt(i, { requirement: e.target.value as StageRequirement })
                  }
                >
                  {allowedReqs.map((req) => (
                    <option key={req} value={req}>
                      {REQUIREMENT_LABEL[req]}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function LifecycleModal({
  open,
  onClose,
  lifecycle = null,
}: {
  open: boolean;
  onClose: () => void;
  lifecycle?: Lifecycle | null;
}) {
  const { addLifecycle, updateLifecycle } = useRegistry();
  const isEdit = !!lifecycle;
  const [label, setLabel] = useState('');
  const [summary, setSummary] = useState('');
  const [decomposition, setDecomposition] = useState<DecompositionMode>('delivery');
  const [stages, setStages] = useState<StageDef[]>(LIFECYCLE_TEMPLATES.delivery.stages);
  const [storyStages, setStoryStages] = useState<StageDef[]>(
    LIFECYCLE_TEMPLATES.delivery.storyStages
  );

  useEffect(() => {
    if (!open) return;
    if (lifecycle) {
      setLabel(lifecycle.label);
      setSummary(lifecycle.summary);
      setDecomposition(lifecycle.decomposition);
      setStages(lifecycle.stages.map((s) => ({ ...s })));
      setStoryStages(lifecycle.storyStages.map((s) => ({ ...s })));
    } else {
      const tpl = LIFECYCLE_TEMPLATES.delivery;
      setLabel('');
      setSummary(tpl.summary);
      setDecomposition('delivery');
      setStages(tpl.stages.map((s) => ({ ...s })));
      setStoryStages(tpl.storyStages.map((s) => ({ ...s })));
    }
  }, [open, lifecycle]);

  function applyTemplate(mode: DecompositionMode, force = false) {
    const tpl = LIFECYCLE_TEMPLATES[mode];
    const stagesEmpty = stages.every((s) => !s.name.trim());
    if (
      !force &&
      !stagesEmpty &&
      !window.confirm('Replace the current stage lists with the selected template?')
    ) {
      return;
    }
    setDecomposition(mode);
    setStages(tpl.stages.map((s) => ({ ...s })));
    setStoryStages(tpl.storyStages.map((s) => ({ ...s })));
    if (!label.trim()) setLabel(tpl.label);
    if (!summary.trim()) setSummary(tpl.summary);
  }

  function setMode(mode: DecompositionMode) {
    if (mode === decomposition) return;
    const stagesEmpty = stages.every((s) => !s.name.trim());
    if (stagesEmpty) {
      applyTemplate(mode, true);
      return;
    }
    setDecomposition(mode);
    if (mode === 'delivery' && storyStages.length === 0) {
      setStoryStages(LIFECYCLE_TEMPLATES.delivery.storyStages.map((s) => ({ ...s })));
    }
    if (mode === 'none') {
      setStoryStages([]);
    }
    // Clear requirements that don't apply to the new mode.
    const allowed = new Set(requirementsForMode(mode));
    setStages((prev) =>
      prev.map((s) => ({
        ...s,
        requirement: allowed.has(s.requirement) ? s.requirement : 'none',
      }))
    );
  }

  const valid =
    label.trim().length > 1 &&
    stages.length > 0 &&
    stages.every((s) => s.name.trim().length > 0) &&
    (decomposition === 'none' ||
      (storyStages.length > 0 && storyStages.every((s) => s.name.trim().length > 0)));

  function submit() {
    if (!valid) return;
    const payload = {
      label: label.trim(),
      summary: summary.trim(),
      decomposition,
      stages: stages.map((s) => ({ ...s, name: s.name.trim() })),
      storyStages:
        decomposition === 'delivery'
          ? storyStages.map((s) => ({ ...s, name: s.name.trim() }))
          : [],
    };
    if (lifecycle) {
      updateLifecycle(lifecycle.id, payload);
    } else {
      addLifecycle(payload);
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title={isEdit ? 'Edit lifecycle' : 'Add a lifecycle'}
      subtitle={
        isEdit
          ? `${lifecycle?.id} · stages and decomposition apply wherever this lifecycle is used`
          : 'Define the process track groups can follow — capability stages, story stages, and prerequisites.'
      }
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} disabled={!valid}>
            {isEdit ? 'Save changes' : 'Add lifecycle'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Lifecycle name" required>
          <input
            className={inputClass}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Platform delivery track"
          />
        </Field>
        <Field label="Summary" hint="shown in process views">
          <textarea
            className={`${inputClass} min-h-[72px] resize-y`}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="How capabilities move through this lifecycle."
          />
        </Field>

        {isEdit && (
          <div>
            <span className="mb-1.5 block text-xs font-medium text-soft">Decomposition</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {(['none', 'delivery'] as DecompositionMode[]).map((mode) => {
                const active = decomposition === mode;
                return (
                  <button
                    key={mode}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setMode(mode)}
                    className={`rounded-md border px-3 py-2.5 text-left transition-colors duration-150 ease-out ${
                      active ? 'border-brand bg-brand/5' : 'border-line-strong hover:border-brand'
                    }`}
                  >
                    <span className="block text-xs font-medium text-strong">
                      {DECOMPOSITION_LABEL[mode]}
                    </span>
                    <span className="mt-1 block text-2xs leading-relaxed text-mute">
                      {mode === 'none'
                        ? 'Equipment-linked capabilities, no epics / features / stories'
                        : 'Break work into epics, then features, then user stories'}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button variant="quiet" type="button" onClick={() => applyTemplate(decomposition)}>
                Reset stages from template
              </Button>
            </div>
          </div>
        )}

        <StageListEditor
          title="Capability stages"
          stages={stages}
          mode={decomposition}
          onChange={setStages}
        />

        {decomposition === 'delivery' && (
          <StageListEditor
            title="User story stages"
            stages={storyStages}
            mode={decomposition}
            onChange={setStoryStages}
          />
        )}
      </div>
    </Modal>
  );
}
