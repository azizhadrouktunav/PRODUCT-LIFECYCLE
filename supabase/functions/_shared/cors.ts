export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, prefer, x-session-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export type Json = Record<string, unknown>;

export function jsonResponse(body: Json, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function preflight() {
  return new Response("ok", { headers: corsHeaders });
}
