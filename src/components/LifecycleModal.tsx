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
  ConditionCombineOp,
  ConditionNode,
  DecompositionMode,
  Lifecycle,
  StageContentMode,
  StageDef,
  StageRequirement,
  StageTone,
  WorkItemTypeDef,
} from '../types/registry';
import {
  AUTO_AGGREGATES,
  AUTO_OPS,
  CAPABILITY_STATUSES,
  DEFAULT_WORK_ITEM_STATUSES,
  LIFECYCLE_TEMPLATES,
  STAGE_TONES,
  normalizeRuleWhen,
  requirementsForLifecycle,
  syncLegacyFromTypes,
} from '../types/registry';
import {
  AUTO_AGGREGATE_LABEL,
  AUTO_FIELD_LABEL,
  AUTO_OP_LABEL,
  autoEntitiesForLifecycle,
  entityLabel,
  fieldsForEntity,
  newRuleId,
  optionsForField,
  relatedSourceEntities,
  summarizeWhen,
} from '../lib/automationCatalog';

function blankStage(): StageDef {
  return {
    name: '',
    description: '',
    tone: 'blue',
    requirement: 'none',
    status: 'In Progress',
    contentMode: 'inline',
    opensTypeId: null,
  };
}

function blankCondition(target: AutoEntity, lifecycle?: Lifecycle): AutomationCondition {
  const sources = relatedSourceEntities(target, lifecycle);
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

function blankLeaf(target: AutoEntity, lifecycle?: Lifecycle): ConditionNode {
  return { kind: 'leaf', condition: blankCondition(target, lifecycle) };
}

function blankWhen(target: AutoEntity, lifecycle?: Lifecycle): ConditionNode {
  return { kind: 'group', op: 'and', children: [blankLeaf(target, lifecycle)] };
}

function blankRule(lifecycle?: Lifecycle): AutomationRule {
  return {
    id: newRuleId(),
    enabled: true,
    targetEntity: 'feature',
    targetField: 'status',
    setValue: 'Completed',
    when: blankWhen('feature', lifecycle),
  };
}

function blankWorkItemType(parentTypeId: string | null = null): WorkItemTypeDef {
  const id = `type-${Date.now().toString(36).slice(-4)}`;
  return {
    id,
    label: 'New type',
    pluralLabel: 'New types',
    parentTypeId,
    statuses: [...DEFAULT_WORK_ITEM_STATUSES],
    stages: [],
    storage: 'custom',
  };
}

function slugifyTypeId(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
}

function StageListEditor({
  title,
  stages,
  requirementOptions,
  typeOptions,
  onChange,
  withAutoStatus = false,
  allowTableLink = false,
}: {
  title: string;
  stages: StageDef[];
  requirementOptions: StageRequirement[];
  typeOptions: WorkItemTypeDef[];
  onChange: (next: StageDef[]) => void;
  withAutoStatus?: boolean;
  allowTableLink?: boolean;
}) {
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
          type="button"
          onClick={() => onChange([...stages, blankStage()])}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add stage
        </Button>
      </div>
      <ul className="space-y-2">
        {stages.map((s, i) => (
          <li key={i} className="rounded-md border border-line-strong p-3">
            <div className="mb-2 flex items-center gap-1">
              <span className="font-mono text-2xs text-mute">{i + 1}</span>
              <button
                type="button"
                aria-label="Move up"
                disabled={i === 0}
                onClick={() => move(i, -1)}
                className="rounded p-0.5 text-mute hover:text-strong disabled:opacity-30"
              >
                <ChevronUpIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                aria-label="Move down"
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
                className="ml-auto rounded p-0.5 text-mute hover:text-danger disabled:opacity-30"
              >
                <Trash2Icon className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Field label="Name">
                <input
                  className={inputClass}
                  value={s.name}
                  onChange={(e) => updateAt(i, { name: e.target.value })}
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
              <Field label="Prerequisite">
                <select
                  className={inputClass}
                  value={s.requirement}
                  onChange={(e) => updateAt(i, { requirement: e.target.value })}
                >
                  {requirementOptions.map((r) => (
                    <option key={r} value={r}>
                      {r === 'none'
                        ? 'no prerequisite'
                        : r === 'equipment'
                          ? 'needs equipment'
                          : `needs ${r}`}
                    </option>
                  ))}
                </select>
              </Field>
              {withAutoStatus && (
                <Field label="Auto status">
                  <select
                    className={inputClass}
                    value={s.status ?? ''}
                    onChange={(e) =>
                      updateAt(i, {
                        status: (e.target.value || null) as CapabilityStatus | null,
                      })
                    }
                  >
                    <option value="">(default)</option>
                    {CAPABILITY_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              {allowTableLink && (
                <>
                  <Field label="Stage content">
                    <select
                      className={inputClass}
                      value={s.contentMode ?? 'inline'}
                      onChange={(e) => {
                        const contentMode = e.target.value as StageContentMode;
                        updateAt(i, {
                          contentMode,
                          opensTypeId:
                            contentMode === 'table'
                              ? s.opensTypeId ?? typeOptions[0]?.id ?? null
                              : null,
                        });
                      }}
                    >
                      <option value="inline">Stay on capability (inline)</option>
                      <option value="table">Open a table</option>
                    </select>
                  </Field>
                  {(s.contentMode ?? 'inline') === 'table' && (
                    <Field label="Table type">
                      <select
                        className={inputClass}
                        value={s.opensTypeId ?? ''}
                        onChange={(e) =>
                          updateAt(i, { opensTypeId: e.target.value || null })
                        }
                      >
                        <option value="">Select type…</option>
                        {typeOptions.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.pluralLabel}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                </>
              )}
            </div>
            <Field label="Description" hint="optional">
              <textarea
                className={`${inputClass} mt-2 min-h-[48px] resize-y`}
                value={s.description}
                onChange={(e) => updateAt(i, { description: e.target.value })}
              />
            </Field>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WorkItemTypesEditor({
  types,
  onChange,
}: {
  types: WorkItemTypeDef[];
  onChange: (next: WorkItemTypeDef[]) => void;
}) {
  function updateAt(index: number, patch: Partial<WorkItemTypeDef>) {
    onChange(types.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function remove(index: number) {
    const doomed = types[index]?.id;
    onChange(
      types
        .filter((_, i) => i !== index)
        .map((t) =>
          t.parentTypeId === doomed ? { ...t, parentTypeId: null } : t
        )
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-soft">Work item types</span>
        <Button
          variant="quiet"
          type="button"
          onClick={() => onChange([...types, blankWorkItemType(null)])}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add type
        </Button>
      </div>
      <p className="mb-2 text-2xs text-mute">
        Define the hierarchy (e.g. Epic → Feature → Story). Custom types store
        name, description and status in a dynamic table.
      </p>
      {types.length === 0 ? (
        <p className="rounded-md border border-line-strong px-3 py-3 text-xs text-mute">
          No hierarchy — capability stages stay inline (hardware-style).
        </p>
      ) : (
        <ul className="space-y-3">
          {types.map((t, i) => (
            <li key={t.id} className="rounded-md border border-line-strong p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono text-2xs text-mute">{t.id}</span>
                <button
                  type="button"
                  aria-label="Remove type"
                  onClick={() => remove(i)}
                  className="rounded p-0.5 text-mute hover:text-danger"
                >
                  <Trash2Icon className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label="Id (slug)">
                  <input
                    className={inputClass}
                    value={t.id}
                    disabled={t.storage === 'builtin'}
                    onChange={(e) => {
                      const id = slugifyTypeId(e.target.value) || t.id;
                      updateAt(i, {
                        id,
                        storage:
                          id === 'epic' ||
                          id === 'feature' ||
                          id === 'story' ||
                          id === 'equipment'
                            ? 'builtin'
                            : 'custom',
                      });
                    }}
                  />
                </Field>
                <Field label="Parent">
                  <select
                    className={inputClass}
                    value={t.parentTypeId ?? ''}
                    onChange={(e) =>
                      updateAt(i, {
                        parentTypeId: e.target.value || null,
                      })
                    }
                  >
                    <option value="">Capability (root)</option>
                    {types
                      .filter((o) => o.id !== t.id)
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.label}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label="Label">
                  <input
                    className={inputClass}
                    value={t.label}
                    onChange={(e) => updateAt(i, { label: e.target.value })}
                  />
                </Field>
                <Field label="Plural">
                  <input
                    className={inputClass}
                    value={t.pluralLabel}
                    onChange={(e) => updateAt(i, { pluralLabel: e.target.value })}
                  />
                </Field>
              </div>
              <Field label="Statuses" hint="comma-separated">
                <input
                  className={`${inputClass} mt-2`}
                  value={t.statuses.join(', ')}
                  onChange={(e) =>
                    updateAt(i, {
                      statuses: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
              <div className="mt-3">
                <StageListEditor
                  title={`Stages for ${t.label || t.id}`}
                  stages={t.stages}
                  requirementOptions={['none']}
                  typeOptions={types}
                  onChange={(stages) => updateAt(i, { stages })}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ConditionNodeEditor({
  node,
  targetEntity,
  draftLifecycle,
  onChange,
  onRemove,
  canRemove,
}: {
  node: ConditionNode;
  targetEntity: AutoEntity;
  draftLifecycle: Lifecycle;
  onChange: (next: ConditionNode) => void;
  onRemove?: () => void;
  canRemove: boolean;
}) {
  const sources = relatedSourceEntities(targetEntity, draftLifecycle);

  if (node.kind === 'leaf') {
    const cond = node.condition;
    const srcFields = fieldsForEntity(cond.sourceEntity);
    const valOptions = optionsForField(
      cond.sourceEntity,
      cond.sourceField,
      draftLifecycle
    );
    return (
      <div className="rounded border border-line-soft p-2">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1 text-2xs text-soft">
            <input
              type="checkbox"
              checked={!!node.not}
              onChange={(e) => onChange({ ...node, not: e.target.checked })}
            />
            NOT
          </label>
          <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-2xs text-mute">
            leaf
          </span>
          {onRemove && (
            <button
              type="button"
              aria-label="Remove condition"
              disabled={!canRemove}
              onClick={onRemove}
              className="ml-auto rounded p-0.5 text-mute hover:text-danger disabled:opacity-30"
            >
              <Trash2Icon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-5">
          <Field label="Related">
            <select
              className={inputClass}
              value={cond.sourceEntity}
              onChange={(e) => {
                const sourceEntity = e.target.value as AutoEntity;
                const sourceField = fieldsForEntity(sourceEntity)[0] ?? 'status';
                const value =
                  optionsForField(sourceEntity, sourceField, draftLifecycle)[0] ?? '';
                onChange({
                  ...node,
                  condition: { ...cond, sourceEntity, sourceField, value },
                });
              }}
            >
              {(sources.length ? sources : autoEntitiesForLifecycle(draftLifecycle)).map(
                (ent) => (
                  <option key={ent} value={ent}>
                    {entityLabel(ent, draftLifecycle)}
                  </option>
                )
              )}
            </select>
          </Field>
          <Field label="Field">
            <select
              className={inputClass}
              value={cond.sourceField}
              onChange={(e) => {
                const sourceField = e.target.value as AutoField;
                const value =
                  optionsForField(cond.sourceEntity, sourceField, draftLifecycle)[0] ??
                  '';
                onChange({
                  ...node,
                  condition: { ...cond, sourceField, value },
                });
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
                onChange({
                  ...node,
                  condition: {
                    ...cond,
                    aggregate: e.target.value as AutoAggregate,
                  },
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
                onChange({
                  ...node,
                  condition: { ...cond, op: e.target.value as AutoOp },
                })
              }
            >
              {AUTO_OPS.map((o) => (
                <option key={o} value={o}>
                  {AUTO_OP_LABEL[o]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Value">
            <select
              className={inputClass}
              value={cond.value}
              onChange={(e) =>
                onChange({
                  ...node,
                  condition: { ...cond, value: e.target.value },
                })
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
      </div>
    );
  }

  return (
    <div className="rounded border border-line-strong p-2">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-1 text-2xs text-soft">
          <input
            type="checkbox"
            checked={!!node.not}
            onChange={(e) => onChange({ ...node, not: e.target.checked })}
          />
          NOT
        </label>
        <select
          className={`${inputClass} w-auto py-1`}
          value={node.op}
          onChange={(e) =>
            onChange({ ...node, op: e.target.value as ConditionCombineOp })
          }
        >
          <option value="and">AND</option>
          <option value="or">OR</option>
        </select>
        <span className="rounded bg-brand/10 px-1.5 py-0.5 font-mono text-2xs text-brand-bright">
          {node.op.toUpperCase()}
        </span>
        <Button
          variant="quiet"
          type="button"
          onClick={() =>
            onChange({
              ...node,
              children: [...node.children, blankLeaf(targetEntity, draftLifecycle)],
            })
          }
        >
          <PlusIcon className="h-3 w-3" />
          Condition
        </Button>
        <Button
          variant="quiet"
          type="button"
          onClick={() =>
            onChange({
              ...node,
              children: [
                ...node.children,
                {
                  kind: 'group',
                  op: 'and',
                  children: [blankLeaf(targetEntity, draftLifecycle)],
                },
              ],
            })
          }
        >
          <PlusIcon className="h-3 w-3" />
          Group
        </Button>
        {onRemove && (
          <button
            type="button"
            aria-label="Remove group"
            disabled={!canRemove}
            onClick={onRemove}
            className="ml-auto rounded p-0.5 text-mute hover:text-danger disabled:opacity-30"
          >
            <Trash2Icon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="space-y-2 pl-2 border-l border-line-soft">
        {node.children.map((child, ci) => (
          <ConditionNodeEditor
            key={ci}
            node={child}
            targetEntity={targetEntity}
            draftLifecycle={draftLifecycle}
            canRemove={node.children.length > 1}
            onChange={(next) =>
              onChange({
                ...node,
                children: node.children.map((c, i) => (i === ci ? next : c)),
              })
            }
            onRemove={() =>
              onChange({
                ...node,
                children: node.children.filter((_, i) => i !== ci),
              })
            }
          />
        ))}
      </div>
    </div>
  );
}

function AutomationRulesEditor({
  rules,
  lifecycleDraft,
  onChange,
}: {
  rules: AutomationRule[];
  lifecycleDraft: Pick<Lifecycle, 'stages' | 'storyStages' | 'workItemTypes'>;
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
        workItemTypes: lifecycleDraft.workItemTypes,
        productIds: [],
        automationRules: rules,
      }) satisfies Lifecycle,
    [lifecycleDraft.stages, lifecycleDraft.storyStages, lifecycleDraft.workItemTypes, rules]
  );

  const entities = autoEntitiesForLifecycle(draftLifecycle);

  function updateRule(index: number, patch: Partial<AutomationRule>) {
    onChange(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-soft">Status automation</span>
        <Button
          variant="quiet"
          type="button"
          onClick={() => onChange([...rules, blankRule(draftLifecycle)])}
        >
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
            const when = normalizeRuleWhen(rule);
            const targetFields = fieldsForEntity(rule.targetEntity);
            const setOptions = optionsForField(
              rule.targetEntity,
              rule.targetField,
              draftLifecycle
            );
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
                          optionsForField(targetEntity, targetField, draftLifecycle)[0] ??
                          '';
                        updateRule(ri, {
                          targetEntity,
                          targetField,
                          setValue,
                          when: blankWhen(targetEntity, draftLifecycle),
                        });
                      }}
                    >
                      {entities.map((ent) => (
                        <option key={ent} value={ent}>
                          {entityLabel(ent, draftLifecycle)}
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
                          optionsForField(
                            rule.targetEntity,
                            targetField,
                            draftLifecycle
                          )[0] ?? '';
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
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-2xs uppercase tracking-[0.12em] text-ink-500">
                      When
                    </span>
                    <span
                      className="max-w-full truncate rounded bg-surface-2 px-2 py-0.5 font-mono text-2xs text-soft"
                      title={summarizeWhen(when, draftLifecycle)}
                    >
                      {summarizeWhen(when, draftLifecycle)}
                    </span>
                  </div>
                  <ConditionNodeEditor
                    node={when}
                    targetEntity={rule.targetEntity}
                    draftLifecycle={draftLifecycle}
                    canRemove={false}
                    onChange={(next) => updateRule(ri, { when: next })}
                  />
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
  const [stages, setStages] = useState<StageDef[]>(LIFECYCLE_TEMPLATES.delivery.stages);
  const [workItemTypes, setWorkItemTypes] = useState<WorkItemTypeDef[]>(
    LIFECYCLE_TEMPLATES.delivery.workItemTypes
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
      setStages(lifecycle.stages.map((s) => ({ ...s })));
      setWorkItemTypes(
        (lifecycle.workItemTypes?.length
          ? lifecycle.workItemTypes
          : lifecycle.decomposition === 'delivery'
            ? LIFECYCLE_TEMPLATES.delivery.workItemTypes
            : []
        ).map((t) => ({ ...t, stages: t.stages.map((s) => ({ ...s })) }))
      );
      setProductIds(lifecycle.productIds ?? []);
      setAutomationRules(
        (lifecycle.automationRules ?? []).map((r) => ({
          ...r,
          when: normalizeRuleWhen(r),
        }))
      );
    } else {
      const tpl = LIFECYCLE_TEMPLATES.delivery;
      setLabel('');
      setSummary(tpl.summary);
      setStages(tpl.stages.map((s) => ({ ...s })));
      setWorkItemTypes(
        tpl.workItemTypes.map((t) => ({ ...t, stages: t.stages.map((s) => ({ ...s })) }))
      );
      setProductIds([]);
      setAutomationRules(
        tpl.automationRules.map((r) => ({
          ...r,
          id: newRuleId(),
          when: normalizeRuleWhen(r),
        }))
      );
    }
  }, [open, lifecycle]);

  function applyTemplate(mode: DecompositionMode, force = false) {
    const tpl = LIFECYCLE_TEMPLATES[mode];
    const stagesEmpty = stages.every((s) => !s.name.trim());
    if (
      !force &&
      !stagesEmpty &&
      !window.confirm('Replace the current configuration with the selected template?')
    ) {
      return;
    }
    setStages(tpl.stages.map((s) => ({ ...s })));
    setWorkItemTypes(
      tpl.workItemTypes.map((t) => ({ ...t, stages: t.stages.map((s) => ({ ...s })) }))
    );
    setAutomationRules(
      tpl.automationRules.map((r) => ({
        ...r,
        id: newRuleId(),
        when: normalizeRuleWhen(r),
      }))
    );
    if (!label.trim()) setLabel(tpl.label);
    if (!summary.trim()) setSummary(tpl.summary);
  }

  const draftForReqs = useMemo(
    () =>
      ({
        id: '_',
        label: '',
        summary: '',
        decomposition: 'delivery' as const,
        stages,
        storyStages: workItemTypes.find((t) => t.id === 'story')?.stages ?? [],
        workItemTypes,
        productIds: [],
        automationRules: [],
      }) satisfies Lifecycle,
    [stages, workItemTypes]
  );

  const requirementOptions = requirementsForLifecycle(draftForReqs);
  const storyStages =
    workItemTypes.find((t) => t.id === 'story')?.stages ??
    workItemTypes.flatMap((t) => t.stages);

  const valid =
    label.trim().length > 1 &&
    productIds.length > 0 &&
    stages.length > 0 &&
    stages.every((s) => s.name.trim().length > 0) &&
    workItemTypes.every((t) => t.id.trim().length > 0 && t.label.trim().length > 0);

  function submit() {
    if (!valid) return;
    const legacy = syncLegacyFromTypes({ workItemTypes, stages });
    const payload = {
      label: label.trim(),
      summary: summary.trim(),
      decomposition: legacy.decomposition,
      stages: stages.map((s) => ({
        ...s,
        name: s.name.trim(),
        contentMode: s.contentMode ?? 'inline',
        opensTypeId: (s.contentMode ?? 'inline') === 'table' ? s.opensTypeId ?? null : null,
      })),
      storyStages: legacy.storyStages.map((s) => ({ ...s, name: s.name.trim() })),
      workItemTypes: workItemTypes.map((t) => ({
        ...t,
        id: slugifyTypeId(t.id) || t.id,
        label: t.label.trim(),
        pluralLabel: t.pluralLabel.trim() || `${t.label.trim()}s`,
        stages: t.stages.map((s) => ({ ...s, name: s.name.trim() })),
      })),
      productIds,
      automationRules: automationRules.map((r) => ({
        ...r,
        when: normalizeRuleWhen(r),
      })),
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

        <div className="flex flex-wrap gap-2">
          <Button variant="quiet" type="button" onClick={() => applyTemplate('delivery')}>
            Apply delivery template
          </Button>
          <Button variant="quiet" type="button" onClick={() => applyTemplate('none')}>
            Apply hardware template
          </Button>
        </div>

        <WorkItemTypesEditor types={workItemTypes} onChange={setWorkItemTypes} />

        <StageListEditor
          title="Capability stages"
          stages={stages}
          requirementOptions={requirementOptions}
          typeOptions={workItemTypes}
          onChange={setStages}
          withAutoStatus
          allowTableLink
        />

        <AutomationRulesEditor
          rules={automationRules}
          lifecycleDraft={{
            stages,
            storyStages,
            workItemTypes,
          }}
          onChange={setAutomationRules}
        />
      </div>
    </Modal>
  );
}
