import { supabase } from '../utils/supabase';
import type {
  Capability,
  CapabilityGroup,
  CapabilityStatus,
  Domain,
  DomainCategory,
  Epic,
  Equipment,
  Feature,
  TrackId,
  UserStory,
  Wave,
  WaveState,
} from '../types/registry';

export interface RegistrySnapshot {
  categories: DomainCategory[];
  domains: Domain[];
  groups: CapabilityGroup[];
  equipment: Equipment[];
  capabilities: Capability[];
  epics: Epic[];
  features: Feature[];
  stories: UserStory[];
  waves: Wave[];
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

function mapGroup(row: Record<string, unknown>): CapabilityGroup {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ''),
    track: (row.track === 'hardware' ? 'hardware' : 'delivery') as TrackId,
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
    groupsRes,
    equipmentRes,
    capabilitiesRes,
    epicsRes,
    featuresRes,
    storiesRes,
    wavesRes,
  ] = await Promise.all([
    supabase.from('domain_categories').select('*'),
    supabase.from('domains').select('*'),
    supabase.from('capability_groups').select('*'),
    supabase.from('equipment').select('*'),
    supabase.from('capabilities').select('*'),
    supabase.from('epics').select('*'),
    supabase.from('features').select('*'),
    supabase.from('user_stories').select('*'),
    supabase.from('waves').select('*'),
  ]);

  throwIfError(categoriesRes.error, 'Load domain_categories');
  throwIfError(domainsRes.error, 'Load domains');
  throwIfError(groupsRes.error, 'Load capability_groups');
  throwIfError(equipmentRes.error, 'Load equipment');
  throwIfError(capabilitiesRes.error, 'Load capabilities');
  throwIfError(epicsRes.error, 'Load epics');
  throwIfError(featuresRes.error, 'Load features');
  throwIfError(storiesRes.error, 'Load user_stories');
  throwIfError(wavesRes.error, 'Load waves');

  return {
    categories: (categoriesRes.data ?? []).map((r) => mapCategory(r as Record<string, unknown>)),
    domains: (domainsRes.data ?? []).map((r) => mapDomain(r as Record<string, unknown>)),
    groups: (groupsRes.data ?? []).map((r) => mapGroup(r as Record<string, unknown>)),
    equipment: (equipmentRes.data ?? []).map((r) => mapEquipment(r as Record<string, unknown>)),
    capabilities: (capabilitiesRes.data ?? []).map((r) => mapCapability(r as Record<string, unknown>)),
    epics: (epicsRes.data ?? []).map((r) => mapEpic(r as Record<string, unknown>)),
    features: (featuresRes.data ?? []).map((r) => mapFeature(r as Record<string, unknown>)),
    stories: (storiesRes.data ?? []).map((r) => mapStory(r as Record<string, unknown>)),
    waves: (wavesRes.data ?? []).map((r) => mapWave(r as Record<string, unknown>)),
  };
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

export async function upsertDomain(domain: Domain): Promise<void> {
  const { error } = await supabase.from('domains').upsert({
    id: domain.id,
    name: domain.name,
    description: domain.description,
    category_id: domain.categoryId,
  });
  throwIfError(error, 'Upsert domain');
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
