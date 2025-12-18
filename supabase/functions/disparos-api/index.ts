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
