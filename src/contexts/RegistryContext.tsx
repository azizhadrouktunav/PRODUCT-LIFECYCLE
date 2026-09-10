import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { DatasetId, ImportResult } from '../utils/datasets';
import type { SheetRow } from '../utils/excel';
import type {
  Capability,
  CapabilityGroup,
  CapabilityStatus,
  Domain,
  DomainCategory,
  Epic,
  Equipment,
  EquipmentType,
  Feature,
  RecordCounts,
  TrackId,
  UserStory,
  Wave,
} from '../types/registry';
import {
  CAPABILITY_STATUSES,
  STORY_STAGES,
  TRACKS,
  stageIndex,
} from '../types/registry';
import * as api from '../lib/registryApi';

export interface NewCapabilityInput {
  name: string;
  description: string;
  groupId: string;
  domainIds: string[];
  jiraEpic: string;
  equipmentIds: string[];
}

export type EpicInput = Pick<Epic, 'key' | 'name' | 'description' | 'status'>;
export type FeatureInput = Pick<Feature, 'name' | 'description' | 'status'>;
export type StoryInput = Pick<
  UserStory,
  | 'title'
  | 'role'
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

export type EquipmentInput = Pick<Equipment, 'name' | 'vendor' | 'model' | 'type'>;
export type WaveInput = Pick<Wave, 'code' | 'name' | 'description' | 'state' | 'itemIds'>;
export type CategoryInput = Pick<DomainCategory, 'id' | 'name' | 'shortName' | 'prefix' | 'description'>;
export type DomainInput = Pick<Domain, 'id' | 'name' | 'description' | 'categoryId'>;

interface RegistryValue {
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  capabilities: Capability[];
  groups: CapabilityGroup[];
  domains: Domain[];
  categories: DomainCategory[];
  equipment: Equipment[];
  equipmentTypes: EquipmentType[];
  epics: Epic[];
  features: Feature[];
  stories: UserStory[];
  waves: Wave[];
  addCapability: (input: NewCapabilityInput) => Capability;
  updateCapability: (id: string, patch: Partial<Omit<Capability, 'id'>>) => void;
  removeCapability: (id: string) => void;
  addGroup: (name: string, description: string, track: TrackId, process: string) => void;
  updateGroup: (
    id: string,
    patch: Partial<Pick<CapabilityGroup, 'name' | 'description' | 'track' | 'process'>>
  ) => void;
  removeGroup: (id: string) => boolean;
  addCategory: (input: CategoryInput) => DomainCategory;
  updateCategory: (
    id: string,
    patch: Partial<Pick<DomainCategory, 'name' | 'shortName' | 'prefix' | 'description'>>
  ) => void;
  removeCategory: (id: string) => boolean;
  addDomain: (input: DomainInput) => Domain;
  updateDomain: (
    id: string,
    patch: Partial<Pick<Domain, 'name' | 'description' | 'categoryId'>>
  ) => void;
  removeDomain: (id: string) => void;
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
  getDomain: (domainId: string) => Domain | undefined;
  getCategoryOfDomain: (domainId: string) => DomainCategory | undefined;
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
  importDataset: (dataset: DatasetId, rows: SheetRow[], parentId?: string) => ImportResult;
}

const RegistryContext = createContext<RegistryValue | null>(null);

function nextId(prefix: string, existing: { id: string }[], pad = 3): string {
  const max = existing.reduce((acc, item) => {
    const n = Number(item.id.replace(`${prefix}-`, ''));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(pad, '0')}`;
}

function persistError(action: string, err: unknown): void {
  console.error(`[registry] ${action}`, err);
}

export function RegistryProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [groups, setGroups] = useState<CapabilityGroup[]>([]);
  const [categories, setCategories] = useState<DomainCategory[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [stories, setStories] = useState<UserStory[]>([]);
  const [waves, setWaves] = useState<Wave[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const snap = await api.fetchRegistry();
      setCategories(snap.categories);
      setDomains(snap.domains);
      setGroups(snap.groups);
      setEquipment(snap.equipment);
      setEquipmentTypes(snap.equipmentTypes);
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

  const isHardwareGroup = useCallback(
    (groupId: string) => groups.find((g) => g.id === groupId)?.track === 'hardware',
    [groups]
  );

  const trackOfGroup = useCallback(
    (groupId: string): TrackId => groups.find((g) => g.id === groupId)?.track ?? 'delivery',
    [groups]
  );

  const addEquipment = useCallback(
    (input: EquipmentInput) => {
      const created: Equipment = {
        id: nextId('EQP', equipment, 2),
        name: input.name.trim(),
        vendor: input.vendor.trim(),
        model: input.model.trim(),
        type: input.type.trim(),
      };
      setEquipment((prev) => [...prev, created]);
      void api.upsertEquipment(created).catch((err) => persistError('addEquipment', err));
      return created;
    },
    [equipment]
  );

  const updateEquipment = useCallback((id: string, patch: Partial<EquipmentInput>) => {
    setEquipment((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = {
          ...item,
          ...patch,
          name: patch.name !== undefined ? patch.name.trim() : item.name,
          vendor: patch.vendor !== undefined ? patch.vendor.trim() : item.vendor,
          model: patch.model !== undefined ? patch.model.trim() : item.model,
          type: patch.type !== undefined ? patch.type.trim() : item.type,
        };
        void api.upsertEquipment(updated).catch((err) => persistError('updateEquipment', err));
        return updated;
      })
    );
  }, []);

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

  const addCategory = useCallback(
    (input: CategoryInput) => {
      const created: DomainCategory = {
        id: input.id.trim(),
        name: input.name.trim(),
        shortName: input.shortName.trim(),
        prefix: input.prefix.trim(),
        description: input.description.trim(),
      };
      setCategories((prev) => {
        if (prev.some((c) => c.id === created.id)) {
          return prev.map((c) => (c.id === created.id ? created : c));
        }
        return [...prev, created];
      });
      void api.upsertCategory(created).catch((err) => persistError('addCategory', err));
      return created;
    },
    []
  );

  const updateCategory = useCallback(
    (
      id: string,
      patch: Partial<Pick<DomainCategory, 'name' | 'shortName' | 'prefix' | 'description'>>
    ) => {
      setCategories((prev) =>
        prev.map((c) => {
          if (c.id !== id) return c;
          const updated = {
            ...c,
            ...patch,
            name: patch.name !== undefined ? patch.name.trim() : c.name,
            shortName: patch.shortName !== undefined ? patch.shortName.trim() : c.shortName,
            prefix: patch.prefix !== undefined ? patch.prefix.trim() : c.prefix,
            description: patch.description !== undefined ? patch.description.trim() : c.description,
          };
          void api.upsertCategory(updated).catch((err) => persistError('updateCategory', err));
          return updated;
        })
      );
    },
    []
  );

  const removeCategory = useCallback(
    (id: string) => {
      const members = domains.filter((d) => d.categoryId === id);
      if (members.length > 0) {
        window.alert(
          `Cannot delete this category: ${members.length} domain${members.length === 1 ? '' : 's'} still belong to it. Move or delete them first.`
        );
        return false;
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
      void api.deleteCategory(id).catch((err) => persistError('removeCategory', err));
      return true;
    },
    [domains]
  );

  const addDomain = useCallback(
    (input: DomainInput) => {
      const created: Domain = {
        id: input.id.trim(),
        name: input.name.trim(),
        description: input.description.trim(),
        categoryId: input.categoryId.trim(),
      };
      setDomains((prev) => {
        if (prev.some((d) => d.id === created.id)) {
          return prev.map((d) => (d.id === created.id ? created : d));
        }
        return [...prev, created];
      });
      void api.upsertDomain(created).catch((err) => persistError('addDomain', err));
      return created;
    },
    []
  );

  const updateDomain = useCallback(
    (id: string, patch: Partial<Pick<Domain, 'name' | 'description' | 'categoryId'>>) => {
      setDomains((prev) =>
        prev.map((d) => {
          if (d.id !== id) return d;
          const updated = {
            ...d,
            ...patch,
            name: patch.name !== undefined ? patch.name.trim() : d.name,
            description: patch.description !== undefined ? patch.description.trim() : d.description,
            categoryId: patch.categoryId !== undefined ? patch.categoryId.trim() : d.categoryId,
          };
          void api.upsertDomain(updated).catch((err) => persistError('updateDomain', err));
          return updated;
        })
      );
    },
    []
  );

  const removeDomain = useCallback((id: string) => {
    setDomains((prev) => prev.filter((d) => d.id !== id));
    setCapabilities((prev) => {
      const next = prev.map((cap) => {
        if (!cap.domainIds.includes(id)) return cap;
        const updated = { ...cap, domainIds: cap.domainIds.filter((d) => d !== id) };
        void api.upsertCapability(updated).catch((err) =>
          persistError('removeDomain capability', err)
        );
        return updated;
      });
      return next;
    });
    void api.deleteDomain(id).catch((err) => persistError('removeDomain', err));
  }, []);

  const addCapability = useCallback(
    (input: NewCapabilityInput) => {
      const created: Capability = {
        id: nextId('CAP', capabilities, 4),
        name: input.name.trim(),
        description: input.description.trim(),
        groupId: input.groupId,
        domainIds: input.domainIds,
        jiraEpic: input.jiraEpic.trim(),
        equipmentIds: isHardwareGroup(input.groupId) ? input.equipmentIds : [],
        progress: 'Identified',
        status: null,
      };
      setCapabilities((prev) => [created, ...prev]);
      void api.upsertCapability(created).catch((err) => persistError('addCapability', err));
      return created;
    },
    [capabilities, isHardwareGroup]
  );

  const updateCapability = useCallback(
    (id: string, patch: Partial<Omit<Capability, 'id'>>) => {
      setCapabilities((prev) => {
        const next = prev.map((cap) => {
          if (cap.id !== id) return cap;
          const updated: Capability = { ...cap, ...patch };
          if (!isHardwareGroup(updated.groupId)) updated.equipmentIds = [];
          const track = trackOfGroup(updated.groupId);
          if (stageIndex(track, updated.progress) < 0) {
            updated.progress = TRACKS[track].stages[0].name;
          }
          void api.upsertCapability(updated).catch((err) => persistError('updateCapability', err));
          return updated;
        });
        return next;
      });
    },
    [isHardwareGroup, trackOfGroup]
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

  const addGroup = useCallback((name: string, description: string, track: TrackId, process: string) => {
    setGroups((prev) => {
      const created: CapabilityGroup = {
        id: `GRP-${String(prev.length + 1).padStart(2, '0')}-${name
          .replace(/[^a-zA-Z]/g, '')
          .slice(0, 3)
          .toUpperCase()}`,
        name: name.trim(),
        description: description.trim(),
        track,
        process: process.trim(),
      };
      void api.upsertGroup(created).catch((err) => persistError('addGroup', err));
      return [...prev, created];
    });
  }, []);

  const updateGroup = useCallback(
    (id: string, patch: Partial<Pick<CapabilityGroup, 'name' | 'description' | 'track' | 'process'>>) => {
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id !== id) return g;
          const updated = {
            ...g,
            ...patch,
            name: patch.name !== undefined ? patch.name.trim() : g.name,
            description: patch.description !== undefined ? patch.description.trim() : g.description,
            process: patch.process !== undefined ? patch.process.trim() : g.process,
          };
          void api.upsertGroup(updated).catch((err) => persistError('updateGroup', err));
          return updated;
        })
      );
    },
    []
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
          if (!isHardwareGroup(cap.groupId)) return cap;
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
          void api.upsertCapabilities(changed).catch((err) =>
            persistError('setEquipmentCapabilities', err)
          );
        }
        return next;
      });
    },
    [isHardwareGroup]
  );

  const addEpic = useCallback((capabilityId: string, input: EpicInput) => {
    setEpics((prev) => {
      const created: Epic = {
        id: nextId('EPIC', prev),
        capabilityId,
        key: input.key.trim(),
        name: input.name.trim(),
        description: input.description.trim(),
        status: input.status,
      };
      void api.upsertEpic(created).catch((err) => persistError('addEpic', err));
      return [...prev, created];
    });
  }, []);

  const updateEpic = useCallback((id: string, patch: Partial<EpicInput>) => {
    setEpics((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const updated = { ...e, ...patch };
        void api.upsertEpic(updated).catch((err) => persistError('updateEpic', err));
        return updated;
      })
    );
  }, []);

  const removeEpic = useCallback((id: string) => {
    setFeatures((prevFeatures) => {
      const doomed = prevFeatures.filter((f) => f.epicId === id).map((f) => f.id);
      setStories((prevStories) => prevStories.filter((s) => !doomed.includes(s.featureId)));
      return prevFeatures.filter((f) => f.epicId !== id);
    });
    setEpics((prev) => prev.filter((e) => e.id !== id));
    void api.deleteEpic(id).catch((err) => persistError('removeEpic', err));
  }, []);

  const addFeature = useCallback((epicId: string, input: FeatureInput) => {
    setFeatures((prev) => {
      const created: Feature = {
        id: nextId('FEAT', prev),
        epicId,
        name: input.name.trim(),
        description: input.description.trim(),
        status: input.status,
      };
      void api.upsertFeature(created).catch((err) => persistError('addFeature', err));
      return [...prev, created];
    });
  }, []);

  const updateFeature = useCallback((id: string, patch: Partial<FeatureInput>) => {
    setFeatures((prev) =>
      prev.map((f) => {
        if (f.id !== id) return f;
        const updated = { ...f, ...patch };
        void api.upsertFeature(updated).catch((err) => persistError('updateFeature', err));
        return updated;
      })
    );
  }, []);

  const removeFeature = useCallback((id: string) => {
    setStories((prev) => prev.filter((s) => s.featureId !== id));
    setFeatures((prev) => prev.filter((f) => f.id !== id));
    void api.deleteFeature(id).catch((err) => persistError('removeFeature', err));
  }, []);

  const addStory = useCallback((featureId: string, input: StoryInput) => {
    setStories((prev) => {
      const created: UserStory = {
        id: nextId('US', prev),
        featureId,
        title: input.title.trim(),
        role: input.role.trim(),
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
      void api.upsertStory(created).catch((err) => persistError('addStory', err));
      return [...prev, created];
    });
  }, []);

  const updateStory = useCallback((id: string, patch: Partial<StoryInput>) => {
    setStories((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...patch };
        void api.upsertStory(updated).catch((err) => persistError('updateStory', err));
        return updated;
      })
    );
  }, []);

  const removeStory = useCallback((id: string) => {
    setStories((prev) => prev.filter((s) => s.id !== id));
    void api.deleteStory(id).catch((err) => persistError('removeStory', err));
  }, []);

  const addWave = useCallback(
    (input: WaveInput) => {
      const created: Wave = { id: nextId('WAVE', waves), ...input };
      setWaves((prev) => [...prev, created]);
      void api.upsertWave(created).catch((err) => persistError('addWave', err));
      return created;
    },
    [waves]
  );

  const updateWave = useCallback((id: string, patch: Partial<WaveInput>) => {
    setWaves((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        const updated = { ...w, ...patch };
        void api.upsertWave(updated).catch((err) => persistError('updateWave', err));
        return updated;
      })
    );
  }, []);

  const removeWave = useCallback((id: string) => {
    setWaves((prev) => prev.filter((w) => w.id !== id));
    void api.deleteWave(id).catch((err) => persistError('removeWave', err));
  }, []);

  const value = useMemo<RegistryValue>(() => {
    const domainMap = new Map(domains.map((d) => [d.id, d]));
    const groupMap = new Map(groups.map((g) => [g.id, g]));
    const categoryMap = new Map(categories.map((c) => [c.id, c]));
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
      const hit = CAPABILITY_STATUSES.find((s) => s.toLowerCase() === raw.trim().toLowerCase());
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
          'Domain IDs': c.domainIds.join('; '),
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
        }));
      }
      if (dataset === 'domains') {
        return domains.map((d) => ({
          'Domain ID': d.id,
          Name: d.name,
          Description: d.description,
          'Category ID': d.categoryId,
        }));
      }
      return groups.map((g) => ({
        'Group ID': g.id,
        Name: g.name,
        Description: g.description,
        Track: g.track,
        Process: g.process,
      }));
    };

    const importDataset = (dataset: DatasetId, rows: SheetRow[], parentId?: string): ImportResult => {
      const result: ImportResult = { created: 0, updated: 0, skipped: 0, messages: [] };
      const note = (i: number, why: string) => {
        result.skipped += 1;
        if (result.messages.length < 6) result.messages.push(`Row ${i + 2}: ${why}`);
      };

      if (dataset === 'capabilities') {
        const next = [...capabilities];
        rows.forEach((r, i) => {
          const name = (r['Name'] ?? '').trim();
          if (!name) return note(i, 'no name');
          const groupId = (r['Group ID'] ?? '').trim() || groups[0]?.id;
          if (!groupId || !groups.some((g) => g.id === groupId))
            return note(i, `unknown group "${groupId ?? ''}"`);
          const track = groupMap.get(groupId)?.track ?? 'delivery';
          const progressRaw = (r['Progress'] ?? '').trim();
          const progress =
            TRACKS[track].stages.find((s) => s.name.toLowerCase() === progressRaw.toLowerCase())
              ?.name ?? TRACKS[track].stages[0].name;
          const id = (r['Capability ID'] ?? '').trim();
          const patch = {
            name,
            description: (r['Description'] ?? '').trim(),
            groupId,
            domainIds: list(r['Domain IDs'] ?? '').filter((d) => domainMap.has(d)),
            jiraEpic: (r['Epic Key'] ?? '').trim(),
            equipmentIds:
              groupMap.get(groupId)?.track === 'hardware'
                ? list(r['Equipment IDs'] ?? '').filter((e) => equipment.some((eq) => eq.id === e))
                : [],
            progress,
            status: asStatus(r['Status'] ?? ''),
          };
          const at = id ? next.findIndex((c) => c.id === id) : -1;
          if (at >= 0) {
            next[at] = { ...next[at], ...patch };
            result.updated += 1;
          } else {
            next.unshift({ id: id || nextId('CAP', next, 4), ...patch });
            result.created += 1;
          }
        });
        setCapabilities(next);
        void api.upsertCapabilities(next).catch((err) => persistError('import capabilities', err));
        return result;
      }

      if (dataset === 'epics') {
        const next = [...epics];
        rows.forEach((r, i) => {
          const name = (r['Name'] ?? '').trim();
          if (!name) return note(i, 'no name');
          const capabilityId = parentId ?? (r['Capability ID'] ?? '').trim();
          if (!capabilityMap.has(capabilityId)) return note(i, `unknown capability "${capabilityId}"`);
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
            result.updated += 1;
          } else {
            next.push({ id: id || nextId('EPIC', next), ...patch });
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
          if (!epicMap.has(epicId)) return note(i, `unknown epic "${epicId}"`);
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
            result.updated += 1;
          } else {
            next.push({ id: id || nextId('FEAT', next), ...patch });
            result.created += 1;
          }
        });
        setFeatures(next);
        void api.upsertFeatures(next).catch((err) => persistError('import features', err));
        return result;
      }

      if (dataset === 'stories') {
        const next = [...stories];
        rows.forEach((r, i) => {
          const title = (r['Title'] ?? '').trim();
          if (!title) return note(i, 'no title');
          const featureId = parentId ?? (r['Feature ID'] ?? '').trim();
          if (!featureMap.has(featureId)) return note(i, `unknown feature "${featureId}"`);
          const stageRaw = (r['Progress Stage'] ?? '').trim();
          const points = Number((r['Points'] ?? '').trim());
          const id = (r['Story ID'] ?? '').trim();
          const patch = {
            featureId,
            title,
            role: (r['As a'] ?? '').trim(),
            want: (r['I want to'] ?? '').trim(),
            benefit: (r['So that'] ?? '').trim(),
            criteria: list(r['Acceptance Criteria'] ?? ''),
            points: Number.isFinite(points) && (r['Points'] ?? '').trim() !== '' ? points : null,
            status: asStatus(r['Status'] ?? ''),
            stage:
              STORY_STAGES.find((s) => s.name.toLowerCase() === stageRaw.toLowerCase())?.name ??
              STORY_STAGES[0].name,
            adrContext: (r['ADR Context'] ?? '').trim(),
            adrDecision: (r['ADR Decision'] ?? '').trim(),
            adrTechnical: (r['ADR Technical'] ?? '').trim(),
            adrConsequences: (r['ADR Consequences'] ?? '').trim(),
            adrApproved: /^(yes|true|1|x)$/i.test((r['ADR Approved'] ?? '').trim()),
          };
          const at = id ? next.findIndex((s) => s.id === id) : -1;
          if (at >= 0) {
            next[at] = { ...next[at], ...patch };
            result.updated += 1;
          } else {
            next.push({ id: id || nextId('US', next), ...patch });
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
          };
          const at = id ? next.findIndex((e) => e.id === id) : -1;
          if (at >= 0) {
            next[at] = { ...next[at], ...patch };
            result.updated += 1;
          } else {
            next.push({ id: id || nextId('EQP', next, 2), ...patch });
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

      if (dataset === 'domains') {
        const next = [...domains];
        rows.forEach((r, i) => {
          const name = (r['Name'] ?? '').trim();
          if (!name) return note(i, 'no name');
          const categoryId = (r['Category ID'] ?? '').trim();
          if (!categoryMap.has(categoryId)) return note(i, `unknown category "${categoryId}"`);
          const id = (r['Domain ID'] ?? '').trim();
          if (!id) return note(i, 'a domain ID is required');
          const patch = { name, description: (r['Description'] ?? '').trim(), categoryId };
          const at = next.findIndex((d) => d.id === id);
          if (at >= 0) {
            next[at] = { ...next[at], ...patch };
            result.updated += 1;
          } else {
            next.push({ id, ...patch });
            result.created += 1;
          }
        });
        setDomains(next);
        void api.upsertDomains(next).catch((err) => persistError('import domains', err));
        return result;
      }

      const next = [...groups];
      rows.forEach((r, i) => {
        const name = (r['Name'] ?? '').trim();
        if (!name) return note(i, 'no name');
        const trackRaw = (r['Track'] ?? '').trim().toLowerCase();
        const track: TrackId = trackRaw === 'hardware' ? 'hardware' : 'delivery';
        const id = (r['Group ID'] ?? '').trim();
        const patch = {
          name,
          description: (r['Description'] ?? '').trim(),
          track,
          process: (r['Process'] ?? '').trim(),
        };
        const at = id ? next.findIndex((g) => g.id === id) : -1;
        if (at >= 0) {
          next[at] = { ...next[at], ...patch };
          result.updated += 1;
        } else {
          next.push({
            id:
              id ||
              `GRP-${String(next.length + 1).padStart(2, '0')}-${name
                .replace(/[^a-zA-Z]/g, '')
                .slice(0, 3)
                .toUpperCase()}`,
            ...patch,
          });
          result.created += 1;
        }
      });
      setGroups(next);
      void api.upsertGroups(next).catch((err) => persistError('import groups', err));
      return result;
    };

    const hardwareGroupIds = new Set(
      groups.filter((g) => g.track === 'hardware').map((g) => g.id)
    );

    return {
      loading,
      error,
      reload,
      capabilities,
      groups,
      domains,
      categories,
      equipment,
      equipmentTypes,
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
      addCategory,
      updateCategory,
      removeCategory,
      addDomain,
      updateDomain,
      removeDomain,
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
      getDomain: (id) => domainMap.get(id),
      getCategoryOfDomain: (id) => {
        const d = domainMap.get(id);
        return d ? categoryMap.get(d.categoryId) : undefined;
      },
      getCapability: (id) => capabilityMap.get(id),
      getEpic: (id) => epicMap.get(id),
      getFeature: (id) => featureMap.get(id),
      getStory: (id) => storyMap.get(id),
      trackOf: (capability) => groupMap.get(capability.groupId)?.track ?? 'delivery',
      epicsOf,
      featuresOf,
      storiesOf,
      storiesOfEpic,
      capabilityOfEpic: (epicId) => {
        const e = epicMap.get(epicId);
        return e ? capabilityMap.get(e.capabilityId) : undefined;
      },
      countsOf,
      hardwareCapabilities: capabilities.filter((c) => hardwareGroupIds.has(c.groupId)),
      exportDataset,
      importDataset,
    };
  }, [
    loading,
    error,
    reload,
    capabilities,
    groups,
    domains,
    categories,
    epics,
    features,
    stories,
    waves,
    equipment,
    equipmentTypes,
    addCapability,
    updateCapability,
    removeCapability,
    addGroup,
    updateGroup,
    removeGroup,
    addCategory,
    updateCategory,
    removeCategory,
    addDomain,
    updateDomain,
    removeDomain,
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
