// Postgres identity for the browser.
//
// Authentication is our own, so PostgREST would otherwise see every request as
// the anon key with no idea who is behind it, and RLS could not scope anything.
// These functions mint a short-lived HS256 token signed with the project's JWT
// secret; supabase-js sends it as the Authorization header, and the policies in
// 20260319100000_rbac_rls.sql read `auth.jwt() ->> 'sub'` out of it.
//
// Requires the secret SUPABASE_JWT_SECRET (Dashboard, Settings, API, JWT
// Settings, "JWT Secret"):
//   npx supabase secrets set SUPABASE_JWT_SECRET=... --project-ref <project-ref>

/** Short by design: it is a bearer token that no session revocation can reach. */
export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function encodeSegment(value: unknown): string {
  return base64url(new TextEncoder().encode(JSON.stringify(value)));
}

async function signingKey(): Promise<CryptoKey> {
  const secret = (Deno.env.get("SUPABASE_JWT_SECRET") ?? "").trim();
  if (!secret) throw new Error("Missing SUPABASE_JWT_SECRET secret");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

/**
 * `role: authenticated` is what PostgREST switches the database role to, and
 * `sub` is the app_users id the RLS helpers resolve the profile from.
 */
export async function accessToken(userId: string): Promise<string> {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userId,
    role: "authenticated",
    aud: "authenticated",
    iat: issuedAt,
    exp: issuedAt + ACCESS_TOKEN_TTL_SECONDS,
  };

  const signingInput = `${encodeSegment({ alg: "HS256", typ: "JWT" })}.${encodeSegment(payload)}`;
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(),
    new TextEncoder().encode(signingInput)
  );

  return `${signingInput}.${base64url(new Uint8Array(signature))}`;
}

export interface AccessGrant {
  accessToken: string;
  accessTokenExpiresAt: string;
}

export async function accessGrant(userId: string): Promise<AccessGrant> {
  return {
    accessToken: await accessToken(userId),
    accessTokenExpiresAt: new Date(
      Date.now() + ACCESS_TOKEN_TTL_SECONDS * 1000
    ).toISOString(),
  };
}
