import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error("Evolution API credentials not configured");
      return new Response(
        JSON.stringify({ error: "Evolution API não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Parse request body safely
    let action = '', instanceName = '', data: any = null, userId = '';
    try {
      const body = await req.json();
      action = body.action || '';
      instanceName = body.instanceName || '';
      data = body.data || null;
      userId = body.userId || '';
    } catch (parseError) {
      console.error("[Evolution API] Error parsing request body:", parseError);
      return new Response(
        JSON.stringify({ error: "Corpo da requisição inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    console.log(`[Evolution API] Action: ${action}, Instance: ${instanceName || 'N/A'}, UserId: ${userId || 'N/A'}`);

    const baseUrl = EVOLUTION_API_URL.replace(/\/$/, '');
    const headers = {
      "Content-Type": "application/json",
      "apikey": EVOLUTION_API_KEY,
    };

    let response;
    let result;

    switch (action) {
      case "list-instances":
        response = await fetch(`${baseUrl}/instance/fetchInstances`, {
          method: "GET",
          headers,
        });
        result = await response.json();
        console.log(`[Evolution API] Found ${Array.isArray(result) ? result.length : 0} instances`);
        return new Response(
          JSON.stringify({ instances: result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "list-user-instances":
        // Busca instâncias do usuário no banco
        const { data: userConnections, error: connError } = await supabase
          .from("SAAS_Conexões")
          .select("*")
          .eq("idUsuario", userId);

        if (connError) {
          console.error("[Evolution API] Error fetching user connections:", connError);
          return new Response(
            JSON.stringify({ error: "Erro ao buscar conexões do usuário" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Para cada conexão, busca o status na Evolution API
        const instancesWithStatus = await Promise.all(
          (userConnections || []).map(async (conn: any) => {
            try {
              const statusRes = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${conn.instanceName}`, {
                method: "GET",
                headers,
              });
              const statusData = await statusRes.json();
              const instanceData = Array.isArray(statusData) ? statusData[0] : statusData;
              // Evolution API uses connectionStatus field
              const connStatus = instanceData?.connectionStatus || instanceData?.instance?.state || instanceData?.state;
              console.log(`[Evolution API] Instance ${conn.instanceName} status:`, connStatus);
              return {
                ...conn,
                status: connStatus === "open" ? "open" : "close",
              };
            } catch {
              return { ...conn, status: "close" };
            }
          })
        );

        return new Response(
          JSON.stringify({ instances: instancesWithStatus }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "get-instance":
        response = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
          method: "GET",
          headers,
        });
        result = await response.json();
        const instanceData = Array.isArray(result) ? result[0] : result;
        const connectionState = instanceData?.instance?.state || instanceData?.state || instanceData?.instance?.status || 'unknown';
        console.log(`[Evolution API] Instance ${instanceName} state: ${connectionState}`, JSON.stringify(instanceData));
        return new Response(
          JSON.stringify({ instance: instanceData, connectionState }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "create-instance":
        response = await fetch(`${baseUrl}/instance/create`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            instanceName: instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
          }),
        });
        result = await response.json();
        console.log(`[Evolution API] Instance created: ${instanceName}`);

        // Salva no banco usando service_role
        if (userId && result?.instance) {
          const { error: insertError } = await supabase
            .from("SAAS_Conexões")
            .insert({
              instanceName: instanceName,
              NomeConexao: data?.displayName || instanceName,
              idUsuario: userId,
              Apikey: result.hash?.apikey || null,
            });

          if (insertError) {
            console.error("[Evolution API] Error saving connection:", insertError);
          } else {
            console.log(`[Evolution API] Connection saved for user: ${userId}`);
          }
        }

        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "connect-instance":
        response = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
          method: "GET",
          headers,
        });
        result = await response.json();
        console.log(`[Evolution API] Connect response for ${instanceName}`);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "get-qrcode":
        response = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
          method: "GET",
          headers,
        });
        result = await response.json();
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "disconnect-instance":
        response = await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
          method: "DELETE",
          headers,
        });
        result = await response.json();
        console.log(`[Evolution API] Disconnected: ${instanceName}`);
        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "delete-instance":
        response = await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
          method: "DELETE",
          headers,
        });
        result = await response.json();
        console.log(`[Evolution API] Deleted: ${instanceName}`);

        // Remove do banco
        if (userId) {
          const { error: deleteError } = await supabase
            .from("SAAS_Conexões")
            .delete()
            .eq("instanceName", instanceName)
            .eq("idUsuario", userId);

          if (deleteError) {
            console.error("[Evolution API] Error deleting connection:", deleteError);
          }
        }

        return new Response(
          JSON.stringify(result),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "fetch-groups":
        response = await fetch(`${baseUrl}/group/fetchAllGroups/${instanceName}?getParticipants=false`, {
          method: "GET",
          headers,
        });
        result = await response.json();
        console.log(`[Evolution API] Fetched groups for ${instanceName}: ${Array.isArray(result) ? result.length : 0}`);
        return new Response(
          JSON.stringify({ groups: result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "fetch-group-participants":
        const { groupId } = data || {};
        if (!groupId) {
          return new Response(
            JSON.stringify({ error: "groupId é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        response = await fetch(`${baseUrl}/group/participants/${instanceName}?groupJid=${groupId}`, {
          method: "GET",
          headers,
        });
        result = await response.json();
        console.log(`[Evolution API] Fetched participants for group ${groupId}: ${result?.participants?.length || 0}`);
        return new Response(
          JSON.stringify({ participants: result?.participants || result || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "fetch-contacts":
        // Busca contatos da lista telefônica
        response = await fetch(`${baseUrl}/chat/findContacts/${instanceName}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ where: {} }),
        });
        result = await response.json();
        console.log(`[Evolution API] Fetched contacts for ${instanceName}: ${Array.isArray(result) ? result.length : 0}`);
        return new Response(
          JSON.stringify({ contacts: result || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "fetch-labels":
        // Busca todas as labels/etiquetas
        response = await fetch(`${baseUrl}/label/findLabels/${instanceName}`, {
          method: "GET",
          headers,
        });
        result = await response.json();
        console.log(`[Evolution API] Fetched labels for ${instanceName}: ${Array.isArray(result) ? result.length : 0}`);
        return new Response(
          JSON.stringify({ labels: result || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "sync-labels":
        // Sincroniza etiquetas e seus chats associados para o banco de dados
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "userId é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        console.log(`[Evolution API] Starting label sync for ${instanceName}, userId: ${userId}`);
        
        // Busca a conexão do usuário
        const { data: conexao, error: connErr } = await supabase
          .from('SAAS_Conexões')
          .select('id')
          .eq('instanceName', instanceName)
          .eq('idUsuario', userId)
          .single();
        
        if (connErr || !conexao) {
          console.error(`[Evolution API] Connection not found for ${instanceName}:`, connErr);
          return new Response(
            JSON.stringify({ error: "Conexão não encontrada" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        const idConexao = conexao.id;
        
        // 1. Busca todas as labels
        const labelsResponse = await fetch(`${baseUrl}/label/findLabels/${instanceName}`, {
          method: "GET",
          headers,
        });
        
        if (!labelsResponse.ok) {
          throw new Error('Falha ao buscar labels da API');
        }
        
        const allLabels = await labelsResponse.json();
        console.log(`[Evolution API] Found ${Array.isArray(allLabels) ? allLabels.length : 0} labels`);
        
        // Log completo da primeira label para ver estrutura
        if (Array.isArray(allLabels) && allLabels.length > 0) {
          console.log(`[Evolution API] Sample label: ${JSON.stringify(allLabels[0])}`);
        }
        
        if (!Array.isArray(allLabels) || allLabels.length === 0) {
          return new Response(
            JSON.stringify({ synced: 0, message: "Nenhuma etiqueta encontrada" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // 2. Para cada label, tenta buscar os chats associados via handleLabel
        let totalSynced = 0;
        const syncErrors: string[] = [];
        
        for (const label of allLabels) {
          try {
            // Tenta endpoint handleLabel com GET
            const handleLabelResponse = await fetch(`${baseUrl}/label/handleLabel/${instanceName}?labelId=${label.id}`, {
              method: "GET",
              headers,
            });
            
            console.log(`[Evolution API] handleLabel response for ${label.id}: status ${handleLabelResponse.status}`);
            
            if (handleLabelResponse.ok) {
              const handleData = await handleLabelResponse.json();
              console.log(`[Evolution API] handleLabel data for ${label.name}: ${JSON.stringify(handleData).substring(0, 500)}`);
              
              // Extrai chats associados
              let associatedChats: any[] = [];
              if (handleData.chats && Array.isArray(handleData.chats)) {
                associatedChats = handleData.chats;
              } else if (handleData.chatIds && Array.isArray(handleData.chatIds)) {
                associatedChats = handleData.chatIds.map((id: string) => ({ remoteJid: id }));
              } else if (handleData.association && Array.isArray(handleData.association)) {
                associatedChats = handleData.association;
              } else if (Array.isArray(handleData)) {
                associatedChats = handleData;
              }
              
              for (const chatAssoc of associatedChats) {
                const remoteJid = chatAssoc.remoteJid || chatAssoc.chatId || chatAssoc.id || (typeof chatAssoc === 'string' ? chatAssoc : null);
                if (!remoteJid) continue;
                
                const chatName = chatAssoc.pushName || chatAssoc.name || remoteJid.split('@')[0];
                
                const { error: upsertError } = await supabase
                  .from('SAAS_Chat_Labels')
                  .upsert({
                    idUsuario: userId,
                    idConexao: idConexao,
                    instanceName: instanceName,
                    labelId: String(label.id),
                    labelName: label.name,
                    labelColor: label.color,
                    remoteJid: remoteJid,
                    chatName: chatName,
                    updated_at: new Date().toISOString(),
                  }, {
                    onConflict: 'instanceName,labelId,remoteJid',
                    ignoreDuplicates: false,
                  });
                
                if (!upsertError) {
                  totalSynced++;
                }
              }
            }
          } catch (labelError) {
            console.error(`[Evolution API] Error fetching label ${label.id}:`, labelError);
          }
        }
        
        // 3. Se não encontrou nada via handleLabel, tenta buscar via chat/findChats
        if (totalSynced === 0) {
          console.log(`[Evolution API] No associations via handleLabel, trying findChats approach`);
          
          const chatsResponse = await fetch(`${baseUrl}/chat/findChats/${instanceName}`, {
            method: "POST",
            headers,
            body: JSON.stringify({}),
          });
          
          let allChats: any[] = [];
          if (chatsResponse.ok) {
            const chatsText = await chatsResponse.text();
            if (chatsText && chatsText.trim()) {
              const parsedChats = JSON.parse(chatsText);
              allChats = Array.isArray(parsedChats) ? parsedChats : [];
            }
          }
          
          // Log primeiro chat completo para debug
          if (allChats.length > 0) {
            console.log(`[Evolution API] First chat complete: ${JSON.stringify(allChats[0])}`);
          }
          
          // Verifica se algum chat tem labels
          for (const chat of allChats) {
            if (chat.labels || chat.labelIds || chat.labelId) {
              console.log(`[Evolution API] Found chat with labels: ${JSON.stringify(chat)}`);
            }
          }
        }
        
        console.log(`[Evolution API] Sync complete: ${totalSynced} chat-labels synced`);
        
        return new Response(
          JSON.stringify({ 
            synced: totalSynced, 
            labels: allLabels.length,
            errors: syncErrors.length > 0 ? syncErrors : undefined,
            message: `${totalSynced} associações sincronizadas de ${allLabels.length} etiquetas`
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "setup-label-webhook":
        // Configura o webhook para capturar eventos de labels
        if (!userId) {
          return new Response(
            JSON.stringify({ error: "userId é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        console.log(`[Evolution API] Setting up label webhook for ${instanceName}`);
        
        const webhookUrl = `${SUPABASE_URL}/functions/v1/label-webhook`;
        
        // Configura webhook na Evolution API - estrutura correta conforme documentação
        const webhookConfig = {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: true,
          webhookBase64: false,
          events: [
            "LABELS_EDIT",
            "LABELS_ASSOCIATION"
          ]
        };
        
        response = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
          method: "POST",
          headers,
          body: JSON.stringify(webhookConfig),
        });
        
        const webhookResult = await response.json();
        console.log(`[Evolution API] Webhook setup result:`, JSON.stringify(webhookResult));
        
        if (response.ok) {
          return new Response(
            JSON.stringify({ 
              success: true, 
              message: "Webhook configurado. As etiquetas serão sincronizadas automaticamente quando atribuídas no WhatsApp.",
              webhookUrl 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: webhookResult?.message || "Falha ao configurar webhook",
              details: webhookResult
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

      case "fetch-chats":
        // Busca conversas/chats
        response = await fetch(`${baseUrl}/chat/findChats/${instanceName}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ where: {} }),
        });
        
        const chatsText = await response.text();
        let chatsResult = [];
        if (chatsText && chatsText.trim()) {
          try {
            chatsResult = JSON.parse(chatsText);
          } catch (parseError) {
            console.error(`[Evolution API] Error parsing chats response:`, parseError, chatsText);
          }
        }
        
        console.log(`[Evolution API] Fetched chats for ${instanceName}: ${Array.isArray(chatsResult) ? chatsResult.length : 0}`);
        
        // Log primeiro chat para debug da estrutura
        if (Array.isArray(chatsResult) && chatsResult.length > 0) {
          console.log(`[Evolution API] Sample chat structure:`, JSON.stringify(chatsResult[0]));
        }
        
        return new Response(
          JSON.stringify({ chats: chatsResult || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "fetch-chats-by-label":
        // Busca chats associados a uma etiqueta específica
        const labelIdToFilter = data?.labelId;
        if (!labelIdToFilter) {
          return new Response(
            JSON.stringify({ error: "labelId é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        console.log(`[Evolution API] Fetching chats by label ${labelIdToFilter} for ${instanceName}`);
        
        // Usa o endpoint handleLabel para buscar chats com a label específica
        // Endpoint: POST /label/handleLabel/{instanceName}
        // Body: { action: 'findLabels' } ou buscar as associações
        let labelChatsResult: any[] = [];
        
        try {
          // Primeiro tenta o endpoint que retorna chats por label diretamente
          // Usa o endpoint fetchLabels que retorna as labels com seus chats
          response = await fetch(`${baseUrl}/label/fetchLabels/${instanceName}`, {
            method: "GET",
            headers,
          });
          
          console.log(`[Evolution API] fetchLabels response status: ${response.status}`);
          
          if (response.ok) {
            const labelsText = await response.text();
            console.log(`[Evolution API] fetchLabels raw response (first 500 chars): ${labelsText.substring(0, 500)}`);
            
            if (labelsText && labelsText.trim()) {
              const labelsData = JSON.parse(labelsText);
              
              // Estrutura: array de labels, cada uma com id, name, color, e possivelmente chats/associations
              if (Array.isArray(labelsData)) {
                const targetLabel = labelsData.find((l: any) => 
                  l.id === labelIdToFilter || String(l.id) === String(labelIdToFilter)
                );
                
                console.log(`[Evolution API] Target label found:`, JSON.stringify(targetLabel)?.substring(0, 200));
                
                if (targetLabel) {
                  // Verifica se a label tem chats/associations associados
                  const associations = targetLabel.chats || targetLabel.associations || targetLabel.labelAssociations || [];
                  
                  if (associations.length > 0) {
                    console.log(`[Evolution API] Found ${associations.length} associations in label object`);
                    
                    // Busca todos os chats para obter os detalhes
                    response = await fetch(`${baseUrl}/chat/findChats/${instanceName}`, {
                      method: "POST",
                      headers,
                      body: JSON.stringify({}),
                    });
                    
                    if (response.ok) {
                      const allChatsText = await response.text();
                      if (allChatsText && allChatsText.trim()) {
                        const allChats = JSON.parse(allChatsText);
                        const chatsArray = Array.isArray(allChats) ? allChats : [];
                        
                        // Extrai os remoteJids das associações
                        const remoteJids = associations.map((c: any) => c.remoteJid || c.chatId || c).filter(Boolean);
                        
                        // Filtra apenas os chats que estão na lista
                        labelChatsResult = chatsArray.filter((chat: any) => 
                          remoteJids.includes(chat.remoteJid) || remoteJids.includes(chat.id)
                        );
                        
                        console.log(`[Evolution API] Matched ${labelChatsResult.length} chats from ${chatsArray.length} total`);
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error(`[Evolution API] fetchLabels failed:`, e);
        }
        
        // Se não encontrou via API, busca no banco de dados SAAS_Chat_Labels
        if (labelChatsResult.length === 0) {
          console.log(`[Evolution API] No chats from API, trying database...`);
          
          const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
          const supabaseClient = createClient(supabaseUrl, supabaseKey);
          
          const { data: savedLabels, error: dbError } = await supabaseClient
            .from('SAAS_Chat_Labels')
            .select('remoteJid, chatName')
            .eq('instanceName', instanceName)
            .eq('labelId', labelIdToFilter);
          
          console.log(`[Evolution API] Database query result: ${savedLabels?.length || 0} records, error: ${dbError?.message || 'none'}`);
          
          if (!dbError && savedLabels && savedLabels.length > 0) {
            // Retorna os dados do banco formatados como chats
            labelChatsResult = savedLabels.map((item: any) => ({
              remoteJid: item.remoteJid,
              name: item.chatName || item.remoteJid?.split('@')[0],
              pushName: item.chatName,
              isGroup: item.remoteJid?.includes('@g.us') || false,
            }));
            
            console.log(`[Evolution API] Returning ${labelChatsResult.length} chats from database`);
          }
        }
        
        console.log(`[Evolution API] Final result: ${labelChatsResult.length} chats with label ${labelIdToFilter}`);
        
        return new Response(
          JSON.stringify({ chats: labelChatsResult }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "status":
        // Busca status de uma instância específica usando apikey própria
        const customApikey = data?.apikey;
        const statusHeaders = {
          "Content-Type": "application/json",
          "apikey": customApikey || EVOLUTION_API_KEY,
        };
        response = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
          method: "GET",
          headers: statusHeaders,
        });
        result = await response.json();
        const statusInstance = Array.isArray(result) ? result[0] : result;
        const state = statusInstance?.connectionStatus || statusInstance?.instance?.state || statusInstance?.state || 'close';
        console.log(`[Evolution API] Status for ${instanceName}: ${state}`);
        return new Response(
          JSON.stringify({ state, instance: statusInstance }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "check-whatsapp":
        // Verifica se números têm WhatsApp
        const { phones } = data || {};
        if (!phones || !Array.isArray(phones) || phones.length === 0) {
          return new Response(
            JSON.stringify({ error: "Lista de telefones é obrigatória" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Formata números para o formato do WhatsApp
        const formattedPhones = phones.map((phone: string) => {
          // Remove tudo que não for número
          const cleaned = phone.replace(/\D/g, '');
          // Adiciona @s.whatsapp.net se não tiver
          return cleaned.includes('@') ? cleaned : `${cleaned}@s.whatsapp.net`;
        });

        console.log(`[Evolution API] Checking ${formattedPhones.length} numbers on ${instanceName}`);

        // Divide em lotes de 50 para não sobrecarregar
        const batchSize = 50;
        const allResults: any[] = [];

        for (let i = 0; i < formattedPhones.length; i += batchSize) {
          const batch = formattedPhones.slice(i, i + batchSize);
          
          try {
            const checkResponse = await fetch(`${baseUrl}/chat/whatsappNumbers/${instanceName}`, {
              method: "POST",
              headers,
              body: JSON.stringify({ numbers: batch.map((p: string) => p.replace('@s.whatsapp.net', '')) }),
            });

            if (checkResponse.ok) {
              const checkResult = await checkResponse.json();
              // O resultado contém array com {exists: boolean, jid: string, number: string}
              if (Array.isArray(checkResult)) {
                allResults.push(...checkResult);
              }
            }
          } catch (batchError) {
            console.error(`[Evolution API] Batch error:`, batchError);
          }

          // Pequeno delay entre batches
          if (i + batchSize < formattedPhones.length) {
            await new Promise(r => setTimeout(r, 100));
          }
        }

        console.log(`[Evolution API] WhatsApp check complete: ${allResults.filter((r: any) => r.exists).length}/${phones.length} have WhatsApp`);

        return new Response(
          JSON.stringify({ 
            results: allResults,
            total: phones.length,
            withWhatsApp: allResults.filter((r: any) => r.exists).length
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      default:
        return new Response(
          JSON.stringify({ error: "Ação não reconhecida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    console.error("[Evolution API] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Erro interno";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});