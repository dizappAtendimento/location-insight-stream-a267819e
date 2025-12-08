import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { username, maxResults = 100 } = await req.json();

    if (!username) {
      return new Response(
        JSON.stringify({ error: 'Username é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');
    if (!SERPER_API_KEY) {
      console.error('SERPER_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cleanUsername = username.replace('@', '').trim();
    console.log(`Searching Instagram profiles related to: ${cleanUsername}, max: ${maxResults}`);

    // Buscar perfis relacionados ao Instagram usando Serper
    const allResults: SerperResult[] = [];
    const resultsPerPage = 100;
    const pagesToFetch = Math.ceil(maxResults / resultsPerPage);

  for (let page = 0; page < pagesToFetch && allResults.length < maxResults; page++) {
      // Buscar por perfis do Instagram sem usar site: operator
      const searchQuery = `instagram ${cleanUsername} perfil`;
      
      console.log(`Fetching page ${page + 1} for: ${searchQuery}`);

      const response = await fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: {
          'X-API-KEY': SERPER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: searchQuery,
          num: resultsPerPage,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Serper API error:', response.status, errorText);
        throw new Error(`Serper API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`Page ${page + 1} returned ${data.organic?.length || 0} results`);

      if (data.organic && data.organic.length > 0) {
        allResults.push(...data.organic);
      } else {
        break;
      }

      // Delay para evitar rate limiting
      if (page < pagesToFetch - 1) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Extrair perfis do Instagram dos resultados
    const profiles = allResults
      .filter((result: SerperResult) => result.link?.includes('instagram.com'))
      .map((result: SerperResult) => {
        const link = result.link || '';
        // Extrair username do link do Instagram
        const usernameMatch = link.match(/instagram\.com\/([^\/\?]+)/);
        const extractedUsername = usernameMatch ? usernameMatch[1] : '';
        
        // Tentar extrair email do snippet
        const emailMatch = result.snippet?.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        const email = emailMatch ? emailMatch[0] : '';

        return {
          username: extractedUsername,
          profileId: extractedUsername ? `ig_${extractedUsername}` : '',
          profileLink: link,
          email: email,
          bio: result.snippet || '',
        };
      })
      .filter((profile: { username: string }) => 
        profile.username && 
        !['p', 'explore', 'reel', 'stories', 'accounts', 'directory'].includes(profile.username)
      )
      .slice(0, maxResults);

    // Remover duplicados baseado no username
    const uniqueProfiles = profiles.reduce((acc: typeof profiles, current: typeof profiles[0]) => {
      const exists = acc.find((item: typeof profiles[0]) => item.username === current.username);
      if (!exists) {
        acc.push(current);
      }
      return acc;
    }, []);

    console.log(`Returning ${uniqueProfiles.length} unique Instagram profiles`);

    return new Response(
      JSON.stringify({ 
        profiles: uniqueProfiles,
        searchQuery: cleanUsername,
        total: uniqueProfiles.length 
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
