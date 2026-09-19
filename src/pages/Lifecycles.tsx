import { useState } from 'react';
import { EyeIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { LifecycleModal } from '../components/LifecycleModal';
import {
  LifecycleTemplateModal,
  type TemplateModalMode,
} from '../components/LifecycleTemplateModal';
import { Button, PageHeader, TONE_DOT } from '../components/Primitives';
import { useAuth } from '../contexts/AuthContext';
import { useRegistry } from '../contexts/RegistryContext';
import type { Lifecycle, LifecycleTemplate } from '../types/registry';
import {
  DECOMPOSITION_LABEL,
  REQUIREMENT_LABEL,
  storyStagesOf,
  usesDecomposition,
} from '../types/registry';

export function LifecyclesPage() {
  const {
    lifecycles,
    lifecycleTemplates,
    groups,
    removeLifecycle,
    removeLifecycleTemplate,
    getProduct,
  } = useRegistry();
  const { can, entityVisible } = useAuth();
  const canManage = can('manage_lifecycles');
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Lifecycle | null>(null);

  const [templateMode, setTemplateMode] = useState<TemplateModalMode>('create');
  const [templateOpen, setTemplateOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<LifecycleTemplate | null>(null);
  const [seedTemplateId, setSeedTemplateId] = useState<string | undefined>();

  const visible = lifecycles.filter((lc) => entityVisible(lc.productIds));
  const visibleTemplates = lifecycleTemplates.filter(
    (t) => t.productIds.length === 0 || entityVisible(t.productIds)
  );

  function openTemplate(mode: TemplateModalMode, t: LifecycleTemplate | null = null) {
    setTemplateMode(mode);
    setActiveTemplate(t);
    setTemplateOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Lifecycles"
        count={`${visible.length} lifecycles · ${visibleTemplates.length} templates`}
        action={
          canManage ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="quiet" onClick={() => openTemplate('create')}>
                <PlusIcon className="h-3.5 w-3.5" />
                Add template
              </Button>
              <Button variant="primary" onClick={() => setAdding(true)}>
                <PlusIcon className="h-3.5 w-3.5" />
                Add lifecycle
              </Button>
            </div>
          ) : undefined
        }
      />

      <h2 className="mt-6 text-2xs uppercase tracking-[0.14em] text-ink-500">Templates</h2>
      <p className="mt-1 text-xs text-mute">
        Reusable configurations you can apply when creating or editing a lifecycle.
      </p>
      <div className="mt-3 space-y-3">
        {visibleTemplates.length === 0 ? (
          <p className="rounded-md border border-line-strong px-3 py-3 text-xs text-mute">
            No templates yet.
          </p>
        ) : (
          visibleTemplates.map((t) => (
            <section
              key={t.id}
              className="rounded-md border border-line-strong px-4 py-3"
            >
              <div className="flex flex-wrap items-baseline gap-3">
                <h3 className="text-sm font-semibold text-strong">{t.label}</h3>
                {t.isSystem && (
                  <span className="rounded border border-line-strong px-1.5 py-0.5 text-2xs text-mute">
                    system
                  </span>
                )}
                <span className="font-mono text-2xs text-ink-500">{t.id}</span>
                <span className="rounded border border-line-strong px-1.5 py-0.5 text-2xs text-soft">
                  {t.stages.length} stages
                  {(t.workItemTypes?.length ?? 0) > 0
                    ? ` · ${(t.workItemTypes ?? []).map((w) => w.label).join(' → ')}`
                    : ` · ${DECOMPOSITION_LABEL[t.decomposition]}`}
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openTemplate('view', t)}
                    aria-label={`View ${t.label}`}
                    title="View template"
                    className="rounded p-0.5 text-mute hover:text-brand-bright"
                  >
                    <EyeIcon className="h-3.5 w-3.5" />
                  </button>
                  {canManage && (
                    <>
                      <button
                        type="button"
                        onClick={() => openTemplate('edit', t)}
                        aria-label={`Edit ${t.label}`}
                        title="Edit template"
                        className="rounded p-0.5 text-mute hover:text-brand-bright"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      {!t.isSystem && (
                        <button
                          type="button"
                          onClick={() => removeLifecycleTemplate(t.id)}
                          aria-label={`Delete ${t.label}`}
                          title="Delete template"
                          className="rounded p-0.5 text-mute hover:text-danger"
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
              {t.summary && (
                <p className="mt-1.5 max-w-3xl text-xs leading-relaxed text-mute">{t.summary}</p>
              )}
            </section>
          ))
        )}
      </div>

      <h2 className="mt-8 text-2xs uppercase tracking-[0.14em] text-ink-500">Lifecycles</h2>
      <div className="mt-3 space-y-6">
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
                  {lc.stages.length} stages
                  {(lc.workItemTypes?.length ?? 0) > 0
                    ? ` · ${(lc.workItemTypes ?? []).map((t) => t.label).join(' → ')}`
                    : ` · ${DECOMPOSITION_LABEL[lc.decomposition]}`}
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
                          {REQUIREMENT_LABEL[s.requirement] ??
                            (s.contentMode === 'table' && s.opensTypeId
                              ? `opens ${s.opensTypeId}`
                              : `needs ${s.requirement}`)}
                          {s.contentMode === 'table' && s.opensTypeId
                            ? ` · table: ${s.opensTypeId}`
                            : ''}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ol>

              {(lc.workItemTypes?.length ?? 0) > 0 && (
                <>
                  <h3 className="mt-4 text-2xs uppercase tracking-[0.14em] text-ink-500">
                    Work item types
                  </h3>
                  <ol className="mt-2">
                    {(lc.workItemTypes ?? []).map((t, i) => (
                      <li
                        key={t.id}
                        className="flex gap-3 border-b border-line-soft py-2 last:border-0"
                      >
                        <span className="w-5 shrink-0 pt-0.5 font-mono text-2xs text-ink-500">
                          {i + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-medium text-strong">
                            {t.label}{' '}
                            <span className="font-mono text-2xs text-mute">({t.id})</span>
                          </span>
                          <span className="mt-0.5 block text-2xs text-mute">
                            {t.parentTypeId ? `under ${t.parentTypeId}` : 'root under capability'} ·{' '}
                            {t.storage} · {t.statuses.length} statuses
                            {t.stages.length > 0 ? ` · ${t.stages.length} stages` : ''}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>
                </>
              )}

              {usesDecomposition(lc) && storyStagesOf(lc).length > 0 && (
                <>
                  <h3 className="mt-4 text-2xs uppercase tracking-[0.14em] text-ink-500">
                    User story stages
                  </h3>
                  <ol className="mt-2">
                    {storyStagesOf(lc).map((s, i) => (
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

      <LifecycleModal
        open={adding}
        onClose={() => {
          setAdding(false);
          setSeedTemplateId(undefined);
        }}
        seedTemplateId={seedTemplateId}
      />
      <LifecycleModal open={!!editing} onClose={() => setEditing(null)} lifecycle={editing} />
      <LifecycleTemplateModal
        open={templateOpen}
        onClose={() => {
          setTemplateOpen(false);
          setActiveTemplate(null);
        }}
        mode={templateMode}
        template={activeTemplate}
        onRequestEdit={() => {
          if (!activeTemplate) return;
          setTemplateMode('edit');
        }}
        onApply={(t) => {
          setSeedTemplateId(t.id);
          setAdding(true);
        }}
      />
    </div>
  );
}
