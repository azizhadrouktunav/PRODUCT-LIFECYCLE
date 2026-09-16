import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { jsonResponse, preflight } from "../_shared/cors.ts";
import { requirePermission } from "../_shared/auth.ts";
import { inviteEmail, sendEmail } from "../_shared/email.ts";
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

    const body = (await req.json()) as {
      email?: string;
      displayName?: string;
      role?: string;
      productIds?: string[];
    };
    const email = String(body.email ?? "").trim().toLowerCase();
    const displayName = String(body.displayName ?? "").trim();
    const role = String(body.role ?? "").trim();
    const productIds = Array.isArray(body.productIds) ? body.productIds.map(String) : [];

    if (!email || !email.includes("@")) {
      return jsonResponse({ error: "Valid email is required" }, 400);
    }
    if (!role) {
      return jsonResponse({ error: "Role is required" }, 400);
    }

    const { data: roleRow, error: roleError } = await admin
      .from("app_roles")
      .select("slug")
      .eq("slug", role)
      .maybeSingle();
    if (roleError) return jsonResponse({ error: roleError.message }, 500);
    if (!roleRow) return jsonResponse({ error: `Unknown role: ${role}` }, 400);

    const { data: existing } = await admin
      .from("app_users")
      .select("id, password_hash")
      .eq("email", email)
      .maybeSingle();
    if (existing?.password_hash) {
      return jsonResponse({ error: "A user with this email already exists" }, 400);
    }

    let userId = existing ? String(existing.id) : "";
    if (!userId) {
      const { data: created, error: createError } = await admin
        .from("app_users")
        .insert({ email })
        .select("id")
        .single();
      if (createError) return jsonResponse({ error: createError.message }, 500);
      userId = String(created.id);
    }

    const { error: profileError } = await admin.from("app_profiles").upsert({
      user_id: userId,
      email,
      display_name: displayName,
      role,
      product_ids: productIds,
    });
    if (profileError) {
      return jsonResponse({ error: `Profile failed: ${profileError.message}` }, 500);
    }

    // Only the newest invite link stays usable.
    await admin
      .from("app_user_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("kind", "invite")
      .is("used_at", null);

    const token = randomToken();
    const { error: tokenError } = await admin.from("app_user_tokens").insert({
      token_hash: await sha256Hex(token),
      user_id: userId,
      kind: "invite",
      expires_at: expiresIn(INVITE_TTL_HOURS),
    });
    if (tokenError) return jsonResponse({ error: tokenError.message }, 500);

    const message = inviteEmail({
      displayName,
      token,
      days: Math.round(INVITE_TTL_HOURS / 24),
    });
    await sendEmail({ to: email, ...message });

    return jsonResponse({ ok: true, userId });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
