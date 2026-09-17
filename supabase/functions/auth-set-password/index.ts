import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { jsonResponse, preflight } from "../_shared/cors.ts";
import {
  adminClient,
  createSession,
  resolveSession,
  revokeAllSessions,
} from "../_shared/auth.ts";
import { accessGrant } from "../_shared/jwt.ts";
import { hashPassword, passwordProblem } from "../_shared/password.ts";
import { sha256Hex } from "../_shared/tokens.ts";

// Consumes an invite or reset token and activates the account.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as { token?: string; password?: string };
    const token = String(body.token ?? "").trim();
    const password = String(body.password ?? "");

    if (!token) return jsonResponse({ error: "Missing token" }, 400);

    const problem = passwordProblem(password);
    if (problem) return jsonResponse({ error: problem }, 400);

    const admin = adminClient();
    const tokenHash = await sha256Hex(token);

    const { data: row, error } = await admin
      .from("app_user_tokens")
      .select("user_id, kind, expires_at, used_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (error) return jsonResponse({ error: error.message }, 500);

    if (!row || row.used_at) {
      return jsonResponse({ error: "This link is no longer valid" }, 400);
    }
    if (new Date(String(row.expires_at)).getTime() <= Date.now()) {
      return jsonResponse({ error: "This link has expired" }, 400);
    }

    const userId = String(row.user_id);

    const { data: account } = await admin
      .from("app_users")
      .select("id, disabled")
      .eq("id", userId)
      .maybeSingle();
    if (!account || account.disabled) {
      return jsonResponse({ error: "This account is not available" }, 403);
    }

    const { error: updateError } = await admin
      .from("app_users")
      .update({ password_hash: await hashPassword(password) })
      .eq("id", userId);
    if (updateError) return jsonResponse({ error: updateError.message }, 500);

    await admin
      .from("app_user_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("token_hash", tokenHash);

    // Any other pending link for this user becomes void, and existing
    // sessions are dropped so a stolen session cannot survive a reset.
    await admin
      .from("app_user_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("used_at", null);
    await revokeAllSessions(admin, userId);

    const session = await createSession(admin, userId);
    const user = await resolveSession(admin, session.token);

    return jsonResponse({
      token: session.token,
      expiresAt: session.expiresAt,
      ...(await accessGrant(userId)),
      user,
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
