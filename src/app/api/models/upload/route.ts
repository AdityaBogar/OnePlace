import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side route using service role key to bypass storage RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
// Tell Next.js this route handler accepts large request bodies (multipart form data)
export const maxDuration = 300; // 5 min timeout for large uploads

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    let filePath: string;
    let fileSizeBytes = 0;

    if (file && file.size > 0) {
      // Upload to Supabase Storage
      const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const arrayBuffer = await file.arrayBuffer();
      const fileBuffer = new Uint8Array(arrayBuffer);
      fileSizeBytes = file.size;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('models-glb')
        .upload(safeName, fileBuffer, {
          contentType: file.type || 'model/gltf-binary',
          upsert: true,
        });

      if (uploadError) {
        console.error('Supabase storage upload error:', uploadError);
        return NextResponse.json({ success: false, error: `Storage upload failed: ${uploadError.message}` }, { status: 500 });
      }

      // Get permanent public URL
      const { data: urlData } = supabase.storage.from('models-glb').getPublicUrl(safeName);
      filePath = urlData.publicUrl;
    } else {
      // No file — use placeholder URL
      filePath = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Sponza/glTF-Binary/Sponza.glb';
      fileSizeBytes = 34200000;
    }

    // Deactivate all existing models
    await supabase.from('models').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');

    // Get current user (admin)
    const { data: adminUser } = await supabase.from('profiles').select('id').eq('role', 'ADMIN').limit(1).single();

    // Insert new model record
    const { data: newModel, error: insertError } = await supabase.from('models').insert([{
      title,
      description: description || null,
      file_path: filePath,
      file_size_bytes: fileSizeBytes,
      is_active: true,
      status: 'PUBLISHED',
      created_by: adminUser?.id || null,
    }]).select().single();

    if (insertError) {
      console.error('Model insert error:', insertError);
      return NextResponse.json({ success: false, error: `DB insert failed: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, model: newModel, filePath });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('Upload API error:', msg);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
