import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let payload;
    try {
      payload = await req.json();
    } catch {
      console.log('[label-webhook] Empty or invalid JSON body');
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[label-webhook] Received webhook:', JSON.stringify(payload, null, 2));

    // Evolution API sends different event types
    // We're interested in: labels.edit, labels.association
    const event = payload.event || payload.type;
    const instance = payload.instance || payload.instanceName;
    const data = payload.data || payload;

    console.log('[label-webhook] Event:', event, 'Instance:', instance);

    // Find the connection by instanceName
    const { data: conexao, error: conexaoError } = await supabase
      .from('SAAS_Conexões')
      .select('id, idUsuario')
      .eq('instanceName', instance)
      .single();

    if (conexaoError || !conexao) {
      console.log('[label-webhook] Connection not found for instance:', instance);
      return new Response(JSON.stringify({ error: 'Connection not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('[label-webhook] Found connection:', conexao);

    // Handle label association events
    if (event === 'labels.association' || event === 'LABELS_ASSOCIATION') {
      const labelId = data.labelId || data.label?.id;
      const labelName = data.labelName || data.label?.name;
      const labelColor = data.labelColor || data.label?.color;
      const chatId = data.chatId || data.remoteJid || data.chat?.id;
      const chatName = data.chatName || data.chat?.name || data.pushName;
      const type = data.type; // 'add' or 'remove'

      console.log('[label-webhook] Label association:', { labelId, labelName, chatId, type });

      if (type === 'remove') {
        // Remove the label association
        const { error: deleteError } = await supabase
          .from('SAAS_Chat_Labels')
          .delete()
          .eq('idConexao', conexao.id)
          .eq('remoteJid', chatId)
          .eq('labelId', labelId);

        if (deleteError) {
          console.error('[label-webhook] Error deleting label:', deleteError);
        } else {
          console.log('[label-webhook] Label removed successfully');
        }
      } else {
        // Add or update the label association
        const { error: upsertError } = await supabase
          .from('SAAS_Chat_Labels')
          .upsert({
            idUsuario: conexao.idUsuario,
            idConexao: conexao.id,
            instanceName: instance,
            remoteJid: chatId,
            labelId: labelId,
            labelName: labelName,
            labelColor: String(labelColor),
            chatName: chatName,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'idConexao,remoteJid,labelId'
          });

        if (upsertError) {
          console.error('[label-webhook] Error upserting label:', upsertError);
        } else {
          console.log('[label-webhook] Label added/updated successfully');
        }
      }
    }

    // Handle bulk label sync (when labels are fetched)
    if (event === 'labels.sync' || payload.action === 'sync-labels') {
      const labels = data.labels || data;
      
      if (Array.isArray(labels)) {
        console.log('[label-webhook] Syncing', labels.length, 'labels');
        
        for (const label of labels) {
          const chatIds = label.chatIds || label.chats || [];
          
          for (const chatId of chatIds) {
            const { error: upsertError } = await supabase
              .from('SAAS_Chat_Labels')
              .upsert({
                idUsuario: conexao.idUsuario,
                idConexao: conexao.id,
                instanceName: instance,
                remoteJid: typeof chatId === 'string' ? chatId : chatId.id,
                labelId: label.id,
                labelName: label.name,
                labelColor: String(label.color),
                chatName: typeof chatId === 'string' ? null : chatId.name,
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'idConexao,remoteJid,labelId'
              });

            if (upsertError) {
              console.error('[label-webhook] Error syncing label:', upsertError);
            }
          }
        }
        
        console.log('[label-webhook] Labels synced successfully');
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[label-webhook] Error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
