import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { jsonResponse, preflight } from "../_shared/cors.ts";
import { adminClient, createSession, resolveSession } from "../_shared/auth.ts";
import { verifyPassword } from "../_shared/password.ts";

// Same message whether the email is unknown, the password is wrong or the
// account is not activated: never let the login form enumerate accounts.
const INVALID = "Invalid email or password";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as { email?: string; password?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return jsonResponse({ error: INVALID }, 401);
    }

    const admin = adminClient();
    const { data: account, error } = await admin
      .from("app_users")
      .select("id, email, password_hash, disabled")
      .eq("email", email)
      .maybeSingle();
    if (error) return jsonResponse({ error: error.message }, 500);

    const ok =
      !!account &&
      !account.disabled &&
      (await verifyPassword(password, account.password_hash as string | null));
    if (!ok) {
      return jsonResponse({ error: INVALID }, 401);
    }

    const userId = String(account.id);
    const session = await createSession(admin, userId);

    await admin
      .from("app_users")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", userId);

    const user = await resolveSession(admin, session.token);

    return jsonResponse({
      token: session.token,
      expiresAt: session.expiresAt,
      user: user ?? { id: userId, email, displayName: "", role: "", permissions: [] },
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
