import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { initialCapabilities } from '../data/capabilities';
import { initialEpics, initialFeatures, initialStories } from '../data/delivery';
import {
  domainCategories,
  domains as initialDomains,
  equipment as initialEquipment,
  initialGroups } from
'../data/taxonomy';
import { initialWaves } from '../data/waves';
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
  Feature,
  RecordCounts,
  TrackId,
  UserStory,
  Wave } from
'../types/registry';
import {
  CAPABILITY_STATUSES,
  HARDWARE_GROUP_ID,
  STORY_STAGES,
  TRACKS,
  stageIndex } from
'../types/registry';

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
  'title' |
  'role' |
  'want' |
  'benefit' |
  'criteria' |
  'points' |
  'status' |
  'stage' |
  'adrContext' |
  'adrDecision' |
  'adrTechnical' |
  'adrConsequences' |
  'adrApproved'>;

export type EquipmentInput = Pick<Equipment, 'name' | 'vendor' | 'model' | 'type'>;
export type WaveInput = Pick<Wave, 'code' | 'name' | 'description' | 'state' | 'itemIds'>;

interface RegistryValue {
  capabilities: Capability[];
  groups: CapabilityGroup[];
  domains: Domain[];
  categories: DomainCategory[];
  equipment: Equipment[];
  epics: Epic[];
  features: Feature[];
  stories: UserStory[];
  waves: Wave[];
  addCapability: (input: NewCapabilityInput) => Capability;
  updateCapability: (id: string, patch: Partial<Omit<Capability, 'id'>>) => void;
  addGroup: (name: string, description: string, track: TrackId, process: string) => void;
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
  /** Excel transfer — rows are keyed by the column labels declared in utils/datasets. */
  exportDataset: (dataset: DatasetId, parentId?: string) => SheetRow[];
  importDataset: (dataset: DatasetId, rows: SheetRow[], parentId?: string) => ImportResult;
}

const RegistryContext = createContext<RegistryValue | null>(null);

function nextId(prefix: string, existing: {id: string;}[], pad = 3): string {
  const max = existing.reduce((acc, item) => {
    const n = Number(item.id.replace(`${prefix}-`, ''));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(pad, '0')}`;
}

export function RegistryProvider({ children }: {children: React.ReactNode;}) {
  const [capabilities, setCapabilities] = useState<Capability[]>(initialCapabilities);
  const [groups, setGroups] = useState<CapabilityGroup[]>(initialGroups);
  const [epics, setEpics] = useState<Epic[]>(initialEpics);
  const [features, setFeatures] = useState<Feature[]>(initialFeatures);
  const [stories, setStories] = useState<UserStory[]>(initialStories);
  const [waves, setWaves] = useState<Wave[]>(initialWaves);
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment);
  const [domains, setDomains] = useState<Domain[]>(initialDomains);

  const addEquipment = useCallback(
    (input: EquipmentInput) => {
      const created: Equipment = {
        id: nextId('EQP', equipment, 2),
        name: input.name.trim(),
        vendor: input.vendor.trim(),
        model: input.model.trim(),
        type: input.type.trim()
      };
      setEquipment((prev) => [...prev, created]);
      return created;
    },
    [equipment]
  );

  const trackOfGroup = useCallback(
    (groupId: string): TrackId => groups.find((g) => g.id === groupId)?.track ?? 'delivery',
    [groups]
  );

  const addCapability = useCallback(
    (input: NewCapabilityInput) => {
      const created: Capability = {
        id: nextId('CAP', capabilities, 4),
        name: input.name.trim(),
        description: input.description.trim(),
        groupId: input.groupId,
        domainIds: input.domainIds,
        jiraEpic: input.jiraEpic.trim(),
        equipmentIds: input.groupId === HARDWARE_GROUP_ID ? input.equipmentIds : [],
        progress: 'Identified',
        status: null
      };
      setCapabilities((prev) => [created, ...prev]);
      return created;
    },
    [capabilities]
  );

  const updateCapability = useCallback(
    (id: string, patch: Partial<Omit<Capability, 'id'>>) => {
      setCapabilities((prev) =>
      prev.map((cap) => {
        if (cap.id !== id) return cap;
        const next: Capability = { ...cap, ...patch };
        if (next.groupId !== HARDWARE_GROUP_ID) next.equipmentIds = [];
        const track = trackOfGroup(next.groupId);
        // A stage only exists inside one track — reset when the group moves the capability.
        if (stageIndex(track, next.progress) < 0) {
          next.progress = TRACKS[track].stages[0].name;
        }
        return next;
      })
      );
    },
    [trackOfGroup]
  );

  const addGroup = useCallback((name: string, description: string, track: TrackId, process: string) => {
    setGroups((prev) => [
    ...prev,
    {
      id: `GRP-${String(prev.length + 1).padStart(2, '0')}-${name.
      replace(/[^a-zA-Z]/g, '').
      slice(0, 3).
      toUpperCase()}`,
      name: name.trim(),
      description: description.trim(),
      track,
      process: process.trim()
    }]
    );
  }, []);

  const setEquipmentCapabilities = useCallback((equipmentId: string, capabilityIds: string[]) => {
    setCapabilities((prev) =>
    prev.map((cap) => {
      if (cap.groupId !== HARDWARE_GROUP_ID) return cap;
      const shouldHave = capabilityIds.includes(cap.id);
      const has = cap.equipmentIds.includes(equipmentId);
      if (shouldHave === has) return cap;
      return {
        ...cap,
        equipmentIds: shouldHave ?
        [...cap.equipmentIds, equipmentId] :
        cap.equipmentIds.filter((id) => id !== equipmentId)
      };
    })
    );
  }, []);

  const addEpic = useCallback((capabilityId: string, input: EpicInput) => {
    setEpics((prev) => [
    ...prev,
    {
      id: nextId('EPIC', prev),
      capabilityId,
      key: input.key.trim(),
      name: input.name.trim(),
      description: input.description.trim(),
      status: input.status
    }]
    );
  }, []);

  const updateEpic = useCallback((id: string, patch: Partial<EpicInput>) => {
    setEpics((prev) => prev.map((e) => e.id === id ? { ...e, ...patch } : e));
  }, []);

  const removeEpic = useCallback((id: string) => {
    setFeatures((prevFeatures) => {
      const doomed = prevFeatures.filter((f) => f.epicId === id).map((f) => f.id);
      setStories((prevStories) => prevStories.filter((s) => !doomed.includes(s.featureId)));
      return prevFeatures.filter((f) => f.epicId !== id);
    });
    setEpics((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const addFeature = useCallback((epicId: string, input: FeatureInput) => {
    setFeatures((prev) => [
    ...prev,
    {
      id: nextId('FEAT', prev),
      epicId,
      name: input.name.trim(),
      description: input.description.trim(),
      status: input.status
    }]
    );
  }, []);

  const updateFeature = useCallback((id: string, patch: Partial<FeatureInput>) => {
    setFeatures((prev) => prev.map((f) => f.id === id ? { ...f, ...patch } : f));
  }, []);

  const removeFeature = useCallback((id: string) => {
    setStories((prev) => prev.filter((s) => s.featureId !== id));
    setFeatures((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const addStory = useCallback((featureId: string, input: StoryInput) => {
    setStories((prev) => [
    ...prev,
    {
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
      adrApproved: input.adrApproved
    }]
    );
  }, []);

  const updateStory = useCallback((id: string, patch: Partial<StoryInput>) => {
    setStories((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
  }, []);

  const removeStory = useCallback((id: string) => {
    setStories((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addWave = useCallback(
    (input: WaveInput) => {
      const created: Wave = { id: nextId('WAVE', waves), ...input };
      setWaves((prev) => [...prev, created]);
      return created;
    },
    [waves]
  );

  const updateWave = useCallback((id: string, patch: Partial<WaveInput>) => {
    setWaves((prev) => prev.map((w) => w.id === id ? { ...w, ...patch } : w));
  }, []);

  const removeWave = useCallback((id: string) => {
    setWaves((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const value = useMemo<RegistryValue>(() => {
    const domainMap = new Map(domains.map((d) => [d.id, d]));
    const groupMap = new Map(groups.map((g) => [g.id, g]));
    const categoryMap = new Map(domainCategories.map((c) => [c.id, c]));
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
        equipment: capabilityMap.get(capabilityId)?.equipmentIds.length ?? 0
      };
    };

    const asStatus = (raw: string): CapabilityStatus | null => {
      const hit = CAPABILITY_STATUSES.find((s) => s.toLowerCase() === raw.trim().toLowerCase());
      return hit ?? null;
    };
    const list = (raw: string) =>
    raw.
    split(/[;,\n]/).
    map((v) => v.trim()).
    filter(Boolean);

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
          Status: c.status ?? ''
        }));
      }
      if (dataset === 'epics') {
        return epics.
        filter((e) => !parentId || e.capabilityId === parentId).
        map((e) => ({
          'Epic ID': e.id,
          'Capability ID': e.capabilityId,
          Key: e.key,
          Name: e.name,
          Description: e.description,
          Status: e.status ?? ''
        }));
      }
      if (dataset === 'features') {
        return features.
        filter((f) => !parentId || f.epicId === parentId).
        map((f) => ({
          'Feature ID': f.id,
          'Epic ID': f.epicId,
          Name: f.name,
          Description: f.description,
          Status: f.status ?? ''
        }));
      }
      if (dataset === 'stories') {
        return stories.
        filter((s) => !parentId || s.featureId === parentId).
        map((s) => ({
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
          'ADR Approved': s.adrApproved ? 'Yes' : 'No'
        }));
      }
      if (dataset === 'equipment') {
        return equipment.map((e) => ({
          'Equipment ID': e.id,
          Name: e.name,
          Vendor: e.vendor,
          Model: e.model,
          Type: e.type
        }));
      }
      if (dataset === 'domains') {
        return domains.map((d) => ({
          'Domain ID': d.id,
          Name: d.name,
          Description: d.description,
          'Category ID': d.categoryId
        }));
      }
      return groups.map((g) => ({
        'Group ID': g.id,
        Name: g.name,
        Description: g.description,
        Track: g.track,
        Process: g.process
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
          const groupId = (r['Group ID'] ?? '').trim() || groups[0].id;
          if (!groups.some((g) => g.id === groupId)) return note(i, `unknown group "${groupId}"`);
          const track = groupMap.get(groupId)?.track ?? 'delivery';
          const progressRaw = (r['Progress'] ?? '').trim();
          const progress =
          TRACKS[track].stages.find((s) => s.name.toLowerCase() === progressRaw.toLowerCase())?.name ??
          TRACKS[track].stages[0].name;
          const id = (r['Capability ID'] ?? '').trim();
          const patch = {
            name,
            description: (r['Description'] ?? '').trim(),
            groupId,
            domainIds: list(r['Domain IDs'] ?? '').filter((d) => domainMap.has(d)),
            jiraEpic: (r['Epic Key'] ?? '').trim(),
            equipmentIds:
            groupId === HARDWARE_GROUP_ID ?
            list(r['Equipment IDs'] ?? '').filter((e) => equipment.some((eq) => eq.id === e)) :
            [],
            progress,
            status: asStatus(r['Status'] ?? '')
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
            status: asStatus(r['Status'] ?? '')
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
            status: asStatus(r['Status'] ?? '')
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
            adrApproved: /^(yes|true|1|x)$/i.test((r['ADR Approved'] ?? '').trim())
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
        return result;
      }

      if (dataset === 'equipment') {
        const next = [...equipment];
        rows.forEach((r, i) => {
          const name = (r['Name'] ?? '').trim();
          if (!name) return note(i, 'no name');
          const id = (r['Equipment ID'] ?? '').trim();
          const patch = {
            name,
            vendor: (r['Vendor'] ?? '').trim(),
            model: (r['Model'] ?? '').trim(),
            type: (r['Type'] ?? '').trim()
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
        setEquipment(next);
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
          process: (r['Process'] ?? '').trim()
        };
        const at = id ? next.findIndex((g) => g.id === id) : -1;
        if (at >= 0) {
          next[at] = { ...next[at], ...patch };
          result.updated += 1;
        } else {
          next.push({
            id:
            id ||
            `GRP-${String(next.length + 1).padStart(2, '0')}-${name.
            replace(/[^a-zA-Z]/g, '').
            slice(0, 3).
            toUpperCase()}`,
            ...patch
          });
          result.created += 1;
        }
      });
      setGroups(next);
      return result;
    };

    return {
      capabilities,
      groups,
      domains,
      categories: domainCategories,
      equipment,
      epics,
      features,
      stories,
      waves,
      addCapability,
      updateCapability,
      addGroup,
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
      hardwareCapabilities: capabilities.filter((c) => c.groupId === HARDWARE_GROUP_ID),
      exportDataset,
      importDataset
    };
  }, [
  capabilities,
  groups,
  domains,
  epics,
  features,
  stories,
  waves,
  equipment,
  addCapability,
  updateCapability,
  addGroup,
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
  addWave,
  updateWave,
  removeWave]
  );

  return <RegistryContext.Provider value={value}>{children}</RegistryContext.Provider>;
}

export function useRegistry(): RegistryValue {
  const ctx = useContext(RegistryContext);
  if (!ctx) throw new Error('useRegistry must be used within a RegistryProvider');
  return ctx;
}