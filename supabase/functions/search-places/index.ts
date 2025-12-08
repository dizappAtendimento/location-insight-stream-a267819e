import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  location?: string;
  maxResults?: number;
}

async function fetchPlaces(apiKey: string, searchQuery: string, page: number = 1): Promise<any> {
  const response = await fetch('https://google.serper.dev/places', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: searchQuery,
      num: 100, // Max per request
      page: page,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Serper API error:', response.status, errorText);
    throw new Error(`Serper API error: ${response.status}`);
  }

  return response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');
    
    if (!SERPER_API_KEY) {
      console.error('SERPER_API_KEY not configured');
      throw new Error('SERPER_API_KEY not configured');
    }

    const { query, location, maxResults = 100 }: SearchRequest = await req.json();

    if (!query) {
      throw new Error('Query is required');
    }

    const searchQuery = location ? `${query} in ${location}` : query;
    console.log(`Searching for: "${searchQuery}" - Max results: ${maxResults}`);

    const allPlaces: any[] = [];
    const seenCids = new Set<string>();
    let page = 1;
    const maxPages = Math.ceil(maxResults / 10) + 5; // Serper returns ~10 per page, add buffer
    let consecutiveEmptyPages = 0;

    while (allPlaces.length < maxResults && page <= maxPages && consecutiveEmptyPages < 3) {
      console.log(`Fetching page ${page}... (target: ${maxResults}, current: ${allPlaces.length})`);
      
      try {
        const data = await fetchPlaces(SERPER_API_KEY, searchQuery, page);
        
        if (!data.places || data.places.length === 0) {
          console.log(`No more results at page ${page}`);
          consecutiveEmptyPages++;
          page++;
          continue;
        }

        consecutiveEmptyPages = 0; // Reset on success
        let newPlacesCount = 0;

        for (const place of data.places) {
          if (allPlaces.length >= maxResults) break;
          
          // Deduplicate by cid
          const id = place.cid || `${place.title}-${place.address}`;
          if (!seenCids.has(id)) {
            seenCids.add(id);
            newPlacesCount++;
            allPlaces.push({
              name: place.title,
              address: place.address,
              phone: place.phoneNumber || null,
              rating: place.rating || null,
              reviewCount: place.ratingCount || null,
              category: place.category || null,
              website: place.website || null,
              cid: place.cid || null,
              position: allPlaces.length + 1,
            });
          }
        }

        console.log(`Page ${page}: found ${data.places.length} results, ${newPlacesCount} new. Total: ${allPlaces.length}`);

        // If we got very few new results for several pages, API might be exhausted
        if (newPlacesCount === 0) {
          consecutiveEmptyPages++;
        }

        page++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 150));
      } catch (pageError) {
        console.error(`Error fetching page ${page}:`, pageError);
        page++;
        consecutiveEmptyPages++;
      }
    }

    console.log(`Search complete. Pages fetched: ${page - 1}, Total unique places: ${allPlaces.length}`);

    console.log(`Final total: ${allPlaces.length} places`);

    return new Response(JSON.stringify({ 
      places: allPlaces.slice(0, maxResults), 
      searchQuery,
      totalFound: allPlaces.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in search-places:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
