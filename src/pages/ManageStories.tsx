import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  SignalHighIcon,
  Trash2Icon,
  WorkflowIcon } from
'lucide-react';
import { ActionMenu } from '../components/ActionMenu';
import { DataTransfer } from '../components/DataTransfer';
import { DetailsModal } from '../components/DetailsModal';
import { StoryModal } from '../components/DeliveryModals';
import { Button, PageHeader, StatusTag, StoryStagePill } from '../components/Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { CapabilityStatus, UserStory } from '../types/registry';
import { CAPABILITY_STATUSES, STORY_STAGE_NAMES } from '../types/registry';

export function ManageStoriesPage() {
  const { capabilityId = '', epicId = '', featureId = '' } = useParams();
  const navigate = useNavigate();
  const { getCapability, getEpic, getFeature, storiesOf, updateStory, removeStory } = useRegistry();
  const capability = getCapability(capabilityId);
  const epic = getEpic(epicId);
  const feature = getFeature(featureId);

  const [editing, setEditing] = useState<UserStory | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [details, setDetails] = useState<UserStory | null>(null);

  if (!capability || !epic || !feature) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-soft">That feature is not in the register.</p>
        <Link to="/" className="mt-2 inline-block text-xs text-brand-bright hover:text-strong">
          Back to the register
        </Link>
      </div>);

  }

  const stories = storiesOf(feature.id);

  return (
    <div>
      <nav className="flex flex-wrap items-center gap-2 text-xs text-mute">
        <button
          type="button"
          onClick={() => navigate(`/capabilities/${capability.id}/epics/${epic.id}/features`)}
          className="inline-flex items-center gap-1.5 transition-colors duration-150 ease-out hover:text-strong">
          
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Features
        </button>
        <span className="text-ink-500">/</span>
        <Link
          to={`/capabilities/${capability.id}`}
          className="transition-colors duration-150 ease-out hover:text-strong">
          
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
          count={`${stories.length} stories`}
          description={`User stories of ${feature.id} · ${feature.name}.`}
          action={
          <div className="flex flex-wrap items-center gap-1.5">
              <DataTransfer dataset="stories" parentId={feature.id} scopeLabel={feature.id} />
              <Button
              variant="primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}>
              
                <PlusIcon className="h-3.5 w-3.5" />
                Add user story
              </Button>
            </div>
          } />
        
      </div>

      <div className="scroll-thin mt-3 overflow-x-auto border-t border-line">
        <table className="w-full min-w-[1000px] border-collapse text-left">
          <thead>
            <tr className="text-2xs uppercase tracking-[0.14em] text-ink-500">
              <th className="w-24 py-2.5 pr-4 font-medium">US ID</th>
              <th className="w-64 py-2.5 pr-4 font-medium">User Story Name</th>
              <th className="py-2.5 pr-4 font-medium">Description</th>
              <th className="w-32 py-2.5 pr-4 font-medium">Status</th>
              <th className="w-48 py-2.5 pr-4 font-medium">Progress stage</th>
              <th className="w-16 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {stories.map((story) =>
            <tr key={story.id} className="border-t border-line-soft align-top">
                <td className="py-3 pr-4 font-mono text-2xs text-mute">{story.id}</td>
                <td className="py-3 pr-4 text-sm font-medium text-strong">{story.title}</td>
                <td className="py-3 pr-4">
                  <p className="line-clamp-2 max-w-xl text-xs leading-relaxed text-mute">
                    {story.role ?
                  `As a ${story.role}, I want to ${story.want} so that ${story.benefit}.` :
                  '—'}
                  </p>
                </td>
                <td className="py-3 pr-4">
                  <StatusTag status={story.status} />
                </td>
                <td className="py-3 pr-4">
                  <StoryStagePill stage={story.stage} />
                  {story.stage === 'In Architecture' &&
                <span
                  className={`mt-1 block text-2xs ${story.adrApproved ? 'text-ok' : 'text-orange'}`}>
                  
                      {story.adrApproved ? 'ADR approved' : 'ADR pending'}
                    </span>
                }
                </td>
                <td className="py-3 text-right">
                  <ActionMenu
                  label={`Actions for ${story.title}`}
                  header={story.id}
                  items={[
                  {
                    label: 'Edit User Story',
                    icon: PencilIcon,
                    onSelect: () => {
                      setEditing(story);
                      setFormOpen(true);
                    }
                  },
                  { label: 'View Story Details', icon: EyeIcon, onSelect: () => setDetails(story) },
                  {
                    label: 'Delete User Story',
                    icon: Trash2Icon,
                    danger: true,
                    onSelect: () => removeStory(story.id)
                  }]
                  }
                  submenus={[
                  {
                    key: 'status',
                    label: 'Change Status',
                    icon: SignalHighIcon,
                    current: story.status,
                    noneLabel: 'No status',
                    options: CAPABILITY_STATUSES,
                    onSelect: (v) => updateStory(story.id, { status: v as CapabilityStatus | null })
                  },
                  {
                    key: 'stage',
                    label: 'Change Progress',
                    icon: WorkflowIcon,
                    current: story.stage,
                    options: STORY_STAGE_NAMES,
                    onSelect: (v) => v && updateStory(story.id, { stage: v })
                  }]
                  } />
                
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {stories.length === 0 &&
        <div className="border-t border-line-soft py-20 text-center">
            <p className="text-sm text-soft">No user stories yet in this feature.</p>
            <p className="mt-1 text-xs text-mute">Add the first story to continue the breakdown.</p>
          </div>
        }
      </div>

      <StoryModal
        open={formOpen}
        featureId={feature.id}
        featureName={feature.name}
        story={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }} />
      

      <DetailsModal
        open={!!details}
        onClose={() => setDetails(null)}
        title={details?.title ?? ''}
        subtitle={`${details?.id ?? ''} · story of ${feature.id}`}
        rows={
        details ?
        [
        { label: 'US ID', value: <span className="font-mono text-xs">{details.id}</span> },
        { label: 'Feature', value: `${feature.id} · ${feature.name}` },
        {
          label: 'Story',
          value: details.role ?
          `As a ${details.role}, I want to ${details.want} so that ${details.benefit}.` :
          '—'
        },
        { label: 'Status', value: <StatusTag status={details.status} /> },
        { label: 'Progress stage', value: <StoryStagePill stage={details.stage} /> },
        {
          label: 'Acceptance criteria',
          value: details.criteria.length ?
          <ul className="space-y-1">
                      {details.criteria.map((c, i) =>
            <li key={i} className="flex gap-2 text-xs text-mute">
                          <span className="text-brand-bright">·</span>
                          {c}
                        </li>
            )}
                    </ul> :

          '—'

        },
        {
          label: 'ADR',
          value: details.adrDecision ?
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
                        {details.adrApproved ? 'Technically approved' : 'Awaiting technical approval'}
                      </p>
                    </div> :

          'Not recorded yet'

        }] :

        []
        } />
      
    </div>);

}