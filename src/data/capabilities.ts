import type { Capability } from '../types/registry';

export const initialCapabilities: Capability[] = [
{
  id: 'CAP-0001',
  name: 'GNSS Position Acquisition',
  description:
  'Device acquires and reports latitude, longitude, speed, heading and HDOP at a configurable interval, with cold/warm start behaviour documented per model.',
  groupId: 'GRP-HW',
  domainIds: ['CORE-D03', 'FIQ-D02'],
  jiraEpic: 'CORE-1042',
  equipmentIds: ['EQP-01', 'EQP-02', 'EQP-03', 'EQP-09'],
  progress: 'Active',
  status: null
},
{
  id: 'CAP-0002',
  name: 'CAN Bus / FMS Data Read',
  description:
  'Read standardized FMS parameters (odometer, engine hours, fuel level, RPM, fault codes) from the vehicle bus without intrusive wiring.',
  groupId: 'GRP-HW',
  domainIds: ['CORE-D03', 'FIQ-D08'],
  jiraEpic: 'CORE-1088',
  equipmentIds: ['EQP-01', 'EQP-09', 'EQP-10'],
  progress: 'Assigned to Equipment',
  status: null
},
{
  id: 'CAP-0003',
  name: 'Offline Buffering & Replay',
  description:
  'Device stores telemetry records while out of coverage and replays them in order once connectivity returns, preserving original timestamps.',
  groupId: 'GRP-HW',
  domainIds: ['CORE-D04'],
  jiraEpic: 'CORE-1103',
  equipmentIds: ['EQP-01', 'EQP-02', 'EQP-03', 'EQP-04'],
  progress: 'Assigned to Equipment',
  status: 'Needs Review'
},
{
  id: 'CAP-0004',
  name: 'Capacitive Fuel Level Sensing',
  description:
  'Continuous tank level measurement with calibration tables per tank geometry, feeding refuel and drain detection downstream.',
  groupId: 'GRP-HW',
  domainIds: ['FIQ-D07'],
  jiraEpic: 'FIQ-2210',
  equipmentIds: ['EQP-06', 'EQP-07'],
  progress: 'Active',
  status: null
},
{
  id: 'CAP-0005',
  name: 'In-Cab AI Driver Monitoring',
  description:
  'On-device inference for distraction, drowsiness, phone use and seatbelt detection, emitting an event plus a short clip reference.',
  groupId: 'GRP-HW',
  domainIds: ['FIQ-D09', 'FIQ-D10'],
  jiraEpic: 'FIQ-2455',
  equipmentIds: ['EQP-05', 'EQP-04'],
  progress: 'Ready for Assignment',
  status: null
},
{
  id: 'CAP-0006',
  name: 'BLE Tire Pressure Telemetry',
  description:
  'Pair BLE TPMS sensors to a tracker and report pressure and temperature per wheel position on change or interval.',
  groupId: 'GRP-HW',
  domainIds: ['FIQ-D08'],
  jiraEpic: 'FIQ-2318',
  equipmentIds: ['EQP-08', 'EQP-01'],
  progress: 'Identified',
  status: 'On Hold'
},
{
  id: 'CAP-0007',
  name: 'Multi-Protocol Device Gateway',
  description:
  'Single ingestion gateway terminating multiple vendor protocols, normalising them into the canonical telemetry envelope.',
  groupId: 'GRP-PLT',
  domainIds: ['CORE-D03', 'CORE-D05'],
  jiraEpic: 'CORE-1001',
  equipmentIds: [],
  progress: 'User Story Definition',
  status: 'In Progress'
},
{
  id: 'CAP-0008',
  name: 'Tenant-Scoped RBAC',
  description:
  'Role and permission model scoped per tenant and asset group, enforced consistently across API, UI and reporting.',
  groupId: 'GRP-PLT',
  domainIds: ['CORE-D02', 'CORE-D01'],
  jiraEpic: 'CORE-1015',
  equipmentIds: [],
  progress: 'Identified',
  status: null
},
{
  id: 'CAP-0009',
  name: 'Geofence Evaluation Engine',
  description:
  'Evaluate entries, exits and dwell against polygon, circular and corridor geometries at ingestion latency for the full fleet.',
  groupId: 'GRP-PLT',
  domainIds: ['CORE-D07', 'CORE-D06'],
  jiraEpic: 'CORE-1120',
  equipmentIds: [],
  progress: 'Epic Definition',
  status: null
},
{
  id: 'CAP-0010',
  name: 'Data Gap Detection & Backfill',
  description:
  'Detect missing telemetry windows per device, classify the cause and trigger backfill or a device health incident.',
  groupId: 'GRP-PLT',
  domainIds: ['CORE-D04', 'CORE-D09'],
  jiraEpic: 'CORE-1131',
  equipmentIds: [],
  progress: 'Identified',
  status: null
},
{
  id: 'CAP-0011',
  name: 'Public Fleet API v2',
  description:
  'Versioned REST and webhook surface for assets, trips, events and reports, with per-tenant rate limits and API keys.',
  groupId: 'GRP-PLT',
  domainIds: ['CORE-D05'],
  jiraEpic: 'CORE-1077',
  equipmentIds: [],
  progress: 'Epic Definition',
  status: null
},
{
  id: 'CAP-0012',
  name: 'Live Fleet Map',
  description:
  'Real-time positions with clustering, filtering by group and status, and one-click drill-down to asset detail.',
  groupId: 'GRP-FIQ',
  domainIds: ['FIQ-D02', 'FIQ-D04'],
  jiraEpic: 'FIQ-2001',
  equipmentIds: [],
  progress: 'User Story Definition',
  status: 'Completed'
},
{
  id: 'CAP-0013',
  name: 'Trip & Stop Reconstruction',
  description:
  'Convert raw positions into trips, stops and idle periods with configurable thresholds, used by reporting and billing.',
  groupId: 'GRP-FIQ',
  domainIds: ['FIQ-D02', 'FIQ-D06'],
  jiraEpic: 'FIQ-2024',
  equipmentIds: [],
  progress: 'Identified',
  status: null
},
{
  id: 'CAP-0014',
  name: 'Alert Rule Builder',
  description:
  'Self-service builder for alert conditions with recipients, quiet hours, escalation and acknowledgement tracking.',
  groupId: 'GRP-FIQ',
  domainIds: ['FIQ-D03', 'CORE-D06'],
  jiraEpic: 'FIQ-2110',
  equipmentIds: [],
  progress: 'Epic Definition',
  status: null
},
{
  id: 'CAP-0015',
  name: 'Fuel Drain Detection',
  description:
  'Flag suspicious level drops against movement, ignition and refuel context, with an operator review queue.',
  groupId: 'GRP-FIQ',
  domainIds: ['FIQ-D07', 'FIQ-D03'],
  jiraEpic: 'FIQ-2215',
  equipmentIds: [],
  progress: 'User Story Definition',
  status: 'In Progress'
},
{
  id: 'CAP-0016',
  name: 'Maintenance Plan Scheduling',
  description:
  'Distance, hours and calendar-based service plans generating work orders with parts, costs and completion evidence.',
  groupId: 'GRP-FIQ',
  domainIds: ['FIQ-D08', 'FIQ-D01'],
  jiraEpic: 'FIQ-2301',
  equipmentIds: [],
  progress: 'Identified',
  status: null
},
{
  id: 'CAP-0017',
  name: 'Document Expiry Tracking',
  description:
  'Track insurance, licences and inspections per asset and driver with escalating reminders before expiry.',
  groupId: 'GRP-FIQ',
  domainIds: ['FIQ-D12'],
  jiraEpic: 'FIQ-2402',
  equipmentIds: [],
  progress: 'Identified',
  status: 'Needs Review'
},
{
  id: 'CAP-0018',
  name: 'Rental Contract Lifecycle',
  description:
  'Contract creation, availability calendar, hand-over checklist, return inspection and billing hand-off.',
  groupId: 'GRP-FIQ',
  domainIds: ['FIQ-D13', 'FIQ-D01'],
  jiraEpic: 'FIQ-2501',
  equipmentIds: [],
  progress: 'Identified',
  status: null
},
{
  id: 'CAP-0019',
  name: 'Mission Dispatch & Follow-Up',
  description:
  'Assign missions to drivers, track planned vs actual execution and close out with proof of delivery.',
  groupId: 'GRP-FIQ',
  domainIds: ['FIQ-D11'],
  jiraEpic: 'FIQ-2440',
  equipmentIds: [],
  progress: 'Identified',
  status: null
},
{
  id: 'CAP-0020',
  name: 'Driver Behaviour Scoring',
  description:
  'Composite score from harsh events, speeding and idling, normalised per vehicle class and exposed as a coaching league.',
  groupId: 'GRP-CIQ',
  domainIds: ['CIQ-D01', 'FIQ-D09'],
  jiraEpic: 'CIQ-3001',
  equipmentIds: [],
  progress: 'Identified',
  status: null
},
{
  id: 'CAP-0021',
  name: 'Predictive Maintenance Alerts',
  description:
  'Predict component failure windows from fault codes, usage and sensor drift, feeding the maintenance backlog.',
  groupId: 'GRP-CIQ',
  domainIds: ['CIQ-D02', 'FIQ-D08'],
  jiraEpic: 'CIQ-3020',
  equipmentIds: [],
  progress: 'Epic Definition',
  status: null
},
{
  id: 'CAP-0022',
  name: 'Fuel Consumption Forecast',
  description:
  'Forecast consumption per route and vehicle class to support budgeting and anomaly comparison.',
  groupId: 'GRP-CIQ',
  domainIds: ['CIQ-D02', 'FIQ-D07'],
  jiraEpic: 'CIQ-3033',
  equipmentIds: [],
  progress: 'Identified',
  status: 'Blocked'
},
{
  id: 'CAP-0023',
  name: 'Next-Best-Action for Operators',
  description:
  'Rank the open operational items an operator should handle next, combining severity, SLA and effort.',
  groupId: 'GRP-CIQ',
  domainIds: ['CIQ-D03', 'FIQ-D05'],
  jiraEpic: 'CIQ-3050',
  equipmentIds: [],
  progress: 'Identified',
  status: null
},
{
  id: 'CAP-0024',
  name: 'Automated Incident Workflow',
  description:
  'Turn a detected anomaly into an assigned, tracked incident with automatic routing and closure rules.',
  groupId: 'GRP-CIQ',
  domainIds: ['CIQ-D04', 'CORE-D06'],
  jiraEpic: 'CIQ-3061',
  equipmentIds: [],
  progress: 'Identified',
  status: null
},
{
  id: 'CAP-0025',
  name: 'Legacy SMS Command Channel',
  description:
  'SMS-based device command fallback for units without a reliable data session. Superseded by the gateway command queue.',
  groupId: 'GRP-PLT',
  domainIds: ['CORE-D03'],
  jiraEpic: 'CORE-0912',
  equipmentIds: [],
  progress: 'Identified',
  status: 'Rejected'
}];