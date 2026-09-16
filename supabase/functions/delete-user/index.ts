import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { jsonResponse, preflight } from "../_shared/cors.ts";
import { requirePermission } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const guard = await requirePermission(req, "manage_users");
    if ("error" in guard) return guard.error;
    const { user, admin } = guard;

    const body = (await req.json()) as { userId?: string };
    const userId = String(body.userId ?? "").trim();
    if (!userId) return jsonResponse({ error: "userId is required" }, 400);
    if (userId === user.id) {
      return jsonResponse({ error: "You cannot delete your own account" }, 400);
    }

    const { data: target, error: targetError } = await admin
      .from("app_profiles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (targetError) return jsonResponse({ error: targetError.message }, 500);
    if (!target) return jsonResponse({ error: "User profile not found" }, 404);

    if (target.role === "administrator") {
      const { count, error: countError } = await admin
        .from("app_profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "administrator");
      if (countError) return jsonResponse({ error: countError.message }, 500);
      if ((count ?? 0) <= 1) {
        return jsonResponse({ error: "Cannot delete the last administrator" }, 400);
      }
    }

    // Cascades to app_profiles, app_user_tokens and app_sessions.
    const { error: deleteError } = await admin
      .from("app_users")
      .delete()
      .eq("id", userId);
    if (deleteError) return jsonResponse({ error: deleteError.message }, 400);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
