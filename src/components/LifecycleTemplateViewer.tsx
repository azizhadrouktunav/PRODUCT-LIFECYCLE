import { Modal } from './Modal';
import { Button, Chip, TONE_DOT } from './Primitives';
import { useAuth } from '../contexts/AuthContext';
import { useRegistry } from '../contexts/RegistryContext';
import type { LifecycleTemplate, WorkItemTypeDef } from '../types/registry';
import { normalizeRuleWhen, workItemTypeDef } from '../types/registry';
import { entityLabel, summarizeWhen } from '../lib/automationCatalog';
import type { Lifecycle } from '../types/registry';

function asDraftLifecycle(t: LifecycleTemplate): Lifecycle {
  return {
    id: t.id,
    label: t.label,
    summary: t.summary,
    decomposition: t.decomposition,
    stages: t.stages,
    storyStages: t.storyStages,
    workItemTypes: t.workItemTypes,
    productIds: t.productIds,
    automationRules: t.automationRules,
  };
}

function TypeTree({
  types,
  parentId,
  depth = 0,
}: {
  types: WorkItemTypeDef[];
  parentId: string | null;
  depth?: number;
}) {
  const children = types.filter((t) => t.parentTypeId === parentId);
  if (children.length === 0) return null;
  return (
    <ul className={depth === 0 ? 'space-y-2' : 'mt-1.5 space-y-1.5 border-l border-line-soft pl-3'}>
      {children.map((t) => (
        <li key={t.id}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-strong">{t.label}</span>
            <span className="font-mono text-2xs text-mute">{t.id}</span>
            <span className="rounded border border-line-strong px-1.5 py-0.5 text-2xs text-mute">
              {t.storage}
            </span>
            {t.statuses.slice(0, 4).map((s) => (
              <span
                key={s}
                className="rounded border border-line-soft px-1.5 py-0.5 text-2xs text-mute"
              >
                {s}
              </span>
            ))}
            {t.stages.length > 0 && (
              <span className="text-2xs text-mute">{t.stages.length} nested stages</span>
            )}
          </div>
          <TypeTree types={types} parentId={t.id} depth={depth + 1} />
        </li>
      ))}
    </ul>
  );
}

export function LifecycleTemplateViewer({
  open,
  onClose,
  template,
  onEdit,
  onApply,
  applyLabel = 'Apply to new lifecycle',
}: {
  open: boolean;
  onClose: () => void;
  template: LifecycleTemplate | null;
  onEdit?: () => void;
  onApply?: () => void;
  applyLabel?: string;
}) {
  const { getProduct } = useRegistry();
  const { can } = useAuth();
  if (!template) return null;

  const draft = asDraftLifecycle(template);
  const canManage = can('manage_lifecycles');

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-2xl"
      title={template.label}
      subtitle={`${template.id}${template.isSystem ? ' · system template' : ' · custom template'}`}
      footer={
        <div className="flex flex-wrap gap-2">
          <Button variant="quiet" onClick={onClose}>
            Close
          </Button>
          {canManage && onEdit && (
            <Button variant="quiet" onClick={onEdit}>
              Edit
            </Button>
          )}
          {onApply && (
            <Button variant="primary" onClick={onApply}>
              {applyLabel}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {template.summary && (
          <p className="text-sm leading-relaxed text-soft">{template.summary}</p>
        )}

        <div>
          <h3 className="text-2xs uppercase tracking-[0.14em] text-ink-500">Product scope</h3>
          <div className="mt-2 flex flex-wrap gap-1">
            {(template.productIds ?? []).length === 0 ? (
              <span className="text-xs text-mute">Company-wide</span>
            ) : (
              (template.productIds ?? []).map((id) => (
                <Chip key={id} tone="brand">
                  {getProduct(id)?.name ?? id}
                </Chip>
              ))
            )}
          </div>
        </div>

        <div>
          <h3 className="text-2xs uppercase tracking-[0.14em] text-ink-500">
            Capability stages
          </h3>
          <ol className="mt-3 space-y-0">
            {template.stages.map((s, i) => {
              const opens = s.opensTypeId
                ? workItemTypeDef(draft, s.opensTypeId)
                : undefined;
              return (
                <li key={`${s.name}-${i}`} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < template.stages.length - 1 && (
                    <span
                      className="absolute left-[7px] top-4 h-[calc(100%-8px)] w-px bg-line-strong"
                      aria-hidden
                    />
                  )}
                  <span
                    className={`relative z-[1] mt-1 h-3.5 w-3.5 shrink-0 rounded-full ring-2 ring-canvas ${TONE_DOT[s.tone]}`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-mono text-2xs text-ink-500">{i + 1}</span>
                      <span className="text-xs font-medium text-strong">{s.name}</span>
                      {(s.contentMode ?? 'inline') === 'table' && (
                        <span className="rounded border border-brand/30 bg-brand/5 px-1.5 py-0.5 text-2xs text-brand-bright">
                          opens {opens?.pluralLabel ?? s.opensTypeId}
                        </span>
                      )}
                    </div>
                    {s.description && (
                      <p className="mt-0.5 text-2xs leading-relaxed text-mute">{s.description}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>

        <div>
          <h3 className="text-2xs uppercase tracking-[0.14em] text-ink-500">
            Work item hierarchy
          </h3>
          <div className="mt-2">
            {(template.workItemTypes ?? []).length === 0 ? (
              <p className="text-xs text-mute">No hierarchy (inline stages only).</p>
            ) : (
              <TypeTree types={template.workItemTypes} parentId={null} />
            )}
          </div>
        </div>

        <div>
          <h3 className="text-2xs uppercase tracking-[0.14em] text-ink-500">
            Status automation
          </h3>
          {(template.automationRules ?? []).length === 0 ? (
            <p className="mt-2 text-xs text-mute">No automation rules.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {template.automationRules.map((r) => (
                <li
                  key={r.id}
                  className="rounded-md border border-line-strong px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`rounded px-1.5 py-0.5 text-2xs ${
                        r.enabled
                          ? 'bg-ok/10 text-ok'
                          : 'bg-ink-700 text-mute'
                      }`}
                    >
                      {r.enabled ? 'On' : 'Off'}
                    </span>
                    <span className="text-strong">
                      Set {entityLabel(r.targetEntity, draft)}.{r.targetField} → {r.setValue}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-2xs leading-relaxed text-mute">
                    When {summarizeWhen(normalizeRuleWhen(r), draft)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
