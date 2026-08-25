import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { NotificationService } from '@/lib/notifications/service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function processPendingJobs(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const visitorId = searchParams.get('visitorId');

  let query = supabase
    .from('follow_up_jobs')
    .select('*')
    .eq('status', 'PENDING');

  if (visitorId) {
    // If a visitor is specified (e.g. manual "Send Follow-up Now"), fetch their next job immediately
    query = query.eq('visitor_id', visitorId);
  } else {
    // Otherwise, fetch only pending jobs that are due (scheduled in the past or now)
    const now = new Date().toISOString();
    query = query.lte('scheduled_for', now);
  }

  const { data: pendingJobs, error } = await query.order('scheduled_for', { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const processed = [];

  for (const job of pendingJobs ?? []) {
    // Mark as PROCESSING only if it's currently PENDING (concurrency guard)
    const { data: claimed, error: claimError } = await supabase
      .from('follow_up_jobs')
      .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
      .eq('id', job.id)
      .eq('status', 'PENDING')
      .select();

    if (claimError || !claimed || claimed.length === 0) {
      // Already claimed/processed by another concurrent worker run
      continue;
    }

    try {
      const followUpNumber = job.follow_up_number ?? 1;
      const results = await NotificationService.processVisitorFollowUp(job.visitor_id, followUpNumber);
      const isSuccess = results.emailResult.success;

      const { data: currentJob } = await supabase
        .from('follow_up_jobs')
        .select('attempts')
        .eq('id', job.id)
        .single();

      await supabase
        .from('follow_up_jobs')
        .update({
          status: isSuccess ? 'COMPLETED' : 'FAILED',
          attempts: (currentJob?.attempts ?? 0) + 1,
          error: results.emailResult.error ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);

      processed.push({ jobId: job.id, followUpNumber, success: isSuccess });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await supabase
        .from('follow_up_jobs')
        .update({
          status: 'FAILED',
          error: errorMsg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      processed.push({ jobId: job.id, error: errorMsg });
    }
  }

  return NextResponse.json({
    success: true,
    processed: processed.length,
    pendingCount: pendingJobs?.length ?? 0,
    details: processed,
  });
}

export async function POST(req: NextRequest) {
  return processPendingJobs(req);
}

export async function GET(req: NextRequest) {
  return processPendingJobs(req);
}
