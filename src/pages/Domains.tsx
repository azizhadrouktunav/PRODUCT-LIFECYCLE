import React, { useEffect, useState } from 'react';
import { PlusIcon } from 'lucide-react';
import { AddDomainModal } from '../components/AddDomainModal';
import { DataTransfer } from '../components/DataTransfer';
import { Button, PageHeader } from '../components/Primitives';
import { useRegistry } from '../contexts/RegistryContext';

export function DomainsPage() {
  const { categories, domains, capabilities } = useRegistry();
  const [activeId, setActiveId] = useState(categories[0]?.id ?? '');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (categories.length === 0) {
      setActiveId('');
      return;
    }
    if (!categories.some((c) => c.id === activeId)) {
      setActiveId(categories[0].id);
    }
  }, [categories, activeId]);

  const active = categories.find((c) => c.id === activeId) ?? categories[0];
  const list = active ? domains.filter((d) => d.categoryId === active.id) : [];

  return (
    <div>
      <PageHeader
        title="Domains"
        count={`${domains.length} across ${categories.length} categories`}
        description="Domains are the fixed coordinate system of the register. Every capability is mapped to one or more of them, which is how ownership and impact are traced."
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <DataTransfer dataset="domains" />
            <Button variant="primary" onClick={() => setAdding(true)}>
              <PlusIcon className="h-3.5 w-3.5" />
              Add domain
            </Button>
          </div>
        }
      />

      {categories.length === 0 || !active ? (
        <p className="mt-8 border-t border-line pt-8 text-sm text-mute">
          No domain categories yet. Use <span className="text-soft">Add domain</span> to create a
          category and the first domain, or import a Domains sheet after categories exist.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-1 border-b border-line">
            {categories.map((c) => {
              const isActive = c.id === active.id;
              const count = domains.filter((d) => d.categoryId === c.id).length;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  aria-current={isActive}
                  className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors duration-150 ease-out ${
                    isActive
                      ? 'border-brand text-strong'
                      : 'border-transparent text-mute hover:text-soft'
                  }`}
                >
                  {c.name}
                  <span className="ml-2 font-mono text-2xs text-ink-500">{count}</span>
                </button>
              );
            })}
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-relaxed text-mute">{active.description}</p>

          {list.length === 0 ? (
            <p className="mt-6 text-sm text-mute">
              No domains in this category yet. Use{' '}
              <span className="text-soft">Add domain</span> to create one.
            </p>
          ) : (
            <div className="mt-4 grid gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
              {list.map((d) => {
                const count = capabilities.filter((c) => c.domainIds.includes(d.id)).length;
                return (
                  <article key={d.id} className="flex flex-col border-t border-line pt-3">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-2xs text-brand-bright">{d.id}</span>
                      <h3 className="min-w-0 flex-1 text-sm font-medium text-strong">{d.name}</h3>
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-mute">{d.description}</p>
                    <p className="mt-auto pt-3 font-mono text-2xs text-ink-500">
                      {count} {count === 1 ? 'capability' : 'capabilities'}
                    </p>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      <AddDomainModal
        open={adding}
        onClose={() => setAdding(false)}
        defaultCategoryId={active?.id ?? ''}
        onCreated={(categoryId) => setActiveId(categoryId)}
      />
    </div>
  );
}
