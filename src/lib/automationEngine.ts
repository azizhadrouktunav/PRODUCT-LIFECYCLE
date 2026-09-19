import type {
  AutoEntity,
  AutoField,
  AutomationCondition,
  AutomationRule,
  Capability,
  CapabilityGroup,
  CapabilityStatus,
  Epic,
  Equipment,
  Feature,
  Lifecycle,
  UserStory,
  Wave,
} from '../types/registry';
import { isAutoManagedStatus } from '../types/registry';
import { waveStories } from '../utils/scope';

export interface AutomationRegistry {
  groups: CapabilityGroup[];
  capabilities: Capability[];
  epics: Epic[];
  features: Feature[];
  stories: UserStory[];
  waves: Wave[];
  equipment: Equipment[];
}

type TargetRef =
  | { entity: 'capability'; id: string }
  | { entity: 'epic'; id: string }
  | { entity: 'feature'; id: string }
  | { entity: 'story'; id: string }
  | { entity: 'wave'; id: string }
  | { entity: 'equipment'; id: string };

function trackOfCapability(cap: Capability, groups: CapabilityGroup[]): string {
  return groups.find((g) => g.id === cap.groupId)?.track ?? '';
}

function capabilityOfEpic(epic: Epic, caps: Capability[]): Capability | undefined {
  return caps.find((c) => c.id === epic.capabilityId);
}

function capabilityOfFeature(
  feature: Feature,
  epics: Epic[],
  caps: Capability[]
): Capability | undefined {
  const epic = epics.find((e) => e.id === feature.epicId);
  return epic ? capabilityOfEpic(epic, caps) : undefined;
}

function capabilityOfStory(
  story: UserStory,
  features: Feature[],
  epics: Epic[],
  caps: Capability[]
): Capability | undefined {
  const feature = features.find((f) => f.id === story.featureId);
  return feature ? capabilityOfFeature(feature, epics, caps) : undefined;
}

function sharesProducts(a: string[] | undefined, b: string[] | undefined): boolean {
  if (!a?.length || !b?.length) return false;
  const set = new Set(a);
  return b.some((id) => set.has(id));
}

function fieldValue(
  entity: AutoEntity,
  id: string,
  field: AutoField,
  reg: AutomationRegistry
): string | null {
  if (entity === 'capability') {
    const row = reg.capabilities.find((c) => c.id === id);
    if (!row) return null;
    if (field === 'status') return row.status;
    if (field === 'progress') return row.progress;
    return null;
  }
  if (entity === 'epic') {
    const row = reg.epics.find((e) => e.id === id);
    if (!row || field !== 'status') return null;
    return row.status;
  }
  if (entity === 'feature') {
    const row = reg.features.find((f) => f.id === id);
    if (!row || field !== 'status') return null;
    return row.status;
  }
  if (entity === 'story') {
    const row = reg.stories.find((s) => s.id === id);
    if (!row) return null;
    if (field === 'status') return row.status;
    if (field === 'stage') return row.stage;
    return null;
  }
  if (entity === 'wave') {
    const row = reg.waves.find((w) => w.id === id);
    if (!row || field !== 'state') return null;
    return row.state;
  }
  if (entity === 'equipment') {
    const row = reg.equipment.find((e) => e.id === id);
    if (!row || field !== 'status') return null;
    return row.status;
  }
  return null;
}

function relatedSourceIds(
  target: TargetRef,
  sourceEntity: AutoEntity,
  reg: AutomationRegistry
): string[] {
  const { epics, features, stories, capabilities, waves } = reg;

  if (target.entity === 'epic') {
    if (sourceEntity === 'feature') {
      return features.filter((f) => f.epicId === target.id).map((f) => f.id);
    }
    if (sourceEntity === 'story') {
      const fids = new Set(features.filter((f) => f.epicId === target.id).map((f) => f.id));
      return stories.filter((s) => fids.has(s.featureId)).map((s) => s.id);
    }
    if (sourceEntity === 'capability') {
      const epic = epics.find((e) => e.id === target.id);
      return epic ? [epic.capabilityId] : [];
    }
  }

  if (target.entity === 'feature') {
    if (sourceEntity === 'story') {
      return stories.filter((s) => s.featureId === target.id).map((s) => s.id);
    }
    if (sourceEntity === 'epic') {
      const feature = features.find((f) => f.id === target.id);
      return feature ? [feature.epicId] : [];
    }
  }

  if (target.entity === 'story') {
    const story = stories.find((s) => s.id === target.id);
    if (!story) return [];
    if (sourceEntity === 'feature') return [story.featureId];
    if (sourceEntity === 'epic') {
      const feature = features.find((f) => f.id === story.featureId);
      return feature ? [feature.epicId] : [];
    }
    if (sourceEntity === 'capability') {
      const cap = capabilityOfStory(story, features, epics, capabilities);
      return cap ? [cap.id] : [];
    }
  }

  if (target.entity === 'capability') {
    if (sourceEntity === 'epic') {
      return epics.filter((e) => e.capabilityId === target.id).map((e) => e.id);
    }
    if (sourceEntity === 'feature') {
      const eids = new Set(epics.filter((e) => e.capabilityId === target.id).map((e) => e.id));
      return features.filter((f) => eids.has(f.epicId)).map((f) => f.id);
    }
    if (sourceEntity === 'story') {
      const eids = new Set(epics.filter((e) => e.capabilityId === target.id).map((e) => e.id));
      const fids = new Set(features.filter((f) => eids.has(f.epicId)).map((f) => f.id));
      return stories.filter((s) => fids.has(s.featureId)).map((s) => s.id);
    }
    if (sourceEntity === 'equipment') {
      const cap = capabilities.find((c) => c.id === target.id);
      return cap?.equipmentIds ?? [];
    }
  }

  if (target.entity === 'equipment') {
    if (sourceEntity === 'capability') {
      return capabilities
        .filter((c) => c.equipmentIds.includes(target.id))
        .map((c) => c.id);
    }
  }

  if (target.entity === 'wave') {
    const wave = waves.find((w) => w.id === target.id);
    if (!wave) return [];
    if (sourceEntity === 'story') {
      return waveStories(wave, { epics, features, stories }).map((s) => s.id);
    }
    if (sourceEntity === 'capability') {
      return wave.itemIds.filter((id) => id.startsWith('CAP-'));
    }
    if (sourceEntity === 'epic') {
      return wave.itemIds.filter((id) => id.startsWith('EPIC-'));
    }
    if (sourceEntity === 'feature') {
      return wave.itemIds.filter((id) => id.startsWith('FEAT-'));
    }
  }

  return [];
}

function matchesOp(actual: string | null, op: 'eq' | 'neq', expected: string): boolean {
  const left = actual ?? '';
  if (op === 'eq') return left === expected;
  return left !== expected;
}

function conditionHolds(
  target: TargetRef,
  condition: AutomationCondition,
  reg: AutomationRegistry
): boolean {
  const ids = relatedSourceIds(target, condition.sourceEntity, reg);
  if (ids.length === 0) {
    // No related rows: only "none" succeeds (not vacuously "all").
    return condition.aggregate === 'none';
  }
  const hits = ids.map((id) =>
    matchesOp(
      fieldValue(condition.sourceEntity, id, condition.sourceField, reg),
      condition.op,
      condition.value
    )
  );
  if (condition.aggregate === 'all') return hits.every(Boolean);
  if (condition.aggregate === 'any') return hits.some(Boolean);
  return hits.every((h) => !h); // none: no row matches the predicate
}

function targetLinkedToLifecycle(
  target: TargetRef,
  lifecycle: Lifecycle,
  reg: AutomationRegistry
): boolean {
  const { groups, capabilities, epics, features, stories, equipment, waves } = reg;

  if (target.entity === 'capability') {
    const cap = capabilities.find((c) => c.id === target.id);
    return !!cap && trackOfCapability(cap, groups) === lifecycle.id;
  }
  if (target.entity === 'epic') {
    const epic = epics.find((e) => e.id === target.id);
    const cap = epic ? capabilityOfEpic(epic, capabilities) : undefined;
    return !!cap && trackOfCapability(cap, groups) === lifecycle.id;
  }
  if (target.entity === 'feature') {
    const feature = features.find((f) => f.id === target.id);
    const cap = feature ? capabilityOfFeature(feature, epics, capabilities) : undefined;
    return !!cap && trackOfCapability(cap, groups) === lifecycle.id;
  }
  if (target.entity === 'story') {
    const story = stories.find((s) => s.id === target.id);
    const cap = story
      ? capabilityOfStory(story, features, epics, capabilities)
      : undefined;
    return !!cap && trackOfCapability(cap, groups) === lifecycle.id;
  }
  if (target.entity === 'equipment') {
    const eq = equipment.find((e) => e.id === target.id);
    if (!eq) return false;
    const linked = capabilities.filter((c) => c.equipmentIds.includes(eq.id));
    if (linked.some((c) => trackOfCapability(c, groups) === lifecycle.id)) return true;
    return sharesProducts(eq.productIds, lifecycle.productIds);
  }
  if (target.entity === 'wave') {
    const wave = waves.find((w) => w.id === target.id);
    if (!wave) return false;
    if (sharesProducts(wave.productIds, lifecycle.productIds)) return true;
    const scoped = waveStories(wave, { epics, features, stories });
    return scoped.some((s) => {
      const cap = capabilityOfStory(s, features, epics, capabilities);
      return !!cap && trackOfCapability(cap, groups) === lifecycle.id;
    });
  }
  return false;
}

function currentStatus(target: TargetRef, reg: AutomationRegistry): CapabilityStatus | null {
  if (target.entity === 'capability') {
    return reg.capabilities.find((c) => c.id === target.id)?.status ?? null;
  }
  if (target.entity === 'epic') {
    return reg.epics.find((e) => e.id === target.id)?.status ?? null;
  }
  if (target.entity === 'feature') {
    return reg.features.find((f) => f.id === target.id)?.status ?? null;
  }
  if (target.entity === 'story') {
    return reg.stories.find((s) => s.id === target.id)?.status ?? null;
  }
  if (target.entity === 'equipment') {
    return reg.equipment.find((e) => e.id === target.id)?.status ?? null;
  }
  return null;
}

function applyField(
  target: TargetRef,
  field: AutoField,
  value: string,
  reg: AutomationRegistry
): boolean {
  if (field === 'status' && !isAutoManagedStatus(currentStatus(target, reg))) {
    return false;
  }

  if (target.entity === 'capability') {
    const i = reg.capabilities.findIndex((c) => c.id === target.id);
    if (i < 0) return false;
    const row = reg.capabilities[i];
    if (field === 'status') {
      const next = (value || null) as CapabilityStatus | null;
      if (row.status === next) return false;
      reg.capabilities[i] = { ...row, status: next };
      return true;
    }
    if (field === 'progress') {
      if (row.progress === value) return false;
      reg.capabilities[i] = { ...row, progress: value };
      return true;
    }
  }

  if (target.entity === 'epic' && field === 'status') {
    const i = reg.epics.findIndex((e) => e.id === target.id);
    if (i < 0) return false;
    const row = reg.epics[i];
    const next = (value || null) as CapabilityStatus | null;
    if (row.status === next) return false;
    reg.epics[i] = { ...row, status: next };
    return true;
  }

  if (target.entity === 'feature' && field === 'status') {
    const i = reg.features.findIndex((f) => f.id === target.id);
    if (i < 0) return false;
    const row = reg.features[i];
    const next = (value || null) as CapabilityStatus | null;
    if (row.status === next) return false;
    reg.features[i] = { ...row, status: next };
    return true;
  }

  if (target.entity === 'story') {
    const i = reg.stories.findIndex((s) => s.id === target.id);
    if (i < 0) return false;
    const row = reg.stories[i];
    if (field === 'status') {
      const next = (value || null) as CapabilityStatus | null;
      if (row.status === next) return false;
      reg.stories[i] = { ...row, status: next };
      return true;
    }
    if (field === 'stage') {
      if (row.stage === value) return false;
      reg.stories[i] = { ...row, stage: value };
      return true;
    }
  }

  if (target.entity === 'wave' && field === 'state') {
    const i = reg.waves.findIndex((w) => w.id === target.id);
    if (i < 0) return false;
    const row = reg.waves[i];
    if (row.state === value) return false;
    reg.waves[i] = { ...row, state: value as Wave['state'] };
    return true;
  }

  if (target.entity === 'equipment' && field === 'status') {
    const i = reg.equipment.findIndex((e) => e.id === target.id);
    if (i < 0) return false;
    const row = reg.equipment[i];
    const next = (value || null) as CapabilityStatus | null;
    if (row.status === next) return false;
    reg.equipment[i] = { ...row, status: next };
    return true;
  }

  return false;
}

function targetsForEntity(
  entity: AutoEntity,
  lifecycle: Lifecycle,
  reg: AutomationRegistry
): TargetRef[] {
  if (entity === 'capability') {
    return reg.capabilities
      .filter((c) => trackOfCapability(c, reg.groups) === lifecycle.id)
      .map((c) => ({ entity: 'capability' as const, id: c.id }));
  }
  if (entity === 'epic') {
    return reg.epics
      .filter((e) => {
        const cap = capabilityOfEpic(e, reg.capabilities);
        return !!cap && trackOfCapability(cap, reg.groups) === lifecycle.id;
      })
      .map((e) => ({ entity: 'epic' as const, id: e.id }));
  }
  if (entity === 'feature') {
    return reg.features
      .filter((f) => {
        const cap = capabilityOfFeature(f, reg.epics, reg.capabilities);
        return !!cap && trackOfCapability(cap, reg.groups) === lifecycle.id;
      })
      .map((f) => ({ entity: 'feature' as const, id: f.id }));
  }
  if (entity === 'story') {
    return reg.stories
      .filter((s) => {
        const cap = capabilityOfStory(s, reg.features, reg.epics, reg.capabilities);
        return !!cap && trackOfCapability(cap, reg.groups) === lifecycle.id;
      })
      .map((s) => ({ entity: 'story' as const, id: s.id }));
  }
  if (entity === 'wave') {
    return reg.waves
      .filter((w) => targetLinkedToLifecycle({ entity: 'wave', id: w.id }, lifecycle, reg))
      .map((w) => ({ entity: 'wave' as const, id: w.id }));
  }
  if (entity === 'equipment') {
    return reg.equipment
      .filter((e) =>
        targetLinkedToLifecycle({ entity: 'equipment', id: e.id }, lifecycle, reg)
      )
      .map((e) => ({ entity: 'equipment' as const, id: e.id }));
  }
  return [];
}

export interface AutomationChanges {
  capabilities: Capability[];
  epics: Epic[];
  features: Feature[];
  stories: UserStory[];
  waves: Wave[];
  equipment: Equipment[];
  changed: {
    capabilities: Capability[];
    epics: Epic[];
    features: Feature[];
    stories: UserStory[];
    waves: Wave[];
    equipment: Equipment[];
  };
}

/**
 * Evaluate all enabled rules on all lifecycles against a mutable registry copy.
 * Returns updated arrays plus which rows changed (for persistence).
 */
export function runAutomation(
  lifecycles: Lifecycle[],
  input: AutomationRegistry
): AutomationChanges {
  const reg: AutomationRegistry = {
    groups: input.groups,
    capabilities: [...input.capabilities],
    epics: [...input.epics],
    features: [...input.features],
    stories: [...input.stories],
    waves: [...input.waves],
    equipment: [...input.equipment],
  };

  const changedIds = {
    capabilities: new Set<string>(),
    epics: new Set<string>(),
    features: new Set<string>(),
    stories: new Set<string>(),
    waves: new Set<string>(),
    equipment: new Set<string>(),
  };

  // Multiple passes so parent rollups settle (story → feature → epic).
  for (let pass = 0; pass < 3; pass++) {
    for (const lifecycle of lifecycles) {
      const rules = (lifecycle.automationRules ?? []).filter((r) => r.enabled);
      for (const rule of rules) {
        applyRule(rule, lifecycle, reg, changedIds);
      }
    }
  }

  return {
    capabilities: reg.capabilities,
    epics: reg.epics,
    features: reg.features,
    stories: reg.stories,
    waves: reg.waves,
    equipment: reg.equipment,
    changed: {
      capabilities: reg.capabilities.filter((c) => changedIds.capabilities.has(c.id)),
      epics: reg.epics.filter((e) => changedIds.epics.has(e.id)),
      features: reg.features.filter((f) => changedIds.features.has(f.id)),
      stories: reg.stories.filter((s) => changedIds.stories.has(s.id)),
      waves: reg.waves.filter((w) => changedIds.waves.has(w.id)),
      equipment: reg.equipment.filter((e) => changedIds.equipment.has(e.id)),
    },
  };
}

function applyRule(
  rule: AutomationRule,
  lifecycle: Lifecycle,
  reg: AutomationRegistry,
  changedIds: Record<keyof AutomationChanges['changed'], Set<string>>
): void {
  const targets = targetsForEntity(rule.targetEntity, lifecycle, reg);
  for (const target of targets) {
    if (!targetLinkedToLifecycle(target, lifecycle, reg)) continue;
    const ok = rule.conditions.every((c) => conditionHolds(target, c, reg));
    if (!ok) continue;
    const did = applyField(target, rule.targetField, rule.setValue, reg);
    if (did) {
      const bucket =
        target.entity === 'capability'
          ? 'capabilities'
          : target.entity === 'epic'
            ? 'epics'
            : target.entity === 'feature'
              ? 'features'
              : target.entity === 'story'
                ? 'stories'
                : target.entity === 'wave'
                  ? 'waves'
                  : 'equipment';
      changedIds[bucket].add(target.id);
    }
  }
}
