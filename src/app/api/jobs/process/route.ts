import { NextResponse } from 'next/server';
import { mockDb } from '@/lib/supabase/client';
import { NotificationService } from '@/lib/notifications/service';

export async function POST() {
  try {
    const pendingJobs = await mockDb.getPendingJobs();
    const processed = [];

    for (const job of pendingJobs) {
      await mockDb.updateJobStatus(job.id, 'PROCESSING');
      try {
        // Pass the follow_up_number so templates can render the correct "follow-up #N" label
        const followUpNumber = job.follow_up_number ?? 1;
        const results = await NotificationService.processVisitorFollowUp(job.visitor_id, followUpNumber);
        const isSuccess = results.emailResult.success;
        await mockDb.updateJobStatus(job.id, isSuccess ? 'COMPLETED' : 'FAILED', results.emailResult.error);
        processed.push({ jobId: job.id, followUpNumber, results });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await mockDb.updateJobStatus(job.id, 'FAILED', errorMsg);
        processed.push({ jobId: job.id, error: errorMsg });
      }
    }

    return NextResponse.json({
      success: true,
      processed: processed.length,
      pendingCount: pendingJobs.length,
      details: processed,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
