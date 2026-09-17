// Invite and reset mail bodies. EmailJS renders them through a single
// pass-through template whose content is {{{html}}}, so the markup lives here
// rather than in the EmailJS dashboard.

export interface EmailMessage {
  subject: string;
  html: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** "7 days" / "1 hour", read off the expiry the Edge Function returned. */
export function expiryPhrase(expiresAt: string): string {
  const deadline = new Date(expiresAt).getTime();
  if (Number.isNaN(deadline)) return 'a limited time';

  const hours = Math.max(1, Math.round((deadline - Date.now()) / 3_600_000));
  if (hours < 48) return `${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

function layout(heading: string, body: string, ctaUrl: string, ctaLabel: string): string {
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
  link: string;
  expiry: string;
}): EmailMessage {
  const name = params.displayName ? escapeHtml(params.displayName) : 'there';
  return {
    subject: 'Your TUNAV ONE account is ready',
    html: layout(
      'Set your password',
      `<p style="margin:0 0 12px;">Hi ${name},</p>
       <p style="margin:0;">An account has been created for you on the TUNAV ONE product lifecycle registry.
       Choose a password to activate it. This link expires in ${params.expiry}.</p>`,
      params.link,
      'Set my password'
    ),
  };
}

export function resetEmail(params: {
  displayName: string;
  link: string;
  expiry: string;
}): EmailMessage {
  const name = params.displayName ? escapeHtml(params.displayName) : 'there';
  return {
    subject: 'Reset your TUNAV ONE password',
    html: layout(
      'Reset your password',
      `<p style="margin:0 0 12px;">Hi ${name},</p>
       <p style="margin:0;">We received a request to reset your TUNAV ONE password.
       This link expires in ${params.expiry}. If you did not ask for this, ignore this email.</p>`,
      params.link,
      'Choose a new password'
    ),
  };
}
