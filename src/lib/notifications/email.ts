import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';

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

export async function sendEmailNotification(payload: EmailPayload): Promise<NotificationResult> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_FROM || 'sales@oneplace.com';
  const fromName = process.env.SENDGRID_FROM_NAME || 'OnePlace 3D Showcase';
  const summary = `Email Subject: "${payload.subject}" to ${payload.to}`;

  // 1. Try Nodemailer SMTP if SMTP host/user is configured
  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: payload.to,
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
    } catch (smtpErr: any) {
      console.error('[SMTP Error]', smtpErr.message);
      if (!apiKey) {
        return {
          success: false,
          channel: 'EMAIL',
          status: 'FAILED',
          recipient: payload.to,
          summary,
          error: `SMTP Error: ${smtpErr.message}`,
        };
      }
    }
  }

  // 2. Try SendGrid API
  if (apiKey) {
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

  // 3. Fallback mock if neither is configured
  console.log('[DEV MOCK EMAIL SERVICE] No API Key or SMTP configured. Simulating delivery:');
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
