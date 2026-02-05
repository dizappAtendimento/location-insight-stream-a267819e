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
    let action = '', instanceName = '', data: any = null, userId = '', apikey = '';
    let rawBody: any = {};
    try {
      rawBody = await req.json();
      action = rawBody.action || '';
      instanceName = rawBody.instanceName || '';
      data = rawBody.data || null;
      userId = rawBody.userId || '';
      apikey = rawBody.apikey || ''; // Support apikey at root level
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
              
              // Extrai dados do perfil da Evolution API
              const profilePicUrl = instanceData?.profilePicUrl || null;
              const profileName = instanceData?.profileName || null;
              const ownerJid = instanceData?.ownerJid || null;
              const telefone = ownerJid ? ownerJid.split('@')[0] : null;
              
              // Atualiza o banco se houver dados novos
              const updates: any = {};
              if (profilePicUrl && profilePicUrl !== conn.FotoPerfil) {
                updates.FotoPerfil = profilePicUrl;
              }
              if (telefone && telefone !== conn.Telefone) {
                updates.Telefone = telefone;
              }
              if (instanceData?.token && !conn.Apikey) {
                updates.Apikey = instanceData.token;
              }
              
              if (Object.keys(updates).length > 0) {
                console.log(`[Evolution API] Updating ${conn.instanceName} with:`, updates);
                await supabase
                  .from("SAAS_Conexões")
                  .update(updates)
                  .eq("id", conn.id);
              }
              
              return {
                ...conn,
                ...updates,
                status: connStatus === "open" ? "open" : "close",
              };
            } catch (err) {
              console.error(`[Evolution API] Error fetching status for ${conn.instanceName}:`, err);
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
        // Evolution API uses connectionStatus field
        const connectionState = instanceData?.connectionStatus || instanceData?.instance?.state || instanceData?.state || 'unknown';
        console.log(`[Evolution API] Instance ${instanceName} connectionState: ${connectionState}`, JSON.stringify(instanceData));
        return new Response(
          JSON.stringify({ instance: instanceData, connectionState }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "create-instance":
        // Check connection limit before creating
        if (userId) {
          // Get user's plan limit
          const { data: userData, error: userError } = await supabase
            .from("vw_Usuarios_Com_Plano")
            .select("plano_qntConexoes")
            .eq("id", userId)
            .maybeSingle();
          
          if (userError) {
            console.error("[Evolution API] Error fetching user plan:", userError);
          }
          
          const planLimit = userData?.plano_qntConexoes ?? null;
          
          if (planLimit !== null) {
            // Count current connections
            const { count: currentConnections, error: countError } = await supabase
              .from("SAAS_Conexões")
              .select("id", { count: 'exact', head: true })
              .eq("idUsuario", userId);
            
            if (countError) {
              console.error("[Evolution API] Error counting connections:", countError);
            }
            
            const connCount = currentConnections || 0;
            console.log(`[Evolution API] User ${userId} has ${connCount}/${planLimit} connections`);
            
            if (connCount >= planLimit) {
              console.log(`[Evolution API] Connection limit reached for user ${userId}`);
              return new Response(
                JSON.stringify({ 
                  error: `Limite de conexões atingido. Seu plano permite apenas ${planLimit} conexões.`,
                  code: "CONNECTION_LIMIT_REACHED"
                }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
              );
            }
          }
        }
        
        // Configura webhook do CRM automaticamente
        const crmWebhookUrl = `${SUPABASE_URL}/functions/v1/crm-webhook`;
        
        response = await fetch(`${baseUrl}/instance/create`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            instanceName: instanceName,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
            webhook: {
              url: crmWebhookUrl,
              byEvents: false,
              base64: false,
              headers: {},
              events: ["MESSAGES_UPSERT"]
            }
          }),
        });
        result = await response.json();
        console.log(`[Evolution API] Instance created: ${instanceName} with CRM webhook: ${crmWebhookUrl}`);

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
        // Primeiro verifica o status da instância
        const statusCheckRes = await fetch(`${baseUrl}/instance/fetchInstances?instanceName=${instanceName}`, {
          method: "GET",
          headers,
        });
        const statusCheckData = await statusCheckRes.json();
        const instanceStatusData = Array.isArray(statusCheckData) ? statusCheckData[0] : statusCheckData;
        const currentStatus = instanceStatusData?.connectionStatus || instanceStatusData?.instance?.state || instanceStatusData?.state;
        
        console.log(`[Evolution API] get-qrcode: Instance ${instanceName} current status: ${currentStatus}`);
        
        // Se já estiver conectado, retorna mensagem clara
        if (currentStatus === 'open') {
          return new Response(
            JSON.stringify({ 
              error: "already_connected", 
              message: "Esta conexão já está ativa. Não é necessário escanear o QR Code novamente."
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Se não estiver conectado, tenta obter o QR Code
        response = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
          method: "GET",
          headers,
        });
        result = await response.json();
        
        console.log(`[Evolution API] get-qrcode response:`, JSON.stringify(result));
        
        // Se ainda não retornar QR Code, a instância pode precisar ser reiniciada
        if (!result?.base64 && !result?.qrcode?.base64 && !result?.pairingCode) {
          console.log(`[Evolution API] No QR code returned, instance may need restart`);
          
          // Tenta reiniciar a instância
          try {
            await fetch(`${baseUrl}/instance/restart/${instanceName}`, {
              method: "PUT",
              headers,
            });
            console.log(`[Evolution API] Instance ${instanceName} restarted`);
            
            // Aguarda um pouco e tenta novamente
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const retryRes = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
              method: "GET",
              headers,
            });
            result = await retryRes.json();
            console.log(`[Evolution API] Retry get-qrcode response:`, JSON.stringify(result));
          } catch (restartErr) {
            console.error(`[Evolution API] Error restarting instance:`, restartErr);
          }
        }
        
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
        // Usa apikey da conexão ou a global
        const deleteHeaders = {
          "Content-Type": "application/json",
          "apikey": apikey || EVOLUTION_API_KEY,
        };
        response = await fetch(`${baseUrl}/instance/delete/${instanceName}`, {
          method: "DELETE",
          headers: deleteHeaders,
        });
        result = await response.json();
        console.log(`[Evolution API] Deleted from Evolution API: ${instanceName}`, result);

        // Remove do banco
        if (userId) {
          const { error: deleteError } = await supabase
            .from("SAAS_Conexões")
            .delete()
            .eq("instanceName", instanceName)
            .eq("idUsuario", userId);

          if (deleteError) {
            console.error("[Evolution API] Error deleting connection from DB:", deleteError);
          } else {
            console.log(`[Evolution API] Deleted from DB: ${instanceName}`);
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
        // Busca contatos da lista telefônica E conversas para combinar dados
        // findContacts tem os nomes salvos, findChats tem os números reais
        
        // 1. Busca lista telefônica (tem os nomes salvos)
        const contactsResponse = await fetch(`${baseUrl}/chat/findContacts/${instanceName}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ where: {} }),
        });
        
        const contactsText = await contactsResponse.text();
        let savedContacts: any[] = [];
        if (contactsText && contactsText.trim()) {
          try {
            savedContacts = JSON.parse(contactsText);
          } catch (parseError) {
            console.error(`[Evolution API] Error parsing contacts:`, parseError);
          }
        }
        
        console.log(`[Evolution API] Found ${savedContacts.length} saved contacts`);
        if (savedContacts.length > 0) {
          console.log(`[Evolution API] Sample saved contact:`, JSON.stringify(savedContacts[0]));
        }
        
        // Cria mapa de contatos: remoteJid -> dados do contato
        const contactsMap = new Map<string, any>();
        for (const contact of savedContacts) {
          if (contact.remoteJid) {
            contactsMap.set(contact.remoteJid, contact);
          }
        }
        
        // 2. Busca conversas para obter números reais
        const chatsForContactsResponse = await fetch(`${baseUrl}/chat/findChats/${instanceName}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ where: {} }),
        });
        
        const chatsForContactsText = await chatsForContactsResponse.text();
        let chatsForContacts: any[] = [];
        if (chatsForContactsText && chatsForContactsText.trim()) {
          try {
            chatsForContacts = JSON.parse(chatsForContactsText);
          } catch (parseError) {
            console.error(`[Evolution API] Error parsing chats:`, parseError);
          }
        }
        
        // Cria mapa de números reais: remoteJid -> phoneNumber
        const phoneMap = new Map<string, string>();
        for (const chatItem of chatsForContacts) {
          if (chatItem.remoteJid && !chatItem.isGroup && !chatItem.remoteJid.includes('@g.us')) {
            let phoneNumber = '';
            const remoteJidAlt = chatItem.lastMessage?.key?.remoteJidAlt;
            if (remoteJidAlt && remoteJidAlt.includes('@s.whatsapp.net')) {
              phoneNumber = remoteJidAlt.replace(/@.*$/, '');
            } else if (chatItem.remoteJid.includes('@s.whatsapp.net')) {
              phoneNumber = chatItem.remoteJid.replace(/@.*$/, '');
            }
            if (phoneNumber) {
              phoneMap.set(chatItem.remoteJid, phoneNumber);
            }
          }
        }
        
        // 3. Combina dados: contatos salvos com números reais
        const processedContacts = savedContacts
          .filter((contact: any) => contact.remoteJid && !contact.remoteJid.includes('@g.us'))
          .map((contact: any) => {
            // Pega o número real do mapa, ou extrai do próprio contato
            let phoneNumber = phoneMap.get(contact.remoteJid) || '';
            
            // Se não encontrou no mapa, tenta extrair do próprio contato
            if (!phoneNumber) {
              if (contact.phoneNumber) {
                phoneNumber = contact.phoneNumber.replace(/\D/g, '');
              } else if (contact.remoteJid.includes('@s.whatsapp.net')) {
                phoneNumber = contact.remoteJid.replace(/@.*$/, '');
              }
            }
            
            return {
              id: contact.id || contact.remoteJid,
              remoteJid: contact.remoteJid,
              pushName: contact.pushName || contact.name || '',
              phoneNumber: phoneNumber,
              profilePicUrl: contact.profilePicUrl,
            };
          });
        
        console.log(`[Evolution API] Processed ${processedContacts.length} contacts with names and real phone numbers`);
        
        // Log sample para debug
        if (processedContacts.length > 0) {
          console.log(`[Evolution API] Sample processed contact:`, JSON.stringify(processedContacts[0]));
        }
        
        return new Response(
          JSON.stringify({ contacts: processedContacts }),
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
        // Busca TODAS as conversas/chats sem limite - EXTRAÇÃO COMPLETA
        console.log(`[Evolution API] Fetching ALL chats for ${instanceName}...`);
        
        // 1. Buscar todos os chats
        response = await fetch(`${baseUrl}/chat/findChats/${instanceName}`, {
          method: "POST",
          headers,
          body: JSON.stringify({ where: {} }),
        });
        
        const chatsText = await response.text();
        let chatsResult: any[] = [];
        if (chatsText && chatsText.trim()) {
          try {
            chatsResult = JSON.parse(chatsText);
          } catch (parseError) {
            console.error(`[Evolution API] Error parsing chats response:`, parseError, chatsText);
          }
        }
        
        console.log(`[Evolution API] Raw chats fetched: ${Array.isArray(chatsResult) ? chatsResult.length : 0}`);
        
        // 2. Buscar todos os contatos salvos para resolver @lid
        let savedContactsMap = new Map<string, { name: string; phone: string }>();
        try {
          const contactsResponse = await fetch(`${baseUrl}/chat/findContacts/${instanceName}`, {
            method: "POST",
            headers,
            body: JSON.stringify({ where: {} }),
          });
          
          if (contactsResponse.ok) {
            const contactsText = await contactsResponse.text();
            if (contactsText && contactsText.trim()) {
              const contacts = JSON.parse(contactsText);
              if (Array.isArray(contacts)) {
                for (const contact of contacts) {
                  const remoteJid = contact.remoteJid || contact.id;
                  if (remoteJid) {
                    // Mapeia o remoteJid para o nome e telefone
                    let phone = '';
                    if (contact.phoneNumber) {
                      phone = String(contact.phoneNumber).replace(/\D/g, '');
                    } else if (remoteJid.includes('@s.whatsapp.net')) {
                      phone = remoteJid.replace(/@.*$/, '');
                    }
                    savedContactsMap.set(remoteJid, {
                      name: contact.pushName || contact.name || '',
                      phone: phone,
                    });
                  }
                }
                console.log(`[Evolution API] Loaded ${savedContactsMap.size} saved contacts for resolution`);
              }
            }
          }
        } catch (contactsError) {
          console.error(`[Evolution API] Error fetching contacts for resolution:`, contactsError);
        }
        
        // Log primeiro chat para debug da estrutura
        if (Array.isArray(chatsResult) && chatsResult.length > 0) {
          console.log(`[Evolution API] Sample chat structure:`, JSON.stringify(chatsResult[0]));
        }
        
        // Processar cada chat para extrair o número de telefone real
        const processedChats = (chatsResult || []).map((chat: any) => {
          const remoteJid = chat.remoteJid || '';
          
          // Tenta extrair o número real de várias fontes possíveis
          let phoneNumber = '';
          let pushName = chat.pushName || chat.name || chat.contact?.name || '';
          
          // 1. Tenta resolver via contatos salvos primeiro
          if (savedContactsMap.has(remoteJid)) {
            const savedContact = savedContactsMap.get(remoteJid)!;
            if (savedContact.phone) {
              phoneNumber = savedContact.phone;
            }
            if (!pushName && savedContact.name) {
              pushName = savedContact.name;
            }
          }
          
          // 2. remoteJidAlt geralmente contém o número real
          if (!phoneNumber) {
            const remoteJidAlt = chat.lastMessage?.key?.remoteJidAlt;
            if (remoteJidAlt && remoteJidAlt.includes('@s.whatsapp.net')) {
              phoneNumber = remoteJidAlt.replace(/@.*$/, '');
            }
          }
          
          // 3. Se não tem remoteJidAlt, tenta o remoteJid se for @s.whatsapp.net
          if (!phoneNumber && remoteJid.includes('@s.whatsapp.net')) {
            phoneNumber = remoteJid.replace(/@.*$/, '');
          }
          
          // 4. Se o remoteJid é @lid, tenta extrair de outros campos
          if (!phoneNumber && remoteJid.includes('@lid')) {
            // Busca em participant ou phone fields
            if (chat.lastMessage?.key?.participant?.includes('@s.whatsapp.net')) {
              phoneNumber = chat.lastMessage.key.participant.replace(/@.*$/, '');
            } else if (chat.phone) {
              phoneNumber = String(chat.phone).replace(/\D/g, '');
            }
            // Se ainda não tem, usa o próprio @lid ID como identificador
            if (!phoneNumber) {
              phoneNumber = remoteJid.replace(/@.*$/, '');
            }
          }
          
          // 5. Se ainda não tem número, usa o ID do remoteJid
          if (!phoneNumber && remoteJid) {
            phoneNumber = remoteJid.replace(/@.*$/, '');
          }
          
          return {
            ...chat,
            phoneNumber,
            pushName,
            originalId: remoteJid,
          };
        });
        
        console.log(`[Evolution API] Processed ${processedChats.length} chats with phone extraction`);
        
        // Log amostra de chat processado
        if (processedChats.length > 0) {
          console.log(`[Evolution API] Sample processed chat:`, JSON.stringify({
            remoteJid: processedChats[0].remoteJid,
            phoneNumber: processedChats[0].phoneNumber,
            pushName: processedChats[0].pushName,
          }));
        }
        
        // Contar quantos têm número válido vs @lid
        const withValidPhone = processedChats.filter((c: any) => c.phoneNumber && /^\d{10,}$/.test(c.phoneNumber)).length;
        const withLidPhone = processedChats.filter((c: any) => c.phoneNumber && !/^\d{10,}$/.test(c.phoneNumber)).length;
        console.log(`[Evolution API] Chats with valid phone: ${withValidPhone}, with LID: ${withLidPhone}`);
        
        return new Response(
          JSON.stringify({ chats: processedChats }),
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
        const customApikey = apikey || data?.apikey; // Support apikey at root level or in data
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
        console.log(`[Evolution API] Status for ${instanceName}: ${state}, raw:`, JSON.stringify(statusInstance?.connectionStatus || statusInstance?.instance));
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

      case "send-message":
        // Envia mensagem de texto ou mídia via Evolution API
        // Aceita parâmetros tanto no nível raiz quanto dentro de "data"
        const to = data?.to || rawBody.to;
        const message = data?.message || rawBody.message;
        const media = data?.media || rawBody.media;
        
        if (!to) {
          return new Response(
            JSON.stringify({ error: "Destinatário (to) é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Formata o número para o padrão WhatsApp
        const cleanedNumber = to.replace(/\D/g, '');
        const remoteJid = cleanedNumber.includes('@') ? cleanedNumber : `${cleanedNumber}@s.whatsapp.net`;

        console.log(`[Evolution API] Sending message to ${remoteJid} via ${instanceName}`);

        let sendResult;
        
        if (media?.url) {
          // Enviar mídia
          const mediaType = media.type || 'document';
          let mediaEndpoint = '/message/sendMedia/';
          let mediaPayload: any = {
            number: remoteJid,
            media: media.url,
            caption: message || '',
            fileName: media.filename,
          };

          switch (mediaType) {
            case 'image':
              mediaPayload.mediatype = 'image';
              break;
            case 'video':
              mediaPayload.mediatype = 'video';
              break;
            case 'audio':
              mediaEndpoint = '/message/sendWhatsAppAudio/';
              mediaPayload = {
                number: remoteJid,
                audio: media.url,
              };
              break;
            case 'document':
            default:
              mediaPayload.mediatype = 'document';
              mediaPayload.mimetype = media.mimetype || 'application/octet-stream';
              break;
          }

          const mediaResponse = await fetch(`${baseUrl}${mediaEndpoint}${instanceName}`, {
            method: 'POST',
            headers,
            body: JSON.stringify(mediaPayload),
          });

          sendResult = await mediaResponse.json();
          
          if (!mediaResponse.ok) {
            console.error(`[Evolution API] Error sending media:`, sendResult);
            return new Response(
              JSON.stringify({ error: sendResult?.message || 'Erro ao enviar mídia', details: sendResult }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else if (message) {
          // Enviar texto
          const textResponse = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              number: remoteJid,
              text: message,
            }),
          });

          sendResult = await textResponse.json();
          
          if (!textResponse.ok) {
            console.error(`[Evolution API] Error sending text:`, sendResult);
            
            // Melhora mensagem de erro para casos comuns
            let errorMessage = sendResult?.message || 'Erro ao enviar texto';
            if (sendResult?.response?.message?.some((m: string) => m.includes("Cannot read properties of undefined"))) {
              errorMessage = `A instância "${instanceName}" não está conectada ou não está pronta para enviar mensagens. Verifique se o WhatsApp está conectado.`;
            } else if (sendResult?.response?.message?.some((m: string) => m.includes("does not exist"))) {
              errorMessage = `A instância "${instanceName}" não foi encontrada. Verifique o nome da instância.`;
            }
            
            return new Response(
              JSON.stringify({ error: errorMessage, details: sendResult }),
              { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({ error: "Mensagem (message) ou mídia (media) é obrigatório" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[Evolution API] Message sent successfully to ${remoteJid}`);
        
        return new Response(
          JSON.stringify({ success: true, result: sendResult }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "setup-crm-webhook":
        // Configura webhook do CRM em uma instância existente
        const crmWebhookEndpoint = `${SUPABASE_URL}/functions/v1/crm-webhook`;
        
        console.log(`[Evolution API] Setting up CRM webhook for ${instanceName}: ${crmWebhookEndpoint}`);
        
        // Evolution API v2 espera a estrutura dentro de um objeto "webhook"
        response = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            webhook: {
              url: crmWebhookEndpoint,
              enabled: true,
              webhookByEvents: false,
              webhookBase64: false,
              events: ["MESSAGES_UPSERT"]
            }
          }),
        });
        
        result = await response.json();
        console.log(`[Evolution API] Webhook setup result:`, JSON.stringify(result));
        
        return new Response(
          JSON.stringify({ success: true, webhook: crmWebhookEndpoint, result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "remove-crm-webhook":
        // Remove webhook do CRM de uma instância
        console.log(`[Evolution API] Removing CRM webhook for ${instanceName}`);
        
        response = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            url: "",
            enabled: false,
            webhookByEvents: false,
            webhookBase64: false,
            events: []
          }),
        });
        
        result = await response.json();
        console.log(`[Evolution API] Webhook removal result:`, JSON.stringify(result));
        
        return new Response(
          JSON.stringify({ success: true, result }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

      case "check-crm-webhook":
        // Verifica se o webhook do CRM está configurado
        console.log(`[Evolution API] Checking CRM webhook for ${instanceName}`);
        
        response = await fetch(`${baseUrl}/webhook/find/${instanceName}`, {
          method: "GET",
          headers,
        });
        
        result = await response.json();
        console.log(`[Evolution API] Webhook check result:`, JSON.stringify(result));
        
        const currentWebhookUrl = result?.url || result?.webhook?.url || '';
        const isCrmActive = currentWebhookUrl.includes('crm-webhook');
        
        return new Response(
          JSON.stringify({ success: true, crmAtivo: isCrmActive, webhookUrl: currentWebhookUrl }),
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