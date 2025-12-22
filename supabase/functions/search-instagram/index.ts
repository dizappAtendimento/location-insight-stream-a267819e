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
  imageUrl?: string;
}

interface InstagramProfile {
  username: string;
  profileId: string;
  profileLink: string;
  email: string;
  phone: string;
  bioLink: string;
  bio: string;
}

// Mapa de termos relacionados para expansão de busca
const relatedTerms: Record<string, string[]> = {
  'mecanica': ['mecânico', 'autocenter', 'oficina mecânica', 'auto center', 'auto mecânica', 'funilaria', 'borracharia', 'troca de óleo', 'centro automotivo'],
  'dentista': ['odontologia', 'dentista', 'ortodontista', 'clínica odontológica', 'consultório odontológico', 'implante dentário'],
  'advogado': ['advocacia', 'escritório de advocacia', 'advogada', 'jurídico', 'direito'],
  'nutricionista': ['nutrição', 'nutri', 'nutricionista clínica', 'emagrecimento', 'dieta'],
  'personal': ['personal trainer', 'treinador pessoal', 'academia', 'fitness', 'treino'],
  'salao': ['salão de beleza', 'cabeleireiro', 'cabeleireira', 'barbearia', 'beauty', 'hair'],
  'estetica': ['estética', 'clínica de estética', 'esteticista', 'spa', 'beauty center', 'harmonização facial'],
  'restaurante': ['restaurante', 'gastronomia', 'chef', 'comida', 'delivery', 'food'],
  'loja': ['loja', 'store', 'shop', 'boutique', 'outlet'],
  'fotografo': ['fotógrafo', 'fotografia', 'foto', 'ensaio fotográfico', 'estúdio fotográfico'],
  'arquiteto': ['arquitetura', 'arquiteto', 'design de interiores', 'decoração', 'interiores'],
  'psicologo': ['psicologia', 'psicólogo', 'psicóloga', 'terapia', 'saúde mental'],
  'medico': ['médico', 'medicina', 'clínica médica', 'doutor', 'doutora', 'consultório'],
  'contador': ['contabilidade', 'contador', 'contadora', 'escritório contábil'],
  'imobiliaria': ['imobiliária', 'corretor de imóveis', 'imóveis', 'real estate'],
};

function getRelatedTerms(segment: string): string[] {
  const lowerSegment = segment.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Encontrar termos relacionados
  for (const [key, terms] of Object.entries(relatedTerms)) {
    if (lowerSegment.includes(key) || key.includes(lowerSegment)) {
      return [segment, ...terms];
    }
  }
  
  // Se não encontrou, retornar variações básicas
  return [segment, `${segment}s`, `profissional ${segment}`, `especialista ${segment}`];
}

function extractEmail(text: string): string {
  const emailMatch = text?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return emailMatch ? emailMatch[0] : '';
}

function extractPhone(text: string): string {
  // Padrões brasileiros de telefone
  const phonePatterns = [
    /\+55\s?\d{2}\s?\d{4,5}[-.\s]?\d{4}/,
    /\(\d{2}\)\s?\d{4,5}[-.\s]?\d{4}/,
    /\d{2}\s?\d{4,5}[-.\s]?\d{4}/,
    /\d{4,5}[-.\s]?\d{4}/,
  ];
  
  for (const pattern of phonePatterns) {
    const match = text?.match(pattern);
    if (match) {
      return match[0].replace(/[^\d+]/g, '').replace(/^(\d{2})(\d{4,5})(\d{4})$/, '($1) $2-$3');
    }
  }
  return '';
}

function extractBioLink(text: string): string {
  // Procurar links comuns em bios
  const linkPatterns = [
    /linktr\.ee\/[^\s]+/i,
    /bit\.ly\/[^\s]+/i,
    /wa\.me\/[^\s]+/i,
    /api\.whatsapp\.com\/[^\s]+/i,
    /https?:\/\/[^\s]+/,
  ];
  
  for (const pattern of linkPatterns) {
    const match = text?.match(pattern);
    if (match) {
      let link = match[0];
      if (!link.startsWith('http')) {
        link = 'https://' + link;
      }
      return link;
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
        .select('qntInstagram')
        .eq('id', userData.plano)
        .single();

      const limiteInstagram = planInfo?.qntInstagram || 0;
      const isUnlimited = limiteInstagram === 0 || limiteInstagram > 999999999;

      if (!isUnlimited) {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        const { count: extracoesUsadas } = await supabase
          .from('search_jobs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('type', 'instagram')
          .gte('created_at', monthStart.toISOString());

        if ((extracoesUsadas || 0) >= limiteInstagram) {
          return new Response(
            JSON.stringify({ 
              error: `Limite de consultas Instagram atingido (${extracoesUsadas}/${limiteInstagram} este mês). Faça upgrade do seu plano para continuar.`,
              limitReached: true,
              used: extracoesUsadas,
              limit: limiteInstagram
            }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    // ==== END VALIDATION ====

    // Obter termos relacionados para busca expandida
    const searchTerms = getRelatedTerms(segment);
    console.log(`Segment: ${segment}, Related terms: ${searchTerms.join(', ')}`);
    
    const allProfiles: Map<string, InstagramProfile> = new Map();
    const resultsPerQuery = Math.ceil(maxResults / searchTerms.length);

    // Fazer buscas para cada termo relacionado
    for (const term of searchTerms) {
      if (allProfiles.size >= maxResults) break;

      let searchQuery = `instagram ${term}`;
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
            if (!result.link?.includes('instagram.com')) continue;
            
            const usernameMatch = result.link.match(/instagram\.com\/([^\/\?]+)/);
            const username = usernameMatch ? usernameMatch[1] : '';
            
            // Filtrar usernames inválidos
            if (!username || ['p', 'explore', 'reel', 'reels', 'stories', 'accounts', 'directory', 'tv', 'about', 'tags', 'locations'].includes(username)) {
              continue;
            }

            // Se já temos esse perfil, merge os dados
            if (allProfiles.has(username)) {
              const existing = allProfiles.get(username)!;
              const newEmail = extractEmail(result.snippet || '');
              const newPhone = extractPhone(result.snippet || '');
              const newBioLink = extractBioLink(result.snippet || '');
              
              if (!existing.email && newEmail) existing.email = newEmail;
              if (!existing.phone && newPhone) existing.phone = newPhone;
              if (!existing.bioLink && newBioLink) existing.bioLink = newBioLink;
              if (!existing.bio && result.snippet) existing.bio = result.snippet;
              
              continue;
            }

            const profile: InstagramProfile = {
              username,
              profileId: `ig_${username}`,
              profileLink: result.link,
              email: extractEmail(result.snippet || ''),
              phone: extractPhone(result.snippet || ''),
              bioLink: extractBioLink(result.snippet || ''),
              bio: result.snippet || '',
            };

            allProfiles.set(username, profile);
          }
        }

        // Delay para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));

      } catch (error) {
        console.error(`Error searching for "${term}":`, error);
        continue;
      }
    }

    const profiles = Array.from(allProfiles.values()).slice(0, maxResults);
    console.log(`Returning ${profiles.length} unique profiles for segment: ${segment}`);

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
          type: 'instagram',
          total_found: profiles.length,
          results: profiles,
          completed_at: new Date().toISOString(),
          session_id: `instagram_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        console.log(`[search-instagram] Saved extraction to database for user ${userId}`);
      } catch (dbError) {
        console.error('[search-instagram] Error saving to database:', dbError);
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
    console.error('Error in search-instagram:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
