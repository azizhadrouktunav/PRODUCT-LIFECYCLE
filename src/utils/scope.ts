import type { Epic, Feature, UserStory, Wave } from '../types/registry';

interface ScopeSource {
  epics: Epic[];
  features: Feature[];
  stories: UserStory[];
}

/** Expands a wave's mixed selection down to the concrete user stories it contains. */
export function waveStories(wave: Wave, src: ScopeSource): UserStory[] {
  const epicIds = new Set<string>();
  const featureIds = new Set<string>();
  const storyIds = new Set<string>();

  for (const id of wave.itemIds) {
    if (id.startsWith('CAP-')) {
      src.epics.filter((e) => e.capabilityId === id).forEach((e) => epicIds.add(e.id));
    } else if (id.startsWith('EPIC-')) {
      epicIds.add(id);
    } else if (id.startsWith('FEAT-')) {
      featureIds.add(id);
    } else if (id.startsWith('US-')) {
      storyIds.add(id);
    }
  }

  src.features.filter((f) => epicIds.has(f.epicId)).forEach((f) => featureIds.add(f.id));
  src.stories.filter((s) => featureIds.has(s.featureId)).forEach((s) => storyIds.add(s.id));

  return src.stories.filter((s) => storyIds.has(s.id));
}

export function waveCounts(wave: Wave) {
  return wave.itemIds.reduce(
    (acc, id) => {
      if (id.startsWith('CAP-')) acc.capabilities += 1;else
      if (id.startsWith('EPIC-')) acc.epics += 1;else
      if (id.startsWith('FEAT-')) acc.features += 1;else
      if (id.startsWith('US-')) acc.stories += 1;
      return acc;
    },
    { capabilities: 0, epics: 0, features: 0, stories: 0 }
  );
}