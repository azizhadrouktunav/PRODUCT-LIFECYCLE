import React, { useState } from 'react';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { LifecycleModal } from '../components/LifecycleModal';
import { Button, PageHeader, TONE_DOT } from '../components/Primitives';
import { useAuth } from '../contexts/AuthContext';
import { useRegistry } from '../contexts/RegistryContext';
import type { Lifecycle } from '../types/registry';
import { DECOMPOSITION_LABEL, REQUIREMENT_LABEL, usesDecomposition } from '../types/registry';

export function LifecyclesPage() {
  const { lifecycles, groups, removeLifecycle, getProduct } = useRegistry();
  const { can, entityVisible } = useAuth();
  const canManage = can('manage_lifecycles');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Lifecycle | null>(null);
  const visible = lifecycles.filter((lc) => entityVisible(lc.productIds));

  return (
    <div>
      <PageHeader
        title="Lifecycles"
        count={`${visible.length} lifecycles`}
        description="Define the process tracks capability groups follow — ordered stages, prerequisites, and whether work decomposes into epics, features and user stories."
        action={
          canManage ? (
            <Button variant="primary" onClick={() => setAdding(true)}>
              <PlusIcon className="h-3.5 w-3.5" />
              Add lifecycle
            </Button>
          ) : undefined
        }
      />

      <div className="mt-4 space-y-6">
        {visible.map((lc) => {
          const usedBy = groups.filter((g) => g.track === lc.id).length;
          return (
            <section key={lc.id} className="rounded-md border border-line-strong p-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 className="text-base font-semibold text-strong">{lc.label}</h2>
                {canManage && (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditing(lc)}
                      aria-label={`Edit ${lc.label}`}
                      title="Edit lifecycle"
                      className="rounded p-0.5 text-mute transition-colors duration-150 ease-out hover:text-brand-bright"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeLifecycle(lc.id)}
                      aria-label={`Delete ${lc.label}`}
                      title="Delete lifecycle"
                      className="rounded p-0.5 text-mute transition-colors duration-150 ease-out hover:text-danger"
                    >
                      <Trash2Icon className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                <span className="font-mono text-2xs text-ink-500">{lc.id}</span>
                <span className="rounded border border-line-strong px-1.5 py-0.5 text-2xs text-soft">
                  {lc.stages.length} stages · {DECOMPOSITION_LABEL[lc.decomposition]}
                </span>
                <span className="ml-auto font-mono text-2xs text-mute">
                  {usedBy} group{usedBy === 1 ? '' : 's'}
                </span>
              </div>
              {(lc.productIds ?? []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {(lc.productIds ?? []).map((id) => (
                    <span
                      key={id}
                      className="rounded border border-line-strong px-1.5 py-0.5 font-mono text-2xs text-mute"
                    >
                      {getProduct(id)?.name ?? id}
                    </span>
                  ))}
                </div>
              )}
              {lc.summary && (
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-mute">{lc.summary}</p>
              )}

              <h3 className="mt-4 text-2xs uppercase tracking-[0.14em] text-ink-500">
                Capability stages
              </h3>
              <ol className="mt-2">
                {lc.stages.map((s, i) => (
                  <li
                    key={`${s.name}-${i}`}
                    className="flex gap-3 border-b border-line-soft py-2 last:border-0"
                  >
                    <span className="w-5 shrink-0 pt-0.5 font-mono text-2xs text-ink-500">
                      {i + 1}
                    </span>
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[s.tone]}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-strong">{s.name}</span>
                      {s.description && (
                        <span className="mt-0.5 block text-xs leading-relaxed text-mute">
                          {s.description}
                        </span>
                      )}
                      {s.requirement !== 'none' && (
                        <span className="mt-1 inline-block rounded border border-line-strong px-1.5 py-0.5 text-2xs text-mute">
                          {REQUIREMENT_LABEL[s.requirement]}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>

              {usesDecomposition(lc) && lc.storyStages.length > 0 && (
                <>
                  <h3 className="mt-4 text-2xs uppercase tracking-[0.14em] text-ink-500">
                    User story stages
                  </h3>
                  <ol className="mt-2">
                    {lc.storyStages.map((s, i) => (
                      <li
                        key={`${s.name}-${i}`}
                        className="flex gap-3 border-b border-line-soft py-2 last:border-0"
                      >
                        <span className="w-5 shrink-0 pt-0.5 font-mono text-2xs text-ink-500">
                          {i + 1}
                        </span>
                        <span
                          className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[s.tone]}`}
                          aria-hidden="true"
                        />
                        <span className="min-w-0">
                          <span className="block text-xs font-medium text-strong">{s.name}</span>
                          {s.description && (
                            <span className="mt-0.5 block text-xs leading-relaxed text-mute">
                              {s.description}
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </section>
          );
        })}
      </div>

      <LifecycleModal open={adding} onClose={() => setAdding(false)} />
      <LifecycleModal open={!!editing} onClose={() => setEditing(null)} lifecycle={editing} />
    </div>
  );
}
