import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CheckIcon,
  EyeIcon,
  FileTextIcon,
  HashIcon,
  PencilIcon,
  PlusIcon,
  SignalHighIcon,
  Trash2Icon,
  WorkflowIcon,
} from 'lucide-react';
import { ActionMenu } from '../components/ActionMenu';
import { DataTransfer } from '../components/DataTransfer';
import { DetailsModal } from '../components/DetailsModal';
import { StoryModal } from '../components/DeliveryModals';
import { Modal } from '../components/Modal';
import { Button, Field, PageHeader, StatusTag, StoryStagePill, inputClass } from '../components/Primitives';
import { SortableGrip, SortableTableBody } from '../components/SortableTableBody';
import { useAuth } from '../contexts/AuthContext';
import { useRegistry } from '../contexts/RegistryContext';
import type { CapabilityStatus, UserStory } from '../types/registry';
import { MANUAL_CAPABILITY_STATUSES, STORY_STAGE_NAMES, isAutoManagedStatus } from '../types/registry';

function StoryPointsModal({
  open,
  story,
  onClose,
  onSave,
}: {
  open: boolean;
  story: UserStory | null;
  onClose: () => void;
  onSave: (points: number | null) => void;
}) {
  const [value, setValue] = useState('');
  const isUpdate = story?.points != null;

  useEffect(() => {
    if (!open) return;
    setValue(story?.points != null ? String(story.points) : '');
  }, [open, story]);

  function submit() {
    const trimmed = value.trim();
    if (trimmed === '') {
      onSave(null);
    } else {
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n < 0) return;
      onSave(n);
    }
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-sm"
      title={isUpdate ? 'Update story points' : 'Set story points'}
      subtitle={story ? `${story.id} · ${story.title}` : undefined}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            Save
          </Button>
        </>
      }
    >
      <Field label="Story points" hint="leave blank to clear">
        <input
          className={inputClass}
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 5"
          autoFocus
        />
      </Field>
    </Modal>
  );
}

function StoryAdrModal({
  open,
  story,
  onClose,
  onSave,
}: {
  open: boolean;
  story: UserStory | null;
  onClose: () => void;
  onSave: (payload: {
    adrContext: string;
    adrDecision: string;
    adrTechnical: string;
    adrConsequences: string;
    adrApproved: boolean;
  }) => void;
}) {
  const [adrContext, setAdrContext] = useState('');
  const [adrDecision, setAdrDecision] = useState('');
  const [adrTechnical, setAdrTechnical] = useState('');
  const [adrConsequences, setAdrConsequences] = useState('');
  const [adrApproved, setAdrApproved] = useState(false);
  const isUpdate = !!story?.adrDecision?.trim();

  useEffect(() => {
    if (!open) return;
    setAdrContext(story?.adrContext ?? '');
    setAdrDecision(story?.adrDecision ?? '');
    setAdrTechnical(story?.adrTechnical ?? '');
    setAdrConsequences(story?.adrConsequences ?? '');
    setAdrApproved(story?.adrApproved ?? false);
  }, [open, story]);

  function submit() {
    onSave({
      adrContext,
      adrDecision,
      adrTechnical,
      adrConsequences,
      adrApproved,
    });
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-xl"
      title={isUpdate ? 'Update decision record' : 'Set decision record'}
      subtitle={story ? `${story.id} · ${story.title}` : undefined}
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-2xs uppercase tracking-[0.14em] text-ink-500">
            Decision record (optional)
          </p>
          <button
            type="button"
            onClick={() => setAdrApproved(!adrApproved)}
            aria-pressed={adrApproved}
            className={`inline-flex items-center gap-1.5 rounded border px-2 py-1 text-2xs transition-colors duration-150 ease-out ${
              adrApproved
                ? 'border-ok/40 text-ok'
                : 'border-line-strong text-mute hover:text-strong'
            }`}
          >
            <span
              className={`flex h-3 w-3 items-center justify-center rounded-sm border ${
                adrApproved ? 'border-ok bg-ok' : 'border-line-strong'
              }`}
              aria-hidden="true"
            >
              {adrApproved && <CheckIcon className="h-2 w-2 text-white" />}
            </span>
            Technically approved
          </button>
        </div>

        <Field label="Context" hint="why a decision is needed">
          <textarea
            className={`${inputClass} min-h-[60px] resize-y`}
            value={adrContext}
            onChange={(e) => setAdrContext(e.target.value)}
          />
        </Field>
        <Field label="Decision">
          <textarea
            className={`${inputClass} min-h-[60px] resize-y`}
            value={adrDecision}
            onChange={(e) => setAdrDecision(e.target.value)}
          />
        </Field>
        <Field label="Technical information" hint="how it will be built">
          <textarea
            className={`${inputClass} min-h-[60px] resize-y`}
            value={adrTechnical}
            onChange={(e) => setAdrTechnical(e.target.value)}
          />
        </Field>
        <Field label="Consequences">
          <textarea
            className={`${inputClass} min-h-[60px] resize-y`}
            value={adrConsequences}
            onChange={(e) => setAdrConsequences(e.target.value)}
          />
        </Field>

        <p className="text-2xs leading-relaxed text-mute">
          Optional. Capture a decision record when the story needs one — not required to progress.
        </p>
      </div>
    </Modal>
  );
}

export function ManageStoriesPage() {
  const { capabilityId = '', epicId = '', featureId = '' } = useParams();
  const navigate = useNavigate();
  const { getCapability, getEpic, getFeature, storiesOf, updateStory, removeStory, reorderStories } =
    useRegistry();
  const { can, canSetStoryStage, capabilityVisible, isReadOnly } = useAuth();
  const capability = getCapability(capabilityId);
  const epic = getEpic(epicId);
  const feature = getFeature(featureId);

  const [editing, setEditing] = useState<UserStory | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [details, setDetails] = useState<UserStory | null>(null);
  const [pointsStory, setPointsStory] = useState<UserStory | null>(null);
  const [adrStory, setAdrStory] = useState<UserStory | null>(null);

  if (!capability || !epic || !feature || !capabilityVisible(capability)) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-soft">That feature is not in the register.</p>
        <Link to="/capabilities" className="mt-2 inline-block text-xs text-brand-bright hover:text-strong">
          Back to the register
        </Link>
      </div>
    );
  }

  const stories = storiesOf(feature.id);
  const stageOptions = STORY_STAGE_NAMES.filter((s) => canSetStoryStage(s));
  const canMutateStories = can('edit_capability') && !isReadOnly;
  const canChangeStage = stageOptions.length > 0 && !isReadOnly;

  return (
    <div>
      <nav className="flex flex-wrap items-center gap-2 text-xs text-mute">
        <button
          type="button"
          onClick={() => navigate(`/capabilities/${capability.id}/epics/${epic.id}/features`)}
          className="inline-flex items-center gap-1.5 transition-colors duration-150 ease-out hover:text-strong"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Features
        </button>
        <span className="text-ink-500">/</span>
        <Link
          to={`/capabilities/${capability.id}`}
          className="transition-colors duration-150 ease-out hover:text-strong"
        >
          {capability.id}
        </Link>
        <span className="text-ink-500">/</span>
        <span className="font-mono">{epic.id}</span>
        <span className="text-ink-500">/</span>
        <span className="font-mono">{feature.id}</span>
        <span className="text-ink-500">/</span>
        <span className="text-soft">User stories</span>
      </nav>

      <div className="mt-3">
        <PageHeader
          title="Manage User Stories"
          count={`${feature.id} · ${stories.length}`}
          action={
            <div className="flex flex-wrap items-center gap-1.5">
              {canMutateStories && (
                <DataTransfer dataset="stories" parentId={feature.id} scopeLabel={feature.id} />
              )}
              {canMutateStories && (
                <Button
                  variant="primary"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add user story
                </Button>
              )}
            </div>
          }
        />
      </div>

      <div className="scroll-thin mt-3 overflow-x-auto border-t border-line">
        <table className="w-full min-w-[1000px] border-collapse text-left">
          <thead>
            <tr className="text-2xs uppercase tracking-[0.14em] text-ink-500">
              {canMutateStories && <th className="w-8 py-2.5 pr-1 font-medium" aria-label="Reorder" />}
              <th className="w-24 py-2.5 pr-4 font-medium">US ID</th>
              <th className="w-64 py-2.5 pr-4 font-medium">User Story Name</th>
              <th className="py-2.5 pr-4 font-medium">Description</th>
              <th className="w-32 py-2.5 pr-4 font-medium">Status</th>
              <th className="w-48 py-2.5 pr-4 font-medium">Progress stage</th>
              <th className="w-16 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <SortableTableBody
            items={stories}
            disabled={!canMutateStories}
            onReorder={(orderedIds) => reorderStories(feature.id, orderedIds)}
            renderRow={(story, handle) => (
              <>
                {canMutateStories && <SortableGrip handle={handle} />}
                <td className="py-3 pr-4 font-mono text-2xs text-mute">{story.id}</td>
                <td className="py-3 pr-4 text-sm font-medium text-strong">{story.title}</td>
                <td className="py-3 pr-4">
                  <p className="line-clamp-2 max-w-xl text-xs leading-relaxed text-mute">
                    {story.role
                      ? `As a ${story.role}, I want to ${story.want} so that ${story.benefit}.`
                      : '—'}
                  </p>
                </td>
                <td className="py-3 pr-4">
                  <StatusTag status={story.status} />
                </td>
                <td className="py-3 pr-4">
                  <StoryStagePill stage={story.stage} />
                  {(story.adrContext ||
                    story.adrDecision ||
                    story.adrTechnical ||
                    story.adrApproved) && (
                    <span
                      className={`mt-1 block text-2xs ${story.adrApproved ? 'text-ok' : 'text-mute'}`}
                    >
                      {story.adrApproved ? 'ADR approved' : 'ADR draft'}
                    </span>
                  )}
                </td>
                <td className="py-3 text-right">
                  <ActionMenu
                    label={`Actions for ${story.title}`}
                    header={story.id}
                    items={[
                      ...(canMutateStories
                        ? [
                            {
                              label: 'Edit User Story',
                              icon: PencilIcon,
                              onSelect: () => {
                                setEditing(story);
                                setFormOpen(true);
                              },
                            },
                          ]
                        : []),
                      {
                        label: 'View details',
                        icon: EyeIcon,
                        onSelect: () => setDetails(story),
                      },
                      ...(canMutateStories || canChangeStage
                        ? [
                            {
                              label:
                                story.points != null ? 'Update story points' : 'Set story points',
                              icon: HashIcon,
                              onSelect: () => setPointsStory(story),
                            },
                            {
                              label: story.adrDecision?.trim()
                                ? 'Update decision record'
                                : 'Set decision record',
                              icon: FileTextIcon,
                              onSelect: () => setAdrStory(story),
                            },
                          ]
                        : []),
                      ...(canMutateStories
                        ? [
                            {
                              label: 'Delete User Story',
                              icon: Trash2Icon,
                              danger: true,
                              onSelect: () => removeStory(story.id),
                            },
                          ]
                        : []),
                    ]}
                    submenus={[
                      ...(canMutateStories
                        ? [
                            {
                              key: 'status',
                              label: 'Change Status',
                              icon: SignalHighIcon,
                              current: isAutoManagedStatus(story.status) ? null : story.status,
                              noneLabel: 'No flag (auto)',
                              options: MANUAL_CAPABILITY_STATUSES,
                              onSelect: (v: string | null) =>
                                updateStory(story.id, {
                                  status: v as CapabilityStatus | null,
                                }),
                            },
                          ]
                        : []),
                      ...(canChangeStage
                        ? [
                            {
                              key: 'stage',
                              label: 'Change Progress',
                              icon: WorkflowIcon,
                              current: story.stage,
                              options: stageOptions,
                              onSelect: (v: string | null) =>
                                v && canSetStoryStage(v) && updateStory(story.id, { stage: v }),
                            },
                          ]
                        : []),
                    ]}
                  />
                </td>
              </>
            )}
          />
        </table>

        {stories.length === 0 && (
          <div className="border-t border-line-soft py-20 text-center">
            <p className="text-sm text-soft">No user stories yet.</p>
          </div>
        )}
      </div>

      <StoryModal
        open={formOpen}
        featureId={feature.id}
        featureName={feature.name}
        story={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />

      <StoryPointsModal
        open={!!pointsStory}
        story={pointsStory}
        onClose={() => setPointsStory(null)}
        onSave={(points) => {
          if (pointsStory) updateStory(pointsStory.id, { points });
        }}
      />

      <StoryAdrModal
        open={!!adrStory}
        story={adrStory}
        onClose={() => setAdrStory(null)}
        onSave={(payload) => {
          if (adrStory) updateStory(adrStory.id, payload);
        }}
      />

      <DetailsModal
        open={!!details}
        onClose={() => setDetails(null)}
        title={details?.title ?? ''}
        subtitle={`${details?.id ?? ''} · story of ${feature.id}`}
        rows={
          details
            ? [
                { label: 'US ID', value: <span className="font-mono text-xs">{details.id}</span> },
                { label: 'Feature', value: `${feature.id} · ${feature.name}` },
                {
                  label: 'Story',
                  value: details.role
                    ? `As a ${details.role}, I want to ${details.want} so that ${details.benefit}.`
                    : '—',
                },
                {
                  label: 'Story points',
                  value: details.points != null ? String(details.points) : '—',
                },
                { label: 'Status', value: <StatusTag status={details.status} /> },
                { label: 'Progress stage', value: <StoryStagePill stage={details.stage} /> },
                {
                  label: 'Acceptance criteria',
                  value: details.criteria.length ? (
                    <ul className="space-y-1">
                      {details.criteria.map((c, i) => (
                        <li key={i} className="flex gap-2 text-xs text-mute">
                          <span className="text-brand-bright">·</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    '—'
                  ),
                },
                {
                  label: 'ADR',
                  value: details.adrDecision ? (
                    <div className="space-y-2 text-xs">
                      <p>
                        <span className="text-ink-500">Context — </span>
                        {details.adrContext || '—'}
                      </p>
                      <p>
                        <span className="text-ink-500">Decision — </span>
                        {details.adrDecision}
                      </p>
                      <p>
                        <span className="text-ink-500">Technical — </span>
                        {details.adrTechnical || '—'}
                      </p>
                      <p>
                        <span className="text-ink-500">Consequences — </span>
                        {details.adrConsequences || '—'}
                      </p>
                      <p className={details.adrApproved ? 'text-ok' : 'text-orange'}>
                        {details.adrApproved
                          ? 'Technically approved'
                          : 'Awaiting technical approval'}
                      </p>
                    </div>
                  ) : (
                    'Not recorded yet'
                  ),
                },
              ]
            : []
        }
      />
    </div>
  );
}
