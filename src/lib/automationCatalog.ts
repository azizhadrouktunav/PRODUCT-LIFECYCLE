import type {
  AutoEntity,
  AutoField,
  AutomationCondition,
  ConditionNode,
  Lifecycle,
} from '../types/registry';
import {
  CAPABILITY_STATUSES,
  WAVE_STATES,
  autoEntityForType,
  isWorkItemAutoEntity,
  storyStagesOf,
  workItemTypeIdFromAuto,
} from '../types/registry';

export const AUTO_ENTITY_LABEL: Record<string, string> = {
  capability: 'Capability',
  epic: 'Epic',
  feature: 'Feature',
  story: 'User story',
  wave: 'Wave',
  equipment: 'Equipment',
};

export function entityLabel(entity: AutoEntity, lifecycle?: Lifecycle): string {
  if (AUTO_ENTITY_LABEL[entity]) return AUTO_ENTITY_LABEL[entity];
  if (isWorkItemAutoEntity(entity) && lifecycle) {
    const typeId = workItemTypeIdFromAuto(entity);
    const t = lifecycle.workItemTypes?.find((w) => w.id === typeId);
    if (t) return t.label;
  }
  if (isWorkItemAutoEntity(entity)) {
    return workItemTypeIdFromAuto(entity) ?? entity;
  }
  return entity;
}

export const AUTO_FIELD_LABEL: Record<AutoField, string> = {
  status: 'Status',
  progress: 'Progress',
  stage: 'Stage',
  state: 'State',
};

export const AUTO_AGGREGATE_LABEL: Record<'all' | 'any' | 'none', string> = {
  all: 'All related',
  any: 'Any related',
  none: 'None related',
};

export const AUTO_OP_LABEL: Record<'eq' | 'neq', string> = {
  eq: 'equals',
  neq: 'does not equal',
};

/** Entities available for automation given a lifecycle's work-item types. */
export function autoEntitiesForLifecycle(lifecycle: Lifecycle): AutoEntity[] {
  const base: AutoEntity[] = ['capability', 'wave', 'equipment'];
  const fromTypes = (lifecycle.workItemTypes ?? []).map((t) => autoEntityForType(t.id));
  const builtins: AutoEntity[] = ['epic', 'feature', 'story'];
  const set = new Set<AutoEntity>([...base, ...builtins, ...fromTypes]);
  return Array.from(set);
}

/** Fields each entity may target or use as a condition source. */
export function fieldsForEntity(entity: AutoEntity): AutoField[] {
  switch (entity) {
    case 'capability':
      return ['status', 'progress'];
    case 'epic':
    case 'feature':
    case 'equipment':
      return ['status'];
    case 'story':
      return ['status', 'stage'];
    case 'wave':
      return ['state'];
    default:
      if (isWorkItemAutoEntity(entity)) return ['status'];
      return ['status'];
  }
}

/** Known option values for a field on an entity within a lifecycle. */
export function optionsForField(
  entity: AutoEntity,
  field: AutoField,
  lifecycle: Lifecycle
): string[] {
  if (field === 'status') {
    if (isWorkItemAutoEntity(entity)) {
      const typeId = workItemTypeIdFromAuto(entity);
      const t = lifecycle.workItemTypes?.find((w) => w.id === typeId);
      if (t?.statuses?.length) return [...t.statuses];
    }
    if (entity === 'epic' || entity === 'feature' || entity === 'story') {
      const t = lifecycle.workItemTypes?.find((w) => w.id === entity);
      if (t?.statuses?.length) return [...t.statuses];
    }
    return [...CAPABILITY_STATUSES];
  }
  if (field === 'state') return [...WAVE_STATES];
  if (field === 'progress') return lifecycle.stages.map((s) => s.name);
  if (field === 'stage') {
    const stages = storyStagesOf(lifecycle);
    return (stages.length > 0 ? stages : lifecycle.stages).map((s) => s.name);
  }
  return [];
}

/** Reasonable source entities when configuring a condition for a target. */
export function relatedSourceEntities(
  target: AutoEntity,
  lifecycle?: Lifecycle
): AutoEntity[] {
  if (lifecycle?.workItemTypes?.length) {
    const types = lifecycle.workItemTypes;
    if (target === 'capability') {
      return [
        ...types.map((t) => autoEntityForType(t.id)),
        'equipment',
      ];
    }
    if (isWorkItemAutoEntity(target) || target === 'epic' || target === 'feature' || target === 'story') {
      const typeId = isWorkItemAutoEntity(target)
        ? workItemTypeIdFromAuto(target)
        : target;
      const children = types
        .filter((t) => t.parentTypeId === typeId)
        .map((t) => autoEntityForType(t.id));
      const self = types.find((t) => t.id === typeId);
      const parent = self?.parentTypeId
        ? [autoEntityForType(self.parentTypeId)]
        : ['capability' as AutoEntity];
      return [...children, ...parent];
    }
  }

  switch (target) {
    case 'capability':
      return ['epic', 'feature', 'story', 'equipment'];
    case 'epic':
      return ['feature', 'story', 'capability'];
    case 'feature':
      return ['story', 'epic'];
    case 'story':
      return ['feature', 'epic', 'capability'];
    case 'wave':
      return ['story', 'feature', 'epic', 'capability'];
    case 'equipment':
      return ['capability'];
    default:
      return ['capability'];
  }
}

export function newRuleId(): string {
  return `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function summarizeLeaf(
  condition: AutomationCondition,
  lifecycle?: Lifecycle
): string {
  const ent = entityLabel(condition.sourceEntity, lifecycle);
  const field = AUTO_FIELD_LABEL[condition.sourceField] ?? condition.sourceField;
  const agg = AUTO_AGGREGATE_LABEL[condition.aggregate] ?? condition.aggregate;
  const op = AUTO_OP_LABEL[condition.op] ?? condition.op;
  return `${agg} ${ent}.${field} ${op} ${condition.value}`;
}

/** Human-readable combination summary, e.g. AND( … , NOT( … ) ). */
export function summarizeWhen(node: ConditionNode, lifecycle?: Lifecycle): string {
  if (node.kind === 'leaf') {
    const body = summarizeLeaf(node.condition, lifecycle);
    return node.not ? `NOT( ${body} )` : body;
  }
  const inner = node.children.map((c) => summarizeWhen(c, lifecycle)).join(', ');
  const body = `${node.op.toUpperCase()}( ${inner} )`;
  return node.not ? `NOT( ${body} )` : body;
}
