import { sendEmailNotification, NotificationResult } from './email';
import { sendWhatsAppNotification } from './whatsapp';
import { mockDb } from '@/lib/supabase/client';
import { Visitor } from '@/types/database';

export class NotificationService {
  /**
   * Process automated 1-minute follow-up for a registered visitor.
   * Checks opt-out status before sending.
   */
  static async processVisitorFollowUp(visitorId: string): Promise<{ emailResult: NotificationResult; whatsappResult: NotificationResult }> {
    const detail = await mockDb.getVisitorDetail(visitorId);
    if (!detail || !detail.visitor) {
      throw new Error(`Visitor not found for ID: ${visitorId}`);
    }

    const visitor: Visitor = detail.visitor;
    const isOptedOut = detail.preference.opted_out;

    // Check opt-out consent (Section 25 of specification)
    if (isOptedOut) {
      const skippedResult: NotificationResult = {
        success: true,
        channel: 'EMAIL',
        status: 'SKIPPED_OPT_OUT',
        recipient: visitor.email,
        summary: `Follow-up skipped because visitor ${visitor.name} has opted out.`,
      };

      await mockDb.addCommLog({
        visitor_id: visitor.id,
        channel: 'EMAIL',
        status: 'SKIPPED_OPT_OUT',
        recipient: visitor.email,
        content_summary: skippedResult.summary,
        error_message: null,
      });

      await mockDb.addCommLog({
        visitor_id: visitor.id,
        channel: 'WHATSAPP',
        status: 'SKIPPED_OPT_OUT',
        recipient: visitor.phone,
        content_summary: skippedResult.summary,
        error_message: null,
      });

      return { emailResult: skippedResult, whatsappResult: skippedResult };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const optOutLink = `${appUrl}/opt-out?visitor=${visitor.id}`;
    const salespersonName = detail.salesperson?.full_name || 'OnePlace Sales Team';

    // 1. Send Email Follow-Up
    const emailSubject = `Welcome to The Sky Villa — Your 3D Showcase Highlights`;
    const emailHtml = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #38bdf8; font-size: 28px; letter-spacing: -0.5px; margin: 0;">OnePlace</h1>
          <p style="color: #94a3b8; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px;">Exclusive Spatial Property Exploration</p>
        </div>
        
        <h2 style="color: #ffffff; font-size: 22px;">Dear ${visitor.name},</h2>
        <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6;">
          Thank you for taking the 3D walkthrough of <strong>The Sky Villa</strong> with <strong>${salespersonName}</strong>!
        </p>
        <p style="color: #cbd5e1; font-size: 16px; line-height: 1.6;">
          We noted your interest in <em>"${visitor.inquiry_type}"</em>. Our interactive 3D showcase enables you to re-visit every room, balcony, and terrace at your convenience.
        </p>

        <div style="background-color: #1e293b; padding: 20px; border-radius: 8px; border-left: 4px solid #38bdf8; margin: 24px 0;">
          <p style="margin: 0; color: #e2e8f0; font-size: 15px; font-weight: 500;">
            "Architecture is visual poetry in space." — Re-open your private 3D tour anytime:
          </p>
          <a href="${appUrl}/walkthrough" style="display: inline-block; margin-top: 16px; background: linear-gradient(135deg, #0284c7, #2563eb); color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px;">Re-enter 3D Walkthrough →</a>
        </div>

        <p style="color: #cbd5e1; font-size: 15px;">
          If you have any questions or would like to schedule a private site visit, simply reply to this email or contact ${salespersonName} directly.
        </p>

        <hr style="border: 0; border-top: 1px solid #334155; margin: 30px 0;" />

        <div style="font-size: 12px; color: #64748b; text-align: center;">
          <p>You received this email because you registered during your tour with OnePlace 3D Showcase.</p>
          <p><a href="${optOutLink}" style="color: #94a3b8; text-decoration: underline;">Click here to opt out of future property updates</a></p>
        </div>
      </div>
    `;

    const emailResult = await sendEmailNotification({
      to: visitor.email,
      subject: emailSubject,
      html: emailHtml,
    });

    await mockDb.addCommLog({
      visitor_id: visitor.id,
      channel: 'EMAIL',
      status: emailResult.status,
      recipient: visitor.email,
      content_summary: emailResult.summary,
      error_message: emailResult.error || null,
    });

    // 2. Send WhatsApp Follow-Up
    const waText = `Hi ${visitor.name}! Thank you for exploring The Sky Villa with ${salespersonName}. We noted your interest in "${visitor.inquiry_type}". Re-open your 3D interactive walkthrough anytime at: ${appUrl}/walkthrough . Reply STOP to opt out.`;
    
    const whatsappResult = await sendWhatsAppNotification({
      to: visitor.phone,
      message: waText,
    });

    await mockDb.addCommLog({
      visitor_id: visitor.id,
      channel: 'WHATSAPP',
      status: whatsappResult.status,
      recipient: visitor.phone,
      content_summary: whatsappResult.summary,
      error_message: whatsappResult.error || null,
    });

    return { emailResult, whatsappResult };
  }
}
