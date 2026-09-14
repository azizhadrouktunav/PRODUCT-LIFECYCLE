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

/** What must exist in the record before a stage is credible. */
export type StageRequirement = 'none' | 'epics' | 'features' | 'stories' | 'equipment';

export const REQUIREMENT_LABEL: Record<StageRequirement, string> = {
  none: 'no prerequisite',
  epics: 'needs at least one epic',
  features: 'needs at least one feature',
  stories: 'needs at least one user story',
  equipment: 'needs at least one linked equipment model',
};

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

export interface StageDef {
  name: string;
  description: string;
  tone: StageTone;
  requirement: StageRequirement;
}

/** Lifecycle id stored on capability groups (`track` column). */
export type TrackId = string;

export type DecompositionMode = 'none' | 'delivery';

export const DECOMPOSITION_LABEL: Record<DecompositionMode, string> = {
  none: 'no decomposition',
  delivery: 'epics → features → stories',
};

export interface Lifecycle {
  id: TrackId;
  label: string;
  summary: string;
  decomposition: DecompositionMode;
  stages: StageDef[];
  storyStages: StageDef[];
}

/** @deprecated Use Lifecycle — kept as an alias for gradual migration. */
export type Track = Lifecycle;

const HARDWARE_STAGES: StageDef[] = [
  {
    name: 'Identified',
    description: 'The hardware capability has been identified and documented.',
    tone: 'blue',
    requirement: 'none',
  },
  {
    name: 'Ready for Assignment',
    description: 'Approved and ready to be assigned to compatible equipment.',
    tone: 'violet',
    requirement: 'none',
  },
  {
    name: 'Assigned to Equipment',
    description: 'The capability has been linked to one or more equipment models.',
    tone: 'blue',
    requirement: 'equipment',
  },
  {
    name: 'Active',
    description: 'The capability is officially active and usable.',
    tone: 'green',
    requirement: 'equipment',
  },
];

const DELIVERY_STAGES: StageDef[] = [
  {
    name: 'Identified',
    description: 'The capability has been identified and written down.',
    tone: 'blue',
    requirement: 'none',
  },
  {
    name: 'Epic Definition',
    description: 'The capability is being divided into epics.',
    tone: 'violet',
    requirement: 'none',
  },
  {
    name: 'Feature Definition',
    description: 'Each epic is being divided into features.',
    tone: 'violet',
    requirement: 'epics',
  },
  {
    name: 'User Story Definition',
    description: 'Each feature is being divided into user stories.',
    tone: 'violet',
    requirement: 'features',
  },
];

/** Default story pipeline used when creating a delivery-style lifecycle. */
export const DEFAULT_STORY_STAGES: StageDef[] = [
  {
    name: 'In UI/UX Design',
    description: 'UI/UX design is in progress.',
    tone: 'pink',
    requirement: 'none',
  },
  {
    name: 'In Architecture',
    description:
      'The story is analysed for feasibility and given a technical approval, recorded as an ADR with the technical information needed to build it.',
    tone: 'orange',
    requirement: 'none',
  },
  {
    name: 'In Development',
    description: 'Development is in progress.',
    tone: 'cyan',
    requirement: 'none',
  },
  {
    name: 'In Testing',
    description: 'The functionality is being tested.',
    tone: 'violet',
    requirement: 'none',
  },
  {
    name: 'Ready for Deploy',
    description: 'The work is finished and being deployed.',
    tone: 'green',
    requirement: 'none',
  },
  {
    name: 'Released',
    description: 'The story is released and available.',
    tone: 'blue',
    requirement: 'none',
  },
];

/** Seed / editor templates for the two built-in lifecycle styles. */
export const LIFECYCLE_TEMPLATES: Record<DecompositionMode, Omit<Lifecycle, 'id'>> = {
  none: {
    label: 'Hardware review track',
    summary:
      'Hardware capabilities are not decomposed into epics, features or user stories. Once identified they are made ready for assignment, linked to the equipment models that support them, and then activated.',
    decomposition: 'none',
    stages: HARDWARE_STAGES,
    storyStages: [],
  },
  delivery: {
    label: 'Delivery track',
    summary:
      'Software capabilities are approved, decomposed into epics, then features, then user stories, and follow those stories through design, development, testing and release.',
    decomposition: 'delivery',
    stages: DELIVERY_STAGES,
    storyStages: DEFAULT_STORY_STAGES,
  },
};

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
  return lifecycle.decomposition === 'none';
}

export function usesDecomposition(lifecycle: Lifecycle): boolean {
  return lifecycle.decomposition === 'delivery';
}

export function stageDef(lifecycle: Lifecycle, name: string): StageDef | undefined {
  return lifecycle.stages.find((s) => s.name === name);
}

export function stageIndex(lifecycle: Lifecycle, name: string): number {
  return lifecycle.stages.findIndex((s) => s.name === name);
}

export function storyStageDef(lifecycle: Lifecycle, name: string): StageDef | undefined {
  return lifecycle.storyStages.find((s) => s.name === name);
}

export function storyStageIndex(lifecycle: Lifecycle, name: string): number {
  return lifecycle.storyStages.findIndex((s) => s.name === name);
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
}

export interface RecordCounts {
  epics: number;
  features: number;
  stories: number;
  equipment: number;
}

export function meetsRequirement(req: StageRequirement, counts: RecordCounts): boolean {
  if (req === 'epics') return counts.epics > 0;
  if (req === 'features') return counts.features > 0;
  if (req === 'stories') return counts.stories > 0;
  if (req === 'equipment') return counts.equipment > 0;
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

export type CapabilityStatus =
  | 'On Hold'
  | 'In Progress'
  | 'Approved'
  | 'Blocked'
  | 'Needs Review'
  | 'Rejected'
  | 'Completed';

export const CAPABILITY_STATUSES: CapabilityStatus[] = [
  'On Hold',
  'In Progress',
  'Approved',
  'Blocked',
  'Needs Review',
  'Rejected',
  'Completed',
];

export interface DomainCategory {
  id: string;
  name: string;
  shortName: string;
  prefix: string;
  description: string;
}

export interface Domain {
  id: string;
  name: string;
  description: string;
  categoryId: string;
}

export interface Actor {
  id: string;
  name: string;
  description: string;
  categoryIds: string[];
}

export interface CapabilityGroup {
  id: string;
  name: string;
  description: string;
  /** Lifecycle id. */
  track: TrackId;
  /** How this group is worked, shown behind the info icon on the Groups page. */
  process: string;
}

export interface Capability {
  id: string;
  name: string;
  description: string;
  groupId: string;
  domainIds: string[];
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
  if (lifecycle && lifecycle.storyStages.length > 0) {
    const last = lifecycle.storyStages[lifecycle.storyStages.length - 1];
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
  /** Mixed ids — CAP-…, EPIC-…, FEAT-… or US-… */
  itemIds: string[];
}

export function itemKind(id: string): 'capability' | 'epic' | 'feature' | 'story' | 'unknown' {
  if (id.startsWith('CAP-')) return 'capability';
  if (id.startsWith('EPIC-')) return 'epic';
  if (id.startsWith('FEAT-')) return 'feature';
  if (id.startsWith('US-')) return 'story';
  return 'unknown';
}
