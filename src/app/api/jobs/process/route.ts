import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { NotificationService } from '@/lib/notifications/service';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function processPendingJobs() {
  // Fetch all PENDING jobs (service role bypasses RLS)
  const { data: pendingJobs, error } = await supabase
    .from('follow_up_jobs')
    .select('*')
    .eq('status', 'PENDING')
    .order('scheduled_for', { ascending: true });

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  const processed = [];

  for (const job of pendingJobs ?? []) {
    // Mark as PROCESSING
    await supabase
      .from('follow_up_jobs')
      .update({ status: 'PROCESSING', updated_at: new Date().toISOString() })
      .eq('id', job.id);

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

export async function POST() {
  return processPendingJobs();
}

export async function GET() {
  return processPendingJobs();
}
