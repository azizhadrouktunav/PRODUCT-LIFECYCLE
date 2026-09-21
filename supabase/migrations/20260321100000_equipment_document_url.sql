-- Optional document URL on equipment (link to datasheet, manual, etc.).
alter table public.equipment
  add column if not exists document_url text not null default '';

comment on column public.equipment.document_url is
  'Optional URL to a related document (datasheet, manual, etc.).';
