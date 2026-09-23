import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { jsonResponse, preflight } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { sha256Hex } from "../_shared/tokens.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as { token?: string };
    const token = String(body.token ?? "").trim();
    if (!token) return jsonResponse({ error: "Verification token is required" }, 400);

    const admin = adminClient();
    const tokenHash = await sha256Hex(token);
    const { data: row, error } = await admin
      .from("app_user_tokens")
      .select("token_hash, user_id, expires_at, used_at, kind")
      .eq("token_hash", tokenHash)
      .eq("kind", "verify")
      .maybeSingle();
    if (error) return jsonResponse({ error: error.message }, 500);
    if (!row) return jsonResponse({ error: "Invalid or expired verification link" }, 400);
    if (row.used_at) {
      return jsonResponse({ error: "This verification link was already used" }, 400);
    }
    if (new Date(String(row.expires_at)).getTime() <= Date.now()) {
      return jsonResponse({ error: "This verification link has expired" }, 400);
    }

    const userId = String(row.user_id);
    const now = new Date().toISOString();

    const { error: userError } = await admin
      .from("app_users")
      .update({ email_verified_at: now })
      .eq("id", userId);
    if (userError) return jsonResponse({ error: userError.message }, 500);

    const { error: useError } = await admin
      .from("app_user_tokens")
      .update({ used_at: now })
      .eq("token_hash", tokenHash);
    if (useError) return jsonResponse({ error: useError.message }, 500);

    return jsonResponse({
      ok: true,
      message:
        "Email verified. An administrator must activate your account before you can sign in.",
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
