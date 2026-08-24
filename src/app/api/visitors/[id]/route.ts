import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/visitors/[id]
 * Returns full visitor detail: visitor, comm_pref, logs, jobs, salesperson profile
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: visitor, error: vErr } = await supabase
    .from('visitors')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (vErr || !visitor) {
    return NextResponse.json({ error: 'Visitor not found.' }, { status: 404 });
  }

  const [{ data: pref }, { data: logs }, { data: jobs }, { data: salesperson }, { data: replies }] =
    await Promise.all([
      supabase.from('communication_preferences').select('*').eq('visitor_id', id).maybeSingle(),
      supabase.from('communication_logs').select('*').eq('visitor_id', id).order('sent_at', { ascending: false }),
      supabase.from('follow_up_jobs').select('*').eq('visitor_id', id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('id', visitor.salesperson_id).maybeSingle(),
      supabase.from('email_replies').select('*').eq('visitor_id', id).order('received_at', { ascending: false }),
    ]);

  return NextResponse.json({
    visitor,
    preference: pref ?? { opted_out: false, opt_out_timestamp: null },
    logs:        logs        ?? [],
    jobs:        jobs        ?? [],
    salesperson: salesperson ?? null,
    replies:     replies     ?? [],
  });
}

/**
 * PATCH /api/visitors/[id]
 * Update visitor or comm_pref fields.
 * Body can include: { max_follow_ups?, opted_out? }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { max_follow_ups, opted_out } = body;

  if (max_follow_ups !== undefined) {
    const { error } = await supabase
      .from('visitors')
      .update({ max_follow_ups, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (opted_out !== undefined) {
    const { data: existing } = await supabase
      .from('communication_preferences')
      .select('id')
      .eq('visitor_id', id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('communication_preferences')
        .update({
          opted_out,
          opt_out_timestamp: opted_out ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('visitor_id', id);
    } else {
      await supabase.from('communication_preferences').insert([{
        visitor_id: id,
        opted_out,
        opt_out_timestamp: opted_out ? new Date().toISOString() : null,
      }]);
    }
  }

  return NextResponse.json({ success: true });
}
