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

// Comprehensive US cities list (top 200+)
const US_CITIES = [
  // Top 50 largest cities
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
  // Cities 51-100
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
  // Cities 101-150
  'San Bernardino, CA', 'Modesto, CA', 'Fontana, CA', 'Santa Clarita, CA', 'Moreno Valley, CA',
  'Birmingham, AL', 'Fayetteville, NC', 'Rochester, NY', 'Glendale, CA', 'Yonkers, NY',
  'Huntington Beach, CA', 'Salt Lake City, UT', 'Grand Rapids, MI', 'Amarillo, TX', 'Montgomery, AL',
  'Little Rock, AR', 'Akron, OH', 'Huntsville, AL', 'Augusta, GA', 'Port St. Lucie, FL',
  'Grand Prairie, TX', 'Columbus, GA', 'Tallahassee, FL', 'Overland Park, KS', 'Tempe, AZ',
  'McKinney, TX', 'Mobile, AL', 'Cape Coral, FL', 'Shreveport, LA', 'Frisco, TX',
  'Knoxville, TN', 'Worcester, MA', 'Brownsville, TX', 'Vancouver, WA', 'Fort Lauderdale, FL',
  'Sioux Falls, SD', 'Ontario, CA', 'Chattanooga, TN', 'Providence, RI', 'Newport News, VA',
  'Rancho Cucamonga, CA', 'Santa Rosa, CA', 'Peoria, AZ', 'Oceanside, CA', 'Elk Grove, CA',
  'Salem, OR', 'Pembroke Pines, FL', 'Eugene, OR', 'Garden Grove, CA', 'Cary, NC',
  // Cities 151-200
  'Fort Collins, CO', 'Corona, CA', 'Springfield, MO', 'Jackson, MS', 'Alexandria, VA',
  'Hayward, CA', 'Lancaster, CA', 'Salinas, CA', 'Palmdale, CA', 'Hollywood, FL',
  'Springfield, MA', 'Macon, GA', 'Kansas City, KS', 'Sunnyvale, CA', 'Pomona, CA',
  'Killeen, TX', 'Escondido, CA', 'Pasadena, TX', 'Naperville, IL', 'Bellevue, WA',
  'Joliet, IL', 'Murfreesboro, TN', 'Midland, TX', 'Rockford, IL', 'Paterson, NJ',
  'Savannah, GA', 'Bridgeport, CT', 'Torrance, CA', 'McAllen, TX', 'Syracuse, NY',
  'Surprise, AZ', 'Denton, TX', 'Roseville, CA', 'Thornton, CO', 'Miramar, FL',
  'Pasadena, CA', 'Mesquite, TX', 'Olathe, KS', 'Dayton, OH', 'Carrollton, TX',
  'Waco, TX', 'Orange, CA', 'Fullerton, CA', 'Charleston, SC', 'West Valley City, UT',
  'Visalia, CA', 'Hampton, VA', 'Gainesville, FL', 'Warren, MI', 'Coral Springs, FL',
];

// Brazilian cities
const BR_CITIES = [
  'São Paulo, SP', 'Rio de Janeiro, RJ', 'Brasília, DF', 'Salvador, BA', 'Fortaleza, CE',
  'Belo Horizonte, MG', 'Manaus, AM', 'Curitiba, PR', 'Recife, PE', 'Porto Alegre, RS',
  'Belém, PA', 'Goiânia, GO', 'Guarulhos, SP', 'Campinas, SP', 'São Luís, MA',
  'São Gonçalo, RJ', 'Maceió, AL', 'Duque de Caxias, RJ', 'Natal, RN', 'Campo Grande, MS',
  'Teresina, PI', 'São Bernardo do Campo, SP', 'Nova Iguaçu, RJ', 'João Pessoa, PB', 'Santo André, SP',
  'Osasco, SP', 'São José dos Campos, SP', 'Jaboatão dos Guararapes, PE', 'Ribeirão Preto, SP', 'Uberlândia, MG',
  'Contagem, MG', 'Sorocaba, SP', 'Aracaju, SE', 'Feira de Santana, BA', 'Cuiabá, MT',
  'Joinville, SC', 'Juiz de Fora, MG', 'Londrina, PR', 'Aparecida de Goiânia, GO', 'Ananindeua, PA',
  'Niterói, RJ', 'Porto Velho, RO', 'Serra, ES', 'Caxias do Sul, RS', 'Macapá, AP',
  'Florianópolis, SC', 'Vila Velha, ES', 'São João de Meriti, RJ', 'Mauá, SP', 'Betim, MG',
];

// Generate search term variations
function generateSearchVariations(query: string): string[] {
  const variations = [query];
  const lowerQuery = query.toLowerCase();
  
  // Common service-related variations
  const serviceTerms: Record<string, string[]> = {
    'house cleaning': ['house cleaning service', 'home cleaning', 'residential cleaning', 'maid service', 'housekeeping'],
    'cleaning': ['cleaning service', 'cleaners', 'janitorial'],
    'plumber': ['plumbing', 'plumbing service', 'plumber service'],
    'electrician': ['electrical service', 'electric', 'electrical contractor'],
    'lawyer': ['law firm', 'attorney', 'legal services'],
    'dentist': ['dental', 'dental clinic', 'dentistry'],
    'restaurant': ['restaurants', 'dining', 'eatery'],
    'mechanic': ['auto repair', 'car repair', 'automotive'],
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
    body: JSON.stringify({
      q: searchQuery,
      num: 100,
      page: page,
    }),
  });

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status}`);
  }

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
  const maxPages = 15;
  let emptyPages = 0;

  while (places.length < maxResultsPerQuery && page <= maxPages && emptyPages < 2) {
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
    } catch (error) {
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
      throw new Error('SERPER_API_KEY not configured');
    }

    const { query, location, maxResults = 100 }: SearchRequest = await req.json();

    if (!query) {
      throw new Error('Query is required');
    }

    const normalizedLocation = location?.toLowerCase().trim() || '';
    const isUSA = !normalizedLocation || 
                  normalizedLocation.includes('eua') || 
                  normalizedLocation.includes('usa') || 
                  normalizedLocation.includes('estados unidos') ||
                  normalizedLocation.includes('united states');
    
    const isBrazil = normalizedLocation.includes('brasil') || 
                     normalizedLocation.includes('brazil') ||
                     /\b(sp|rj|mg|ba|pr|rs|sc|df|pe|ce)\b/.test(normalizedLocation);

    console.log(`=== SEARCH START ===`);
    console.log(`Query: "${query}", Location: "${location || 'ALL'}", Max: ${maxResults}`);
    console.log(`Region detected: ${isBrazil ? 'Brazil' : isUSA ? 'USA' : 'Specific location'}`);

    const allPlaces: any[] = [];
    const seenCids = new Set<string>();
    const searchVariations = generateSearchVariations(query);
    
    console.log(`Search variations: ${searchVariations.join(', ')}`);

    if (!isUSA && !isBrazil && location) {
      // Specific location search
      for (const variation of searchVariations) {
        if (allPlaces.length >= maxResults) break;
        
        const searchQuery = `${variation} in ${location}`;
        console.log(`Searching: "${searchQuery}"`);
        
        const places = await fetchAllPagesForQuery(
          SERPER_API_KEY, 
          searchQuery, 
          maxResults - allPlaces.length,
          seenCids
        );
        allPlaces.push(...places);
        console.log(`Found ${places.length} new. Total: ${allPlaces.length}`);
      }
    } else {
      // Multi-city comprehensive search
      const cities = isBrazil ? BR_CITIES : US_CITIES;
      const targetPerCity = Math.max(20, Math.ceil(maxResults / cities.length));
      
      console.log(`Searching across ${cities.length} cities with ${searchVariations.length} variations`);
      
      for (const city of cities) {
        if (allPlaces.length >= maxResults) {
          console.log(`Reached target of ${maxResults} results`);
          break;
        }
        
        for (const variation of searchVariations) {
          if (allPlaces.length >= maxResults) break;
          
          const searchQuery = `${variation} in ${city}`;
          
          try {
            const places = await fetchAllPagesForQuery(
              SERPER_API_KEY, 
              searchQuery, 
              targetPerCity,
              seenCids
            );
            
            if (places.length > 0) {
              allPlaces.push(...places);
              console.log(`${city} [${variation}]: +${places.length} → Total: ${allPlaces.length}`);
            }
            
            await new Promise(resolve => setTimeout(resolve, 50));
          } catch (error) {
            console.error(`Error in ${city}:`, error);
          }
        }
      }
    }

    // Add position numbers
    allPlaces.forEach((place, index) => {
      place.position = index + 1;
    });

    console.log(`=== SEARCH COMPLETE ===`);
    console.log(`Total unique places found: ${allPlaces.length}`);

    return new Response(JSON.stringify({ 
      places: allPlaces.slice(0, maxResults), 
      searchQuery: query,
      totalFound: allPlaces.length,
      citiesSearched: isUSA ? US_CITIES.length : isBrazil ? BR_CITIES.length : 1,
      variationsUsed: searchVariations.length,
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
