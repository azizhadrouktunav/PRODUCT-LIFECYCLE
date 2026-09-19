-- Lifecycle automation rules + equipment status for cross-table auto status.

alter table public.lifecycles
  add column if not exists automation_rules jsonb not null default '[]'::jsonb;

alter table public.equipment
  add column if not exists status text;

comment on column public.lifecycles.automation_rules is
  'JSON array of AutomationRule: target/conditions for status automation within this lifecycle.';

comment on column public.equipment.status is
  'Operational status (On Hold / In Progress / Needs Review / Completed), nullable = No flag / auto.';
