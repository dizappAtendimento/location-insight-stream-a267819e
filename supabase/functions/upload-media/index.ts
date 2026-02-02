import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    
    // Support both old format (userId, base64Data) and new format (file, bucket, folder)
    const base64Data = body.file || body.base64Data;
    const fileName = body.fileName;
    const bucket = body.bucket || 'media-disparos';
    const folder = body.folder || body.userId;
    const contentType = body.contentType;

    if (!base64Data) {
      return new Response(
        JSON.stringify({ error: 'file/base64Data é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Upload Media] Processing media for bucket ${bucket}, folder: ${folder}, file: ${fileName}`);

    // Decode base64 to Uint8Array
    let base64Content = base64Data;
    
    // Handle data URL format
    if (base64Data.includes(',')) {
      base64Content = base64Data.split(',')[1];
    }
    
    const binaryString = atob(base64Content);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Create file path
    const fileExt = fileName?.split('.').pop() || 'bin';
    const filePath = folder 
      ? `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
      : `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, bytes, {
        contentType: contentType || 'application/octet-stream',
        upsert: true,
      });

    if (uploadError) {
      console.error('[Upload Media] Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Erro ao fazer upload', details: uploadError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Upload Media] File uploaded: ${uploadData.path}`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    console.log(`[Upload Media] Public URL: ${publicUrl}`);

    return new Response(
      JSON.stringify({ success: true, url: publicUrl, path: filePath }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Upload Media] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro inesperado', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
