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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID parameter is required' }, { status: 400 });
    }

    if (supabaseAdmin) {
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile from Supabase:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ profile });
    } else {
      // Mock db fallback
      const initialProfiles = [
        {
          id: 'user-admin-01',
          full_name: 'Aditya Bogar (Admin)',
          email: 'admin@luxestate.com',
          role: 'ADMIN',
          must_change_password: false,
          is_active: true,
        },
        {
          id: 'user-sales-01',
          full_name: 'Sarah Jenkins (Sales Exec)',
          email: 'sales@luxestate.com',
          role: 'SALES',
          must_change_password: false,
          is_active: true,
        },
        {
          id: 'user-sales-02',
          full_name: 'Marcus Vance (Senior Broker)',
          email: 'marcus@luxestate.com',
          role: 'SALES',
          must_change_password: false,
          is_active: true,
        },
        {
          id: 'user-frontdesk-01',
          full_name: 'Front Desk Kiosk',
          email: 'frontdesk@oneplace.com',
          role: 'FRONT_DESK',
          must_change_password: false,
          is_active: true,
        }
      ];

      const found = initialProfiles.find(p => p.id === id);
      return NextResponse.json({ profile: found || null });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
