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

    const { action, instanceName, data, userId } = await req.json();
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