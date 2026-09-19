import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  EyeIcon,
  GitBranchIcon,
  InfoIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import { AddGroupModal } from '../components/AddGroupModal';
import { CapabilityRegister } from '../components/CapabilityRegister';
import { LifecycleModal } from '../components/LifecycleModal';
import {
  LifecycleTemplateModal,
  type TemplateModalMode,
} from '../components/LifecycleTemplateModal';
import { Modal } from '../components/Modal';
import { Button, PageHeader } from '../components/Primitives';
import { useAuth } from '../contexts/AuthContext';
import { useCapabilityEditor } from '../contexts/CapabilityEditorContext';
import { useRegistry } from '../contexts/RegistryContext';
import type { CapabilityGroup, Lifecycle, LifecycleTemplate } from '../types/registry';
import { DECOMPOSITION_LABEL } from '../types/registry';
import { ProcessModal } from './Groups';

const selectClass =
  'rounded-md border border-line-strong bg-ink-800 px-2.5 py-1.5 text-xs text-soft transition-colors duration-150 ease-out focus:border-brand focus:outline-none';

export function StructurePage() {
  const {
    lifecycles,
    lifecycleTemplates,
    groups,
    capabilities,
    removeLifecycle,
    removeLifecycleTemplate,
    removeGroup,
    getLifecycle,
  } = useRegistry();
  const { can, entityVisible, capabilityVisible } = useAuth();
  const { openCreate } = useCapabilityEditor();
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedLifecycleId = searchParams.get('lifecycle') ?? '';
  const selectedGroupId = searchParams.get('group') ?? '';
  const manageParam = searchParams.get('manage');

  const canManageLc = can('manage_lifecycles');
  const canManageGroups = can('manage_groups');
  const canAddCap = can('add_capability');

  const [addingLc, setAddingLc] = useState(false);
  const [editingLc, setEditingLc] = useState<Lifecycle | null>(null);
  const [seedTemplateId, setSeedTemplateId] = useState<string | undefined>();
  const [manageLcOpen, setManageLcOpen] = useState(false);

  const [templateMode, setTemplateMode] = useState<TemplateModalMode>('create');
  const [templateOpen, setTemplateOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<LifecycleTemplate | null>(null);

  const [addingGroup, setAddingGroup] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CapabilityGroup | null>(null);
  const [processGroup, setProcessGroup] = useState<CapabilityGroup | null>(null);
  const [manageGroupsOpen, setManageGroupsOpen] = useState(false);

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
  const visibleGroups = useMemo(
    () => groups.filter((g) => entityVisible(g.productIds)),
    [groups, entityVisible]
  );

  const selectedLifecycle =
    visibleLifecycles.find((l) => l.id === selectedLifecycleId) ?? null;

  const groupOptions = useMemo(() => {
    if (!selectedLifecycleId) return visibleGroups;
    return visibleGroups.filter((g) => g.track === selectedLifecycleId);
  }, [visibleGroups, selectedLifecycleId]);

  const selectedGroup =
    visibleGroups.find((g) => g.id === selectedGroupId) ?? null;

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

  // Deep-link manage=lifecycles|groups|templates
  useEffect(() => {
    if (manageParam === 'lifecycles') {
      setManageLcOpen(true);
      patchParams({ manage: null });
    } else if (manageParam === 'groups') {
      setManageGroupsOpen(true);
      patchParams({ manage: null });
    } else if (manageParam === 'templates') {
      setTemplateMode('create');
      setActiveTemplate(null);
      setTemplateOpen(true);
      patchParams({ manage: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manageParam]);

  // Drop stale group when it no longer matches the lifecycle filter.
  useEffect(() => {
    if (!selectedGroupId) return;
    const g = groups.find((x) => x.id === selectedGroupId);
    if (!g || !entityVisible(g.productIds)) {
      patchParams({ group: null });
      return;
    }
    if (selectedLifecycleId && g.track !== selectedLifecycleId) {
      patchParams({ group: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLifecycleId, selectedGroupId, groups]);

  function openTemplate(mode: TemplateModalMode, t: LifecycleTemplate | null = null) {
    setTemplateMode(mode);
    setActiveTemplate(t);
    setTemplateOpen(true);
  }

  function onLifecycleChange(id: string) {
    patchParams({
      lifecycle: id || null,
      group: null,
    });
  }

  function onGroupChange(id: string) {
    if (!id) {
      patchParams({ group: null });
      return;
    }
    const g = groups.find((x) => x.id === id);
    patchParams({
      group: id,
      lifecycle: g && !selectedLifecycleId ? g.track : selectedLifecycleId || null,
    });
  }

  const filtersActive = !!selectedLifecycleId || !!selectedGroupId;

  return (
    <div>
      <PageHeader
        title="Structure"
        count={`${visibleLifecycles.length} lifecycles · ${visibleGroups.length} groups`}
        action={
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setManageLcOpen(true)}
              title="Manage lifecycles"
              aria-label="Manage lifecycles"
              className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1.5 text-xs text-mute transition-colors duration-150 ease-out hover:border-brand hover:text-strong"
            >
              <GitBranchIcon className="h-3.5 w-3.5" />
              Lifecycles
            </button>
            <button
              type="button"
              onClick={() => setManageGroupsOpen(true)}
              title="Manage groups"
              aria-label="Manage groups"
              className="inline-flex items-center gap-1.5 rounded-md border border-line-strong px-2.5 py-1.5 text-xs text-mute transition-colors duration-150 ease-out hover:border-brand hover:text-strong"
            >
              <LayersIcon className="h-3.5 w-3.5" />
              Groups
            </button>
            {canManageGroups && (
              <Button variant="quiet" onClick={() => setAddingGroup(true)}>
                <PlusIcon className="h-3.5 w-3.5" />
                Add group
              </Button>
            )}
            {canAddCap && (
              <Button
                variant="primary"
                onClick={() =>
                  openCreate(selectedGroupId ? { groupId: selectedGroupId } : undefined)
                }
              >
                <PlusIcon className="h-3.5 w-3.5" />
                Add capability
              </Button>
            )}
          </div>
        }
      />

      <div className="mt-3 flex flex-wrap items-end gap-3 rounded-md border border-line-strong bg-ink-950/40 px-3 py-3">
        <label className="flex min-w-[180px] flex-1 flex-col gap-1 sm:max-w-xs">
          <span className="text-2xs uppercase tracking-[0.14em] text-ink-500">Lifecycle</span>
          <select
            className={selectClass}
            value={selectedLifecycleId}
            onChange={(e) => onLifecycleChange(e.target.value)}
            aria-label="Filter by lifecycle"
          >
            <option value="">All lifecycles</option>
            {visibleLifecycles.map((lc) => {
              const gCount = groups.filter((g) => g.track === lc.id).length;
              const cCount = capCountForLifecycle(lc.id);
              return (
                <option key={lc.id} value={lc.id}>
                  {lc.label} ({gCount} groups · {cCount} caps)
                </option>
              );
            })}
          </select>
        </label>

        <label className="flex min-w-[180px] flex-1 flex-col gap-1 sm:max-w-xs">
          <span className="text-2xs uppercase tracking-[0.14em] text-ink-500">Group</span>
          <div className="flex items-center gap-1.5">
            <select
              className={`${selectClass} min-w-0 flex-1`}
              value={selectedGroupId}
              onChange={(e) => onGroupChange(e.target.value)}
              aria-label="Filter by capability group"
            >
              <option value="">All groups</option>
              {groupOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.code} · {capCountForGroup(g.id)})
                </option>
              ))}
            </select>
            {selectedGroup && (
              <button
                type="button"
                onClick={() => setProcessGroup(selectedGroup)}
                className="shrink-0 rounded p-1.5 text-mute hover:text-brand-bright"
                title="View process"
                aria-label="View group process"
              >
                <InfoIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {selectedLifecycleId && groupOptions.length === 0 && (
            <span className="text-2xs text-mute">
              No groups on this lifecycle.
              {canManageGroups && (
                <>
                  {' '}
                  <button
                    type="button"
                    className="text-brand-bright hover:text-strong"
                    onClick={() => setAddingGroup(true)}
                  >
                    Add one
                  </button>
                </>
              )}
            </span>
          )}
        </label>

        {filtersActive && (
          <button
            type="button"
            onClick={() => patchParams({ lifecycle: null, group: null })}
            className="mb-0.5 inline-flex items-center gap-1 px-1 text-xs text-mute transition-colors duration-150 ease-out hover:text-strong"
          >
            <XIcon className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>

      <div className="mt-4">
        <CapabilityRegister
          groupId={selectedGroupId || null}
          lifecycleId={!selectedGroupId && selectedLifecycleId ? selectedLifecycleId : null}
          hideHeader
          hideGroupFilter
          onAddCapability={() =>
            openCreate(selectedGroupId ? { groupId: selectedGroupId } : undefined)
          }
        />
      </div>

      {/* Manage lifecycles overlay */}
      <Modal
        open={manageLcOpen}
        onClose={() => setManageLcOpen(false)}
        width="max-w-2xl"
        title="Lifecycles & templates"
        subtitle="Configure tracks used by capability groups"
        footer={
          <div className="flex flex-wrap gap-2">
            <Button variant="quiet" onClick={() => setManageLcOpen(false)}>
              Close
            </Button>
            {canManageLc && (
              <>
                <Button
                  variant="quiet"
                  onClick={() => {
                    openTemplate('create');
                  }}
                >
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
              </>
            )}
          </div>
        }
      >
        <div className="space-y-5">
          <div>
            <h3 className="text-2xs uppercase tracking-[0.14em] text-ink-500">Templates</h3>
            <ul className="mt-2 space-y-1.5">
              {visibleTemplates.length === 0 ? (
                <li className="text-xs text-mute">No templates yet.</li>
              ) : (
                visibleTemplates.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center gap-2 rounded-md border border-line-soft px-3 py-2"
                  >
                    <span className="text-xs font-medium text-strong">{t.label}</span>
                    {t.isSystem && (
                      <span className="rounded border border-line-strong px-1.5 py-0.5 text-2xs text-mute">
                        system
                      </span>
                    )}
                    <span className="font-mono text-2xs text-mute">
                      {t.stages.length} stages
                    </span>
                    <span className="ml-auto flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => openTemplate('view', t)}
                        className="rounded p-0.5 text-mute hover:text-brand-bright"
                        aria-label={`View ${t.label}`}
                      >
                        <EyeIcon className="h-3.5 w-3.5" />
                      </button>
                      {canManageLc && (
                        <>
                          <button
                            type="button"
                            onClick={() => openTemplate('edit', t)}
                            className="rounded p-0.5 text-mute hover:text-brand-bright"
                            aria-label={`Edit ${t.label}`}
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </button>
                          {!t.isSystem && (
                            <button
                              type="button"
                              onClick={() => removeLifecycleTemplate(t.id)}
                              className="rounded p-0.5 text-mute hover:text-danger"
                              aria-label={`Delete ${t.label}`}
                            >
                              <Trash2Icon className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </>
                      )}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div>
            <h3 className="text-2xs uppercase tracking-[0.14em] text-ink-500">Lifecycles</h3>
            <ul className="mt-2 space-y-1.5">
              {visibleLifecycles.length === 0 ? (
                <li className="text-xs text-mute">No lifecycles yet.</li>
              ) : (
                visibleLifecycles.map((lc) => {
                  const gCount = groups.filter((g) => g.track === lc.id).length;
                  return (
                    <li
                      key={lc.id}
                      className="flex flex-wrap items-center gap-2 rounded-md border border-line-soft px-3 py-2"
                    >
                      <button
                        type="button"
                        className="text-left text-xs font-medium text-strong hover:text-brand-bright"
                        onClick={() => {
                          onLifecycleChange(lc.id);
                          setManageLcOpen(false);
                        }}
                        title="Filter table by this lifecycle"
                      >
                        {lc.label}
                      </button>
                      <span className="font-mono text-2xs text-mute">
                        {gCount} groups · {lc.stages.length} stages
                        {(lc.workItemTypes?.length ?? 0) > 0
                          ? ` · ${(lc.workItemTypes ?? []).map((w) => w.label).join(' → ')}`
                          : ` · ${DECOMPOSITION_LABEL[lc.decomposition]}`}
                      </span>
                      {canManageLc && (
                        <span className="ml-auto flex items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => setEditingLc(lc)}
                            className="rounded p-0.5 text-mute hover:text-brand-bright"
                            aria-label={`Edit ${lc.label}`}
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeLifecycle(lc.id)}
                            className="rounded p-0.5 text-mute hover:text-danger"
                            aria-label={`Delete ${lc.label}`}
                          >
                            <Trash2Icon className="h-3.5 w-3.5" />
                          </button>
                        </span>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </div>
      </Modal>

      {/* Manage groups overlay */}
      <Modal
        open={manageGroupsOpen}
        onClose={() => setManageGroupsOpen(false)}
        width="max-w-2xl"
        title="Capability groups"
        subtitle="Groups classify capabilities and pick a lifecycle"
        footer={
          <div className="flex flex-wrap gap-2">
            <Button variant="quiet" onClick={() => setManageGroupsOpen(false)}>
              Close
            </Button>
            {canManageGroups && (
              <Button variant="primary" onClick={() => setAddingGroup(true)}>
                <PlusIcon className="h-3.5 w-3.5" />
                Add group
              </Button>
            )}
          </div>
        }
      >
        <ul className="space-y-1.5">
          {visibleGroups.length === 0 ? (
            <li className="text-xs text-mute">No groups yet.</li>
          ) : (
            visibleGroups.map((g) => {
              const track = getLifecycle(g.track);
              return (
                <li
                  key={g.id}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-line-soft px-3 py-2"
                >
                  <button
                    type="button"
                    className="text-left text-xs font-medium text-strong hover:text-brand-bright"
                    onClick={() => {
                      onGroupChange(g.id);
                      setManageGroupsOpen(false);
                    }}
                    title="Filter table by this group"
                  >
                    {g.name}
                  </button>
                  <span className="font-mono text-2xs text-mute">{g.code}</span>
                  <span className="rounded border border-line-strong px-1.5 py-0.5 text-2xs text-soft">
                    {track.label}
                  </span>
                  <span className="font-mono text-2xs text-mute">
                    {capCountForGroup(g.id)} caps
                  </span>
                  <span className="ml-auto flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => setProcessGroup(g)}
                      className="rounded p-0.5 text-mute hover:text-strong"
                      aria-label={`Process for ${g.name}`}
                    >
                      <InfoIcon className="h-3.5 w-3.5" />
                    </button>
                    {canManageGroups && (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingGroup(g)}
                          className="rounded p-0.5 text-mute hover:text-brand-bright"
                          aria-label={`Edit ${g.name}`}
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeGroup(g.id)}
                          className="rounded p-0.5 text-mute hover:text-danger"
                          aria-label={`Delete ${g.name}`}
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </span>
                </li>
              );
            })
          )}
        </ul>
      </Modal>

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
