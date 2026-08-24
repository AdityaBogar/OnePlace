import { NextResponse } from 'next/server';
import { mockDb } from '@/lib/supabase/client';
import { NotificationService } from '@/lib/notifications/service';

export async function POST() {
  try {
    const pendingJobs = await mockDb.getPendingJobs();
    const now = new Date();

    const processed = [];

    for (const job of pendingJobs) {
      const scheduledTime = new Date(job.scheduled_for);
      // Process if scheduled time has passed (or force immediate execution for dev test)
      if (scheduledTime <= now || process.env.NODE_ENV === 'development') {
        await mockDb.updateJobStatus(job.id, 'PROCESSING');
        try {
          const results = await NotificationService.processVisitorFollowUp(job.visitor_id);
          await mockDb.updateJobStatus(job.id, 'COMPLETED');
          processed.push({ jobId: job.id, results });
        } catch (err: unknown) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          await mockDb.updateJobStatus(job.id, 'FAILED', errorMsg);
          processed.push({ jobId: job.id, error: errorMsg });
        }
      }
    }

    return NextResponse.json({
      success: true,
      pendingCount: pendingJobs.length,
      processedCount: processed.length,
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
