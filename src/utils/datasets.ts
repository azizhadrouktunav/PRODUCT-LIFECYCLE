import type { ColumnDef } from './excel';

export type DatasetId =
'capabilities' |
'epics' |
'features' |
'stories' |
'equipment' |
'domains' |
'groups';

export interface DatasetDef {
  id: DatasetId;
  /** Human label used in the import/export dialog. */
  label: string;
  /** Sheet name and file-name stem. */
  sheet: string;
  fileName: string;
  /** The column that identifies an existing record — blank means "create a new one". */
  idColumn: string;
  /** The column that must be filled for a row to be importable. */
  requiredColumn: string;
  columns: ColumnDef[];
  /** Set when the dataset is always imported inside a parent record. */
  parentLabel?: string;
}

export const DATASETS: Record<DatasetId, DatasetDef> = {
  capabilities: {
    id: 'capabilities',
    label: 'Capabilities',
    sheet: 'Capabilities',
    fileName: 'capabilities',
    idColumn: 'Capability ID',
    requiredColumn: 'Name',
    columns: [
    { label: 'Capability ID', example: 'CAP-0026' },
    { label: 'Name', example: 'Driver Behaviour Scoring' },
    { label: 'Description', example: 'Score harsh braking, acceleration and cornering per driver.' },
    { label: 'Group ID', example: 'GRP-FIQ' },
    { label: 'Domain IDs', example: 'FIQ-D03; FIQ-D05' },
    { label: 'Epic Key', example: 'FIQ-2400' },
    { label: 'Equipment IDs', example: '' },
    { label: 'Progress', example: 'Identified' },
    { label: 'Status', example: 'In Progress' }]

  },
  epics: {
    id: 'epics',
    label: 'Epics',
    sheet: 'Epics',
    fileName: 'epics',
    idColumn: 'Epic ID',
    requiredColumn: 'Name',
    parentLabel: 'capability',
    columns: [
    { label: 'Epic ID', example: '' },
    { label: 'Capability ID', example: 'CAP-0015' },
    { label: 'Key', example: 'FIQ-2220' },
    { label: 'Name', example: 'Driver scoring pipeline' },
    { label: 'Description', example: 'Everything needed to turn raw events into a driver score.' },
    { label: 'Status', example: 'In Progress' }]

  },
  features: {
    id: 'features',
    label: 'Features',
    sheet: 'Features',
    fileName: 'features',
    idColumn: 'Feature ID',
    requiredColumn: 'Name',
    parentLabel: 'epic',
    columns: [
    { label: 'Feature ID', example: '' },
    { label: 'Epic ID', example: 'EPIC-001' },
    { label: 'Name', example: 'Harsh event detection' },
    { label: 'Description', example: 'Detect harsh braking and acceleration from accelerometer data.' },
    { label: 'Status', example: 'In Progress' }]

  },
  stories: {
    id: 'stories',
    label: 'User stories',
    sheet: 'User Stories',
    fileName: 'user-stories',
    idColumn: 'Story ID',
    requiredColumn: 'Title',
    parentLabel: 'feature',
    columns: [
    { label: 'Story ID', example: '' },
    { label: 'Feature ID', example: 'FEAT-001' },
    { label: 'Title', example: 'See my weekly driver score' },
    { label: 'As a', example: 'fleet manager' },
    { label: 'I want to', example: 'see a weekly score per driver' },
    { label: 'So that', example: 'I can coach the riskiest drivers first' },
    { label: 'Acceptance Criteria', example: 'Score is 0-100; Trend versus last week is shown' },
    { label: 'Points', example: '5' },
    { label: 'Progress Stage', example: 'In UI/UX Design' },
    { label: 'Status', example: 'In Progress' },
    { label: 'ADR Context', example: '' },
    { label: 'ADR Decision', example: '' },
    { label: 'ADR Technical', example: '' },
    { label: 'ADR Consequences', example: '' },
    { label: 'ADR Approved', example: 'No' }]

  },
  equipment: {
    id: 'equipment',
    label: 'Equipment',
    sheet: 'Equipment',
    fileName: 'equipment',
    idColumn: 'Equipment ID',
    requiredColumn: 'Name',
    columns: [
    { label: 'Equipment ID', example: '' },
    { label: 'Name', example: 'Teltonika FMC920' },
    { label: 'Vendor', example: 'Teltonika' },
    { label: 'Model', example: 'FMC920' },
    { label: 'Type', example: 'Tracker' }]

  },
  domains: {
    id: 'domains',
    label: 'Domains',
    sheet: 'Domains',
    fileName: 'domains',
    idColumn: 'Domain ID',
    requiredColumn: 'Name',
    columns: [
    { label: 'Domain ID', example: 'FIQ-D09' },
    { label: 'Name', example: 'Driver Management' },
    { label: 'Description', example: 'Driver identity, assignment, behaviour and coaching.' },
    { label: 'Category ID', example: 'CAT-FIQ' }]

  },
  groups: {
    id: 'groups',
    label: 'Capability groups',
    sheet: 'Capability Groups',
    fileName: 'capability-groups',
    idColumn: 'Group ID',
    requiredColumn: 'Name',
    columns: [
    { label: 'Group ID', example: '' },
    { label: 'Name', example: 'Integration Capability' },
    { label: 'Description', example: 'Capabilities exposing TUNAV ONE to third-party systems.' },
    { label: 'Track', example: 'delivery' },
    { label: 'Process', example: 'How this group is worked, stage by stage.' }]

  }
};

export interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  messages: string[];
}