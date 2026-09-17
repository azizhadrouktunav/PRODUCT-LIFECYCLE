import { useState } from 'react';
import { PencilIcon, PlusIcon, Trash2Icon, UsersIcon } from 'lucide-react';
import { ActorModal } from '../components/ActorModal';
import { DataTransfer } from '../components/DataTransfer';
import { Button, Chip, PageHeader } from '../components/Primitives';
import { useAuth } from '../contexts/AuthContext';
import { useRegistry } from '../contexts/RegistryContext';
import type { Actor } from '../types/registry';

export function ActorsPage() {
  const { actors, products, removeActor } = useRegistry();
  const { can, productVisible } = useAuth();
  const canManage = can('manage_actors');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Actor | null>(null);

  function visibleProductIds(actor: Actor): string[] {
    return (actor.productIds ?? []).filter((id) => productVisible(id));
  }

  // An actor with no products is company-wide, so it stays visible to everyone.
  const sorted = [...actors]
    .filter((a) => (a.productIds ?? []).length === 0 || visibleProductIds(a).length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <PageHeader
        title="Actors"
        count={`${sorted.length} actors`}
        description="Personas used in user stories. Each actor is assigned to one or more products; stories only offer actors that share a product with the capability."
        action={
          canManage ? (
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
          ) : undefined
        }
      />

      {sorted.length === 0 ? (
        <div className="mt-8 border-t border-line pt-12 text-center">
          <UsersIcon className="mx-auto h-8 w-8 text-ink-500" />
          <p className="mt-3 text-sm text-soft">No actors yet.</p>
          <p className="mt-1 text-xs text-mute">
            Add an actor with a name, description and products, then select them in user stories.
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
                <th className="w-64 py-2.5 pr-4 font-medium">Products</th>
                {canManage && <th className="w-24 py-2.5 text-right font-medium">Actions</th>}
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
                      {visibleProductIds(actor).length === 0 ? (
                        <span className="text-2xs text-mute">—</span>
                      ) : (
                        visibleProductIds(actor).map((id) => {
                          const p = products.find((x) => x.id === id);
                          return (
                            <Chip key={id}>
                              <span className="font-mono">{id}</span>
                              {p ? ` · ${p.name}` : ''}
                            </Chip>
                          );
                        })
                      )}
                    </div>
                  </td>
                  {canManage && (
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
                  )}
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
