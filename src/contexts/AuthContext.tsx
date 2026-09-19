import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { AuthSession, AuthUser, SignInResult } from '../lib/authApi';
import {
  login as loginRequest,
  logout as logoutRequest,
  restoreSession,
} from '../lib/authApi';
import { fetchProfile, upsertProfile } from '../lib/profileApi';
import type { AppProfile, AppRole, RbacAction } from '../lib/rbac';
import {
  canSetCapabilityProgressWithPermissions,
  canSetStoryStageWithPermissions,
  canWithPermissions,
  capabilityVisibleToUser,
  entityVisibleToUser,
  isReadOnlyFromPermissions,
  productVisibleToUser,
  roleDisplayLabel,
  seesAllProductsFromFlag,
} from '../lib/rbac';
import type { Capability } from '../types/registry';

interface AuthValue {
  loading: boolean;
  session: AuthSession | null;
  user: AuthUser | null;
  profile: AppProfile | null;
  profileMissing: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  adoptSession: (result: SignInResult) => Promise<void>;
  refreshProfile: () => Promise<void>;
  can: (action: RbacAction) => boolean;
  canSetCapabilityProgress: (stage: string) => boolean;
  canSetStoryStage: (stage: string) => boolean;
  seesAllProducts: boolean;
  isReadOnly: boolean;
  assignedProductIds: string[];
  role: AppRole | null;
  roleLabel: string;
  permissions: RbacAction[];
  capabilityVisible: (c: Pick<Capability, 'productIds'>) => boolean;
  productVisible: (productId: string) => boolean;
  entityVisible: (productIds: string[] | null | undefined) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (account: AuthUser | null) => {
    if (!account) {
      setProfile(null);
      setProfileMissing(false);
      return;
    }
    try {
      const p = await fetchProfile(account.id);
      if (!p) {
        setProfile(null);
        setProfileMissing(true);
      } else {
        setProfile(p);
        setProfileMissing(false);
        if (!p.email && account.email) {
          const updated = { ...p, email: account.email };
          setProfile(updated);
          void upsertProfile(updated).catch(() => undefined);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const restored = await restoreSession();
      if (!mounted) return;
      setSession(restored?.session ?? null);
      setUser(restored?.user ?? null);
      await loadProfile(restored?.user ?? null);
      if (mounted) setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [loadProfile]);

  const adoptSession = useCallback(
    async (result: SignInResult) => {
      setSession(result.session);
      setUser(result.user);
      await loadProfile(result.user);
    },
    [loadProfile]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      setError(null);
      const result = await loginRequest(email, password);
      await adoptSession(result);
    },
    [adoptSession]
  );

  const signOut = useCallback(async () => {
    setError(null);
    await logoutRequest();
    setSession(null);
    setUser(null);
    setProfile(null);
    setProfileMissing(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(user);
  }, [loadProfile, user]);

  const role = profile?.role ?? null;
  const permissions = profile?.permissions ?? [];
  const assignedProductIds = profile?.productIds ?? [];
  const seesAll = seesAllProductsFromFlag(profile?.seesAllProducts);

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      session,
      user,
      profile,
      profileMissing,
      error,
      signIn,
      signOut,
      adoptSession,
      refreshProfile,
      can: (action) => canWithPermissions(permissions, action),
      canSetCapabilityProgress: (stage) =>
        canSetCapabilityProgressWithPermissions(permissions, stage),
      canSetStoryStage: (stage) => canSetStoryStageWithPermissions(permissions, stage),
      seesAllProducts: seesAll,
      isReadOnly: isReadOnlyFromPermissions(permissions),
      assignedProductIds,
      role,
      roleLabel: roleDisplayLabel(
        role,
        profile?.roleLabel ? [{ slug: role!, label: profile.roleLabel }] : null
      ),
      permissions,
      capabilityVisible: (c) => capabilityVisibleToUser(c, seesAll, assignedProductIds),
      productVisible: (id) => productVisibleToUser(id, seesAll, assignedProductIds),
      entityVisible: (ids) => entityVisibleToUser(ids, seesAll, assignedProductIds),
    }),
    [
      loading,
      session,
      user,
      profile,
      profileMissing,
      error,
      signIn,
      signOut,
      adoptSession,
      refreshProfile,
      role,
      permissions,
      assignedProductIds,
      seesAll,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
