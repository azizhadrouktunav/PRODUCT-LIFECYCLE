import { useEffect, useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Modal } from './Modal';
import { Button, Field, inputClass } from './Primitives';
import { ProductMultiSelect } from './ProductMultiSelect';
import { useRegistry } from '../contexts/RegistryContext';
import type {
  AutoAggregate,
  AutoEntity,
  AutoField,
  AutoOp,
  AutomationCondition,
  AutomationRule,
  CapabilityStatus,
  DecompositionMode,
  Lifecycle,
  StageDef,
  StageRequirement,
  StageTone,
} from '../types/registry';
import {
  AUTO_AGGREGATES,
  AUTO_ENTITIES,
  AUTO_OPS,
  CAPABILITY_STATUSES,
  DECOMPOSITION_LABEL,
  LIFECYCLE_TEMPLATES,
  REQUIREMENT_LABEL,
  STAGE_TONES,
  requirementsForMode,
} from '../types/registry';
import {
  AUTO_AGGREGATE_LABEL,
  AUTO_ENTITY_LABEL,
  AUTO_FIELD_LABEL,
  AUTO_OP_LABEL,
  fieldsForEntity,
  newRuleId,
  optionsForField,
  relatedSourceEntities,
} from '../lib/automationCatalog';

function blankStage(_mode: DecompositionMode): StageDef {
  return {
    name: '',
    description: '',
    tone: 'blue',
    requirement: 'none',
    status: 'In Progress',
  };
}

function blankCondition(target: AutoEntity): AutomationCondition {
  const sources = relatedSourceEntities(target);
  const sourceEntity = sources[0] ?? 'story';
  const sourceField = fieldsForEntity(sourceEntity)[0] ?? 'status';
  return {
    sourceEntity,
    sourceField,
    aggregate: 'all',
    op: 'eq',
    value: 'Completed',
  };
}

function blankRule(): AutomationRule {
  return {
    id: newRuleId(),
    enabled: true,
    targetEntity: 'feature',
    targetField: 'status',
    setValue: 'Completed',
    conditions: [blankCondition('feature')],
  };
}

function StageListEditor({
  title,
  stages,
  mode,
  onChange,
  withAutoStatus = false,
}: {
  title: string;
  stages: StageDef[];
  mode: DecompositionMode;
  onChange: (next: StageDef[]) => void;
  withAutoStatus?: boolean;
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
              {withAutoStatus && (
                <Field
                  label="Maps to status"
                  hint="applied automatically when progress reaches this stage"
                >
                  <select
                    className={inputClass}
                    value={s.status === null || s.status === undefined ? '' : s.status}
                    onChange={(e) => {
                      const v = e.target.value;
                      updateAt(i, {
                        status: v === '' ? null : (v as CapabilityStatus),
                      });
                    }}
                  >
                    <option value="">No flag (default In Progress / Completed)</option>
                    {CAPABILITY_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function AutomationRulesEditor({
  rules,
  lifecycleDraft,
  onChange,
}: {
  rules: AutomationRule[];
  lifecycleDraft: Pick<Lifecycle, 'stages' | 'storyStages'>;
  onChange: (next: AutomationRule[]) => void;
}) {
  const draftLifecycle = useMemo(
    () =>
      ({
        id: '_draft',
        label: '',
        summary: '',
        decomposition: 'delivery' as const,
        stages: lifecycleDraft.stages,
        storyStages: lifecycleDraft.storyStages,
        productIds: [],
        automationRules: rules,
      }) satisfies Lifecycle,
    [lifecycleDraft.stages, lifecycleDraft.storyStages, rules]
  );

  function updateRule(index: number, patch: Partial<AutomationRule>) {
    onChange(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function updateCondition(
    ruleIndex: number,
    condIndex: number,
    patch: Partial<AutomationCondition>
  ) {
    const rule = rules[ruleIndex];
    const conditions = rule.conditions.map((c, i) =>
      i === condIndex ? { ...c, ...patch } : c
    );
    updateRule(ruleIndex, { conditions });
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-soft">Status automation</span>
        <Button variant="quiet" type="button" onClick={() => onChange([...rules, blankRule()])}>
          <PlusIcon className="h-3.5 w-3.5" />
          Add rule
        </Button>
      </div>
      {rules.length === 0 ? (
        <p className="rounded-md border border-line-strong px-3 py-3 text-xs text-mute">
          No rules — statuses stay manual except capability stage maps.
        </p>
      ) : (
        <ul className="space-y-3">
          {rules.map((rule, ri) => {
            const targetFields = fieldsForEntity(rule.targetEntity);
            const setOptions = optionsForField(
              rule.targetEntity,
              rule.targetField,
              draftLifecycle
            );
            const sources = relatedSourceEntities(rule.targetEntity);
            return (
              <li key={rule.id} className="rounded-md border border-line-strong p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs text-soft">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={(e) => updateRule(ri, { enabled: e.target.checked })}
                    />
                    Enabled
                  </label>
                  <button
                    type="button"
                    aria-label="Remove rule"
                    onClick={() => onChange(rules.filter((_, i) => i !== ri))}
                    className="ml-auto rounded p-0.5 text-mute hover:text-danger"
                  >
                    <Trash2Icon className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Field label="Set entity">
                    <select
                      className={inputClass}
                      value={rule.targetEntity}
                      onChange={(e) => {
                        const targetEntity = e.target.value as AutoEntity;
                        const targetField = fieldsForEntity(targetEntity)[0] ?? 'status';
                        const setValue =
                          optionsForField(targetEntity, targetField, draftLifecycle)[0] ?? '';
                        updateRule(ri, {
                          targetEntity,
                          targetField,
                          setValue,
                          conditions: [blankCondition(targetEntity)],
                        });
                      }}
                    >
                      {AUTO_ENTITIES.map((ent) => (
                        <option key={ent} value={ent}>
                          {AUTO_ENTITY_LABEL[ent]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Field">
                    <select
                      className={inputClass}
                      value={rule.targetField}
                      onChange={(e) => {
                        const targetField = e.target.value as AutoField;
                        const setValue =
                          optionsForField(rule.targetEntity, targetField, draftLifecycle)[0] ??
                          '';
                        updateRule(ri, { targetField, setValue });
                      }}
                    >
                      {targetFields.map((f) => (
                        <option key={f} value={f}>
                          {AUTO_FIELD_LABEL[f]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="To value">
                    <select
                      className={inputClass}
                      value={rule.setValue}
                      onChange={(e) => updateRule(ri, { setValue: e.target.value })}
                    >
                      {setOptions.map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-2xs uppercase tracking-[0.12em] text-ink-500">
                      When (all conditions)
                    </span>
                    <Button
                      variant="quiet"
                      type="button"
                      onClick={() =>
                        updateRule(ri, {
                          conditions: [...rule.conditions, blankCondition(rule.targetEntity)],
                        })
                      }
                    >
                      <PlusIcon className="h-3 w-3" />
                      Condition
                    </Button>
                  </div>
                  {rule.conditions.map((cond, ci) => {
                    const srcFields = fieldsForEntity(cond.sourceEntity);
                    const valOptions = optionsForField(
                      cond.sourceEntity,
                      cond.sourceField,
                      draftLifecycle
                    );
                    return (
                      <div
                        key={ci}
                        className="grid gap-2 rounded border border-line-soft p-2 sm:grid-cols-5"
                      >
                        <Field label="Related">
                          <select
                            className={inputClass}
                            value={cond.sourceEntity}
                            onChange={(e) => {
                              const sourceEntity = e.target.value as AutoEntity;
                              const sourceField = fieldsForEntity(sourceEntity)[0] ?? 'status';
                              const value =
                                optionsForField(sourceEntity, sourceField, draftLifecycle)[0] ??
                                '';
                              updateCondition(ri, ci, { sourceEntity, sourceField, value });
                            }}
                          >
                            {(sources.length ? sources : AUTO_ENTITIES).map((ent) => (
                              <option key={ent} value={ent}>
                                {AUTO_ENTITY_LABEL[ent]}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Field">
                          <select
                            className={inputClass}
                            value={cond.sourceField}
                            onChange={(e) => {
                              const sourceField = e.target.value as AutoField;
                              const value =
                                optionsForField(
                                  cond.sourceEntity,
                                  sourceField,
                                  draftLifecycle
                                )[0] ?? '';
                              updateCondition(ri, ci, { sourceField, value });
                            }}
                          >
                            {srcFields.map((f) => (
                              <option key={f} value={f}>
                                {AUTO_FIELD_LABEL[f]}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Match">
                          <select
                            className={inputClass}
                            value={cond.aggregate}
                            onChange={(e) =>
                              updateCondition(ri, ci, {
                                aggregate: e.target.value as AutoAggregate,
                              })
                            }
                          >
                            {AUTO_AGGREGATES.map((a) => (
                              <option key={a} value={a}>
                                {AUTO_AGGREGATE_LABEL[a]}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Op">
                          <select
                            className={inputClass}
                            value={cond.op}
                            onChange={(e) =>
                              updateCondition(ri, ci, { op: e.target.value as AutoOp })
                            }
                          >
                            {AUTO_OPS.map((o) => (
                              <option key={o} value={o}>
                                {AUTO_OP_LABEL[o]}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <div className="flex items-end gap-1">
                          <div className="min-w-0 flex-1">
                            <Field label="Value">
                              <select
                                className={inputClass}
                                value={cond.value}
                                onChange={(e) =>
                                  updateCondition(ri, ci, { value: e.target.value })
                                }
                              >
                                {valOptions.map((v) => (
                                  <option key={v} value={v}>
                                    {v}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          </div>
                          <button
                            type="button"
                            aria-label="Remove condition"
                            disabled={rule.conditions.length <= 1}
                            onClick={() =>
                              updateRule(ri, {
                                conditions: rule.conditions.filter((_, i) => i !== ci),
                              })
                            }
                            className="mb-0.5 rounded p-1.5 text-mute hover:text-danger disabled:opacity-30"
                          >
                            <Trash2Icon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
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
  const [productIds, setProductIds] = useState<string[]>([]);
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(
    LIFECYCLE_TEMPLATES.delivery.automationRules
  );

  useEffect(() => {
    if (!open) return;
    if (lifecycle) {
      setLabel(lifecycle.label);
      setSummary(lifecycle.summary);
      setDecomposition(lifecycle.decomposition);
      setStages(lifecycle.stages.map((s) => ({ ...s })));
      setStoryStages(lifecycle.storyStages.map((s) => ({ ...s })));
      setProductIds(lifecycle.productIds ?? []);
      setAutomationRules((lifecycle.automationRules ?? []).map((r) => ({ ...r })));
    } else {
      const tpl = LIFECYCLE_TEMPLATES.delivery;
      setLabel('');
      setSummary(tpl.summary);
      setDecomposition('delivery');
      setStages(tpl.stages.map((s) => ({ ...s })));
      setStoryStages(tpl.storyStages.map((s) => ({ ...s })));
      setProductIds([]);
      setAutomationRules(tpl.automationRules.map((r) => ({ ...r, id: newRuleId() })));
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
    setAutomationRules(tpl.automationRules.map((r) => ({ ...r, id: newRuleId() })));
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
    productIds.length > 0 &&
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
      productIds,
      automationRules,
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
      width="max-w-3xl"
      title={isEdit ? 'Edit lifecycle' : 'Add a lifecycle'}
      subtitle={
        isEdit
          ? `${lifecycle?.id} · stages and automation apply wherever this lifecycle is used`
          : undefined
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
        <ProductMultiSelect productIds={productIds} onChange={setProductIds} />
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
          withAutoStatus
        />

        {decomposition === 'delivery' && (
          <StageListEditor
            title="User story stages"
            stages={storyStages}
            mode={decomposition}
            onChange={setStoryStages}
          />
        )}

        <AutomationRulesEditor
          rules={automationRules}
          lifecycleDraft={{ stages, storyStages }}
          onChange={setAutomationRules}
        />
      </div>
    </Modal>
  );
}
