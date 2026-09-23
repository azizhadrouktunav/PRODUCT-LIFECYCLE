import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modal';
import { ProductMultiSelect } from './ProductMultiSelect';
import { Button, Field, inputClass } from './Primitives';
import {
  listUsersByRole,
  validateReclamationInput,
  type AssignableUser,
} from '../lib/reclamationsApi';
import type {
  Reclamation,
  ReclamationCategory,
  ReclamationInput,
  ReclamationStatus,
} from '../types/reclamations';
import {
  RECLAMATION_CATEGORIES,
  RECLAMATION_STATUSES,
  assigneeRoleForCategory,
} from '../types/reclamations';

const selectClass =
  'rounded-md border border-line-strong bg-ink-800 px-2.5 py-1.5 text-xs text-soft transition-colors duration-150 ease-out focus:border-brand focus:outline-none';

function userLabel(u: AssignableUser): string {
  const name = u.displayName.trim();
  if (name && u.email) return `${name} · ${u.email}`;
  return name || u.email || u.userId;
}

export function ReclamationModal({
  open,
  onClose,
  reclamation = null,
  canManageStatus,
  canReassign,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  reclamation?: Reclamation | null;
  canManageStatus: boolean;
  canReassign: boolean;
  onSave: (input: ReclamationInput) => void | Promise<void>;
}) {
  const isEdit = !!reclamation;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ReclamationCategory>('technique');
  const [status, setStatus] = useState<ReclamationStatus>('Open');
  const [productIds, setProductIds] = useState<string[]>([]);
  const [assigneeId, setAssigneeId] = useState('');
  const [assignees, setAssignees] = useState<AssignableUser[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const roleSlug = assigneeRoleForCategory(category);
  const needsAssignee = category === 'technique' || category === 'it';
  const needsProduct = category === 'produit';

  useEffect(() => {
    if (!open) return;
    setTitle(reclamation?.title ?? '');
    setDescription(reclamation?.description ?? '');
    setCategory(reclamation?.category ?? 'technique');
    setStatus(reclamation?.status ?? 'Open');
    setProductIds(reclamation?.productIds ?? []);
    setAssigneeId(reclamation?.assigneeId ?? '');
    setError(null);
  }, [open, reclamation]);

  useEffect(() => {
    if (!open || !roleSlug) {
      setAssignees([]);
      return;
    }
    let cancelled = false;
    setLoadingAssignees(true);
    void listUsersByRole(roleSlug)
      .then((users) => {
        if (!cancelled) setAssignees(users);
      })
      .catch((err) => {
        if (!cancelled) {
          setAssignees([]);
          setError(err instanceof Error ? err.message : String(err));
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAssignees(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, roleSlug]);

  useEffect(() => {
    if (!needsAssignee) return;
    if (assigneeId && assignees.length > 0 && !assignees.some((u) => u.userId === assigneeId)) {
      setAssigneeId('');
    }
  }, [needsAssignee, assignees, assigneeId]);

  const selectedAssignee = useMemo(
    () => assignees.find((u) => u.userId === assigneeId) ?? null,
    [assignees, assigneeId]
  );

  const input: ReclamationInput = useMemo(() => {
    const assignee =
      needsAssignee && selectedAssignee
        ? {
            assigneeId: selectedAssignee.userId,
            assigneeName: userLabel(selectedAssignee),
          }
        : { assigneeId: null as string | null, assigneeName: '' };
    return {
      title,
      description,
      category,
      status,
      productIds: needsProduct ? productIds : [],
      ...assignee,
    };
  }, [
    title,
    description,
    category,
    status,
    productIds,
    needsProduct,
    needsAssignee,
    selectedAssignee,
  ]);

  const validationError = validateReclamationInput(input);
  const valid = !validationError;

  async function submit() {
    const err = validateReclamationInput(input);
    if (err) {
      setError(err);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(input);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const categoryMeta = RECLAMATION_CATEGORIES.find((c) => c.id === category);

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-xl"
      title={isEdit ? 'Edit reclamation' : 'New reclamation'}
      subtitle="Categorize the request and send it to the right person when required."
      footer={
        <>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={!valid || saving}>
            {isEdit ? 'Save' : 'Submit'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Field label="Category" required>
          <select
            className={selectClass + ' w-full'}
            value={category}
            disabled={isEdit && !canReassign}
            onChange={(e) => {
              setCategory(e.target.value as ReclamationCategory);
              setAssigneeId('');
              setProductIds([]);
            }}
          >
            {RECLAMATION_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          {categoryMeta && (
            <p className="mt-1 text-2xs text-mute">{categoryMeta.hint}</p>
          )}
        </Field>

        <Field label="Title" required>
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Short summary"
            autoFocus
          />
        </Field>

        <Field label="Description">
          <textarea
            className={`${inputClass} min-h-[100px] resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details, context, expected outcome…"
          />
        </Field>

        {needsProduct && <ProductMultiSelect productIds={productIds} onChange={setProductIds} />}

        {needsAssignee && (
          <Field
            label={category === 'technique' ? 'Technical Manager' : 'Project Manager'}
            required
          >
            <select
              className={selectClass + ' w-full'}
              value={assigneeId}
              disabled={loadingAssignees || (isEdit && !canReassign)}
              onChange={(e) => setAssigneeId(e.target.value)}
            >
              <option value="">
                {loadingAssignees ? 'Loading…' : 'Select a person'}
              </option>
              {assignees.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {userLabel(u)}
                </option>
              ))}
            </select>
            {!loadingAssignees && assignees.length === 0 && (
              <p className="mt-1 text-2xs text-orange">
                No users with this role yet. Ask an admin to assign the role in Settings.
              </p>
            )}
          </Field>
        )}

        {isEdit && canManageStatus && (
          <Field label="Status">
            <select
              className={selectClass + ' w-full'}
              value={status}
              onChange={(e) => setStatus(e.target.value as ReclamationStatus)}
            >
              {RECLAMATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
        )}

        {(error || (!valid && title.trim().length > 1)) && (
          <p className="text-2xs text-orange">{error ?? validationError}</p>
        )}
      </div>
    </Modal>
  );
}
