import type { CapabilityGroup, Domain, DomainCategory, Equipment } from '../types/registry';
import { HARDWARE_GROUP_ID } from '../types/registry';

export const domainCategories: DomainCategory[] = [
{
  id: 'CAT-CORE',
  name: 'TUNAV ONE Core',
  shortName: 'TunavOne Core',
  prefix: 'CORE',
  description:
  'The shared platform foundation every product sits on — identity, ingestion, device reliability, APIs, rules, spatial services and observability. Capabilities here are horizontal and are consumed by all vertical products.'
},
{
  id: 'CAT-FIQ',
  name: 'FleetIQ',
  shortName: 'FleetIQ',
  prefix: 'FIQ',
  description:
  'The fleet operations product surface: assets, tracking, alerting, mapping, dashboards, fuel, maintenance, driver safety, video and mission management. Capabilities here are user-facing and vertical.'
},
{
  id: 'CAT-CIQ',
  name: 'CoreIQ',
  shortName: 'CoreIQ',
  prefix: 'CIQ',
  description:
  'The intelligence layer applied across products: detection and scoring, prediction, recommendation and decision support, and workflow automation. Capabilities here consume Core data and enrich FleetIQ surfaces.'
}];


export const domains: Domain[] = [
// TUNAV ONE Core
{
  id: 'CORE-D01',
  name: 'Foundation',
  categoryId: 'CAT-CORE',
  description: 'Tenancy, configuration, environments and the base runtime every service builds on.'
},
{
  id: 'CORE-D02',
  name: 'Identity / Security',
  categoryId: 'CAT-CORE',
  description: 'Authentication, authorization, roles and permissions, audit trails and secret handling.'
},
{
  id: 'CORE-D03',
  name: 'Connectivity & Ingestion',
  categoryId: 'CAT-CORE',
  description: 'Protocol gateways, device sessions, message decoding and high-throughput telemetry intake.'
},
{
  id: 'CORE-D04',
  name: 'Device / Data Reliability',
  categoryId: 'CAT-CORE',
  description: 'Device health, data completeness, gap detection, deduplication and replay of missing telemetry.'
},
{
  id: 'CORE-D05',
  name: 'APIs & Integration',
  categoryId: 'CAT-CORE',
  description: 'Public and partner APIs, webhooks, connectors and third-party system integration contracts.'
},
{
  id: 'CORE-D06',
  name: 'Business Rules',
  categoryId: 'CAT-CORE',
  description: 'The rule and event engine that turns raw telemetry into thresholds, conditions and triggered actions.'
},
{
  id: 'CORE-D07',
  name: 'Spatial / Geofencing',
  categoryId: 'CAT-CORE',
  description: 'Geometry storage, map matching, geofence evaluation, POIs, routes and spatial queries.'
},
{
  id: 'CORE-D08',
  name: 'Shared Data Platform',
  categoryId: 'CAT-CORE',
  description: 'Canonical data model, storage tiers, historical archives and the analytics-ready data layer.'
},
{
  id: 'CORE-D09',
  name: 'Observability',
  categoryId: 'CAT-CORE',
  description: 'Logging, tracing, metrics, SLOs and operational alerting for the platform itself.'
},

// FleetIQ
{
  id: 'FIQ-D01',
  name: 'Fleet & Asset Ops',
  categoryId: 'CAT-FIQ',
  description: 'Asset registry, groups, drivers, assignments and day-to-day fleet administration.'
},
{
  id: 'FIQ-D02',
  name: 'Tracking / Monitoring',
  categoryId: 'CAT-FIQ',
  description: 'Live positions, trips, stops, idling and historical playback of asset movement.'
},
{
  id: 'FIQ-D03',
  name: 'Alerts & Safety',
  categoryId: 'CAT-FIQ',
  description: 'Alert definitions, notification routing, escalation and acknowledgement workflows.'
},
{
  id: 'FIQ-D04',
  name: 'Map & Geofence',
  categoryId: 'CAT-FIQ',
  description: 'Map experience, layers, geofence authoring and zone-based operational views.'
},
{
  id: 'FIQ-D05',
  name: 'Dashboards / BI',
  categoryId: 'CAT-FIQ',
  description: 'Configurable dashboards, KPI widgets and role-based operational overviews.'
},
{
  id: 'FIQ-D06',
  name: 'Reporting / Analytics',
  categoryId: 'CAT-FIQ',
  description: 'Scheduled and ad-hoc reports, exports and cross-fleet analytical breakdowns.'
},
{
  id: 'FIQ-D07',
  name: 'Fuel & Tank',
  categoryId: 'CAT-FIQ',
  description: 'Fuel level monitoring, consumption, refuel and drain detection, tank and depot management.'
},
{
  id: 'FIQ-D08',
  name: 'Maintenance / Tires',
  categoryId: 'CAT-FIQ',
  description: 'Service plans, work orders, part lifecycles and tire pressure and wear management.'
},
{
  id: 'FIQ-D09',
  name: 'Driver Safety',
  categoryId: 'CAT-FIQ',
  description: 'Driving behaviour events, scoring, coaching and safety league tables.'
},
{
  id: 'FIQ-D10',
  name: 'Vision / Video',
  categoryId: 'CAT-FIQ',
  description: 'Camera streams, event clips, media retrieval, retention and in-cab review tooling.'
},
{
  id: 'FIQ-D11',
  name: 'Mission / Ops',
  categoryId: 'CAT-FIQ',
  description: 'Missions, dispatch, planned vs actual execution and field task follow-up.'
},
{
  id: 'FIQ-D12',
  name: 'Document Management',
  categoryId: 'CAT-FIQ',
  description: 'Vehicle and driver documents, expiry tracking, renewals and compliance evidence.'
},
{
  id: 'FIQ-D13',
  name: 'Location (Rent) Management',
  categoryId: 'CAT-FIQ',
  description: 'Rental contracts, availability, hand-over checks, billing inputs and returns.'
},

// CoreIQ
{
  id: 'CIQ-D01',
  name: 'Detection / Scoring / Anomaly',
  categoryId: 'CAT-CIQ',
  description: 'Models that detect abnormal patterns and produce scores from telemetry and operational data.'
},
{
  id: 'CIQ-D02',
  name: 'Prediction & Forecasting',
  categoryId: 'CAT-CIQ',
  description: 'Forward-looking estimates: failures, consumption, ETA, demand and remaining useful life.'
},
{
  id: 'CIQ-D03',
  name: 'Recommendation / Prioritization / Decision Support',
  categoryId: 'CAT-CIQ',
  description: 'Ranked suggestions and next-best-action guidance surfaced to operators and managers.'
},
{
  id: 'CIQ-D04',
  name: 'Automation / Workflow',
  categoryId: 'CAT-CIQ',
  description: 'Autonomous and semi-autonomous workflows triggered by intelligence outputs.'
}];


export const initialGroups: CapabilityGroup[] = [
{
  id: HARDWARE_GROUP_ID,
  name: 'Hardware Capability',
  description:
  'What the physical device can do — sensing, connectivity, storage and I/O. Every hardware capability is mapped to the equipment models that support it.',
  track: 'hardware',
  process:
  'A hardware capability is documented from a datasheet or a field test. Once the definition holds it becomes ready for assignment, is linked to every equipment model that supports it, and is then marked active so the products can rely on it. Hardware capabilities are never decomposed into epics, features or user stories — there is no software backlog behind them.'
},
{
  id: 'GRP-PLT',
  name: 'Platform Capability',
  description:
  'Horizontal TUNAV ONE Core capabilities consumed by every product: ingestion, identity, rules, spatial services and shared data.',
  track: 'delivery',
  process:
  'A platform capability is identified, then decomposed into epics, features and user stories. Each user story is then carried through UI/UX design, architecture, development, testing and deployment on its own. Because every product depends on this layer, decomposition is expected to cover backwards compatibility and migration explicitly.'
},
{
  id: 'GRP-FIQ',
  name: 'FleetIQ Capability',
  description:
  'User-facing fleet operations capabilities delivered inside the FleetIQ product surface.',
  track: 'delivery',
  process:
  'A FleetIQ capability follows the full delivery track: decomposition into epics, features and user stories, then UI/UX design, architecture, development, testing and deployment per story. Because these capabilities are operator-facing, no story leaves design without agreed acceptance criteria.'
},
{
  id: 'GRP-CIQ',
  name: 'CoreIQ Capability',
  description:
  'Intelligence capabilities — detection, prediction, recommendation and automation — applied on top of core data.',
  track: 'delivery',
  process:
  'A CoreIQ capability follows the delivery track, with decomposition normally producing one epic for the model or logic itself and one for the surface that exposes it. Stories carry the evaluation criteria as acceptance criteria, and testing is expected to include an offline evaluation pass before deployment.'
}];


export const equipment: Equipment[] = [
{ id: 'EQP-01', name: 'Teltonika FMC130', vendor: 'Teltonika', model: 'FMC130', type: 'GPS Tracker' },
{ id: 'EQP-02', name: 'Teltonika FMC920', vendor: 'Teltonika', model: 'FMC920', type: 'GPS Tracker' },
{ id: 'EQP-03', name: 'Queclink GV355CEU', vendor: 'Queclink', model: 'GV355CEU', type: 'GPS Tracker' },
{ id: 'EQP-04', name: 'Howen Hero-ME41', vendor: 'Howen', model: 'Hero-ME41', type: 'MDVR / Video' },
{ id: 'EQP-05', name: 'Streamax AD Plus', vendor: 'Streamax', model: 'AD Plus', type: 'AI Dashcam' },
{ id: 'EQP-06', name: 'Technoton DUT-E S7', vendor: 'Technoton', model: 'DUT-E S7', type: 'Fuel Sensor' },
{ id: 'EQP-07', name: 'Escort TD-150', vendor: 'Escort', model: 'TD-150', type: 'Fuel Sensor' },
{ id: 'EQP-08', name: 'Teltonika TPMS Sensor', vendor: 'Teltonika', model: 'BLE TPMS', type: 'Tire Sensor' },
{ id: 'EQP-09', name: 'Ruptela Pro5', vendor: 'Ruptela', model: 'Pro5', type: 'CAN Reader' },
{ id: 'EQP-10', name: 'Bosch TCU Gateway', vendor: 'Bosch', model: 'TCU-G2', type: 'OEM Gateway' }];