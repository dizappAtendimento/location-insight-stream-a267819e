import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mensagens variadas para conversação natural
const MENSAGENS_MATURADOR = [
  "Oi, tudo bem?",
  "E aí, como vai?",
  "Olá! Como você está?",
  "Opa, beleza?",
  "Bom dia!",
  "Boa tarde!",
  "Boa noite!",
  "Como estão as coisas?",
  "Tudo tranquilo por aí?",
  "O que você está fazendo?",
  "Hoje o dia está corrido!",
  "Estou trabalhando aqui",
  "Vou almoçar agora",
  "Acabei de chegar",
  "Estou saindo agora",
  "Legal, que bom!",
  "Entendi, valeu!",
  "Ok, combinado!",
  "Perfeito!",
  "Show de bola!",
  "Beleza, depois a gente se fala",
  "Até mais!",
  "Tchau!",
  "Abraço!",
  "Fique bem!",
  "Depois me conta as novidades",
  "Qualquer coisa me avisa",
  "Pode deixar",
  "Sem problemas",
  "Tranquilo!",
  "😊",
  "👍",
  "✅",
  "🙏",
  "😄"
];

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
      console.error("[Maturador API] Evolution API credentials not configured");
      return new Response(
        JSON.stringify({ error: "Evolution API não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const baseUrl = EVOLUTION_API_URL.replace(/\/$/, '');
    const headers = {
      "Content-Type": "application/json",
      "apikey": EVOLUTION_API_KEY,
    };

    const { action, userId, data } = await req.json();
    console.log(`[Maturador API] Action: ${action}, UserId: ${userId || 'N/A'}`);

    switch (action) {
      case "create-session": {
        const { connection1Id, connection2Id, totalMessages, intervalMin, intervalMax } = data || {};
        
        if (!connection1Id || !connection2Id || !totalMessages) {
          return new Response(
            JSON.stringify({ error: "Dados incompletos" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Busca os dados das conexões
        const { data: conn1, error: conn1Error } = await supabase
          .from("SAAS_Conexões")
          .select("*")
          .eq("id", connection1Id)
          .single();

        const { data: conn2, error: conn2Error } = await supabase
          .from("SAAS_Conexões")
          .select("*")
          .eq("id", connection2Id)
          .single();

        if (conn1Error || conn2Error || !conn1 || !conn2) {
          console.error("[Maturador API] Error fetching connections:", conn1Error || conn2Error);
          return new Response(
            JSON.stringify({ error: "Conexões não encontradas" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Calcula o próximo envio
        const randomInterval = Math.floor(Math.random() * ((intervalMax || 120) - (intervalMin || 30) + 1)) + (intervalMin || 30);
        const proximoEnvio = new Date(Date.now() + randomInterval * 1000);

        // Cria a sessão no banco
        const { data: session, error: insertError } = await supabase
          .from("SAAS_Maturador")
          .insert({
            userId,
            idConexao1: connection1Id,
            idConexao2: connection2Id,
            telefone1: conn1.Telefone,
            telefone2: conn2.Telefone,
            instanceName1: conn1.instanceName,
            instanceName2: conn2.instanceName,
            totalMensagens: totalMessages,
            mensagensEnviadas: 0,
            intervaloMin: intervalMin || 30,
            intervaloMax: intervalMax || 120,
            status: 'running',
            proximoEnvio: proximoEnvio.toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error("[Maturador API] Error creating session:", insertError);
          return new Response(
            JSON.stringify({ error: "Erro ao criar sessão" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[Maturador API] Session created: ${session.id}`);
        return new Response(
          JSON.stringify({ session }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "get-sessions": {
        const { data: sessions, error } = await supabase
          .from("SAAS_Maturador")
          .select("*")
          .eq("userId", userId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[Maturador API] Error fetching sessions:", error);
          return new Response(
            JSON.stringify({ error: "Erro ao buscar sessões" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[Maturador API] Found ${sessions?.length || 0} sessions`);
        return new Response(
          JSON.stringify({ sessions: sessions || [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "pause-session": {
        const { sessionId } = data || {};
        
        const { error } = await supabase
          .from("SAAS_Maturador")
          .update({ status: 'paused' })
          .eq("id", sessionId)
          .eq("userId", userId);

        if (error) {
          console.error("[Maturador API] Error pausing session:", error);
          return new Response(
            JSON.stringify({ error: "Erro ao pausar sessão" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[Maturador API] Session ${sessionId} paused`);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "resume-session": {
        const { sessionId } = data || {};
        
        // Busca a sessão para recalcular próximo envio
        const { data: session } = await supabase
          .from("SAAS_Maturador")
          .select("*")
          .eq("id", sessionId)
          .eq("userId", userId)
          .single();

        if (!session) {
          return new Response(
            JSON.stringify({ error: "Sessão não encontrada" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const randomInterval = Math.floor(Math.random() * (session.intervaloMax - session.intervaloMin + 1)) + session.intervaloMin;
        const proximoEnvio = new Date(Date.now() + randomInterval * 1000);

        const { error } = await supabase
          .from("SAAS_Maturador")
          .update({ 
            status: 'running',
            proximoEnvio: proximoEnvio.toISOString()
          })
          .eq("id", sessionId)
          .eq("userId", userId);

        if (error) {
          console.error("[Maturador API] Error resuming session:", error);
          return new Response(
            JSON.stringify({ error: "Erro ao retomar sessão" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[Maturador API] Session ${sessionId} resumed`);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete-session": {
        const { sessionId } = data || {};
        
        const { error } = await supabase
          .from("SAAS_Maturador")
          .delete()
          .eq("id", sessionId)
          .eq("userId", userId);

        if (error) {
          console.error("[Maturador API] Error deleting session:", error);
          return new Response(
            JSON.stringify({ error: "Erro ao excluir sessão" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[Maturador API] Session ${sessionId} deleted`);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "process-messages": {
        // Busca todas as sessões running que precisam enviar mensagem
        const { data: sessions, error } = await supabase
          .from("SAAS_Maturador")
          .select("*")
          .eq("status", "running")
          .lte("proximoEnvio", new Date().toISOString());

        if (error) {
          console.error("[Maturador API] Error fetching sessions to process:", error);
          return new Response(
            JSON.stringify({ error: "Erro ao buscar sessões" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`[Maturador API] Found ${sessions?.length || 0} sessions to process`);
        
        let processed = 0;
        let errors = 0;

        for (const session of sessions || []) {
          try {
            // Verifica se já atingiu o limite
            if (session.mensagensEnviadas >= session.totalMensagens) {
              await supabase
                .from("SAAS_Maturador")
                .update({ status: 'completed' })
                .eq("id", session.id);
              continue;
            }

            // Alterna entre as duas conexões
            const isConnection1Turn = session.mensagensEnviadas % 2 === 0;
            const senderInstance = isConnection1Turn ? session.instanceName1 : session.instanceName2;
            const receiverPhone = isConnection1Turn ? session.telefone2 : session.telefone1;

            // Seleciona mensagem aleatória
            const mensagem = MENSAGENS_MATURADOR[Math.floor(Math.random() * MENSAGENS_MATURADOR.length)];

            // Formata o número para o WhatsApp
            const formattedPhone = receiverPhone?.replace(/\D/g, '');
            if (!formattedPhone) {
              console.error(`[Maturador API] Invalid phone for session ${session.id}`);
              continue;
            }

            // Envia a mensagem
            const sendResponse = await fetch(`${baseUrl}/message/sendText/${senderInstance}`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                number: formattedPhone,
                text: mensagem,
              }),
            });

            const sendResult = await sendResponse.json();
            console.log(`[Maturador API] Message sent from ${senderInstance} to ${formattedPhone}:`, sendResult);

            // Calcula próximo envio
            const randomInterval = Math.floor(Math.random() * (session.intervaloMax - session.intervaloMin + 1)) + session.intervaloMin;
            const proximoEnvio = new Date(Date.now() + randomInterval * 1000);

            // Atualiza a sessão
            const novaMensagem = {
              de: senderInstance,
              para: receiverPhone,
              mensagem,
              enviadoEm: new Date().toISOString(),
            };

            const mensagensAtuais = Array.isArray(session.mensagens) ? session.mensagens : [];

            await supabase
              .from("SAAS_Maturador")
              .update({
                mensagensEnviadas: session.mensagensEnviadas + 1,
                ultimaMensagem: new Date().toISOString(),
                proximoEnvio: proximoEnvio.toISOString(),
                mensagens: [...mensagensAtuais, novaMensagem],
                status: session.mensagensEnviadas + 1 >= session.totalMensagens ? 'completed' : 'running',
              })
              .eq("id", session.id);

            processed++;
          } catch (sessionError) {
            console.error(`[Maturador API] Error processing session ${session.id}:`, sessionError);
            errors++;
            
            // Marca a sessão como erro
            await supabase
              .from("SAAS_Maturador")
              .update({
                status: 'error',
                mensagemErro: sessionError instanceof Error ? sessionError.message : 'Erro desconhecido',
              })
              .eq("id", session.id);
          }
        }

        console.log(`[Maturador API] Processed ${processed} messages, ${errors} errors`);
        return new Response(
          JSON.stringify({ processed, errors, total: sessions?.length || 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "Ação não reconhecida" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (err) {
    console.error("[Maturador API] Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Erro interno";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
