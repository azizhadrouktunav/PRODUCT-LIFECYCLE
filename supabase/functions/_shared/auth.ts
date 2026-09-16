import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { jsonResponse } from "./cors.ts";
import { expiresIn, randomToken, sha256Hex, SESSION_TTL_HOURS } from "./tokens.ts";

export type AdminClient = SupabaseClient;

export function adminClient(): AdminClient {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
  permissions: string[];
}

export interface CreatedSession {
  token: string;
  expiresAt: string;
}

/** Issue a fresh session for a user and return the plaintext token. */
export async function createSession(
  admin: AdminClient,
  userId: string
): Promise<CreatedSession> {
  const token = randomToken();
  const expiresAt = expiresIn(SESSION_TTL_HOURS);
  const { error } = await admin.from("app_sessions").insert({
    token_hash: await sha256Hex(token),
    user_id: userId,
    expires_at: expiresAt,
  });
  if (error) throw new Error(`Create session: ${error.message}`);
  return { token, expiresAt };
}

export async function revokeSession(
  admin: AdminClient,
  token: string
): Promise<void> {
  await admin
    .from("app_sessions")
    .delete()
    .eq("token_hash", await sha256Hex(token));
}

export async function revokeAllSessions(
  admin: AdminClient,
  userId: string
): Promise<void> {
  await admin.from("app_sessions").delete().eq("user_id", userId);
}

export function sessionToken(req: Request): string {
  return (req.headers.get("X-Session-Token") ?? "").trim();
}

/** Resolve the session token into a user with role + permissions, or null. */
export async function resolveSession(
  admin: AdminClient,
  token: string
): Promise<SessionUser | null> {
  if (!token) return null;

  const tokenHash = await sha256Hex(token);
  const { data: session, error } = await admin
    .from("app_sessions")
    .select("user_id, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error || !session) return null;

  if (new Date(String(session.expires_at)).getTime() <= Date.now()) {
    await admin.from("app_sessions").delete().eq("token_hash", tokenHash);
    return null;
  }

  const userId = String(session.user_id);

  const { data: account } = await admin
    .from("app_users")
    .select("id, email, disabled")
    .eq("id", userId)
    .maybeSingle();
  if (!account || account.disabled) return null;

  const { data: profile } = await admin
    .from("app_profiles")
    .select("display_name, role")
    .eq("user_id", userId)
    .maybeSingle();

  let permissions: string[] = [];
  if (profile?.role) {
    const { data: perms } = await admin
      .from("app_role_permissions")
      .select("action")
      .eq("role_slug", profile.role);
    permissions = (perms ?? []).map((p) => String((p as { action: string }).action));
  }

  await admin
    .from("app_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("token_hash", tokenHash);

  return {
    id: userId,
    email: String(account.email ?? ""),
    displayName: String(profile?.display_name ?? ""),
    role: String(profile?.role ?? ""),
    permissions,
  };
}

type Guard =
  | { error: Response }
  | { user: SessionUser; admin: AdminClient };

export async function requireSession(req: Request): Promise<Guard> {
  const admin = adminClient();
  const user = await resolveSession(admin, sessionToken(req));
  if (!user) {
    return { error: jsonResponse({ error: "Unauthorized" }, 401) };
  }
  return { user, admin };
}

export async function requirePermission(
  req: Request,
  action: string
): Promise<Guard> {
  const guard = await requireSession(req);
  if ("error" in guard) return guard;
  const { user, admin } = guard;
  if (!user.permissions.includes(action) && !user.permissions.includes("edit_all")) {
    return { error: jsonResponse({ error: `Forbidden: ${action} required` }, 403) };
  }
  return { user, admin };
}
