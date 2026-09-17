// The signed JWT that gives PostgREST an identity for the current user.
//
// It lives apart from authApi so utils/supabase can read it without importing
// the module that imports the client back. authApi registers the refresher,
// which trades the long-lived session token for a fresh JWT through
// auth-session.

const STORAGE_KEY = 'tunav.access';

/** Refresh a minute early so a request never travels with a dead token. */
const REFRESH_MARGIN_MS = 60_000;

export interface AccessGrant {
  accessToken: string;
  accessTokenExpiresAt: string;
}

let refresher: (() => Promise<AccessGrant | null>) | null = null;
let pending: Promise<string | null> | null = null;

function read(): AccessGrant | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AccessGrant>;
    if (!parsed?.accessToken || !parsed?.accessTokenExpiresAt) return null;
    return {
      accessToken: parsed.accessToken,
      accessTokenExpiresAt: parsed.accessTokenExpiresAt,
    };
  } catch {
    return null;
  }
}

function write(grant: AccessGrant | null): void {
  try {
    if (grant) localStorage.setItem(STORAGE_KEY, JSON.stringify(grant));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage unavailable (private mode) — the next refresh re-mints it */
  }
}

function usable(grant: AccessGrant | null): grant is AccessGrant {
  if (!grant) return false;
  const expiry = new Date(grant.accessTokenExpiresAt).getTime();
  return Number.isFinite(expiry) && expiry - Date.now() > REFRESH_MARGIN_MS;
}

/** Keep whatever grant an auth response carried, ignoring responses without one. */
export function storeGrant(payload: unknown): void {
  const value = (payload ?? {}) as Partial<AccessGrant>;
  if (!value.accessToken || !value.accessTokenExpiresAt) return;
  write({
    accessToken: value.accessToken,
    accessTokenExpiresAt: value.accessTokenExpiresAt,
  });
}

export function clearGrant(): void {
  write(null);
}

export function setGrantRefresher(fn: () => Promise<AccessGrant | null>): void {
  refresher = fn;
}

/**
 * What supabase-js sends as the Authorization header. Concurrent callers share
 * one refresh so a page load does not fire auth-session once per query.
 */
export async function currentAccessToken(): Promise<string | null> {
  const stored = read();
  if (usable(stored)) return stored.accessToken;
  if (!refresher) return null;

  pending ??= refresher()
    .then((grant) => {
      if (!grant?.accessToken) {
        write(null);
        return null;
      }
      write(grant);
      return grant.accessToken;
    })
    .catch(() => null)
    .finally(() => {
      pending = null;
    });

  return pending;
}
