import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/email/inbound
 * SendGrid Inbound Parse webhook — called when a visitor replies to a follow-up email.
 * 
 * Setup: In your SendGrid account, go to Settings → Inbound Parse → Add Host & URL
 * Set the POST URL to: https://your-domain.com/api/email/inbound
 * 
 * Matches the reply's "from" email against visitors.email to associate the reply.
 */
export async function POST(req: NextRequest) {
  try {
    // SendGrid sends inbound emails as multipart/form-data
    const formData = await req.formData();

    const fromHeader = formData.get('from') as string || '';
    const fromEmail = extractEmail(fromHeader);
    const fromName = extractName(fromHeader);
    const subject = formData.get('subject') as string || '(no subject)';
    const bodyText = formData.get('text') as string || formData.get('body-plain') as string || '';

    if (!fromEmail) {
      return NextResponse.json({ success: false, error: 'No from email' }, { status: 400 });
    }

    // Find the visitor by their email address
    const { data: visitor } = await supabase
      .from('visitors')
      .select('id, name, email')
      .eq('email', fromEmail.toLowerCase())
      .maybeSingle();

    const visitorId = visitor?.id || null;

    // Store the reply in email_replies
    const { error } = await supabase.from('email_replies').insert([{
      visitor_id: visitorId,
      from_email: fromEmail,
      from_name: fromName || visitor?.name || null,
      subject: subject.replace(/^Re:\s*/i, '').trim(),
      body_text: cleanEmailBody(bodyText),
      received_at: new Date().toISOString(),
    }]);

    if (error) {
      console.error('Inbound email store error:', error.message);
      // Return 200 anyway so SendGrid doesn't retry
    }

    console.log(`[Inbound Email] Reply from ${fromEmail} (visitor: ${visitorId || 'unknown'}) — "${subject}"`);

    return NextResponse.json({ success: true, visitorId, fromEmail });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Inbound webhook error:', msg);
    // Always return 200 to prevent SendGrid from retrying
    return NextResponse.json({ success: false, error: msg });
  }
}

function extractEmail(header: string): string {
  const match = header.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase() : '';
}

function extractName(header: string): string {
  // "John Doe <john@example.com>" → "John Doe"
  const match = header.match(/^"?([^"<]+)"?\s*</);
  return match ? match[1].trim() : '';
}

function cleanEmailBody(text: string): string {
  if (!text) return '';
  // Remove quoted previous email content (lines starting with >)
  const lines = text.split('\n');
  const cleaned: string[] = [];
  for (const line of lines) {
    if (line.startsWith('>')) break; // Stop at quoted content
    if (line.match(/^On .+ wrote:$/)) break;
    cleaned.push(line);
  }
  return cleaned.join('\n').trim().slice(0, 4000); // Cap at 4000 chars
}
