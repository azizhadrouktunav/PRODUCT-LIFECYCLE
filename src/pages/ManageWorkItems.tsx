import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { Button, Field, StatusTag, inputClass } from '../components/Primitives';
import { Modal } from '../components/Modal';
import { useRegistry } from '../contexts/RegistryContext';
import { childWorkItemTypes, workItemTypeDef } from '../types/registry';

export function ManageWorkItemsPage() {
  const { capabilityId = '', typeId = '' } = useParams();
  const [search] = useSearchParams();
  const parentId = search.get('parent') || null;
  const navigate = useNavigate();
  const {
    getCapability,
    lifecycleOf,
    workItemsOf,
    addWorkItem,
    updateWorkItem,
    removeWorkItem,
    getWorkItem,
  } = useRegistry();

  const capability = getCapability(capabilityId);
  const lifecycle = capability ? lifecycleOf(capability) : null;
  const typeDef = lifecycle ? workItemTypeDef(lifecycle, typeId) : undefined;
  const parent = parentId ? getWorkItem(parentId) : undefined;
  const childrenTypes = lifecycle ? childWorkItemTypes(lifecycle, typeId) : [];

  const items = useMemo(() => {
    if (!capability) return [];
    return workItemsOf(capability.id, typeId, parentId);
  }, [capability, workItemsOf, typeId, parentId]);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('In Progress');

  if (!capability || !lifecycle || !typeDef) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-soft">Work item type not found for this capability.</p>
        <Link to="/capabilities" className="mt-2 inline-block text-xs text-brand-bright">
          Back
        </Link>
      </div>
    );
  }

  const statuses = typeDef.statuses.length > 0 ? typeDef.statuses : ['In Progress', 'Completed'];

  function openCreate() {
    setEditingId(null);
    setName('');
    setDescription('');
    setStatus(statuses[0] ?? 'In Progress');
    setOpen(true);
  }

  function openEdit(id: string) {
    const row = getWorkItem(id);
    if (!row) return;
    setEditingId(id);
    setName(row.name);
    setDescription(row.description);
    setStatus(row.status);
    setOpen(true);
  }

  function submit() {
    if (!name.trim() || !capability) return;
    if (editingId) {
      updateWorkItem(editingId, { name, description, status });
    } else {
      addWorkItem(capability.id, {
        typeId,
        parentId,
        name,
        description,
        status,
      });
    }
    setOpen(false);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate(`/capabilities/${capability.id}`)}
        className="inline-flex items-center gap-1.5 text-xs text-mute hover:text-strong"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        {capability.name}
      </button>

      <header className="mt-3 flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <p className="font-mono text-2xs text-mute">{capability.id}</p>
          <h1 className="text-xl font-semibold tracking-tight text-strong">
            {typeDef.pluralLabel}
          </h1>
          {parent && (
            <p className="mt-1 text-xs text-mute">
              Under {parent.name}{' '}
              <span className="font-mono text-2xs">({parent.id})</span>
            </p>
          )}
        </div>
        <Button variant="primary" type="button" onClick={openCreate}>
          <PlusIcon className="h-3.5 w-3.5" />
          Add {typeDef.label.toLowerCase()}
        </Button>
      </header>

      {items.length === 0 ? (
        <p className="mt-6 text-xs text-mute">No {typeDef.pluralLabel.toLowerCase()} yet.</p>
      ) : (
        <ul className="mt-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-start gap-x-4 gap-y-2 border-b border-line-soft py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-2xs text-ink-500">{item.id}</span>
                  <button
                    type="button"
                    className="text-left text-xs font-medium text-strong hover:text-brand-bright"
                    onClick={() => openEdit(item.id)}
                  >
                    {item.name}
                  </button>
                  <StatusTag status={item.status} />
                </div>
                {item.description && (
                  <p className="mt-1 text-2xs leading-relaxed text-mute">{item.description}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {childrenTypes.map((ct) => (
                  <Link
                    key={ct.id}
                    to={`/capabilities/${capability.id}/items/${ct.id}?parent=${item.id}`}
                    className="text-2xs text-brand-bright hover:text-strong"
                  >
                    {ct.pluralLabel}
                  </Link>
                ))}
                <button
                  type="button"
                  aria-label="Delete"
                  onClick={() => {
                    if (window.confirm(`Delete ${item.name}?`)) removeWorkItem(item.id);
                  }}
                  className="rounded p-1 text-mute hover:text-danger"
                >
                  <Trash2Icon className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editingId ? `Edit ${typeDef.label}` : `Add ${typeDef.label}`}
        footer={
          <>
            <Button variant="quiet" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} disabled={!name.trim()}>
              {editingId ? 'Save' : 'Add'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Name" required>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Description">
            <textarea
              className={`${inputClass} min-h-[72px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field label="Status">
            <select
              className={inputClass}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Modal>
    </div>
  );
}
