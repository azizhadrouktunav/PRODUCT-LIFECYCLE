import React, { useEffect, useMemo, useState } from 'react';
import { PlusIcon, ShieldIcon, Trash2Icon } from 'lucide-react';
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
  upsertProfile,
  type AuthUserStatus,
} from '../../lib/profileApi';
import type { AppProfile, AppRoleRecord } from '../../lib/rbac';
import { roleDisplayLabel } from '../../lib/rbac';
import { fetchRoles } from '../../lib/rolesApi';

const selectClass =
  'rounded-md border border-line-strong bg-ink-800 px-2.5 py-1.5 text-xs text-soft transition-colors duration-150 ease-out focus:border-brand focus:outline-none';

export function UsersSettingsPage() {
  const { can, refreshProfile, user } = useAuth();
  const { products } = useRegistry();
  const [profiles, setProfiles] = useState<AppProfile[]>([]);
  const [roles, setRoles] = useState<AppRoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, AppProfile>>({});
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('product_owner');
  const [inviteProducts, setInviteProducts] = useState<string[]>([]);
  const [authStatuses, setAuthStatuses] = useState<Record<string, AuthUserStatus>>({});
  const [resendingId, setResendingId] = useState<string | null>(null);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products]
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
      setDrafts(Object.fromEntries(list.map((p) => [p.userId, { ...p }])));
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

  function patchDraft(userId: string, patch: Partial<AppProfile>) {
    setDrafts((prev) => ({
      ...prev,
      [userId]: { ...prev[userId], ...patch },
    }));
  }

  function toggleProduct(userId: string, productId: string) {
    const current = drafts[userId]?.productIds ?? [];
    const next = current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId];
    patchDraft(userId, { productIds: next });
  }

  function toggleInviteProduct(productId: string) {
    setInviteProducts((current) =>
      current.includes(productId)
        ? current.filter((id) => id !== productId)
        : [...current, productId]
    );
  }

  async function save(userId: string) {
    const draft = drafts[userId];
    if (!draft) return;
    setSavingId(userId);
    setError(null);
    try {
      const seesAll = roleSeesAllProducts(draft.role);
      await upsertProfile({
        ...draft,
        role: draft.role,
        displayName: draft.displayName.trim(),
        productIds: seesAll ? [] : draft.productIds,
      });
      if (user?.id === userId) await refreshProfile();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingId(null);
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
        `Delete user ${profile.displayName || profile.email}? This removes their Auth account and profile.`
      )
    ) {
      return;
    }
    setDeletingId(profile.userId);
    setError(null);
    try {
      await deleteUserAccount(profile.userId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingId(null);
    }
  }

  async function onResend(profile: AppProfile) {
    setResendingId(profile.userId);
    setError(null);
    try {
      await resendInvite(profile.userId);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setResendingId(null);
    }
  }

  async function submitInvite() {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !inviteRole) return;
    setInviting(true);
    setError(null);
    try {
      const seesAll = roleSeesAllProducts(inviteRole);
      await inviteUser({
        email,
        displayName: inviteName.trim(),
        role: inviteRole,
        productIds: seesAll ? [] : inviteProducts,
      });
      setInviteOpen(false);
      setInviteEmail('');
      setInviteName('');
      setInviteProducts([]);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setInviting(false);
    }
  }

  const inviteValid = inviteEmail.trim().includes('@') && !!inviteRole;
  const inviteSeesAll = roleSeesAllProducts(inviteRole);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-strong">Users</h2>
          <p className="mt-0.5 text-xs text-mute">
            Invite users by email, assign roles and products, or remove accounts.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setInviteOpen(true);
            setError(null);
          }}
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Invite user
        </Button>
      </div>

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}

      {loading ? (
        <p className="mt-8 text-sm text-mute">Loading profiles…</p>
      ) : profiles.length === 0 ? (
        <div className="mt-8 border-t border-line pt-12 text-center">
          <ShieldIcon className="mx-auto h-8 w-8 text-ink-500" />
          <p className="mt-3 text-sm text-soft">No profiles yet.</p>
          <p className="mt-1 text-xs text-mute">Invite a user to create their Auth account and profile.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {profiles.map((p) => {
            const draft = drafts[p.userId] ?? p;
            const draftSeesAll = roleSeesAllProducts(draft.role);
            const isPending = authStatuses[p.userId] === 'pending';
            return (
              <section key={p.userId} className="border-t border-line pt-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h3 className="text-base font-semibold text-strong">
                    {draft.displayName || draft.email || p.userId}
                  </h3>
                  <span className="font-mono text-2xs text-ink-500">{draft.email}</span>
                  <span className="text-2xs text-mute">
                    {roleDisplayLabel(draft.role, roles)}
                  </span>
                  {isPending && (
                    <span className="rounded border border-line-strong px-1.5 py-0.5 text-2xs text-mute">
                      Pending
                    </span>
                  )}
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Display name">
                    <input
                      className={inputClass}
                      value={draft.displayName}
                      onChange={(e) => patchDraft(p.userId, { displayName: e.target.value })}
                    />
                  </Field>
                  <Field label="Role">
                    <select
                      className={selectClass}
                      value={draft.role}
                      onChange={(e) => {
                        const nextRole = e.target.value;
                        const seesAll = roleSeesAllProducts(nextRole);
                        patchDraft(p.userId, {
                          role: nextRole,
                          ...(seesAll ? { productIds: [] } : {}),
                        });
                      }}
                    >
                      {roles.map((r) => (
                        <option key={r.slug} value={r.slug}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="mt-4">
                  {draftSeesAll ? (
                    <p className="text-xs text-mute">
                      This role can access all products — no assignment needed.
                    </p>
                  ) : (
                    <>
                      <p className="mb-1.5 text-xs font-medium text-soft">Assigned products</p>
                      <p className="mb-2 text-2xs text-mute">
                        Required for this role to see product-scoped data.
                      </p>
                      {sortedProducts.length === 0 ? (
                        <p className="text-xs text-mute">No products yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {sortedProducts.map((prod) => {
                            const active = draft.productIds.includes(prod.id);
                            return (
                              <button
                                key={prod.id}
                                type="button"
                                onClick={() => toggleProduct(p.userId, prod.id)}
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
                      )}
                    </>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="primary"
                    disabled={savingId === p.userId}
                    onClick={() => void save(p.userId)}
                  >
                    {savingId === p.userId ? 'Saving…' : 'Save'}
                  </Button>
                  {isPending && (
                    <Button
                      variant="quiet"
                      disabled={resendingId === p.userId}
                      onClick={() => void onResend(p)}
                    >
                      {resendingId === p.userId ? 'Resending…' : 'Resend invite'}
                    </Button>
                  )}
                  <Button
                    variant="quiet"
                    disabled={deletingId === p.userId || user?.id === p.userId}
                    onClick={() => void onDelete(p)}
                  >
                    <Trash2Icon className="h-3.5 w-3.5" />
                    {deletingId === p.userId ? 'Deleting…' : 'Delete'}
                  </Button>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        width="max-w-lg"
        title="Invite user"
        subtitle="Sends a Supabase invite email. The profile is created when the invite succeeds."
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
