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

function alreadyRegistered(message: string): boolean {
  return /already\s*(been\s*)?registered|already exists|duplicate|User already/i.test(
    message
  );
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
    if (authUser.user.last_sign_in_at) {
      return jsonResponse(
        { error: "User already activated; cannot resend invite" },
        400
      );
    }

    const email = (authUser.user.email || "").trim().toLowerCase();
    if (!email) {
      return jsonResponse({ error: "Auth user has no email" }, 400);
    }

    const { data: profile, error: profileError } = await adminClient
      .from("app_profiles")
      .select("email, display_name, role, product_ids")
      .eq("user_id", userId)
      .maybeSingle();
    if (profileError) {
      return jsonResponse({ error: profileError.message }, 500);
    }
    if (!profile) {
      return jsonResponse({ error: "Profile not found" }, 404);
    }

    const displayName = String(profile.display_name ?? "");
    const role = String(profile.role ?? "");
    const productIds = Array.isArray(profile.product_ids)
      ? profile.product_ids.map(String)
      : [];
    const profileEmail = String(profile.email || email).trim().toLowerCase();

    const { data: invited, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(profileEmail, {
        data: { display_name: displayName },
      });

    if (!inviteError && invited?.user?.id) {
      const { error: upsertError } = await adminClient.from("app_profiles").upsert({
        user_id: invited.user.id,
        email: profileEmail,
        display_name: displayName,
        role,
        product_ids: productIds,
      });
      if (upsertError) {
        return jsonResponse({ error: upsertError.message }, 500);
      }
      return jsonResponse({ ok: true, userId: invited.user.id });
    }

    const inviteMessage = inviteError?.message || "";
    if (!alreadyRegistered(inviteMessage)) {
      return jsonResponse({ error: inviteMessage || "Invite failed" }, 400);
    }

    // Pending user already exists — delete and re-invite to send a fresh email.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      return jsonResponse({ error: deleteError.message }, 400);
    }

    const { data: reinvited, error: reinviteError } =
      await adminClient.auth.admin.inviteUserByEmail(profileEmail, {
        data: { display_name: displayName },
      });
    if (reinviteError || !reinvited?.user?.id) {
      return jsonResponse(
        {
          error:
            reinviteError?.message ||
            "Deleted pending user but failed to re-invite; recreate via Invite user",
        },
        500
      );
    }

    const { error: upsertError } = await adminClient.from("app_profiles").upsert({
      user_id: reinvited.user.id,
      email: profileEmail,
      display_name: displayName,
      role,
      product_ids: productIds,
    });
    if (upsertError) {
      return jsonResponse({
        error: `User re-invited but profile failed: ${upsertError.message}`,
      }, 500);
    }

    return jsonResponse({ ok: true, userId: reinvited.user.id });
  } catch (err) {
    return jsonResponse(
      { error: err instanceof Error ? err.message : String(err) },
      500
    );
  }
});
