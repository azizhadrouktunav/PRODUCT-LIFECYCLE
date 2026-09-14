import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PackageIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { DataTransfer } from '../components/DataTransfer';
import { ProductModal } from '../components/ProductModal';
import { Button, PageHeader, StatusTag } from '../components/Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { Product } from '../types/registry';

export function ProductsPage() {
  const { products, capabilities, removeProduct } = useRegistry();
  const [activeId, setActiveId] = useState(products[0]?.id ?? '');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const sorted = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  );

  useEffect(() => {
    if (sorted.length === 0) {
      setActiveId('');
      return;
    }
    if (!sorted.some((p) => p.id === activeId)) {
      setActiveId(sorted[0].id);
    }
  }, [sorted, activeId]);

  const active = sorted.find((p) => p.id === activeId) ?? sorted[0];
  const assigned = useMemo(
    () =>
      active
        ? capabilities.filter((c) => (c.productIds ?? []).includes(active.id))
        : [],
    [capabilities, active]
  );

  return (
    <div>
      <PageHeader
        title="Products"
        count={`${products.length} products`}
        description="Products are assigned to capabilities and actors. Select a product to see its capabilities."
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <DataTransfer dataset="products" />
            <Button
              variant="primary"
              onClick={() => {
                setEditing(null);
                setAdding(true);
              }}
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Add product
            </Button>
          </div>
        }
      />

      {sorted.length === 0 ? (
        <div className="mt-8 border-t border-line pt-12 text-center">
          <PackageIcon className="mx-auto h-8 w-8 text-ink-500" />
          <p className="mt-3 text-sm text-soft">No products yet.</p>
          <p className="mt-1 text-xs text-mute">Add a product with a name and description.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="border-t border-line pt-3 lg:border-t-0 lg:border-r lg:border-line lg:pr-4 lg:pt-0">
            <p className="mb-2 text-2xs uppercase tracking-[0.14em] text-ink-500">Products</p>
            <ul className="space-y-0.5">
              {sorted.map((p) => {
                const count = capabilities.filter((c) =>
                  (c.productIds ?? []).includes(p.id)
                ).length;
                const isActive = active?.id === p.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(p.id)}
                      aria-current={isActive}
                      className={`flex w-full items-start justify-between gap-2 rounded-md px-2.5 py-2 text-left transition-colors duration-150 ease-out ${
                        isActive
                          ? 'bg-ink-700 text-strong'
                          : 'text-mute hover:bg-ink-800 hover:text-soft'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{p.name}</span>
                        <span className="block font-mono text-2xs text-ink-500">{p.id}</span>
                      </span>
                      <span className="shrink-0 text-2xs text-ink-500">{count}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>

          {active && (
            <section className="min-w-0 border-t border-line pt-3 lg:border-t-0 lg:pt-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-medium text-strong">{active.name}</h2>
                  <p className="mt-0.5 font-mono text-2xs text-mute">{active.id}</p>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-mute">
                    {active.description || 'No description.'}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    aria-label={`Edit ${active.name}`}
                    onClick={() => {
                      setEditing(active);
                      setAdding(true);
                    }}
                    className="rounded p-1.5 text-mute transition-colors duration-150 ease-out hover:bg-ink-700 hover:text-strong"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete ${active.name}`}
                    onClick={() => removeProduct(active.id)}
                    className="rounded p-1.5 text-mute transition-colors duration-150 ease-out hover:bg-ink-700 hover:text-danger"
                  >
                    <Trash2Icon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-2xs uppercase tracking-[0.14em] text-ink-500">
                  Capabilities · {assigned.length}
                </h3>
                {assigned.length === 0 ? (
                  <p className="mt-3 text-sm text-mute">
                    No capabilities assigned to this product yet.
                  </p>
                ) : (
                  <div className="scroll-thin mt-2 overflow-x-auto">
                    <table className="w-full min-w-[560px] border-collapse text-left">
                      <thead>
                        <tr className="text-2xs uppercase tracking-[0.14em] text-ink-500">
                          <th className="w-28 py-2 pr-4 font-medium">ID</th>
                          <th className="py-2 pr-4 font-medium">Name</th>
                          <th className="w-32 py-2 pr-4 font-medium">Status</th>
                          <th className="w-40 py-2 font-medium">Progress</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assigned.map((c) => (
                          <tr key={c.id} className="border-t border-line-soft">
                            <td className="py-2.5 pr-4 font-mono text-2xs text-mute">
                              <Link
                                to={`/capabilities/${c.id}`}
                                className="hover:text-strong"
                              >
                                {c.id}
                              </Link>
                            </td>
                            <td className="py-2.5 pr-4 text-sm text-strong">
                              <Link
                                to={`/capabilities/${c.id}`}
                                className="hover:text-brand-bright"
                              >
                                {c.name}
                              </Link>
                            </td>
                            <td className="py-2.5 pr-4">
                              <StatusTag status={c.status} />
                            </td>
                            <td className="py-2.5 text-xs text-mute">{c.progress}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      )}

      <ProductModal
        open={adding}
        product={editing}
        onClose={() => {
          setAdding(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
