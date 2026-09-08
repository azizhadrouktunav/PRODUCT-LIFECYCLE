import type { Wave } from '../types/registry';

export const initialWaves: Wave[] = [
{
  id: 'WAVE-001',
  code: 'W-01',
  name: 'Fuel visibility increment',
  description:
  'First testable increment on production: drain detection running in shadow mode with the calibration pipeline behind it.',
  state: 'In Test',
  itemIds: ['CAP-0015', 'EPIC-001', 'EPIC-005', 'FEAT-009', 'US-009', 'US-003']
},
{
  id: 'WAVE-002',
  code: 'W-02',
  name: 'Map operations increment',
  description: 'Filtering and drill-down on the live map, released to two pilot tenants first.',
  state: 'Planned',
  itemIds: ['CAP-0012', 'EPIC-004', 'FEAT-007', 'US-008']
},
{
  id: 'WAVE-003',
  code: 'W-03',
  name: 'Core ingestion increment',
  description: 'Vendor decoder registry rolled out gateway by gateway, with raw fallback kept on.',
  state: 'Planned',
  itemIds: ['CAP-0007', 'EPIC-007', 'FEAT-011', 'US-010']
}];