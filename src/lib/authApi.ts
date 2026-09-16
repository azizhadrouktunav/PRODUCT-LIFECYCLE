import { supabase } from '../utils/supabase';
import type { RbacAction } from './rbac';
import { isRbacAction } from './rbac';

const STORAGE_KEY = 'tunav.session';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  permissions: RbacAction[];
}

export interface AuthSession {
  token: string;
  expiresAt: string;
}

interface StoredSession {
  token: string;
  expiresAt: string;
}

function readStored(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed?.token || !parsed?.expiresAt) return null;
    if (new Date(parsed.expiresAt).getTime() <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return { token: parsed.token, expiresAt: parsed.expiresAt };
  } catch {
    return null;
  }
}

function writeStored(session: StoredSession | null): void {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable (private mode) — session stays in memory only */
  }
}

export function currentToken(): string | null {
  return readStored()?.token ?? null;
}

/** Header every privileged Edge Function expects. */
export function sessionHeaders(): Record<string, string> {
  const token = currentToken();
  return token ? { 'X-Session-Token': token } : {};
}

async function callFunction<T>(
  name: string,
  body: Record<string, unknown>,
  options: { withSession?: boolean } = {}
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, {
    body,
    headers: options.withSession === false ? undefined : sessionHeaders(),
  });

  if (data && typeof data === 'object' && 'error' in data && data.error) {
    throw new Error(String((data as { error: string }).error));
  }
  if (error) {
    // Non-2xx responses surface as FunctionsHttpError; recover the JSON message.
    const context = (error as { context?: Response }).context;
    if (context && typeof context.json === 'function') {
      try {
        const payload = (await context.json()) as { error?: string };
        if (payload?.error) throw new Error(payload.error);
      } catch (parsed) {
        if (parsed instanceof Error && parsed.message) throw parsed;
      }
    }
    throw new Error(error.message || `${name} failed`);
  }

  return data as T;
}

function mapUser(raw: unknown): AuthUser {
  const value = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(value.id ?? ''),
    email: String(value.email ?? ''),
    displayName: String(value.displayName ?? ''),
    role: String(value.role ?? ''),
    permissions: Array.isArray(value.permissions)
      ? value.permissions.map(String).filter(isRbacAction)
      : [],
  };
}

export interface SignInResult {
  session: AuthSession;
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<SignInResult> {
  const data = await callFunction<{ token: string; expiresAt: string; user: unknown }>(
    'auth-login',
    { email, password },
    { withSession: false }
  );
  const session = { token: data.token, expiresAt: data.expiresAt };
  writeStored(session);
  return { session, user: mapUser(data.user) };
}

/** Turn a stored token back into a user, or null when it is gone or expired. */
export async function restoreSession(): Promise<SignInResult | null> {
  const stored = readStored();
  if (!stored) return null;
  try {
    const data = await callFunction<{ user: unknown }>('auth-session', {});
    return { session: stored, user: mapUser(data.user) };
  } catch {
    writeStored(null);
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    if (currentToken()) await callFunction<{ ok: boolean }>('auth-logout', {});
  } finally {
    writeStored(null);
  }
}

export async function setPassword(
  token: string,
  password: string
): Promise<SignInResult> {
  const data = await callFunction<{ token: string; expiresAt: string; user: unknown }>(
    'auth-set-password',
    { token, password },
    { withSession: false }
  );
  const session = { token: data.token, expiresAt: data.expiresAt };
  writeStored(session);
  return { session, user: mapUser(data.user) };
}

export async function requestReset(email: string): Promise<void> {
  await callFunction<{ ok: boolean }>(
    'auth-request-reset',
    { email },
    { withSession: false }
  );
}
