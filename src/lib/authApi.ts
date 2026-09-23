import { supabase } from '../utils/supabase';
import type { AccessGrant } from './accessToken';
import { clearGrant, setGrantRefresher, storeGrant } from './accessToken';
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

// The session token outlives the JWT by days, so supabase-js asks for a new one
// through here whenever the one it holds is about to expire.
//
// This one call cannot go through supabase-js. Every request it sends asks for
// an access token first, so routing the refresh through it would re-enter the
// refresher before this request left the browser, and keep doing so until the
// stack gave out. Plain fetch has no such hook.
setGrantRefresher(async (): Promise<AccessGrant | null> => {
  const token = currentToken();
  if (!token) return null;

  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-session`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        'X-Session-Token': token,
      },
      body: '{}',
    }
  );
  if (!response.ok) return null;

  const data = (await response.json()) as Partial<AccessGrant>;
  return data?.accessToken && data?.accessTokenExpiresAt ? (data as AccessGrant) : null;
});

export async function login(email: string, password: string): Promise<SignInResult> {
  const data = await callFunction<{ token: string; expiresAt: string; user: unknown }>(
    'auth-login',
    { email, password },
    { withSession: false }
  );
  const session = { token: data.token, expiresAt: data.expiresAt };
  writeStored(session);
  storeGrant(data);
  return { session, user: mapUser(data.user) };
}

export type RegisterOutcome = {
  emailed: boolean;
  email: string;
  link?: string;
  emailError?: string;
};

/** Public self-registration. Returns a verify link; caller mails it via EmailJS. */
export async function registerAccount(payload: {
  email: string;
  password: string;
  displayName: string;
}): Promise<{ email: string; displayName: string; link: string; expiresAt: string }> {
  const data = await callFunction<{
    email?: string;
    displayName?: string;
    link?: string;
    expiresAt?: string;
  }>('register-user', payload, { withSession: false });
  const link = String(data.link ?? '');
  const email = String(data.email ?? payload.email);
  if (!link) throw new Error('Registration did not return a verification link');
  return {
    email,
    displayName: String(data.displayName ?? payload.displayName),
    link,
    expiresAt: String(data.expiresAt ?? ''),
  };
}

export async function verifyEmailToken(token: string): Promise<string> {
  const data = await callFunction<{ message?: string }>(
    'verify-email',
    { token },
    { withSession: false }
  );
  return String(
    data.message ??
      'Email verified. An administrator must activate your account before you can sign in.'
  );
}

/** Turn a stored token back into a user, or null when it is gone or expired. */
export async function restoreSession(): Promise<SignInResult | null> {
  const stored = readStored();
  if (!stored) return null;
  try {
    const data = await callFunction<{ user: unknown }>('auth-session', {});
    storeGrant(data);
    return { session: stored, user: mapUser(data.user) };
  } catch {
    writeStored(null);
    clearGrant();
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    if (currentToken()) await callFunction<{ ok: boolean }>('auth-logout', {});
  } finally {
    writeStored(null);
    clearGrant();
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
  storeGrant(data);
  return { session, user: mapUser(data.user) };
}
