import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { InfoIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { AddGroupModal } from '../components/AddGroupModal';
import { DataTransfer } from '../components/DataTransfer';
import { Modal } from '../components/Modal';
import { Button, PageHeader, StagePill, TONE_DOT } from '../components/Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { CapabilityGroup } from '../types/registry';
import { REQUIREMENT_LABEL, STORY_STAGES, TRACKS } from '../types/registry';

function ProcessModal({ group, onClose }: { group: CapabilityGroup | null; onClose: () => void }) {
  if (!group) return null;
  const track = TRACKS[group.track];
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

      {group.track === 'delivery' && (
        <>
          <h3 className="mt-6 text-2xs uppercase tracking-[0.14em] text-ink-500">
            User story status progression
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-mute">
            Once the capability is decomposed, execution is tracked on each user story through these
            stages.
          </p>
          <ol className="mt-2">
            {STORY_STAGES.map((s, i) => (
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
  const { groups, capabilities, removeGroup } = useRegistry();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CapabilityGroup | null>(null);
  const [process, setProcess] = useState<CapabilityGroup | null>(null);

  return (
    <div>
      <PageHeader
        title="Capability Groups"
        count={`${groups.length} groups`}
        description="Every capability belongs to exactly one group. The group decides which layer owns delivery, which lifecycle the capability follows, and whether equipment compatibility applies."
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <DataTransfer dataset="groups" />
            <Button variant="primary" onClick={() => setAdding(true)}>
              <PlusIcon className="h-3.5 w-3.5" />
              Add group
            </Button>
          </div>
        }
      />

      <div className="mt-4 space-y-6">
        {groups.map((g) => {
          const members = capabilities.filter((c) => c.groupId === g.id);
          return (
            <section key={g.id}>
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 className="text-base font-semibold text-strong">{g.name}</h2>
                <button
                  type="button"
                  onClick={() => setProcess(g)}
                  aria-label={`Show the ${g.name} process`}
                  title="Show the process for this group"
                  className="rounded p-0.5 text-mute transition-colors duration-150 ease-out hover:text-brand-bright"
                >
                  <InfoIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(g)}
                  aria-label={`Edit ${g.name}`}
                  title="Edit group"
                  className="rounded p-0.5 text-mute transition-colors duration-150 ease-out hover:text-brand-bright"
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => removeGroup(g.id)}
                  aria-label={`Delete ${g.name}`}
                  title="Delete group"
                  className="rounded p-0.5 text-mute transition-colors duration-150 ease-out hover:text-danger"
                >
                  <Trash2Icon className="h-3.5 w-3.5" />
                </button>
                <span className="font-mono text-2xs text-ink-500">{g.id}</span>
                <span className="rounded border border-line-strong px-1.5 py-0.5 text-2xs text-soft">
                  {TRACKS[g.track].label} · {TRACKS[g.track].stages.length} stages
                </span>
                {g.track === 'hardware' && (
                  <span className="rounded border border-aqua/40 px-1.5 py-0.5 text-2xs text-aqua">
                    equipment-bound
                  </span>
                )}
                <span className="ml-auto font-mono text-2xs text-mute">
                  {members.length} capabilities
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-mute">{g.description}</p>

              {members.length > 0 ? (
                <ul className="mt-4 border-t border-line">
                  {members.map((c) => (
                    <li key={c.id} className="border-b border-line-soft">
                      <Link
                        to={`/capabilities/${c.id}`}
                        className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5 transition-colors duration-150 ease-out hover:text-strong"
                      >
                        <span className="w-20 font-mono text-2xs text-ink-500">{c.id}</span>
                        <span className="min-w-0 flex-1 truncate text-sm text-soft">{c.name}</span>
                        <StagePill track={g.track} stage={c.progress} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 border-t border-line pt-4 text-xs text-ink-500">
                  No capabilities registered in this group yet.
                </p>
              )}
            </section>
          );
        })}
      </div>

      <AddGroupModal open={adding} onClose={() => setAdding(false)} />
      <AddGroupModal open={!!editing} onClose={() => setEditing(null)} group={editing} />
      <ProcessModal group={process} onClose={() => setProcess(null)} />
    </div>
  );
}
