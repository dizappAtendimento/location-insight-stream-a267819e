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
          // Check for both 'contatos' and 'contacts' (legacy)
          if (lista.tipo === 'contatos' || lista.tipo === 'contacts') {
            const { count: contatosCount } = await supabase
              .from('SAAS_Contatos')
              .select('*', { count: 'exact', head: true })
              .eq('idLista', lista.id);
            count = contatosCount || 0;
          } else {
            // For grupos type
            const { count: gruposCount } = await supabase
              .from('SAAS_Grupos')
              .select('*', { count: 'exact', head: true })
              .eq('idLista', lista.id);
            count = gruposCount || 0;
          }
          console.log(`[Disparos API] Lista ${lista.id} (${lista.tipo}): ${count} items`);
          return { ...lista, _count: count };
        }));

        console.log(`[Disparos API] Found ${listasWithCounts.length} listas with counts`);
        
        return new Response(
          JSON.stringify({ listas: listasWithCounts }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-contatos': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const idLista = disparoData?.idLista;
        if (!idLista) {
          return new Response(
            JSON.stringify({ error: 'idLista is required in disparoData' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { data, error } = await supabase
          .from('SAAS_Contatos')
          .select('*')
          .eq('idLista', idLista)
          .eq('idUsuario', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[Disparos API] Error fetching contatos:', error);
          throw error;
        }

        console.log(`[Disparos API] Found ${data?.length || 0} contatos for lista ${idLista}`);
        
        return new Response(
          JSON.stringify({ contatos: data || [] }),
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
          .maybeSingle();

        if (disparoError) {
          console.error('[Disparos API] Error fetching disparo:', disparoError);
          throw disparoError;
        }

        if (!disparo) {
          return new Response(
            JSON.stringify({ error: 'Disparo não encontrado' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
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
          // Check if it's a trigger error about pending dispatches
          if (error.message?.includes('disparos pendentes') || error.message?.includes('Não é possível excluir')) {
            return new Response(
              JSON.stringify({ 
                error: 'Não é possível excluir esta conexão pois há disparos pendentes vinculados. Aguarde a finalização ou cancele os disparos primeiro.',
                code: 'PENDING_DISPATCHES'
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          throw error;
        }

        console.log(`[Disparos API] Connection ${connectionId} deleted successfully`);
        
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'force-delete-connection': {
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

        console.log(`[Disparos API] Force deleting connection ${connectionId} for user ${userId}`);

        // First, update all pending/processing dispatches for this connection to 'cancelled'
        const { data: cancelledDetails, error: cancelError } = await supabase
          .from('SAAS_Detalhes_Disparos')
          .update({ Status: 'cancelled', mensagemErro: 'Cancelado - conexão excluída' })
          .eq('idConexao', connectionId)
          .in('Status', ['pending', 'processing'])
          .select('idDisparo');

        if (cancelError) {
          console.error('[Disparos API] Error cancelling dispatches:', cancelError);
          throw cancelError;
        }

        const cancelledCount = cancelledDetails?.length || 0;
        console.log(`[Disparos API] Cancelled ${cancelledCount} pending dispatches for connection ${connectionId}`);

        // Update parent dispatches status if needed
        const affectedDisparoIds = [...new Set(cancelledDetails?.map(d => d.idDisparo).filter(Boolean) || [])];
        
        for (const disparoId of affectedDisparoIds) {
          // Check if all details are now done
          const { data: remainingPending } = await supabase
            .from('SAAS_Detalhes_Disparos')
            .select('id')
            .eq('idDisparo', disparoId)
            .in('Status', ['pending', 'processing'])
            .limit(1);

          if (!remainingPending || remainingPending.length === 0) {
            // Mark parent disparo as cancelled
            await supabase
              .from('SAAS_Disparos')
              .update({ StatusDisparo: 'Cancelado' })
              .eq('id', disparoId);
          }
        }

        // Now delete the connection
        const { error } = await supabase
          .from('SAAS_Conexões')
          .delete()
          .eq('id', connectionId)
          .eq('idUsuario', userId);

        if (error) {
          console.error('[Disparos API] Error deleting connection:', error);
          throw error;
        }

        console.log(`[Disparos API] Connection ${connectionId} force deleted successfully (cancelled ${cancelledCount} dispatches)`);
        
        return new Response(
          JSON.stringify({ success: true, cancelledCount }),
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

      case 'validate-xai-key': {
        const apiKey = disparoData?.apikey_gpt;

        if (!apiKey) {
          return new Response(
            JSON.stringify({ valid: false, error: 'API key is required' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Disparos API] Validating xAI API key`);

        try {
          // Make a simple request to xAI to validate the key
          const response = await fetch('https://api.x.ai/v1/models', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
            },
          });

          if (response.ok) {
            console.log(`[Disparos API] xAI API key is valid`);
            return new Response(
              JSON.stringify({ valid: true }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.log(`[Disparos API] xAI API key is invalid:`, errorData);
            
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
          console.error('[Disparos API] Error validating xAI key:', validationError);
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

        // Suporta tanto o formato antigo (prompt simples) quanto o novo (variações múltiplas)
        const variacoesMensagens = disparoData?.variacoesMensagens || [];
        const instrucoesAdicionais = disparoData?.instrucoesAdicionais || '';
        const quantidadeMensagens = disparoData?.quantidadeMensagens || 3;
        const prompt = disparoData?.prompt;

        // Verificar se tem mensagens base ou prompt
        if (variacoesMensagens.length === 0 && !prompt) {
          return new Response(
            JSON.stringify({ error: 'Mensagens base ou prompt são necessários' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Disparos API] Generating AI message for user ${userId}`);

        // Get global xAI API key from environment
        const xaiApiKey = Deno.env.get('XAI_API_KEY');

        if (!xaiApiKey) {
          console.log('[Disparos API] XAI_API_KEY not configured in environment');
          return new Response(
            JSON.stringify({ error: 'API xAI não configurada no sistema. Contate o administrador.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          let userPrompt: string;
          let systemPrompt: string;

          if (variacoesMensagens.length > 0) {
            // Modo de variações múltiplas
            systemPrompt = `Você é um especialista em marketing e comunicação via WhatsApp. 
Sua tarefa é criar ${quantidadeMensagens} variações de mensagens para campanhas de marketing.
As mensagens devem ser persuasivas, amigáveis e naturais.
As mensagens devem ser informais mas profissionais.
Mantenha as variáveis originais como <nome>, <saudacao>, <data>, etc.
Mantenha as mensagens concisas (máximo 3-4 parágrafos curtos).
Não use hashtags ou emojis em excesso.
IMPORTANTE: Retorne APENAS um array JSON com as ${quantidadeMensagens} mensagens, sem explicações.
Exemplo de formato: ["mensagem 1", "mensagem 2", "mensagem 3"]`;

            const mensagensBase = variacoesMensagens.join('\n\n---\n\n');
            userPrompt = `Com base nestas mensagens de exemplo:\n\n${mensagensBase}\n\n${instrucoesAdicionais ? `Instruções adicionais: ${instrucoesAdicionais}\n\n` : ''}Crie ${quantidadeMensagens} variações criativas dessas mensagens, mantendo o mesmo tom e objetivo.`;
          } else {
            // Modo de prompt simples
            systemPrompt = `Você é um especialista em marketing e comunicação via WhatsApp. 
Crie mensagens persuasivas, amigáveis e naturais para campanhas de marketing.
As mensagens devem ser informais mas profissionais.
Use variáveis como <nome> para personalização quando apropriado.
Mantenha as mensagens concisas (máximo 3-4 parágrafos curtos).
Não use hashtags ou emojis em excesso.`;
            userPrompt = `Crie uma mensagem de WhatsApp com base nesta descrição: ${prompt}`;
          }

          const response = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${xaiApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'grok-3-mini-fast',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
              ],
              max_tokens: 2000,
              temperature: 0.8,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[Disparos API] xAI API error:', response.status, errorData);
            
            if (response.status === 401) {
              return new Response(
                JSON.stringify({ error: 'Chave API xAI inválida. Contate o administrador.' }),
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
          const generatedContent = data.choices?.[0]?.message?.content;

          if (!generatedContent) {
            throw new Error('Resposta vazia da IA');
          }

          console.log('[Disparos API] AI message generated successfully');

          // Se for modo de variações, tentar fazer parse do array JSON
          if (variacoesMensagens.length > 0) {
            try {
              // Tentar extrair o array JSON da resposta
              const jsonMatch = generatedContent.match(/\[[\s\S]*\]/);
              if (jsonMatch) {
                const mensagensArray = JSON.parse(jsonMatch[0]);
                return new Response(
                  JSON.stringify({ 
                    mensagens: { mensagens: mensagensArray },
                    success: true 
                  }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }
            } catch (parseError) {
              console.log('[Disparos API] Could not parse as JSON, splitting by separator');
            }
            
            // Se não conseguir fazer parse, dividir por linhas ou separadores
            const mensagens = generatedContent
              .split(/\n\n+/)
              .map((m: string) => m.trim())
              .filter((m: string) => m.length > 20)
              .slice(0, quantidadeMensagens);
            
            return new Response(
              JSON.stringify({ 
                mensagens: { mensagens: mensagens.length > 0 ? mensagens : [generatedContent] },
                success: true 
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Modo simples - retorna mensagem única
          return new Response(
            JSON.stringify({ message: generatedContent }),
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

      case 'update-connection-crm': {
        // Atualiza o status do CRM de uma conexão no banco
        if (!userId || !disparoData?.connectionId) {
          return new Response(
            JSON.stringify({ error: 'userId and connectionId are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('SAAS_Conexões')
          .update({ crmAtivo: disparoData.crmAtivo })
          .eq('id', disparoData.connectionId)
          .eq('idUsuario', userId);

        if (error) {
          console.error('[Disparos API] Error updating connection CRM status:', error);
          throw error;
        }

        console.log(`[Disparos API] Updated crmAtivo=${disparoData.crmAtivo} for connection ${disparoData.connectionId}`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'import-contatos': {
        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { idLista, contatos, validateWhatsApp, connectionId } = disparoData || {};
        
        if (!idLista || !contatos || !Array.isArray(contatos) || contatos.length === 0) {
          return new Response(
            JSON.stringify({ error: 'idLista and contatos array are required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Disparos API] Importing ${contatos.length} contacts to list ${idLista}, validateWhatsApp: ${validateWhatsApp}`);

        // Verify list belongs to user
        const { data: lista, error: listaError } = await supabase
          .from('SAAS_Listas')
          .select('id, tipo')
          .eq('id', idLista)
          .eq('idUsuario', userId)
          .maybeSingle();

        if (listaError || !lista) {
          console.error('[Disparos API] List not found or access denied:', listaError);
          return new Response(
            JSON.stringify({ error: 'Lista não encontrada ou acesso negado' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get existing contacts in this list to avoid duplicates
        const { data: existingContacts } = await supabase
          .from('SAAS_Contatos')
          .select('telefone')
          .eq('idLista', idLista);

        const existingPhones = new Set((existingContacts || []).map((c: any) => c.telefone));
        console.log(`[Disparos API] Found ${existingPhones.size} existing contacts in list`);

        // Remove duplicates from import and filter out existing ones
        const seenPhones = new Set<string>();
        const uniqueContacts = contatos.filter((c: { nome: string; telefone: string }) => {
          if (!c.telefone || seenPhones.has(c.telefone) || existingPhones.has(c.telefone)) {
            return false;
          }
          seenPhones.add(c.telefone);
          return true;
        });

        console.log(`[Disparos API] ${contatos.length - uniqueContacts.length} duplicates removed, ${uniqueContacts.length} unique contacts`);

        if (uniqueContacts.length === 0) {
          return new Response(
            JSON.stringify({ success: true, imported: 0, duplicates: contatos.length, invalid: 0 }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Validate WhatsApp numbers if requested and connection provided
        let validContacts = uniqueContacts;
        let invalidCount = 0;

        if (validateWhatsApp && connectionId) {
          const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
          const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

          if (EVOLUTION_API_URL && EVOLUTION_API_KEY) {
            // Get connection details
            const { data: connection } = await supabase
              .from('SAAS_Conexões')
              .select('instanceName, Apikey')
              .eq('id', connectionId)
              .eq('idUsuario', userId)
              .maybeSingle();

            if (connection) {
              const baseUrl = EVOLUTION_API_URL.replace(/\/$/, '');
              const validatedContacts: typeof uniqueContacts = [];

              // Check in batches of 10 to avoid rate limiting
              const checkBatchSize = 10;
              for (let i = 0; i < uniqueContacts.length; i += checkBatchSize) {
                const batch = uniqueContacts.slice(i, i + checkBatchSize);
                
                const checkPromises = batch.map(async (c: { nome: string; telefone: string }) => {
                  try {
                    const checkResponse = await fetch(
                      `${baseUrl}/chat/whatsappNumbers/${connection.instanceName}`,
                      {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'apikey': EVOLUTION_API_KEY,
                        },
                        body: JSON.stringify({ numbers: [c.telefone] }),
                      }
                    );

                    if (checkResponse.ok) {
                      const result = await checkResponse.json();
                      // Evolution API returns array with exists: true/false
                      const isValid = Array.isArray(result) && result.length > 0 && result[0]?.exists === true;
                      return { contact: c, isValid };
                    }
                    return { contact: c, isValid: false };
                  } catch (error) {
                    console.error(`[Disparos API] Error checking number ${c.telefone}:`, error);
                    return { contact: c, isValid: false };
                  }
                });

                const results = await Promise.all(checkPromises);
                for (const { contact, isValid } of results) {
                  if (isValid) {
                    validatedContacts.push(contact);
                  } else {
                    invalidCount++;
                  }
                }
              }

              validContacts = validatedContacts;
              console.log(`[Disparos API] WhatsApp validation: ${validContacts.length} valid, ${invalidCount} invalid`);
            }
          }
        }

        if (validContacts.length === 0) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              imported: 0, 
              duplicates: contatos.length - uniqueContacts.length,
              invalid: invalidCount 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Prepare contacts for insertion
        const contactsToInsert = validContacts.map((c: { nome: string; telefone: string }) => ({
          nome: c.nome || null,
          telefone: c.telefone,
          idLista: idLista,
          idUsuario: userId,
          atributos: {}
        }));

        // Insert in batches of 100
        const batchSize = 100;
        let imported = 0;
        
        for (let i = 0; i < contactsToInsert.length; i += batchSize) {
          const batch = contactsToInsert.slice(i, i + batchSize);
          const { error: insertError, data: inserted } = await supabase
            .from('SAAS_Contatos')
            .insert(batch)
            .select('id');
          
          if (insertError) {
            console.error('[Disparos API] Error inserting batch:', insertError);
            throw insertError;
          }
          
          imported += inserted?.length || batch.length;
        }

        console.log(`[Disparos API] Successfully imported ${imported} contacts`);
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            imported,
            duplicates: contatos.length - uniqueContacts.length,
            invalid: invalidCount
          }),
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
