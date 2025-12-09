import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppGroup {
  name: string;
  link: string;
  description: string;
  validated?: boolean;
}

// Validate if a WhatsApp group link is still active
async function validateGroupLink(link: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    
    const response = await fetch(link, {
      method: "GET",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      redirect: "follow"
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const text = await response.text();
      // Check if page contains group invite elements (valid group)
      if (text.includes("invite") || text.includes("convite") || text.includes("group") || text.includes("Grupo")) {
        return true;
      }
      // Check for expired/invalid indicators
      if (text.includes("expired") || text.includes("expirado") || text.includes("invalid") || text.includes("não encontrado")) {
        return false;
      }
      return true;
    }
    
    return response.status !== 404;
  } catch (error) {
    // On timeout, assume valid
    return true;
  }
}

// Batch validate links
async function validateGroupLinks(groups: WhatsAppGroup[], maxConcurrent: number = 20): Promise<WhatsAppGroup[]> {
  const validatedGroups: WhatsAppGroup[] = [];
  
  for (let i = 0; i < groups.length; i += maxConcurrent) {
    const batch = groups.slice(i, i + maxConcurrent);
    
    const results = await Promise.all(
      batch.map(async (group) => {
        const isValid = await validateGroupLink(group.link);
        return { ...group, validated: isValid };
      })
    );
    
    for (const result of results) {
      if (result.validated) {
        validatedGroups.push(result);
      } else {
        console.log(`Removed invalid: ${result.link}`);
      }
    }
  }
  
  return validatedGroups;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { segment, maxResults = 500, validateLinks = true } = await req.json();

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

    console.log(`Deep search for: ${segment} (max: ${maxResults})`);

    const groups: WhatsAppGroup[] = [];
    const seenLinks = new Set<string>();

    // Build comprehensive search terms
    const words = segment.trim().split(/\s+/).filter((w: string) => w.length > 1);
    const searchTerms: string[] = [segment];

    // Add individual words
    words.forEach((word: string) => {
      if (!searchTerms.includes(word)) searchTerms.push(word);
    });

    // Add common variations
    const baseTerms = [segment, ...words.slice(0, 2)];
    for (const term of baseTerms) {
      const variations = [
        `${term} brasil`,
        `${term} grupo`,
        `${term} zap`,
        `${term} whatsapp`,
        `grupo ${term}`,
        `${term} link`,
      ];
      variations.forEach(v => {
        if (!searchTerms.includes(v)) searchTerms.push(v);
      });
    }

    console.log(`Terms: ${searchTerms.length}`);

    // Extract WhatsApp links
    const extractLinks = (text: string): string[] => {
      const matches = text.match(/chat\.whatsapp\.com\/([A-Za-z0-9]{16,30})/g) || [];
      return [...new Set(matches.map(m => `https://${m}`))].filter(link => {
        const code = link.split("/").pop() || "";
        return code.length >= 18 && code.length <= 26;
      });
    };

    // Main search queries - more aggressive
    const queries = [
      // Direct WhatsApp link searches
      `${segment} chat.whatsapp.com`,
      `${segment} "chat.whatsapp.com"`,
      `grupo ${segment} link whatsapp`,
      `${segment} whatsapp grupo convite`,
      `${segment} entrar grupo whatsapp link`,
      `link grupo whatsapp ${segment}`,
      `whatsapp group ${segment} invite link`,
      `${segment} grupo whats link`,
      // Portuguese variations
      `${segment} entre no grupo`,
      `${segment} grupo zap link`,
      `${segment} participe do grupo`,
      // English variations  
      `${segment} join whatsapp group`,
      `${segment} whatsapp community`,
    ];

    // Add word-based queries
    for (const word of words.slice(0, 3)) {
      queries.push(`${word} chat.whatsapp.com`);
      queries.push(`grupo ${word} whatsapp link`);
      queries.push(`${word} whatsapp grupo brasil`);
    }

    // Execute main searches
    for (const query of queries) {
      if (groups.length >= maxResults) break;

      try {
        console.log(`Query: ${query}`);

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

        if (!response.ok) continue;

        const data = await response.json();
        const results = data.organic || [];
        console.log(`Results: ${results.length}`);

        for (const result of results) {
          if (groups.length >= maxResults) break;

          const fullText = `${result.link || ""} ${result.title || ""} ${result.snippet || ""}`;
          
          // Skip PDFs and document sites
          if (fullText.includes(".pdf") || fullText.includes("scribd") || fullText.includes("slideshare")) {
            continue;
          }

          const links = extractLinks(fullText);

          for (const link of links) {
            if (groups.length >= maxResults) break;
            if (seenLinks.has(link)) continue;

            seenLinks.add(link);

            let name = (result.title || "")
              .replace(/WhatsApp/gi, "")
              .replace(/Group Invite/gi, "")
              .replace(/Convite.*grupo/gi, "")
              .replace(/https?:\/\/[^\s]+/g, "")
              .replace(/[|–-]/g, " ")
              .trim();

            if (!name || name.length < 3) {
              name = `Grupo ${segment}`;
            }

            groups.push({
              name: name.substring(0, 80),
              link,
              description: (result.snippet || "").substring(0, 250),
            });

            console.log(`Found #${groups.length}: ${link}`);
          }
        }

        await new Promise(r => setTimeout(r, 80));
      } catch (err) {
        console.error(`Error: ${err}`);
      }
    }

    // Directory site searches
    const directories = [
      "gruposwhatsapp.com.br",
      "gruposdezap.com",
      "linksdowhatsapp.com",
      "grupowhats.com",
      "grupozap.com.br",
      "whatsappgrouplinks.org",
      "linkdogrupo.com.br",
      "grupodozap.com",
      "zapgrupos.com",
      "gruposdowhats.com.br",
    ];

    for (const site of directories) {
      if (groups.length >= maxResults) break;

      for (const term of searchTerms.slice(0, 5)) {
        if (groups.length >= maxResults) break;

        try {
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
          
          for (const result of (data.organic || [])) {
            if (groups.length >= maxResults) break;

            const fullText = `${result.link || ""} ${result.snippet || ""}`;
            const links = extractLinks(fullText);

            for (const link of links) {
              if (seenLinks.has(link)) continue;
              seenLinks.add(link);

              groups.push({
                name: (result.title || `Grupo ${term}`).substring(0, 80),
                link,
                description: (result.snippet || "").substring(0, 250),
              });
            }
          }

          await new Promise(r => setTimeout(r, 60));
        } catch (err) {
          // continue
        }
      }
    }

    // Social media searches
    const socialQueries = [
      `site:facebook.com ${segment} grupo whatsapp chat.whatsapp.com`,
      `site:facebook.com ${segment} link grupo zap`,
      `site:twitter.com ${segment} chat.whatsapp.com`,
      `site:instagram.com ${segment} link whatsapp grupo`,
      `site:reddit.com ${segment} whatsapp group brazil`,
      `site:telegram.me ${segment} whatsapp`,
    ];

    for (const query of socialQueries) {
      if (groups.length >= maxResults) break;

      try {
        const response = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: {
            "X-API-KEY": SERPER_API_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ q: query, gl: "br", hl: "pt-br", num: 50 }),
        });

        if (response.ok) {
          const data = await response.json();
          
          for (const result of (data.organic || [])) {
            const fullText = `${result.link || ""} ${result.snippet || ""}`;
            const links = extractLinks(fullText);

            for (const link of links) {
              if (seenLinks.has(link)) continue;
              seenLinks.add(link);

              groups.push({
                name: `Grupo ${segment}`,
                link,
                description: (result.snippet || "").substring(0, 250),
              });

              if (groups.length >= maxResults) break;
            }
          }
        }

        await new Promise(r => setTimeout(r, 60));
      } catch (err) {
        // continue
      }
    }

    console.log(`Total before validation: ${groups.length}`);

    // Validate links
    let finalGroups = groups;
    if (validateLinks && groups.length > 0) {
      console.log(`Validating ${groups.length} links...`);
      finalGroups = await validateGroupLinks(groups, 25);
      console.log(`Valid: ${finalGroups.length}`);
    }

    const cleanGroups = finalGroups.map(({ validated, ...rest }) => rest);

    return new Response(
      JSON.stringify({ 
        groups: cleanGroups, 
        total: cleanGroups.length,
        totalBeforeValidation: groups.length,
        searchTermsUsed: searchTerms.slice(0, 10),
        message: cleanGroups.length === 0 
          ? "Nenhum grupo válido encontrado. Tente termos mais genéricos como 'vendas', 'marketing', 'empreendedorismo'."
          : undefined
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
