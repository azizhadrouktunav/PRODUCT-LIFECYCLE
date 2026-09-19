export type StageTone =
  | 'blue'
  | 'cyan'
  | 'amber'
  | 'orange'
  | 'green'
  | 'red'
  | 'violet'
  | 'pink'
  | 'gray';

/**
 * What must exist before a stage is credible.
 * Built-in keys kept for templates; any work-item type id is also valid.
 */
export type StageRequirement = string;

export const BUILTIN_REQUIREMENTS = ['none', 'epics', 'features', 'stories', 'equipment'] as const;

export const REQUIREMENT_LABEL: Record<string, string> = {
  none: 'no prerequisite',
  epics: 'needs at least one epic',
  features: 'needs at least one feature',
  stories: 'needs at least one user story',
  equipment: 'needs at least one linked equipment model',
};

/** How a capability/type stage relates to work items. */
export type StageContentMode = 'inline' | 'table';

export const STAGE_TONES: StageTone[] = [
  'blue',
  'cyan',
  'amber',
  'orange',
  'green',
  'red',
  'violet',
  'pink',
  'gray',
];

/** Operational / derived status flags (progress stage is separate). */
export type CapabilityStatus =
  | 'On Hold'
  | 'In Progress'
  | 'Needs Review'
  | 'Completed';

export const CAPABILITY_STATUSES: CapabilityStatus[] = [
  'On Hold',
  'In Progress',
  'Needs Review',
  'Completed',
];

/** Manual-only flags a user may set without fighting auto-derived status. */
export const MANUAL_CAPABILITY_STATUSES: CapabilityStatus[] = ['On Hold', 'Needs Review'];

export interface StageDef {
  name: string;
  description: string;
  tone: StageTone;
  requirement: StageRequirement;
  /** Status applied automatically when this stage is the capability's progress. */
  status?: CapabilityStatus | null;
  /** inline = progress only; table = manage rows of opensTypeId. */
  contentMode?: StageContentMode;
  /** When contentMode === 'table', which work-item type this stage opens. */
  opensTypeId?: string | null;
}

/** Configurable hierarchy level for a lifecycle. */
export interface WorkItemTypeDef {
  id: string;
  label: string;
  pluralLabel: string;
  /** null = roots under the capability. */
  parentTypeId: string | null;
  statuses: string[];
  /** Optional progress stages for items of this type (nested stages). */
  stages: StageDef[];
  /** builtin → epic/feature/story/equipment tables; custom → work_items. */
  storage: 'builtin' | 'custom';
}

/** Lifecycle id stored on capability groups (`track` column). */
export type TrackId = string;

/** @deprecated Derived from workItemTypes — kept for UI labels and legacy reads. */
export type DecompositionMode = 'none' | 'delivery';

export const DECOMPOSITION_LABEL: Record<DecompositionMode, string> = {
  none: 'no decomposition',
  delivery: 'epics → features → stories',
};

export const DEFAULT_WORK_ITEM_STATUSES: string[] = [
  'On Hold',
  'In Progress',
  'Needs Review',
  'Completed',
];

export interface Lifecycle {
  id: TrackId;
  label: string;
  summary: string;
  /** @deprecated Prefer workItemTypes; synced for templates / legacy. */
  decomposition: DecompositionMode;
  stages: StageDef[];
  /** @deprecated Prefer workItemTypes[id=story].stages */
  storyStages: StageDef[];
  /** Ordered hierarchy levels (customizable). */
  workItemTypes: WorkItemTypeDef[];
  productIds: string[];
  /** Cross-table status automation rules for this lifecycle. */
  automationRules: AutomationRule[];
}

/**
 * Entities that can participate in lifecycle automation rules.
 * Custom work-item types use `work_item:<typeId>`.
 */
export type AutoEntity =
  | 'capability'
  | 'epic'
  | 'feature'
  | 'story'
  | 'wave'
  | 'equipment'
  | `work_item:${string}`;

/** Option fields that automation may read or write. */
export type AutoField = 'status' | 'progress' | 'stage' | 'state';

export type AutoAggregate = 'all' | 'any' | 'none';
export type AutoOp = 'eq' | 'neq';
export type ConditionCombineOp = 'and' | 'or';

export interface AutomationCondition {
  sourceEntity: AutoEntity;
  sourceField: AutoField;
  aggregate: AutoAggregate;
  op: AutoOp;
  value: string;
}

/** Boolean tree for rule conditions (AND / OR / NOT). */
export type ConditionNode =
  | { kind: 'leaf'; not?: boolean; condition: AutomationCondition }
  | { kind: 'group'; op: ConditionCombineOp; not?: boolean; children: ConditionNode[] };

export interface AutomationRule {
  id: string;
  enabled: boolean;
  targetEntity: AutoEntity;
  targetField: AutoField;
  setValue: string;
  /** Boolean condition tree. */
  when: ConditionNode;
  /**
   * @deprecated Flat AND list — migrated into `when` on load.
   * Kept optional so older jsonb rows still parse.
   */
  conditions?: AutomationCondition[];
}

export const AUTO_ENTITIES: AutoEntity[] = [
  'capability',
  'epic',
  'feature',
  'story',
  'wave',
  'equipment',
];

export const AUTO_AGGREGATES: AutoAggregate[] = ['all', 'any', 'none'];
export const AUTO_OPS: AutoOp[] = ['eq', 'neq'];

export function isWorkItemAutoEntity(entity: AutoEntity): entity is `work_item:${string}` {
  return typeof entity === 'string' && entity.startsWith('work_item:');
}

export function workItemTypeIdFromAuto(entity: AutoEntity): string | null {
  if (!isWorkItemAutoEntity(entity)) return null;
  return entity.slice('work_item:'.length) || null;
}

export function autoEntityForType(typeId: string): AutoEntity {
  if (typeId === 'epic' || typeId === 'feature' || typeId === 'story' || typeId === 'equipment') {
    return typeId;
  }
  if (typeId === 'capability' || typeId === 'wave') return typeId;
  return `work_item:${typeId}`;
}

export function conditionsToWhen(conditions: AutomationCondition[]): ConditionNode {
  return {
    kind: 'group',
    op: 'and',
    children: conditions.map((condition) => ({ kind: 'leaf' as const, condition })),
  };
}

export function normalizeRuleWhen(rule: Partial<AutomationRule> & { conditions?: AutomationCondition[] }): ConditionNode {
  if (rule.when && typeof rule.when === 'object') return rule.when;
  if (Array.isArray(rule.conditions) && rule.conditions.length > 0) {
    return conditionsToWhen(rule.conditions);
  }
  return { kind: 'group', op: 'and', children: [] };
}

export function flattenWhenLeaves(node: ConditionNode): AutomationCondition[] {
  if (node.kind === 'leaf') return [node.condition];
  return node.children.flatMap(flattenWhenLeaves);
}

/** @deprecated Use Lifecycle — kept as an alias for gradual migration. */
export type Track = Lifecycle;

const HARDWARE_STAGES: StageDef[] = [
  {
    name: 'Identified',
    description: 'The hardware capability has been identified and documented.',
    tone: 'blue',
    requirement: 'none',
    status: 'In Progress',
    contentMode: 'inline',
  },
  {
    name: 'Ready for Assignment',
    description: 'Ready to be assigned to compatible equipment.',
    tone: 'violet',
    requirement: 'none',
    status: 'In Progress',
    contentMode: 'inline',
  },
  {
    name: 'Assigned to Equipment',
    description: 'The capability has been linked to one or more equipment models.',
    tone: 'blue',
    requirement: 'equipment',
    status: 'In Progress',
    contentMode: 'inline',
  },
  {
    name: 'Active',
    description: 'The capability is officially active and usable.',
    tone: 'green',
    requirement: 'equipment',
    status: 'Completed',
    contentMode: 'inline',
  },
];

const DELIVERY_STAGES: StageDef[] = [
  {
    name: 'Identified',
    description: 'The capability has been identified and written down.',
    tone: 'blue',
    requirement: 'none',
    status: 'In Progress',
    contentMode: 'inline',
  },
  {
    name: 'Epic Definition',
    description: 'The capability is being divided into epics.',
    tone: 'violet',
    requirement: 'none',
    status: 'In Progress',
    contentMode: 'table',
    opensTypeId: 'epic',
  },
  {
    name: 'Feature Definition',
    description: 'Each epic is being divided into features.',
    tone: 'violet',
    requirement: 'epics',
    status: 'In Progress',
    contentMode: 'table',
    opensTypeId: 'feature',
  },
  {
    name: 'User Story Definition',
    description: 'Each feature is being divided into user stories.',
    tone: 'violet',
    requirement: 'features',
    status: 'Completed',
    contentMode: 'table',
    opensTypeId: 'story',
  },
];

/** Default story pipeline used when creating a delivery-style lifecycle. */
export const DEFAULT_STORY_STAGES: StageDef[] = [
  {
    name: 'In UI/UX Design',
    description: 'UI/UX design is in progress.',
    tone: 'pink',
    requirement: 'none',
    contentMode: 'inline',
  },
  {
    name: 'In Architecture',
    description:
      'The story is analysed for feasibility and given a technical approval, recorded as an ADR with the technical information needed to build it.',
    tone: 'orange',
    requirement: 'none',
    contentMode: 'inline',
  },
  {
    name: 'In Development',
    description: 'Development is in progress.',
    tone: 'cyan',
    requirement: 'none',
    contentMode: 'inline',
  },
  {
    name: 'In Testing',
    description: 'The functionality is being tested.',
    tone: 'violet',
    requirement: 'none',
    contentMode: 'inline',
  },
  {
    name: 'Ready for Deploy',
    description: 'The work is finished and being deployed.',
    tone: 'green',
    requirement: 'none',
    contentMode: 'inline',
  },
  {
    name: 'Released',
    description: 'The story is released and available.',
    tone: 'blue',
    requirement: 'none',
    contentMode: 'inline',
  },
];

export const DELIVERY_WORK_ITEM_TYPES: WorkItemTypeDef[] = [
  {
    id: 'epic',
    label: 'Epic',
    pluralLabel: 'Epics',
    parentTypeId: null,
    statuses: [...DEFAULT_WORK_ITEM_STATUSES],
    stages: [],
    storage: 'builtin',
  },
  {
    id: 'feature',
    label: 'Feature',
    pluralLabel: 'Features',
    parentTypeId: 'epic',
    statuses: [...DEFAULT_WORK_ITEM_STATUSES],
    stages: [],
    storage: 'builtin',
  },
  {
    id: 'story',
    label: 'User story',
    pluralLabel: 'User stories',
    parentTypeId: 'feature',
    statuses: [...DEFAULT_WORK_ITEM_STATUSES],
    stages: DEFAULT_STORY_STAGES,
    storage: 'builtin',
  },
];

function leafWhen(
  sourceEntity: AutoEntity,
  sourceField: AutoField,
  value: string,
  aggregate: AutoAggregate = 'all'
): ConditionNode {
  return {
    kind: 'group',
    op: 'and',
    children: [
      {
        kind: 'leaf',
        condition: { sourceEntity, sourceField, aggregate, op: 'eq', value },
      },
    ],
  };
}

/** Seed / editor templates for the two built-in lifecycle styles. */
export const LIFECYCLE_TEMPLATES: Record<DecompositionMode, Omit<Lifecycle, 'id'>> = {
  none: {
    label: 'Hardware review track',
    summary:
      'Hardware capabilities are not decomposed into epics, features or user stories. Once identified they are made ready for assignment, linked to the equipment models that support them, and then activated.',
    decomposition: 'none',
    stages: HARDWARE_STAGES,
    storyStages: [],
    workItemTypes: [],
    productIds: [],
    automationRules: [
      {
        id: 'tpl-hw-equip-completed',
        enabled: true,
        targetEntity: 'equipment',
        targetField: 'status',
        setValue: 'Completed',
        when: leafWhen('capability', 'status', 'Completed'),
      },
    ],
  },
  delivery: {
    label: 'Delivery track',
    summary:
      'Software capabilities are approved, decomposed into epics, then features, then user stories, and follow those stories through design, development, testing and release.',
    decomposition: 'delivery',
    stages: DELIVERY_STAGES,
    storyStages: DEFAULT_STORY_STAGES,
    workItemTypes: DELIVERY_WORK_ITEM_TYPES,
    productIds: [],
    automationRules: [
      {
        id: 'tpl-del-feature-completed',
        enabled: true,
        targetEntity: 'feature',
        targetField: 'status',
        setValue: 'Completed',
        when: leafWhen('story', 'status', 'Completed'),
      },
      {
        id: 'tpl-del-epic-completed',
        enabled: true,
        targetEntity: 'epic',
        targetField: 'status',
        setValue: 'Completed',
        when: leafWhen('feature', 'status', 'Completed'),
      },
    ],
  },
};

/** Persisted reusable lifecycle configuration (system or user-defined). */
export interface LifecycleTemplate {
  id: string;
  label: string;
  summary: string;
  decomposition: DecompositionMode;
  stages: StageDef[];
  storyStages: StageDef[];
  workItemTypes: WorkItemTypeDef[];
  automationRules: AutomationRule[];
  productIds: string[];
  isSystem: boolean;
}

export const SYSTEM_TEMPLATE_IDS = {
  hardware: 'tpl-hardware',
  delivery: 'tpl-delivery',
} as const;

/** Built-in templates as LifecycleTemplate rows (used for seed + offline fallback). */
export function builtInLifecycleTemplates(): LifecycleTemplate[] {
  return [
    {
      id: SYSTEM_TEMPLATE_IDS.hardware,
      ...LIFECYCLE_TEMPLATES.none,
      isSystem: true,
    },
    {
      id: SYSTEM_TEMPLATE_IDS.delivery,
      ...LIFECYCLE_TEMPLATES.delivery,
      isSystem: true,
    },
  ];
}

export function templateToLifecycleDraft(
  t: Pick<
    LifecycleTemplate,
    | 'label'
    | 'summary'
    | 'decomposition'
    | 'stages'
    | 'storyStages'
    | 'workItemTypes'
    | 'automationRules'
  >
): Omit<Lifecycle, 'id' | 'productIds'> & { productIds?: string[] } {
  return {
    label: t.label,
    summary: t.summary,
    decomposition: t.decomposition,
    stages: t.stages.map((s) => ({ ...s })),
    storyStages: (t.storyStages ?? []).map((s) => ({ ...s })),
    workItemTypes: (t.workItemTypes ?? []).map((w) => ({
      ...w,
      stages: (w.stages ?? []).map((s) => ({ ...s })),
      statuses: [...(w.statuses ?? [])],
    })),
    automationRules: (t.automationRules ?? []).map((r) => ({
      ...r,
      when: normalizeRuleWhen(r),
    })),
  };
}

export function lifecycleToTemplateFields(
  lc: Pick<
    Lifecycle,
    | 'label'
    | 'summary'
    | 'decomposition'
    | 'stages'
    | 'storyStages'
    | 'workItemTypes'
    | 'automationRules'
    | 'productIds'
  >
): Omit<LifecycleTemplate, 'id' | 'isSystem'> {
  return {
    label: lc.label,
    summary: lc.summary,
    decomposition: lc.decomposition,
    stages: lc.stages.map((s) => ({ ...s })),
    storyStages: (lc.storyStages ?? []).map((s) => ({ ...s })),
    workItemTypes: (lc.workItemTypes ?? []).map((w) => ({
      ...w,
      stages: (w.stages ?? []).map((s) => ({ ...s })),
      statuses: [...(w.statuses ?? [])],
    })),
    automationRules: (lc.automationRules ?? []).map((r) => ({
      ...r,
      when: normalizeRuleWhen(r),
    })),
    productIds: lc.productIds ?? [],
  };
}

/** Fallback when a group references a missing lifecycle id. */
export const FALLBACK_LIFECYCLE: Lifecycle = {
  id: 'delivery',
  ...LIFECYCLE_TEMPLATES.delivery,
};

/**
 * Built-in seed maps (hardware / delivery). Prefer registry `lifecycles` at runtime.
 * Kept for import fallbacks and editor “start from template”.
 */
export const TRACKS: Record<string, Lifecycle> = {
  hardware: { id: 'hardware', ...LIFECYCLE_TEMPLATES.none },
  delivery: { id: 'delivery', ...LIFECYCLE_TEMPLATES.delivery },
};

/** @deprecated Prefer lifecycle.storyStages from the registry. */
export const STORY_STAGES: StageDef[] = DEFAULT_STORY_STAGES;

export const STORY_STAGE_NAMES: string[] = DEFAULT_STORY_STAGES.map((s) => s.name);

export const ALL_STAGE_NAMES: string[] = Array.from(
  new Set([...HARDWARE_STAGES, ...DELIVERY_STAGES].map((s) => s.name))
);

export function usesEquipment(lifecycle: Lifecycle): boolean {
  return (
    lifecycle.decomposition === 'none' ||
    (lifecycle.workItemTypes?.length ?? 0) === 0
  );
}

export function usesDecomposition(lifecycle: Lifecycle): boolean {
  return (
    lifecycle.decomposition === 'delivery' ||
    (lifecycle.workItemTypes?.some((t) => t.id === 'epic' || t.storage === 'custom') ?? false)
  );
}

export function rootWorkItemTypes(lifecycle: Lifecycle): WorkItemTypeDef[] {
  return (lifecycle.workItemTypes ?? []).filter((t) => t.parentTypeId == null);
}

export function childWorkItemTypes(
  lifecycle: Lifecycle,
  parentTypeId: string
): WorkItemTypeDef[] {
  return (lifecycle.workItemTypes ?? []).filter((t) => t.parentTypeId === parentTypeId);
}

export function workItemTypeDef(
  lifecycle: Lifecycle,
  typeId: string
): WorkItemTypeDef | undefined {
  return (lifecycle.workItemTypes ?? []).find((t) => t.id === typeId);
}

/**
 * Unique work-item types opened by capability stages with contentMode === 'table'.
 * Order follows the stage list; missing type ids are skipped.
 */
export function tableManageTargets(lifecycle: Lifecycle): WorkItemTypeDef[] {
  const seen = new Set<string>();
  const out: WorkItemTypeDef[] = [];
  for (const stage of lifecycle.stages ?? []) {
    if ((stage.contentMode ?? 'inline') !== 'table') continue;
    const typeId = stage.opensTypeId?.trim();
    if (!typeId || seen.has(typeId)) continue;
    const t = workItemTypeDef(lifecycle, typeId);
    if (!t) continue;
    seen.add(typeId);
    out.push(t);
  }
  return out;
}

/** Route to manage a work-item type table for a capability. */
export function manageTablePath(capabilityId: string, type: WorkItemTypeDef): string {
  if (type.storage === 'builtin' && type.id === 'epic') {
    return `/capabilities/${capabilityId}/epics`;
  }
  if (type.storage === 'builtin' && type.id === 'feature') {
    // Feature list is nested under epics; send users to epics as the entry point.
    return `/capabilities/${capabilityId}/epics`;
  }
  if (type.storage === 'builtin' && type.id === 'story') {
    return `/capabilities/${capabilityId}/epics`;
  }
  return `/capabilities/${capabilityId}/items/${type.id}`;
}

/** Count of rows for a type on a capability (builtin + custom). */
export function countForWorkItemType(
  typeId: string,
  counts: RecordCounts
): number {
  if (typeId === 'epic' || typeId === 'epics') return counts.epics;
  if (typeId === 'feature' || typeId === 'features') return counts.features;
  if (typeId === 'story' || typeId === 'stories') return counts.stories;
  if (typeId === 'equipment') return counts.equipment;
  return counts.byType?.[typeId] ?? 0;
}

/** Compact subtitle for open/breakdown (table targets or root types). */
export function breakdownCountLabel(
  lifecycle: Lifecycle,
  counts: RecordCounts
): string {
  const targets = tableManageTargets(lifecycle);
  const types = targets.length > 0 ? targets : rootWorkItemTypes(lifecycle);
  if (types.length === 0) {
    if (counts.equipment > 0) return `${counts.equipment} equip.`;
    return '—';
  }
  return types
    .map((t) => {
      const n = countForWorkItemType(t.id, counts);
      const abbr = t.label.charAt(0).toUpperCase() || '?';
      return `${n}${abbr}`;
    })
    .join(' · ');
}

export function storyStagesOf(lifecycle: Lifecycle): StageDef[] {
  const fromType = workItemTypeDef(lifecycle, 'story')?.stages;
  if (fromType && fromType.length > 0) return fromType;
  return lifecycle.storyStages ?? [];
}

export function decompositionFromTypes(types: WorkItemTypeDef[]): DecompositionMode {
  if (types.some((t) => t.id === 'epic' || t.id === 'feature' || t.id === 'story')) {
    return 'delivery';
  }
  return types.length > 0 ? 'delivery' : 'none';
}

export function syncLegacyFromTypes(lifecycle: Pick<Lifecycle, 'workItemTypes' | 'stages'>): {
  decomposition: DecompositionMode;
  storyStages: StageDef[];
} {
  const types = lifecycle.workItemTypes ?? [];
  return {
    decomposition: decompositionFromTypes(types),
    storyStages: types.find((t) => t.id === 'story')?.stages ?? [],
  };
}

export function stageDef(lifecycle: Lifecycle, name: string): StageDef | undefined {
  return lifecycle.stages.find((s) => s.name === name);
}

export function stageIndex(lifecycle: Lifecycle, name: string): number {
  return lifecycle.stages.findIndex((s) => s.name === name);
}

export function storyStageDef(lifecycle: Lifecycle, name: string): StageDef | undefined {
  return storyStagesOf(lifecycle).find((s) => s.name === name);
}

export function storyStageIndex(lifecycle: Lifecycle, name: string): number {
  return storyStagesOf(lifecycle).findIndex((s) => s.name === name);
}

export function requirementsForLifecycle(lifecycle: Lifecycle): StageRequirement[] {
  const fromTypes = (lifecycle.workItemTypes ?? []).map((t) =>
    t.id === 'epic' ? 'epics' : t.id === 'feature' ? 'features' : t.id === 'story' ? 'stories' : t.id
  );
  return ['none', 'equipment', ...fromTypes];
}

export function requirementsForMode(mode: DecompositionMode): StageRequirement[] {
  if (mode === 'none') return ['none', 'equipment'];
  return ['none', 'epics', 'features', 'stories'];
}

export interface EquipmentType {
  id: string;
  name: string;
}

export interface Equipment {
  id: string;
  name: string;
  vendor: string;
  model: string;
  type: string;
  productIds: string[];
  status: CapabilityStatus | null;
}

/** Generic custom work item (name + description + status). */
export interface WorkItem {
  id: string;
  typeId: string;
  capabilityId: string;
  parentId: string | null;
  name: string;
  description: string;
  status: string;
  sortOrder: number;
}

export interface RecordCounts {
  epics: number;
  features: number;
  stories: number;
  equipment: number;
  /** Counts keyed by work-item type id (builtin + custom). */
  byType?: Record<string, number>;
}

export function meetsRequirement(req: StageRequirement, counts: RecordCounts): boolean {
  if (!req || req === 'none') return true;
  if (req === 'epics') return counts.epics > 0;
  if (req === 'features') return counts.features > 0;
  if (req === 'stories') return counts.stories > 0;
  if (req === 'equipment') return counts.equipment > 0;
  if (counts.byType && req in counts.byType) return (counts.byType[req] ?? 0) > 0;
  return true;
}

/** The furthest stage the current record can legitimately support. */
export function allowedStage(lifecycle: Lifecycle, counts: RecordCounts): StageDef {
  const stages = lifecycle.stages;
  let last = stages[0];
  for (const s of stages) {
    if (!meetsRequirement(s.requirement, counts)) break;
    last = s;
  }
  return last;
}

export function isStageAhead(lifecycle: Lifecycle, stage: string, counts: RecordCounts): boolean {
  const i = stageIndex(lifecycle, stage);
  if (i < 0) return false;
  return i > stageIndex(lifecycle, allowedStage(lifecycle, counts).name);
}

/** Furthest stage name the capability's evidence supports. */
export function computeCapabilityProgress(lifecycle: Lifecycle, counts: RecordCounts): string {
  return allowedStage(lifecycle, counts).name;
}

/**
 * Status implied by a lifecycle stage. Uses stage.status when set; otherwise
 * last stage → Completed, earlier → In Progress.
 */
export function statusForStage(
  lifecycle: Lifecycle,
  stageName: string
): CapabilityStatus {
  const stages = lifecycle.stages;
  const idx = stageIndex(lifecycle, stageName);
  const stage = idx >= 0 ? stages[idx] : undefined;
  if (stage && stage.status !== undefined && stage.status !== null) {
    return stage.status;
  }
  if (idx >= 0 && idx === stages.length - 1) return 'Completed';
  return 'In Progress';
}

/** True when status is left to auto-recompute (not a manual hold/review flag). */
export function isAutoManagedStatus(status: CapabilityStatus | null | undefined): boolean {
  return status == null || status === 'In Progress' || status === 'Completed';
}

export interface Product {
  id: string;
  name: string;
  description: string;
}

export interface Actor {
  id: string;
  name: string;
  description: string;
  productIds: string[];
}

export interface CapabilityGroup {
  id: string;
  name: string;
  description: string;
  /** Short unique token used in capability IDs (e.g. S → CAP-S-0001). */
  code: string;
  /** Lifecycle id. */
  track: TrackId;
  /** How this group is worked, shown behind the info icon on the Groups page. */
  process: string;
  productIds: string[];
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  groupId: string;
  productIds: string[];
  jiraEpic: string;
  /** Only meaningful for equipment-style (no-decomposition) lifecycles. */
  equipmentIds: string[];
  progress: string;
  status: CapabilityStatus | null;
}

export interface Epic {
  id: string;
  capabilityId: string;
  key: string;
  name: string;
  description: string;
  status: CapabilityStatus | null;
}

export interface Feature {
  id: string;
  epicId: string;
  name: string;
  description: string;
  status: CapabilityStatus | null;
}

export interface UserStory {
  id: string;
  featureId: string;
  title: string;
  /** Display string derived from selected actor names (Excel “As a”). */
  role: string;
  /** Selected actors from the Actors catalog. */
  actorIds: string[];
  want: string;
  benefit: string;
  criteria: string[];
  points: number | null;
  status: CapabilityStatus | null;
  /** Execution stage — the delivery lifecycle lives on the story, not the capability. */
  stage: string;
  /** Architecture decision record, captured during In Architecture. */
  adrContext?: string;
  adrDecision?: string;
  adrTechnical?: string;
  adrConsequences?: string;
  adrApproved?: boolean;
}

export function isStoryDone(story: UserStory, lifecycle?: Lifecycle): boolean {
  const stages = lifecycle ? storyStagesOf(lifecycle) : [];
  if (stages.length > 0) {
    const last = stages[stages.length - 1];
    return story.stage === last.name;
  }
  return story.stage === 'Released';
}

/** Safe for Array#filter — ignores index/thisArg. */
export function storyIsDone(story: UserStory): boolean {
  return isStoryDone(story);
}

export type WaveState = 'Planned' | 'In Test' | 'On Prod' | 'Closed';

export const WAVE_STATES: WaveState[] = ['Planned', 'In Test', 'On Prod', 'Closed'];

export interface Wave {
  id: string;
  code: string;
  name: string;
  description: string;
  state: WaveState;
  /** Planned delivery date (YYYY-MM-DD); empty when not set. */
  deliveryDate: string;
  /** Mixed ids — CAP-…, EPIC-…, FEAT-… or US-… */
  itemIds: string[];
  productIds: string[];
}

export function itemKind(id: string): 'capability' | 'epic' | 'feature' | 'story' | 'unknown' {
  if (id.startsWith('CAP-')) return 'capability';
  if (id.startsWith('EPIC-')) return 'epic';
  if (id.startsWith('FEAT-')) return 'feature';
  if (id.startsWith('US-')) return 'story';
  return 'unknown';
}
