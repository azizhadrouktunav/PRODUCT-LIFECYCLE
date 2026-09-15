import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import { fetchProfile, upsertProfile } from '../lib/profileApi';
import type { AppProfile, AppRole, RbacAction } from '../lib/rbac';
import {
  can as rbacCan,
  canSetCapabilityProgress,
  canSetStoryStage,
  capabilityVisibleToUser,
  isReadOnlyRole,
  productVisibleToUser,
  seesAllProducts,
} from '../lib/rbac';
import type { Capability } from '../types/registry';

interface AuthValue {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: AppProfile | null;
  profileMissing: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  can: (action: RbacAction) => boolean;
  canSetCapabilityProgress: (stage: string) => boolean;
  canSetStoryStage: (stage: string) => boolean;
  seesAllProducts: boolean;
  isReadOnly: boolean;
  assignedProductIds: string[];
  role: AppRole | null;
  capabilityVisible: (c: Pick<Capability, 'productIds'>) => boolean;
  productVisible: (productId: string) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [profileMissing, setProfileMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async (user: User | null) => {
    if (!user) {
      setProfile(null);
      setProfileMissing(false);
      return;
    }
    try {
      const p = await fetchProfile(user.id);
      if (!p) {
        setProfile(null);
        setProfileMissing(true);
      } else {
        setProfile(p);
        setProfileMissing(false);
        if (!p.email && user.email) {
          const updated = { ...p, email: user.email };
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
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      await loadProfile(data.session?.user ?? null);
      if (mounted) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      void loadProfile(next?.user ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) throw new Error(err.message);
  }, []);

  const signOut = useCallback(async () => {
    setError(null);
    await supabase.auth.signOut();
    setProfile(null);
    setProfileMissing(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user ?? null);
  }, [loadProfile, session?.user]);

  const role = profile?.role ?? null;
  const assignedProductIds = profile?.productIds ?? [];

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      session,
      user: session?.user ?? null,
      profile,
      profileMissing,
      error,
      signIn,
      signOut,
      refreshProfile,
      can: (action) => rbacCan(role, action),
      canSetCapabilityProgress: (stage) => canSetCapabilityProgress(role, stage),
      canSetStoryStage: (stage) => canSetStoryStage(role, stage),
      seesAllProducts: seesAllProducts(role),
      isReadOnly: isReadOnlyRole(role),
      assignedProductIds,
      role,
      capabilityVisible: (c) => capabilityVisibleToUser(c, role, assignedProductIds),
      productVisible: (id) => productVisibleToUser(id, role, assignedProductIds),
    }),
    [
      loading,
      session,
      profile,
      profileMissing,
      error,
      signIn,
      signOut,
      refreshProfile,
      role,
      assignedProductIds,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
