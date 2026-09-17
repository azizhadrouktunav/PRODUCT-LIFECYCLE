// Set-password links. Mail leaves the browser through EmailJS, so the functions
// only mint the URL. Requires the secret APP_BASE_URL:
//   npx supabase secrets set APP_BASE_URL=... --project-ref <project-ref>

// Values pasted from a shell often arrive with wrapping quotes or a trailing
// continuation backslash; neither belongs in a URL.
function secret(name: string): string {
  const raw = Deno.env.get(name);
  if (!raw) throw new Error(`Missing ${name} secret`);
  return raw.trim().replace(/\\+$/, "").replace(/^["']|["']$/g, "").trim();
}

export function appBaseUrl(): string {
  return secret("APP_BASE_URL").replace(/\/+$/, "");
}

export function setPasswordUrl(token: string): string {
  return `${appBaseUrl()}/set-password?token=${encodeURIComponent(token)}`;
}
