import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { jsonResponse, preflight } from "../_shared/cors.ts";
import { requireSession } from "../_shared/auth.ts";
import { accessGrant } from "../_shared/jwt.ts";

// Called on app start, and whenever the access token is close to expiring, to
// turn the stored session token back into a user plus a fresh Postgres grant.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return preflight();
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const guard = await requireSession(req);
    if ("error" in guard) return guard.error;
    return jsonResponse({
      user: guard.user,
      ...(await accessGrant(guard.user.id)),
    });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
