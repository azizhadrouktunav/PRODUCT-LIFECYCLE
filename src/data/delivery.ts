import type { Epic, Feature, UserStory } from '../types/registry';

export const initialEpics: Epic[] = [
{
  id: 'EPIC-001',
  capabilityId: 'CAP-0015',
  key: 'FIQ-2210',
  name: 'Tank calibration & level pipeline',
  description:
  'Everything needed to turn a raw sensor reading into a trusted litre value: calibration tables, unit conversion and level smoothing.',
  status: 'Completed'
},
{
  id: 'EPIC-002',
  capabilityId: 'CAP-0015',
  key: 'FIQ-2211',
  name: 'Fuel level operator experience',
  description: 'How fuel level is surfaced to operators across the asset view, map and reports.',
  status: 'In Progress'
},
{
  id: 'EPIC-003',
  capabilityId: 'CAP-0012',
  key: 'FIQ-2001',
  name: 'Real-time map surface',
  description: 'The live map canvas, marker lifecycle and update channel for the whole fleet.',
  status: 'Completed'
},
{
  id: 'EPIC-004',
  capabilityId: 'CAP-0012',
  key: 'FIQ-2002',
  name: 'Map filtering & drill-down',
  description: 'Finding the right asset on a crowded map and moving from marker to full asset context.',
  status: 'In Progress'
},
{
  id: 'EPIC-005',
  capabilityId: 'CAP-0015',
  key: 'FIQ-2215',
  name: 'Drain detection engine',
  description: 'Detection logic combining level drops with ignition, movement and refuel context.',
  status: 'In Progress'
},
{
  id: 'EPIC-006',
  capabilityId: 'CAP-0015',
  key: 'FIQ-2216',
  name: 'Drain review queue',
  description: 'The operator workflow for confirming, dismissing and escalating suspected drains.',
  status: 'On Hold'
},
{
  id: 'EPIC-007',
  capabilityId: 'CAP-0007',
  key: 'CORE-1088',
  name: 'FMS decoding library',
  description: 'Per-vendor decoding of standardized FMS parameters into the canonical telemetry model.',
  status: 'In Progress'
}];


export const initialFeatures: Feature[] = [
{
  id: 'FEAT-001',
  epicId: 'EPIC-001',
  name: 'Calibration table editor',
  description: 'Upload or enter a height-to-volume table per tank and validate it before activation.',
  status: 'Completed'
},
{
  id: 'FEAT-002',
  epicId: 'EPIC-001',
  name: 'Level smoothing & outlier rejection',
  description: 'Filter sloshing and spikes so the reported level is stable while the vehicle moves.',
  status: 'Completed'
},
{
  id: 'FEAT-003',
  epicId: 'EPIC-002',
  name: 'Fuel widget on asset detail',
  description: 'Current level, last refuel and 24h trend shown on the asset page.',
  status: 'In Progress'
},
{
  id: 'FEAT-004',
  epicId: 'EPIC-002',
  name: 'Fuel consumption report',
  description: 'Per-asset and per-group consumption over a selected period, exportable.',
  status: null
},
{
  id: 'FEAT-005',
  epicId: 'EPIC-003',
  name: 'Live marker layer',
  description: 'Position markers with heading, status colour and smooth interpolation between updates.',
  status: 'Completed'
},
{
  id: 'FEAT-006',
  epicId: 'EPIC-003',
  name: 'Marker clustering',
  description: 'Cluster dense areas and expand progressively as the operator zooms in.',
  status: 'Completed'
},
{
  id: 'FEAT-007',
  epicId: 'EPIC-004',
  name: 'Asset filter panel',
  description: 'Filter the map by group, status, driver and last-seen window.',
  status: 'In Progress'
},
{
  id: 'FEAT-008',
  epicId: 'EPIC-004',
  name: 'Marker to asset drawer',
  description: 'One click from a marker to the full asset context without losing map state.',
  status: 'Needs Review'
},
{
  id: 'FEAT-009',
  epicId: 'EPIC-005',
  name: 'Drop detection rules',
  description: 'Configurable thresholds for drop size, duration and vehicle state.',
  status: 'In Progress'
},
{
  id: 'FEAT-010',
  epicId: 'EPIC-005',
  name: 'Refuel exclusion logic',
  description: 'Suppress false positives around legitimate refuel events and tank swaps.',
  status: null
},
{
  id: 'FEAT-011',
  epicId: 'EPIC-007',
  name: 'Vendor decoder registry',
  description: 'Pluggable decoders selected by device model and firmware version.',
  status: 'In Progress'
}];


export const initialStories: UserStory[] = [
{
  id: 'US-001',
  featureId: 'FEAT-001',
  title: 'Upload a calibration table',
  role: 'fleet administrator',
  want: 'upload a height-to-volume table for a tank',
  benefit: 'fuel levels are reported in litres I can trust',
  criteria: [
  'CSV and manual entry are both accepted',
  'Non-monotonic tables are rejected with a clear message',
  'The active table is versioned and the previous one is kept'],

  points: 5,
  status: 'Completed',
  stage: 'Released'
},
{
  id: 'US-002',
  featureId: 'FEAT-001',
  title: 'Preview a table before activating it',
  role: 'fleet administrator',
  want: 'see the curve and sample conversions before I activate a table',
  benefit: 'I catch entry mistakes before they affect reporting',
  criteria: ['Curve is plotted from the entered points', 'Activation requires explicit confirmation'],
  points: 3,
  status: 'Completed',
  stage: 'Released'
},
{
  id: 'US-003',
  featureId: 'FEAT-002',
  title: 'Ignore sloshing spikes while driving',
  role: 'operations manager',
  want: 'the fuel level to stay stable while the vehicle is moving',
  benefit: 'I am not paged for movement that is not a real drop',
  criteria: ['Spikes shorter than the configured window are filtered', 'Filtering is disclosed in the audit trail'],
  points: 8,
  status: 'Completed',
  stage: 'Released'
},
{
  id: 'US-004',
  featureId: 'FEAT-003',
  title: 'See current fuel level on the asset page',
  role: 'operations manager',
  want: 'the current level and last refuel on the asset page',
  benefit: 'I can answer a driver question without opening a report',
  criteria: ['Level, percentage and litres are shown', 'Reading age is shown when older than 30 minutes'],
  points: 3,
  status: 'In Progress',
  stage: 'In Development'
},
{
  id: 'US-005',
  featureId: 'FEAT-003',
  title: 'See a 24 hour fuel trend',
  role: 'operations manager',
  want: 'a 24 hour trend line beside the current level',
  benefit: 'I can spot a gradual loss that no single reading reveals',
  criteria: ['Refuels are marked on the trend', 'Data gaps are visibly broken, not interpolated'],
  points: 5,
  status: 'Needs Review',
  stage: 'In UI/UX Design'
},
{
  id: 'US-006',
  featureId: 'FEAT-005',
  title: 'See every asset move in real time',
  role: 'dispatcher',
  want: 'markers to move as positions arrive',
  benefit: 'I can direct the closest vehicle without refreshing',
  criteria: ['Updates apply within 3 seconds of ingestion', 'Heading is reflected in the marker'],
  points: 8,
  status: 'Completed',
  stage: 'Released'
},
{
  id: 'US-007',
  featureId: 'FEAT-006',
  title: 'Read a dense depot without overlap',
  role: 'dispatcher',
  want: 'overlapping markers clustered with a count',
  benefit: 'a busy depot does not hide the rest of the fleet',
  criteria: ['Clusters expand on zoom', 'Cluster colour reflects the worst status inside it'],
  points: 5,
  status: 'Completed',
  stage: 'Released'
},
{
  id: 'US-008',
  featureId: 'FEAT-007',
  title: 'Filter the map by asset group',
  role: 'dispatcher',
  want: 'to narrow the map to one or more asset groups',
  benefit: 'I only watch the fleet I am responsible for',
  criteria: ['Filters combine with status and driver', 'Active filters persist across page reloads'],
  points: 3,
  status: 'Approved',
  stage: 'In Architecture',
  adrContext:
  'Filters must survive reloads and combine with the existing status and driver filters without a second round trip to the map service.',
  adrDecision:
  'Persist the active filter set in the URL query string and hydrate the map store from it on mount.',
  adrTechnical:
  'Filter state lives in a store slice serialised to the query string; the marker layer subscribes to a memoised selector so only affected markers re-render.',
  adrConsequences:
  'Shareable filtered map links come for free; very large filter sets will need compression later.',
  adrApproved: true
},
{
  id: 'US-009',
  featureId: 'FEAT-009',
  title: 'Flag a sudden drop while parked',
  role: 'operations manager',
  want: 'an alert when the level drops sharply with the engine off',
  benefit: 'I can act on a theft the same day it happens',
  criteria: [
  'Threshold is configurable per tank size',
  'Alert carries location, time and the level before and after'],

  points: 8,
  status: 'In Progress',
  stage: 'In Development'
},
{
  id: 'US-010',
  featureId: 'FEAT-011',
  title: 'Decode odometer and engine hours per vendor',
  role: 'platform engineer',
  want: 'the right decoder selected automatically by device model',
  benefit: 'new hardware can be onboarded without a release',
  criteria: ['Decoder resolves by model and firmware', 'Unknown models fall back to raw storage with a warning'],
  points: 13,
  status: 'Needs Review',
  stage: 'In Architecture',
  adrContext:
  'Every vendor encodes FMS parameters differently and new models arrive between releases.',
  adrDecision: 'Introduce a decoder registry resolved at runtime by device model and firmware version.',
  adrTechnical:
  'Decoders are pure functions registered in a map keyed by model and firmware range, loaded from configuration so a new model is a config change, not a deploy.',
  adrConsequences:
  'Onboarding new hardware no longer requires a release; unknown models fall back to raw storage with a warning.',
  adrApproved: false
}];