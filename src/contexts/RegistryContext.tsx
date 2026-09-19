import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { DatasetId, ImportResult } from '../utils/datasets';
import { DATASETS, DELIVERY_PACK } from '../utils/datasets';
import type { SheetRow } from '../utils/excel';
import type {
  Actor,
  AutomationRule,
  Capability,
  CapabilityGroup,
  CapabilityStatus,
  DecompositionMode,
  Epic,
  Equipment,
  EquipmentType,
  Feature,
  Lifecycle,
  Product,
  RecordCounts,
  StageDef,
  TrackId,
  UserStory,
  Wave,
} from '../types/registry';
import {
  CAPABILITY_STATUSES,
  DEFAULT_STORY_STAGES,
  FALLBACK_LIFECYCLE,
  computeCapabilityProgress,
  isAutoManagedStatus,
  statusForStage,
  usesEquipment,
} from '../types/registry';
import * as api from '../lib/registryApi';
import { runAutomation } from '../lib/automationEngine';

function countsForCapability(
  cap: Capability,
  epics: Epic[],
  features: Feature[],
  stories: UserStory[]
): RecordCounts {
  const epicIds = epics.filter((e) => e.capabilityId === cap.id).map((e) => e.id);
  const featureIds = features.filter((f) => epicIds.includes(f.epicId)).map((f) => f.id);
  return {
    epics: epicIds.length,
    features: featureIds.length,
    stories: stories.filter((s) => featureIds.includes(s.featureId)).length,
    equipment: cap.equipmentIds.length,
  };
}

function withAutoProgress(
  cap: Capability,
  epics: Epic[],
  features: Feature[],
  stories: UserStory[],
  lifecycle: Lifecycle
): Capability {
  const counts = countsForCapability(cap, epics, features, stories);
  const progress = computeCapabilityProgress(lifecycle, counts);
  const status = isAutoManagedStatus(cap.status)
    ? statusForStage(lifecycle, progress)
    : cap.status;
  if (cap.progress === progress && cap.status === status) return cap;
  return { ...cap, progress, status };
}

export type LifecycleInput = {
  label: string;
  summary: string;
  decomposition: DecompositionMode;
  stages: StageDef[];
  storyStages: StageDef[];
  productIds: string[];
  automationRules: AutomationRule[];
};

export interface NewCapabilityInput {
  name: string;
  description: string;
  groupId: string;
  productIds: string[];
  jiraEpic: string;
  equipmentIds: string[];
}

export type EpicInput = Pick<Epic, 'key' | 'name' | 'description' | 'status'>;
export type FeatureInput = Pick<Feature, 'name' | 'description' | 'status'>;
export type StoryInput = Pick<
  UserStory,
  | 'title'
  | 'role'
  | 'actorIds'
  | 'want'
  | 'benefit'
  | 'criteria'
  | 'points'
  | 'status'
  | 'stage'
  | 'adrContext'
  | 'adrDecision'
  | 'adrTechnical'
  | 'adrConsequences'
  | 'adrApproved'
>;

export type EquipmentInput = Pick<Equipment, 'name' | 'vendor' | 'model' | 'type' | 'productIds'> & {
  status?: CapabilityStatus | null;
};
export type WaveInput = Pick<
  Wave,
  'code' | 'name' | 'description' | 'state' | 'deliveryDate' | 'itemIds' | 'productIds'
>;
export type ProductInput = Pick<Product, 'name' | 'description'>;
export type ActorInput = Pick<Actor, 'name' | 'description' | 'productIds'>;
export type GroupInput = Pick<
  CapabilityGroup,
  'name' | 'description' | 'track' | 'process' | 'code' | 'productIds'
>;

interface RegistryValue {
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  capabilities: Capability[];
  groups: CapabilityGroup[];
  products: Product[];
  actors: Actor[];
  equipment: Equipment[];
  equipmentTypes: EquipmentType[];
  lifecycles: Lifecycle[];
  epics: Epic[];
  features: Feature[];
  stories: UserStory[];
  waves: Wave[];
  addCapability: (input: NewCapabilityInput) => Capability;
  updateCapability: (id: string, patch: Partial<Omit<Capability, 'id'>>) => void;
  removeCapability: (id: string) => void;
  addGroup: (input: GroupInput) => void;
  updateGroup: (id: string, patch: Partial<GroupInput>) => void;
  removeGroup: (id: string) => boolean;
  addLifecycle: (input: LifecycleInput) => Lifecycle;
  updateLifecycle: (id: string, patch: Partial<LifecycleInput>) => void;
  removeLifecycle: (id: string) => boolean;
  getLifecycle: (id: string) => Lifecycle;
  lifecycleOf: (capability: Capability) => Lifecycle;
  lifecycleOfGroup: (groupId: string) => Lifecycle;
  addProduct: (input: ProductInput) => Product;
  updateProduct: (id: string, patch: Partial<ProductInput>) => void;
  removeProduct: (id: string) => void;
  addActor: (input: ActorInput) => Actor;
  updateActor: (id: string, patch: Partial<ActorInput>) => void;
  removeActor: (id: string) => void;
  getActor: (id: string) => Actor | undefined;
  setEquipmentCapabilities: (equipmentId: string, capabilityIds: string[]) => void;
  addEpic: (capabilityId: string, input: EpicInput) => void;
  updateEpic: (id: string, patch: Partial<EpicInput>) => void;
  removeEpic: (id: string) => void;
  addFeature: (epicId: string, input: FeatureInput) => void;
  updateFeature: (id: string, patch: Partial<FeatureInput>) => void;
  removeFeature: (id: string) => void;
  addStory: (featureId: string, input: StoryInput) => void;
  updateStory: (id: string, patch: Partial<StoryInput>) => void;
  removeStory: (id: string) => void;
  addEquipment: (input: EquipmentInput) => Equipment;
  updateEquipment: (id: string, patch: Partial<EquipmentInput>) => void;
  removeEquipment: (id: string) => void;
  addEquipmentType: (name: string) => EquipmentType | null;
  removeEquipmentType: (id: string) => boolean;
  addWave: (input: WaveInput) => Wave;
  updateWave: (id: string, patch: Partial<WaveInput>) => void;
  removeWave: (id: string) => void;
  getGroup: (groupId: string) => CapabilityGroup | undefined;
  getProduct: (productId: string) => Product | undefined;
  getCapability: (id: string) => Capability | undefined;
  getEpic: (id: string) => Epic | undefined;
  getFeature: (id: string) => Feature | undefined;
  getStory: (id: string) => UserStory | undefined;
  trackOf: (capability: Capability) => TrackId;
  epicsOf: (capabilityId: string) => Epic[];
  featuresOf: (epicId: string) => Feature[];
  storiesOf: (featureId: string) => UserStory[];
  storiesOfEpic: (epicId: string) => UserStory[];
  capabilityOfEpic: (epicId: string) => Capability | undefined;
  countsOf: (capabilityId: string) => RecordCounts;
  hardwareCapabilities: Capability[];
  exportDataset: (dataset: DatasetId, parentId?: string) => SheetRow[];
  importDataset: (
    dataset: DatasetId,
    rows: SheetRow[],
    parentId?: string,
    knownParents?: { capabilities?: Set<string>; epics?: Set<string>; features?: Set<string> }
  ) => ImportResult;
  exportDeliveryPack: () => { dataset: DatasetId; rows: SheetRow[] }[];
  importDeliveryPack: (sheets: Partial<Record<string, SheetRow[]>>) => ImportResult;
}

const RegistryContext = createContext<RegistryValue | null>(null);

function nextId(prefix: string, existing: { id: string }[], pad = 3): string {
  const max = existing.reduce((acc, item) => {
    if (!item.id.startsWith(`${prefix}-`)) return acc;
    const n = Number(item.id.slice(prefix.length + 1));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(pad, '0')}`;
}

/** First letter of the first word — Software → S, Hardware → H. */
export function baseGroupCode(name: string): string {
  const first = name
    .trim()
    .split(/\s+/)[0]
    ?.replace(/[^a-zA-Z0-9]/g, '')
    .charAt(0)
    .toUpperCase();
  if (first) return first;
  const fallback = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().charAt(0);
  return fallback || 'G';
}

export function uniqueGroupCode(
  name: string,
  existing: { id: string; code: string }[],
  excludeId?: string
): string {
  const base = baseGroupCode(name);
  const taken = new Set(
    existing
      .filter((g) => g.id !== excludeId)
      .map((g) => g.code.trim().toUpperCase())
      .filter(Boolean)
  );
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}

function normalizeGroupCode(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6);
}

function roleFromActorIds(actorIds: string[], actors: Actor[]): string {
  return actorIds
    .map((id) => actors.find((a) => a.id === id)?.name)
    .filter((name): name is string => !!name && name.trim() !== '')
    .join('; ');
}

function persistError(action: string, err: unknown): void {
  console.error(`[registry] ${action}`, err);
}

export function RegistryProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [groups, setGroups] = useState<CapabilityGroup[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [stories, setStories] = useState<UserStory[]>([]);
  const [waves, setWaves] = useState<Wave[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [lifecycles, setLifecycles] = useState<Lifecycle[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [actors, setActors] = useState<Actor[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await api.fetchRegistry();
      setProducts(snap.products);
      setActors(snap.actors);
      setGroups(snap.groups);
      setEquipment(snap.equipment);
      setEquipmentTypes(snap.equipmentTypes);
      setLifecycles(snap.lifecycles);
      setCapabilities(snap.capabilities);
      setEpics(snap.epics);
      setFeatures(snap.features);
      setStories(snap.stories);
      setWaves(snap.waves);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load registry from Supabase');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const resolveLifecycle = useCallback(
    (id: string | undefined): Lifecycle => {
      if (!id) return lifecycles[0] ?? FALLBACK_LIFECYCLE;
      return lifecycles.find((l) => l.id === id) ?? lifecycles[0] ?? FALLBACK_LIFECYCLE;
    },
    [lifecycles]
  );

  const isEquipmentGroup = useCallback(
    (groupId: string) => {
      const track = groups.find((g) => g.id === groupId)?.track;
      return usesEquipment(resolveLifecycle(track));
    },
    [groups, resolveLifecycle]
  );

  const trackOfGroup = useCallback(
    (groupId: string): TrackId =>
      groups.find((g) => g.id === groupId)?.track ?? resolveLifecycle(undefined).id,
    [groups, resolveLifecycle]
  );

  /** Progress sync + lifecycle automation rules; persists changed rows. */
  const recomputeAutomation = useCallback(
    (overrides: {
      capabilities?: Capability[];
      epics?: Epic[];
      features?: Feature[];
      stories?: UserStory[];
      waves?: Wave[];
      equipment?: Equipment[];
      lifecycles?: Lifecycle[];
    } = {}) => {
      const nextLifecycles = overrides.lifecycles ?? lifecycles;
      let nextCaps = overrides.capabilities ?? capabilities;
      const nextEpics = overrides.epics ?? epics;
      const nextFeatures = overrides.features ?? features;
      const nextStories = overrides.stories ?? stories;
      const nextWaves = overrides.waves ?? waves;
      const nextEquipment = overrides.equipment ?? equipment;

      nextCaps = nextCaps.map((cap) => {
        const lc =
          nextLifecycles.find((l) => l.id === trackOfGroup(cap.groupId)) ??
          resolveLifecycle(trackOfGroup(cap.groupId));
        return withAutoProgress(cap, nextEpics, nextFeatures, nextStories, lc);
      });

      const result = runAutomation(nextLifecycles, {
        groups,
        capabilities: nextCaps,
        epics: nextEpics,
        features: nextFeatures,
        stories: nextStories,
        waves: nextWaves,
        equipment: nextEquipment,
      });

      setCapabilities(result.capabilities);
      setEpics(result.epics);
      setFeatures(result.features);
      setStories(result.stories);
      setWaves(result.waves);
      setEquipment(result.equipment);

      for (const c of result.changed.capabilities) {
        void api.upsertCapability(c).catch((err) => persistError('automation capability', err));
      }
      for (const e of result.changed.epics) {
        void api.upsertEpic(e).catch((err) => persistError('automation epic', err));
      }
      for (const f of result.changed.features) {
        void api.upsertFeature(f).catch((err) => persistError('automation feature', err));
      }
      for (const s of result.changed.stories) {
        void api.upsertStory(s).catch((err) => persistError('automation story', err));
      }
      for (const w of result.changed.waves) {
        void api.upsertWave(w).catch((err) => persistError('automation wave', err));
      }
      for (const eq of result.changed.equipment) {
        void api.upsertEquipment(eq).catch((err) => persistError('automation equipment', err));
      }

      return result;
    },
    [
      lifecycles,
      capabilities,
      epics,
      features,
      stories,
      waves,
      equipment,
      groups,
      trackOfGroup,
      resolveLifecycle,
    ]
  );

  const addEquipment = useCallback(
    (input: EquipmentInput) => {
      const created: Equipment = {
        id: nextId('EQP', equipment, 2),
        name: input.name.trim(),
        vendor: input.vendor.trim(),
        model: input.model.trim(),
        type: input.type.trim(),
        productIds: input.productIds ?? [],
        status: input.status ?? null,
      };
      setEquipment((prev) => [...prev, created]);
      void api.upsertEquipment(created).catch((err) => persistError('addEquipment', err));
      return created;
    },
    [equipment]
  );

  const updateEquipment = useCallback(
    (id: string, patch: Partial<EquipmentInput>) => {
      setEquipment((prev) => {
        const next = prev.map((item) => {
          if (item.id !== id) return item;
          const updated = {
            ...item,
            ...patch,
            name: patch.name !== undefined ? patch.name.trim() : item.name,
            vendor: patch.vendor !== undefined ? patch.vendor.trim() : item.vendor,
            model: patch.model !== undefined ? patch.model.trim() : item.model,
            type: patch.type !== undefined ? patch.type.trim() : item.type,
            productIds: patch.productIds !== undefined ? patch.productIds : item.productIds,
            status: patch.status !== undefined ? patch.status : item.status,
          };
          void api.upsertEquipment(updated).catch((err) => persistError('updateEquipment', err));
          return updated;
        });
        queueMicrotask(() => recomputeAutomation({ equipment: next }));
        return next;
      });
    },
    [recomputeAutomation]
  );

  const removeEquipment = useCallback((id: string) => {
    setEquipment((prev) => prev.filter((e) => e.id !== id));
    setCapabilities((prev) => {
      const next = prev.map((cap) => {
        if (!cap.equipmentIds.includes(id)) return cap;
        const updated = { ...cap, equipmentIds: cap.equipmentIds.filter((e) => e !== id) };
        void api.upsertCapability(updated).catch((err) =>
          persistError('removeEquipment capability', err)
        );
        return updated;
      });
      return next;
    });
    void api.deleteEquipment(id).catch((err) => persistError('removeEquipment', err));
  }, []);

  const addEquipmentType = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return null;
      if (equipmentTypes.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) {
        window.alert(`Equipment type "${trimmed}" already exists.`);
        return null;
      }
      const created: EquipmentType = {
        id: nextId('EQT', equipmentTypes),
        name: trimmed,
      };
      setEquipmentTypes((prev) => [...prev, created]);
      void api.upsertEquipmentType(created).catch((err) => persistError('addEquipmentType', err));
      return created;
    },
    [equipmentTypes]
  );

  const removeEquipmentType = useCallback(
    (id: string) => {
      const target = equipmentTypes.find((t) => t.id === id);
      if (!target) return false;
      const inUse = equipment.filter((e) => e.type === target.name);
      if (inUse.length > 0) {
        window.alert(
          `Cannot delete type "${target.name}": ${inUse.length} equipment model${inUse.length === 1 ? '' : 's'} still use it.`
        );
        return false;
      }
      setEquipmentTypes((prev) => prev.filter((t) => t.id !== id));
      void api.deleteEquipmentType(id).catch((err) => persistError('removeEquipmentType', err));
      return true;
    },
    [equipment, equipmentTypes]
  );

  const addProduct = useCallback(
    (input: ProductInput) => {
      const created: Product = {
        id: nextId('PRD', products),
        name: input.name.trim(),
        description: input.description.trim(),
      };
      setProducts((prev) => [...prev, created]);
      void api.upsertProduct(created).catch((err) => persistError('addProduct', err));
      return created;
    },
    [products]
  );

  const updateProduct = useCallback((id: string, patch: Partial<ProductInput>) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const updated = {
          ...p,
          name: patch.name !== undefined ? patch.name.trim() : p.name,
          description: patch.description !== undefined ? patch.description.trim() : p.description,
        };
        void api.upsertProduct(updated).catch((err) => persistError('updateProduct', err));
        return updated;
      })
    );
  }, []);

  const removeProduct = useCallback((id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setCapabilities((prev) => {
      const next = prev.map((cap) => {
        if (!cap.productIds.includes(id)) return cap;
        const updated = { ...cap, productIds: cap.productIds.filter((p) => p !== id) };
        void api.upsertCapability(updated).catch((err) =>
          persistError('removeProduct capability', err)
        );
        return updated;
      });
      return next;
    });
    setActors((prev) => {
      const next = prev.map((actor) => {
        if (!actor.productIds.includes(id)) return actor;
        const updated = {
          ...actor,
          productIds: actor.productIds.filter((p) => p !== id),
        };
        void api.upsertActor(updated).catch((err) => persistError('removeProduct actor', err));
        return updated;
      });
      return next;
    });
    setLifecycles((prev) => {
      const next = prev.map((lc) => {
        if (!lc.productIds.includes(id)) return lc;
        const updated = { ...lc, productIds: lc.productIds.filter((p) => p !== id) };
        void api.upsertLifecycle(updated).catch((err) =>
          persistError('removeProduct lifecycle', err)
        );
        return updated;
      });
      return next;
    });
    setGroups((prev) => {
      const next = prev.map((g) => {
        if (!g.productIds.includes(id)) return g;
        const updated = { ...g, productIds: g.productIds.filter((p) => p !== id) };
        void api.upsertGroup(updated).catch((err) => persistError('removeProduct group', err));
        return updated;
      });
      return next;
    });
    setEquipment((prev) => {
      const next = prev.map((item) => {
        if (!item.productIds.includes(id)) return item;
        const updated = { ...item, productIds: item.productIds.filter((p) => p !== id) };
        void api.upsertEquipment(updated).catch((err) =>
          persistError('removeProduct equipment', err)
        );
        return updated;
      });
      return next;
    });
    setWaves((prev) => {
      const next = prev.map((w) => {
        if (!w.productIds.includes(id)) return w;
        const updated = { ...w, productIds: w.productIds.filter((p) => p !== id) };
        void api.upsertWave(updated).catch((err) => persistError('removeProduct wave', err));
        return updated;
      });
      return next;
    });
    void api.deleteProduct(id).catch((err) => persistError('removeProduct', err));
  }, []);

  const addActor = useCallback(
    (input: ActorInput) => {
      const created: Actor = {
        id: nextId('ACT', actors),
        name: input.name.trim(),
        description: input.description.trim(),
        productIds: input.productIds,
      };
      setActors((prev) => [...prev, created]);
      void api.upsertActor(created).catch((err) => persistError('addActor', err));
      return created;
    },
    [actors]
  );

  const updateActor = useCallback((id: string, patch: Partial<ActorInput>) => {
    setActors((prev) => {
      const next = prev.map((a) => {
        if (a.id !== id) return a;
        const updated: Actor = {
          ...a,
          ...patch,
          name: patch.name !== undefined ? patch.name.trim() : a.name,
          description: patch.description !== undefined ? patch.description.trim() : a.description,
          productIds: patch.productIds !== undefined ? patch.productIds : a.productIds,
        };
        void api.upsertActor(updated).catch((err) => persistError('updateActor', err));
        return updated;
      });
      // Refresh derived role on stories that reference this actor
      const updatedActor = next.find((a) => a.id === id);
      if (updatedActor && patch.name !== undefined) {
        setStories((storiesPrev) =>
          storiesPrev.map((s) => {
            if (!(s.actorIds ?? []).includes(id)) return s;
            const role = roleFromActorIds(s.actorIds ?? [], next);
            if (role === s.role) return s;
            const storyUpdated = { ...s, role };
            void api.upsertStory(storyUpdated).catch((err) =>
              persistError('updateActor story role', err)
            );
            return storyUpdated;
          })
        );
      }
      return next;
    });
  }, []);

  const removeActor = useCallback((id: string) => {
    setActors((prev) => {
      const remaining = prev.filter((a) => a.id !== id);
      setStories((storiesPrev) =>
        storiesPrev.map((s) => {
          if (!(s.actorIds ?? []).includes(id)) return s;
          const nextIds = (s.actorIds ?? []).filter((aid) => aid !== id);
          const updated = {
            ...s,
            actorIds: nextIds,
            role: roleFromActorIds(nextIds, remaining),
          };
          void api.upsertStory(updated).catch((err) => persistError('removeActor story', err));
          return updated;
        })
      );
      return remaining;
    });
    void api.deleteActor(id).catch((err) => persistError('removeActor', err));
  }, []);

  const addCapability = useCallback(
    (input: NewCapabilityInput) => {
      const group = groups.find((g) => g.id === input.groupId);
      const code = group?.code?.trim().toUpperCase() || baseGroupCode(group?.name ?? 'G');
      const lifecycle = resolveLifecycle(trackOfGroup(input.groupId));
      const draft: Capability = {
        id: nextId(`CAP-${code}`, capabilities, 4),
        name: input.name.trim(),
        description: input.description.trim(),
        groupId: input.groupId,
        productIds: input.productIds,
        jiraEpic: input.jiraEpic.trim(),
        equipmentIds: isEquipmentGroup(input.groupId) ? input.equipmentIds : [],
        progress: lifecycle.stages[0]?.name ?? 'Identified',
        status: null,
      };
      const created = withAutoProgress(draft, epics, features, stories, lifecycle);
      setCapabilities((prev) => [created, ...prev]);
      void api.upsertCapability(created).catch((err) => persistError('addCapability', err));
      return created;
    },
    [capabilities, groups, isEquipmentGroup, resolveLifecycle, trackOfGroup, epics, features, stories]
  );

  const updateCapability = useCallback(
    (id: string, patch: Partial<Omit<Capability, 'id'>>) => {
      setCapabilities((prev) => {
        const next = prev.map((cap) => {
          if (cap.id !== id) return cap;
          // Ignore manual progress — always derive from evidence.
          const { progress: _dropProgress, ...rest } = patch;
          const base: Capability = { ...cap, ...rest };
          if (!isEquipmentGroup(base.groupId)) base.equipmentIds = [];
          const lifecycle = resolveLifecycle(trackOfGroup(base.groupId));
          const updated = withAutoProgress(base, epics, features, stories, lifecycle);
          void api.upsertCapability(updated).catch((err) => persistError('updateCapability', err));
          return updated;
        });
        return next;
      });
    },
    [isEquipmentGroup, resolveLifecycle, trackOfGroup, epics, features, stories]
  );

  const removeCapability = useCallback(
    (id: string) => {
      const doomedEpics = epics.filter((e) => e.capabilityId === id).map((e) => e.id);
      const doomedFeatures = features
        .filter((f) => doomedEpics.includes(f.epicId))
        .map((f) => f.id);
      const doomedStories = stories
        .filter((s) => doomedFeatures.includes(s.featureId))
        .map((s) => s.id);
      const removeIds = new Set<string>([id, ...doomedEpics, ...doomedFeatures, ...doomedStories]);

      setStories((prev) => prev.filter((s) => !doomedFeatures.includes(s.featureId)));
      setFeatures((prev) => prev.filter((f) => !doomedEpics.includes(f.epicId)));
      setEpics((prev) => prev.filter((e) => e.capabilityId !== id));
      setCapabilities((prev) => prev.filter((c) => c.id !== id));
      setWaves((prev) =>
        prev.map((w) => {
          const itemIds = w.itemIds.filter((itemId) => !removeIds.has(itemId));
          if (itemIds.length === w.itemIds.length) return w;
          const updated = { ...w, itemIds };
          void api.upsertWave(updated).catch((err) => persistError('removeCapability waves', err));
          return updated;
        })
      );
      void api.deleteCapability(id).catch((err) => persistError('removeCapability', err));
    },
    [epics, features, stories]
  );

  const addGroup = useCallback((input: GroupInput) => {
    setGroups((prev) => {
      const name = input.name.trim();
      const normalized = normalizeGroupCode(input.code ?? '') || uniqueGroupCode(name, prev);
      const unique = prev.some((g) => g.code === normalized)
        ? uniqueGroupCode(name, prev)
        : normalized;
      const created: CapabilityGroup = {
        id: `GRP-${String(prev.length + 1).padStart(2, '0')}-${name
          .replace(/[^a-zA-Z]/g, '')
          .slice(0, 3)
          .toUpperCase()}`,
        name,
        description: input.description.trim(),
        code: unique,
        track: input.track,
        process: input.process.trim(),
        productIds: input.productIds ?? [],
      };
      void api.upsertGroup(created).catch((err) => persistError('addGroup', err));
      return [...prev, created];
    });
  }, []);

  const updateGroup = useCallback(
    (id: string, patch: Partial<GroupInput>) => {
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== id) return g;
          let nextCode = g.code;
          if (patch.code !== undefined) {
            const normalized = normalizeGroupCode(patch.code);
            if (normalized) {
              const clash = prev.some((other) => other.id !== id && other.code === normalized);
              nextCode = clash ? uniqueGroupCode(patch.name ?? g.name, prev, id) : normalized;
            }
          }
          const updated = {
            ...g,
            ...patch,
            name: patch.name !== undefined ? patch.name.trim() : g.name,
            description: patch.description !== undefined ? patch.description.trim() : g.description,
            process: patch.process !== undefined ? patch.process.trim() : g.process,
            code: nextCode,
            productIds: patch.productIds !== undefined ? patch.productIds : g.productIds,
          };
          void api.upsertGroup(updated).catch((err) => persistError('updateGroup', err));
          return updated;
        })
      );
      if (patch.track !== undefined) {
        const lifecycle = resolveLifecycle(patch.track);
        setCapabilities((prev) => {
          const next = prev.map((cap) => {
            if (cap.groupId !== id) return cap;
            let updated = { ...cap };
            if (!usesEquipment(lifecycle)) updated.equipmentIds = [];
            updated = withAutoProgress(updated, epics, features, stories, lifecycle);
            if (updated === cap) return cap;
            void api.upsertCapability(updated).catch((err) =>
              persistError('updateGroup capability', err)
            );
            return updated;
          });
          return next;
        });
      }
    },
    [resolveLifecycle, epics, features, stories]
  );

  const removeGroup = useCallback(
    (id: string) => {
      const members = capabilities.filter((c) => c.groupId === id);
      if (members.length > 0) {
        window.alert(
          `Cannot delete this group: ${members.length} capability${members.length === 1 ? '' : 'ies'} still belong to it. Move or delete them first.`
        );
        return false;
      }
      setGroups((prev) => prev.filter((g) => g.id !== id));
      void api.deleteGroup(id).catch((err) => persistError('removeGroup', err));
      return true;
    },
    [capabilities]
  );

  const setEquipmentCapabilities = useCallback(
    (equipmentId: string, capabilityIds: string[]) => {
      setCapabilities((prev) => {
        const next = prev.map((cap) => {
          if (!isEquipmentGroup(cap.groupId)) return cap;
          const shouldHave = capabilityIds.includes(cap.id);
          const has = cap.equipmentIds.includes(equipmentId);
          if (shouldHave === has) return cap;
          return {
            ...cap,
            equipmentIds: shouldHave
              ? [...cap.equipmentIds, equipmentId]
              : cap.equipmentIds.filter((id) => id !== equipmentId),
          };
        });
        const changed = next.filter((cap, i) => cap !== prev[i]);
        if (changed.length > 0) {
          void api
            .setEquipmentCapabilities(equipmentId, capabilityIds)
            .catch((err) => persistError('setEquipmentCapabilities', err));
        }
        queueMicrotask(() => recomputeAutomation({ capabilities: next }));
        return next;
      });
    },
    [isEquipmentGroup, recomputeAutomation]
  );

  const addLifecycle = useCallback(
    (input: LifecycleInput) => {
      const created: Lifecycle = {
        id: nextId('LC', lifecycles),
        label: input.label.trim(),
        summary: input.summary.trim(),
        decomposition: input.decomposition,
        stages: input.stages,
        storyStages: input.decomposition === 'delivery' ? input.storyStages : [],
        productIds: input.productIds ?? [],
        automationRules: input.automationRules ?? [],
      };
      setLifecycles((prev) => [...prev, created]);
      void api.upsertLifecycle(created).catch((err) => persistError('addLifecycle', err));
      return created;
    },
    [lifecycles]
  );

  const updateLifecycle = useCallback(
    (id: string, patch: Partial<LifecycleInput>) => {
      setLifecycles((prev) => {
        let updatedLc: Lifecycle | null = null;
        const next = prev.map((lc) => {
          if (lc.id !== id) return lc;
          const decomposition = patch.decomposition ?? lc.decomposition;
          const updated: Lifecycle = {
            ...lc,
            label: patch.label !== undefined ? patch.label.trim() : lc.label,
            summary: patch.summary !== undefined ? patch.summary.trim() : lc.summary,
            decomposition,
            stages: patch.stages ?? lc.stages,
            storyStages:
              decomposition === 'delivery'
                ? (patch.storyStages ?? lc.storyStages)
                : [],
            productIds: patch.productIds !== undefined ? patch.productIds : lc.productIds,
            automationRules:
              patch.automationRules !== undefined ? patch.automationRules : lc.automationRules,
          };
          updatedLc = updated;
          void api.upsertLifecycle(updated).catch((err) => persistError('updateLifecycle', err));
          return updated;
        });
        if (
          updatedLc &&
          (patch.stages !== undefined ||
            patch.decomposition !== undefined ||
            patch.automationRules !== undefined)
        ) {
          queueMicrotask(() => recomputeAutomation({ lifecycles: next }));
        }
        return next;
      });
    },
    [recomputeAutomation]
  );

  const removeLifecycle = useCallback(
    (id: string) => {
      const inUse = groups.filter((g) => g.track === id);
      if (inUse.length > 0) {
        window.alert(
          `Cannot delete this lifecycle: ${inUse.length} capability group${inUse.length === 1 ? '' : 's'} still use it. Reassign them first.`
        );
        return false;
      }
      if (lifecycles.length <= 1) {
        window.alert('Cannot delete the last lifecycle.');
        return false;
      }
      setLifecycles((prev) => prev.filter((l) => l.id !== id));
      void api.deleteLifecycle(id).catch((err) => persistError('removeLifecycle', err));
      return true;
    },
    [groups, lifecycles.length]
  );

  const addEpic = useCallback(
    (capabilityId: string, input: EpicInput) => {
      const created: Epic = {
        id: nextId('EPIC', epics),
        capabilityId,
        key: input.key.trim(),
        name: input.name.trim(),
        description: input.description.trim(),
        status: input.status,
      };
      const nextEpics = [...epics, created];
      setEpics(nextEpics);
      void api.upsertEpic(created).catch((err) => persistError('addEpic', err));
      queueMicrotask(() => recomputeAutomation({ epics: nextEpics }));
    },
    [epics, recomputeAutomation]
  );

  const updateEpic = useCallback(
    (id: string, patch: Partial<EpicInput>) => {
      setEpics((prev) => {
        const next = prev.map((e) => {
          if (e.id !== id) return e;
          const updated = { ...e, ...patch };
          void api.upsertEpic(updated).catch((err) => persistError('updateEpic', err));
          return updated;
        });
        queueMicrotask(() => recomputeAutomation({ epics: next }));
        return next;
      });
    },
    [recomputeAutomation]
  );

  const removeEpic = useCallback(
    (id: string) => {
      const doomedFeatureIds = features.filter((f) => f.epicId === id).map((f) => f.id);
      const nextFeatures = features.filter((f) => f.epicId !== id);
      const nextStories = stories.filter((s) => !doomedFeatureIds.includes(s.featureId));
      const nextEpics = epics.filter((e) => e.id !== id);
      setFeatures(nextFeatures);
      setStories(nextStories);
      setEpics(nextEpics);
      void api.deleteEpic(id).catch((err) => persistError('removeEpic', err));
      queueMicrotask(() =>
        recomputeAutomation({
          epics: nextEpics,
          features: nextFeatures,
          stories: nextStories,
        })
      );
    },
    [epics, features, stories, recomputeAutomation]
  );

  const addFeature = useCallback(
    (epicId: string, input: FeatureInput) => {
      const created: Feature = {
        id: nextId('FEAT', features),
        epicId,
        name: input.name.trim(),
        description: input.description.trim(),
        status: input.status,
      };
      const nextFeatures = [...features, created];
      setFeatures(nextFeatures);
      void api.upsertFeature(created).catch((err) => persistError('addFeature', err));
      queueMicrotask(() => recomputeAutomation({ features: nextFeatures }));
    },
    [features, recomputeAutomation]
  );

  const updateFeature = useCallback(
    (id: string, patch: Partial<FeatureInput>) => {
      setFeatures((prev) => {
        const next = prev.map((f) => {
          if (f.id !== id) return f;
          const updated = { ...f, ...patch };
          void api.upsertFeature(updated).catch((err) => persistError('updateFeature', err));
          return updated;
        });
        queueMicrotask(() => recomputeAutomation({ features: next }));
        return next;
      });
    },
    [recomputeAutomation]
  );

  const removeFeature = useCallback(
    (id: string) => {
      const nextStories = stories.filter((s) => s.featureId !== id);
      const nextFeatures = features.filter((f) => f.id !== id);
      setStories(nextStories);
      setFeatures(nextFeatures);
      void api.deleteFeature(id).catch((err) => persistError('removeFeature', err));
      queueMicrotask(() =>
        recomputeAutomation({ features: nextFeatures, stories: nextStories })
      );
    },
    [features, stories, recomputeAutomation]
  );

  const addStory = useCallback(
    (featureId: string, input: StoryInput) => {
      const actorIds = input.actorIds ?? [];
      const created: UserStory = {
        id: nextId('US', stories),
        featureId,
        title: input.title.trim(),
        role: input.role.trim() || roleFromActorIds(actorIds, actors),
        actorIds,
        want: input.want.trim(),
        benefit: input.benefit.trim(),
        criteria: input.criteria.filter((c) => c.trim() !== ''),
        points: input.points,
        status: input.status,
        stage: input.stage,
        adrContext: input.adrContext,
        adrDecision: input.adrDecision,
        adrTechnical: input.adrTechnical,
        adrConsequences: input.adrConsequences,
        adrApproved: input.adrApproved,
      };
      const nextStories = [...stories, created];
      setStories(nextStories);
      void api.upsertStory(created).catch((err) => persistError('addStory', err));
      queueMicrotask(() => recomputeAutomation({ stories: nextStories }));
    },
    [actors, stories, recomputeAutomation]
  );

  const updateStory = useCallback(
    (id: string, patch: Partial<StoryInput>) => {
      setStories((prev) => {
        const next = prev.map((s) => {
          if (s.id !== id) return s;
          const updated = { ...s, ...patch };
          if (patch.actorIds) {
            updated.role =
              patch.role !== undefined
                ? patch.role
                : roleFromActorIds(patch.actorIds, actors);
          }
          void api.upsertStory(updated).catch((err) => persistError('updateStory', err));
          return updated;
        });
        queueMicrotask(() => recomputeAutomation({ stories: next }));
        return next;
      });
    },
    [actors, recomputeAutomation]
  );

  const removeStory = useCallback(
    (id: string) => {
      const nextStories = stories.filter((s) => s.id !== id);
      setStories(nextStories);
      void api.deleteStory(id).catch((err) => persistError('removeStory', err));
      queueMicrotask(() => recomputeAutomation({ stories: nextStories }));
    },
    [stories, recomputeAutomation]
  );

  const addWave = useCallback(
    (input: WaveInput) => {
      const created: Wave = { id: nextId('WAVE', waves), ...input };
      const nextWaves = [...waves, created];
      setWaves(nextWaves);
      void api.upsertWave(created).catch((err) => persistError('addWave', err));
      queueMicrotask(() => recomputeAutomation({ waves: nextWaves }));
      return created;
    },
    [waves, recomputeAutomation]
  );

  const updateWave = useCallback(
    (id: string, patch: Partial<WaveInput>) => {
      setWaves((prev) => {
        const next = prev.map((w) => {
          if (w.id !== id) return w;
          const updated = { ...w, ...patch };
          void api.upsertWave(updated).catch((err) => persistError('updateWave', err));
          return updated;
        });
        queueMicrotask(() => recomputeAutomation({ waves: next }));
        return next;
      });
    },
    [recomputeAutomation]
  );

  const removeWave = useCallback((id: string) => {
    setWaves((prev) => prev.filter((w) => w.id !== id));
    void api.deleteWave(id).catch((err) => persistError('removeWave', err));
  }, []);

  const value = useMemo<RegistryValue>(() => {
    const productMap = new Map(products.map((p) => [p.id, p]));
    const actorMap = new Map(actors.map((a) => [a.id, a]));
    const groupMap = new Map(groups.map((g) => [g.id, g]));
    const capabilityMap = new Map(capabilities.map((c) => [c.id, c]));
    const epicMap = new Map(epics.map((e) => [e.id, e]));
    const featureMap = new Map(features.map((f) => [f.id, f]));
    const storyMap = new Map(stories.map((s) => [s.id, s]));

    const epicsOf = (capabilityId: string) => epics.filter((e) => e.capabilityId === capabilityId);
    const featuresOf = (epicId: string) => features.filter((f) => f.epicId === epicId);
    const storiesOf = (featureId: string) => stories.filter((s) => s.featureId === featureId);
    const storiesOfEpic = (epicId: string) => {
      const ids = featuresOf(epicId).map((f) => f.id);
      return stories.filter((s) => ids.includes(s.featureId));
    };

    const countsOf = (capabilityId: string): RecordCounts => {
      const capEpics = epicsOf(capabilityId);
      const capFeatures = features.filter((f) => capEpics.some((e) => e.id === f.epicId));
      const capStories = stories.filter((s) => capFeatures.some((f) => f.id === s.featureId));
      return {
        epics: capEpics.length,
        features: capFeatures.length,
        stories: capStories.length,
        equipment: capabilityMap.get(capabilityId)?.equipmentIds.length ?? 0,
      };
    };

    const asStatus = (raw: string): CapabilityStatus | null => {
      const trimmed = raw.trim();
      if (!trimmed) return null;
      const lower = trimmed.toLowerCase();
      if (lower === 'approved') return 'In Progress';
      if (lower === 'blocked' || lower === 'rejected') return 'On Hold';
      const hit = CAPABILITY_STATUSES.find((s) => s.toLowerCase() === lower);
      return hit ?? null;
    };
    const list = (raw: string) =>
      raw
        .split(/[;,\n]/)
        .map((v) => v.trim())
        .filter(Boolean);

    const exportDataset = (dataset: DatasetId, parentId?: string): SheetRow[] => {
      if (dataset === 'capabilities') {
        return capabilities.map((c) => ({
          'Capability ID': c.id,
          Name: c.name,
          Description: c.description,
          'Group ID': c.groupId,
          'Product IDs': c.productIds.join('; '),
          'Epic Key': c.jiraEpic,
          'Equipment IDs': c.equipmentIds.join('; '),
          Progress: c.progress,
          Status: c.status ?? '',
        }));
      }
      if (dataset === 'epics') {
        return epics
          .filter((e) => !parentId || e.capabilityId === parentId)
          .map((e) => ({
            'Epic ID': e.id,
            'Capability ID': e.capabilityId,
            Key: e.key,
            Name: e.name,
            Description: e.description,
            Status: e.status ?? '',
          }));
      }
      if (dataset === 'features') {
        return features
          .filter((f) => !parentId || f.epicId === parentId)
          .map((f) => ({
            'Feature ID': f.id,
            'Epic ID': f.epicId,
            Name: f.name,
            Description: f.description,
            Status: f.status ?? '',
          }));
      }
      if (dataset === 'stories') {
        return stories
          .filter((s) => !parentId || s.featureId === parentId)
          .map((s) => ({
            'Story ID': s.id,
            'Feature ID': s.featureId,
            Title: s.title,
            'Actor IDs': (s.actorIds ?? []).join('; '),
            'As a': s.role,
            'I want to': s.want,
            'So that': s.benefit,
            'Acceptance Criteria': s.criteria.join('; '),
            Points: s.points == null ? '' : String(s.points),
            'Progress Stage': s.stage,
            Status: s.status ?? '',
            'ADR Context': s.adrContext ?? '',
            'ADR Decision': s.adrDecision ?? '',
            'ADR Technical': s.adrTechnical ?? '',
            'ADR Consequences': s.adrConsequences ?? '',
            'ADR Approved': s.adrApproved ? 'Yes' : 'No',
          }));
      }
      if (dataset === 'equipment') {
        return equipment.map((e) => ({
          'Equipment ID': e.id,
          Name: e.name,
          Vendor: e.vendor,
          Model: e.model,
          Type: e.type,
          'Product IDs': (e.productIds ?? []).join('; '),
        }));
      }
      if (dataset === 'products') {
        return products.map((p) => ({
          'Product ID': p.id,
          Name: p.name,
          Description: p.description,
        }));
      }
      if (dataset === 'actors') {
        return actors.map((a) => ({
          'Actor ID': a.id,
          Name: a.name,
          Description: a.description,
          'Product IDs': a.productIds.join('; '),
        }));
      }
      return groups.map((g) => ({
        'Group ID': g.id,
        Name: g.name,
        Description: g.description,
        Code: g.code,
        Track: g.track,
        Process: g.process,
        'Product IDs': (g.productIds ?? []).join('; '),
      }));
    };

    const importDataset = (
      dataset: DatasetId,
      rows: SheetRow[],
      parentId?: string,
      knownParents?: { capabilities?: Set<string>; epics?: Set<string>; features?: Set<string> }
    ): ImportResult => {
      const result: ImportResult = {
        created: 0,
        updated: 0,
        skipped: 0,
        messages: [],
        touchedIds: [],
      };
      const note = (i: number, why: string) => {
        result.skipped += 1;
        if (result.messages.length < 6) result.messages.push(`Row ${i + 2}: ${why}`);
      };
      const touch = (id: string) => {
        result.touchedIds?.push(id);
      };

      if (dataset === 'capabilities') {
        const next = [...capabilities];
        rows.forEach((r, i) => {
          const name = (r['Name'] ?? '').trim();
          if (!name) return note(i, 'no name');
          const groupId = (r['Group ID'] ?? '').trim() || groups[0]?.id;
          if (!groupId || !groups.some((g) => g.id === groupId))
            return note(i, `unknown group "${groupId ?? ''}"`);
          const lifecycle = resolveLifecycle(groupMap.get(groupId)?.track);
          const id = (r['Capability ID'] ?? '').trim();
          const patch = {
            name,
            description: (r['Description'] ?? '').trim(),
            groupId,
            productIds: list(r['Product IDs'] ?? '').filter((p) => productMap.has(p)),
            jiraEpic: (r['Epic Key'] ?? '').trim(),
            equipmentIds: usesEquipment(lifecycle)
              ? list(r['Equipment IDs'] ?? '').filter((e) => equipment.some((eq) => eq.id === e))
              : [],
            status: asStatus(r['Status'] ?? ''),
          };
          const at = id ? next.findIndex((c) => c.id === id) : -1;
          if (at >= 0) {
            next[at] = { ...next[at], ...patch };
            touch(next[at].id);
            result.updated += 1;
          } else {
            const groupCode =
              groups.find((g) => g.id === groupId)?.code?.trim().toUpperCase() ||
              baseGroupCode(groups.find((g) => g.id === groupId)?.name ?? 'G');
            const createdId = id || nextId(`CAP-${groupCode}`, next, 4);
            next.unshift({
              id: createdId,
              progress: lifecycle.stages[0]?.name ?? 'Identified',
              ...patch,
            });
            touch(createdId);
            result.created += 1;
          }
        });
        const recomputed = next.map((cap) => {
          const lifecycle = resolveLifecycle(trackOfGroup(cap.groupId));
          return withAutoProgress(cap, epics, features, stories, lifecycle);
        });
        setCapabilities(recomputed);
        void api
          .upsertCapabilities(recomputed)
          .catch((err) => persistError('import capabilities', err));
        return result;
      }

      if (dataset === 'epics') {
        const next = [...epics];
        rows.forEach((r, i) => {
          const name = (r['Name'] ?? '').trim();
          if (!name) return note(i, 'no name');
          const capabilityId = parentId ?? (r['Capability ID'] ?? '').trim();
          if (
            !capabilityMap.has(capabilityId) &&
            !knownParents?.capabilities?.has(capabilityId)
          ) {
            return note(i, `unknown capability "${capabilityId}"`);
          }
          const id = (r['Epic ID'] ?? '').trim();
          const patch = {
            capabilityId,
            key: (r['Key'] ?? '').trim(),
            name,
            description: (r['Description'] ?? '').trim(),
            status: asStatus(r['Status'] ?? ''),
          };
          const at = id ? next.findIndex((e) => e.id === id) : -1;
          if (at >= 0) {
            next[at] = { ...next[at], ...patch };
            touch(next[at].id);
            result.updated += 1;
          } else {
            const createdId = id || nextId('EPIC', next);
            next.push({ id: createdId, ...patch });
            touch(createdId);
            result.created += 1;
          }
        });
        setEpics(next);
        void api.upsertEpics(next).catch((err) => persistError('import epics', err));
        return result;
      }

      if (dataset === 'features') {
        const next = [...features];
        rows.forEach((r, i) => {
          const name = (r['Name'] ?? '').trim();
          if (!name) return note(i, 'no name');
          const epicId = parentId ?? (r['Epic ID'] ?? '').trim();
          if (!epicMap.has(epicId) && !knownParents?.epics?.has(epicId)) {
            return note(i, `unknown epic "${epicId}"`);
          }
          const id = (r['Feature ID'] ?? '').trim();
          const patch = {
            epicId,
            name,
            description: (r['Description'] ?? '').trim(),
            status: asStatus(r['Status'] ?? ''),
          };
          const at = id ? next.findIndex((f) => f.id === id) : -1;
          if (at >= 0) {
            next[at] = { ...next[at], ...patch };
            touch(next[at].id);
            result.updated += 1;
          } else {
            const createdId = id || nextId('FEAT', next);
            next.push({ id: createdId, ...patch });
            touch(createdId);
            result.created += 1;
          }
        });
        setFeatures(next);
        void api.upsertFeatures(next).catch((err) => persistError('import features', err));
        return result;
      }

      if (dataset === 'stories') {
        const next = [...stories];
        const lifecycleByFeature = (featureId: string): Lifecycle => {
          const feature = featureMap.get(featureId);
          const epic = feature ? epicMap.get(feature.epicId) : undefined;
          const cap = epic ? capabilityMap.get(epic.capabilityId) : undefined;
          return resolveLifecycle(cap ? groupMap.get(cap.groupId)?.track : undefined);
        };
        rows.forEach((r, i) => {
          const title = (r['Title'] ?? '').trim();
          if (!title) return note(i, 'no title');
          const featureId = parentId ?? (r['Feature ID'] ?? '').trim();
          if (!featureMap.has(featureId) && !knownParents?.features?.has(featureId)) {
            return note(i, `unknown feature "${featureId}"`);
          }
          const stageRaw = (r['Progress Stage'] ?? '').trim();
          const points = Number((r['Points'] ?? '').trim());
          const id = (r['Story ID'] ?? '').trim();
          const storyStages = lifecycleByFeature(featureId).storyStages;
          const stages = storyStages.length > 0 ? storyStages : DEFAULT_STORY_STAGES;
          const actorIds = list(r['Actor IDs'] ?? '').filter((aid) => actorMap.has(aid));
          const roleFromActors = roleFromActorIds(actorIds, actors);
          const roleRaw = (r['As a'] ?? '').trim();
          const patch = {
            featureId,
            title,
            actorIds,
            role: roleFromActors || roleRaw,
            want: (r['I want to'] ?? '').trim(),
            benefit: (r['So that'] ?? '').trim(),
            criteria: list(r['Acceptance Criteria'] ?? ''),
            points: Number.isFinite(points) && (r['Points'] ?? '').trim() !== '' ? points : null,
            status: asStatus(r['Status'] ?? ''),
            stage:
              stages.find((s) => s.name.toLowerCase() === stageRaw.toLowerCase())?.name ??
              stages[0].name,
            adrContext: (r['ADR Context'] ?? '').trim(),
            adrDecision: (r['ADR Decision'] ?? '').trim(),
            adrTechnical: (r['ADR Technical'] ?? '').trim(),
            adrConsequences: (r['ADR Consequences'] ?? '').trim(),
            adrApproved: /^(yes|true|1|x)$/i.test((r['ADR Approved'] ?? '').trim()),
          };
          const at = id ? next.findIndex((s) => s.id === id) : -1;
          if (at >= 0) {
            next[at] = { ...next[at], ...patch };
            touch(next[at].id);
            result.updated += 1;
          } else {
            const createdId = id || nextId('US', next);
            next.push({ id: createdId, ...patch });
            touch(createdId);
            result.created += 1;
          }
        });
        setStories(next);
        void api.upsertStories(next).catch((err) => persistError('import stories', err));
        return result;
      }

      if (dataset === 'equipment') {
        const next = [...equipment];
        let nextTypes = [...equipmentTypes];
        const createdTypes: EquipmentType[] = [];
        rows.forEach((r, i) => {
          const name = (r['Name'] ?? '').trim();
          if (!name) return note(i, 'no name');
          const id = (r['Equipment ID'] ?? '').trim();
          const typeName = (r['Type'] ?? '').trim();
          if (
            typeName &&
            !nextTypes.some((t) => t.name.toLowerCase() === typeName.toLowerCase())
          ) {
            const created: EquipmentType = {
              id: nextId('EQT', nextTypes),
              name: typeName,
            };
            nextTypes = [...nextTypes, created];
            createdTypes.push(created);
          }
          const patch = {
            name,
            vendor: (r['Vendor'] ?? '').trim(),
            model: (r['Model'] ?? '').trim(),
            type: typeName,
            productIds: list(r['Product IDs'] ?? '').filter((p) => productMap.has(p)),
          };
          const at = id ? next.findIndex((e) => e.id === id) : -1;
          if (at >= 0) {
            next[at] = { ...next[at], ...patch };
            result.updated += 1;
          } else {
            next.push({
              id: id || nextId('EQP', next, 2),
              ...patch,
              status: null,
              productIds:
                patch.productIds.length > 0 ? patch.productIds : products.map((p) => p.id),
            });
            result.created += 1;
          }
        });
        if (createdTypes.length > 0) {
          setEquipmentTypes(nextTypes);
          createdTypes.forEach((t) => {
            void api.upsertEquipmentType(t).catch((err) =>
              persistError('import equipment type', err)
            );
          });
        }
        setEquipment(next);
        void api.upsertEquipmentMany(next).catch((err) => persistError('import equipment', err));
        return result;
      }

      if (dataset === 'products') {
        const next = [...products];
        rows.forEach((r, i) => {
          const name = (r['Name'] ?? '').trim();
          if (!name) return note(i, 'no name');
          const id = (r['Product ID'] ?? '').trim();
          const patch = { name, description: (r['Description'] ?? '').trim() };
          const at = id ? next.findIndex((p) => p.id === id) : -1;
          if (at >= 0) {
            next[at] = { ...next[at], ...patch };
            result.updated += 1;
          } else {
            next.push({ id: id || nextId('PRD', next), ...patch });
            result.created += 1;
          }
        });
        setProducts(next);
        void api.upsertProducts(next).catch((err) => persistError('import products', err));
        return result;
      }

      if (dataset === 'actors') {
        const next = [...actors];
        rows.forEach((r, i) => {
          const name = (r['Name'] ?? '').trim();
          if (!name) return note(i, 'no name');
          const id = (r['Actor ID'] ?? '').trim();
          const productIds = list(r['Product IDs'] ?? '').filter((p) => productMap.has(p));
          if (productIds.length === 0) return note(i, 'at least one known product ID is required');
          const patch = {
            name,
            description: (r['Description'] ?? '').trim(),
            productIds,
          };
          const at = id ? next.findIndex((a) => a.id === id) : -1;
          if (at >= 0) {
            next[at] = { ...next[at], ...patch };
            result.updated += 1;
          } else {
            next.push({ id: id || nextId('ACT', next), ...patch });
            result.created += 1;
          }
        });
        setActors(next);
        void api.upsertActors(next).catch((err) => persistError('import actors', err));
        return result;
      }

      const next = [...groups];
      const lifecycleIds = new Set(lifecycles.map((l) => l.id));
      rows.forEach((r, i) => {
        const name = (r['Name'] ?? '').trim();
        if (!name) return note(i, 'no name');
        const trackRaw = (r['Track'] ?? '').trim();
        const track =
          lifecycleIds.has(trackRaw)
            ? trackRaw
            : [...lifecycleIds].find((id) => id.toLowerCase() === trackRaw.toLowerCase()) ??
              resolveLifecycle(undefined).id;
        const id = (r['Group ID'] ?? '').trim();
        const codeRaw = (r['Code'] ?? '').trim();
        const patch = {
          name,
          description: (r['Description'] ?? '').trim(),
          track,
          process: (r['Process'] ?? '').trim(),
          productIds: list(r['Product IDs'] ?? '').filter((pid) => productMap.has(pid)),
        };
        const at = id ? next.findIndex((g) => g.id === id) : -1;
        if (at >= 0) {
          const code =
            normalizeGroupCode(codeRaw) ||
            next[at].code ||
            uniqueGroupCode(name, next, next[at].id);
          const clash = next.some((g, idx) => idx !== at && g.code === code);
          next[at] = {
            ...next[at],
            ...patch,
            code: clash ? uniqueGroupCode(name, next, next[at].id) : code,
            productIds:
              patch.productIds.length > 0 ? patch.productIds : next[at].productIds,
          };
          result.updated += 1;
        } else {
          const code =
            normalizeGroupCode(codeRaw) || uniqueGroupCode(name, next);
          const unique = next.some((g) => g.code === code)
            ? uniqueGroupCode(name, next)
            : code;
          next.push({
            id:
              id ||
              `GRP-${String(next.length + 1).padStart(2, '0')}-${name
                .replace(/[^a-zA-Z]/g, '')
                .slice(0, 3)
                .toUpperCase()}`,
            ...patch,
            code: unique,
            productIds:
              patch.productIds.length > 0 ? patch.productIds : products.map((p) => p.id),
          });
          result.created += 1;
        }
      });
      setGroups(next);
      void api.upsertGroups(next).catch((err) => persistError('import groups', err));
      return result;
    };

    const exportDeliveryPack = (): { dataset: DatasetId; rows: SheetRow[] }[] =>
      DELIVERY_PACK.map((dataset) => ({
        dataset,
        rows: exportDataset(dataset),
      }));

    const importDeliveryPack = (
      sheets: Partial<Record<string, SheetRow[]>>
    ): ImportResult => {
      const aggregate: ImportResult = { created: 0, updated: 0, skipped: 0, messages: [] };
      const known = {
        capabilities: new Set(capabilities.map((c) => c.id)),
        epics: new Set(epics.map((e) => e.id)),
        features: new Set(features.map((f) => f.id)),
      };

      DELIVERY_PACK.forEach((dataset) => {
        const def = DATASETS[dataset];
        const rows = sheets[def.sheet];
        if (!rows || rows.length === 0) return;
        const part = importDataset(dataset, rows, undefined, known);
        aggregate.created += part.created;
        aggregate.updated += part.updated;
        aggregate.skipped += part.skipped;
        part.touchedIds?.forEach((id) => {
          if (dataset === 'capabilities') known.capabilities.add(id);
          if (dataset === 'epics') known.epics.add(id);
          if (dataset === 'features') known.features.add(id);
        });
        part.messages.forEach((m) => {
          if (aggregate.messages.length < 12) {
            aggregate.messages.push(`${def.sheet}: ${m}`);
          }
        });
      });
      return aggregate;
    };

    const equipmentGroupIds = new Set(
      groups.filter((g) => usesEquipment(resolveLifecycle(g.track))).map((g) => g.id)
    );

    return {
      loading,
      error,
      reload,
      capabilities,
      groups,
      products,
      actors,
      equipment,
      equipmentTypes,
      lifecycles,
      epics,
      features,
      stories,
      waves,
      addCapability,
      updateCapability,
      removeCapability,
      addGroup,
      updateGroup,
      removeGroup,
      addLifecycle,
      updateLifecycle,
      removeLifecycle,
      getLifecycle: (id) => resolveLifecycle(id),
      lifecycleOf: (capability) =>
        resolveLifecycle(groupMap.get(capability.groupId)?.track),
      lifecycleOfGroup: (groupId) => resolveLifecycle(groupMap.get(groupId)?.track),
      addProduct,
      updateProduct,
      removeProduct,
      addActor,
      updateActor,
      removeActor,
      getActor: (id) => actorMap.get(id),
      setEquipmentCapabilities,
      addEpic,
      updateEpic,
      removeEpic,
      addFeature,
      updateFeature,
      removeFeature,
      addStory,
      updateStory,
      removeStory,
      addEquipment,
      updateEquipment,
      removeEquipment,
      addEquipmentType,
      removeEquipmentType,
      addWave,
      updateWave,
      removeWave,
      getGroup: (id) => groupMap.get(id),
      getProduct: (id) => productMap.get(id),
      getCapability: (id) => capabilityMap.get(id),
      getEpic: (id) => epicMap.get(id),
      getFeature: (id) => featureMap.get(id),
      getStory: (id) => storyMap.get(id),
      trackOf: (capability) =>
        groupMap.get(capability.groupId)?.track ?? resolveLifecycle(undefined).id,
      epicsOf,
      featuresOf,
      storiesOf,
      storiesOfEpic,
      capabilityOfEpic: (epicId) => {
        const e = epicMap.get(epicId);
        return e ? capabilityMap.get(e.capabilityId) : undefined;
      },
      countsOf,
      hardwareCapabilities: capabilities.filter((c) => equipmentGroupIds.has(c.groupId)),
      exportDataset,
      importDataset,
      exportDeliveryPack,
      importDeliveryPack,
    };
  }, [
    loading,
    error,
    reload,
    capabilities,
    groups,
    products,
    actors,
    epics,
    features,
    stories,
    waves,
    equipment,
    equipmentTypes,
    lifecycles,
    resolveLifecycle,
    addCapability,
    updateCapability,
    removeCapability,
    addGroup,
    updateGroup,
    removeGroup,
    addLifecycle,
    updateLifecycle,
    removeLifecycle,
    addProduct,
    updateProduct,
    removeProduct,
    addActor,
    updateActor,
    removeActor,
    setEquipmentCapabilities,
    addEpic,
    updateEpic,
    removeEpic,
    addFeature,
    updateFeature,
    removeFeature,
    addStory,
    updateStory,
    removeStory,
    addEquipment,
    updateEquipment,
    removeEquipment,
    addEquipmentType,
    removeEquipmentType,
    addWave,
    updateWave,
    removeWave,
  ]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas text-soft">
        <p className="text-sm">Loading registry from Supabase…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas px-6 text-center">
        <p className="text-sm text-strong">Could not load registry</p>
        <p className="max-w-lg text-sm text-mute">{error}</p>
        <button
          type="button"
          onClick={() => void reload()}
          className="rounded border border-line-strong px-3 py-1.5 text-sm text-soft hover:text-strong"
        >
          Retry
        </button>
      </div>
    );
  }

  return <RegistryContext.Provider value={value}>{children}</RegistryContext.Provider>;
}

export function useRegistry(): RegistryValue {
  const ctx = useContext(RegistryContext);
  if (!ctx) throw new Error('useRegistry must be used within a RegistryProvider');
  return ctx;
}
