import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side client using the service role key (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/email-templates?salespersonId=xxx
 * Returns all email templates for a salesperson.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const salespersonId = searchParams.get('salespersonId');
  if (!salespersonId) {
    return NextResponse.json({ error: 'salespersonId is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('salesperson_id', salespersonId)
    .order('follow_up_number', { ascending: true });

  if (error) {
    console.error('GET email_templates error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

/**
 * POST /api/email-templates
 * Upserts an email template for a salesperson + follow-up number.
 * Body: { salespersonId, followUpNumber, subject, bodyText }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { salespersonId, followUpNumber, subject, bodyText } = body;

  if (!salespersonId || !followUpNumber || !subject || bodyText === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('email_templates')
    .upsert(
      {
        salesperson_id: salespersonId,
        follow_up_number: followUpNumber,
        subject,
        body_text: bodyText,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'salesperson_id,follow_up_number' }
    )
    .select()
    .single();

  if (error) {
    console.error('POST email_templates error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
