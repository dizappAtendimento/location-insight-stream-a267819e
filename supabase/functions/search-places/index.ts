import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  location?: string;
  maxResults?: number;
  stream?: boolean;
}

// Comprehensive US cities list (top 200+)
const US_CITIES = [
  'New York, NY', 'Los Angeles, CA', 'Chicago, IL', 'Houston, TX', 'Phoenix, AZ',
  'Philadelphia, PA', 'San Antonio, TX', 'San Diego, CA', 'Dallas, TX', 'San Jose, CA',
  'Austin, TX', 'Jacksonville, FL', 'Fort Worth, TX', 'Columbus, OH', 'Charlotte, NC',
  'San Francisco, CA', 'Indianapolis, IN', 'Seattle, WA', 'Denver, CO', 'Boston, MA',
  'Nashville, TN', 'Detroit, MI', 'Oklahoma City, OK', 'Portland, OR', 'Las Vegas, NV',
  'Memphis, TN', 'Louisville, KY', 'Baltimore, MD', 'Milwaukee, WI', 'Albuquerque, NM',
  'Tucson, AZ', 'Fresno, CA', 'Sacramento, CA', 'Kansas City, MO', 'Mesa, AZ',
  'Atlanta, GA', 'Omaha, NE', 'Colorado Springs, CO', 'Raleigh, NC', 'Miami, FL',
  'Long Beach, CA', 'Virginia Beach, VA', 'Oakland, CA', 'Minneapolis, MN', 'Tampa, FL',
  'Tulsa, OK', 'Arlington, TX', 'New Orleans, LA', 'Wichita, KS', 'Cleveland, OH',
  'Bakersfield, CA', 'Aurora, CO', 'Anaheim, CA', 'Honolulu, HI', 'Santa Ana, CA',
  'Riverside, CA', 'Corpus Christi, TX', 'Lexington, KY', 'Henderson, NV', 'Stockton, CA',
  'St. Paul, MN', 'Cincinnati, OH', 'St. Louis, MO', 'Pittsburgh, PA', 'Greensboro, NC',
  'Lincoln, NE', 'Anchorage, AK', 'Plano, TX', 'Orlando, FL', 'Irvine, CA',
  'Newark, NJ', 'Durham, NC', 'Chula Vista, CA', 'Toledo, OH', 'Fort Wayne, IN',
  'Jersey City, NJ', 'St. Petersburg, FL', 'Laredo, TX', 'Madison, WI', 'Chandler, AZ',
  'Buffalo, NY', 'Lubbock, TX', 'Scottsdale, AZ', 'Reno, NV', 'Glendale, AZ',
  'Gilbert, AZ', 'Winston-Salem, NC', 'North Las Vegas, NV', 'Norfolk, VA', 'Chesapeake, VA',
  'Garland, TX', 'Irving, TX', 'Hialeah, FL', 'Fremont, CA', 'Boise, ID',
  'Richmond, VA', 'Baton Rouge, LA', 'Spokane, WA', 'Des Moines, IA', 'Tacoma, WA',
  'San Bernardino, CA', 'Modesto, CA', 'Fontana, CA', 'Santa Clarita, CA', 'Moreno Valley, CA',
  'Birmingham, AL', 'Fayetteville, NC', 'Rochester, NY', 'Glendale, CA', 'Yonkers, NY',
];

const BR_CITIES = [
  'São Paulo, SP', 'Rio de Janeiro, RJ', 'Brasília, DF', 'Salvador, BA', 'Fortaleza, CE',
  'Belo Horizonte, MG', 'Manaus, AM', 'Curitiba, PR', 'Recife, PE', 'Porto Alegre, RS',
  'Belém, PA', 'Goiânia, GO', 'Guarulhos, SP', 'Campinas, SP', 'São Luís, MA',
  'São Gonçalo, RJ', 'Maceió, AL', 'Duque de Caxias, RJ', 'Natal, RN', 'Campo Grande, MS',
  'Teresina, PI', 'São Bernardo do Campo, SP', 'Nova Iguaçu, RJ', 'João Pessoa, PB', 'Santo André, SP',
  'Osasco, SP', 'São José dos Campos, SP', 'Ribeirão Preto, SP', 'Uberlândia, MG', 'Contagem, MG',
  'Sorocaba, SP', 'Aracaju, SE', 'Feira de Santana, BA', 'Cuiabá, MT', 'Joinville, SC',
  'Juiz de Fora, MG', 'Londrina, PR', 'Aparecida de Goiânia, GO', 'Niterói, RJ', 'Porto Velho, RO',
  'Serra, ES', 'Caxias do Sul, RS', 'Macapá, AP', 'Florianópolis, SC', 'Vila Velha, ES',
];

function generateSearchVariations(query: string): string[] {
  const variations = [query];
  const lowerQuery = query.toLowerCase();
  
  const serviceTerms: Record<string, string[]> = {
    'house cleaning': ['house cleaning service', 'home cleaning', 'maid service', 'housekeeping'],
    'cleaning': ['cleaning service', 'cleaners'],
    'plumber': ['plumbing', 'plumbing service'],
    'electrician': ['electrical service', 'electrical contractor'],
    'lawyer': ['law firm', 'attorney'],
    'dentist': ['dental clinic', 'dentistry'],
    'restaurant': ['restaurants', 'dining'],
    'mechanic': ['auto repair', 'car repair'],
  };
  
  for (const [key, terms] of Object.entries(serviceTerms)) {
    if (lowerQuery.includes(key)) {
      variations.push(...terms);
      break;
    }
  }
  
  return [...new Set(variations)];
}

async function fetchPlaces(apiKey: string, searchQuery: string, page: number = 1): Promise<any> {
  const response = await fetch('https://google.serper.dev/places', {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ q: searchQuery, num: 100, page }),
  });

  if (!response.ok) throw new Error(`Serper API error: ${response.status}`);
  return response.json();
}

async function fetchAllPagesForQuery(
  apiKey: string, 
  searchQuery: string, 
  maxResultsPerQuery: number,
  seenCids: Set<string>
): Promise<any[]> {
  const places: any[] = [];
  let page = 1;
  let emptyPages = 0;

  while (places.length < maxResultsPerQuery && page <= 10 && emptyPages < 2) {
    try {
      const data = await fetchPlaces(apiKey, searchQuery, page);
      
      if (!data.places || data.places.length === 0) {
        emptyPages++;
        page++;
        continue;
      }

      emptyPages = 0;

      for (const place of data.places) {
        const id = place.cid || `${place.title}-${place.address}`;
        if (!seenCids.has(id)) {
          seenCids.add(id);
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

      page++;
      await new Promise(resolve => setTimeout(resolve, 80));
    } catch {
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
    if (!SERPER_API_KEY) throw new Error('SERPER_API_KEY not configured');

    const { query, location, maxResults = 100, stream = false }: SearchRequest = await req.json();
    if (!query) throw new Error('Query is required');

    const normalizedLocation = location?.toLowerCase().trim() || '';
    const isUSA = !normalizedLocation || 
                  normalizedLocation.includes('eua') || 
                  normalizedLocation.includes('usa') || 
                  normalizedLocation.includes('estados unidos') ||
                  normalizedLocation.includes('united states');
    
    const isBrazil = normalizedLocation.includes('brasil') || 
                     normalizedLocation.includes('brazil') ||
                     /\b(sp|rj|mg|ba|pr|rs|sc|df|pe|ce)\b/.test(normalizedLocation);

    // STREAMING MODE
    if (stream && (isUSA || isBrazil || !location)) {
      const encoder = new TextEncoder();
      const cities = isBrazil ? BR_CITIES : US_CITIES;
      const searchVariations = generateSearchVariations(query);
      
      const readable = new ReadableStream({
        async start(controller) {
          const allPlaces: any[] = [];
          const seenCids = new Set<string>();
          const targetPerCity = Math.max(15, Math.ceil(maxResults / cities.length));
          
          // Send initial progress
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'start',
            totalCities: cities.length,
            variations: searchVariations,
          })}\n\n`));

          for (let i = 0; i < cities.length; i++) {
            if (allPlaces.length >= maxResults) break;
            
            const city = cities[i];
            
            // Send progress update
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              currentCity: city,
              cityIndex: i + 1,
              totalCities: cities.length,
              currentResults: allPlaces.length,
              targetResults: maxResults,
              percentage: Math.round(((i + 1) / cities.length) * 100),
            })}\n\n`));

            for (const variation of searchVariations) {
              if (allPlaces.length >= maxResults) break;
              
              try {
                const places = await fetchAllPagesForQuery(
                  SERPER_API_KEY, 
                  `${variation} in ${city}`, 
                  targetPerCity,
                  seenCids
                );
                
                allPlaces.push(...places);
                
                if (places.length > 0) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                    type: 'found',
                    city,
                    newPlaces: places.length,
                    totalResults: allPlaces.length,
                  })}\n\n`));
                }
                
                await new Promise(resolve => setTimeout(resolve, 30));
              } catch (error) {
                console.error(`Error in ${city}:`, error);
              }
            }
          }

          // Add position numbers
          allPlaces.forEach((place, index) => {
            place.position = index + 1;
          });

          // Send final results
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            places: allPlaces.slice(0, maxResults),
            searchQuery: query,
            totalFound: allPlaces.length,
            citiesSearched: cities.length,
          })}\n\n`));

          controller.close();
        }
      });

      return new Response(readable, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // NON-STREAMING MODE (for specific locations)
    const allPlaces: any[] = [];
    const seenCids = new Set<string>();
    const searchVariations = generateSearchVariations(query);

    if (!isUSA && !isBrazil && location) {
      for (const variation of searchVariations) {
        if (allPlaces.length >= maxResults) break;
        
        const places = await fetchAllPagesForQuery(
          SERPER_API_KEY, 
          `${variation} in ${location}`, 
          maxResults - allPlaces.length,
          seenCids
        );
        allPlaces.push(...places);
      }
    } else {
      const cities = isBrazil ? BR_CITIES : US_CITIES;
      const targetPerCity = Math.max(15, Math.ceil(maxResults / cities.length));
      
      for (const city of cities) {
        if (allPlaces.length >= maxResults) break;
        
        for (const variation of searchVariations) {
          if (allPlaces.length >= maxResults) break;
          
          try {
            const places = await fetchAllPagesForQuery(
              SERPER_API_KEY, 
              `${variation} in ${city}`, 
              targetPerCity,
              seenCids
            );
            allPlaces.push(...places);
            await new Promise(resolve => setTimeout(resolve, 30));
          } catch (error) {
            console.error(`Error in ${city}:`, error);
          }
        }
      }
    }

    allPlaces.forEach((place, index) => {
      place.position = index + 1;
    });

    return new Response(JSON.stringify({ 
      places: allPlaces.slice(0, maxResults), 
      searchQuery: query,
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
