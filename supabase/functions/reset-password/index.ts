import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, prefer",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    const { adminClient } = auth as {
      user: { id: string };
      adminClient: ReturnType<typeof createClient>;
    };

    const body = (await req.json()) as { userId?: string };
    const userId = String(body.userId ?? "").trim();
    if (!userId) {
      return jsonResponse({ error: "userId is required" }, 400);
    }

    const { data: authUser, error: getError } =
      await adminClient.auth.admin.getUserById(userId);
    if (getError || !authUser?.user) {
      return jsonResponse({ error: "Auth user not found" }, 404);
    }
    if (!authUser.user.last_sign_in_at) {
      return jsonResponse(
        { error: "Use Resend invite for inactive accounts" },
        400
      );
    }

    const email = (authUser.user.email || "").trim().toLowerCase();
    if (!email) {
      return jsonResponse({ error: "Auth user has no email" }, 400);
    }

    const siteUrl = Deno.env.get("SITE_URL") || Deno.env.get("SUPABASE_SITE_URL") || undefined;
    const { error: resetError } = await adminClient.auth.resetPasswordForEmail(email, {
      redirectTo: siteUrl,
    });
    if (resetError) {
      return jsonResponse({ error: resetError.message }, 400);
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
