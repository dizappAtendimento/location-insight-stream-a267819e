import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configurações
const BATCH_SIZE = 50; // Máximo de mensagens por execução
const MAX_RETRIES = 3;

interface DetalheDisparo {
  id: number;
  idDisparo: number;
  idContato: number | null;
  idGrupo: number | null;
  idConexao: number;
  Mensagem: string | null;
  Status: string;
  Payload: any;
  dataEnvio: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log('[Process Queue] Starting queue processing...');

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar configurações da Evolution API
    const { data: configData } = await supabase
      .from('saas_configuracoes')
      .select('chave, valor')
      .in('chave', ['api_evolution_url', 'api_evolution_key']);

    const configs = Object.fromEntries((configData || []).map((c: any) => [c.chave, c.valor]));
    const evolutionUrl = configs['api_evolution_url'] || 'https://evo.dizapp.com.br';
    const evolutionKey = configs['api_evolution_key'];

    // Buscar mensagens pendentes que estão prontas para enviar
    const now = new Date().toISOString();
    
    const { data: pendingMessages, error: fetchError } = await supabase
      .from('SAAS_Detalhes_Disparos')
      .select(`
        id,
        idDisparo,
        idContato,
        idGrupo,
        idConexao,
        Mensagem,
        Status,
        Payload,
        dataEnvio
      `)
      .eq('Status', 'pending')
      .lte('dataEnvio', now)
      .order('dataEnvio', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error('[Process Queue] Error fetching pending messages:', fetchError);
      throw fetchError;
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      console.log('[Process Queue] No pending messages to process');
      return new Response(
        JSON.stringify({ processed: 0, message: 'No pending messages' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Só verifica a chave se houver mensagens para processar
    if (!evolutionKey) {
      console.error('[Process Queue] Evolution API key not configured, skipping processing');
      return new Response(
        JSON.stringify({ error: 'Evolution API key not configured', pendingCount: pendingMessages.length }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Process Queue] Found ${pendingMessages.length} pending messages`);

    // Buscar dados das conexões necessárias
    const connectionIds = [...new Set(pendingMessages.map(m => m.idConexao))];
    const { data: connections } = await supabase
      .from('SAAS_Conexões')
      .select('id, instanceName, Apikey, Telefone')
      .in('id', connectionIds);

    const connectionMap = new Map((connections || []).map(c => [c.id, c]));

    // Buscar dados dos contatos necessários
    const contactIds = pendingMessages.map(m => m.idContato).filter(Boolean);
    let contactMap = new Map();
    if (contactIds.length > 0) {
      const { data: contacts } = await supabase
        .from('SAAS_Contatos')
        .select('id, telefone, nome, atributos')
        .in('id', contactIds);
      contactMap = new Map((contacts || []).map(c => [c.id, c]));
    }

    // Buscar dados dos grupos necessários
    const groupIds = pendingMessages.map(m => m.idGrupo).filter(Boolean);
    let groupMap = new Map();
    if (groupIds.length > 0) {
      const { data: groups } = await supabase
        .from('SAAS_Grupos')
        .select('id, WhatsAppId, nome')
        .in('id', groupIds);
      groupMap = new Map((groups || []).map(g => [g.id, g]));
    }

    // Processar cada mensagem
    let successCount = 0;
    let failCount = 0;

    for (const msg of pendingMessages) {
      try {
        // Marcar como processing
        await supabase
          .from('SAAS_Detalhes_Disparos')
          .update({ Status: 'processing' })
          .eq('id', msg.id);

        const connection = connectionMap.get(msg.idConexao);
        if (!connection) {
          throw new Error(`Connection ${msg.idConexao} not found`);
        }

        // Determinar destinatário
        let remoteJid: string;
        let recipientName: string = '';
        
        if (msg.idGrupo) {
          const group = groupMap.get(msg.idGrupo);
          if (!group?.WhatsAppId) {
            throw new Error(`Group ${msg.idGrupo} not found or has no WhatsAppId`);
          }
          remoteJid = group.WhatsAppId;
          recipientName = group.nome || '';
        } else if (msg.idContato) {
          const contact = contactMap.get(msg.idContato);
          if (!contact?.telefone) {
            throw new Error(`Contact ${msg.idContato} not found or has no phone`);
          }
          // Formatar telefone para WhatsApp
          const phone = contact.telefone.replace(/\D/g, '');
          remoteJid = `${phone}@s.whatsapp.net`;
          recipientName = contact.nome || '';
        } else {
          throw new Error('No contact or group specified');
        }

        // Processar mensagem com variáveis
        let messageText = msg.Mensagem || '';
        messageText = substituirVariaveis(messageText, recipientName, msg.idContato ? contactMap.get(msg.idContato)?.atributos : null);

        // Preparar payload para Evolution API
        const payload = msg.Payload || {};
        const mediaPayload = payload.media;

        let evolutionPayload: any;
        let endpoint: string;

        if (mediaPayload?.link) {
          // Envio com mídia
          const mediaType = mediaPayload.type || 'document';
          
          switch (mediaType) {
            case 'image':
              endpoint = '/message/sendMedia/';
              evolutionPayload = {
                number: remoteJid,
                mediatype: 'image',
                media: mediaPayload.link,
                caption: messageText || undefined,
                fileName: mediaPayload.filename,
              };
              break;
            case 'video':
              endpoint = '/message/sendMedia/';
              evolutionPayload = {
                number: remoteJid,
                mediatype: 'video',
                media: mediaPayload.link,
                caption: messageText || undefined,
                fileName: mediaPayload.filename,
              };
              break;
            case 'audio':
              endpoint = '/message/sendWhatsAppAudio/';
              evolutionPayload = {
                number: remoteJid,
                audio: mediaPayload.link,
              };
              break;
            case 'document':
            default:
              endpoint = '/message/sendMedia/';
              evolutionPayload = {
                number: remoteJid,
                mediatype: 'document',
                media: mediaPayload.link,
                caption: messageText || undefined,
                fileName: mediaPayload.filename,
                mimetype: mediaPayload.mimetype,
              };
              break;
          }
        } else {
          // Envio de texto simples
          endpoint = '/message/sendText/';
          evolutionPayload = {
            number: remoteJid,
            text: messageText,
          };
        }

        // Enviar via Evolution API
        const apiUrl = `${evolutionUrl}${endpoint}${connection.instanceName}`;
        console.log(`[Process Queue] Sending to ${apiUrl}`);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': connection.Apikey || evolutionKey,
          },
          body: JSON.stringify(evolutionPayload),
        });

        const responseData = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(`Evolution API error: ${response.status} - ${JSON.stringify(responseData)}`);
        }

        // Atualizar como enviado com sucesso
        await supabase
          .from('SAAS_Detalhes_Disparos')
          .update({
            Status: 'sent',
            statusHttp: response.status.toString(),
            respostaHttp: responseData,
            dataEnvio: new Date().toISOString(),
          })
          .eq('id', msg.id);

        // Atualizar contador no disparo pai
        await supabase.rpc('increment_disparo_count', { p_disparo_id: msg.idDisparo });

        successCount++;
        console.log(`[Process Queue] Message ${msg.id} sent successfully`);

      } catch (error: any) {
        console.error(`[Process Queue] Error processing message ${msg.id}:`, error);
        
        // Marcar como falha
        await supabase
          .from('SAAS_Detalhes_Disparos')
          .update({
            Status: 'failed',
            mensagemErro: error.message || 'Unknown error',
            dataEnvio: new Date().toISOString(),
          })
          .eq('id', msg.id);

        failCount++;
      }
    }

    // Verificar se há disparos que terminaram (todos os detalhes processados)
    const disparoIds = [...new Set(pendingMessages.map(m => m.idDisparo))];
    for (const disparoId of disparoIds) {
      const { data: remainingPending } = await supabase
        .from('SAAS_Detalhes_Disparos')
        .select('id')
        .eq('idDisparo', disparoId)
        .in('Status', ['pending', 'processing'])
        .limit(1);

      if (!remainingPending || remainingPending.length === 0) {
        // Disparo concluído
        await supabase
          .from('SAAS_Disparos')
          .update({ StatusDisparo: 'Concluído' })
          .eq('id', disparoId);
        console.log(`[Process Queue] Disparo ${disparoId} marked as completed`);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`[Process Queue] Completed in ${duration}ms. Success: ${successCount}, Failed: ${failCount}`);

    return new Response(
      JSON.stringify({ 
        processed: pendingMessages.length,
        success: successCount,
        failed: failCount,
        duration: `${duration}ms`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[Process Queue] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Funções auxiliares
function substituirVariaveis(texto: string, nome: string, atributos?: any): string {
  const now = new Date();
  const hora = now.getHours();
  
  let saudacao = 'Boa noite';
  if (hora >= 5 && hora < 12) saudacao = 'Bom dia';
  else if (hora >= 12 && hora < 18) saudacao = 'Boa tarde';

  const diasSemana = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  let result = texto
    .replace(/<saudacao>/gi, saudacao)
    .replace(/<saudação>/gi, saudacao)
    .replace(/<nome>/gi, nome || '')
    .replace(/<data>/gi, now.toLocaleDateString('pt-BR'))
    .replace(/<hora>/gi, now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    .replace(/<diadasemana>/gi, diasSemana[now.getDay()])
    .replace(/<mes>/gi, meses[now.getMonth()])
    .replace(/<mês>/gi, meses[now.getMonth()]);

  // Substituir atributos personalizados
  if (atributos && typeof atributos === 'object') {
    for (const [key, value] of Object.entries(atributos)) {
      const regex = new RegExp(`<${key}>`, 'gi');
      result = result.replace(regex, String(value || ''));
    }
  }

  return result;
}
