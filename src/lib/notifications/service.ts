import { sendEmailNotification, NotificationResult } from './email';
import { sendWhatsAppNotification } from './whatsapp';
import { mockDb } from '@/lib/supabase/client';
import { Visitor } from '@/types/database';

// ── Template variable substitution ────────────────────────────────────────────

const VARIABLE_MAP: Record<string, string> = {
  "Visitor's Name": 'visitor_name',
  "Your Name": 'salesperson_name',
  "Property Interest": 'inquiry_type',
  "Follow-up Number": 'follow_up_number',
  "3D Walkthrough Link": 'walkthrough_url',
  "Unsubscribe Link": 'opt_out_url',
};

function renderVariables(text: string, vars: Record<string, string>): string {
  // Support both {{visitor_name}} style AND friendly "Visitor's Name" labels
  return text
    .replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`)
    .replace(/\[([^\]]+)\]/g, (_, label) => {
      const key = VARIABLE_MAP[label];
      return key ? (vars[key] ?? `[${label}]`) : `[${label}]`;
    });
}

/**
 * Wraps plain-text email body in a beautifully styled HTML shell.
 * The HTML is generated server-side so sales reps only write plain text.
 */
function buildHtmlEmail(plainBody: string, salespersonName: string, optOutUrl: string): string {
  // Convert plain text to HTML paragraphs
  const bodyHtml = plainBody
    .split(/\n\n+/)
    .map(para => para.trim())
    .filter(Boolean)
    .map(para => `<p style="color: #cbd5e1; font-size: 16px; line-height: 1.7; margin: 0 0 16px 0;">${para.replace(/\n/g, '<br/>')}</p>`)
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#0f172a;">
  <div style="font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background-color:#0f172a;color:#f8fafc;padding:40px 20px;max-width:620px;margin:0 auto;">
    
    <!-- Header -->
    <div style="text-align:center;margin-bottom:36px;">
      <div style="display:inline-block;background:linear-gradient(135deg,#0284c7,#2563eb);border-radius:16px;padding:14px 24px;">
        <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">OnePlace</span>
      </div>
      <p style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:3px;margin-top:12px;">3D Property Experience</p>
    </div>

    <!-- Body Card -->
    <div style="background-color:#1e293b;border-radius:16px;padding:36px;border:1px solid #334155;margin-bottom:24px;">
      ${bodyHtml}
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding-top:8px;">
      <p style="color:#475569;font-size:12px;margin:0 0 6px;">Sent by <strong style="color:#64748b;">${salespersonName}</strong> via OnePlace</p>
      <p style="color:#475569;font-size:11px;margin:0;">
        <a href="${optOutUrl}" style="color:#475569;text-decoration:underline;">Unsubscribe from future emails</a>
      </p>
    </div>

  </div>
</body>
</html>`;
}

// ── Default plain-text templates per follow-up number ─────────────────────────

function getDefaultSubject(followUpNumber: number): string {
  const subjects: Record<number, string> = {
    1: 'Thank you for your 3D walkthrough — OnePlace',
    2: 'A quick follow-up on your property interest',
    3: 'Still thinking about it? We\'re here to help',
    4: 'Your personalised property tour — a reminder',
    5: 'Have any questions about your property interest?',
  };
  return subjects[followUpNumber] ?? `Follow-up from OnePlace — #${followUpNumber}`;
}

function getDefaultBody(followUpNumber: number, vars: Record<string, string>): string {
  const bodies: Record<number, string> = {
    1: `Dear [Visitor's Name],

Thank you for exploring our 3D property with [Your Name]! We're thrilled you took the time for a walkthrough.

We noticed your particular interest in [Property Interest]. This is exactly the kind of property that gets snapped up quickly, so we'd love to stay in touch.

You can re-open your 3D walkthrough anytime at: [3D Walkthrough Link]

If you have any questions at all — about pricing, availability, or scheduling a personal visit — simply reply to this email and [Your Name] will get back to you promptly.

Warm regards,
[Your Name]
OnePlace`,

    2: `Dear [Visitor's Name],

I wanted to check in after your recent 3D walkthrough. Have you had a chance to revisit the property virtually?

If you'd like to see any specific rooms or features again: [3D Walkthrough Link]

Don't hesitate to reach out with any questions about [Property Interest]. We'd love to arrange a personal consultation.

Best,
[Your Name]`,

    3: `Hi [Visitor's Name],

Just a gentle reminder that we're here whenever you're ready to take the next step on [Property Interest].

Our 3D walkthrough is available anytime: [3D Walkthrough Link]

Whether you have questions about financing, floor plans, or availability — I'm just a reply away.

[Your Name]`,

    4: `Dear [Visitor's Name],

This is follow-up #[Follow-up Number] from [Your Name] at OnePlace.

We want to make sure you have everything you need to make a confident decision about [Property Interest].

Re-enter the 3D experience here: [3D Walkthrough Link]

[Your Name]`,

    5: `Hi [Visitor's Name],

As a final follow-up — if you're still considering [Property Interest], I'd love to schedule a personal call or site visit.

Your 3D tour: [3D Walkthrough Link]

[Your Name]`,
  };

  const template = bodies[followUpNumber] ?? bodies[5];
  return renderVariables(template, vars);
}

export class NotificationService {
  static async processVisitorFollowUp(
    visitorId: string,
    followUpNumber: number = 1
  ): Promise<{ emailResult: NotificationResult; whatsappResult: NotificationResult }> {
    const detail = await mockDb.getVisitorDetail(visitorId);
    if (!detail || !detail.visitor) {
      throw new Error(`Visitor not found for ID: ${visitorId}`);
    }

    const visitor: Visitor = detail.visitor;
    const isOptedOut = detail.preference.opted_out;
    const maxFollowUps = visitor.max_follow_ups ?? detail.salesperson?.max_follow_ups ?? 3;
    const followUpsSent = visitor.follow_ups_sent ?? 0;

    // Check opt-out
    if (isOptedOut) {
      const skippedResult: NotificationResult = {
        success: true, channel: 'EMAIL', status: 'SKIPPED_OPT_OUT',
        recipient: visitor.email,
        summary: `Follow-up #${followUpNumber} skipped — ${visitor.name} has opted out.`,
      };
      await mockDb.addCommLog({ visitor_id: visitor.id, channel: 'EMAIL', status: 'SKIPPED_OPT_OUT', recipient: visitor.email, content_summary: skippedResult.summary, error_message: null });
      await mockDb.addCommLog({ visitor_id: visitor.id, channel: 'WHATSAPP', status: 'SKIPPED_OPT_OUT', recipient: visitor.phone, content_summary: skippedResult.summary, error_message: null });
      return { emailResult: skippedResult, whatsappResult: skippedResult };
    }

    // Check limit
    if (followUpsSent >= maxFollowUps) {
      const limitResult: NotificationResult = {
        success: true, channel: 'EMAIL', status: 'SKIPPED_OPT_OUT',
        recipient: visitor.email,
        summary: `Limit reached (${followUpsSent}/${maxFollowUps}). No further emails will be sent.`,
      };
      return { emailResult: limitResult, whatsappResult: limitResult };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const optOutLink = `${appUrl}/opt-out?visitor=${visitor.id}`;
    const salespersonName = detail.salesperson?.full_name || 'OnePlace Sales Team';

    // Template variables
    const vars: Record<string, string> = {
      visitor_name: visitor.name,
      salesperson_name: salespersonName,
      inquiry_type: visitor.inquiry_type,
      walkthrough_url: `${appUrl}/walkthrough`,
      opt_out_url: optOutLink,
      follow_up_number: String(followUpNumber),
    };

    // Load the salesperson's custom template for this specific follow-up number
    let subject = getDefaultSubject(followUpNumber);
    let plainBody = getDefaultBody(followUpNumber, vars);

    if (detail.salesperson?.id) {
      const customTemplate = await mockDb.getEmailTemplate(detail.salesperson.id, followUpNumber);
      if (customTemplate?.body_text?.trim()) {
        subject = renderVariables(customTemplate.subject || subject, vars);
        plainBody = renderVariables(customTemplate.body_text, vars);
      }
    }

    // Apply variable substitution to subject too
    subject = renderVariables(subject, vars);

    // Build beautiful HTML from plain text
    const htmlBody = buildHtmlEmail(plainBody, salespersonName, optOutLink);

    // Send Email
    const emailResult = await sendEmailNotification({
      to: visitor.email,
      subject,
      html: htmlBody,
      text: plainBody,
      replyTo: detail.salesperson?.email,
    });

    await mockDb.addCommLog({
      visitor_id: visitor.id,
      channel: 'EMAIL',
      status: emailResult.status,
      recipient: visitor.email,
      content_summary: `[Follow-up #${followUpNumber}] ${subject} — ${emailResult.summary}`,
      error_message: emailResult.error || null,
    });

    // Send WhatsApp (short message only)
    const waText = `Hi ${visitor.name}! Follow-up #${followUpNumber} from ${salespersonName} at OnePlace. You expressed interest in "${visitor.inquiry_type}". Re-enter your 3D tour: ${appUrl}/walkthrough — Reply STOP to opt out.`;
    const whatsappResult = await sendWhatsAppNotification({ to: visitor.phone, message: waText });

    await mockDb.addCommLog({
      visitor_id: visitor.id,
      channel: 'WHATSAPP',
      status: whatsappResult.status,
      recipient: visitor.phone,
      content_summary: `[Follow-up #${followUpNumber}] ${whatsappResult.summary}`,
      error_message: whatsappResult.error || null,
    });

    // Track & schedule next (every 1 minute) only if notification succeeded
    if (emailResult.success) {
      const newSentCount = await mockDb.incrementFollowUpsSent(visitorId);
      if (newSentCount < maxFollowUps) {
        await mockDb.scheduleNextFollowUp(visitorId, followUpNumber + 1, 60000); // 1 minute
      }
    }

    return { emailResult, whatsappResult };
  }
}
