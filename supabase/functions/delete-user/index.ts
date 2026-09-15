import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Json = Record<string, unknown>;

function jsonResponse(body: Json, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function requireManageUsers(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { error: jsonResponse({ error: "Missing Authorization header" }, 401) };
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const adminClient = createClient(supabaseUrl, serviceKey);

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();
  if (userError || !user) {
    return { error: jsonResponse({ error: "Unauthorized" }, 401) };
  }

  const { data: profile, error: profileError } = await adminClient
    .from("app_profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profileError || !profile?.role) {
    return { error: jsonResponse({ error: "Profile not found" }, 403) };
  }

  const { data: perms, error: permError } = await adminClient
    .from("app_role_permissions")
    .select("action")
    .eq("role_slug", profile.role)
    .in("action", ["manage_users", "edit_all"]);
  if (permError) {
    return { error: jsonResponse({ error: permError.message }, 500) };
  }
  if (!perms || perms.length === 0) {
    return { error: jsonResponse({ error: "Forbidden: manage_users required" }, 403) };
  }

  return { user, adminClient };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const auth = await requireManageUsers(req);
    if ("error" in auth && auth.error) return auth.error;
    const { user, adminClient } = auth as {
      user: { id: string };
      adminClient: ReturnType<typeof createClient>;
    };

    const body = (await req.json()) as { userId?: string };
    const userId = String(body.userId ?? "").trim();
    if (!userId) {
      return jsonResponse({ error: "userId is required" }, 400);
    }
    if (userId === user.id) {
      return jsonResponse({ error: "You cannot delete your own account" }, 400);
    }

    const { data: target, error: targetError } = await adminClient
      .from("app_profiles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    if (targetError) return jsonResponse({ error: targetError.message }, 500);
    if (!target) return jsonResponse({ error: "User profile not found" }, 404);

    if (target.role === "administrator") {
      const { count, error: countError } = await adminClient
        .from("app_profiles")
        .select("user_id", { count: "exact", head: true })
        .eq("role", "administrator");
      if (countError) return jsonResponse({ error: countError.message }, 500);
      if ((count ?? 0) <= 1) {
        return jsonResponse({ error: "Cannot delete the last administrator" }, 400);
      }
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      return jsonResponse({ error: deleteError.message }, 400);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
