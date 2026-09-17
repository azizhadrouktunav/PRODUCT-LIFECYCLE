import { useEffect, useMemo, useState } from 'react';
import {
  CheckIcon,
  CopyIcon,
  KeyRoundIcon,
  MailIcon,
  PencilIcon,
  PlusIcon,
  ShieldIcon,
  Trash2Icon,
} from 'lucide-react';
import { Modal } from '../../components/Modal';
import { Button, Field, inputClass } from '../../components/Primitives';
import { useAuth } from '../../contexts/AuthContext';
import { useRegistry } from '../../contexts/RegistryContext';
import {
  deleteUserAccount,
  fetchAuthStatuses,
  fetchProfiles,
  inviteUser,
  resendInvite,
  resetPassword,
  upsertProfile,
  type AuthUserStatus,
  type SendOutcome,
} from '../../lib/profileApi';
import type { AppProfile, AppRoleRecord } from '../../lib/rbac';
import { roleDisplayLabel } from '../../lib/rbac';
import { fetchRoles } from '../../lib/rolesApi';

const selectClass =
  'rounded-md border border-line-strong bg-ink-800 px-2.5 py-1.5 text-xs text-soft transition-colors duration-150 ease-out focus:border-brand focus:outline-none';

function statusLabel(status: AuthUserStatus | undefined): 'Active' | 'Inactive' {
  return status === 'active' ? 'Active' : 'Inactive';
}

export function UsersSettingsPage() {
  const { can, refreshProfile, user } = useAuth();
  const { products } = useRegistry();
  const [profiles, setProfiles] = useState<AppProfile[]>([]);
  const [roles, setRoles] = useState<AppRoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [manualLink, setManualLink] = useState<
    { email: string; url: string; reason: string } | null
  >(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [authStatuses, setAuthStatuses] = useState<Record<string, AuthUserStatus>>({});

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('product_owner');
  const [inviteProducts, setInviteProducts] = useState<string[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<AppProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editProducts, setEditProducts] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  );

  const sortedProfiles = useMemo(
    () =>
      [...profiles].sort((a, b) =>
        (a.displayName || a.email).localeCompare(b.displayName || b.email)
      ),
    [profiles]
  );

  const adminCount = useMemo(
    () => profiles.filter((p) => p.role === 'administrator').length,
    [profiles]
  );

  function roleSeesAllProducts(slug: string): boolean {
    return !!roles.find((r) => r.slug === slug)?.seesAllProducts;
  }

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const [list, roleList, statuses] = await Promise.all([
        fetchProfiles(),
        fetchRoles(),
        fetchAuthStatuses().catch(() => ({} as Record<string, AuthUserStatus>)),
      ]);
      setProfiles(list);
      setRoles(roleList);
      setAuthStatuses(statuses);
      if (roleList.length && !roleList.some((r) => r.slug === inviteRole)) {
        setInviteRole(roleList[0].slug);
      }
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

  function openEdit(profile: AppProfile) {
    setEditing(profile);
    setEditName(profile.displayName);
    setEditRole(profile.role);
    setEditProducts([...profile.productIds]);
    setEditOpen(true);
    setError(null);
    setMessage(null);
  }

  function toggleEditProduct(productId: string) {
    setEditProducts((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  }

  function toggleInviteProduct(productId: string) {
    setInviteProducts((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  }

  function clearFeedback() {
    setError(null);
    setMessage(null);
    setManualLink(null);
    setLinkCopied(false);
  }

  /** Resend may refuse the recipient; the returned link still works. */
  function applyOutcome(outcome: SendOutcome, email: string, sent: string) {
    if (outcome.emailed) {
      setMessage(sent);
    } else if (outcome.link) {
      setManualLink({ email, url: outcome.link, reason: outcome.emailError ?? '' });
    } else {
      setError(outcome.emailError ?? 'The email could not be delivered.');
    }
  }

  async function copyManualLink() {
    if (!manualLink) return;
    try {
      await navigator.clipboard.writeText(manualLink.url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard — select the link and copy it manually.');
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const seesAll = roleSeesAllProducts(editRole);
      await upsertProfile({
        ...editing,
        displayName: editName.trim(),
        role: editRole,
        productIds: seesAll ? [] : editProducts,
      });
      if (user?.id === editing.userId) await refreshProfile();
      setEditOpen(false);
      setEditing(null);
      setMessage('User updated.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(profile: AppProfile) {
    if (user?.id === profile.userId) {
      setError('You cannot delete your own account.');
      return;
    }
    if (profile.role === 'administrator' && adminCount <= 1) {
      setError('Cannot delete the last administrator.');
      return;
    }
    if (
      !window.confirm(
        `Delete user ${profile.displayName || profile.email}? This removes their account and profile.`
      )
    ) {
      return;
    }
    setBusyId(profile.userId);
    setError(null);
    setMessage(null);
    try {
      await deleteUserAccount(profile.userId);
      setMessage('User deleted.');
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function onResend(profile: AppProfile) {
    setBusyId(profile.userId);
    clearFeedback();
    try {
      const outcome = await resendInvite(profile.userId);
      applyOutcome(outcome, profile.email, `Invite resent to ${profile.email}.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function onResetPassword(profile: AppProfile) {
    if (
      !window.confirm(
        `Send a password reset email to ${profile.email}?`
      )
    ) {
      return;
    }
    setBusyId(profile.userId);
    clearFeedback();
    try {
      const outcome = await resetPassword(profile.userId);
      applyOutcome(
        outcome,
        profile.email,
        `Password reset email sent to ${profile.email}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  async function submitInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !inviteRole) return;
    setInviting(true);
    clearFeedback();
    try {
      const seesAll = roleSeesAllProducts(inviteRole);
      const outcome = await inviteUser({
        email,
        displayName: inviteName.trim(),
        role: inviteRole,
        productIds: seesAll ? [] : inviteProducts,
      });
      setInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteProducts([]);
      applyOutcome(outcome, email, `Invite sent to ${email}.`);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setInviting(false);
    }
  }

  const inviteValid = inviteEmail.trim().includes('@') && !!inviteRole;
  const inviteSeesAll = roleSeesAllProducts(inviteRole);
  const editSeesAll = roleSeesAllProducts(editRole);
  const editValid = editName.trim().length > 0 && !!editRole;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-strong">Users</h2>
          <p className="mt-0.5 text-xs text-mute">
            Invite users, manage roles, and reset access.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setInviteOpen(true);
            clearFeedback();
          }}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Invite user
        </Button>
      </div>

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}
      {message && <p className="mt-3 text-xs text-soft">{message}</p>}

      {manualLink && (
        <div className="mt-3 rounded-md border border-warn/40 bg-ink-800 p-3">
          <p className="text-xs text-soft">
            The email could not be delivered to{' '}
            <span className="text-strong">{manualLink.email}</span>. This link is
            valid — share it with them directly.
          </p>
          {manualLink.reason && (
            <p className="mt-1 text-2xs text-mute">{manualLink.reason}</p>
          )}
          <div className="mt-2 flex items-start gap-2">
            <code className="flex-1 break-all rounded bg-ink-900 px-2 py-1.5 font-mono text-2xs text-soft">
              {manualLink.url}
            </code>
            <Button variant="ghost" onClick={() => void copyManualLink()}>
              {linkCopied ? (
                <CheckIcon className="h-3.5 w-3.5" />
              ) : (
                <CopyIcon className="h-3.5 w-3.5" />
              )}
              {linkCopied ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-mute">Loading profiles…</p>
      ) : sortedProfiles.length === 0 ? (
        <div className="mt-8 border-t border-line pt-12 text-center">
          <ShieldIcon className="mx-auto h-8 w-8 text-ink-500" />
          <p className="mt-3 text-sm text-soft">No profiles yet.</p>
          <p className="mt-1 text-xs text-mute">
            Invite a user to create their account and profile.
          </p>
        </div>
      ) : (
        <div className="scroll-thin mt-4 max-h-[min(70vh,720px)] overflow-auto border-t border-line">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-ink-900">
              <tr className="text-2xs uppercase tracking-[0.14em] text-ink-500">
                <th className="py-2.5 pr-4 font-medium">Name</th>
                <th className="py-2.5 pr-4 font-medium">Email</th>
                <th className="py-2.5 pr-4 font-medium">Role</th>
                <th className="w-28 py-2.5 pr-4 font-medium">Status</th>
                <th className="w-40 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedProfiles.map((p) => {
                const status = authStatuses[p.userId];
                const label = statusLabel(status);
                const isInactive = label === 'Inactive';
                const isBusy = busyId === p.userId;
                return (
                  <tr key={p.userId} className="border-t border-line-soft align-middle">
                    <td className="py-3 pr-4 text-sm font-medium text-strong">
                      {p.displayName || '—'}
                    </td>
                    <td className="py-3 pr-4 font-mono text-2xs text-mute">{p.email || '—'}</td>
                    <td className="py-3 pr-4 text-xs text-soft">
                      {roleDisplayLabel(p.role, roles)}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-block rounded border px-1.5 py-0.5 text-2xs ${
                          label === 'Active'
                            ? 'border-brand/40 text-strong'
                            : 'border-line-strong text-mute'
                        }`}
                      >
                        {label}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="inline-flex items-center gap-0.5">
                        <button
                          type="button"
                          aria-label={`Edit ${p.displayName || p.email}`}
                          title="Edit"
                          disabled={isBusy}
                          onClick={() => openEdit(p)}
                          className="rounded p-1.5 text-mute transition-colors duration-150 ease-out hover:bg-ink-700 hover:text-strong disabled:opacity-40"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        {isInactive ? (
                          <button
                            type="button"
                            aria-label={`Resend invite to ${p.email}`}
                            title="Resend invite"
                            disabled={isBusy}
                            onClick={() => void onResend(p)}
                            className="rounded p-1.5 text-mute transition-colors duration-150 ease-out hover:bg-ink-700 hover:text-strong disabled:opacity-40"
                          >
                            <MailIcon className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            aria-label={`Reset password for ${p.email}`}
                            title="Reset password"
                            disabled={isBusy}
                            onClick={() => void onResetPassword(p)}
                            className="rounded p-1.5 text-mute transition-colors duration-150 ease-out hover:bg-ink-700 hover:text-strong disabled:opacity-40"
                          >
                            <KeyRoundIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={`Delete ${p.displayName || p.email}`}
                          title="Delete"
                          disabled={isBusy || user?.id === p.userId}
                          onClick={() => void onDelete(p)}
                          className="rounded p-1.5 text-mute transition-colors duration-150 ease-out hover:bg-ink-700 hover:text-danger disabled:opacity-40"
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditing(null);
        }}
        width="max-w-lg"
        title="Edit user"
        subtitle={editing?.email || undefined}
        footer={
          <>
            <Button
              variant="quiet"
              onClick={() => {
                setEditOpen(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!editValid || saving}
              onClick={() => void saveEdit()}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Field label="Display name" required>
            <input
              className={inputClass}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Role" required>
            <select
              className={selectClass}
              value={editRole}
              onChange={(e) => {
                const nextRole = e.target.value;
                setEditRole(nextRole);
                if (roleSeesAllProducts(nextRole)) setEditProducts([]);
              }}
            >
              {roles.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          {editSeesAll ? (
            <p className="text-xs text-mute">
              This role can access all products — no assignment needed.
            </p>
          ) : (
            <div>
              <p className="mb-1.5 text-xs font-medium text-soft">Assigned products</p>
              <div className="flex flex-wrap gap-1.5">
                {sortedProducts.map((prod) => {
                  const active = editProducts.includes(prod.id);
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => toggleEditProduct(prod.id)}
                      className={`rounded-md border px-2.5 py-1 text-xs transition-colors duration-150 ease-out ${
                        active
                          ? 'border-brand bg-brand/10 text-strong'
                          : 'border-line-strong text-mute hover:border-brand'
                      }`}
                    >
                      {prod.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        width="max-w-lg"
        title="Invite user"
        subtitle="Emails a link to set a password. If the email cannot be delivered, the link is shown here so you can share it yourself."
        footer={
          <>
            <Button variant="quiet" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!inviteValid || inviting}
              onClick={() => void submitInvite()}
            >
              {inviting ? 'Sending…' : 'Send invite'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Field label="Email" required>
            <input
              className={inputClass}
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="user@example.com"
              autoFocus
            />
          </Field>
          <Field label="Display name">
            <input
              className={inputClass}
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Full name"
            />
          </Field>
          <Field label="Role" required>
            <select
              className={selectClass}
              value={inviteRole}
              onChange={(e) => {
                const nextRole = e.target.value;
                setInviteRole(nextRole);
                if (roleSeesAllProducts(nextRole)) setInviteProducts([]);
              }}
            >
              {roles.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.label}
                </option>
              ))}
            </select>
          </Field>
          {inviteSeesAll ? (
            <p className="text-xs text-mute">
              This role can access all products — no assignment needed.
            </p>
          ) : (
            <div>
              <p className="mb-1.5 text-xs font-medium text-soft">Assigned products</p>
              <div className="flex flex-wrap gap-1.5">
                {sortedProducts.map((prod) => {
                  const active = inviteProducts.includes(prod.id);
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => toggleInviteProduct(prod.id)}
                      className={`rounded-md border px-2.5 py-1 text-xs transition-colors duration-150 ease-out ${
                        active
                          ? 'border-brand bg-brand/10 text-strong'
                          : 'border-line-strong text-mute hover:border-brand'
                      }`}
                    >
                      {prod.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
