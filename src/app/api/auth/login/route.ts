import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client — can read profiles regardless of RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Browser-level client — used only to verify password via signInWithPassword
const supabaseAnon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

/**
 * POST /api/auth/login
 * Body: { email, password }
 * 1. Verifies credentials via Supabase Auth
 * 2. Fetches profile using service role (bypasses RLS)
 * Returns: { profile }
 */
export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
  }

  // Step 1: Verify credentials with Supabase Auth
  const { data: authData, error: authError } = await supabaseAnon.auth.signInWithPassword({
    email,
    password,
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: 'Invalid email or password.' },
      { status: 401 }
    );
  }

  // Step 2: Fetch profile using service role so RLS doesn't block us
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    // Auth user exists but no profile row — shouldn't happen but handle gracefully
    return NextResponse.json(
      { error: 'No account found with this email address.' },
      { status: 404 }
    );
  }

  if (!profile.is_active) {
    return NextResponse.json(
      { error: 'Your account has been deactivated. Contact Admin.' },
      { status: 403 }
    );
  }

  return NextResponse.json({ profile, session: authData.session });
}
