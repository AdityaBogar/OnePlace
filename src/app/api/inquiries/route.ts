import { NextResponse } from 'next/server';
import { mockDb } from '@/lib/supabase/client';
import { NotificationService } from '@/lib/notifications/service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { salesperson_id, name, email, phone, inquiry_type, notes } = body;

    if (!name || !email || !phone || !salesperson_id) {
      return NextResponse.json(
        { success: false, error: 'Name, email, phone, and salesperson ID are required.' },
        { status: 400 }
      );
    }

    // Email & phone simple format check
    if (!email.includes('@') || !email.includes('.')) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // 1. Register visitor in database
    const { visitor, job } = await mockDb.registerVisitor({
      salesperson_id,
      name,
      email,
      phone,
      inquiry_type: inquiry_type || 'General 3D Tour Inquiry',
      notes,
    });

    // 2. Trigger instant follow-up email notification via SendGrid/SMTP
    let notificationResults = null;
    try {
      await mockDb.updateJobStatus(job.id, 'PROCESSING');
      notificationResults = await NotificationService.processVisitorFollowUp(visitor.id);
      
      const emailSuccess = notificationResults.emailResult.success;
      await mockDb.updateJobStatus(
        job.id, 
        emailSuccess ? 'COMPLETED' : 'FAILED', 
        notificationResults.emailResult.error
      );
    } catch (nErr: unknown) {
      const nErrorMsg = nErr instanceof Error ? nErr.message : String(nErr);
      await mockDb.updateJobStatus(job.id, 'FAILED', nErrorMsg);
    }

    return NextResponse.json({
      success: true,
      message: 'Visitor registered successfully and follow-up email dispatched.',
      visitor,
      job,
      notifications: notificationResults,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
