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

// Major US cities/regions for expanded search
const US_REGIONS = [
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
  'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'Austin, TX',
  'San Jose, CA', 'Jacksonville, FL', 'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC',
  'Indianapolis, IN', 'San Francisco, CA', 'Seattle, WA', 'Denver, CO', 'Boston, MA',
  'Nashville, TN', 'Detroit, MI', 'Portland, OR', 'Las Vegas, NV', 'Memphis, TN',
  'Atlanta, GA', 'Miami, FL', 'Orlando, FL', 'Tampa, FL', 'Minneapolis, MN',
  'Cleveland, OH', 'Pittsburgh, PA', 'St Louis, MO', 'Kansas City, MO', 'Baltimore, MD',
  'Sacramento, CA', 'Salt Lake City, UT', 'Raleigh, NC', 'Cincinnati, OH', 'Milwaukee, WI',
];

// Major Brazilian cities for expanded search
const BR_REGIONS = [
  'São Paulo, SP', 'Rio de Janeiro, RJ', 'Brasília, DF', 'Belo Horizonte, MG', 'Salvador, BA',
  'Fortaleza, CE', 'Curitiba, PR', 'Manaus, AM', 'Recife, PE', 'Porto Alegre, RS',
  'Goiânia, GO', 'Belém, PA', 'Guarulhos, SP', 'Campinas, SP', 'São Luís, MA',
  'Maceió, AL', 'Campo Grande, MS', 'Natal, RN', 'João Pessoa, PB', 'Florianópolis, SC',
];

async function fetchPlaces(apiKey: string, searchQuery: string, page: number = 1): Promise<any> {
  const response = await fetch('https://google.serper.dev/places', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: searchQuery,
      num: 100,
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

async function fetchPagesForQuery(apiKey: string, searchQuery: string, maxResults: number, seenCids: Set<string>): Promise<any[]> {
  const places: any[] = [];
  let page = 1;
  const maxPages = 10; // Max pages per query
  let consecutiveEmptyPages = 0;

  while (places.length < maxResults && page <= maxPages && consecutiveEmptyPages < 2) {
    try {
      const data = await fetchPlaces(apiKey, searchQuery, page);
      
      if (!data.places || data.places.length === 0) {
        consecutiveEmptyPages++;
        page++;
        continue;
      }

      consecutiveEmptyPages = 0;
      let newCount = 0;

      for (const place of data.places) {
        const id = place.cid || `${place.title}-${place.address}`;
        if (!seenCids.has(id)) {
          seenCids.add(id);
          newCount++;
          places.push({
            name: place.title,
            address: place.address,
            phone: place.phoneNumber || null,
            rating: place.rating || null,
            reviewCount: place.ratingCount || null,
            category: place.category || null,
            website: place.website || null,
            cid: place.cid || null,
          });
        }
      }

      if (newCount === 0) consecutiveEmptyPages++;
      page++;
      
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error(`Error fetching page ${page} for "${searchQuery}":`, error);
      break;
    }
  }

  return places;
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

    console.log(`Searching for: "${query}" in "${location || 'multiple regions'}" - Max results: ${maxResults}`);

    const allPlaces: any[] = [];
    const seenCids = new Set<string>();

    // Determine search strategy
    if (location) {
      // Single location search with pagination
      const searchQuery = `${query} in ${location}`;
      console.log(`Single location search: "${searchQuery}"`);
      
      const places = await fetchPagesForQuery(SERPER_API_KEY, searchQuery, maxResults, seenCids);
      allPlaces.push(...places);
      console.log(`Found ${places.length} places in ${location}`);
    } else {
      // Multi-region search for maximum coverage
      // Detect if query contains Brazilian words
      const isBrazilian = /brasil|brazil|sp|rj|mg|ba|pr|rs|sc|go|pe|ce|df|am|pa/i.test(query) ||
                          /são paulo|rio de janeiro|belo horizonte|curitiba|porto alegre/i.test(query);
      
      const regions = isBrazilian ? BR_REGIONS : US_REGIONS;
      const resultsPerRegion = Math.ceil(maxResults / regions.length) + 10;
      
      console.log(`Multi-region search across ${regions.length} ${isBrazilian ? 'Brazilian' : 'US'} cities`);

      for (const region of regions) {
        if (allPlaces.length >= maxResults) break;
        
        const searchQuery = `${query} in ${region}`;
        console.log(`Searching: "${searchQuery}" (current total: ${allPlaces.length})`);
        
        try {
          const places = await fetchPagesForQuery(
            SERPER_API_KEY, 
            searchQuery, 
            Math.min(resultsPerRegion, maxResults - allPlaces.length),
            seenCids
          );
          
          allPlaces.push(...places);
          console.log(`Found ${places.length} new places in ${region}. Total: ${allPlaces.length}`);
          
          // Small delay between regions
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`Error searching in ${region}:`, error);
          continue;
        }
      }
    }

    // Add position numbers
    allPlaces.forEach((place, index) => {
      place.position = index + 1;
    });

    console.log(`Search complete. Total unique places: ${allPlaces.length}`);

    return new Response(JSON.stringify({ 
      places: allPlaces.slice(0, maxResults), 
      searchQuery: location ? `${query} in ${location}` : query,
      totalFound: allPlaces.length,
      regionsSearched: location ? 1 : (allPlaces.length >= maxResults ? 'multiple' : 'all'),
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
