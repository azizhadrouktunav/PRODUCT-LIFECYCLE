import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  EyeIcon,
  ListTreeIcon,
  PencilIcon,
  PlusIcon,
  SignalHighIcon,
  Trash2Icon } from
'lucide-react';
import { ActionMenu } from '../components/ActionMenu';
import { DataTransfer } from '../components/DataTransfer';
import { DetailsModal } from '../components/DetailsModal';
import { FeatureModal } from '../components/DeliveryModals';
import { Button, PageHeader, ProgressBar, StatusTag } from '../components/Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { CapabilityStatus, Feature } from '../types/registry';
import { CAPABILITY_STATUSES, isStoryDone } from '../types/registry';

export function ManageFeaturesPage() {
  const { capabilityId = '', epicId = '' } = useParams();
  const navigate = useNavigate();
  const { getCapability, getEpic, featuresOf, storiesOf, updateFeature, removeFeature } = useRegistry();
  const capability = getCapability(capabilityId);
  const epic = getEpic(epicId);

  const [editing, setEditing] = useState<Feature | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [details, setDetails] = useState<Feature | null>(null);

  if (!capability || !epic) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-soft">That epic is not in the register.</p>
        <Link to="/" className="mt-2 inline-block text-xs text-brand-bright hover:text-strong">
          Back to the register
        </Link>
      </div>);

  }

  const features = featuresOf(epic.id);

  return (
    <div>
      <nav className="flex flex-wrap items-center gap-2 text-xs text-mute">
        <button
          type="button"
          onClick={() => navigate(`/capabilities/${capability.id}/epics`)}
          className="inline-flex items-center gap-1.5 transition-colors duration-150 ease-out hover:text-strong">
          
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Epics
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
        <span className="text-soft">Features</span>
      </nav>

      <div className="mt-3">
        <PageHeader
          title="Manage Features"
          count={`${features.length} features`}
          description={`Features of ${epic.id} · ${epic.name}. Open a feature to manage the user stories inside it.`}
          action={
          <div className="flex flex-wrap items-center gap-1.5">
              <DataTransfer dataset="features" parentId={epic.id} scopeLabel={epic.id} />
              <Button
              variant="primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}>
              
                <PlusIcon className="h-3.5 w-3.5" />
                Add feature
              </Button>
            </div>
          } />
        
      </div>

      <div className="scroll-thin mt-3 overflow-x-auto border-t border-line">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="text-2xs uppercase tracking-[0.14em] text-ink-500">
              <th className="w-28 py-2.5 pr-4 font-medium">Feature ID</th>
              <th className="w-64 py-2.5 pr-4 font-medium">Feature Name</th>
              <th className="py-2.5 pr-4 font-medium">Description</th>
              <th className="w-32 py-2.5 pr-4 font-medium">Status</th>
              <th className="w-40 py-2.5 pr-4 font-medium">Stories done</th>
              <th className="w-16 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => {
              const stories = storiesOf(feature.id);
              const done = stories.filter(isStoryDone).length;
              return (
                <tr key={feature.id} className="border-t border-line-soft align-top">
                  <td className="py-3 pr-4 font-mono text-2xs text-mute">{feature.id}</td>
                  <td className="py-3 pr-4 text-sm font-medium text-strong">{feature.name}</td>
                  <td className="py-3 pr-4">
                    <p className="line-clamp-2 max-w-xl text-xs leading-relaxed text-mute">
                      {feature.description || '—'}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusTag status={feature.status} />
                  </td>
                  <td className="py-3 pr-4">
                    <ProgressBar done={done} total={stories.length} />
                  </td>
                  <td className="py-3 text-right">
                    <ActionMenu
                      label={`Actions for ${feature.name}`}
                      header={`${feature.id} · ${stories.length} stories`}
                      items={[
                      {
                        label: 'Edit Feature',
                        icon: PencilIcon,
                        onSelect: () => {
                          setEditing(feature);
                          setFormOpen(true);
                        }
                      },
                      {
                        label: 'Manage User Stories',
                        icon: ListTreeIcon,
                        onSelect: () =>
                        navigate(
                          `/capabilities/${capability.id}/epics/${epic.id}/features/${feature.id}/stories`
                        )
                      },
                      { label: 'View Feature Details', icon: EyeIcon, onSelect: () => setDetails(feature) },
                      {
                        label: 'Delete Feature',
                        icon: Trash2Icon,
                        danger: true,
                        onSelect: () => removeFeature(feature.id)
                      }]
                      }
                      submenus={[
                      {
                        key: 'status',
                        label: 'Change Status',
                        icon: SignalHighIcon,
                        current: feature.status,
                        noneLabel: 'No status',
                        options: CAPABILITY_STATUSES,
                        onSelect: (v) =>
                        updateFeature(feature.id, { status: v as CapabilityStatus | null })
                      }]
                      } />
                    
                  </td>
                </tr>);

            })}
          </tbody>
        </table>

        {features.length === 0 &&
        <div className="border-t border-line-soft py-20 text-center">
            <p className="text-sm text-soft">No features yet in this epic.</p>
            <p className="mt-1 text-xs text-mute">Add the first feature to continue the breakdown.</p>
          </div>
        }
      </div>

      <FeatureModal
        open={formOpen}
        epicId={epic.id}
        epicName={epic.name}
        feature={editing}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }} />
      

      <DetailsModal
        open={!!details}
        onClose={() => setDetails(null)}
        title={details?.name ?? ''}
        subtitle={`${details?.id ?? ''} · feature of ${epic.id}`}
        rows={
        details ?
        [
        { label: 'Feature ID', value: <span className="font-mono text-xs">{details.id}</span> },
        { label: 'Epic', value: `${epic.id} · ${epic.name}` },
        { label: 'Description', value: details.description || '—' },
        { label: 'Status', value: <StatusTag status={details.status} /> },
        { label: 'User stories', value: `${storiesOf(details.id).length}` }] :

        []
        } />
      
    </div>);

}