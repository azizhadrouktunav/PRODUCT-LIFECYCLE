import { supabase } from '../utils/supabase';
import type {
  Actor,
  Capability,
  CapabilityGroup,
  CapabilityStatus,
  DecompositionMode,
  Domain,
  DomainCategory,
  Epic,
  Equipment,
  EquipmentType,
  Feature,
  Lifecycle,
  StageDef,
  StageRequirement,
  StageTone,
  UserStory,
  Wave,
  WaveState,
} from '../types/registry';
import { FALLBACK_LIFECYCLE, LIFECYCLE_TEMPLATES, TRACKS } from '../types/registry';

export interface RegistrySnapshot {
  categories: DomainCategory[];
  domains: Domain[];
  actors: Actor[];
  groups: CapabilityGroup[];
  equipment: Equipment[];
  equipmentTypes: EquipmentType[];
  lifecycles: Lifecycle[];
  capabilities: Capability[];
  epics: Epic[];
  features: Feature[];
  stories: UserStory[];
  waves: Wave[];
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

const VALID_REQUIREMENTS = new Set<StageRequirement>([
  'none',
  'epics',
  'features',
  'stories',
  'equipment',
]);

function mapStageDef(raw: unknown): StageDef | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const name = String(row.name ?? '').trim();
  if (!name) return null;
  const toneRaw = String(row.tone ?? 'blue') as StageTone;
  const reqRaw = String(row.requirement ?? 'none') as StageRequirement;
  return {
    name,
    description: String(row.description ?? ''),
    tone: VALID_TONES.has(toneRaw) ? toneRaw : 'blue',
    requirement: VALID_REQUIREMENTS.has(reqRaw) ? reqRaw : 'none',
  };
}

function mapStages(raw: unknown): StageDef[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(mapStageDef).filter((s): s is StageDef => s != null);
}

function mapLifecycle(row: Record<string, unknown>): Lifecycle {
  const decomposition: DecompositionMode =
    row.decomposition === 'none' ? 'none' : 'delivery';
  const stages = mapStages(row.stages);
  const storyStages = mapStages(row.story_stages);
  return {
    id: String(row.id),
    label: String(row.label ?? ''),
    summary: String(row.summary ?? ''),
    decomposition,
    stages: stages.length > 0 ? stages : LIFECYCLE_TEMPLATES[decomposition].stages,
    storyStages:
      decomposition === 'delivery'
        ? storyStages.length > 0
          ? storyStages
          : LIFECYCLE_TEMPLATES.delivery.storyStages
        : [],
  };
}

function lifecycleToRow(lc: Lifecycle) {
  return {
    id: lc.id,
    label: lc.label,
    summary: lc.summary,
    decomposition: lc.decomposition,
    stages: lc.stages,
    story_stages: lc.decomposition === 'delivery' ? lc.storyStages : [],
  };
}

async function ensureDefaultLifecycles(): Promise<Lifecycle[]> {
  const defaults = Object.values(TRACKS);
  const { error } = await supabase.from('lifecycles').upsert(defaults.map(lifecycleToRow));
  throwIfError(error, 'Seed default lifecycles');
  return defaults;
}

function asStatus(raw: string | null | undefined): CapabilityStatus | null {
  if (raw == null || raw === '') return null;
  return raw as CapabilityStatus;
}

function mapCategory(row: Record<string, unknown>): DomainCategory {
  return {
    id: String(row.id),
    name: String(row.name),
    shortName: String(row.short_name),
    prefix: String(row.prefix),
    description: String(row.description ?? ''),
  };
}

function mapDomain(row: Record<string, unknown>): Domain {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ''),
    categoryId: String(row.category_id),
  };
}

function mapActor(row: Record<string, unknown>): Actor {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ''),
    categoryIds: (row.category_ids as string[] | null) ?? [],
  };
}

function mapGroup(row: Record<string, unknown>): CapabilityGroup {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ''),
    track: String(row.track ?? FALLBACK_LIFECYCLE.id),
    process: String(row.process ?? ''),
  };
}

function mapEquipment(row: Record<string, unknown>): Equipment {
  return {
    id: String(row.id),
    name: String(row.name),
    vendor: String(row.vendor ?? ''),
    model: String(row.model ?? ''),
    type: String(row.type ?? ''),
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
    domainIds: (row.domain_ids as string[] | null) ?? [],
    jiraEpic: String(row.jira_epic ?? ''),
    equipmentIds: (row.equipment_ids as string[] | null) ?? [],
    progress: String(row.progress ?? 'Identified'),
    status: asStatus(row.status as string | null),
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
  };
}

function mapFeature(row: Record<string, unknown>): Feature {
  return {
    id: String(row.id),
    epicId: String(row.epic_id),
    name: String(row.name),
    description: String(row.description ?? ''),
    status: asStatus(row.status as string | null),
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
  };
}

function mapWave(row: Record<string, unknown>): Wave {
  return {
    id: String(row.id),
    code: String(row.code ?? ''),
    name: String(row.name),
    description: String(row.description ?? ''),
    state: String(row.state ?? 'Planned') as WaveState,
    itemIds: (row.item_ids as string[] | null) ?? [],
  };
}

function throwIfError(error: { message: string } | null, action: string): void {
  if (error) throw new Error(`${action}: ${error.message}`);
}

export async function fetchRegistry(): Promise<RegistrySnapshot> {
  const [
    categoriesRes,
    domainsRes,
    actorsRes,
    groupsRes,
    equipmentRes,
    equipmentTypesRes,
    lifecyclesRes,
    capabilitiesRes,
    epicsRes,
    featuresRes,
    storiesRes,
    wavesRes,
  ] = await Promise.all([
    supabase.from('domain_categories').select('*'),
    supabase.from('domains').select('*'),
    supabase.from('actors').select('*'),
    supabase.from('capability_groups').select('*'),
    supabase.from('equipment').select('*'),
    supabase.from('equipment_types').select('*'),
    supabase.from('lifecycles').select('*'),
    supabase.from('capabilities').select('*'),
    supabase.from('epics').select('*'),
    supabase.from('features').select('*'),
    supabase.from('user_stories').select('*'),
    supabase.from('waves').select('*'),
  ]);

  throwIfError(categoriesRes.error, 'Load domain_categories');
  throwIfError(domainsRes.error, 'Load domains');
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
    categories: (categoriesRes.data ?? []).map((r) => mapCategory(r as Record<string, unknown>)),
    domains: (domainsRes.data ?? []).map((r) => mapDomain(r as Record<string, unknown>)),
    actors: (actorsRes.data ?? []).map((r) => mapActor(r as Record<string, unknown>)),
    groups: (groupsRes.data ?? []).map((r) => mapGroup(r as Record<string, unknown>)),
    equipment,
    equipmentTypes,
    lifecycles,
    capabilities: (capabilitiesRes.data ?? []).map((r) => mapCapability(r as Record<string, unknown>)),
    epics: (epicsRes.data ?? []).map((r) => mapEpic(r as Record<string, unknown>)),
    features: (featuresRes.data ?? []).map((r) => mapFeature(r as Record<string, unknown>)),
    stories: (storiesRes.data ?? []).map((r) => mapStory(r as Record<string, unknown>)),
    waves: (wavesRes.data ?? []).map((r) => mapWave(r as Record<string, unknown>)),
  };
}

export async function upsertLifecycle(lifecycle: Lifecycle): Promise<void> {
  const { error } = await supabase.from('lifecycles').upsert(lifecycleToRow(lifecycle));
  throwIfError(error, 'Upsert lifecycle');
}

export async function deleteLifecycle(id: string): Promise<void> {
  const { error } = await supabase.from('lifecycles').delete().eq('id', id);
  throwIfError(error, 'Delete lifecycle');
}

export async function upsertCategory(cat: DomainCategory): Promise<void> {
  const { error } = await supabase.from('domain_categories').upsert({
    id: cat.id,
    name: cat.name,
    short_name: cat.shortName,
    prefix: cat.prefix,
    description: cat.description,
  });
  throwIfError(error, 'Upsert domain_category');
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('domain_categories').delete().eq('id', id);
  throwIfError(error, 'Delete domain_category');
}

export async function upsertDomain(domain: Domain): Promise<void> {
  const { error } = await supabase.from('domains').upsert({
    id: domain.id,
    name: domain.name,
    description: domain.description,
    category_id: domain.categoryId,
  });
  throwIfError(error, 'Upsert domain');
}

export async function upsertActor(actor: Actor): Promise<void> {
  const { error } = await supabase.from('actors').upsert({
    id: actor.id,
    name: actor.name,
    description: actor.description,
    category_ids: actor.categoryIds,
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
    track: group.track,
    process: group.process,
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
    domain_ids: cap.domainIds,
    jira_epic: cap.jiraEpic,
    equipment_ids: cap.equipmentIds,
    progress: cap.progress,
    status: cap.status,
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
    item_ids: wave.itemIds,
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

export async function deleteDomain(id: string): Promise<void> {
  const { error } = await supabase.from('domains').delete().eq('id', id);
  throwIfError(error, 'Delete domain');
}

export async function deleteEquipment(id: string): Promise<void> {
  const { error } = await supabase.from('equipment').delete().eq('id', id);
  throwIfError(error, 'Delete equipment');
}

export async function upsertCapabilities(items: Capability[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabase.from('capabilities').upsert(
    items.map((cap) => ({
      id: cap.id,
      name: cap.name,
      description: cap.description,
      group_id: cap.groupId,
      domain_ids: cap.domainIds,
      jira_epic: cap.jiraEpic,
      equipment_ids: cap.equipmentIds,
      progress: cap.progress,
      status: cap.status,
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
    }))
  );
  throwIfError(error, 'Upsert equipment batch');
}

export async function upsertDomains(items: Domain[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabase.from('domains').upsert(
    items.map((domain) => ({
      id: domain.id,
      name: domain.name,
      description: domain.description,
      category_id: domain.categoryId,
    }))
  );
  throwIfError(error, 'Upsert domains');
}

export async function upsertActors(items: Actor[]): Promise<void> {
  if (items.length === 0) return;
  const { error } = await supabase.from('actors').upsert(
    items.map((actor) => ({
      id: actor.id,
      name: actor.name,
      description: actor.description,
      category_ids: actor.categoryIds,
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
      track: group.track,
      process: group.process,
    }))
  );
  throwIfError(error, 'Upsert groups');
}
