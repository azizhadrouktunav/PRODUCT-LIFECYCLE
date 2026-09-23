// Opaque tokens: the plaintext only ever travels to the user (email link or
// session token). The database stores its sha256 so a DB leak is not enough
// to impersonate anyone.

const TOKEN_BYTES = 32;

export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function expiresIn(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

export const SESSION_TTL_HOURS = 24 * 7;
export const INVITE_TTL_HOURS = 24 * 7;
export const RESET_TTL_HOURS = 1;
export const VERIFY_TTL_HOURS = 48;
