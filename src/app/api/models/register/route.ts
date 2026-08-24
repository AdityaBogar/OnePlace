import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const maxDuration = 60;

/**
 * POST /api/models/register
 * Called after the browser has successfully uploaded the file directly to Supabase Storage.
 * Registers the model record in the database with the public URL.
 * 
 * Body: JSON { title, description, publicUrl, fileSizeBytes, path }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, publicUrl, fileSizeBytes } = body;

    if (!title || !publicUrl) {
      return NextResponse.json({ success: false, error: 'title and publicUrl are required' }, { status: 400 });
    }

    // Get admin user ID
    const { data: adminUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'ADMIN')
      .limit(1)
      .maybeSingle();

    // Deactivate all existing models
    await supabase
      .from('models')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert new model record
    const { data: newModel, error: insertError } = await supabase
      .from('models')
      .insert([{
        title,
        description: description || null,
        file_path: publicUrl,
        file_size_bytes: fileSizeBytes || 0,
        is_active: true,
        status: 'PUBLISHED',
        created_by: adminUser?.id || null,
      }])
      .select()
      .single();

    if (insertError) {
      console.error('DB insert error:', insertError);
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, model: newModel });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
