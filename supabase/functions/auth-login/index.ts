import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { jsonResponse, preflight } from "../_shared/cors.ts";
import { adminClient, createSession, resolveSession } from "../_shared/auth.ts";
import { accessGrant } from "../_shared/jwt.ts";
import { verifyPassword } from "../_shared/password.ts";

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
      .select("id, email, password_hash, disabled, email_verified_at")
      .eq("email", email)
      .maybeSingle();
    if (error) return jsonResponse({ error: error.message }, 500);

    if (!account) {
      return jsonResponse({ error: INVALID }, 401);
    }

    const passwordOk = await verifyPassword(
      password,
      account.password_hash as string | null
    );
    if (!passwordOk) {
      return jsonResponse({ error: INVALID }, 401);
    }

    if (!account.email_verified_at) {
      return jsonResponse(
        { error: "Please verify your email before signing in. Check your inbox for the link." },
        403
      );
    }

    if (account.disabled) {
      return jsonResponse(
        {
          error:
            "Your account is awaiting administrator activation. You will be able to sign in once an admin enables it.",
        },
        403
      );
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
      ...(await accessGrant(userId)),
      user: user ?? { id: userId, email, displayName: "", role: "", permissions: [] },
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
