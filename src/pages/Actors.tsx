import { useState } from 'react';
import { PencilIcon, PlusIcon, Trash2Icon, UsersIcon } from 'lucide-react';
import { ActorModal } from '../components/ActorModal';
import { DataTransfer } from '../components/DataTransfer';
import { Button, Chip, PageHeader } from '../components/Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { Actor } from '../types/registry';

export function ActorsPage() {
  const { actors, categories, removeActor } = useRegistry();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Actor | null>(null);

  const sorted = [...actors].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader
        title="Actors"
        count={`${actors.length} actors`}
        description="Personas used in user stories. Each actor is assigned to one or more domain categories; stories only offer actors that match the categories of the capability’s domains."
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <DataTransfer dataset="actors" />
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null);
                setAdding(true);
              }}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add actor
            </Button>
          </div>
        }
      />

      {sorted.length === 0 ? (
        <div className="mt-8 border-t border-line pt-12 text-center">
          <UsersIcon className="mx-auto h-8 w-8 text-ink-500" />
          <p className="mt-3 text-sm text-soft">No actors yet.</p>
          <p className="mt-1 text-xs text-mute">
            Add an actor with a name, description and domain categories, then select them in user
            stories.
          </p>
        </div>
      ) : (
        <div className="scroll-thin mt-3 overflow-x-auto border-t border-line">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="text-2xs uppercase tracking-[0.14em] text-ink-500">
                <th className="w-28 py-2.5 pr-4 font-medium">ID</th>
                <th className="w-48 py-2.5 pr-4 font-medium">Name</th>
                <th className="py-2.5 pr-4 font-medium">Description</th>
                <th className="w-64 py-2.5 pr-4 font-medium">Categories</th>
                <th className="w-24 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((actor) => (
                <tr key={actor.id} className="border-t border-line-soft align-top">
                  <td className="py-3 pr-4 font-mono text-2xs text-mute">{actor.id}</td>
                  <td className="py-3 pr-4 text-sm font-medium text-strong">{actor.name}</td>
                  <td className="py-3 pr-4">
                    <p className="line-clamp-2 max-w-xl text-xs leading-relaxed text-mute">
                      {actor.description || '—'}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {actor.categoryIds.length === 0 ? (
                        <span className="text-2xs text-mute">—</span>
                      ) : (
                        actor.categoryIds.map((id) => {
                          const c = categories.find((x) => x.id === id);
                          return (
                            <Chip key={id}>
                              <span className="font-mono">{id}</span>
                              {c ? ` · ${c.name}` : ''}
                            </Chip>
                          );
                        })
                      )}
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    <div className="inline-flex items-center gap-0.5">
                      <button
                        type="button"
                        aria-label={`Edit ${actor.name}`}
                        onClick={() => {
                          setEditing(actor);
                          setAdding(true);
                        }}
                        className="rounded p-1.5 text-mute transition-colors duration-150 ease-out hover:bg-ink-700 hover:text-strong"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${actor.name}`}
                        onClick={() => removeActor(actor.id)}
                        className="rounded p-1.5 text-mute transition-colors duration-150 ease-out hover:bg-ink-700 hover:text-danger"
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ActorModal
        open={adding}
        actor={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
