import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { jsonResponse, preflight } from "../_shared/cors.ts";
import { adminClient } from "../_shared/auth.ts";
import { verifyEmailUrl } from "../_shared/links.ts";
import { hashPassword, passwordProblem } from "../_shared/password.ts";
import {
  expiresIn,
  randomToken,
  sha256Hex,
  VERIFY_TTL_HOURS,
} from "../_shared/tokens.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = (await req.json()) as {
      email?: string;
      password?: string;
      displayName?: string;
    };
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    const displayName = String(body.displayName ?? "").trim();

    if (!email || !email.includes("@")) {
      return jsonResponse({ error: "Valid email is required" }, 400);
    }
    const pwdIssue = passwordProblem(password);
    if (pwdIssue) return jsonResponse({ error: pwdIssue }, 400);

    const admin = adminClient();

    const { data: existing } = await admin
      .from("app_users")
      .select("id, password_hash, email_verified_at, disabled")
      .eq("email", email)
      .maybeSingle();

    if (existing && existing.password_hash && existing.email_verified_at && !existing.disabled) {
      return jsonResponse({ error: "An account with this email already exists" }, 400);
    }
    if (existing && existing.password_hash && !existing.disabled) {
      return jsonResponse({ error: "An account with this email already exists" }, 400);
    }
    // Allow re-register only while still unverified / pending with same email:
    // replace password and re-send verify mail.
    if (existing && !existing.disabled && existing.email_verified_at) {
      return jsonResponse({ error: "An account with this email already exists" }, 400);
    }

    const passwordHash = await hashPassword(password);
    let userId = existing ? String(existing.id) : "";

    if (!userId) {
      const { data: created, error: createError } = await admin
        .from("app_users")
        .insert({
          email,
          password_hash: passwordHash,
          disabled: true,
          email_verified_at: null,
        })
        .select("id")
        .single();
      if (createError) return jsonResponse({ error: createError.message }, 500);
      userId = String(created.id);
    } else {
      const { error: updateError } = await admin
        .from("app_users")
        .update({
          password_hash: passwordHash,
          disabled: true,
          email_verified_at: null,
        })
        .eq("id", userId);
      if (updateError) return jsonResponse({ error: updateError.message }, 500);
    }

    const { error: profileError } = await admin.from("app_profiles").upsert({
      user_id: userId,
      email,
      display_name: displayName,
      role: "visiteur",
      product_ids: [],
    });
    if (profileError) {
      return jsonResponse({ error: `Profile failed: ${profileError.message}` }, 500);
    }

    await admin
      .from("app_user_tokens")
      .update({ used_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("kind", "verify")
      .is("used_at", null);

    const token = randomToken();
    const expiresAt = expiresIn(VERIFY_TTL_HOURS);
    const { error: tokenError } = await admin.from("app_user_tokens").insert({
      token_hash: await sha256Hex(token),
      user_id: userId,
      kind: "verify",
      expires_at: expiresAt,
    });
    if (tokenError) return jsonResponse({ error: tokenError.message }, 500);

    return jsonResponse({
      ok: true,
      userId,
      email,
      displayName,
      link: verifyEmailUrl(token),
      expiresAt,
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
