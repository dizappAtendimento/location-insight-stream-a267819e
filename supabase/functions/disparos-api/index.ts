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

        // Fetch counts for each list
        const listasWithCounts = await Promise.all((data || []).map(async (lista: any) => {
          let count = 0;
          if (lista.tipo === 'contatos') {
            const { count: contatosCount } = await supabase
              .from('SAAS_Contatos')
              .select('*', { count: 'exact', head: true })
              .eq('idLista', lista.id);
            count = contatosCount || 0;
          } else {
            const { count: gruposCount } = await supabase
              .from('SAAS_Grupos')
              .select('*', { count: 'exact', head: true })
              .eq('idLista', lista.id);
            count = gruposCount || 0;
          }
          return { ...lista, _count: count };
        }));

        console.log(`[Disparos API] Found ${listasWithCounts.length} listas with counts`);
        
        return new Response(
          JSON.stringify({ listas: listasWithCounts }),
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

      case 'validate-openai-key': {
        const apiKey = disparoData?.apikey_gpt;

        if (!apiKey) {
          return new Response(
            JSON.stringify({ valid: false, error: 'API key is required' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Disparos API] Validating OpenAI API key`);

        try {
          // Make a simple request to OpenAI to validate the key
          const response = await fetch('https://api.openai.com/v1/models', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
          });

          if (response.ok) {
            console.log(`[Disparos API] OpenAI API key is valid`);
            return new Response(
              JSON.stringify({ valid: true }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.log(`[Disparos API] OpenAI API key is invalid:`, errorData);
            
            let errorMessage = 'Chave API inválida';
            if (response.status === 401) {
              errorMessage = 'Chave API inválida ou expirada';
            } else if (response.status === 429) {
              errorMessage = 'Limite de requisições excedido. Tente novamente mais tarde.';
            }
            
            return new Response(
              JSON.stringify({ valid: false, error: errorMessage }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        } catch (validationError: any) {
          console.error('[Disparos API] Error validating OpenAI key:', validationError);
          return new Response(
            JSON.stringify({ valid: false, error: 'Erro ao validar a chave API' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      case 'generate-ai-message': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const prompt = disparoData?.prompt;
        if (!prompt) {
          return new Response(
            JSON.stringify({ error: 'Prompt is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Disparos API] Generating AI message for user ${userId}`);

        // Get user's OpenAI API key
        const { data: userData, error: userError } = await supabase
          .from('SAAS_Usuarios')
          .select('apikey_gpt')
          .eq('id', userId)
          .single();

        if (userError || !userData?.apikey_gpt) {
          console.log('[Disparos API] User has no OpenAI API key configured');
          return new Response(
            JSON.stringify({ error: 'Configure sua API key do ChatGPT em Conexões antes de usar a IA' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${userData.apikey_gpt}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: `Você é um especialista em marketing e comunicação via WhatsApp. 
Crie mensagens persuasivas, amigáveis e naturais para campanhas de marketing.
As mensagens devem ser informais mas profissionais.
Use variáveis como <nome> para personalização quando apropriado.
Mantenha as mensagens concisas (máximo 3-4 parágrafos curtos).
Não use hashtags ou emojis em excesso.`
                },
                {
                  role: 'user',
                  content: `Crie uma mensagem de WhatsApp com base nesta descrição: ${prompt}`
                }
              ],
              max_tokens: 500,
              temperature: 0.7,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[Disparos API] OpenAI API error:', errorData);
            
            if (response.status === 401) {
              return new Response(
                JSON.stringify({ error: 'API key inválida ou expirada. Atualize sua chave em Conexões.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            if (response.status === 429) {
              return new Response(
                JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente mais tarde.' }),
                { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
              );
            }
            
            throw new Error('Erro ao gerar mensagem com IA');
          }

          const data = await response.json();
          const generatedMessage = data.choices?.[0]?.message?.content;

          if (!generatedMessage) {
            throw new Error('Resposta vazia da IA');
          }

          console.log('[Disparos API] AI message generated successfully');

          return new Response(
            JSON.stringify({ message: generatedMessage }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (aiError: any) {
          console.error('[Disparos API] Error generating AI message:', aiError);
          return new Response(
            JSON.stringify({ error: aiError.message || 'Erro ao gerar mensagem com IA' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
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
