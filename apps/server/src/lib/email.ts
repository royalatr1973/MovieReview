/**
 * Minimal provider-agnostic email sender. Reads EMAIL_WEBHOOK_URL from the
 * environment and POSTs { to, subject, body } as JSON. Any transactional
 * provider (Resend, SendGrid, Postmark, Mailgun, ...) can be plugged in by
 * pointing the webhook at a thin adapter, or by routing through a service
 * like Zapier / n8n / a 5-line Cloudflare Worker.
 *
 * When the webhook is unset (dev / CI), logs the payload and returns. This
 * keeps the auth flow unblocked while a provider is being chosen.
 */
export async function sendEmail(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<void> {
  const webhook = process.env.EMAIL_WEBHOOK_URL;
  if (!webhook) {
    console.log('[email] (no webhook configured) to=%s subject=%s', params.to, params.subject);
    console.log('[email] body:\n%s', params.body);
    return;
  }
  try {
    const res = await fetch(webhook, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.EMAIL_WEBHOOK_TOKEN
          ? { Authorization: `Bearer ${process.env.EMAIL_WEBHOOK_TOKEN}` }
          : {}),
      },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      console.error('[email] webhook returned %d for %s', res.status, params.to);
    }
  } catch (err) {
    console.error('[email] webhook error:', err);
  }
}
