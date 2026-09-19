-- Remap removed capability status values.
-- Approved → In Progress; Blocked / Rejected → On Hold.
-- Stage-level status lives in lifecycles.stages jsonb (no column change).

update public.capabilities
set status = case status
  when 'Approved' then 'In Progress'
  when 'Blocked' then 'On Hold'
  when 'Rejected' then 'On Hold'
  else status
end
where status in ('Approved', 'Blocked', 'Rejected');

update public.epics
set status = case status
  when 'Approved' then 'In Progress'
  when 'Blocked' then 'On Hold'
  when 'Rejected' then 'On Hold'
  else status
end
where status in ('Approved', 'Blocked', 'Rejected');

update public.features
set status = case status
  when 'Approved' then 'In Progress'
  when 'Blocked' then 'On Hold'
  when 'Rejected' then 'On Hold'
  else status
end
where status in ('Approved', 'Blocked', 'Rejected');

update public.user_stories
set status = case status
  when 'Approved' then 'In Progress'
  when 'Blocked' then 'On Hold'
  when 'Rejected' then 'On Hold'
  else status
end
where status in ('Approved', 'Blocked', 'Rejected');

-- Seed stage.status on built-in lifecycle templates when missing.
update public.lifecycles
set stages = (
  select coalesce(jsonb_agg(
    case
      when (elem->>'name') in ('Active', 'User Story Definition')
        then elem || '{"status":"Completed"}'::jsonb
      when elem ? 'status' then elem
      else elem || '{"status":"In Progress"}'::jsonb
    end
    order by ordinality
  ), stages)
  from jsonb_array_elements(stages) with ordinality as t(elem, ordinality)
)
where jsonb_typeof(stages) = 'array'
  and exists (
    select 1
    from jsonb_array_elements(stages) e
    where not (e ? 'status')
  );
