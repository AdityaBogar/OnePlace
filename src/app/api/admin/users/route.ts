import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client — bypasses RLS, server-side only
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET /api/admin/users
 * Returns all profiles ordered by creation date.
 */
export async function GET() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('GET /api/admin/users error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

/**
 * POST /api/admin/users
 * Creates a new profile row in Supabase.
 * Body: { full_name, email, role }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { full_name, email, role } = body;

  if (!full_name || !email || !role) {
    return NextResponse.json({ error: 'full_name, email, and role are required' }, { status: 400 });
  }

  const validRoles = ['ADMIN', 'SALES', 'FRONT_DESK'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` }, { status: 400 });
  }

  // Check for duplicate email
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'A user with this email already exists.' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .insert([{
      id: crypto.randomUUID(),
      full_name,
      email,
      role,
      must_change_password: true,
      is_active: true,
    }])
    .select()
    .single();

  if (error) {
    console.error('POST /api/admin/users error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}

/**
 * PATCH /api/admin/users
 * Updates a profile (e.g. toggle is_active).
 * Body: { id, ...fields }
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('PATCH /api/admin/users error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

/**
 * DELETE /api/admin/users?id=xxx
 * Permanently deletes a profile by ID.
 */
export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id query param is required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('DELETE /api/admin/users error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
