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

    const { userId, base64Image, fileName } = await req.json();

    if (!userId || !base64Image) {
      return new Response(
        JSON.stringify({ error: 'userId e base64Image são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Upload Avatar] Processing avatar for user ${userId}`);

    // Extract base64 data and content type
    const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return new Response(
        JSON.stringify({ error: 'Formato de imagem inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = matches[1];
    const base64Data = matches[2];
    
    // Decode base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Determine file extension
    const extension = contentType.includes('png') ? 'png' : 
                      contentType.includes('gif') ? 'gif' : 
                      contentType.includes('webp') ? 'webp' : 'jpg';

    // Create file path: userId/avatar.extension
    const filePath = `${userId}/avatar.${extension}`;

    // Delete existing avatar if any
    const { data: existingFiles } = await supabase.storage
      .from('avatars')
      .list(userId);

    if (existingFiles && existingFiles.length > 0) {
      const filesToDelete = existingFiles.map(f => `${userId}/${f.name}`);
      await supabase.storage.from('avatars').remove(filesToDelete);
      console.log(`[Upload Avatar] Deleted ${filesToDelete.length} existing files`);
    }

    // Upload new avatar
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, bytes, {
        contentType,
        upsert: true,
      });

    if (uploadError) {
      console.error('[Upload Avatar] Upload error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Erro ao fazer upload da imagem', details: uploadError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Upload Avatar] File uploaded: ${uploadData.path}`);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`; // Add cache buster

    // Update user avatar_url in SAAS_Usuarios
    const { error: updateError } = await supabase
      .from('SAAS_Usuarios')
      .update({ avatar_url: publicUrl })
      .eq('id', userId);

    if (updateError) {
      console.error('[Upload Avatar] Update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar perfil', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Upload Avatar] User ${userId} avatar updated to ${publicUrl}`);

    return new Response(
      JSON.stringify({ success: true, avatar_url: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Upload Avatar] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro inesperado', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
