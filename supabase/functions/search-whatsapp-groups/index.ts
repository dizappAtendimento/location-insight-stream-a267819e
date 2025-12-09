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
    const { segment, maxResults = 500 } = await req.json();

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

    console.log(`Searching WhatsApp groups for: ${segment} (max: ${maxResults})`);

    const groups: WhatsAppGroup[] = [];
    const seenLinks = new Set<string>();

    // Split segment into individual words for deep search
    const words = segment.trim().split(/\s+/).filter((w: string) => w.length > 2);
    const searchTerms: string[] = [];

    // Add full segment first
    searchTerms.push(segment);

    // Add individual words
    for (const word of words) {
      if (!searchTerms.includes(word)) {
        searchTerms.push(word);
      }
    }

    // Add word combinations (pairs)
    if (words.length >= 2) {
      for (let i = 0; i < words.length - 1; i++) {
        const combo = `${words[i]} ${words[i + 1]}`;
        if (!searchTerms.includes(combo)) {
          searchTerms.push(combo);
        }
      }
    }

    // Add variations with common suffixes
    const variations: string[] = [];
    for (const word of words) {
      const lowerWord = word.toLowerCase();
      // Add common variations
      variations.push(`${lowerWord} brasil`);
      variations.push(`${lowerWord} grupo`);
      variations.push(`${lowerWord} zap`);
    }
    
    for (const v of variations) {
      if (!searchTerms.includes(v)) {
        searchTerms.push(v);
      }
    }

    console.log(`Search terms to use: ${JSON.stringify(searchTerms)}`);

    // Expanded query templates for maximum results
    const queryTemplates = [
      (term: string) => `site:chat.whatsapp.com ${term}`,
      (term: string) => `"chat.whatsapp.com" ${term}`,
      (term: string) => `${term} grupo whatsapp link`,
      (term: string) => `${term} whatsapp group invite`,
      (term: string) => `grupo de ${term} whatsapp`,
      (term: string) => `whatsapp ${term} convite`,
      (term: string) => `${term} entrar grupo whatsapp`,
      (term: string) => `link grupo ${term} whatsapp`,
      (term: string) => `${term} whatsapp brasil`,
      (term: string) => `grupos ${term} whats`,
    ];

    // Function to extract WhatsApp links from text
    const extractWhatsAppLinks = (text: string): string[] => {
      const matches = text.match(/chat\.whatsapp\.com\/([A-Za-z0-9]{15,30})/g) || [];
      return matches.map(m => {
        const code = m.replace("chat.whatsapp.com/", "");
        return `https://chat.whatsapp.com/${code}`;
      }).filter(link => {
        // Filter out invalid codes
        const code = link.replace("https://chat.whatsapp.com/", "");
        return code.length >= 18 && code.length <= 25 && /^[A-Za-z0-9]+$/.test(code);
      });
    };

    // Search function
    const searchQuery = async (query: string, termForName: string) => {
      if (groups.length >= maxResults) return;

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
          console.error(`Serper error: ${response.status} - ${errorText}`);
          return;
        }

        const data = await response.json();
        const results = data.organic || [];
        console.log(`Found ${results.length} results for: ${query}`);

        for (const result of results) {
          if (groups.length >= maxResults) break;

          const link = result.link || "";
          const title = result.title || "";
          const snippet = result.snippet || "";
          const fullText = `${link} ${title} ${snippet}`;

          // Skip unwanted sources
          if (
            link.includes(".pdf") ||
            link.includes("scribd.com") ||
            link.includes("slideshare") ||
            link.includes("academia.edu")
          ) {
            continue;
          }

          // Extract all WhatsApp links
          const whatsappLinks = extractWhatsAppLinks(fullText);

          for (const whatsappLink of whatsappLinks) {
            if (groups.length >= maxResults) break;
            if (seenLinks.has(whatsappLink)) continue;

            seenLinks.add(whatsappLink);

            // Clean up group name
            let groupName = title
              .replace(/WhatsApp/gi, "")
              .replace(/Group Invite/gi, "")
              .replace(/Convite para grupo/gi, "")
              .replace(/- Convite/gi, "")
              .replace(/Entrar no grupo/gi, "")
              .replace(/\|/g, "")
              .replace(/PDF/gi, "")
              .replace(/https?:\/\/[^\s]+/g, "")
              .trim();

            if (!groupName || groupName.length < 3) {
              groupName = `Grupo ${termForName}`;
            }

            groups.push({
              name: groupName.substring(0, 100),
              link: whatsappLink,
              description: snippet.substring(0, 300) || `Grupo de WhatsApp sobre ${termForName}`,
            });

            console.log(`Found group #${groups.length}: ${whatsappLink}`);
          }
        }
      } catch (err) {
        console.error(`Error with query "${query}":`, err);
      }
    };

    // Execute searches for all terms with all templates
    for (const term of searchTerms) {
      if (groups.length >= maxResults) break;

      for (const template of queryTemplates) {
        if (groups.length >= maxResults) break;

        await searchQuery(template(term), term);
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Additional search in group directory sites
    const directorySites = [
      "gruposwhatsapp.com.br",
      "gruposdezap.com", 
      "linksdowhatsapp.com",
      "whatsappgrouplinks.org",
      "grupowhats.com",
      "gruposwhats.app",
      "grupozap.com",
      "linkdogrupo.com.br",
    ];

    for (const site of directorySites) {
      if (groups.length >= maxResults) break;

      for (const term of searchTerms) {
        if (groups.length >= maxResults) break;

        try {
          console.log(`Searching ${site} for: ${term}`);

          const response = await fetch("https://google.serper.dev/search", {
            method: "POST",
            headers: {
              "X-API-KEY": SERPER_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              q: `site:${site} ${term}`,
              gl: "br",
              hl: "pt-br",
              num: 50,
            }),
          });

          if (!response.ok) continue;

          const data = await response.json();
          const results = data.organic || [];

          for (const result of results) {
            if (groups.length >= maxResults) break;

            const fullText = `${result.link || ""} ${result.title || ""} ${result.snippet || ""}`;
            const whatsappLinks = extractWhatsAppLinks(fullText);

            for (const whatsappLink of whatsappLinks) {
              if (seenLinks.has(whatsappLink)) continue;

              seenLinks.add(whatsappLink);

              let groupName = (result.title || "")
                .replace(/Grupo de WhatsApp/gi, "")
                .replace(/Link para/gi, "")
                .replace(/-/g, " ")
                .trim();

              if (!groupName || groupName.length < 3) {
                groupName = `Grupo ${term}`;
              }

              groups.push({
                name: groupName.substring(0, 100),
                link: whatsappLink,
                description: (result.snippet || "").substring(0, 300) || `Grupo de ${term}`,
              });
            }
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          console.error(`Error searching ${site}:`, err);
        }
      }
    }

    // Facebook groups search
    try {
      console.log(`Searching Facebook for WhatsApp groups`);
      
      for (const term of searchTerms) {
        if (groups.length >= maxResults) break;

        const response = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: `site:facebook.com ${term} grupo whatsapp chat.whatsapp.com`,
            gl: "br",
            hl: "pt-br",
            num: 50,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const results = data.organic || [];

          for (const result of results) {
            if (groups.length >= maxResults) break;

            const fullText = `${result.link || ""} ${result.snippet || ""}`;
            const whatsappLinks = extractWhatsAppLinks(fullText);

            for (const whatsappLink of whatsappLinks) {
              if (seenLinks.has(whatsappLink)) continue;

              seenLinks.add(whatsappLink);

              groups.push({
                name: `Grupo ${term}`,
                link: whatsappLink,
                description: (result.snippet || "").substring(0, 300),
              });
            }
          }
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (err) {
      console.error("Error searching Facebook:", err);
    }

    // Twitter/X search
    try {
      console.log(`Searching Twitter for WhatsApp groups`);
      
      for (const term of searchTerms.slice(0, 3)) {
        if (groups.length >= maxResults) break;

        const response = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            q: `site:twitter.com OR site:x.com ${term} chat.whatsapp.com`,
            gl: "br",
            hl: "pt-br",
            num: 30,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const results = data.organic || [];

          for (const result of results) {
            if (groups.length >= maxResults) break;

            const fullText = `${result.link || ""} ${result.snippet || ""}`;
            const whatsappLinks = extractWhatsAppLinks(fullText);

            for (const whatsappLink of whatsappLinks) {
              if (seenLinks.has(whatsappLink)) continue;

              seenLinks.add(whatsappLink);

              groups.push({
                name: `Grupo ${term}`,
                link: whatsappLink,
                description: (result.snippet || "").substring(0, 300),
              });
            }
          }
        }

        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (err) {
      console.error("Error searching Twitter:", err);
    }

    console.log(`Total groups found: ${groups.length}`);

    return new Response(
      JSON.stringify({ 
        groups, 
        total: groups.length,
        searchTermsUsed: searchTerms,
        message: groups.length === 0 
          ? "Nenhum grupo encontrado. Tente termos diferentes ou mais genéricos."
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
