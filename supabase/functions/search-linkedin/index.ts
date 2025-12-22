import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SerperResult {
  title?: string;
  link?: string;
  snippet?: string;
}

interface LinkedInProfile {
  name: string;
  headline: string;
  profileLink: string;
  email: string;
  phone: string;
  company: string;
  location: string;
}

// Mapa de termos relacionados para expansão de busca
const relatedTerms: Record<string, string[]> = {
  'mecanica': ['mecânico', 'autocenter', 'oficina mecânica', 'auto center', 'centro automotivo', 'funilaria'],
  'dentista': ['odontologia', 'dentista', 'ortodontista', 'clínica odontológica', 'cirurgião dentista'],
  'advogado': ['advocacia', 'advogado', 'advogada', 'escritório de advocacia', 'jurídico', 'direito'],
  'nutricionista': ['nutrição', 'nutricionista', 'nutrólogo', 'emagrecimento'],
  'personal': ['personal trainer', 'treinador', 'fitness', 'educador físico'],
  'estetica': ['estética', 'esteticista', 'dermatologista', 'harmonização facial'],
  'restaurante': ['restaurante', 'gastronomia', 'chef', 'cozinheiro'],
  'fotografo': ['fotógrafo', 'fotografia', 'filmmaker', 'videomaker'],
  'arquiteto': ['arquitetura', 'arquiteto', 'design de interiores', 'decorador'],
  'psicologo': ['psicologia', 'psicólogo', 'psicóloga', 'terapeuta', 'coach'],
  'medico': ['médico', 'medicina', 'doutor', 'clínico geral', 'especialista'],
  'contador': ['contabilidade', 'contador', 'contadora', 'financeiro'],
  'imobiliaria': ['imobiliária', 'corretor de imóveis', 'corretor', 'consultor imobiliário'],
  'marketing': ['marketing digital', 'social media', 'gestor de tráfego', 'growth hacker'],
  'desenvolvedor': ['desenvolvedor', 'programador', 'software engineer', 'dev', 'fullstack'],
  'vendedor': ['vendas', 'vendedor', 'representante comercial', 'consultor de vendas'],
  'rh': ['recursos humanos', 'recrutador', 'headhunter', 'talent acquisition'],
  'engenheiro': ['engenheiro', 'engenharia', 'engineer'],
};

function getRelatedTerms(segment: string): string[] {
  const lowerSegment = segment.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  for (const [key, terms] of Object.entries(relatedTerms)) {
    if (lowerSegment.includes(key) || key.includes(lowerSegment)) {
      return [segment, ...terms];
    }
  }
  
  return [segment, `${segment}s`, `profissional ${segment}`, `especialista ${segment}`];
}

function extractEmail(text: string): string {
  const emailMatch = text?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return emailMatch ? emailMatch[0] : '';
}

function extractPhone(text: string): string {
  const phonePatterns = [
    /\+55\s?\d{2}\s?\d{4,5}[-.\s]?\d{4}/,
    /\(\d{2}\)\s?\d{4,5}[-.\s]?\d{4}/,
    /\d{2}\s?\d{4,5}[-.\s]?\d{4}/,
  ];
  
  for (const pattern of phonePatterns) {
    const match = text?.match(pattern);
    if (match) {
      return match[0];
    }
  }
  return '';
}

function extractCompany(text: string, title: string): string {
  // Tentar extrair empresa do título ou snippet
  const patterns = [
    /(?:at|@|na|no|em)\s+([^|•\-–]+)/i,
    /([^|•\-–]+)\s*[|•\-–]/,
  ];
  
  for (const pattern of patterns) {
    const match = title?.match(pattern) || text?.match(pattern);
    if (match && match[1]) {
      return match[1].trim().substring(0, 100);
    }
  }
  return '';
}

function extractLocation(text: string): string {
  const locationPatterns = [
    /(?:São Paulo|Rio de Janeiro|Brasília|Belo Horizonte|Curitiba|Porto Alegre|Salvador|Fortaleza|Recife|Manaus)[^,]*/i,
    /([A-Z][a-záàâãéèêíïóôõöúçñ]+(?:\s+[A-Z][a-záàâãéèêíïóôõöúçñ]+)*),?\s*(?:SP|RJ|DF|MG|PR|RS|BA|CE|PE|AM|Brazil|Brasil)/i,
  ];
  
  for (const pattern of locationPatterns) {
    const match = text?.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  return '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { segment, location, maxResults = 100, userId } = await req.json();

    if (!segment) {
      return new Response(
        JSON.stringify({ error: 'Segmento é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SERPER_API_KEY) {
      console.error('SERPER_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: planInfo } = await supabase
        .from('SAAS_Planos')
        .select('qntLinkedin')
        .eq('id', userData.plano)
        .single();

      const limiteLinkedin = planInfo?.qntLinkedin || 0;
      const isUnlimited = limiteLinkedin === 0 || limiteLinkedin > 999999999;

      if (!isUnlimited) {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const { count: extracoesUsadas } = await supabase
          .from('search_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('type', 'linkedin')
          .gte('created_at', monthStart.toISOString());

        if ((extracoesUsadas || 0) >= limiteLinkedin) {
          return new Response(
            JSON.stringify({ 
              error: `Limite de consultas LinkedIn atingido (${extracoesUsadas}/${limiteLinkedin} este mês). Faça upgrade do seu plano para continuar.`,
              limitReached: true,
              used: extracoesUsadas,
              limit: limiteLinkedin
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    // ==== END VALIDATION ====

    const searchTerms = getRelatedTerms(segment);
    console.log(`LinkedIn search - Segment: ${segment}, Related terms: ${searchTerms.join(', ')}`);
    
    const allProfiles: Map<string, LinkedInProfile> = new Map();
    const resultsPerQuery = Math.ceil(maxResults / searchTerms.length);

    for (const term of searchTerms) {
      if (allProfiles.size >= maxResults) break;

      // Buscar perfis do LinkedIn
      let searchQuery = `linkedin.com/in ${term}`;
      if (location) {
        searchQuery += ` ${location}`;
      }
      
      console.log(`Searching: ${searchQuery}`);

      try {
        const response = await fetch('https://google.serper.dev/search', {
          method: 'POST',
          headers: {
            'X-API-KEY': SERPER_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: searchQuery,
            num: Math.min(resultsPerQuery, 100),
          }),
        });

        if (!response.ok) {
          console.error(`Serper error for "${term}":`, response.status);
          continue;
        }

        const data = await response.json();
        console.log(`Found ${data.organic?.length || 0} results for "${term}"`);

        if (data.organic) {
          for (const result of data.organic as SerperResult[]) {
            if (!result.link?.includes('linkedin.com/in/')) continue;
            
            // Extrair username/slug do LinkedIn
            const slugMatch = result.link.match(/linkedin\.com\/in\/([^\/\?]+)/);
            const slug = slugMatch ? slugMatch[1] : '';
            
            if (!slug || allProfiles.has(slug)) continue;

            // Extrair nome do título
            const nameMatch = result.title?.match(/^([^|•\-–]+)/);
            const name = nameMatch ? nameMatch[1].replace(/\s*-\s*LinkedIn.*$/i, '').trim() : '';

            // Extrair headline
            const headlineMatch = result.title?.match(/[|•\-–]\s*(.+?)(?:\s*[|•\-–]|$)/);
            const headline = headlineMatch ? headlineMatch[1].trim() : '';

            const profile: LinkedInProfile = {
              name: name || slug,
              headline: headline,
              profileLink: result.link,
              email: extractEmail(result.snippet || ''),
              phone: extractPhone(result.snippet || ''),
              company: extractCompany(result.snippet || '', result.title || ''),
              location: extractLocation(result.snippet || '') || (location || ''),
            };

            allProfiles.set(slug, profile);
          }
        }

        await new Promise(resolve => setTimeout(resolve, 150));

      } catch (error) {
        console.error(`Error searching for "${term}":`, error);
        continue;
      }
    }

    const profiles = Array.from(allProfiles.values()).slice(0, maxResults);
    console.log(`Returning ${profiles.length} unique LinkedIn profiles for segment: ${segment}`);

    // ==== SAVE EXTRACTION TO DATABASE ====
    if (userId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && profiles.length > 0) {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      try {
        await supabase.from('search_jobs').insert({
          user_id: userId,
          query: segment,
          location: location || null,
          max_results: maxResults,
          status: 'completed',
          type: 'linkedin',
          total_found: profiles.length,
          results: profiles,
          completed_at: new Date().toISOString(),
          session_id: `linkedin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        console.log(`[search-linkedin] Saved extraction to database for user ${userId}`);
      } catch (dbError) {
        console.error('[search-linkedin] Error saving to database:', dbError);
      }
    }
    // ==== END SAVE ====

    return new Response(
      JSON.stringify({ 
        profiles,
        searchQuery: segment,
        termsSearched: searchTerms,
        total: profiles.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-linkedin:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
