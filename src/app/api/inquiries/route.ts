import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { NotificationService } from '@/lib/notifications/service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

    if (!email.includes('@') || !email.includes('.')) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // 1. Insert visitor
    const { data: visitor, error: vErr } = await supabase
      .from('visitors')
      .insert([{
        salesperson_id,
        name,
        email,
        phone,
        inquiry_type: inquiry_type || 'General 3D Tour Inquiry',
        notes: notes || null,
      }])
      .select()
      .single();

    if (vErr || !visitor) {
      return NextResponse.json({ success: false, error: vErr?.message ?? 'Failed to register visitor.' }, { status: 500 });
    }

    // 2. Communication preferences + inquiry record
    await supabase.from('communication_preferences').insert([{ visitor_id: visitor.id, opted_out: false }]);
    await supabase.from('inquiries').insert([{
      visitor_id: visitor.id,
      status: 'FOLLOW_UP_SCHEDULED',
      details: inquiry_type || 'General 3D Tour Inquiry',
    }]);

    // 3. Follow-up job
    const scheduledFor = new Date(Date.now() + 60 * 1000).toISOString();
    const { data: job } = await supabase
      .from('follow_up_jobs')
      .insert([{ visitor_id: visitor.id, scheduled_for: scheduledFor, status: 'PENDING', attempts: 0 }])
      .select()
      .single();

    // 4. Trigger follow-up notification
    let notificationResults = null;
    try {
      if (job) {
        await supabase.from('follow_up_jobs').update({ status: 'PROCESSING' }).eq('id', job.id);
        notificationResults = await NotificationService.processVisitorFollowUp(visitor.id);
        const emailSuccess = notificationResults.emailResult.success;
        await supabase.from('follow_up_jobs').update({
          status: emailSuccess ? 'COMPLETED' : 'FAILED',
          error: notificationResults.emailResult.error ?? null,
        }).eq('id', job.id);
      }
    } catch (nErr: unknown) {
      const msg = nErr instanceof Error ? nErr.message : String(nErr);
      if (job) await supabase.from('follow_up_jobs').update({ status: 'FAILED', error: msg }).eq('id', job.id);
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
