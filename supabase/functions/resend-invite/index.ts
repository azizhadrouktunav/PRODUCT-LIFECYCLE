import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { jsonResponse, preflight } from "../_shared/cors.ts";
import { requirePermission } from "../_shared/auth.ts";
import { setPasswordUrl } from "../_shared/links.ts";
import { expiresIn, INVITE_TTL_HOURS, randomToken, sha256Hex } from "../_shared/tokens.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const guard = await requirePermission(req, "manage_users");
    if ("error" in guard) return guard.error;
    const { admin } = guard;

    const body = (await req.json()) as { userId?: string };
    const userId = String(body.userId ?? "").trim();
    if (!userId) return jsonResponse({ error: "userId is required" }, 400);

    const { data: account, error: accountError } = await admin
      .from("app_users")
      .select("id, email, password_hash, disabled")
      .eq("id", userId)
      .maybeSingle();
    if (accountError) return jsonResponse({ error: accountError.message }, 500);
    if (!account) return jsonResponse({ error: "User not found" }, 404);
    if (account.disabled) return jsonResponse({ error: "Account is disabled" }, 400);
    if (account.password_hash) {
      return jsonResponse(
        { error: "User already activated; send a password reset instead" },
        400
      );
    }

    const email = String(account.email ?? "").trim().toLowerCase();
    if (!email) return jsonResponse({ error: "User has no email" }, 400);

    const { data: profile } = await admin
      .from("app_profiles")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle();

    // Void previous links so only the freshly emailed one works.
    await admin
      .from("app_user_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("used_at", null);

    const token = randomToken();
    const expiresAt = expiresIn(INVITE_TTL_HOURS);
    const { error: tokenError } = await admin.from("app_user_tokens").insert({
      token_hash: await sha256Hex(token),
      user_id: userId,
      kind: "invite",
      expires_at: expiresAt,
    });
    if (tokenError) return jsonResponse({ error: tokenError.message }, 500);

    // The caller holds manage_users and mails the link itself through EmailJS.
    return jsonResponse({
      ok: true,
      userId,
      email,
      displayName: String(profile?.display_name ?? ""),
      link: setPasswordUrl(token),
      expiresAt,
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
