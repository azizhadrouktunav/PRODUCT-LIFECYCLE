import type {
  AutoEntity,
  AutoField,
  Lifecycle,
} from '../types/registry';
import { CAPABILITY_STATUSES, WAVE_STATES } from '../types/registry';

export const AUTO_ENTITY_LABEL: Record<AutoEntity, string> = {
  capability: 'Capability',
  epic: 'Epic',
  feature: 'Feature',
  story: 'User story',
  wave: 'Wave',
  equipment: 'Equipment',
};

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
      return ['status'];
  }
}

/** Known option values for a field on an entity within a lifecycle. */
export function optionsForField(
  _entity: AutoEntity,
  field: AutoField,
  lifecycle: Lifecycle
): string[] {
  if (field === 'status') return [...CAPABILITY_STATUSES];
  if (field === 'state') return [...WAVE_STATES];
  if (field === 'progress') return lifecycle.stages.map((s) => s.name);
  if (field === 'stage') {
    const stages =
      lifecycle.storyStages.length > 0
        ? lifecycle.storyStages
        : lifecycle.stages;
    return stages.map((s) => s.name);
  }
  return [];
}

/** Reasonable source entities when configuring a condition for a target. */
export function relatedSourceEntities(target: AutoEntity): AutoEntity[] {
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
      return [];
  }
}

export function newRuleId(): string {
  return `rule-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
