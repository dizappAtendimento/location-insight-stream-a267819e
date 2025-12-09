import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppGroup {
  name: string;
  link: string;
  description: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { segment, maxResults = 100 } = await req.json();

    if (!segment) {
      return new Response(
        JSON.stringify({ error: "Segmento é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");
    if (!SERPER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "SERPER_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groups: WhatsAppGroup[] = [];
    const resultsPerPage = 100;
    const pages = Math.ceil(maxResults / resultsPerPage);

    // Search queries targeting WhatsApp group invite links
    const searchQueries = [
      `"chat.whatsapp.com" ${segment} grupo`,
      `site:chat.whatsapp.com ${segment}`,
      `"entrar no grupo" whatsapp ${segment}`,
      `whatsapp grupo ${segment} convite`,
    ];

    for (const query of searchQueries) {
      if (groups.length >= maxResults) break;

      for (let page = 0; page < pages; page++) {
        if (groups.length >= maxResults) break;

        const response = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: query,
            gl: "br",
            hl: "pt-br",
            num: resultsPerPage,
            page: page + 1,
          }),
        });

        if (!response.ok) {
          console.error(`Serper API error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        const organicResults = data.organic || [];

        for (const result of organicResults) {
          if (groups.length >= maxResults) break;

          const link = result.link || "";
          const title = result.title || "";
          const snippet = result.snippet || "";

          // Check if it's a valid WhatsApp group invite link
          if (link.includes("chat.whatsapp.com/")) {
            // Avoid duplicates
            if (!groups.some(g => g.link === link)) {
              groups.push({
                name: title.replace(/- WhatsApp/gi, "").replace(/Grupo/gi, "").trim() || "Grupo WhatsApp",
                link: link,
                description: snippet,
              });
            }
          }
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    return new Response(
      JSON.stringify({ groups, total: groups.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    const errorMessage = err instanceof Error ? err.message : "Erro interno";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
