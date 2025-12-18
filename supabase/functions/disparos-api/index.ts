import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, userId, disparoData } = await req.json();

    console.log(`[Disparos API] Action: ${action}, UserId: ${userId || 'N/A'}`);

    switch (action) {
      case 'get-connections': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabase
          .from('SAAS_Conexões')
          .select('*')
          .eq('idUsuario', userId);

        if (error) {
          console.error('[Disparos API] Error fetching connections:', error);
          throw error;
        }

        console.log(`[Disparos API] Found ${data?.length || 0} connections`);
        
        return new Response(
          JSON.stringify({ connections: data || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-listas': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabase
          .from('SAAS_Listas')
          .select('*')
          .eq('idUsuario', userId);

        if (error) {
          console.error('[Disparos API] Error fetching listas:', error);
          throw error;
        }

        console.log(`[Disparos API] Found ${data?.length || 0} listas`);
        
        return new Response(
          JSON.stringify({ listas: data || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create-lista': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { nome, tipo, descricao } = await req.json().catch(() => ({})) || disparoData || {};

        const { data, error } = await supabase
          .from('SAAS_Listas')
          .insert({
            nome: nome || disparoData?.nome,
            tipo: tipo || disparoData?.tipo || 'contatos',
            descricao: descricao || disparoData?.descricao || null,
            idUsuario: userId,
            campos: {},
          })
          .select()
          .single();

        if (error) {
          console.error('[Disparos API] Error creating lista:', error);
          throw error;
        }

        console.log(`[Disparos API] Lista created with ID: ${data?.id}`);
        
        return new Response(
          JSON.stringify({ success: true, lista: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-lista': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const listaData = disparoData;
        if (!listaData?.id) {
          return new Response(
            JSON.stringify({ error: 'lista id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabase
          .from('SAAS_Listas')
          .update({
            nome: listaData.nome,
            tipo: listaData.tipo,
            descricao: listaData.descricao,
          })
          .eq('id', listaData.id)
          .eq('idUsuario', userId)
          .select()
          .single();

        if (error) {
          console.error('[Disparos API] Error updating lista:', error);
          throw error;
        }

        console.log(`[Disparos API] Lista updated: ${data?.id}`);
        
        return new Response(
          JSON.stringify({ success: true, lista: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-lista': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const listaId = disparoData?.id;
        if (!listaId) {
          return new Response(
            JSON.stringify({ error: 'lista id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('SAAS_Listas')
          .delete()
          .eq('id', listaId)
          .eq('idUsuario', userId);

        if (error) {
          console.error('[Disparos API] Error deleting lista:', error);
          throw error;
        }

        console.log(`[Disparos API] Lista deleted: ${listaId}`);
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create-disparo': {
        if (!userId || !disparoData) {
          return new Response(
            JSON.stringify({ error: 'userId and disparoData are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log('[Disparos API] Creating disparo with payload:', JSON.stringify(disparoData));

        const { data, error } = await supabase.rpc('create_disparo', {
          p_payload: {
            userId,
            ...disparoData,
          },
        });

        if (error) {
          console.error('[Disparos API] Error creating disparo:', error);
          throw error;
        }

        console.log(`[Disparos API] Disparo created with ID: ${data}`);
        
        return new Response(
          JSON.stringify({ success: true, disparoId: data }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-disparos': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabase
          .from('SAAS_Disparos')
          .select('*')
          .eq('userId', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[Disparos API] Error fetching disparos:', error);
          throw error;
        }

        console.log(`[Disparos API] Found ${data?.length || 0} disparos`);
        
        return new Response(
          JSON.stringify({ disparos: data || [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-disparo-detalhes': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const disparoId = disparoData?.id;
        if (!disparoId) {
          return new Response(
            JSON.stringify({ error: 'disparo id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get disparo data
        const { data: disparo, error: disparoError } = await supabase
          .from('SAAS_Disparos')
          .select('*')
          .eq('id', disparoId)
          .eq('userId', userId)
          .single();

        if (disparoError) {
          console.error('[Disparos API] Error fetching disparo:', disparoError);
          throw disparoError;
        }

        // Get detalhes from view
        const { data: detalhes, error: detalhesError } = await supabase
          .from('vw_Detalhes_Completo')
          .select('*')
          .eq('idDisparo', disparoId)
          .eq('UserId', userId)
          .order('dataEnvio', { ascending: false });

        if (detalhesError) {
          console.error('[Disparos API] Error fetching detalhes:', detalhesError);
          throw detalhesError;
        }

        // Get listas info
        const listaIds = disparo?.idListas || [];
        let listas: any[] = [];
        if (listaIds.length > 0) {
          const { data: listasData } = await supabase
            .from('SAAS_Listas')
            .select('id, nome, tipo')
            .in('id', listaIds);
          listas = listasData || [];
        }

        // Get conexoes info
        const conexaoIds = disparo?.idConexoes || [];
        let conexoes: any[] = [];
        if (conexaoIds.length > 0) {
          const { data: conexoesData } = await supabase
            .from('SAAS_Conexões')
            .select('id, NomeConexao, Telefone, instanceName')
            .in('id', conexaoIds);
          conexoes = conexoesData || [];
        }

        console.log(`[Disparos API] Disparo ${disparoId} loaded with ${detalhes?.length || 0} detalhes`);
        
        return new Response(
          JSON.stringify({ 
            disparo, 
            detalhes: detalhes || [], 
            listas,
            conexoes
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'pause-disparo': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const disparoId = disparoData?.id;
        if (!disparoId) {
          return new Response(
            JSON.stringify({ error: 'disparo id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase.rpc('pause_disparo', {
          p_disparo_id: disparoId,
          p_user_id: userId
        });

        if (error) {
          console.error('[Disparos API] Error pausing disparo:', error);
          throw error;
        }

        console.log(`[Disparos API] Disparo ${disparoId} paused`);
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'resume-disparo': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const disparoId = disparoData?.id;
        if (!disparoId) {
          return new Response(
            JSON.stringify({ error: 'disparo id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase.rpc('resume_disparo', {
          p_disparo_id: disparoId,
          p_user_id: userId
        });

        if (error) {
          console.error('[Disparos API] Error resuming disparo:', error);
          throw error;
        }

        console.log(`[Disparos API] Disparo ${disparoId} resumed`);
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-disparo': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const disparoId = disparoData?.id;
        if (!disparoId) {
          return new Response(
            JSON.stringify({ error: 'disparo id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase.rpc('delete_disparo', {
          p_disparo_id: disparoId,
          p_user_id: userId
        });

        if (error) {
          console.error('[Disparos API] Error deleting disparo:', error);
          throw error;
        }

        console.log(`[Disparos API] Disparo ${disparoId} deleted`);
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-connection': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const connectionId = disparoData?.id;
        if (!connectionId) {
          return new Response(
            JSON.stringify({ error: 'connection id is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Disparos API] Deleting connection ${connectionId} for user ${userId}`);

        const { error } = await supabase
          .from('SAAS_Conexões')
          .delete()
          .eq('id', connectionId)
          .eq('idUsuario', userId);

        if (error) {
          console.error('[Disparos API] Error deleting connection:', error);
          throw error;
        }

        console.log(`[Disparos API] Connection ${connectionId} deleted successfully`);
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-user-apikey': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const apiKey = disparoData?.apikey_gpt;

        console.log(`[Disparos API] Updating API key for user ${userId}`);

        const { error } = await supabase
          .from('SAAS_Usuarios')
          .update({ apikey_gpt: apiKey || null })
          .eq('id', userId);

        if (error) {
          console.error('[Disparos API] Error updating API key:', error);
          throw error;
        }

        console.log(`[Disparos API] API key updated successfully for user ${userId}`);
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error: any) {
    console.error('[Disparos API] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
