import React, { useState } from 'react';
import { InfoIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { AddGroupModal } from '../components/AddGroupModal';
import { DataTransfer } from '../components/DataTransfer';
import { Modal } from '../components/Modal';
import { Button, PageHeader, TONE_DOT } from '../components/Primitives';
import { useAuth } from '../contexts/AuthContext';
import { useRegistry } from '../contexts/RegistryContext';
import type { CapabilityGroup } from '../types/registry';
import { REQUIREMENT_LABEL, usesEquipment } from '../types/registry';

function ProcessModal({ group, onClose }: { group: CapabilityGroup | null; onClose: () => void }) {
  const { getLifecycle } = useRegistry();
  if (!group) return null;
  const track = getLifecycle(group.track);
  return (
    <Modal
      open={!!group}
      onClose={onClose}
      title={`${group.name} — process`}
      subtitle={`${track.label} · ${track.stages.length} stages`}
    >
      <p className="text-sm leading-relaxed text-soft">{group.process}</p>
      <p className="mt-4 text-xs leading-relaxed text-mute">{track.summary}</p>

      <h3 className="mt-6 text-2xs uppercase tracking-[0.14em] text-ink-500">
        Capability status progression
      </h3>
      <ol className="mt-2">
        {track.stages.map((s, i) => (
          <li key={s.name} className="flex gap-3 border-b border-line-soft py-2.5 last:border-0">
            <span className="w-5 shrink-0 pt-0.5 font-mono text-2xs text-ink-500">{i + 1}</span>
            <span
              className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[s.tone]}`}
              aria-hidden="true"
            />
            <span className="min-w-0">
              <span className="block text-xs font-medium text-strong">{s.name}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-mute">{s.description}</span>
              {s.requirement !== 'none' && (
                <span className="mt-1 inline-block rounded border border-line-strong px-1.5 py-0.5 text-2xs text-mute">
                  {REQUIREMENT_LABEL[s.requirement]}
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      {track.decomposition === 'delivery' && track.storyStages.length > 0 && (
        <>
          <h3 className="mt-6 text-2xs uppercase tracking-[0.14em] text-ink-500">
            User story status progression
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-mute">
            Once the capability is decomposed, execution is tracked on each user story through these
            stages.
          </p>
          <ol className="mt-2">
            {track.storyStages.map((s, i) => (
              <li key={s.name} className="flex gap-3 border-b border-line-soft py-2.5 last:border-0">
                <span className="w-5 shrink-0 pt-0.5 font-mono text-2xs text-ink-500">{i + 1}</span>
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[s.tone]}`}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-strong">{s.name}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-mute">{s.description}</span>
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </Modal>
  );
}

export function GroupsPage() {
  const { groups, capabilities, removeGroup, getLifecycle, getProduct } = useRegistry();
  const { can, capabilityVisible, entityVisible } = useAuth();
  const canManage = can('manage_groups');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CapabilityGroup | null>(null);
  const [process, setProcess] = useState<CapabilityGroup | null>(null);
  const visibleGroups = groups.filter((g) => entityVisible(g.productIds));

  return (
    <div>
      <PageHeader
        title="Capability Groups"
        count={`${visibleGroups.length} groups`}
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            {canManage && <DataTransfer dataset="groups" />}
            {canManage && (
              <Button variant="primary" onClick={() => setAdding(true)}>
                <PlusIcon className="h-3.5 w-3.5" />
                Add group
              </Button>
            )}
          </div>
        }
      />

      <div className="mt-4 space-y-4">
        {visibleGroups.map((g) => {
          const members = capabilities.filter(
            (c) => c.groupId === g.id && capabilityVisible(c)
          ).length;
          const track = getLifecycle(g.track);
          return (
            <article key={g.id} className="border-t border-line pt-4">
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 className="text-base font-semibold text-strong">{g.name}</h2>
                <span className="font-mono text-2xs text-ink-500">{g.code}</span>
                <span className="rounded border border-line-strong px-1.5 py-0.5 text-2xs text-soft">
                  {track.label}
                </span>
                <span className="font-mono text-2xs text-mute">
                  {members} capability{members === 1 ? '' : 'ies'}
                </span>
                {(g.productIds ?? []).map((id) => (
                  <span
                    key={id}
                    className="rounded border border-line-strong px-1.5 py-0.5 font-mono text-2xs text-mute"
                  >
                    {getProduct(id)?.name ?? id}
                  </span>
                ))}
                <span className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setProcess(g)}
                    aria-label={`Process for ${g.name}`}
                    className="rounded p-1 text-mute hover:text-strong"
                  >
                    <InfoIcon className="h-3.5 w-3.5" />
                  </button>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => setEditing(g)}
                        aria-label={`Edit ${g.name}`}
                        className="rounded p-1 text-mute hover:text-brand-bright"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeGroup(g.id)}
                        aria-label={`Delete ${g.name}`}
                        className="rounded p-1 text-mute hover:text-danger"
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </span>
              </div>
              {g.description && (
                <p className="mt-1 max-w-3xl text-sm text-mute">{g.description}</p>
              )}
              {usesEquipment(track) && (
                <p className="mt-1 text-2xs text-aqua">Equipment-style lifecycle</p>
              )}
            </article>
          );
        })}
      </div>

      <AddGroupModal open={adding} onClose={() => setAdding(false)} />
      <AddGroupModal open={!!editing} onClose={() => setEditing(null)} group={editing} />
      <ProcessModal group={process} onClose={() => setProcess(null)} />
    </div>
  );
}
