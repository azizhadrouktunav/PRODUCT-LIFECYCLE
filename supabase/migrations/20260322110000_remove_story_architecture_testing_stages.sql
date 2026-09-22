-- Remove story stages In Architecture / In Testing.
-- Remap existing stories and strip those stages from lifecycle JSON.

-- 1) Remap user_stories.stage
update public.user_stories
set stage = case stage
  when 'In Architecture' then 'In Development'
  when 'In Testing' then 'Ready for Deploy'
  else stage
end
where stage in ('In Architecture', 'In Testing');

-- 2) Strip removed stages from lifecycles.story_stages
update public.lifecycles
set story_stages = coalesce((
  select jsonb_agg(elem order by ordinality)
  from jsonb_array_elements(story_stages) with ordinality as t(elem, ordinality)
  where elem->>'name' not in ('In Architecture', 'In Testing')
), '[]'::jsonb)
where jsonb_typeof(story_stages) = 'array'
  and exists (
    select 1
    from jsonb_array_elements(story_stages) e
    where e->>'name' in ('In Architecture', 'In Testing')
  );

-- Soften delivery summary copy that still mentions testing as a story stage.
update public.lifecycles
set summary = replace(
  summary,
  'design, development, testing and release',
  'design, development and release'
)
where summary like '%design, development, testing and release%';

-- 3) Strip removed stages from story work-item type stages inside lifecycles.work_item_types
update public.lifecycles
set work_item_types = (
  select coalesce(jsonb_agg(
    case
      when elem->>'id' = 'story' and jsonb_typeof(elem->'stages') = 'array' then
        elem || jsonb_build_object(
          'stages',
          coalesce((
            select jsonb_agg(s order by ord)
            from jsonb_array_elements(elem->'stages') with ordinality as x(s, ord)
            where s->>'name' not in ('In Architecture', 'In Testing')
          ), '[]'::jsonb)
        )
      else elem
    end
    order by ordinality
  ), work_item_types)
  from jsonb_array_elements(work_item_types) with ordinality as t(elem, ordinality)
)
where jsonb_typeof(work_item_types) = 'array'
  and exists (
    select 1
    from jsonb_array_elements(work_item_types) wit,
         jsonb_array_elements(coalesce(wit->'stages', '[]'::jsonb)) s
    where wit->>'id' = 'story'
      and s->>'name' in ('In Architecture', 'In Testing')
  );

-- 4) Same cleanup for lifecycle_templates.story_stages
update public.lifecycle_templates
set story_stages = coalesce((
  select jsonb_agg(elem order by ordinality)
  from jsonb_array_elements(story_stages) with ordinality as t(elem, ordinality)
  where elem->>'name' not in ('In Architecture', 'In Testing')
), '[]'::jsonb)
where jsonb_typeof(story_stages) = 'array'
  and exists (
    select 1
    from jsonb_array_elements(story_stages) e
    where e->>'name' in ('In Architecture', 'In Testing')
  );

update public.lifecycle_templates
set summary = replace(
  summary,
  'design, development, testing and release',
  'design, development and release'
)
where summary like '%design, development, testing and release%';

-- 5) Strip from lifecycle_templates.work_item_types story stages
update public.lifecycle_templates
set work_item_types = (
  select coalesce(jsonb_agg(
    case
      when elem->>'id' = 'story' and jsonb_typeof(elem->'stages') = 'array' then
        elem || jsonb_build_object(
          'stages',
          coalesce((
            select jsonb_agg(s order by ord)
            from jsonb_array_elements(elem->'stages') with ordinality as x(s, ord)
            where s->>'name' not in ('In Architecture', 'In Testing')
          ), '[]'::jsonb)
        )
      else elem
    end
    order by ordinality
  ), work_item_types)
  from jsonb_array_elements(work_item_types) with ordinality as t(elem, ordinality)
)
where jsonb_typeof(work_item_types) = 'array'
  and exists (
    select 1
    from jsonb_array_elements(work_item_types) wit,
         jsonb_array_elements(coalesce(wit->'stages', '[]'::jsonb)) s
    where wit->>'id' = 'story'
      and s->>'name' in ('In Architecture', 'In Testing')
  );
