import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2Icon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { WaveModal } from '../components/WaveModal';
import { Button, Chip, PageHeader, ProgressBar, WaveTag, inputClass } from '../components/Primitives';
import { SortableGripButton, SortableList } from '../components/SortableTableBody';
import { useAuth } from '../contexts/AuthContext';
import { useRegistry } from '../contexts/RegistryContext';
import type { Wave, WaveState } from '../types/registry';
import { WAVE_STATES, sortByOrder, storyIsDone } from '../types/registry';
import { waveCounts, waveStories } from '../utils/scope';

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-md border px-2.5 py-1 text-xs transition-colors duration-150 ease-out ${
        active
          ? 'border-brand bg-brand/10 text-strong'
          : 'border-line-strong text-mute hover:border-brand hover:text-strong'
      }`}
    >
      {label}
    </button>
  );
}

export function WavesPage() {
  const {
    waves,
    products,
    epics,
    features,
    stories,
    getCapability,
    getEpic,
    getFeature,
    getStory,
    removeWave,
    reorderWaves,
    updateWave,
  } = useRegistry();
  const { can, capabilityVisible, entityVisible, productVisible } = useAuth();
  const canManage = can('manage_waves');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Wave | null>(null);
  const [productFilter, setProductFilter] = useState<string | null>(null);

  const visibleProducts = useMemo(
    () => products.filter((p) => productVisible(p.id)).sort((a, b) => a.name.localeCompare(b.name)),
    [products, productVisible]
  );

  function labelFor(id: string): {
    label: string;
    tone: 'brand' | 'violet' | 'aqua' | 'neutral';
  } {
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

  const visibleWaves = sortByOrder(
    waves
      .filter((w) => entityVisible(w.productIds))
      .filter(
        (w) => productFilter === null || (w.productIds ?? []).includes(productFilter)
      )
  ).map((w) => ({
    id: w.id,
    wave: w,
    itemIds: w.itemIds.filter(itemVisible),
  }));


  return (
    <div>
      <PageHeader
        title="Waves"
        count={`${visibleWaves.length} increments`}
        action={
          canManage ? (
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Define wave
            </Button>
          ) : undefined
        }
      />

      <div className="mt-4 flex flex-wrap gap-1.5">
        <FilterChip
          active={productFilter === null}
          label="All products"
          onClick={() => setProductFilter(null)}
        />
        {visibleProducts.map((p) => (
          <FilterChip
            key={p.id}
            active={productFilter === p.id}
            label={p.name}
            onClick={() => setProductFilter(p.id)}
          />
        ))}
      </div>

      <SortableList
        items={visibleWaves}
        disabled={!canManage}
        onReorder={reorderWaves}
        className="mt-4 space-y-5"
        renderItem={({ wave: w, itemIds }, handle) => {
          const scoped = { ...w, itemIds };
          const scope = waveStories(scoped, { epics, features, stories });
          const done = scope.filter(storyIsDone).length;
          const counts = waveCounts(scoped);
          const productNames = (w.productIds ?? [])
            .map((id) => products.find((p) => p.id === id)?.name ?? id)
            .join(', ');

          return (
            <article className="border-t border-line pt-4">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                {canManage && <SortableGripButton handle={handle} />}
                <span className="rounded border border-violet/40 px-1.5 py-0.5 font-mono text-2xs text-violet">
                  {w.code}
                </span>
                <h2 className="text-base font-semibold text-strong">{w.name}</h2>
                <WaveTag state={w.state} />
                {w.deliveryDate && (
                  <span className="font-mono text-2xs text-mute">
                    Livraison {w.deliveryDate}
                  </span>
                )}
                {productNames && (
                  <span className="text-2xs text-mute">{productNames}</span>
                )}
                {canManage && (
                  <span className="ml-auto flex flex-wrap items-center gap-1.5">
                    <select
                      className={`${inputClass} w-auto py-1 text-2xs`}
                      value={w.state}
                      aria-label={`State for ${w.code}`}
                      onChange={(e) =>
                        updateWave(w.id, { state: e.target.value as WaveState })
                      }
                    >
                      {WAVE_STATES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {w.state !== 'Closed' && (
                      <button
                        type="button"
                        aria-label={`Mark ${w.code} done`}
                        title="Mark done"
                        onClick={() => updateWave(w.id, { state: 'Closed' })}
                        className="rounded p-1 text-mute transition-colors duration-150 ease-out hover:bg-ink-700 hover:text-strong"
                      >
                        <CheckCircle2Icon className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Edit ${w.code}`}
                      onClick={() => {
                        setEditing(w);
                        setOpen(true);
                      }}
                      className="rounded p-1 text-mute transition-colors duration-150 ease-out hover:bg-ink-700 hover:text-strong"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${w.code}`}
                      onClick={() => removeWave(w.id)}
                      className="rounded p-1 text-mute transition-colors duration-150 ease-out hover:bg-ink-700 hover:text-strong"
                    >
                      <Trash2Icon className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
              </div>

              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-mute">
                {w.description}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                <span className="flex items-center gap-2 text-2xs text-mute">
                  <span className="uppercase tracking-[0.14em] text-ink-500">
                    Stories complete
                  </span>
                  <ProgressBar done={done} total={scope.length} />
                </span>
                <span className="font-mono text-2xs text-mute">
                  {counts.capabilities} capabilities · {counts.epics} epics · {counts.features}{' '}
                  features · {counts.stories} stories selected
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {itemIds.map((id) => {
                  const { label, tone } = labelFor(id);
                  const href = id.startsWith('CAP-') ? `/capabilities/${id}` : undefined;
                  const chip = (
                    <Chip tone={tone} title={id}>
                      {label}
                    </Chip>
                  );

                  return href ? (
                    <Link key={id} to={href}>
                      {chip}
                    </Link>
                  ) : (
                    <span key={id}>{chip}</span>
                  );
                })}
              </div>
            </article>
          );
        }}
      />

      {visibleWaves.length === 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-line-strong px-6 py-16 text-center">
          <p className="text-sm font-medium text-strong">No waves yet.</p>
        </div>
      )}

      <WaveModal open={open} wave={editing} onClose={() => setOpen(false)} />
    </div>
  );
}
