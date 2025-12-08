import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  location?: string;
  num?: number;
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

    const { query, location, num = 10 }: SearchRequest = await req.json();

    if (!query) {
      throw new Error('Query is required');
    }

    console.log(`Searching for: "${query}" in location: "${location || 'default'}"`);

    const searchQuery = location ? `${query} in ${location}` : query;

    const response = await fetch('https://google.serper.dev/places', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: searchQuery,
        num: num,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Serper API error:', response.status, errorText);
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Found ${data.places?.length || 0} places`);

    // Transform the data to a consistent format
    const places = data.places?.map((place: any) => ({
      name: place.title,
      address: place.address,
      phone: place.phoneNumber,
      rating: place.rating,
      reviewCount: place.ratingCount,
      category: place.category,
      website: place.website,
      cid: place.cid,
      position: place.position,
    })) || [];

    return new Response(JSON.stringify({ places, searchQuery }), {
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
