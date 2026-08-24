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

      // If successful and visitor has more follow-ups remaining, schedule the next one
      if (isSuccess) {
        const { data: visitor } = await supabase
          .from('visitors')
          .select('max_follow_ups, follow_ups_sent, salesperson_id')
          .eq('id', job.visitor_id)
          .single();

        if (visitor) {
          const newFollowUpsSent = (visitor.follow_ups_sent ?? 0) + 1;

          // Resolve max_follow_ups: use visitor's custom value if set, else salesperson's global setting
          let maxFollowUps = visitor.max_follow_ups ?? 3;
          if (!visitor.max_follow_ups) {
            // Try to get salesperson's global max from email_templates
            const { data: template } = await supabase
              .from('email_templates')
              .select('follow_up_number')
              .eq('salesperson_id', visitor.salesperson_id)
              .order('follow_up_number', { ascending: false })
              .limit(1)
              .maybeSingle();
            if (template?.follow_up_number) maxFollowUps = template.follow_up_number;
          }

          // Update follow_ups_sent counter on visitor
          await supabase
            .from('visitors')
            .update({ follow_ups_sent: newFollowUpsSent, updated_at: new Date().toISOString() })
            .eq('id', job.visitor_id);

          // Schedule next follow-up if still within limit
          const nextNumber = followUpNumber + 1;
          if (nextNumber <= maxFollowUps) {
            const nextScheduled = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h later
            await supabase.from('follow_up_jobs').insert([{
              visitor_id: job.visitor_id,
              scheduled_for: nextScheduled,
              status: 'PENDING',
              attempts: 0,
              follow_up_number: nextNumber,
            }]);
          }
        }
      }

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
