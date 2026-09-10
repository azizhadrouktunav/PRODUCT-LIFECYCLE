import React, { useEffect, useState } from 'react';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { AddCategoryModal } from '../components/AddCategoryModal';
import { AddDomainModal } from '../components/AddDomainModal';
import { DataTransfer } from '../components/DataTransfer';
import { Button, PageHeader } from '../components/Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { Domain, DomainCategory } from '../types/registry';

export function DomainsPage() {
  const { categories, domains, capabilities, removeDomain, removeCategory } = useRegistry();
  const [activeId, setActiveId] = useState(categories[0]?.id ?? '');
  const [addingDomain, setAddingDomain] = useState(false);
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DomainCategory | null>(null);

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

  function handleDeleteCategory() {
    if (!active) return;
    const ok = removeCategory(active.id);
    if (ok) setActiveId('');
  }

  return (
    <div>
      <PageHeader
        title="Domains"
        count={`${domains.length} across ${categories.length} categories`}
        description="Domains are the fixed coordinate system of the register. Every capability is mapped to one or more of them, which is how ownership and impact are traced."
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <DataTransfer dataset="domains" />
            <Button variant="quiet" onClick={() => setAddingCategory(true)}>
              <PlusIcon className="h-3.5 w-3.5" />
              Add category
            </Button>
            <Button variant="primary" onClick={() => setAddingDomain(true)}>
              <PlusIcon className="h-3.5 w-3.5" />
              Add domain
            </Button>
          </div>
        }
      />

      {categories.length === 0 || !active ? (
        <p className="mt-8 border-t border-line pt-8 text-sm text-mute">
          No domain categories yet. Use <span className="text-soft">Add category</span> first, then
          add domains under it.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-1 border-b border-line">
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
            <div className="ml-auto flex items-center gap-1 pb-2">
              <button
                type="button"
                onClick={() => setEditingCategory(active)}
                aria-label={`Edit ${active.name}`}
                title="Edit category"
                className="rounded p-1 text-mute transition-colors duration-150 ease-out hover:text-brand-bright"
              >
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleDeleteCategory}
                aria-label={`Delete ${active.name}`}
                title="Delete category"
                className="rounded p-1 text-mute transition-colors duration-150 ease-out hover:text-danger"
              >
                <Trash2Icon className="h-3.5 w-3.5" />
              </button>
            </div>
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
                      <button
                        type="button"
                        onClick={() => setEditingDomain(d)}
                        aria-label={`Edit ${d.name}`}
                        title="Edit domain"
                        className="rounded p-0.5 text-mute transition-colors duration-150 ease-out hover:text-brand-bright"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeDomain(d.id)}
                        aria-label={`Delete ${d.name}`}
                        title="Delete domain"
                        className="rounded p-0.5 text-mute transition-colors duration-150 ease-out hover:text-danger"
                      >
                        <Trash2Icon className="h-3.5 w-3.5" />
                      </button>
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

      <AddCategoryModal
        open={addingCategory}
        onClose={() => setAddingCategory(false)}
        onCreated={(categoryId) => setActiveId(categoryId)}
      />
      <AddCategoryModal
        open={!!editingCategory}
        onClose={() => setEditingCategory(null)}
        category={editingCategory}
      />
      <AddDomainModal
        open={addingDomain}
        onClose={() => setAddingDomain(false)}
        defaultCategoryId={active?.id ?? ''}
        onCreated={(categoryId) => setActiveId(categoryId)}
      />
      <AddDomainModal
        open={!!editingDomain}
        onClose={() => setEditingDomain(null)}
        domain={editingDomain}
        onCreated={(categoryId) => setActiveId(categoryId)}
      />
    </div>
  );
}
