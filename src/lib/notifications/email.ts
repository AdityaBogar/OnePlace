import sgMail from '@sendgrid/mail';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface NotificationResult {
  success: boolean;
  channel: 'EMAIL' | 'WHATSAPP';
  status: 'SENT' | 'FAILED' | 'SKIPPED_OPT_OUT' | 'MOCK_SENT';
  recipient: string;
  summary: string;
  error?: string;
}

const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'sales@luxestate3d.com';
const fromName = process.env.SENDGRID_FROM_NAME || 'LuxeEstate 3D Showcase';

if (apiKey) {
  sgMail.setApiKey(apiKey);
}

export async function sendEmailNotification(payload: EmailPayload): Promise<NotificationResult> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'sales@luxestate3d.com';
  const fromName = process.env.SENDGRID_FROM_NAME || 'LuxeEstate 3D Showcase';
  const summary = `Email Subject: "${payload.subject}" to ${payload.to}`;

  if (!apiKey) {
    console.log('[DEV MOCK EMAIL SERVICE] SendGrid API Key not configured. Simulating delivery:');
    console.log(`To: ${payload.to}`);
    console.log(`From: ${fromName} <${fromEmail}>`);
    console.log(`Subject: ${payload.subject}`);
    return {
      success: true,
      channel: 'EMAIL',
      status: 'MOCK_SENT',
      recipient: payload.to,
      summary,
    };
  }

  try {
    sgMail.setApiKey(apiKey);
    await sgMail.send({
      to: payload.to,
      from: {
        email: fromEmail,
        name: fromName,
      },
      replyTo: process.env.SENDGRID_REPLY_TO || fromEmail,
      subject: payload.subject,
      html: payload.html,
      text: payload.text || payload.subject,
    });

    return {
      success: true,
      channel: 'EMAIL',
      status: 'SENT',
      recipient: payload.to,
      summary,
    };
  } catch (err: any) {
    let errorMsg = err instanceof Error ? err.message : String(err);
    if (err?.response?.body?.errors && Array.isArray(err.response.body.errors)) {
      errorMsg = err.response.body.errors.map((e: any) => e.message).join('; ');
    }
    console.error('[SendGrid Error]', errorMsg);
    return {
      success: false,
      channel: 'EMAIL',
      status: 'FAILED',
      recipient: payload.to,
      summary,
      error: errorMsg,
    };
  }
}

