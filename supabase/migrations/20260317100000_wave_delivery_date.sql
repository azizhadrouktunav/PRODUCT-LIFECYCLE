-- Planned delivery date for waves (nullable; existing waves keep no date).

alter table public.waves
  add column if not exists delivery_date date;
