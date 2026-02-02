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

      // Get all attachments for active videos
      const videoIds = videos?.map(v => v.id) || [];
      const { data: anexos } = await supabase
        .from('saas_video_anexos')
        .select('*')
        .in('video_id', videoIds)
        .order('ordem', { ascending: true });

      // Get ratings aggregated per video
      const { data: avaliacoes } = await supabase
        .from('saas_video_avaliacoes')
        .select('video_id, nota')
        .in('video_id', videoIds);

      // Calculate average rating per video
      const ratingsMap: Record<number, { total: number; count: number }> = {};
      avaliacoes?.forEach(a => {
        if (!ratingsMap[a.video_id]) {
          ratingsMap[a.video_id] = { total: 0, count: 0 };
        }
        ratingsMap[a.video_id].total += a.nota;
        ratingsMap[a.video_id].count += 1;
      });

      // Get comments count per video
      const { data: comentariosCount } = await supabase
        .from('saas_video_comentarios')
        .select('video_id')
        .in('video_id', videoIds);

      const commentsCountMap: Record<number, number> = {};
      comentariosCount?.forEach(c => {
        commentsCountMap[c.video_id] = (commentsCountMap[c.video_id] || 0) + 1;
      });

      // Group videos by module with extra data
      const modulosComVideos = modulos?.map(modulo => ({
        ...modulo,
        videos: videos?.filter(v => v.idmodulo === modulo.id).map(v => ({
          ...v,
          anexos: anexos?.filter(a => a.video_id === v.id) || [],
          media_avaliacao: ratingsMap[v.id] ? ratingsMap[v.id].total / ratingsMap[v.id].count : 0,
          total_avaliacoes: ratingsMap[v.id]?.count || 0,
          total_comentarios: commentsCountMap[v.id] || 0
        })) || []
      })) || [];

      return new Response(
        JSON.stringify({ modulos: modulosComVideos }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get video details with comments
    if (action === 'get-video-details') {
      const { videoId } = body;
      
      // Get comments
      const { data: comentarios, error: comentariosError } = await supabase
        .from('saas_video_comentarios')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false });

      if (comentariosError) {
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar comentários' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user's rating if logged in
      const authHeader = req.headers.get('Authorization');
      let userRating = null;
      
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user) {
          const { data: rating } = await supabase
            .from('saas_video_avaliacoes')
            .select('nota')
            .eq('video_id', videoId)
            .eq('user_id', user.id)
            .single();
          
          userRating = rating?.nota || null;
        }
      }

      return new Response(
        JSON.stringify({ comentarios, userRating }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add comment
    if (action === 'add-comment') {
      const { videoId, comentario, userId, userNome, userAvatar } = body;
      
      const { data, error } = await supabase
        .from('saas_video_comentarios')
        .insert({ 
          video_id: videoId, 
          user_id: userId, 
          user_nome: userNome,
          user_avatar: userAvatar,
          comentario 
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding comment:', error);
        return new Response(
          JSON.stringify({ error: 'Erro ao adicionar comentário' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ comentario: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete comment
    if (action === 'delete-comment') {
      const { commentId, userId } = body;
      
      const { error } = await supabase
        .from('saas_video_comentarios')
        .delete()
        .eq('id', commentId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting comment:', error);
        return new Response(
          JSON.stringify({ error: 'Erro ao excluir comentário' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Add/update rating
    if (action === 'rate-video') {
      const { videoId, userId, nota } = body;
      
      const { data, error } = await supabase
        .from('saas_video_avaliacoes')
        .upsert({ 
          video_id: videoId, 
          user_id: userId, 
          nota,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'video_id,user_id' 
        })
        .select()
        .single();

      if (error) {
        console.error('Error rating video:', error);
        return new Response(
          JSON.stringify({ error: 'Erro ao avaliar vídeo' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ avaliacao: data }),
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
        query = query.eq('idmodulo', idModulo);
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

    // Get anexos for a video (admin)
    if (action === 'admin-get-anexos') {
      const { videoId } = body;
      
      const { data, error } = await supabase
        .from('saas_video_anexos')
        .select('*')
        .eq('video_id', videoId)
        .order('ordem', { ascending: true });

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Erro ao buscar anexos' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ anexos: data }),
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
        .insert({ idmodulo: idModulo, titulo, descricao, youtube_url, ordem: ordem || 0, ativo: true })
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
        .update({ idmodulo: idModulo, titulo, descricao, youtube_url, ordem, ativo })
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

    // Create anexo
    if (action === 'create-anexo') {
      const { videoId, nome, descricao, arquivoUrl, tipo, tamanho, ordem } = body;

      const { data, error } = await supabase
        .from('saas_video_anexos')
        .insert({ 
          video_id: videoId, 
          nome, 
          descricao, 
          arquivo_url: arquivoUrl, 
          tipo, 
          tamanho,
          ordem: ordem || 0 
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating anexo:', error);
        return new Response(
          JSON.stringify({ error: 'Erro ao criar anexo' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ anexo: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Delete anexo
    if (action === 'delete-anexo') {
      const { id } = body;

      const { error } = await supabase
        .from('saas_video_anexos')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting anexo:', error);
        return new Response(
          JSON.stringify({ error: 'Erro ao excluir anexo' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Admin delete comment
    if (action === 'admin-delete-comment') {
      const { commentId } = body;
      
      const { error } = await supabase
        .from('saas_video_comentarios')
        .delete()
        .eq('id', commentId);

      if (error) {
        console.error('Error deleting comment:', error);
        return new Response(
          JSON.stringify({ error: 'Erro ao excluir comentário' }),
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
