import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  EyeIcon,
  InfoIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import { AddGroupModal } from '../components/AddGroupModal';
import { CapabilityRegister } from '../components/CapabilityRegister';
import { LifecycleModal } from '../components/LifecycleModal';
import {
  LifecycleTemplateModal,
  type TemplateModalMode,
} from '../components/LifecycleTemplateModal';
import { Button, Chip, PageHeader, TONE_DOT } from '../components/Primitives';
import { useAuth } from '../contexts/AuthContext';
import { useCapabilityEditor } from '../contexts/CapabilityEditorContext';
import { useRegistry } from '../contexts/RegistryContext';
import type { CapabilityGroup, Lifecycle, LifecycleTemplate } from '../types/registry';
import { DECOMPOSITION_LABEL } from '../types/registry';
import { ProcessModal } from './Groups';

type Panel = 'lifecycles' | 'groups' | 'capabilities';

function panelFromQuery(raw: string | null): Panel {
  if (raw === 'groups' || raw === 'capabilities' || raw === 'lifecycles') return raw;
  return 'lifecycles';
}

export function StructurePage() {
  const {
    lifecycles,
    lifecycleTemplates,
    groups,
    capabilities,
    removeGroup,
  } = useRegistry();
  const { can, entityVisible, capabilityVisible } = useAuth();
  const { openCreate } = useCapabilityEditor();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedLifecycleId = searchParams.get('lifecycle') ?? '';
  const selectedGroupId = searchParams.get('group') ?? '';
  const panel = panelFromQuery(searchParams.get('panel'));

  const canManageLc = can('manage_lifecycles');
  const canManageGroups = can('manage_groups');

  const [addingLc, setAddingLc] = useState(false);
  const [editingLc, setEditingLc] = useState<Lifecycle | null>(null);
  const [seedTemplateId, setSeedTemplateId] = useState<string | undefined>();

  const [templateMode, setTemplateMode] = useState<TemplateModalMode>('create');
  const [templateOpen, setTemplateOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<LifecycleTemplate | null>(null);

  const [addingGroup, setAddingGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CapabilityGroup | null>(null);
  const [processGroup, setProcessGroup] = useState<CapabilityGroup | null>(null);

  const visibleLifecycles = useMemo(
    () => lifecycles.filter((lc) => entityVisible(lc.productIds)),
    [lifecycles, entityVisible]
  );
  const visibleTemplates = useMemo(
    () =>
      lifecycleTemplates.filter(
        (t) => t.productIds.length === 0 || entityVisible(t.productIds)
      ),
    [lifecycleTemplates, entityVisible]
  );

  const selectedLifecycle =
    visibleLifecycles.find((l) => l.id === selectedLifecycleId) ?? null;

  const lifecycleGroups = useMemo(() => {
    if (!selectedLifecycle) return [];
    return groups.filter(
      (g) => g.track === selectedLifecycle.id && entityVisible(g.productIds)
    );
  }, [groups, selectedLifecycle, entityVisible]);

  const selectedGroup =
    lifecycleGroups.find((g) => g.id === selectedGroupId) ?? null;

  const capCountForLifecycle = (lcId: string) =>
    capabilities.filter((c) => {
      if (!capabilityVisible(c)) return false;
      return groups.find((g) => g.id === c.groupId)?.track === lcId;
    }).length;

  const capCountForGroup = (gId: string) =>
    capabilities.filter((c) => c.groupId === gId && capabilityVisible(c)).length;

  function patchParams(patch: Record<string, string | null>) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [k, v] of Object.entries(patch)) {
          if (v === null || v === '') next.delete(k);
          else next.set(k, v);
        }
        return next;
      },
      { replace: true }
    );
  }

  function selectLifecycle(id: string) {
    patchParams({
      lifecycle: id,
      group: null,
      panel: 'groups',
    });
  }

  function selectGroup(id: string) {
    patchParams({
      group: id,
      panel: 'capabilities',
    });
  }

  // Drop stale group when lifecycle changes or group leaves the list.
  useEffect(() => {
    if (!selectedGroupId) return;
    if (!selectedLifecycleId) {
      patchParams({ group: null });
      return;
    }
    const ok = groups.some(
      (g) => g.id === selectedGroupId && g.track === selectedLifecycleId
    );
    if (!ok) patchParams({ group: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only sync URL when ids drift
  }, [selectedLifecycleId, selectedGroupId, groups]);

  function openTemplate(mode: TemplateModalMode, t: LifecycleTemplate | null = null) {
    setTemplateMode(mode);
    setActiveTemplate(t);
    setTemplateOpen(true);
  }

  const mobileTabs: { id: Panel; label: string }[] = [
    { id: 'lifecycles', label: 'Lifecycles' },
    { id: 'groups', label: 'Groups' },
    { id: 'capabilities', label: 'Capabilities' },
  ];

  const lifecycleRail = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line-soft px-3 py-2.5">
        <h2 className="text-2xs uppercase tracking-[0.14em] text-ink-500">Lifecycles</h2>
        {canManageLc && (
          <button
            type="button"
            onClick={() => {
              setSeedTemplateId(undefined);
              setAddingLc(true);
            }}
            className="rounded p-0.5 text-mute hover:text-brand-bright"
            aria-label="Add lifecycle"
            title="Add lifecycle"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto p-2">
        {visibleLifecycles.length === 0 ? (
          <p className="px-2 py-4 text-xs text-mute">No lifecycles yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {visibleLifecycles.map((lc) => {
              const active = lc.id === selectedLifecycleId;
              const gCount = groups.filter((g) => g.track === lc.id).length;
              const cCount = capCountForLifecycle(lc.id);
              return (
                <li key={lc.id}>
                  <button
                    type="button"
                    onClick={() => selectLifecycle(lc.id)}
                    className={`w-full rounded-md px-2.5 py-2 text-left transition-colors duration-150 ease-out ${
                      active
                        ? 'bg-ink-700 text-strong'
                        : 'text-soft hover:bg-ink-800 hover:text-strong'
                    }`}
                  >
                    <span className="block text-xs font-medium">{lc.label}</span>
                    <span className="mt-0.5 block font-mono text-2xs text-mute">
                      {gCount} groups · {cCount} caps
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 border-t border-line-soft pt-3">
          <div className="mb-1.5 flex items-center justify-between px-2">
            <h3 className="text-2xs uppercase tracking-[0.14em] text-ink-500">Templates</h3>
            {canManageLc && (
              <button
                type="button"
                onClick={() => openTemplate('create')}
                className="rounded p-0.5 text-mute hover:text-brand-bright"
                aria-label="Add template"
                title="Add template"
              >
                <PlusIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {visibleTemplates.length === 0 ? (
            <p className="px-2 py-2 text-2xs text-mute">No templates.</p>
          ) : (
            <ul className="space-y-0.5">
              {visibleTemplates.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start gap-1 rounded-md px-2 py-1.5 hover:bg-ink-800"
                >
                  <button
                    type="button"
                    onClick={() => openTemplate('view', t)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block text-xs text-soft">{t.label}</span>
                    <span className="font-mono text-2xs text-mute">
                      {t.stages.length} stages
                      {t.isSystem ? ' · system' : ''}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openTemplate('view', t)}
                    className="shrink-0 rounded p-0.5 text-mute hover:text-brand-bright"
                    aria-label={`View ${t.label}`}
                  >
                    <EyeIcon className="h-3 w-3" />
                  </button>
                  {canManageLc && (
                    <button
                      type="button"
                      onClick={() => openTemplate('edit', t)}
                      className="shrink-0 rounded p-0.5 text-mute hover:text-brand-bright"
                      aria-label={`Edit ${t.label}`}
                    >
                      <PencilIcon className="h-3 w-3" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  const groupsRail = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line-soft px-3 py-2.5">
        <h2 className="text-2xs uppercase tracking-[0.14em] text-ink-500">Groups</h2>
        {canManageGroups && selectedLifecycle && (
          <button
            type="button"
            onClick={() => setAddingGroup(true)}
            className="rounded p-0.5 text-mute hover:text-brand-bright"
            aria-label="Add group"
            title="Add group"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="scroll-thin flex-1 overflow-y-auto p-2">
        {!selectedLifecycle ? (
          <p className="px-2 py-6 text-center text-xs text-mute">
            Select a lifecycle to see its groups.
          </p>
        ) : lifecycleGroups.length === 0 ? (
          <div className="px-2 py-6 text-center">
            <p className="text-xs text-mute">No groups on this lifecycle yet.</p>
            {canManageGroups && (
              <Button
                variant="primary"
                className="mt-3"
                onClick={() => setAddingGroup(true)}
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add group
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-0.5">
            {lifecycleGroups.map((g) => {
              const active = g.id === selectedGroupId;
              return (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => selectGroup(g.id)}
                    className={`w-full rounded-md px-2.5 py-2 text-left transition-colors duration-150 ease-out ${
                      active
                        ? 'bg-ink-700 text-strong'
                        : 'text-soft hover:bg-ink-800 hover:text-strong'
                    }`}
                  >
                    <span className="block text-xs font-medium">{g.name}</span>
                    <span className="mt-0.5 block font-mono text-2xs text-mute">
                      {g.code} · {capCountForGroup(g.id)} caps
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );

  const capabilitiesPanel = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-line-soft px-4 py-3">
        {!selectedLifecycle ? (
          <p className="text-sm text-mute">
            All capabilities — pick a lifecycle and group to narrow the register.
          </p>
        ) : !selectedGroup ? (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="brand">{selectedLifecycle.label}</Chip>
              <span className="text-xs text-mute">
                {lifecycleGroups.length} groups · {capCountForLifecycle(selectedLifecycle.id)}{' '}
                capabilities
              </span>
              {canManageLc && (
                <button
                  type="button"
                  onClick={() => setEditingLc(selectedLifecycle)}
                  className="ml-auto rounded p-0.5 text-mute hover:text-brand-bright"
                  aria-label="Edit lifecycle"
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-mute">
              {selectedLifecycle.summary ||
                'Select a group to open its capability register.'}
            </p>
            {lifecycleGroups.length === 0 && canManageGroups && (
              <Button
                variant="primary"
                className="mt-3"
                onClick={() => setAddingGroup(true)}
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add group
              </Button>
            )}
            {selectedLifecycle.stages.length > 0 && (
              <ol className="mt-4 space-y-1">
                {selectedLifecycle.stages.slice(0, 6).map((s, i) => (
                  <li key={`${s.name}-${i}`} className="flex items-center gap-2 text-xs text-soft">
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[s.tone]}`}
                      aria-hidden
                    />
                    {s.name}
                  </li>
                ))}
                {selectedLifecycle.stages.length > 6 && (
                  <li className="text-2xs text-mute">
                    +{selectedLifecycle.stages.length - 6} more stages
                  </li>
                )}
              </ol>
            )}
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone="brand">{selectedLifecycle.label}</Chip>
              <span className="text-mute">/</span>
              <Chip tone="aqua">{selectedGroup.name}</Chip>
              <span className="font-mono text-2xs text-mute">{selectedGroup.code}</span>
              <div className="ml-auto flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setProcessGroup(selectedGroup)}
                  className="rounded p-0.5 text-mute hover:text-brand-bright"
                  aria-label="View process"
                  title="Process"
                >
                  <InfoIcon className="h-3.5 w-3.5" />
                </button>
                {canManageGroups && (
                  <>
                    <button
                      type="button"
                      onClick={() => setEditingGroup(selectedGroup)}
                      className="rounded p-0.5 text-mute hover:text-brand-bright"
                      aria-label="Edit group"
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete group “${selectedGroup.name}”? Capabilities must be moved first.`
                          )
                        ) {
                          removeGroup(selectedGroup.id);
                          patchParams({ group: null });
                        }
                      }}
                      className="rounded p-0.5 text-mute hover:text-danger"
                      aria-label="Delete group"
                    >
                      <Trash2Icon className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
            {selectedGroup.description && (
              <p className="mt-1.5 text-xs text-mute">{selectedGroup.description}</p>
            )}
          </div>
        )}
      </div>

      <div className="scroll-thin flex-1 overflow-auto px-4 pb-4 pt-2">
        {selectedGroup ? (
          <CapabilityRegister
            groupId={selectedGroup.id}
            hideHeader
            hideGroupFilter
            compact
            onAddCapability={() => openCreate({ groupId: selectedGroup.id })}
          />
        ) : selectedLifecycle ? (
          <CapabilityRegister
            lifecycleId={selectedLifecycle.id}
            hideHeader
            hideGroupFilter={false}
            compact
          />
        ) : (
          <CapabilityRegister hideHeader compact />
        )}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-[calc(100vh-2rem)] flex-col">
      <PageHeader
        title="Structure"
        count={`${visibleLifecycles.length} lifecycles · ${groups.filter((g) => entityVisible(g.productIds)).length} groups`}
        action={
          canManageLc ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="quiet" onClick={() => openTemplate('create')}>
                <PlusIcon className="h-3.5 w-3.5" />
                Add template
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setSeedTemplateId(undefined);
                  setAddingLc(true);
                }}
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add lifecycle
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Mobile segmented control */}
      <div className="mt-3 flex gap-1 rounded-md border border-line-strong p-1 lg:hidden">
        {mobileTabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => patchParams({ panel: t.id })}
            className={`flex-1 rounded px-2 py-1.5 text-xs transition-colors duration-150 ease-out ${
              panel === t.id
                ? 'bg-ink-700 text-strong'
                : 'text-mute hover:text-strong'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Desktop three-panel */}
      <div className="mt-3 hidden min-h-0 flex-1 overflow-hidden rounded-md border border-line-strong lg:grid lg:grid-cols-[minmax(220px,280px)_minmax(220px,280px)_minmax(0,1fr)]">
        <div className="min-h-[520px] border-r border-line-soft">{lifecycleRail}</div>
        <div className="min-h-[520px] border-r border-line-soft">{groupsRail}</div>
        <div className="min-h-[520px]">{capabilitiesPanel}</div>
      </div>

      {/* Mobile panel body */}
      <div className="mt-3 min-h-[420px] flex-1 overflow-hidden rounded-md border border-line-strong lg:hidden">
        {panel === 'lifecycles' && lifecycleRail}
        {panel === 'groups' && groupsRail}
        {panel === 'capabilities' && capabilitiesPanel}
      </div>

      {selectedLifecycle && (
        <p className="mt-2 text-2xs text-mute lg:hidden">
          Track: {selectedLifecycle.label}
          {selectedGroup ? ` · ${selectedGroup.name}` : ''}
          {(selectedLifecycle.workItemTypes?.length ?? 0) > 0
            ? ` · ${DECOMPOSITION_LABEL[selectedLifecycle.decomposition]}`
            : ''}
        </p>
      )}

      <LifecycleModal
        open={addingLc}
        onClose={() => {
          setAddingLc(false);
          setSeedTemplateId(undefined);
        }}
        seedTemplateId={seedTemplateId}
      />
      <LifecycleModal
        open={!!editingLc}
        onClose={() => setEditingLc(null)}
        lifecycle={editingLc}
      />
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
          setAddingLc(true);
        }}
      />
      <AddGroupModal
        open={addingGroup}
        onClose={() => setAddingGroup(false)}
        initialTrack={selectedLifecycle?.id}
      />
      <AddGroupModal
        open={!!editingGroup}
        onClose={() => setEditingGroup(null)}
        group={editingGroup}
      />
      <ProcessModal group={processGroup} onClose={() => setProcessGroup(null)} />
    </div>
  );
}
