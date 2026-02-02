import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json();
    const { action } = body;

    // ========== PUBLIC ACTIONS ==========
    
    // Get all active modules with their videos
    if (action === 'get-public-videos') {
      const { data: modulos, error: modulosError } = await supabase
        .from('saas_video_modulos')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (modulosError) {
        console.error('Error fetching modules:', modulosError);
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar módulos' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: videos, error: videosError } = await supabase
        .from('saas_videos')
        .select('*')
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      if (videosError) {
        console.error('Error fetching videos:', videosError);
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar vídeos' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Group videos by module
      const modulosComVideos = modulos?.map(modulo => ({
        ...modulo,
        videos: videos?.filter(v => v.idModulo === modulo.id) || []
      })) || [];

      return new Response(
        JSON.stringify({ modulos: modulosComVideos }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ========== ADMIN ACTIONS ==========
    
    // Get all modules (including inactive) for admin
    if (action === 'admin-get-modulos') {
      const { data, error } = await supabase
        .from('saas_video_modulos')
        .select('*')
        .order('ordem', { ascending: true });

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar módulos' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ modulos: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all videos for admin
    if (action === 'admin-get-videos') {
      const { idModulo } = body;
      
      let query = supabase
        .from('saas_videos')
        .select('*')
        .order('ordem', { ascending: true });

      if (idModulo) {
        query = query.eq('idModulo', idModulo);
      }

      const { data, error } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar vídeos' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ videos: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create module
    if (action === 'create-modulo') {
      const { nome, descricao, ordem } = body;

      const { data, error } = await supabase
        .from('saas_video_modulos')
        .insert({ nome, descricao, ordem: ordem || 0, ativo: true })
        .select()
        .single();

      if (error) {
        console.error('Error creating module:', error);
        return new Response(
          JSON.stringify({ error: 'Erro ao criar módulo' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ modulo: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update module
    if (action === 'update-modulo') {
      const { id, nome, descricao, ordem, ativo } = body;

      const { data, error } = await supabase
        .from('saas_video_modulos')
        .update({ nome, descricao, ordem, ativo })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating module:', error);
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar módulo' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ modulo: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete module
    if (action === 'delete-modulo') {
      const { id } = body;

      const { error } = await supabase
        .from('saas_video_modulos')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting module:', error);
        return new Response(
          JSON.stringify({ error: 'Erro ao excluir módulo' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create video
    if (action === 'create-video') {
      const { idModulo, titulo, descricao, youtube_url, ordem } = body;

      const { data, error } = await supabase
        .from('saas_videos')
        .insert({ idModulo, titulo, descricao, youtube_url, ordem: ordem || 0, ativo: true })
        .select()
        .single();

      if (error) {
        console.error('Error creating video:', error);
        return new Response(
          JSON.stringify({ error: 'Erro ao criar vídeo' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ video: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update video
    if (action === 'update-video') {
      const { id, idModulo, titulo, descricao, youtube_url, ordem, ativo } = body;

      const { data, error } = await supabase
        .from('saas_videos')
        .update({ idModulo, titulo, descricao, youtube_url, ordem, ativo })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating video:', error);
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar vídeo' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ video: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete video
    if (action === 'delete-video') {
      const { id } = body;

      const { error } = await supabase
        .from('saas_videos')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting video:', error);
        return new Response(
          JSON.stringify({ error: 'Erro ao excluir vídeo' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação não reconhecida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Videos API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
