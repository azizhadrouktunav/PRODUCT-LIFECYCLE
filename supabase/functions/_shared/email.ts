// Transactional email through Resend. Requires the secrets RESEND_API_KEY,
// RESEND_FROM and APP_BASE_URL:
//   npx supabase secrets set RESEND_API_KEY=... RESEND_FROM=... APP_BASE_URL=...

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function appBaseUrl(): string {
  const raw = Deno.env.get("APP_BASE_URL");
  if (!raw) throw new Error("Missing APP_BASE_URL secret");
  return raw.replace(/\/+$/, "");
}

export function setPasswordUrl(token: string): string {
  return `${appBaseUrl()}/set-password?token=${encodeURIComponent(token)}`;
}

export async function sendEmail(message: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM");
  if (!apiKey) throw new Error("Missing RESEND_API_KEY secret");
  if (!from) throw new Error("Missing RESEND_FROM secret");

  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Resend ${res.status}: ${detail}`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layout(heading: string, body: string, ctaUrl: string, ctaLabel: string) {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px;background:#0f1115;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" style="max-width:520px;margin:0 auto;background:#16181d;border:1px solid #2a2e37;">
      <tr>
        <td style="padding:32px;">
          <p style="margin:0;font-size:12px;letter-spacing:2px;color:#8a919e;">TUNAV ONE</p>
          <p style="margin:2px 0 24px;font-size:11px;letter-spacing:2px;color:#4f8cff;">PRODUCT LIFECYCLE</p>
          <h1 style="margin:0 0 12px;font-size:18px;color:#f2f4f8;">${heading}</h1>
          <div style="font-size:14px;line-height:1.6;color:#c3c9d4;">${body}</div>
          <p style="margin:28px 0 0;">
            <a href="${ctaUrl}" style="display:inline-block;padding:11px 20px;background:#4f8cff;color:#0f1115;font-size:14px;font-weight:600;text-decoration:none;">${ctaLabel}</a>
          </p>
          <p style="margin:24px 0 0;font-size:12px;color:#8a919e;">
            Or paste this link into your browser:<br />
            <span style="color:#c3c9d4;word-break:break-all;">${ctaUrl}</span>
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function inviteEmail(params: {
  displayName: string;
  token: string;
  days: number;
}) {
  const name = params.displayName ? escapeHtml(params.displayName) : "there";
  return {
    subject: "Your TUNAV ONE account is ready",
    html: layout(
      "Set your password",
      `<p style="margin:0 0 12px;">Hi ${name},</p>
       <p style="margin:0;">An account has been created for you on the TUNAV ONE product lifecycle registry.
       Choose a password to activate it. This link expires in ${params.days} days.</p>`,
      setPasswordUrl(params.token),
      "Set my password"
    ),
  };
}

export function resetEmail(params: {
  displayName: string;
  token: string;
  hours: number;
}) {
  const name = params.displayName ? escapeHtml(params.displayName) : "there";
  return {
    subject: "Reset your TUNAV ONE password",
    html: layout(
      "Reset your password",
      `<p style="margin:0 0 12px;">Hi ${name},</p>
       <p style="margin:0;">We received a request to reset your TUNAV ONE password.
       This link expires in ${params.hours} hour(s). If you did not ask for this, ignore this email.</p>`,
      setPasswordUrl(params.token),
      "Choose a new password"
    ),
  };
}
