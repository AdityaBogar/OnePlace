import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseServiceKey &&
  !supabaseUrl.includes('your-supabase-project') &&
  !supabaseUrl.includes('mock-project')
);

const supabaseAdmin = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(req: NextRequest) {
  try {
    const { userId, newPassword } = await req.json();

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'User ID and new password are required.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    if (supabaseAdmin) {
      // 1. Update the password in Supabase Auth
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (authError) {
        console.error('Error updating password in auth:', authError.message);
        return NextResponse.json({ error: 'Failed to update auth password: ' + authError.message }, { status: 500 });
      }

      // 2. Update the must_change_password flag in profiles
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          must_change_password: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (profileError) {
        console.error('Error updating profile:', profileError.message);
        return NextResponse.json({ error: 'Failed to update profile: ' + profileError.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, profile });
    } else {
      // Mock mode fallback response
      return NextResponse.json({
        success: true,
        profile: {
          id: userId,
          must_change_password: false,
          updated_at: new Date().toISOString()
        }
      });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
