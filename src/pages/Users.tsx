import React, { useEffect, useMemo, useState } from 'react';
import { ShieldIcon } from 'lucide-react';
import { Button, Field, PageHeader, inputClass } from '../components/Primitives';
import { useAuth } from '../contexts/AuthContext';
import { useRegistry } from '../contexts/RegistryContext';
import { fetchProfiles, upsertProfile } from '../lib/profileApi';
import type { AppProfile, AppRole } from '../lib/rbac';
import { APP_ROLES, ROLE_LABEL } from '../lib/rbac';

const selectClass =
  'rounded-md border border-line-strong bg-ink-800 px-2.5 py-1.5 text-xs text-soft transition-colors duration-150 ease-out focus:border-brand focus:outline-none';

export function UsersPage() {
  const { can, refreshProfile, user } = useAuth();
  const { products } = useRegistry();
  const [profiles, setProfiles] = useState<AppProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, AppProfile>>({});

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products]
  );

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchProfiles();
      setProfiles(list);
      setDrafts(Object.fromEntries(list.map((p) => [p.userId, { ...p }])));
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
    return (
      <div className="py-16 text-center text-sm text-mute">
        Only Administrators can manage users.
      </div>
    );
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

  async function save(userId: string) {
    const draft = drafts[userId];
    if (!draft) return;
    setSavingId(userId);
    setError(null);
    try {
      await upsertProfile({
        ...draft,
        role: draft.role,
        displayName: draft.displayName.trim(),
        productIds: draft.productIds,
      });
      if (user?.id === userId) await refreshProfile();
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        count={`${profiles.length} profiles`}
        description="Assign roles and products. Create accounts in Supabase Auth first, then insert a row in app_profiles (or ask an admin to seed it)."
      />

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}

      {loading ? (
        <p className="mt-8 text-sm text-mute">Loading profiles…</p>
      ) : profiles.length === 0 ? (
        <div className="mt-8 border-t border-line pt-12 text-center">
          <ShieldIcon className="mx-auto h-8 w-8 text-ink-500" />
          <p className="mt-3 text-sm text-soft">No profiles yet.</p>
          <p className="mt-1 text-xs text-mute">
            After creating a user in Supabase Auth, run:
          </p>
          <pre className="mx-auto mt-3 max-w-xl overflow-x-auto rounded-md border border-line bg-ink-800 p-3 text-left font-mono text-2xs text-mute">
            {`insert into public.app_profiles (user_id, email, display_name, role, product_ids)
values ('<uuid>', 'user@example.com', 'Name', 'administrator', '{}');`}
          </pre>
        </div>
      ) : (
        <div className="mt-4 space-y-6">
          {profiles.map((p) => {
            const draft = drafts[p.userId] ?? p;
            return (
              <section key={p.userId} className="border-t border-line pt-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <h2 className="text-base font-semibold text-strong">
                    {draft.displayName || draft.email || p.userId}
                  </h2>
                  <span className="font-mono text-2xs text-ink-500">{draft.email}</span>
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
                      onChange={(e) =>
                        patchDraft(p.userId, { role: e.target.value as AppRole })
                      }
                    >
                      {APP_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="mt-4">
                  <p className="mb-1.5 text-xs font-medium text-soft">Assigned products</p>
                  <p className="mb-2 text-2xs text-mute">
                    Leave empty for Admin/CEO (they see all). Required for other roles to see
                    product data.
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
                </div>

                <div className="mt-4">
                  <Button
                    variant="primary"
                    disabled={savingId === p.userId}
                    onClick={() => void save(p.userId)}
                  >
                    {savingId === p.userId ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
