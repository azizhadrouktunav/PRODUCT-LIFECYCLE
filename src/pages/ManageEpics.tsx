import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftIcon,
  EyeIcon,
  LayersIcon,
  PencilIcon,
  PlusIcon,
  SignalHighIcon,
  Trash2Icon } from
'lucide-react';
import { ActionMenu } from '../components/ActionMenu';
import { DataTransfer } from '../components/DataTransfer';
import { DetailsModal } from '../components/DetailsModal';
import { EpicModal } from '../components/DeliveryModals';
import { Button, PageHeader, ProgressBar, StatusTag } from '../components/Primitives';
import { useRegistry } from '../contexts/RegistryContext';
import type { CapabilityStatus, Epic } from '../types/registry';
import { CAPABILITY_STATUSES, isStoryDone } from '../types/registry';

export function ManageEpicsPage() {
  const { capabilityId = '' } = useParams();
  const navigate = useNavigate();
  const { getCapability, epicsOf, featuresOf, storiesOfEpic, updateEpic, removeEpic } = useRegistry();
  const capability = getCapability(capabilityId);

  const [editing, setEditing] = useState<Epic | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [details, setDetails] = useState<Epic | null>(null);

  if (!capability) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-soft">That capability is not in the register.</p>
        <Link to="/" className="mt-2 inline-block text-xs text-brand-bright hover:text-strong">
          Back to the register
        </Link>
      </div>);

  }

  const epics = epicsOf(capability.id);

  return (
    <div>
      <nav className="flex flex-wrap items-center gap-2 text-xs text-mute">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 transition-colors duration-150 ease-out hover:text-strong">
          
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Capability Register
        </button>
        <span className="text-ink-500">/</span>
        <Link
          to={`/capabilities/${capability.id}`}
          className="transition-colors duration-150 ease-out hover:text-strong">
          
          {capability.id}
        </Link>
        <span className="text-ink-500">/</span>
        <span className="text-soft">Epics</span>
      </nav>

      <div className="mt-3">
        <PageHeader
          title="Manage Epics"
          count={`${epics.length} epics`}
          description={`Epics of ${capability.id} · ${capability.name}. Open an epic to manage the features inside it.`}
          action={
          <div className="flex flex-wrap items-center gap-1.5">
              <DataTransfer dataset="epics" parentId={capability.id} scopeLabel={capability.id} />
              <Button
              variant="primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}>
              
                <PlusIcon className="h-3.5 w-3.5" />
                Add epic
              </Button>
            </div>
          } />
        
      </div>

      <div className="scroll-thin mt-3 overflow-x-auto border-t border-line">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="text-2xs uppercase tracking-[0.14em] text-ink-500">
              <th className="w-28 py-2.5 pr-4 font-medium">Epic ID</th>
              <th className="w-64 py-2.5 pr-4 font-medium">Epic Name</th>
              <th className="py-2.5 pr-4 font-medium">Description</th>
              <th className="w-32 py-2.5 pr-4 font-medium">Status</th>
              <th className="w-40 py-2.5 pr-4 font-medium">Stories done</th>
              <th className="w-16 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {epics.map((epic) => {
              const stories = storiesOfEpic(epic.id);
              const done = stories.filter(isStoryDone).length;
              return (
                <tr key={epic.id} className="border-t border-line-soft align-top">
                  <td className="py-3 pr-4 font-mono text-2xs text-mute">{epic.id}</td>
                  <td className="py-3 pr-4">
                    <div className="text-sm font-medium text-strong">{epic.name}</div>
                    {epic.key &&
                    <div className="mt-0.5 font-mono text-2xs text-brand-bright">{epic.key}</div>
                    }
                  </td>
                  <td className="py-3 pr-4">
                    <p className="line-clamp-2 max-w-xl text-xs leading-relaxed text-mute">
                      {epic.description || '—'}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusTag status={epic.status} />
                  </td>
                  <td className="py-3 pr-4">
                    <ProgressBar done={done} total={stories.length} />
                  </td>
                  <td className="py-3 text-right">
                    <ActionMenu
                      label={`Actions for ${epic.name}`}
                      header={`${epic.id} · ${featuresOf(epic.id).length} features`}
                      items={[
                      {
                        label: 'Edit Epic',
                        icon: PencilIcon,
                        onSelect: () => {
                          setEditing(epic);
                          setFormOpen(true);
                        }
                      },
                      {
                        label: 'Manage Features',
                        icon: LayersIcon,
                        onSelect: () =>
                        navigate(`/capabilities/${capability.id}/epics/${epic.id}/features`)
                      },
                      { label: 'View Epic Details', icon: EyeIcon, onSelect: () => setDetails(epic) },
                      {
                        label: 'Delete Epic',
                        icon: Trash2Icon,
                        danger: true,
                        onSelect: () => removeEpic(epic.id)
                      }]
                      }
                      submenus={[
                      {
                        key: 'status',
                        label: 'Change Status',
                        icon: SignalHighIcon,
                        current: epic.status,
                        noneLabel: 'No status',
                        options: CAPABILITY_STATUSES,
                        onSelect: (v) =>
                        updateEpic(epic.id, { status: v as CapabilityStatus | null })
                      }]
                      } />
                    
                  </td>
                </tr>);

            })}
          </tbody>
        </table>

        {epics.length === 0 &&
        <div className="border-t border-line-soft py-20 text-center">
            <p className="text-sm text-soft">No epics yet for this capability.</p>
            <p className="mt-1 text-xs text-mute">Add the first epic to start the breakdown.</p>
          </div>
        }
      </div>

      <EpicModal
        open={formOpen}
        epic={editing}
        capabilityId={capability.id}
        suggestedKey={capability.jiraEpic}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }} />
      

      <DetailsModal
        open={!!details}
        onClose={() => setDetails(null)}
        title={details?.name ?? ''}
        subtitle={`${details?.id ?? ''} · epic of ${capability.id}`}
        rows={
        details ?
        [
        { label: 'Epic ID', value: <span className="font-mono text-xs">{details.id}</span> },
        {
          label: 'Jira key',
          value: details.key ?
          <span className="font-mono text-xs text-brand-bright">{details.key}</span> :

          '—'

        },
        { label: 'Description', value: details.description || '—' },
        { label: 'Status', value: <StatusTag status={details.status} /> },
        { label: 'Features', value: `${featuresOf(details.id).length}` },
        { label: 'User stories', value: `${storiesOfEpic(details.id).length}` }] :

        []
        } />
      
    </div>);

}