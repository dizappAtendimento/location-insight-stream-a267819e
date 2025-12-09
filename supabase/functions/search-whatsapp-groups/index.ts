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

    console.log(`Searching WhatsApp groups for: ${segment}`);

    const groups: WhatsAppGroup[] = [];
    const seenLinks = new Set<string>();

    // Multiple search queries to maximize results
    const searchQueries = [
      `site:chat.whatsapp.com ${segment}`,
      `"chat.whatsapp.com" ${segment} grupo`,
      `whatsapp grupo ${segment}`,
      `"entrar no grupo" whatsapp ${segment}`,
      `grupo whatsapp ${segment} link`,
      `${segment} "chat.whatsapp.com"`,
      `convite grupo whatsapp ${segment}`,
    ];

    for (const query of searchQueries) {
      if (groups.length >= maxResults) break;

      try {
        console.log(`Searching: ${query}`);

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
            num: 100,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Serper API error: ${response.status} - ${errorText}`);
          continue;
        }

        const data = await response.json();
        console.log(`Found ${data.organic?.length || 0} organic results`);
        
        const organicResults = data.organic || [];

        for (const result of organicResults) {
          if (groups.length >= maxResults) break;

          const link = result.link || "";
          const title = result.title || "";
          const snippet = result.snippet || "";

          // Extract WhatsApp links from the result
          const whatsappLinkMatch = link.match(/chat\.whatsapp\.com\/[A-Za-z0-9]+/);
          
          if (whatsappLinkMatch) {
            const fullLink = `https://${whatsappLinkMatch[0]}`;
            
            // Avoid duplicates
            if (!seenLinks.has(fullLink)) {
              seenLinks.add(fullLink);
              
              // Clean up the name
              let groupName = title
                .replace(/WhatsApp/gi, "")
                .replace(/Group Invite/gi, "")
                .replace(/Convite para grupo/gi, "")
                .replace(/- Convite/gi, "")
                .replace(/\|/g, "")
                .trim();
              
              if (!groupName || groupName.length < 2) {
                groupName = `Grupo ${segment}`;
              }

              groups.push({
                name: groupName,
                link: fullLink,
                description: snippet || "Grupo de WhatsApp",
              });

              console.log(`Found group: ${groupName} - ${fullLink}`);
            }
          }

          // Also check snippet for WhatsApp links
          const snippetMatches = snippet.match(/chat\.whatsapp\.com\/[A-Za-z0-9]+/g) || [];
          for (const match of snippetMatches) {
            if (groups.length >= maxResults) break;
            
            const fullLink = `https://${match}`;
            if (!seenLinks.has(fullLink)) {
              seenLinks.add(fullLink);
              groups.push({
                name: title || `Grupo ${segment}`,
                link: fullLink,
                description: snippet || "Grupo de WhatsApp",
              });
            }
          }
        }

        // Rate limiting between queries
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (queryError) {
        console.error(`Error with query "${query}":`, queryError);
        continue;
      }
    }

    console.log(`Total groups found: ${groups.length}`);

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
