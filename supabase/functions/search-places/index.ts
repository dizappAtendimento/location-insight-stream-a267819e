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

// Brazilian states with their cities (comprehensive list)
const BR_STATES: Record<string, string[]> = {
  'go': [
    'Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia', 
    'Águas Lindas de Goiás', 'Valparaíso de Goiás', 'Trindade', 'Formosa', 'Novo Gama',
    'Senador Canedo', 'Catalão', 'Itumbiara', 'Jataí', 'Planaltina', 
    'Caldas Novas', 'Santo Antônio do Descoberto', 'Cidade Ocidental', 'Inhumas', 'Mineiros',
    'Quirinópolis', 'Goianésia', 'Jaraguá', 'Morrinhos', 'Porangatu',
    'Uruaçu', 'Goiatuba', 'Niquelândia', 'Ceres', 'Santa Helena de Goiás',
    'Padre Bernardo', 'Pirenópolis', 'Cristalina', 'Ipameri', 'Pires do Rio',
    'Alexânia', 'Posse', 'Hidrolândia', 'Goianira', 'Nerópolis',
  ],
  'goias': [
    'Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia', 
    'Águas Lindas de Goiás', 'Valparaíso de Goiás', 'Trindade', 'Formosa', 'Novo Gama',
    'Senador Canedo', 'Catalão', 'Itumbiara', 'Jataí', 'Planaltina', 
    'Caldas Novas', 'Santo Antônio do Descoberto', 'Cidade Ocidental', 'Inhumas', 'Mineiros',
    'Quirinópolis', 'Goianésia', 'Jaraguá', 'Morrinhos', 'Porangatu',
    'Uruaçu', 'Goiatuba', 'Niquelândia', 'Ceres', 'Santa Helena de Goiás',
    'Padre Bernardo', 'Pirenópolis', 'Cristalina', 'Ipameri', 'Pires do Rio',
    'Alexânia', 'Posse', 'Hidrolândia', 'Goianira', 'Nerópolis',
  ],
  'sp': [
    'São Paulo', 'Guarulhos', 'Campinas', 'São Bernardo do Campo', 'Santo André',
    'Osasco', 'São José dos Campos', 'Ribeirão Preto', 'Sorocaba', 'Santos',
    'Mauá', 'São José do Rio Preto', 'Mogi das Cruzes', 'Diadema', 'Jundiaí',
    'Piracicaba', 'Carapicuíba', 'Bauru', 'Itaquaquecetuba', 'São Vicente',
    'Franca', 'Praia Grande', 'Guarujá', 'Taubaté', 'Limeira',
    'Suzano', 'Taboão da Serra', 'Sumaré', 'Barueri', 'Embu das Artes',
    'São Carlos', 'Indaiatuba', 'Cotia', 'Americana', 'Marília',
    'Araraquara', 'Jacareí', 'Hortolândia', 'Presidente Prudente', 'Rio Claro',
  ],
  'rj': [
    'Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Niterói',
    'Belford Roxo', 'Campos dos Goytacazes', 'São João de Meriti', 'Petrópolis', 'Volta Redonda',
    'Magé', 'Itaboraí', 'Macaé', 'Mesquita', 'Nilópolis',
    'Cabo Frio', 'Nova Friburgo', 'Barra Mansa', 'Angra dos Reis', 'Teresópolis',
    'Resende', 'Queimados', 'Maricá', 'Rio das Ostras', 'Araruama',
  ],
  'mg': [
    'Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim',
    'Montes Claros', 'Ribeirão das Neves', 'Uberaba', 'Governador Valadares', 'Ipatinga',
    'Sete Lagoas', 'Divinópolis', 'Santa Luzia', 'Ibirité', 'Poços de Caldas',
    'Patos de Minas', 'Pouso Alegre', 'Teófilo Otoni', 'Barbacena', 'Sabará',
    'Varginha', 'Conselheiro Lafaiete', 'Araguari', 'Itabira', 'Passos',
  ],
  'ba': [
    'Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Itabuna',
    'Juazeiro', 'Lauro de Freitas', 'Ilhéus', 'Jequié', 'Teixeira de Freitas',
    'Barreiras', 'Alagoinhas', 'Porto Seguro', 'Simões Filho', 'Paulo Afonso',
    'Eunápolis', 'Santo Antônio de Jesus', 'Valença', 'Candeias', 'Guanambi',
  ],
  'pr': [
    'Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel',
    'São José dos Pinhais', 'Foz do Iguaçu', 'Colombo', 'Guarapuava', 'Paranaguá',
    'Araucária', 'Toledo', 'Apucarana', 'Pinhais', 'Campo Largo',
    'Almirante Tamandaré', 'Umuarama', 'Piraquara', 'Cambé', 'Arapongas',
  ],
  'rs': [
    'Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Canoas', 'Santa Maria',
    'Gravataí', 'Viamão', 'Novo Hamburgo', 'São Leopoldo', 'Rio Grande',
    'Alvorada', 'Passo Fundo', 'Sapucaia do Sul', 'Uruguaiana', 'Santa Cruz do Sul',
    'Cachoeirinha', 'Bagé', 'Bento Gonçalves', 'Erechim', 'Guaíba',
  ],
  'pe': [
    'Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina',
    'Paulista', 'Cabo de Santo Agostinho', 'Camaragibe', 'Garanhuns', 'Vitória de Santo Antão',
    'Igarassu', 'São Lourenço da Mata', 'Abreu e Lima', 'Serra Talhada', 'Araripina',
  ],
  'ce': [
    'Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral',
    'Crato', 'Itapipoca', 'Maranguape', 'Iguatu', 'Quixadá',
    'Pacatuba', 'Aquiraz', 'Canindé', 'Crateús', 'Pacajus',
  ],
  'pa': [
    'Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Parauapebas',
    'Castanhal', 'Abaetetuba', 'Cametá', 'Marituba', 'Bragança',
    'Tucuruí', 'Altamira', 'Itaituba', 'Barcarena', 'Paragominas',
  ],
  'am': [
    'Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru', 'Coari',
    'Tefé', 'Tabatinga', 'Maués', 'Humaitá', 'Iranduba',
  ],
  'sc': [
    'Joinville', 'Florianópolis', 'Blumenau', 'São José', 'Chapecó',
    'Itajaí', 'Criciúma', 'Jaraguá do Sul', 'Palhoça', 'Lages',
    'Balneário Camboriú', 'Brusque', 'Tubarão', 'São Bento do Sul', 'Caçador',
  ],
  'ma': [
    'São Luís', 'Imperatriz', 'São José de Ribamar', 'Timon', 'Caxias',
    'Codó', 'Paço do Lumiar', 'Açailândia', 'Bacabal', 'Santa Inês',
  ],
  'pb': [
    'João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux',
    'Sousa', 'Cajazeiras', 'Cabedelo', 'Guarabira', 'Sapé',
  ],
  'mt': [
    'Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra',
    'Cáceres', 'Sorriso', 'Lucas do Rio Verde', 'Primavera do Leste', 'Barra do Garças',
  ],
  'ms': [
    'Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã',
    'Naviraí', 'Nova Andradina', 'Aquidauana', 'Sidrolândia', 'Paranaíba',
  ],
  'pi': [
    'Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Floriano',
    'Campo Maior', 'Barras', 'União', 'Altos', 'José de Freitas',
  ],
  'rn': [
    'Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Ceará-Mirim',
    'Macaíba', 'Caicó', 'Assu', 'Currais Novos', 'São José de Mipibu',
  ],
  'al': [
    'Maceió', 'Arapiraca', 'Rio Largo', 'Palmeira dos Índios', 'União dos Palmares',
    'Penedo', 'São Miguel dos Campos', 'Santana do Ipanema', 'Delmiro Gouveia', 'Coruripe',
  ],
  'se': [
    'Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana', 'São Cristóvão',
    'Estância', 'Tobias Barreto', 'Itabaianinha', 'Simão Dias', 'Capela',
  ],
  'es': [
    'Vila Velha', 'Serra', 'Cariacica', 'Vitória', 'Cachoeiro de Itapemirim',
    'Linhares', 'São Mateus', 'Colatina', 'Guarapari', 'Aracruz',
  ],
  'ro': [
    'Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal',
    'Rolim de Moura', 'Jaru', 'Guajará-Mirim', 'Ouro Preto do Oeste', 'Pimenta Bueno',
  ],
  'to': [
    'Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional', 'Paraíso do Tocantins',
    'Colinas do Tocantins', 'Guaraí', 'Tocantinópolis', 'Dianópolis', 'Miracema do Tocantins',
  ],
  'ac': [
    'Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Tarauacá', 'Feijó',
    'Brasileia', 'Senador Guiomard', 'Epitaciolândia', 'Xapuri', 'Plácido de Castro',
  ],
  'ap': [
    'Macapá', 'Santana', 'Laranjal do Jari', 'Oiapoque', 'Mazagão',
    'Porto Grande', 'Pedra Branca do Amapari', 'Tartarugalzinho', 'Vitória do Jari', 'Calçoene',
  ],
  'rr': [
    'Boa Vista', 'Rorainópolis', 'Caracaraí', 'Alto Alegre', 'Mucajaí',
    'Cantá', 'Pacaraima', 'Bonfim', 'Normandia', 'São João da Baliza',
  ],
  'df': [
    'Brasília', 'Ceilândia', 'Taguatinga', 'Samambaia', 'Plano Piloto',
    'Águas Claras', 'Recanto das Emas', 'Gama', 'Guará', 'Santa Maria',
  ],
};

// All Brazilian cities for full country search
const ALL_BR_CITIES = Object.values(BR_STATES).flat();

// US States with cities
const US_STATES: Record<string, string[]> = {
  'ca': ['Los Angeles', 'San Diego', 'San Jose', 'San Francisco', 'Fresno', 'Sacramento', 'Long Beach', 'Oakland', 'Bakersfield', 'Anaheim', 'Santa Ana', 'Riverside', 'Stockton', 'Irvine', 'Chula Vista'],
  'tx': ['Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth', 'El Paso', 'Arlington', 'Corpus Christi', 'Plano', 'Laredo', 'Lubbock', 'Garland', 'Irving', 'Amarillo', 'Grand Prairie'],
  'fl': ['Jacksonville', 'Miami', 'Tampa', 'Orlando', 'St. Petersburg', 'Hialeah', 'Tallahassee', 'Fort Lauderdale', 'Port St. Lucie', 'Cape Coral', 'Pembroke Pines', 'Hollywood', 'Miramar', 'Gainesville', 'Coral Springs'],
  'ny': ['New York', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse', 'Albany', 'New Rochelle', 'Mount Vernon', 'Schenectady', 'Utica', 'White Plains', 'Hempstead', 'Troy', 'Niagara Falls', 'Binghamton'],
  'pa': ['Philadelphia', 'Pittsburgh', 'Allentown', 'Reading', 'Scranton', 'Bethlehem', 'Lancaster', 'Harrisburg', 'Altoona', 'Erie', 'York', 'Wilkes-Barre', 'Chester', 'Williamsport', 'Easton'],
};

const ALL_US_CITIES = Object.values(US_STATES).flat();

function generateSearchVariations(query: string): string[] {
  const variations = [query];
  const lowerQuery = query.toLowerCase();
  
  const serviceTerms: Record<string, string[]> = {
    'clinica': ['clinica', 'consultório', 'centro médico'],
    'clinicas': ['clinicas', 'clínicas', 'consultórios', 'centros médicos'],
    'odontol': ['clínica odontológica', 'dentista', 'consultório odontológico', 'odontologia'],
    'dentist': ['dentista', 'clínica odontológica', 'odontologia'],
    'advogado': ['advogado', 'escritório de advocacia', 'advogados'],
    'mecanic': ['mecânica', 'oficina mecânica', 'autocenter', 'auto center'],
    'restaurante': ['restaurante', 'restaurantes', 'lanchonete'],
    'pet': ['pet shop', 'veterinário', 'clínica veterinária'],
    'salao': ['salão de beleza', 'barbearia', 'cabeleireiro'],
    'academia': ['academia', 'fitness', 'crossfit'],
    'hotel': ['hotel', 'pousada', 'hospedagem'],
    'escola': ['escola', 'colégio', 'curso'],
    'contab': ['contabilidade', 'contador', 'escritório contábil'],
    'imobi': ['imobiliária', 'corretor de imóveis'],
  };
  
  for (const [key, terms] of Object.entries(serviceTerms)) {
    if (lowerQuery.includes(key)) {
      variations.push(...terms);
      break;
    }
  }
  
  return [...new Set(variations)];
}

function detectLocationContext(location: string): { type: 'city' | 'state' | 'country', cities: string[], stateName?: string } {
  const normalized = location.toLowerCase().trim();
  
  // Check if it's a Brazilian state
  for (const [stateCode, cities] of Object.entries(BR_STATES)) {
    if (normalized === stateCode || 
        normalized.includes(stateCode) ||
        (stateCode === 'goias' && normalized.includes('goiás')) ||
        (stateCode === 'sp' && (normalized === 'são paulo' || normalized === 'sao paulo')) ||
        (stateCode === 'rj' && normalized === 'rio de janeiro') ||
        (stateCode === 'mg' && normalized === 'minas gerais') ||
        (stateCode === 'ba' && normalized === 'bahia') ||
        (stateCode === 'pr' && normalized === 'paraná') ||
        (stateCode === 'rs' && normalized === 'rio grande do sul') ||
        (stateCode === 'sc' && normalized === 'santa catarina') ||
        (stateCode === 'pe' && normalized === 'pernambuco') ||
        (stateCode === 'ce' && normalized === 'ceará') ||
        (stateCode === 'pa' && normalized === 'pará') ||
        (stateCode === 'am' && normalized === 'amazonas') ||
        (stateCode === 'ma' && normalized === 'maranhão') ||
        (stateCode === 'pb' && normalized === 'paraíba') ||
        (stateCode === 'mt' && normalized === 'mato grosso') ||
        (stateCode === 'ms' && normalized === 'mato grosso do sul') ||
        (stateCode === 'pi' && normalized === 'piauí') ||
        (stateCode === 'rn' && normalized === 'rio grande do norte') ||
        (stateCode === 'al' && normalized === 'alagoas') ||
        (stateCode === 'se' && normalized === 'sergipe') ||
        (stateCode === 'es' && normalized === 'espírito santo') ||
        (stateCode === 'ro' && normalized === 'rondônia') ||
        (stateCode === 'to' && normalized === 'tocantins') ||
        (stateCode === 'ac' && normalized === 'acre') ||
        (stateCode === 'ap' && normalized === 'amapá') ||
        (stateCode === 'rr' && normalized === 'roraima') ||
        (stateCode === 'df' && (normalized === 'distrito federal' || normalized === 'brasília' || normalized === 'brasilia'))) {
      return { type: 'state', cities: cities.map(c => `${c}, ${stateCode.toUpperCase()}`), stateName: stateCode.toUpperCase() };
    }
  }
  
  // Check if it's Brazil (country)
  if (normalized.includes('brasil') || normalized.includes('brazil')) {
    return { type: 'country', cities: ALL_BR_CITIES.map(c => `${c}, Brasil`) };
  }
  
  // Check if it's USA (country)
  if (normalized.includes('eua') || normalized.includes('usa') || normalized.includes('estados unidos') || normalized.includes('united states')) {
    return { type: 'country', cities: ALL_US_CITIES.map(c => `${c}, USA`) };
  }
  
  // It's a specific city
  return { type: 'city', cities: [location] };
}

async function fetchPlaces(apiKey: string, searchQuery: string, page: number = 1): Promise<any> {
  console.log(`Fetching: "${searchQuery}" - Page ${page}`);
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
  seenCids: Set<string>,
  allPlaces: any[]
): Promise<number> {
  let page = 1;
  let emptyPages = 0;
  let foundCount = 0;

  // Fetch up to 10 pages (max 1000 results per query)
  while (foundCount < maxResultsPerQuery && page <= 10 && emptyPages < 2) {
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
          allPlaces.push({
            name: place.title,
            address: place.address,
            phone: place.phoneNumber || null,
            rating: place.rating || null,
            reviewCount: place.ratingCount || null,
            category: place.category || null,
            website: place.website || null,
            cid: place.cid || null,
          });
          foundCount++;
        }
      }

      page++;
      await new Promise(resolve => setTimeout(resolve, 50));
    } catch (error) {
      console.error(`Error fetching page ${page}:`, error);
      break;
    }
  }

  return foundCount;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');
    if (!SERPER_API_KEY) throw new Error('SERPER_API_KEY not configured');

    const { query, location, maxResults = 1000, stream = true }: SearchRequest = await req.json();
    if (!query) throw new Error('Query is required');

    const searchVariations = generateSearchVariations(query);
    const locationContext = location ? detectLocationContext(location) : { type: 'country' as const, cities: ALL_BR_CITIES.map(c => `${c}, Brasil`) };
    
    console.log(`Search: "${query}" | Location type: ${locationContext.type} | Cities: ${locationContext.cities.length}`);

    // STREAMING MODE
    if (stream) {
      const encoder = new TextEncoder();
      const cities = locationContext.cities;
      
      const readable = new ReadableStream({
        async start(controller) {
          const allPlaces: any[] = [];
          const seenCids = new Set<string>();
          
          // For cities, search exhaustively. For states/countries, search all cities
          const maxPerCity = locationContext.type === 'city' ? maxResults : Math.max(100, Math.ceil(maxResults / cities.length));
          
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'start',
            totalCities: cities.length,
            locationType: locationContext.type,
            variations: searchVariations,
          })}\n\n`));

          for (let i = 0; i < cities.length; i++) {
            if (allPlaces.length >= maxResults) break;
            
            const city = cities[i];
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              type: 'progress',
              currentCity: city,
              cityIndex: i + 1,
              totalCities: cities.length,
              currentResults: allPlaces.length,
              targetResults: maxResults,
              percentage: Math.round(((i + 1) / cities.length) * 100),
            })}\n\n`));

            let cityFoundCount = 0;
            
            for (const variation of searchVariations) {
              if (allPlaces.length >= maxResults || cityFoundCount >= maxPerCity) break;
              
              try {
                const beforeCount = allPlaces.length;
                await fetchAllPagesForQuery(
                  SERPER_API_KEY, 
                  `${variation} em ${city}`, 
                  maxPerCity - cityFoundCount,
                  seenCids,
                  allPlaces
                );
                cityFoundCount += (allPlaces.length - beforeCount);
                
                // Also try with "in" for better coverage
                if (allPlaces.length < maxResults && cityFoundCount < maxPerCity) {
                  const beforeCount2 = allPlaces.length;
                  await fetchAllPagesForQuery(
                    SERPER_API_KEY, 
                    `${variation} in ${city}`, 
                    maxPerCity - cityFoundCount,
                    seenCids,
                    allPlaces
                  );
                  cityFoundCount += (allPlaces.length - beforeCount2);
                }
                
                await new Promise(resolve => setTimeout(resolve, 30));
              } catch (error) {
                console.error(`Error in ${city}:`, error);
              }
            }

            if (cityFoundCount > 0) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                type: 'found',
                city,
                newPlaces: cityFoundCount,
                totalResults: allPlaces.length,
                places: allPlaces.slice(-20),
              })}\n\n`));
            }
          }

          allPlaces.forEach((place, index) => {
            place.position = index + 1;
          });

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'complete',
            places: allPlaces.slice(0, maxResults),
            searchQuery: query,
            totalFound: allPlaces.length,
            citiesSearched: cities.length,
            locationType: locationContext.type,
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

    // NON-STREAMING MODE
    const allPlaces: any[] = [];
    const seenCids = new Set<string>();
    const cities = locationContext.cities;
    const maxPerCity = locationContext.type === 'city' ? maxResults : Math.max(100, Math.ceil(maxResults / cities.length));

    for (const city of cities) {
      if (allPlaces.length >= maxResults) break;
      
      for (const variation of searchVariations) {
        if (allPlaces.length >= maxResults) break;
        
        try {
          await fetchAllPagesForQuery(
            SERPER_API_KEY, 
            `${variation} em ${city}`, 
            maxPerCity,
            seenCids,
            allPlaces
          );
          await new Promise(resolve => setTimeout(resolve, 30));
        } catch (error) {
          console.error(`Error in ${city}:`, error);
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
