export type StageTone =
'blue' |
'cyan' |
'amber' |
'orange' |
'green' |
'red' |
'violet' |
'pink' |
'gray';

/** What must exist in the record before a stage is credible. */
export type StageRequirement = 'none' | 'epics' | 'features' | 'stories' | 'equipment';

export const REQUIREMENT_LABEL: Record<StageRequirement, string> = {
  none: 'no prerequisite',
  epics: 'needs at least one epic',
  features: 'needs at least one feature',
  stories: 'needs at least one user story',
  equipment: 'needs at least one linked equipment model'
};

export interface StageDef {
  name: string;
  description: string;
  tone: StageTone;
  requirement: StageRequirement;
}

export type TrackId = 'hardware' | 'delivery';

export interface Track {
  id: TrackId;
  label: string;
  summary: string;
  stages: StageDef[];
}

const HARDWARE_STAGES: StageDef[] = [
{
  name: 'Identified',
  description: 'The hardware capability has been identified and documented.',
  tone: 'blue',
  requirement: 'none'
},
{
  name: 'Ready for Assignment',
  description: 'Approved and ready to be assigned to compatible equipment.',
  tone: 'violet',
  requirement: 'none'
},
{
  name: 'Assigned to Equipment',
  description: 'The capability has been linked to one or more equipment models.',
  tone: 'blue',
  requirement: 'equipment'
},
{
  name: 'Active',
  description: 'The capability is officially active and usable.',
  tone: 'green',
  requirement: 'equipment'
}];


const DELIVERY_STAGES: StageDef[] = [
{
  name: 'Identified',
  description: 'The capability has been identified and written down.',
  tone: 'blue',
  requirement: 'none'
},
{
  name: 'Epic Definition',
  description: 'The capability is being divided into epics.',
  tone: 'violet',
  requirement: 'none'
},
{
  name: 'Feature Definition',
  description: 'Each epic is being divided into features.',
  tone: 'violet',
  requirement: 'epics'
},
{
  name: 'User Story Definition',
  description: 'Each feature is being divided into user stories.',
  tone: 'violet',
  requirement: 'features'
}];


/** Once a capability is decomposed, execution is tracked stage by stage on each user story. */
export const STORY_STAGES: StageDef[] = [
{
  name: 'In UI/UX Design',
  description: 'UI/UX design is in progress.',
  tone: 'pink',
  requirement: 'none'
},
{
  name: 'In Architecture',
  description:
  'The story is analysed for feasibility and given a technical approval, recorded as an ADR with the technical information needed to build it.',
  tone: 'orange',
  requirement: 'none'
},
{
  name: 'In Development',
  description: 'Development is in progress.',
  tone: 'cyan',
  requirement: 'none'
},
{
  name: 'In Testing',
  description: 'The functionality is being tested.',
  tone: 'violet',
  requirement: 'none'
},
{
  name: 'Ready for Deploy',
  description: 'The work is finished and being deployed.',
  tone: 'green',
  requirement: 'none'
},
{
  name: 'Released',
  description: 'The story is released and available.',
  tone: 'blue',
  requirement: 'none'
}];


export const STORY_STAGE_NAMES: string[] = STORY_STAGES.map((s) => s.name);

export function storyStageDef(name: string): StageDef | undefined {
  return STORY_STAGES.find((s) => s.name === name);
}

export function storyStageIndex(name: string): number {
  return STORY_STAGES.findIndex((s) => s.name === name);
}

export const TRACKS: Record<TrackId, Track> = {
  hardware: {
    id: 'hardware',
    label: 'Hardware review track',
    summary:
    'Hardware capabilities are not decomposed into epics, features or user stories. Once identified they are made ready for assignment, linked to the equipment models that support them, and then activated.',
    stages: HARDWARE_STAGES
  },
  delivery: {
    id: 'delivery',
    label: 'Delivery track',
    summary:
    'Software capabilities are approved, decomposed into epics, then features, then user stories, and follow those stories through design, development, testing and release.',
    stages: DELIVERY_STAGES
  }
};

export const ALL_STAGE_NAMES: string[] = Array.from(
  new Set([...HARDWARE_STAGES, ...DELIVERY_STAGES].map((s) => s.name))
);

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

export function stageDef(track: TrackId, name: string): StageDef | undefined {
  return TRACKS[track].stages.find((s) => s.name === name);
}

export function stageIndex(track: TrackId, name: string): number {
  return TRACKS[track].stages.findIndex((s) => s.name === name);
}

export function meetsRequirement(req: StageRequirement, counts: RecordCounts): boolean {
  if (req === 'epics') return counts.epics > 0;
  if (req === 'features') return counts.features > 0;
  if (req === 'stories') return counts.stories > 0;
  if (req === 'equipment') return counts.equipment > 0;
  return true;
}

/** The furthest stage the current record can legitimately support. */
export function allowedStage(track: TrackId, counts: RecordCounts): StageDef {
  const stages = TRACKS[track].stages;
  let last = stages[0];
  for (const s of stages) {
    if (!meetsRequirement(s.requirement, counts)) break;
    last = s;
  }
  return last;
}

export function isStageAhead(track: TrackId, stage: string, counts: RecordCounts): boolean {
  const i = stageIndex(track, stage);
  if (i < 0) return false;
  return i > stageIndex(track, allowedStage(track, counts).name);
}

export type CapabilityStatus =
'On Hold' |
'In Progress' |
'Approved' |
'Blocked' |
'Needs Review' |
'Rejected' |
'Completed';

export const CAPABILITY_STATUSES: CapabilityStatus[] = [
'On Hold',
'In Progress',
'Approved',
'Blocked',
'Needs Review',
'Rejected',
'Completed'];




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

export interface CapabilityGroup {
  id: string;
  name: string;
  description: string;
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
  /** Only meaningful for the Hardware Capability group. */
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
  role: string;
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

export function isStoryDone(story: UserStory): boolean {
  return story.stage === 'Released';
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

export const HARDWARE_GROUP_ID = 'GRP-HW';

export function itemKind(id: string): 'capability' | 'epic' | 'feature' | 'story' | 'unknown' {
  if (id.startsWith('CAP-')) return 'capability';
  if (id.startsWith('EPIC-')) return 'epic';
  if (id.startsWith('FEAT-')) return 'feature';
  if (id.startsWith('US-')) return 'story';
  return 'unknown';
}