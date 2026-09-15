import React, { useEffect, useState } from 'react';
import { PlusIcon, ShieldIcon, Trash2Icon } from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Button, Field, inputClass } from '../../components/Primitives';
import { useAuth } from '../../contexts/AuthContext';
import {
  ACTION_LABEL,
  RBAC_ACTIONS,
  type AppRoleRecord,
  type RbacAction,
} from '../../lib/rbac';
import { deleteRole, fetchRoles, setRolePermissions, upsertRole } from '../../lib/rolesApi';

function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 48);
}

export function RolesSettingsPage() {
  const { can, refreshProfile } = useAuth();
  const [roles, setRoles] = useState<AppRoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppRoleRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);

  const [slug, setSlug] = useState('');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [seesAllProducts, setSeesAllProducts] = useState(false);
  const [permissions, setPermissions] = useState<RbacAction[]>([]);

  const isEdit = !!editing;
  const resolvedSlug = isEdit ? slug : slugify(label) || slug.trim();
  const valid = label.trim().length > 1 && resolvedSlug.length > 0;

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      setRoles(await fetchRoles());
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  if (!can('manage_users')) {
    return null;
  }

  function openCreate() {
    setEditing(null);
    setSlug('');
    setLabel('');
    setDescription('');
    setSeesAllProducts(false);
    setPermissions([]);
    setModalOpen(true);
  }

  function openEdit(role: AppRoleRecord) {
    setEditing(role);
    setSlug(role.slug);
    setLabel(role.label);
    setDescription(role.description);
    setSeesAllProducts(role.seesAllProducts);
    setPermissions([...role.permissions]);
    setModalOpen(true);
  }

  function togglePermission(action: RbacAction) {
    setPermissions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action]
    );
  }

  async function submit() {
    if (!valid) return;
    const nextSlug = isEdit ? editing!.slug : resolvedSlug;
    if (!nextSlug) return;
    setSaving(true);
    setError(null);
    try {
      await upsertRole({
        slug: nextSlug,
        label: label.trim(),
        description: description.trim(),
        seesAllProducts,
        isSystem: editing?.isSystem ?? false,
      });
      await setRolePermissions(nextSlug, permissions);
      setModalOpen(false);
      await reload();
      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(role: AppRoleRecord) {
    if (role.isSystem) return;
    if (
      !window.confirm(
        `Delete role “${role.label}”? Users must be reassigned first if any still use it.`
      )
    ) {
      return;
    }
    setDeletingSlug(role.slug);
    setError(null);
    try {
      await deleteRole(role.slug);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingSlug(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-strong">Roles</h2>
          <p className="mt-0.5 text-xs text-mute">
            Create roles and assign permissions. System roles can be edited but not deleted.
          </p>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <PlusIcon className="h-3.5 w-3.5" />
          Add role
        </Button>
      </div>

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}

      {loading ? (
        <p className="mt-8 text-sm text-mute">Loading roles…</p>
      ) : roles.length === 0 ? (
        <div className="mt-8 border-t border-line pt-12 text-center">
          <ShieldIcon className="mx-auto h-8 w-8 text-ink-500" />
          <p className="mt-3 text-sm text-soft">No roles found.</p>
          <p className="mt-1 text-xs text-mute">Apply the app_roles migration, then refresh.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-2xs uppercase tracking-[0.12em] text-ink-500">
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Permissions</th>
                <th className="py-2 pr-3 font-medium">Products</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.slug} className="border-b border-line/80">
                  <td className="py-3 pr-3 align-top">
                    <div className="font-medium text-strong">{role.label}</div>
                    <div className="mt-0.5 font-mono text-2xs text-ink-500">{role.slug}</div>
                    {role.isSystem && (
                      <span className="mt-1 inline-block text-2xs text-mute">System</span>
                    )}
                    {role.description && (
                      <p className="mt-1 max-w-xs text-2xs text-mute">{role.description}</p>
                    )}
                  </td>
                  <td className="py-3 pr-3 align-top text-xs text-soft">
                    {role.permissions.length === 0
                      ? 'None (read-only)'
                      : `${role.permissions.length} assigned`}
                  </td>
                  <td className="py-3 pr-3 align-top text-xs text-soft">
                    {role.seesAllProducts ? 'All products' : 'Assigned only'}
                  </td>
                  <td className="py-3 align-top">
                    <div className="flex flex-wrap gap-1.5">
                      <Button variant="quiet" onClick={() => openEdit(role)}>
                        Edit
                      </Button>
                      {!role.isSystem && (
                        <Button
                          variant="quiet"
                          disabled={deletingSlug === role.slug}
                          onClick={() => void onDelete(role)}
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                          {deletingSlug === role.slug ? 'Deleting…' : 'Delete'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        width="max-w-xl"
        title={isEdit ? 'Edit role' : 'Add role'}
        subtitle="Permissions control what users with this role can change in the app."
        footer={
          <>
            <Button variant="quiet" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void submit()} disabled={!valid || saving}>
              {saving ? 'Saving…' : isEdit ? 'Save role' : 'Create role'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Field label="Label" required>
            <input
              className={inputClass}
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                if (!isEdit) setSlug(slugify(e.target.value));
              }}
              placeholder="e.g. Release Manager"
              autoFocus
            />
          </Field>
          <Field label="Slug" required>
            <input
              className={inputClass}
              value={isEdit ? slug : slug || slugify(label)}
              onChange={(e) => setSlug(e.target.value)}
              disabled={isEdit}
              placeholder="release_manager"
            />
          </Field>
          <Field label="Description">
            <textarea
              className={`${inputClass} min-h-[72px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <label className="flex items-center gap-2 text-xs text-soft">
            <input
              type="checkbox"
              checked={seesAllProducts}
              onChange={(e) => setSeesAllProducts(e.target.checked)}
              className="rounded border-line-strong"
            />
            See all products (ignore product assignments)
          </label>
          <div>
            <p className="mb-2 text-xs font-medium text-soft">Permissions</p>
            <div className="grid max-h-56 gap-1.5 overflow-y-auto sm:grid-cols-2">
              {RBAC_ACTIONS.map((action) => (
                <label
                  key={action}
                  className="flex cursor-pointer items-start gap-2 rounded-md border border-line px-2 py-1.5 text-xs text-soft"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={permissions.includes(action)}
                    onChange={() => togglePermission(action)}
                  />
                  <span>
                    <span className="block text-strong">{ACTION_LABEL[action]}</span>
                    <span className="font-mono text-2xs text-ink-500">{action}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
