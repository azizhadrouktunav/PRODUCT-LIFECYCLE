import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { WaveModal } from '../components/WaveModal';
import { Button, Chip, PageHeader, ProgressBar, WaveTag } from '../components/Primitives';
import { useAuth } from '../contexts/AuthContext';
import { useRegistry } from '../contexts/RegistryContext';
import type { Wave } from '../types/registry';
import { storyIsDone } from '../types/registry';
import { waveCounts, waveStories } from '../utils/scope';

export function WavesPage() {
  const { waves, epics, features, stories, getCapability, getEpic, getFeature, getStory, removeWave } =
  useRegistry();
  const { can, capabilityVisible, entityVisible } = useAuth();
  const canManage = can('manage_waves');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Wave | null>(null);

  function labelFor(id: string): {label: string;tone: 'brand' | 'violet' | 'aqua' | 'neutral';} {
    if (id.startsWith('CAP-')) return { label: getCapability(id)?.name ?? id, tone: 'brand' };
    if (id.startsWith('EPIC-')) return { label: getEpic(id)?.name ?? id, tone: 'violet' };
    if (id.startsWith('FEAT-')) return { label: getFeature(id)?.name ?? id, tone: 'aqua' };
    return { label: getStory(id)?.title ?? id, tone: 'neutral' };
  }

  /** Every wave item resolves back to one capability, which carries the products. */
  function itemVisible(id: string): boolean {
    if (id.startsWith('CAP-')) {
      const capability = getCapability(id);
      return !!capability && capabilityVisible(capability);
    }
    if (id.startsWith('EPIC-')) {
      const epic = getEpic(id);
      return !!epic && itemVisible(epic.capabilityId);
    }
    if (id.startsWith('FEAT-')) {
      const feature = getFeature(id);
      return !!feature && itemVisible(feature.epicId);
    }
    const story = getStory(id);
    return !!story && itemVisible(story.featureId);
  }

  const visibleWaves = waves
    .filter((w) => entityVisible(w.productIds))
    .map((w) => ({ wave: w, itemIds: w.itemIds.filter(itemVisible) }));

  return (
    <div>
      <PageHeader
        title="Waves"
        count={`${visibleWaves.length} increments`}
        action={
        canManage ?
        <Button
          variant="primary"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}>
          
            <PlusIcon className="h-3.5 w-3.5" />
            Define wave
          </Button> :
        undefined
        } />
      

      <div className="mt-4 space-y-5">
        {visibleWaves.map(({ wave: w, itemIds }) => {
          const scoped = { ...w, itemIds };
          const scope = waveStories(scoped, { epics, features, stories });
          const done = scope.filter(storyIsDone).length;
          const counts = waveCounts(scoped);

          return (
            <article key={w.id} className="border-t border-line pt-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="rounded border border-violet/40 px-1.5 py-0.5 font-mono text-2xs text-violet">
                  {w.code}
                </span>
                <h2 className="text-base font-semibold text-strong">{w.name}</h2>
                <WaveTag state={w.state} />
                {w.deliveryDate &&
                <span className="font-mono text-2xs text-mute">Livraison {w.deliveryDate}</span>
                }
                {canManage &&
                <span className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Edit ${w.code}`}
                    onClick={() => {
                      setEditing(w);
                      setOpen(true);
                    }}
                    className="rounded p-1 text-mute transition-colors duration-150 ease-out hover:bg-ink-700 hover:text-strong">
                    
                    <PencilIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${w.code}`}
                    onClick={() => removeWave(w.id)}
                    className="rounded p-1 text-mute transition-colors duration-150 ease-out hover:bg-ink-700 hover:text-strong">
                    
                    <Trash2Icon className="h-3.5 w-3.5" />
                  </button>
                </span>
                }
              </div>

              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-mute">{w.description}</p>

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="flex items-center gap-2 text-2xs text-mute">
                  <span className="uppercase tracking-[0.14em] text-ink-500">Stories complete</span>
                  <ProgressBar done={done} total={scope.length} />
                </span>
                <span className="font-mono text-2xs text-mute">
                  {counts.capabilities} capabilities · {counts.epics} epics · {counts.features} features ·{' '}
                  {counts.stories} stories selected
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {itemIds.map((id) => {
                  const { label, tone } = labelFor(id);
                  const href = id.startsWith('CAP-') ? `/capabilities/${id}` : undefined;
                  const chip =
                  <Chip tone={tone} title={id}>
                      {label}
                    </Chip>;

                  return href ?
                  <Link key={id} to={href}>
                      {chip}
                    </Link> :

                  <span key={id}>{chip}</span>;

                })}
              </div>
            </article>);

        })}

        {visibleWaves.length === 0 &&
        <div className="rounded-lg border border-dashed border-line-strong px-6 py-16 text-center">
            <p className="text-sm font-medium text-strong">No waves yet.</p>
          </div>
        }
      </div>

      <WaveModal open={open} wave={editing} onClose={() => setOpen(false)} />
    </div>);

}