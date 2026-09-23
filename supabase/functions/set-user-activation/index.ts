import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { jsonResponse, preflight } from "../_shared/cors.ts";
import { requirePermission } from "../_shared/auth.ts";

/** Admin activates (disabled=false) or deactivates (disabled=true) an account. */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const guard = await requirePermission(req, "manage_users");
    if ("error" in guard) return guard.error;
    const { admin } = guard;

    const body = (await req.json()) as { userId?: string; disabled?: boolean };
    const userId = String(body.userId ?? "").trim();
    if (!userId) return jsonResponse({ error: "userId is required" }, 400);
    if (typeof body.disabled !== "boolean") {
      return jsonResponse({ error: "disabled boolean is required" }, 400);
    }

    const { data: account, error: loadError } = await admin
      .from("app_users")
      .select("id, email_verified_at, password_hash")
      .eq("id", userId)
      .maybeSingle();
    if (loadError) return jsonResponse({ error: loadError.message }, 500);
    if (!account) return jsonResponse({ error: "User not found" }, 404);

    if (body.disabled === false) {
      if (!account.email_verified_at) {
        return jsonResponse(
          { error: "Cannot activate: email is not verified yet" },
          400
        );
      }
      if (!account.password_hash) {
        return jsonResponse(
          { error: "Cannot activate: password is not set" },
          400
        );
      }
    }

    const { error: updateError } = await admin
      .from("app_users")
      .update({ disabled: body.disabled })
      .eq("id", userId);
    if (updateError) return jsonResponse({ error: updateError.message }, 500);

    return jsonResponse({
      ok: true,
      userId,
      disabled: body.disabled,
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
