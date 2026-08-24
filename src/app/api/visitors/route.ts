import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role — bypasses RLS on visitors, profiles, etc.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/visitors?salespersonId=xxx
 * Returns visitors for a salesperson (or all if no salespersonId).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const salespersonId = searchParams.get('salespersonId');

  let query = supabase
    .from('visitors')
    .select('*')
    .order('created_at', { ascending: false });

  if (salespersonId) {
    query = query.eq('salesperson_id', salespersonId) as typeof query;
  }

  const { data, error } = await query;

  if (error) {
    console.error('GET /api/visitors error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

/**
 * POST /api/visitors
 * Registers a visitor, creates inquiry, comm_pref, and follow_up_job.
 * Body: { salesperson_id, name, email, phone, inquiry_type, notes? }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { salesperson_id, name, email, phone, inquiry_type, notes } = body;

  if (!salesperson_id || !name || !email || !phone) {
    return NextResponse.json(
      { error: 'salesperson_id, name, email, and phone are required.' },
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
      max_follow_ups: null,
    }])
    .select()
    .single();

  if (vErr || !visitor) {
    console.error('POST /api/visitors visitor insert error:', vErr?.message);
    return NextResponse.json({ error: vErr?.message ?? 'Failed to create visitor.' }, { status: 500 });
  }

  // 2. Communication preferences
  await supabase.from('communication_preferences').insert([{
    visitor_id: visitor.id,
    opted_out: false,
  }]);

  // 3. Inquiry record
  await supabase.from('inquiries').insert([{
    visitor_id: visitor.id,
    status: 'FOLLOW_UP_SCHEDULED',
    details: inquiry_type || 'General 3D Tour Inquiry',
  }]);

  // 4. Follow-up job (scheduled 1 minute from now)
  const scheduledFor = new Date(Date.now() + 60 * 1000).toISOString();
  const { data: job } = await supabase
    .from('follow_up_jobs')
    .insert([{
      visitor_id: visitor.id,
      scheduled_for: scheduledFor,
      status: 'PENDING',
      attempts: 0,
    }])
    .select()
    .single();

  return NextResponse.json({
    success: true,
    message: 'Visitor registered successfully.',
    visitor,
    job: job ?? { id: `job-fallback`, visitor_id: visitor.id, status: 'PENDING' },
  }, { status: 201 });
}
