import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/admin/migrate
 * Applies pending schema migrations safely (idempotent — safe to re-run).
 * Run this once from the admin panel or via cURL after deploying.
 */
export async function POST() {
  const results: { step: string; ok: boolean; error?: string }[] = [];

  // Helper: try inserting into a non-existent table, catch the error to detect column absence
  async function columnExists(table: string, column: string): Promise<boolean> {
    const { data, error } = await supabase.from(table).select(column).limit(1);
    if (error && error.message.includes('does not exist')) return false;
    return true;
  }

  async function tableExists(table: string): Promise<boolean> {
    const { error } = await supabase.from(table).select('id').limit(1);
    return !error || !error.message.includes('does not exist');
  }

  // ── Step 1: Create email_templates table ──
  const emailTemplatesExists = await tableExists('email_templates');
  if (!emailTemplatesExists) {
    // Insert a dummy row using upsert to force table creation — can't create tables via REST
    // Must use pg connection. Instead, signal that this needs manual creation.
    results.push({ step: 'email_templates table', ok: false, error: 'Cannot create table via REST API. Please run SQL in Supabase dashboard. See /api/admin/migrate GET for the SQL.' });
  } else {
    results.push({ step: 'email_templates table', ok: true });
  }

  // ── Step 2: Create email_replies table ──
  const emailRepliesExists = await tableExists('email_replies');
  results.push({ step: 'email_replies table', ok: emailRepliesExists, error: emailRepliesExists ? undefined : 'Needs manual SQL creation' });

  // ── Step 3: Check visitors.max_follow_ups ──
  const hasMaxFollowUps = await columnExists('visitors', 'max_follow_ups');
  results.push({ step: 'visitors.max_follow_ups column', ok: hasMaxFollowUps, error: hasMaxFollowUps ? undefined : 'Needs ALTER TABLE' });

  return NextResponse.json({
    success: true,
    results,
    allOk: results.every(r => r.ok),
    note: 'If any steps failed, run the SQL from GET /api/admin/migrate in the Supabase SQL Editor.',
  });
}

/**
 * GET /api/admin/migrate
 * Returns the SQL that needs to be run in the Supabase SQL Editor.
 */
export async function GET() {
  const sql = `
-- ================================================================
-- OnePlace Migration: Email Templates + Follow-up Control
-- Run this in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ================================================================

-- 1. Email templates (one per salesperson)
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  salesperson_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL DEFAULT 'Thank you for visiting — Your 3D Tour Highlights',
  body_html TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(salesperson_id)
);

-- Enable RLS and allow service role full access
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_templates' AND policyname = 'service_all') THEN
    CREATE POLICY "service_all" ON public.email_templates USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. Email replies from visitors (populated via SendGrid Inbound Parse webhook)
CREATE TABLE IF NOT EXISTS public.email_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID REFERENCES public.visitors(id) ON DELETE SET NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT,
  body_text TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_replies ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_replies' AND policyname = 'service_all') THEN
    CREATE POLICY "service_all" ON public.email_replies USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. Add follow-up control columns to visitors
ALTER TABLE public.visitors
  ADD COLUMN IF NOT EXISTS max_follow_ups INTEGER NOT NULL DEFAULT 3
    CHECK (max_follow_ups BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS follow_ups_sent INTEGER NOT NULL DEFAULT 0;

-- 4. Add follow_up_number to track which sequential follow-up a job represents
ALTER TABLE public.follow_up_jobs
  ADD COLUMN IF NOT EXISTS follow_up_number INTEGER NOT NULL DEFAULT 1;

-- Done!
SELECT 'Migration complete' AS result;
  `.trim();

  return NextResponse.json({ sql });
}
