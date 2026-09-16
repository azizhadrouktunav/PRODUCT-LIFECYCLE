import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { jsonResponse, preflight } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { resetEmail, sendEmail } from "../_shared/email.ts";
import { expiresIn, randomToken, RESET_TTL_HOURS, sha256Hex } from "../_shared/tokens.ts";

// Public "forgot password" endpoint. Always answers ok so it cannot be used
// to discover which addresses have an account.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as { email?: string };
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) return jsonResponse({ ok: true });

    const admin = adminClient();
    const { data: account } = await admin
      .from("app_users")
      .select("id, disabled, password_hash")
      .eq("email", email)
      .maybeSingle();

    // Accounts that never set a password must go through a fresh invite,
    // which only an administrator can trigger.
    if (!account || account.disabled || !account.password_hash) {
      return jsonResponse({ ok: true });
    }

    const userId = String(account.id);
    const { data: profile } = await admin
      .from("app_profiles")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle();

    const token = randomToken();
    const { error: tokenError } = await admin.from("app_user_tokens").insert({
      token_hash: await sha256Hex(token),
      user_id: userId,
      kind: "reset",
      expires_at: expiresIn(RESET_TTL_HOURS),
    });
    if (tokenError) return jsonResponse({ error: tokenError.message }, 500);

    const message = resetEmail({
      displayName: String(profile?.display_name ?? ""),
      token,
      hours: RESET_TTL_HOURS,
    });
    await sendEmail({ to: email, ...message });

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
