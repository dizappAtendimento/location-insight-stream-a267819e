import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const { segment, maxResults = 500, validateLinks = true, userId } = await req.json();

    if (!segment) {
      return new Response(
        JSON.stringify({ error: "Segmento é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const SERPER_API_KEY = Deno.env.get("SERPER_API_KEY");
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SERPER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "SERPER_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ==== VALIDATE EXTRACTION LIMIT ====
    if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      
      const { data: userData } = await supabase
        .from('SAAS_Usuarios')
        .select('plano')
        .eq('id', userId)
        .single();

      if (!userData?.plano) {
        return new Response(
          JSON.stringify({ error: 'Usuário não possui plano ativo. Entre em contato com o suporte.' }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: planInfo } = await supabase
        .from('SAAS_Planos')
        .select('qntExtracoes')
        .eq('id', userData.plano)
        .single();

      const limiteExtracoes = planInfo?.qntExtracoes || 0;
      const isUnlimited = limiteExtracoes === 0 || limiteExtracoes > 999999999;

      if (!isUnlimited) {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const { count: extracoesUsadas } = await supabase
          .from('search_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('created_at', monthStart.toISOString());

        if ((extracoesUsadas || 0) >= limiteExtracoes) {
          return new Response(
            JSON.stringify({ 
              error: `Limite de consultas atingido (${extracoesUsadas}/${limiteExtracoes} este mês). Faça upgrade do seu plano para continuar.`,
              limitReached: true,
              used: extracoesUsadas,
              limit: limiteExtracoes
            }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }
    // ==== END VALIDATION ====

    console.log(`Deep search for: ${segment} (max: ${maxResults})`);

    const groups: WhatsAppGroup[] = [];
    const seenLinks = new Set<string>();

    // Build comprehensive search terms
    const words = segment.trim().split(/\s+/).filter((w: string) => w.length > 2);
    const searchTerms: string[] = [segment];

    // Normalize function for matching
    const normalizeText = (text: string): string => {
      return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    // Check if text matches search terms - RELAXED for more results
    const matchesSearchTerms = (text: string): boolean => {
      const normalizedText = normalizeText(text);
      const normalizedSegment = normalizeText(segment);
      
      // Check if full segment is present
      if (normalizedText.includes(normalizedSegment)) {
        return true;
      }
      
      // Check if ANY significant word is present (more relaxed)
      const significantWords = words.filter((w: string) => w.length >= 3);
      
      // For multi-word searches, require at least ONE significant word
      if (significantWords.length >= 1) {
        const anyWordMatch = significantWords.some((word: string) => {
          const normalizedWord = normalizeText(word);
          return normalizedText.includes(normalizedWord);
        });
        if (anyWordMatch) return true;
      }
      
      return false;
    };

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

    // Main search queries - SUPER AGGRESSIVE for maximum results
    const queries = [
      // Direct WhatsApp link searches
      `${segment} chat.whatsapp.com`,
      `"${segment}" chat.whatsapp.com`,
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
      `${segment} link convite whatsapp`,
      `${segment} grupo de whatsapp`,
      `${segment} grupo whatsapp brasil`,
      `${segment} whats grupo`,
      // English variations  
      `${segment} join whatsapp group`,
      `${segment} whatsapp community`,
      // Location-specific
      `grupo ${segment} link`,
      `${segment} whatsapp grupo link convite`,
      `"grupo de ${segment}"`,
      `${segment} comunidade whatsapp`,
      // Extended patterns
      `${segment} inurl:chat.whatsapp.com`,
      `${segment} link de grupo`,
    ];

    // Add word-based queries for each significant word
    for (const word of words) {
      queries.push(`${word} chat.whatsapp.com`);
      queries.push(`grupo ${word} whatsapp link`);
      queries.push(`${word} whatsapp grupo brasil`);
      queries.push(`${word} grupo zap`);
      queries.push(`${word} link convite whatsapp`);
    }
    
    // Add combinations of words
    if (words.length >= 2) {
      queries.push(`${words[0]} ${words[1]} whatsapp`);
      queries.push(`grupo ${words[0]} ${words[1]}`);
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

            const description = (result.snippet || "").substring(0, 250);
            const combinedText = `${name} ${description}`;
            
            // Only add if matches search terms
            if (!matchesSearchTerms(combinedText)) {
              console.log(`Skipped (no match): ${name.substring(0, 40)}`);
              continue;
            }

            groups.push({
              name: name.substring(0, 80),
              link,
              description,
            });

            console.log(`Found #${groups.length}: ${link}`);
          }
        }

        await new Promise(r => setTimeout(r, 80));
      } catch (err) {
        console.error(`Error: ${err}`);
      }
    }

    // Directory site searches - expanded list
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
      "zapzapgrupos.com",
      "grupodewhatsapp.com",
      "linkgrupos.com.br",
      "gruposwpp.com.br",
      "wppgrupos.com",
      "linkszap.com",
      "grupozapzap.com.br",
      "gruposparawhatsapp.com",
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
              
              const name = (result.title || `Grupo ${term}`).substring(0, 80);
              const description = (result.snippet || "").substring(0, 250);
              const combinedText = `${name} ${description}`;
              
              // Only add if matches search terms
              if (!matchesSearchTerms(combinedText)) continue;
              
              seenLinks.add(link);

              groups.push({
                name,
                link,
                description,
              });
            }
          }

          await new Promise(r => setTimeout(r, 60));
        } catch (err) {
          // continue
        }
      }
    }

    // Social media searches - expanded
    const socialQueries = [
      `site:facebook.com ${segment} grupo whatsapp chat.whatsapp.com`,
      `site:facebook.com ${segment} link grupo zap`,
      `site:facebook.com ${segment} grupo de whatsapp`,
      `site:twitter.com ${segment} chat.whatsapp.com`,
      `site:twitter.com ${segment} grupo whatsapp`,
      `site:x.com ${segment} chat.whatsapp.com`,
      `site:instagram.com ${segment} link whatsapp grupo`,
      `site:instagram.com ${segment} grupo zap`,
      `site:reddit.com ${segment} whatsapp group brazil`,
      `site:telegram.me ${segment} whatsapp`,
      `site:tiktok.com ${segment} grupo whatsapp`,
      `site:youtube.com ${segment} link grupo whatsapp`,
    ];
    
    // Add word-based social queries
    for (const word of words.slice(0, 2)) {
      socialQueries.push(`site:facebook.com ${word} grupo whatsapp link`);
      socialQueries.push(`site:twitter.com ${word} chat.whatsapp.com`);
    }

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
              
              const name = `Grupo ${segment}`;
              const description = (result.snippet || "").substring(0, 250);
              const combinedText = `${name} ${description}`;
              
              // Only add if matches search terms
              if (!matchesSearchTerms(combinedText)) continue;
              
              seenLinks.add(link);

              groups.push({
                name,
                link,
                description,
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
