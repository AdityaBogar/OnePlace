import { sendEmailNotification, NotificationResult } from './email';
import { sendWhatsAppNotification } from './whatsapp';
import { mockDb } from '@/lib/supabase/client';
import { Visitor } from '@/types/database';

// Default template variables available in custom email bodies
const DEFAULT_SUBJECT = 'Thank you for your 3D walkthrough — OnePlace';

const DEFAULT_BODY_HTML = `
<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #38bdf8; font-size: 28px; letter-spacing: -0.5px; margin: 0;">OnePlace</h1>
    <p style="color: #94a3b8; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px;">Exclusive Spatial Property Exploration</p>
  </div>

  <h2 style="color: #ffffff; font-size: 22px;">Dear {{visitor_name}},</h2>
  <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6;">
    Thank you for taking the 3D walkthrough with <strong>{{salesperson_name}}</strong>!
  </p>
  <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6;">
    We noted your interest in <em>"{{inquiry_type}}"</em>. This is follow-up #{{follow_up_number}} from our team.
  </p>

  <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; border-left: 4px solid #38bdf8; margin: 24px 0;">
    <p style="margin: 0; color: #e2e8f0; font-size: 15px; font-weight: 500;">
      Re-open your private 3D tour anytime:
    </p>
    <a href="{{walkthrough_url}}" style="display: inline-block; margin-top: 16px; background: linear-gradient(135deg, #0284c7, #2563eb); color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Re-enter 3D Walkthrough →</a>
  </div>

  <p style="color: #cbd5e1; font-size: 15px;">
    If you have any questions, simply reply to this email and {{salesperson_name}} will get back to you.
  </p>

  <hr style="border: 0; border-top: 1px solid #334155; margin: 30px 0;" />

  <div style="font-size: 12px; color: #64748b; text-align: center;">
    <p>You received this email because you registered during your tour with OnePlace 3D Showcase.</p>
    <p><a href="{{opt_out_url}}" style="color: #94a3b8; text-decoration: underline;">Click here to opt out of future property updates</a></p>
  </div>
</div>
`;

/**
 * Replace template variables in a string.
 */
function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

export class NotificationService {
  /**
   * Process a follow-up email for a visitor.
   * Uses the salesperson's custom email template if available.
   * Respects max_follow_ups limit and schedules the next one if needed.
   */
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
    const maxFollowUps = visitor.max_follow_ups ?? 3;
    const followUpsSent = visitor.follow_ups_sent ?? 0;

    // Check opt-out consent
    if (isOptedOut) {
      const skippedResult: NotificationResult = {
        success: true,
        channel: 'EMAIL',
        status: 'SKIPPED_OPT_OUT',
        recipient: visitor.email,
        summary: `Follow-up #${followUpNumber} skipped — ${visitor.name} has opted out.`,
      };
      await mockDb.addCommLog({ visitor_id: visitor.id, channel: 'EMAIL', status: 'SKIPPED_OPT_OUT', recipient: visitor.email, content_summary: skippedResult.summary, error_message: null });
      await mockDb.addCommLog({ visitor_id: visitor.id, channel: 'WHATSAPP', status: 'SKIPPED_OPT_OUT', recipient: visitor.phone, content_summary: skippedResult.summary, error_message: null });
      return { emailResult: skippedResult, whatsappResult: skippedResult };
    }

    // Check follow-up limit
    if (followUpsSent >= maxFollowUps) {
      const limitResult: NotificationResult = {
        success: true,
        channel: 'EMAIL',
        status: 'SKIPPED_OPT_OUT', // Reuse SKIPPED status
        recipient: visitor.email,
        summary: `Follow-up limit reached (${followUpsSent}/${maxFollowUps}). No further emails will be sent.`,
      };
      return { emailResult: limitResult, whatsappResult: limitResult };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000';
    const optOutLink = `${appUrl}/opt-out?visitor=${visitor.id}`;
    const salespersonName = detail.salesperson?.full_name || 'OnePlace Sales Team';

    // Load the salesperson's custom template (if set)
    let subject = DEFAULT_SUBJECT;
    let bodyHtml = DEFAULT_BODY_HTML;

    if (detail.salesperson?.id) {
      const customTemplate = await mockDb.getEmailTemplate(detail.salesperson.id);
      if (customTemplate && customTemplate.body_html.trim()) {
        subject = customTemplate.subject || DEFAULT_SUBJECT;
        bodyHtml = customTemplate.body_html;
      }
    }

    // Build template variables
    const vars: Record<string, string> = {
      visitor_name: visitor.name,
      salesperson_name: salespersonName,
      inquiry_type: visitor.inquiry_type,
      walkthrough_url: `${appUrl}/walkthrough`,
      opt_out_url: optOutLink,
      follow_up_number: String(followUpNumber),
    };

    const renderedSubject = renderTemplate(subject, vars);
    const renderedHtml = renderTemplate(bodyHtml, vars);

    // Send Email
    const emailResult = await sendEmailNotification({
      to: visitor.email,
      subject: renderedSubject,
      html: renderedHtml,
      replyTo: detail.salesperson?.email,
    });

    await mockDb.addCommLog({
      visitor_id: visitor.id,
      channel: 'EMAIL',
      status: emailResult.status,
      recipient: visitor.email,
      content_summary: `[Follow-up #${followUpNumber}] ${renderedSubject} — ${emailResult.summary}`,
      error_message: emailResult.error || null,
    });

    // Send WhatsApp
    const waText = `Hi ${visitor.name}! Follow-up #${followUpNumber} from ${salespersonName} at OnePlace. We noted your interest in "${visitor.inquiry_type}". Re-open your 3D tour: ${appUrl}/walkthrough — Reply STOP to opt out.`;
    const whatsappResult = await sendWhatsAppNotification({ to: visitor.phone, message: waText });

    await mockDb.addCommLog({
      visitor_id: visitor.id,
      channel: 'WHATSAPP',
      status: whatsappResult.status,
      recipient: visitor.phone,
      content_summary: `[Follow-up #${followUpNumber}] ${whatsappResult.summary}`,
      error_message: whatsappResult.error || null,
    });

    // Increment follow-ups sent counter
    const newSentCount = await mockDb.incrementFollowUpsSent(visitorId);

    // Schedule next follow-up if under limit
    if (newSentCount < maxFollowUps) {
      await mockDb.scheduleNextFollowUp(visitorId, followUpNumber + 1, 86400000); // 24h
    }

    return { emailResult, whatsappResult };
  }
}
