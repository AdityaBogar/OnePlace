import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role to create signed upload URLs
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const maxDuration = 60;

/**
 * POST /api/models/upload
 * Generates a signed upload URL for direct browser → Supabase Storage upload.
 * This avoids sending the large binary file through Next.js server (which has body limits).
 * 
 * Body: JSON { filename: string, title: string, description?: string }
 * Returns: { uploadUrl, token, publicUrl, path }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, title, description } = body;

    if (!filename || !title) {
      return NextResponse.json({ success: false, error: 'filename and title are required' }, { status: 400 });
    }

    // Create unique safe path in storage bucket
    const safeName = `${Date.now()}_${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

    // Create a signed URL that allows the browser to upload directly to Supabase Storage
    const { data: signedData, error: signedError } = await supabase.storage
      .from('models-glb')
      .createSignedUploadUrl(safeName);

    if (signedError || !signedData) {
      console.error('Signed URL error:', signedError);
      return NextResponse.json({ success: false, error: signedError?.message || 'Failed to create signed URL' }, { status: 500 });
    }

    // Get the public URL that will be accessible after upload
    const { data: urlData } = supabase.storage.from('models-glb').getPublicUrl(safeName);

    return NextResponse.json({
      success: true,
      uploadUrl: signedData.signedUrl,
      token: signedData.token,
      publicUrl: urlData.publicUrl,
      path: safeName,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
