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

    // Search queries focused on active group directories (exclude PDFs)
    const searchQueries = [
      `${segment} grupo whatsapp link entrar -filetype:pdf`,
      `${segment} whatsapp group invite -filetype:pdf`,
      `grupo ${segment} whatsapp convite link -filetype:pdf`,
      `${segment} "entrar no grupo" whatsapp -pdf -scribd`,
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
            tbs: "qdr:m", // Results from last month only
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

          // Skip PDF sources and old document repositories
          if (
            link.includes(".pdf") ||
            link.includes("scribd.com") ||
            link.includes("slideshare") ||
            link.includes("academia.edu") ||
            title.toLowerCase().includes("pdf")
          ) {
            continue;
          }

          // Extract WhatsApp links from the result URL
          const whatsappLinkMatch = link.match(/chat\.whatsapp\.com\/([A-Za-z0-9]{20,24})/);
          
          if (whatsappLinkMatch) {
            const inviteCode = whatsappLinkMatch[1];
            const fullLink = `https://chat.whatsapp.com/${inviteCode}`;
            
            // Validate invite code format (should be 22 characters alphanumeric)
            if (inviteCode.length >= 20 && inviteCode.length <= 24) {
              if (!seenLinks.has(fullLink)) {
                seenLinks.add(fullLink);
                
                let groupName = title
                  .replace(/WhatsApp/gi, "")
                  .replace(/Group Invite/gi, "")
                  .replace(/Convite para grupo/gi, "")
                  .replace(/- Convite/gi, "")
                  .replace(/\|/g, "")
                  .replace(/PDF/gi, "")
                  .trim();
                
                if (!groupName || groupName.length < 2) {
                  groupName = `Grupo ${segment}`;
                }

                groups.push({
                  name: groupName,
                  link: fullLink,
                  description: snippet.substring(0, 200) || "Grupo de WhatsApp",
                });

                console.log(`Found group: ${groupName}`);
              }
            }
          }

          // Also scan the snippet for WhatsApp links
          const snippetMatches = snippet.match(/chat\.whatsapp\.com\/([A-Za-z0-9]{20,24})/g) || [];
          for (const match of snippetMatches) {
            if (groups.length >= maxResults) break;
            
            const codeMatch = match.match(/chat\.whatsapp\.com\/([A-Za-z0-9]{20,24})/);
            if (codeMatch) {
              const inviteCode = codeMatch[1];
              const fullLink = `https://chat.whatsapp.com/${inviteCode}`;
              
              if (!seenLinks.has(fullLink)) {
                seenLinks.add(fullLink);
                groups.push({
                  name: `Grupo ${segment}`,
                  link: fullLink,
                  description: snippet.substring(0, 200) || "Grupo de WhatsApp",
                });
              }
            }
          }
        }

        // Rate limiting between queries
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (queryError) {
        console.error(`Error with query:`, queryError);
        continue;
      }
    }

    // Also search in group directory sites
    const directorySites = [
      "gruposwhatsapp.com.br",
      "gruposdezap.com",
      "linksdowhatsapp.com",
    ];

    for (const site of directorySites) {
      if (groups.length >= maxResults) break;

      try {
        console.log(`Searching directory: ${site}`);

        const response = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: `site:${site} ${segment}`,
            gl: "br",
            hl: "pt-br",
            num: 20,
          }),
        });

        if (!response.ok) continue;

        const data = await response.json();
        const organicResults = data.organic || [];

        for (const result of organicResults) {
          if (groups.length >= maxResults) break;

          const link = result.link || "";
          const title = result.title || "";
          const snippet = result.snippet || "";

          // Extract any WhatsApp links from snippets
          const allMatches = (snippet + " " + link).match(/chat\.whatsapp\.com\/([A-Za-z0-9]{20,24})/g) || [];
          
          for (const match of allMatches) {
            const codeMatch = match.match(/chat\.whatsapp\.com\/([A-Za-z0-9]{20,24})/);
            if (codeMatch) {
              const inviteCode = codeMatch[1];
              const fullLink = `https://chat.whatsapp.com/${inviteCode}`;
              
              if (!seenLinks.has(fullLink)) {
                seenLinks.add(fullLink);
                
                let groupName = title
                  .replace(/Grupo de WhatsApp/gi, "")
                  .replace(/Link para/gi, "")
                  .replace(/-/g, " ")
                  .trim();
                
                if (!groupName || groupName.length < 2) {
                  groupName = `Grupo ${segment}`;
                }

                groups.push({
                  name: groupName,
                  link: fullLink,
                  description: snippet.substring(0, 200) || `Grupo de ${segment}`,
                });
              }
            }
          }
        }

        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`Error searching ${site}:`, err);
      }
    }

    console.log(`Total groups found: ${groups.length}`);

    return new Response(
      JSON.stringify({ 
        groups, 
        total: groups.length,
        message: groups.length === 0 
          ? "Nenhum grupo encontrado. Tente termos mais genéricos como 'vendas' ou 'negócios'."
          : undefined
      }),
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
