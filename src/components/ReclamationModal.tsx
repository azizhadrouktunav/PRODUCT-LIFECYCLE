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
  assigneeFieldLabel,
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
  canReply,
  allowSupport,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  reclamation?: Reclamation | null;
  canManageStatus: boolean;
  canReassign: boolean;
  canReply: boolean;
  allowSupport: boolean;
  onSave: (input: ReclamationInput) => void | Promise<void>;
}) {
  const isEdit = !!reclamation;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ReclamationCategory>('demande');
  const [status, setStatus] = useState<ReclamationStatus>('Open');
  const [productIds, setProductIds] = useState<string[]>([]);
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [response, setResponse] = useState('');
  const [assignees, setAssignees] = useState<AssignableUser[]>([]);
  const [loadingAssignees, setLoadingAssignees] = useState(false);
  const [assigningAll, setAssigningAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const roleSlug = assigneeRoleForCategory(category);
  const needsProduct = category === 'produit';
  const showProducts = category === 'produit' || category === 'technique' || category === 'it';
  const categories = RECLAMATION_CATEGORIES.filter((c) => allowSupport || c.id !== 'support');

  useEffect(() => {
    if (!open) return;
    const nextCategory = reclamation?.category ?? 'demande';
    setTitle(reclamation?.title ?? '');
    setDescription(reclamation?.description ?? '');
    setCategory(allowSupport || nextCategory !== 'support' ? nextCategory : 'demande');
    setStatus(reclamation?.status ?? 'Open');
    setProductIds(reclamation?.productIds ?? []);
    setAssigneeIds(reclamation?.assigneeIds ?? []);
    setResponse(reclamation?.response ?? '');
    setError(null);
  }, [open, reclamation, allowSupport]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingAssignees(true);
    if (category === 'produit' && productIds.length === 0) {
      setAssignees([]);
      setLoadingAssignees(false);
      return;
    }
    const productFilter = category === 'produit' ? productIds : undefined;
    void listUsersByRole(roleSlug, productFilter)
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
  }, [open, roleSlug, category, productIds]);

  useEffect(() => {
    if (assignees.length === 0) return;
    setAssigneeIds((prev) => prev.filter((id) => assignees.some((u) => u.userId === id)));
  }, [assignees]);

  const selected = useMemo(
    () => assignees.filter((u) => assigneeIds.includes(u.userId)),
    [assignees, assigneeIds]
  );

  const input: ReclamationInput = useMemo(
    () => ({
      title,
      description,
      category,
      status,
      productIds: showProducts ? productIds : [],
      assigneeIds,
      assigneeName: selected.map(userLabel).join(', '),
      response,
    }),
    [title, description, category, status, productIds, showProducts, assigneeIds, selected, response]
  );

  const validationError = validateReclamationInput(input);
  const valid = !validationError;

  function toggleAssignee(userId: string) {
    setAssigneeIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function assignEveryoneOnProducts() {
    if (!roleSlug) return;
    if (category !== 'support' && productIds.length === 0) {
      setError('Select at least one product to assign everyone with this role.');
      return;
    }
    setAssigningAll(true);
    setError(null);
    try {
      const users = await listUsersByRole(
        roleSlug,
        category === 'support' ? undefined : productIds
      );
      setAssignees((prev) => {
        const byId = new Map(prev.map((u) => [u.userId, u]));
        for (const user of users) byId.set(user.userId, user);
        return [...byId.values()];
      });
      setAssigneeIds(users.map((u) => u.userId));
      if (users.length === 0) {
        setError('No users with this role are assigned to the selected products.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAssigningAll(false);
    }
  }

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
  const canAssignAll = !!roleSlug && (category === 'support' || productIds.length > 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-xl"
      title={isEdit ? 'Edit reclamation' : 'New reclamation'}
      subtitle="Choose the type, then assign the people who can see and treat it."
      footer={
        <>
          <Button variant="quiet" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void submit()} disabled={!valid || saving}>
            {saving ? 'Saving…' : isEdit ? 'Save' : 'Submit'}
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
              setAssigneeIds([]);
              setProductIds([]);
            }}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          {categoryMeta && <p className="mt-1 text-2xs text-mute">{categoryMeta.hint}</p>}
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

        {showProducts && (
          <ProductMultiSelect
            productIds={productIds}
            onChange={setProductIds}
            required={needsProduct}
          />
        )}

        <Field
          label={assigneeFieldLabel(category)}
          required={category !== 'demande'}
          hint={
            category === 'demande'
              ? 'Optional. Assigned people can reply.'
              : 'Only these people can see and treat this reclamation.'
          }
        >
          <div className="max-h-40 space-y-1 overflow-auto rounded-md border border-line-strong bg-ink-900 p-2">
            {loadingAssignees && <p className="px-1 text-2xs text-mute">Loading…</p>}
            {!loadingAssignees && assignees.length === 0 && (
              <p className="px-1 text-2xs text-orange">
                {category === 'produit' && productIds.length === 0
                  ? 'Select a product to list its Product Owners.'
                  : 'No matching users. Ask an admin to assign this role.'}
              </p>
            )}
            {assignees.map((u) => (
              <label
                key={u.userId}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs text-soft hover:bg-ink-800"
              >
                <input
                  type="checkbox"
                  checked={assigneeIds.includes(u.userId)}
                  disabled={!canReassign}
                  onChange={() => toggleAssignee(u.userId)}
                />
                <span className="min-w-0 truncate">{userLabel(u)}</span>
              </label>
            ))}
          </div>
          {roleSlug && (
            <button
              type="button"
              className="mt-2 text-xs text-brand-bright hover:text-strong disabled:opacity-40"
              disabled={!canAssignAll || assigningAll || !canReassign}
              onClick={() => void assignEveryoneOnProducts()}
            >
              {assigningAll
                ? 'Assigning…'
                : category === 'support'
                  ? 'Assign every administrator'
                  : 'Assign everyone with this role on the selected products'}
            </button>
          )}
        </Field>

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

        {isEdit && canReply && (
          <Field label="Reply" hint="Visible to people who can see this reclamation.">
            <textarea
              className={`${inputClass} min-h-[84px] resize-y`}
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Treatment or answer…"
            />
          </Field>
        )}

        {(error || (!valid && title.trim().length > 1)) && (
          <p className="text-2xs text-orange">{error ?? validationError}</p>
        )}
      </div>
    </Modal>
  );
}
