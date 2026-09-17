// Transactional email through Resend. Requires the secrets RESEND_API_KEY,
// RESEND_FROM and APP_BASE_URL:
//   npx supabase secrets set RESEND_API_KEY=... RESEND_FROM=... APP_BASE_URL=...

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Values pasted from the docs often arrive with wrapping quotes or a trailing
// shell continuation backslash; those must never reach the Resend headers.
function secret(name: string): string {
  const raw = Deno.env.get(name);
  if (!raw) throw new Error(`Missing ${name} secret`);
  return raw.trim().replace(/\\+$/, "").replace(/^["']|["']$/g, "").trim();
}

const PLACEHOLDER_KEYS = new Set([
  "re_xxx",
  "re_your_api_key",
  "re_paste_your_real_key_here",
]);

export function appBaseUrl(): string {
  return secret("APP_BASE_URL").replace(/\/+$/, "");
}

export function setPasswordUrl(token: string): string {
  return `${appBaseUrl()}/set-password?token=${encodeURIComponent(token)}`;
}

/**
 * A refused recipient is not a failure: the token is already valid, so callers
 * can hand the link over manually instead of losing it.
 */
export type SendResult = { delivered: true } | { delivered: false; reason: string };

function resendMessage(detail: string): string {
  try {
    const parsed = JSON.parse(detail) as { message?: string };
    if (parsed.message) return parsed.message;
  } catch {
    // Not JSON — fall through to the raw body.
  }
  return detail;
}

export async function sendEmail(message: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  const apiKey = secret("RESEND_API_KEY");
  const from = secret("RESEND_FROM");
  if (PLACEHOLDER_KEYS.has(apiKey.toLowerCase())) {
    throw new Error(
      "RESEND_API_KEY is still the placeholder value. Create a key at " +
        "https://resend.com/api-keys and set it with: npx supabase secrets set " +
        "RESEND_API_KEY=re_yourkey --project-ref <project-ref>"
    );
  }

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
    if (res.status === 401) {
      throw new Error(
        "Resend rejected the API key (401). Create a fresh key at " +
          "https://resend.com/api-keys and update the RESEND_API_KEY secret."
      );
    }
    if (res.status === 403) {
      return { delivered: false, reason: resendMessage(detail) };
    }
    throw new Error(`Resend ${res.status}: ${detail}`);
  }

  return { delivered: true };
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
