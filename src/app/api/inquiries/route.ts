import { NextResponse } from 'next/server';
import { mockDb } from '@/lib/supabase/client';

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

    const { visitor, job } = await mockDb.registerVisitor({
      salesperson_id,
      name,
      email,
      phone,
      inquiry_type: inquiry_type || 'General 3D Tour Inquiry',
      notes,
    });

    // Auto-trigger background follow-up worker simulation in background (1 min scheduled)
    // For fast demonstration during testing, also kick off a non-blocking trigger:
    setTimeout(() => {
      fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/jobs/process`, { method: 'POST' }).catch(() => {});
    }, 60000);

    return NextResponse.json({
      success: true,
      message: 'Visitor registered successfully. Follow-up scheduled for 1 minute.',
      visitor,
      job,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
  }
}
