import { supabase } from '../utils/supabase';
import type {
  Actor,
  AutomationCondition,
  AutomationRule,
  AutoAggregate,
  AutoEntity,
  AutoField,
  AutoOp,
  Capability,
  CapabilityGroup,
  CapabilityStatus,
  ConditionCombineOp,
  ConditionNode,
  DecompositionMode,
  Epic,
  Equipment,
  EquipmentType,
  Feature,
  Lifecycle,
  LifecycleTemplate,
  Product,
  StageContentMode,
  StageDef,
  StageRequirement,
  StageTone,
  UserStory,
  Wave,
  WaveState,
  WorkItem,
  WorkItemTypeDef,
} from '../types/registry';
import {
  AUTO_AGGREGATES,
  AUTO_ENTITIES,
  AUTO_OPS,
  DEFAULT_WORK_ITEM_STATUSES,
  DELIVERY_WORK_ITEM_TYPES,
  FALLBACK_LIFECYCLE,
  LIFECYCLE_TEMPLATES,
  SYSTEM_TEMPLATE_IDS,
  TRACKS,
  builtInLifecycleTemplates,
  conditionsToWhen,
  normalizeRuleWhen,
  syncLegacyFromTypes,
} from '../types/registry';

export interface RegistrySnapshot {
  products: Product[];
  actors: Actor[];
  groups: CapabilityGroup[];
  equipment: Equipment[];
  equipmentTypes: EquipmentType[];
  lifecycles: Lifecycle[];
  lifecycleTemplates: LifecycleTemplate[];
  capabilities: Capability[];
  epics: Epic[];
  features: Feature[];
  stories: UserStory[];
  waves: Wave[];
  workItems: WorkItem[];
}

const VALID_TONES = new Set<StageTone>([
  'blue',
  'cyan',
  'amber',
  'orange',
  'green',
  'red',
  'violet',
  'pink',
  'gray',
]);

function mapStageDef(raw: unknown): StageDef | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const name = String(row.name ?? '').trim();
  if (!name) return null;
  const toneRaw = String(row.tone ?? 'blue') as StageTone;
  const reqRaw = String(row.requirement ?? 'none');
  const statusRaw = row.status;
  let status: CapabilityStatus | null | undefined;
  if (statusRaw === null || statusRaw === '') status = null;
  else if (typeof statusRaw === 'string') {
    const hit = (['On Hold', 'In Progress', 'Needs Review', 'Completed'] as CapabilityStatus[]).find(
      (s) => s === statusRaw
    );
    status = hit;
  }
  const contentMode: StageContentMode =
    row.contentMode === 'table' || row.content_mode === 'table' ? 'table' : 'inline';
  const opensRaw = row.opensTypeId ?? row.opens_type_id;
  return {
    name,
    description: String(row.description ?? ''),
    tone: VALID_TONES.has(toneRaw) ? toneRaw : 'blue',
    requirement: (reqRaw || 'none') as StageRequirement,
    ...(status !== undefined ? { status } : {}),
    contentMode,
    opensTypeId: opensRaw == null || opensRaw === '' ? null : String(opensRaw),
  };
}

function mapStages(raw: unknown): StageDef[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(mapStageDef).filter((s): s is StageDef => s != null);
}

function mapWorkItemType(raw: unknown): WorkItemTypeDef | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = String(row.id ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-');
  if (!id) return null;
  const statuses = Array.isArray(row.statuses)
    ? row.statuses.map((s) => String(s).trim()).filter(Boolean)
    : [...DEFAULT_WORK_ITEM_STATUSES];
  const parentRaw = row.parentTypeId ?? row.parent_type_id;
  const storage = row.storage === 'custom' ? 'custom' : 'builtin';
  const builtin = id === 'epic' || id === 'feature' || id === 'story' || id === 'equipment';
  return {
    id,
    label: String(row.label ?? id),
    pluralLabel: String(row.pluralLabel ?? row.plural_label ?? `${row.label ?? id}s`),
    parentTypeId: parentRaw == null || parentRaw === '' ? null : String(parentRaw),
    statuses: statuses.length > 0 ? statuses : [...DEFAULT_WORK_ITEM_STATUSES],
    stages: mapStages(row.stages),
    storage: builtin ? 'builtin' : storage,
  };
}

function mapWorkItemTypes(raw: unknown, decomposition: DecompositionMode, storyStages: StageDef[]): WorkItemTypeDef[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw.map(mapWorkItemType).filter((t): t is WorkItemTypeDef => t != null);
  }
  if (decomposition === 'delivery') {
    return DELIVERY_WORK_ITEM_TYPES.map((t) =>
      t.id === 'story' ? { ...t, stages: storyStages.length > 0 ? storyStages : t.stages } : { ...t }
    );
  }
  return [];
}

const AUTO_FIELDS: AutoField[] = ['status', 'progress', 'stage', 'state'];

function isValidAutoEntity(entity: string): entity is AutoEntity {
  if ((AUTO_ENTITIES as string[]).includes(entity)) return true;
  return entity.startsWith('work_item:') && entity.length > 'work_item:'.length;
}

function mapAutomationCondition(raw: unknown): AutomationCondition | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const sourceEntity = String(row.sourceEntity ?? '') as AutoEntity;
  const sourceField = String(row.sourceField ?? '') as AutoField;
  const aggregate = String(row.aggregate ?? 'all') as AutoAggregate;
  const op = String(row.op ?? 'eq') as AutoOp;
  if (!isValidAutoEntity(sourceEntity)) return null;
  if (!AUTO_FIELDS.includes(sourceField)) return null;
  if (!AUTO_AGGREGATES.includes(aggregate)) return null;
  if (!AUTO_OPS.includes(op)) return null;
  return {
    sourceEntity,
    sourceField,
    aggregate,
    op,
    value: String(row.value ?? ''),
  };
}

function mapConditionNode(raw: unknown): ConditionNode | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  if (row.kind === 'leaf' || row.condition) {
    const condition = mapAutomationCondition(row.condition ?? row);
    if (!condition) return null;
    return {
      kind: 'leaf',
      not: row.not === true,
      condition,
    };
  }
  if (row.kind === 'group' || Array.isArray(row.children)) {
    const op: ConditionCombineOp = row.op === 'or' ? 'or' : 'and';
    const children = Array.isArray(row.children)
      ? row.children.map(mapConditionNode).filter((n): n is ConditionNode => n != null)
      : [];
    return { kind: 'group', op, not: row.not === true, children };
  }
  return null;
}

function mapAutomationRule(raw: unknown): AutomationRule | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const id = String(row.id ?? '').trim();
  const targetEntity = String(row.targetEntity ?? '') as AutoEntity;
  const targetField = String(row.targetField ?? '') as AutoField;
  if (!id || !isValidAutoEntity(targetEntity) || !AUTO_FIELDS.includes(targetField)) {
    return null;
  }
  const conditions = Array.isArray(row.conditions)
    ? row.conditions.map(mapAutomationCondition).filter((c): c is AutomationCondition => c != null)
    : [];
  const when =
    mapConditionNode(row.when) ??
    (conditions.length > 0 ? conditionsToWhen(conditions) : { kind: 'group', op: 'and', children: [] });
  return {
    id,
    enabled: row.enabled !== false,
    targetEntity,
    targetField,
    setValue: String(row.setValue ?? ''),
    when: normalizeRuleWhen({ when, conditions }),
  };
}

function mapAutomationRules(raw: unknown): AutomationRule[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(mapAutomationRule).filter((r): r is AutomationRule => r != null);
}

function mapLifecycle(row: Record<string, unknown>): Lifecycle {
  const decomposition: DecompositionMode =
    row.decomposition === 'none' ? 'none' : 'delivery';
  const stages = mapStages(row.stages);
  const storyStages = mapStages(row.story_stages);
  const tpl = LIFECYCLE_TEMPLATES[decomposition];
  const workItemTypes = mapWorkItemTypes(row.work_item_types, decomposition, storyStages);
  const legacy = syncLegacyFromTypes({ workItemTypes, stages });
  return {
    id: String(row.id),
    label: String(row.label ?? ''),
    summary: String(row.summary ?? ''),
    decomposition: workItemTypes.length > 0 ? legacy.decomposition : decomposition,
    stages: stages.length > 0 ? stages : tpl.stages,
    storyStages:
      legacy.storyStages.length > 0
        ? legacy.storyStages
        : decomposition === 'delivery'
          ? storyStages.length > 0
            ? storyStages
            : tpl.storyStages
          : [],
    workItemTypes,
    productIds: (row.product_ids as string[] | null) ?? [],
    automationRules:
      row.automation_rules === undefined || row.automation_rules === null
        ? (tpl.automationRules ?? [])
        : mapAutomationRules(row.automation_rules),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function lifecycleToRow(lc: Lifecycle) {
  const legacy = syncLegacyFromTypes(lc);
  return {
    id: lc.id,
    label: lc.label,
    summary: lc.summary,
    decomposition: lc.workItemTypes?.length ? legacy.decomposition : lc.decomposition,
    stages: lc.stages,
    story_stages:
      (lc.workItemTypes?.length ? legacy.storyStages : lc.storyStages) ?? [],
    work_item_types: lc.workItemTypes ?? [],
    product_ids: lc.productIds ?? [],
    automation_rules: (lc.automationRules ?? []).map((r) => ({
      id: r.id,
      enabled: r.enabled,
      targetEntity: r.targetEntity,
      targetField: r.targetField,
      setValue: r.setValue,
      when: normalizeRuleWhen(r),
    })),
    sort_order: lc.sortOrder ?? 0,
  };
}

function mapLifecycleTemplate(row: Record<string, unknown>): LifecycleTemplate {
  const decomposition: DecompositionMode =
    row.decomposition === 'none' ? 'none' : 'delivery';
  const stages = mapStages(row.stages);
  const storyStages = mapStages(row.story_stages);
  const builtin = builtInLifecycleTemplates().find((t) => t.id === String(row.id));
  const tpl = LIFECYCLE_TEMPLATES[decomposition];
  const workItemTypes = mapWorkItemTypes(row.work_item_types, decomposition, storyStages);
  const legacy = syncLegacyFromTypes({ workItemTypes, stages });
  return {
    id: String(row.id),
    label: String(row.label ?? builtin?.label ?? ''),
    summary: String(row.summary ?? builtin?.summary ?? ''),
    decomposition: workItemTypes.length > 0 ? legacy.decomposition : decomposition,
    stages: stages.length > 0 ? stages : (builtin?.stages ?? tpl.stages),
    storyStages:
      legacy.storyStages.length > 0
        ? legacy.storyStages
        : storyStages.length > 0
          ? storyStages
          : (builtin?.storyStages ?? tpl.storyStages),
    workItemTypes:
      workItemTypes.length > 0 ? workItemTypes : (builtin?.workItemTypes ?? tpl.workItemTypes),
    productIds: (row.product_ids as string[] | null) ?? [],
    automationRules:
      row.automation_rules === undefined ||
      row.automation_rules === null ||
      (Array.isArray(row.automation_rules) && row.automation_rules.length === 0)
        ? (builtin?.automationRules ?? tpl.automationRules ?? [])
        : mapAutomationRules(row.automation_rules),
    isSystem: row.is_system === true || Object.values(SYSTEM_TEMPLATE_IDS).includes(String(row.id) as never),
  };
}

function lifecycleTemplateToRow(t: LifecycleTemplate) {
  const legacy = syncLegacyFromTypes(t);
  return {
    id: t.id,
    label: t.label,
    summary: t.summary,
    decomposition: t.workItemTypes?.length ? legacy.decomposition : t.decomposition,
    stages: t.stages,
    story_stages: (t.workItemTypes?.length ? legacy.storyStages : t.storyStages) ?? [],
    work_item_types: t.workItemTypes ?? [],
    automation_rules: (t.automationRules ?? []).map((r) => ({
      id: r.id,
      enabled: r.enabled,
      targetEntity: r.targetEntity,
      targetField: r.targetField,
      setValue: r.setValue,
      when: normalizeRuleWhen(r),
    })),
    product_ids: t.productIds ?? [],
    is_system: t.isSystem,
  };
}

async function ensureDefaultLifecycleTemplates(
  existing: LifecycleTemplate[]
): Promise<LifecycleTemplate[]> {
  const builtins = builtInLifecycleTemplates();
  const byId = new Map(existing.map((t) => [t.id, t]));
  const toUpsert: LifecycleTemplate[] = [];

  for (const b of builtins) {
    const cur = byId.get(b.id);
    // Seed or refresh empty system rows (migration placeholders).
    if (!cur || cur.stages.length === 0) {
      toUpsert.push(b);
      byId.set(b.id, b);
    } else if (!cur.isSystem) {
      byId.set(b.id, { ...cur, isSystem: true });
    }
  }

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from('lifecycle_templates')
      .upsert(toUpsert.map(lifecycleTemplateToRow));
    if (error) {
      // Table may not exist yet — fall back to in-memory builtins.
      if (/relation .*lifecycle_templates.* does not exist|Could not find the table/i.test(error.message)) {
        return builtins;
      }
      throwIfError(error, 'Seed lifecycle templates');
    }
  }

  return Array.from(byId.values());
}

async function ensureDefaultLifecycles(): Promise<Lifecycle[]> {
  const { data: productRows } = await supabase.from('products').select('id');
  const productIds = (productRows ?? []).map((r) => String((r as { id: string }).id));
  const defaults = Object.values(TRACKS).map((lc) => ({ ...lc, productIds }));
  const { error } = await supabase.from('lifecycles').upsert(defaults.map(lifecycleToRow));
  throwIfError(error, 'Seed default lifecycles');
  return defaults;
}

function asStatus(raw: string | null | undefined): CapabilityStatus | null {
  if (raw == null || raw === '') return null;
  if (raw === 'Approved') return 'In Progress';
  if (raw === 'Blocked' || raw === 'Rejected') return 'On Hold';
  const hit = (['On Hold', 'In Progress', 'Needs Review', 'Completed'] as CapabilityStatus[]).find(
    (s) => s === raw
  );
  return hit ?? null;
}

function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ''),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapActor(row: Record<string, unknown>): Actor {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ''),
    productIds: (row.product_ids as string[] | null) ?? [],
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapGroup(row: Record<string, unknown>): CapabilityGroup {
  const name = String(row.name);
  const rawCode = String(row.code ?? '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
  const fallback =
    name
      .trim()
      .split(/\s+/)[0]
      ?.replace(/[^a-zA-Z0-9]/g, '')
      .charAt(0)
      .toUpperCase() || 'G';
  return {
    id: String(row.id),
    name,
    description: String(row.description ?? ''),
    code: rawCode || fallback,
    track: String(row.track ?? FALLBACK_LIFECYCLE.id),
    process: String(row.process ?? ''),
    productIds: (row.product_ids as string[] | null) ?? [],
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapEquipment(row: Record<string, unknown>): Equipment {
  return {
    id: String(row.id),
    name: String(row.name),
    vendor: String(row.vendor ?? ''),
    model: String(row.model ?? ''),
    type: String(row.type ?? ''),
    productIds: (row.product_ids as string[] | null) ?? [],
    documentUrl: String(row.document_url ?? ''),
    status: asStatus(row.status as string | null),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapEquipmentType(row: Record<string, unknown>): EquipmentType {
  return {
    id: String(row.id),
    name: String(row.name),
  };
}

function mapCapability(row: Record<string, unknown>): Capability {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ''),
    groupId: String(row.group_id),
    productIds: (row.product_ids as string[] | null) ?? [],
    jiraEpic: String(row.jira_epic ?? ''),
    equipmentIds: (row.equipment_ids as string[] | null) ?? [],
    progress: String(row.progress ?? 'Identified'),
    status: asStatus(row.status as string | null),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapEpic(row: Record<string, unknown>): Epic {
  return {
    id: String(row.id),
    capabilityId: String(row.capability_id),
    key: String(row.key ?? ''),
    name: String(row.name),
    description: String(row.description ?? ''),
    status: asStatus(row.status as string | null),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapFeature(row: Record<string, unknown>): Feature {
  return {
    id: String(row.id),
    epicId: String(row.epic_id),
    name: String(row.name),
    description: String(row.description ?? ''),
    status: asStatus(row.status as string | null),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapStory(row: Record<string, unknown>): UserStory {
  return {
    id: String(row.id),
    featureId: String(row.feature_id),
    title: String(row.title),
    role: String(row.role ?? ''),
    actorIds: (row.actor_ids as string[] | null) ?? [],
    want: String(row.want ?? ''),
    benefit: String(row.benefit ?? ''),
    criteria: (row.criteria as string[] | null) ?? [],
    points: row.points == null ? null : Number(row.points),
    status: asStatus(row.status as string | null),
    stage: String(row.stage ?? 'In UI/UX Design'),
    adrContext: String(row.adr_context ?? ''),
    adrDecision: String(row.adr_decision ?? ''),
    adrTechnical: String(row.adr_technical ?? ''),
    adrConsequences: String(row.adr_consequences ?? ''),
    adrApproved: Boolean(row.adr_approved),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapWave(row: Record<string, unknown>): Wave {
  return {
    id: String(row.id),
    code: String(row.code ?? ''),
    name: String(row.name),
    description: String(row.description ?? ''),
    state: String(row.state ?? 'Planned') as WaveState,
    deliveryDate: row.delivery_date ? String(row.delivery_date).slice(0, 10) : '',
    itemIds: (row.item_ids as string[] | null) ?? [],
    productIds: (row.product_ids as string[] | null) ?? [],
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function mapWorkItem(row: Record<string, unknown>): WorkItem {
  return {
    id: String(row.id),
    typeId: String(row.type_id),
    capabilityId: String(row.capability_id),
    parentId: row.parent_id == null || row.parent_id === '' ? null : String(row.parent_id),
    name: String(row.name),
    description: String(row.description ?? ''),
    status: String(row.status ?? 'In Progress'),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function throwIfError(error: { message: string } | null, action: string): void {
  if (error) throw new Error(`${action}: ${error.message}`);
}

export async function fetchRegistry(): Promise<RegistrySnapshot> {
  const [
    productsRes,
    actorsRes,
    groupsRes,
    equipmentRes,
    equipmentTypesRes,
    lifecyclesRes,
    lifecycleTemplatesRes,
    capabilitiesRes,
    epicsRes,
    featuresRes,
    storiesRes,
    wavesRes,
    workItemsRes,
  ] = await Promise.all([
    supabase.from('products').select('*'),
    supabase.from('actors').select('*'),
    supabase.from('capability_groups').select('*'),
    supabase.from('equipment').select('*'),
    supabase.from('equipment_types').select('*'),
    supabase.from('lifecycles').select('*'),
    supabase.from('lifecycle_templates').select('*'),
    supabase.from('capabilities').select('*'),
    supabase.from('epics').select('*'),
    supabase.from('features').select('*'),
    supabase.from('user_stories').select('*'),
    supabase.from('waves').select('*'),
    supabase.from('work_items').select('*'),
  ]);

  throwIfError(productsRes.error, 'Load products');
  throwIfError(actorsRes.error, 'Load actors');
  throwIfError(groupsRes.error, 'Load capability_groups');
  throwIfError(equipmentRes.error, 'Load equipment');
  throwIfError(equipmentTypesRes.error, 'Load equipment_types');
  throwIfError(lifecyclesRes.error, 'Load lifecycles');
  throwIfError(capabilitiesRes.error, 'Load capabilities');
  throwIfError(epicsRes.error, 'Load epics');
  throwIfError(featuresRes.error, 'Load features');
  throwIfError(storiesRes.error, 'Load user_stories');
  throwIfError(wavesRes.error, 'Load waves');
  // work_items may not exist until migration — treat missing table as empty
  const workItemsError = workItemsRes.error;
  const workItemsMissing =
    !!workItemsError &&
    /relation .*work_items.* does not exist|Could not find the table/i.test(
      workItemsError.message
    );
  if (workItemsError && !workItemsMissing) {
    throwIfError(workItemsError, 'Load work_items');
  }

  const templatesError = lifecycleTemplatesRes.error;
  const templatesMissing =
    !!templatesError &&
    /relation .*lifecycle_templates.* does not exist|Could not find the table/i.test(
      templatesError.message
    );
  if (templatesError && !templatesMissing) {
    throwIfError(templatesError, 'Load lifecycle_templates');
  }

  let lifecycles = (lifecyclesRes.data ?? []).map((r) => mapLifecycle(r as Record<string, unknown>));
  if (lifecycles.length === 0) {
    lifecycles = await ensureDefaultLifecycles();
  } else {
    // Ensure seeded hardware/delivery exist even if only custom lifecycles were present.
    const known = new Set(lifecycles.map((l) => l.id));
    const missingDefaults = Object.values(TRACKS).filter((t) => !known.has(t.id));
    if (missingDefaults.length > 0) {
      const { error } = await supabase
        .from('lifecycles')
        .upsert(missingDefaults.map(lifecycleToRow));
      throwIfError(error, 'Seed missing default lifecycles');
      lifecycles = [...lifecycles, ...missingDefaults];
    }
  }

  let lifecycleTemplates = templatesMissing
    ? builtInLifecycleTemplates()
    : await ensureDefaultLifecycleTemplates(
        (lifecycleTemplatesRes.data ?? []).map((r) =>
          mapLifecycleTemplate(r as Record<string, unknown>)
        )
      );

  const equipment = (equipmentRes.data ?? []).map((r) => mapEquipment(r as Record<string, unknown>));
  let equipmentTypes = (equipmentTypesRes.data ?? []).map((r) =>
    mapEquipmentType(r as Record<string, unknown>)
  );

  // Bootstrap types from existing equipment.type values (no hardcoded defaults).
  const knownNames = new Set(equipmentTypes.map((t) => t.name));
  const missing = [
    ...new Set(
      equipment
        .map((e) => e.type.trim())
        .filter((name) => name !== '' && !knownNames.has(name))
    ),
  ];
  if (missing.length > 0) {
    const toCreate: EquipmentType[] = missing.map((name, i) => ({
      id: `EQT-${String(equipmentTypes.length + i + 1).padStart(3, '0')}`,
      name,
    }));
    const { error } = await supabase.from('equipment_types').upsert(
      toCreate.map((t) => ({ id: t.id, name: t.name }))
    );
    throwIfError(error, 'Bootstrap equipment_types');
    equipmentTypes = [...equipmentTypes, ...toCreate];
  }

  return {
    products: (productsRes.data ?? []).map((r) => mapProduct(r as Record<string, unknown>)),
    actors: (actorsRes.data ?? []).map((r) => mapActor(r as Record<string, unknown>)),
    groups: (groupsRes.data ?? []).map((r) => mapGroup(r as Record<string, unknown>)),
    equipment,
    equipmentTypes,
    lifecycles,
    lifecycleTemplates,
    capabilities: (capabilitiesRes.data ?? []).map((r) => mapCapability(r as Record<string, unknown>)),
    epics: (epicsRes.data ?? []).map((r) => mapEpic(r as Record<string, unknown>)),
    features: (featuresRes.data ?? []).map((r) => mapFeature(r as Record<string, unknown>)),
    stories: (storiesRes.data ?? []).map((r) => mapStory(r as Record<string, unknown>)),
    waves: (wavesRes.data ?? []).map((r) => mapWave(r as Record<string, unknown>)),
    workItems: workItemsMissing
      ? []
      : (workItemsRes.data ?? []).map((r) => mapWorkItem(r as Record<string, unknown>)),
  };
}

export async function upsertLifecycle(lifecycle: Lifecycle): Promise<void> {
  const { error } = await supabase.from('lifecycles').upsert(lifecycleToRow(lifecycle));
  throwIfError(error, 'Upsert lifecycle');
}

export async function upsertLifecycleTemplate(template: LifecycleTemplate): Promise<void> {
  const { error } = await supabase
    .from('lifecycle_templates')
    .upsert(lifecycleTemplateToRow(template));
  throwIfError(error, 'Upsert lifecycle_template');
}

export async function deleteLifecycleTemplate(id: string): Promise<void> {
  const { error } = await supabase.from('lifecycle_templates').delete().eq('id', id);
  throwIfError(error, 'Delete lifecycle_template');
}

export async function deleteLifecycle(id: string): Promise<void> {
  const { error } = await supabase.from('lifecycles').delete().eq('id', id);
  throwIfError(error, 'Delete lifecycle');
}

export async function upsertProduct(product: Product): Promise<void> {
  const { error } = await supabase.from('products').upsert({
    id: product.id,
    name: product.name,
    description: product.description,
    sort_order: product.sortOrder ?? 0,
  });
  throwIfError(error, 'Upsert product');
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  throwIfError(error, 'Delete product');
}

export async function upsertActor(actor: Actor): Promise<void> {
  const { error } = await supabase.from('actors').upsert({
    id: actor.id,
    name: actor.name,
    description: actor.description,
    product_ids: actor.productIds,
    sort_order: actor.sortOrder ?? 0,
  });
  throwIfError(error, 'Upsert actor');
}

export async function deleteActor(id: string): Promise<void> {
  const { error } = await supabase.from('actors').delete().eq('id', id);
  throwIfError(error, 'Delete actor');
}

export async function upsertGroup(group: CapabilityGroup): Promise<void> {
  const { error } = await supabase.from('capability_groups').upsert({
    id: group.id,
    name: group.name,
    description: group.description,
    code: group.code,
    track: group.track,
    process: group.process,
    product_ids: group.productIds,
    sort_order: group.sortOrder ?? 0,
  });
  throwIfError(error, 'Upsert capability_group');
}

export async function upsertEquipment(item: Equipment): Promise<void> {
  const { error } = await supabase.from('equipment').upsert({
    id: item.id,
    name: item.name,
    vendor: item.vendor,
    model: item.model,
    type: item.type,
    product_ids: item.productIds,
    document_url: item.documentUrl ?? '',
    status: item.status,
    sort_order: item.sortOrder ?? 0,
  });
  throwIfError(error, 'Upsert equipment');
}

export async function upsertEquipmentType(item: EquipmentType): Promise<void> {
  const { error } = await supabase.from('equipment_types').upsert({
    id: item.id,
    name: item.name,
  });
  throwIfError(error, 'Upsert equipment_type');
}

export async function deleteEquipmentType(id: string): Promise<void> {
  const { error } = await supabase.from('equipment_types').delete().eq('id', id);
  throwIfError(error, 'Delete equipment_type');
}

export async function upsertCapability(cap: Capability): Promise<void> {
  const { error } = await supabase.from('capabilities').upsert({
    id: cap.id,
    name: cap.name,
    description: cap.description,
    group_id: cap.groupId,
    product_ids: cap.productIds,
    jira_epic: cap.jiraEpic,
    equipment_ids: cap.equipmentIds,
    progress: cap.progress,
    status: cap.status,
    sort_order: cap.sortOrder ?? 0,
  });
  throwIfError(error, 'Upsert capability');
}

export async function upsertEpic(epic: Epic): Promise<void> {
  const { error } = await supabase.from('epics').upsert({
    id: epic.id,
    capability_id: epic.capabilityId,
    key: epic.key,
    name: epic.name,
    description: epic.description,
    status: epic.status,
    sort_order: epic.sortOrder ?? 0,
  });
  throwIfError(error, 'Upsert epic');
}

export async function upsertFeature(feature: Feature): Promise<void> {
  const { error } = await supabase.from('features').upsert({
    id: feature.id,
    epic_id: feature.epicId,
    name: feature.name,
    description: feature.description,
    status: feature.status,
    sort_order: feature.sortOrder ?? 0,
  });
  throwIfError(error, 'Upsert feature');
}

export async function upsertStory(story: UserStory): Promise<void> {
  const { error } = await supabase.from('user_stories').upsert({
    id: story.id,
    feature_id: story.featureId,
    title: story.title,
    role: story.role,
    actor_ids: story.actorIds ?? [],
    want: story.want,
    benefit: story.benefit,
    criteria: story.criteria,
    points: story.points,
    status: story.status,
    stage: story.stage,
    adr_context: story.adrContext ?? '',
    adr_decision: story.adrDecision ?? '',
    adr_technical: story.adrTechnical ?? '',
    adr_consequences: story.adrConsequences ?? '',
    adr_approved: story.adrApproved ?? false,
    sort_order: story.sortOrder ?? 0,
  });
  throwIfError(error, 'Upsert user_story');
}

export async function upsertWave(wave: Wave): Promise<void> {
  const { error } = await supabase.from('waves').upsert({
    id: wave.id,
    code: wave.code,
    name: wave.name,
    description: wave.description,
    state: wave.state,
    delivery_date: wave.deliveryDate ? wave.deliveryDate : null,
    item_ids: wave.itemIds,
    product_ids: wave.productIds,
    sort_order: wave.sortOrder ?? 0,
  });
  throwIfError(error, 'Upsert wave');
}

export async function deleteEpic(id: string): Promise<void> {
  const { error } = await supabase.from('epics').delete().eq('id', id);
  throwIfError(error, 'Delete epic');
}

export async function deleteFeature(id: string): Promise<void> {
  const { error } = await supabase.from('features').delete().eq('id', id);
  throwIfError(error, 'Delete feature');
}

export async function deleteStory(id: string): Promise<void> {
  const { error } = await supabase.from('user_stories').delete().eq('id', id);
  throwIfError(error, 'Delete story');
}

export async function deleteWave(id: string): Promise<void> {
  const { error } = await supabase.from('waves').delete().eq('id', id);
  throwIfError(error, 'Delete wave');
}

export async function deleteCapability(id: string): Promise<void> {
  const { error } = await supabase.from('capabilities').delete().eq('id', id);
  throwIfError(error, 'Delete capability');
}

export async function deleteGroup(id: string): Promise<void> {
  const { error } = await supabase.from('capability_groups').delete().eq('id', id);
  throwIfError(error, 'Delete capability_group');
}

export async function deleteEquipment(id: string): Promise<void> {
  const { error } = await supabase.from('equipment').delete().eq('id', id);
  throwIfError(error, 'Delete equipment');
}

/**
 * Assigning capabilities to a device writes capabilities.equipment_ids, and
 * manage_equipment deliberately has no update rights on that table. The RPC is
 * the one path that touches the column, checking manage_equipment itself.
 */
export async function setEquipmentCapabilities(
  equipmentId: string,
  capabilityIds: string[]
): Promise<void> {
  const { error } = await supabase.rpc('app_set_equipment_capabilities', {
    p_equipment_id: equipmentId,
    p_capability_ids: capabilityIds,
  });
  throwIfError(error, 'Assign equipment capabilities');
}

export async function upsertCapabilities(items: Capability[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabase.from('capabilities').upsert(
    items.map((cap) => ({
      id: cap.id,
      name: cap.name,
      description: cap.description,
      group_id: cap.groupId,
      product_ids: cap.productIds,
      jira_epic: cap.jiraEpic,
      equipment_ids: cap.equipmentIds,
      progress: cap.progress,
      status: cap.status,
      sort_order: cap.sortOrder ?? 0,
    }))
  );
  throwIfError(error, 'Upsert capabilities');
}

export async function upsertEpics(items: Epic[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabase.from('epics').upsert(
    items.map((epic) => ({
      id: epic.id,
      capability_id: epic.capabilityId,
      key: epic.key,
      name: epic.name,
      description: epic.description,
      status: epic.status,
      sort_order: epic.sortOrder ?? 0,
    }))
  );
  throwIfError(error, 'Upsert epics');
}

export async function upsertFeatures(items: Feature[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabase.from('features').upsert(
    items.map((feature) => ({
      id: feature.id,
      epic_id: feature.epicId,
      name: feature.name,
      description: feature.description,
      status: feature.status,
      sort_order: feature.sortOrder ?? 0,
    }))
  );
  throwIfError(error, 'Upsert features');
}

export async function upsertStories(items: UserStory[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabase.from('user_stories').upsert(
    items.map((story) => ({
      id: story.id,
      feature_id: story.featureId,
      title: story.title,
      role: story.role,
      actor_ids: story.actorIds ?? [],
      want: story.want,
      benefit: story.benefit,
      criteria: story.criteria,
      points: story.points,
      status: story.status,
      stage: story.stage,
      adr_context: story.adrContext ?? '',
      adr_decision: story.adrDecision ?? '',
      adr_technical: story.adrTechnical ?? '',
      adr_consequences: story.adrConsequences ?? '',
      adr_approved: story.adrApproved ?? false,
      sort_order: story.sortOrder ?? 0,
    }))
  );
  throwIfError(error, 'Upsert stories');
}

export async function upsertEquipmentMany(items: Equipment[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabase.from('equipment').upsert(
    items.map((item) => ({
      id: item.id,
      name: item.name,
      vendor: item.vendor,
      model: item.model,
      type: item.type,
      product_ids: item.productIds,
      document_url: item.documentUrl ?? '',
      status: item.status,
      sort_order: item.sortOrder ?? 0,
    }))
  );
  throwIfError(error, 'Upsert equipment batch');
}

export async function upsertProducts(items: Product[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabase.from('products').upsert(
    items.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      sort_order: product.sortOrder ?? 0,
    }))
  );
  throwIfError(error, 'Upsert products');
}

export async function upsertActors(items: Actor[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabase.from('actors').upsert(
    items.map((actor) => ({
      id: actor.id,
      name: actor.name,
      description: actor.description,
      product_ids: actor.productIds,
      sort_order: actor.sortOrder ?? 0,
    }))
  );
  throwIfError(error, 'Upsert actors');
}

export async function upsertGroups(items: CapabilityGroup[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabase.from('capability_groups').upsert(
    items.map((group) => ({
      id: group.id,
      name: group.name,
      description: group.description,
      code: group.code,
      track: group.track,
      process: group.process,
      product_ids: group.productIds,
      sort_order: group.sortOrder ?? 0,
    }))
  );
  throwIfError(error, 'Upsert groups');
}

export async function upsertWaves(items: Wave[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabase.from('waves').upsert(
    items.map((wave) => ({
      id: wave.id,
      code: wave.code,
      name: wave.name,
      description: wave.description,
      state: wave.state,
      delivery_date: wave.deliveryDate ? wave.deliveryDate : null,
      item_ids: wave.itemIds,
      product_ids: wave.productIds,
      sort_order: wave.sortOrder ?? 0,
    }))
  );
  throwIfError(error, 'Upsert waves');
}

export async function upsertLifecycles(items: Lifecycle[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabase.from('lifecycles').upsert(items.map(lifecycleToRow));
  throwIfError(error, 'Upsert lifecycles');
}

export async function upsertWorkItem(item: WorkItem): Promise<void> {
  const { error } = await supabase.from('work_items').upsert({
    id: item.id,
    type_id: item.typeId,
    capability_id: item.capabilityId,
    parent_id: item.parentId,
    name: item.name,
    description: item.description,
    status: item.status,
    sort_order: item.sortOrder,
  });
  throwIfError(error, 'Upsert work_item');
}

export async function upsertWorkItems(items: WorkItem[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabase.from('work_items').upsert(
    items.map((item) => ({
      id: item.id,
      type_id: item.typeId,
      capability_id: item.capabilityId,
      parent_id: item.parentId,
      name: item.name,
      description: item.description,
      status: item.status,
      sort_order: item.sortOrder,
    }))
  );
  throwIfError(error, 'Upsert work_items');
}

export async function deleteWorkItem(id: string): Promise<void> {
  const { error } = await supabase.from('work_items').delete().eq('id', id);
  throwIfError(error, 'Delete work_item');
}
