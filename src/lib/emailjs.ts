import type { EmailMessage } from './emailTemplates';

// EmailJS REST transport. The send happens in the browser with the public key,
// which is what EmailJS expects; the private key belongs to no client bundle.
const ENDPOINT = 'https://api.emailjs.com/api/v1.0/email/send';

/**
 * A refused send is not a failure: the set-password token is already stored, so
 * callers hand the link to the administrator instead of losing it.
 */
export type SendResult = { delivered: true } | { delivered: false; reason: string };

interface EmailJsConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
  replyTo: string;
}

function readConfig(): EmailJsConfig | null {
  const serviceId = (import.meta.env.VITE_EMAILJS_SERVICE_ID ?? '').trim();
  const templateId = (import.meta.env.VITE_EMAILJS_TEMPLATE_ID ?? '').trim();
  const publicKey = (import.meta.env.VITE_EMAILJS_PUBLIC_KEY ?? '').trim();
  if (!serviceId || !templateId || !publicKey) return null;
  return {
    serviceId,
    templateId,
    publicKey,
    replyTo: (import.meta.env.VITE_EMAILJS_REPLY_TO ?? '').trim(),
  };
}

export async function sendEmail(message: {
  to: string;
  toName: string;
  content: EmailMessage;
}): Promise<SendResult> {
  const config = readConfig();
  if (!config) {
    return {
      delivered: false,
      reason:
        'EmailJS is not configured. Set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID ' +
        'and VITE_EMAILJS_PUBLIC_KEY in .env, then restart the dev server.',
    };
  }

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: config.serviceId,
        template_id: config.templateId,
        user_id: config.publicKey,
        template_params: {
          to_email: message.to,
          to_name: message.toName || message.to,
          subject: message.content.subject,
          html: message.content.html,
          reply_to: config.replyTo || message.to,
        },
      }),
    });
  } catch (err) {
    return {
      delivered: false,
      reason: `EmailJS is unreachable: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  if (!res.ok) {
    const detail = (await res.text()).trim();
    return { delivered: false, reason: `EmailJS ${res.status}: ${detail || res.statusText}` };
  }

  return { delivered: true };
}
