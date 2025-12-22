import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const EdgeRuntime: { waitUntil(promise: Promise<any>): void };
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query: string;
  location?: string;
  maxResults?: number;
  sessionId?: string;
  userId?: string;
  jobId?: string; // For checking status
}

// Brazilian states with their cities
const BR_STATES: Record<string, string[]> = {
  'go': ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia', 'Águas Lindas de Goiás', 'Valparaíso de Goiás', 'Trindade', 'Formosa', 'Novo Gama', 'Senador Canedo', 'Catalão', 'Itumbiara', 'Jataí', 'Planaltina', 'Caldas Novas', 'Santo Antônio do Descoberto', 'Cidade Ocidental', 'Inhumas', 'Mineiros', 'Quirinópolis', 'Goianésia', 'Jaraguá', 'Morrinhos', 'Porangatu', 'Uruaçu', 'Goiatuba', 'Niquelândia', 'Ceres', 'Santa Helena de Goiás', 'Padre Bernardo', 'Pirenópolis', 'Cristalina', 'Ipameri', 'Pires do Rio', 'Alexânia', 'Posse', 'Hidrolândia', 'Goianira', 'Nerópolis'],
  'goias': ['Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia', 'Águas Lindas de Goiás', 'Valparaíso de Goiás', 'Trindade', 'Formosa', 'Novo Gama', 'Senador Canedo', 'Catalão', 'Itumbiara', 'Jataí', 'Planaltina', 'Caldas Novas', 'Santo Antônio do Descoberto', 'Cidade Ocidental', 'Inhumas', 'Mineiros', 'Quirinópolis', 'Goianésia', 'Jaraguá', 'Morrinhos', 'Porangatu', 'Uruaçu', 'Goiatuba', 'Niquelândia', 'Ceres', 'Santa Helena de Goiás', 'Padre Bernardo', 'Pirenópolis', 'Cristalina', 'Ipameri', 'Pires do Rio', 'Alexânia', 'Posse', 'Hidrolândia', 'Goianira', 'Nerópolis'],
  'sp': ['São Paulo', 'Guarulhos', 'Campinas', 'São Bernardo do Campo', 'Santo André', 'Osasco', 'São José dos Campos', 'Ribeirão Preto', 'Sorocaba', 'Santos', 'Mauá', 'São José do Rio Preto', 'Mogi das Cruzes', 'Diadema', 'Jundiaí', 'Piracicaba', 'Carapicuíba', 'Bauru', 'Itaquaquecetuba', 'São Vicente', 'Franca', 'Praia Grande', 'Guarujá', 'Taubaté', 'Limeira', 'Suzano', 'Taboão da Serra', 'Sumaré', 'Barueri', 'Embu das Artes', 'São Carlos', 'Indaiatuba', 'Cotia', 'Americana', 'Marília', 'Araraquara', 'Jacareí', 'Hortolândia', 'Presidente Prudente', 'Rio Claro'],
  'rj': ['Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Niterói', 'Belford Roxo', 'Campos dos Goytacazes', 'São João de Meriti', 'Petrópolis', 'Volta Redonda', 'Magé', 'Itaboraí', 'Macaé', 'Mesquita', 'Nilópolis', 'Cabo Frio', 'Nova Friburgo', 'Barra Mansa', 'Angra dos Reis', 'Teresópolis', 'Resende', 'Queimados', 'Maricá', 'Rio das Ostras', 'Araruama'],
  'mg': ['Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim', 'Montes Claros', 'Ribeirão das Neves', 'Uberaba', 'Governador Valadares', 'Ipatinga', 'Sete Lagoas', 'Divinópolis', 'Santa Luzia', 'Ibirité', 'Poços de Caldas', 'Patos de Minas', 'Pouso Alegre', 'Teófilo Otoni', 'Barbacena', 'Sabará', 'Varginha', 'Conselheiro Lafaiete', 'Araguari', 'Itabira', 'Passos'],
  'ba': ['Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Itabuna', 'Juazeiro', 'Lauro de Freitas', 'Ilhéus', 'Jequié', 'Teixeira de Freitas', 'Barreiras', 'Alagoinhas', 'Porto Seguro', 'Simões Filho', 'Paulo Afonso', 'Eunápolis', 'Santo Antônio de Jesus', 'Valença', 'Candeias', 'Guanambi'],
  'pr': ['Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel', 'São José dos Pinhais', 'Foz do Iguaçu', 'Colombo', 'Guarapuava', 'Paranaguá', 'Araucária', 'Toledo', 'Apucarana', 'Pinhais', 'Campo Largo', 'Almirante Tamandaré', 'Umuarama', 'Piraquara', 'Cambé', 'Arapongas'],
  'rs': ['Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Canoas', 'Santa Maria', 'Gravataí', 'Viamão', 'Novo Hamburgo', 'São Leopoldo', 'Rio Grande', 'Alvorada', 'Passo Fundo', 'Sapucaia do Sul', 'Uruguaiana', 'Santa Cruz do Sul', 'Cachoeirinha', 'Bagé', 'Bento Gonçalves', 'Erechim', 'Guaíba'],
  'pe': ['Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina', 'Paulista', 'Cabo de Santo Agostinho', 'Camaragibe', 'Garanhuns', 'Vitória de Santo Antão', 'Igarassu', 'São Lourenço da Mata', 'Abreu e Lima', 'Serra Talhada', 'Araripina'],
  'ce': ['Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral', 'Crato', 'Itapipoca', 'Maranguape', 'Iguatu', 'Quixadá', 'Pacatuba', 'Aquiraz', 'Canindé', 'Crateús', 'Pacajus'],
  'pa': ['Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Parauapebas', 'Castanhal', 'Abaetetuba', 'Cametá', 'Marituba', 'Bragança', 'Tucuruí', 'Altamira', 'Itaituba', 'Barcarena', 'Paragominas'],
  'am': ['Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru', 'Coari', 'Tefé', 'Tabatinga', 'Maués', 'Humaitá', 'Iranduba'],
  'sc': ['Joinville', 'Florianópolis', 'Blumenau', 'São José', 'Chapecó', 'Itajaí', 'Criciúma', 'Jaraguá do Sul', 'Palhoça', 'Lages', 'Balneário Camboriú', 'Brusque', 'Tubarão', 'São Bento do Sul', 'Caçador'],
  'ma': ['São Luís', 'Imperatriz', 'São José de Ribamar', 'Timon', 'Caxias', 'Codó', 'Paço do Lumiar', 'Açailândia', 'Bacabal', 'Santa Inês'],
  'pb': ['João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux', 'Sousa', 'Cajazeiras', 'Cabedelo', 'Guarabira', 'Sapé'],
  'mt': ['Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra', 'Cáceres', 'Sorriso', 'Lucas do Rio Verde', 'Primavera do Leste', 'Barra do Garças'],
  'ms': ['Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã', 'Naviraí', 'Nova Andradina', 'Aquidauana', 'Sidrolândia', 'Paranaíba'],
  'pi': ['Teresina', 'Parnaíba', 'Picos', 'Piripiri', 'Floriano', 'Campo Maior', 'Barras', 'União', 'Altos', 'José de Freitas'],
  'rn': ['Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Ceará-Mirim', 'Macaíba', 'Caicó', 'Assu', 'Currais Novos', 'São José de Mipibu'],
  'al': ['Maceió', 'Arapiraca', 'Rio Largo', 'Palmeira dos Índios', 'União dos Palmares', 'Penedo', 'São Miguel dos Campos', 'Santana do Ipanema', 'Delmiro Gouveia', 'Coruripe'],
  'se': ['Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana', 'São Cristóvão', 'Estância', 'Tobias Barreto', 'Itabaianinha', 'Simão Dias', 'Capela'],
  'es': ['Vila Velha', 'Serra', 'Cariacica', 'Vitória', 'Cachoeiro de Itapemirim', 'Linhares', 'São Mateus', 'Colatina', 'Guarapari', 'Aracruz'],
  'ro': ['Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal', 'Rolim de Moura', 'Jaru', 'Guajará-Mirim', 'Ouro Preto do Oeste', 'Pimenta Bueno'],
  'to': ['Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional', 'Paraíso do Tocantins', 'Colinas do Tocantins', 'Guaraí', 'Tocantinópolis', 'Dianópolis', 'Miracema do Tocantins'],
  'ac': ['Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Tarauacá', 'Feijó', 'Brasileia', 'Senador Guiomard', 'Epitaciolândia', 'Xapuri', 'Plácido de Castro'],
  'ap': ['Macapá', 'Santana', 'Laranjal do Jari', 'Oiapoque', 'Mazagão', 'Porto Grande', 'Pedra Branca do Amapari', 'Tartarugalzinho', 'Vitória do Jari', 'Calçoene'],
  'rr': ['Boa Vista', 'Rorainópolis', 'Caracaraí', 'Alto Alegre', 'Mucajaí', 'Cantá', 'Pacaraima', 'Bonfim', 'Normandia', 'São João da Baliza'],
  'df': ['Brasília', 'Ceilândia', 'Taguatinga', 'Samambaia', 'Plano Piloto', 'Águas Claras', 'Recanto das Emas', 'Gama', 'Guará', 'Santa Maria'],
};

const ALL_BR_CITIES = Object.values(BR_STATES).flat();

function generateSearchVariations(query: string): string[] {
  // Only use the exact query - no variations that could return wrong results
  // The user wants exactly what they searched for
  return [query];
}

// Countries with major cities
const COUNTRIES: Record<string, string[]> = {
  'eua': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington DC', 'Boston', 'El Paso', 'Nashville', 'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas', 'Memphis', 'Louisville', 'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Mesa', 'Sacramento', 'Atlanta', 'Miami', 'Orlando', 'Tampa'],
  'usa': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington DC', 'Boston', 'El Paso', 'Nashville', 'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas', 'Memphis', 'Louisville', 'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Mesa', 'Sacramento', 'Atlanta', 'Miami', 'Orlando', 'Tampa'],
  'estados unidos': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego', 'Dallas', 'San Jose', 'Austin', 'Jacksonville', 'Fort Worth', 'Columbus', 'Charlotte', 'San Francisco', 'Indianapolis', 'Seattle', 'Denver', 'Washington DC', 'Boston', 'El Paso', 'Nashville', 'Detroit', 'Oklahoma City', 'Portland', 'Las Vegas', 'Memphis', 'Louisville', 'Baltimore', 'Milwaukee', 'Albuquerque', 'Tucson', 'Fresno', 'Mesa', 'Sacramento', 'Atlanta', 'Miami', 'Orlando', 'Tampa'],
  'portugal': ['Lisboa', 'Porto', 'Vila Nova de Gaia', 'Amadora', 'Braga', 'Funchal', 'Coimbra', 'Setúbal', 'Almada', 'Agualva-Cacém', 'Queluz', 'Aveiro', 'Évora', 'Faro', 'Viseu', 'Leiria', 'Guimarães', 'Barreiro', 'Maia', 'Matosinhos'],
  'argentina': ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'San Miguel de Tucumán', 'La Plata', 'Mar del Plata', 'Salta', 'Santa Fe', 'San Juan', 'Resistencia', 'Santiago del Estero', 'Corrientes', 'Bahía Blanca', 'Posadas', 'San Salvador de Jujuy', 'Paraná', 'Neuquén', 'Formosa', 'San Luis'],
  'mexico': ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'León', 'Juárez', 'Zapopan', 'Mérida', 'San Luis Potosí', 'Aguascalientes', 'Hermosillo', 'Saltillo', 'Mexicali', 'Culiacán', 'Querétaro', 'Morelia', 'Cancún', 'Acapulco', 'Veracruz'],
  'espanha': ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao', 'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón', 'Granada', 'Hospitalet', 'Vitoria', 'La Coruña', 'Elche'],
  'espana': ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Málaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao', 'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón', 'Granada', 'Hospitalet', 'Vitoria', 'La Coruña', 'Elche'],
  'italia': ['Roma', 'Milão', 'Nápoles', 'Turim', 'Palermo', 'Génova', 'Bolonha', 'Florença', 'Bari', 'Catânia', 'Veneza', 'Verona', 'Messina', 'Pádua', 'Trieste', 'Brescia', 'Parma', 'Taranto', 'Modena', 'Reggio Calabria'],
  'alemanha': ['Berlim', 'Hamburgo', 'Munique', 'Colônia', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Leipzig', 'Dortmund', 'Essen', 'Bremen', 'Dresden', 'Hanover', 'Nuremberg', 'Duisburg', 'Bochum', 'Wuppertal', 'Bielefeld', 'Bonn', 'Münster'],
  'franca': ['Paris', 'Marselha', 'Lyon', 'Toulouse', 'Nice', 'Nantes', 'Estrasburgo', 'Montpellier', 'Bordeaux', 'Lille', 'Rennes', 'Reims', 'Le Havre', 'Saint-Étienne', 'Toulon', 'Grenoble', 'Dijon', 'Angers', 'Nîmes', 'Villeurbanne'],
  'reino unido': ['Londres', 'Birmingham', 'Leeds', 'Glasgow', 'Sheffield', 'Bradford', 'Manchester', 'Edinburgh', 'Liverpool', 'Bristol', 'Cardiff', 'Belfast', 'Leicester', 'Wakefield', 'Coventry', 'Nottingham', 'Newcastle', 'Sunderland', 'Brighton', 'Plymouth'],
  'uk': ['London', 'Birmingham', 'Leeds', 'Glasgow', 'Sheffield', 'Bradford', 'Manchester', 'Edinburgh', 'Liverpool', 'Bristol', 'Cardiff', 'Belfast', 'Leicester', 'Wakefield', 'Coventry', 'Nottingham', 'Newcastle', 'Sunderland', 'Brighton', 'Plymouth'],
  'canada': ['Toronto', 'Montreal', 'Vancouver', 'Calgary', 'Edmonton', 'Ottawa', 'Winnipeg', 'Quebec City', 'Hamilton', 'Kitchener', 'London', 'Victoria', 'Halifax', 'Oshawa', 'Windsor', 'Saskatoon', 'Regina', 'St. Johns', 'Barrie', 'Kelowna'],
  'australia': ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide', 'Gold Coast', 'Canberra', 'Newcastle', 'Wollongong', 'Sunshine Coast', 'Hobart', 'Geelong', 'Townsville', 'Cairns', 'Darwin', 'Toowoomba', 'Ballarat', 'Bendigo', 'Launceston', 'Mackay'],
  'japao': ['Tóquio', 'Yokohama', 'Osaka', 'Nagoya', 'Sapporo', 'Kobe', 'Fukuoka', 'Kawasaki', 'Kyoto', 'Saitama', 'Hiroshima', 'Sendai', 'Chiba', 'Kitakyushu', 'Sakai', 'Niigata', 'Hamamatsu', 'Shizuoka', 'Okayama', 'Kumamoto'],
  'china': ['Shanghai', 'Beijing', 'Guangzhou', 'Shenzhen', 'Tianjin', 'Wuhan', 'Chengdu', 'Chongqing', 'Nanjing', 'Xian', 'Hangzhou', 'Shenyang', 'Harbin', 'Suzhou', 'Qingdao', 'Dalian', 'Jinan', 'Zhengzhou', 'Changsha', 'Dongguan'],
  'india': ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Ahmedabad', 'Pune', 'Surat', 'Jaipur', 'Lucknow', 'Kanpur', 'Nagpur', 'Patna', 'Indore', 'Thane', 'Bhopal', 'Visakhapatnam', 'Vadodara', 'Firozabad'],
};

// State name mappings for better detection
const STATE_NAME_MAPPINGS: Record<string, string> = {
  'goiás': 'go', 'goias': 'go',
  'são paulo': 'sp', 'sao paulo': 'sp',
  'rio de janeiro': 'rj',
  'minas gerais': 'mg',
  'bahia': 'ba',
  'paraná': 'pr', 'parana': 'pr',
  'rio grande do sul': 'rs',
  'santa catarina': 'sc',
  'pernambuco': 'pe',
  'ceará': 'ce', 'ceara': 'ce',
  'pará': 'pa', 'para': 'pa',
  'amazonas': 'am',
  'maranhão': 'ma', 'maranhao': 'ma',
  'paraíba': 'pb', 'paraiba': 'pb',
  'mato grosso': 'mt',
  'mato grosso do sul': 'ms',
  'piauí': 'pi', 'piaui': 'pi',
  'rio grande do norte': 'rn',
  'alagoas': 'al',
  'sergipe': 'se',
  'espírito santo': 'es', 'espirito santo': 'es',
  'rondônia': 'ro', 'rondonia': 'ro',
  'tocantins': 'to',
  'acre': 'ac',
  'amapá': 'ap', 'amapa': 'ap',
  'roraima': 'rr',
  'distrito federal': 'df', 'brasília': 'df', 'brasilia': 'df',
};

function detectLocationContext(location: string): { type: 'city' | 'state' | 'country', cities: string[], locationName: string } {
  const normalized = location.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const originalNormalized = location.toLowerCase().trim();
  
  // Check if it's a country
  for (const [countryKey, cities] of Object.entries(COUNTRIES)) {
    const countryNorm = countryKey.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized === countryNorm || normalized.includes(countryNorm)) {
      console.log(`Detected country: ${countryKey} with ${cities.length} cities`);
      return { type: 'country', cities: cities.map(c => `${c}, ${countryKey}`), locationName: countryKey };
    }
  }
  
  // Check if it's Brazil (special handling)
  if (normalized.includes('brasil') || normalized.includes('brazil') || normalized === 'br') {
    console.log('Detected country: Brasil with all cities');
    return { type: 'country', cities: ALL_BR_CITIES.map(c => `${c}, Brasil`), locationName: 'Brasil' };
  }
  
  // Check if it's a Brazilian state by full name
  for (const [stateName, stateCode] of Object.entries(STATE_NAME_MAPPINGS)) {
    const stateNorm = stateName.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized === stateNorm || normalized.includes(stateNorm)) {
      const cities = BR_STATES[stateCode] || [];
      console.log(`Detected state by name: ${stateName} (${stateCode}) with ${cities.length} cities`);
      return { type: 'state', cities: cities.map(c => `${c}, ${stateCode.toUpperCase()}`), locationName: stateCode.toUpperCase() };
    }
  }
  
  // Check if it's a Brazilian state by code
  for (const [stateCode, cities] of Object.entries(BR_STATES)) {
    if (normalized === stateCode || normalized === stateCode.toLowerCase()) {
      console.log(`Detected state by code: ${stateCode} with ${cities.length} cities`);
      return { type: 'state', cities: cities.map(c => `${c}, ${stateCode.toUpperCase()}`), locationName: stateCode.toUpperCase() };
    }
  }
  
  // Check if it matches any city directly (single city search)
  const allCitiesLower = ALL_BR_CITIES.map(c => c.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  const cityIndex = allCitiesLower.findIndex(c => c === normalized || normalized.includes(c) || c.includes(normalized));
  
  if (cityIndex !== -1) {
    console.log(`Detected city: ${ALL_BR_CITIES[cityIndex]}`);
    return { type: 'city', cities: [location], locationName: location };
  }
  
  // Default: treat as a specific location (city)
  console.log(`Treating as specific location: ${location}`);
  return { type: 'city', cities: [location], locationName: location };
}

// Extract email from text snippets
function extractEmail(text: string | undefined | null): string | null {
  if (!text) return null;
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
  const matches = text.match(emailRegex);
  return matches ? matches[0] : null;
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
  seenCids: Set<string>,
  allPlaces: any[]
): Promise<number> {
  let page = 1;
  let emptyPages = 0;
  let foundCount = 0;

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
          
          // Try to extract email from various fields
          const email = extractEmail(place.snippet) || 
                        extractEmail(place.description) || 
                        extractEmail(place.website) ||
                        null;
          
          allPlaces.push({
            name: place.title,
            address: place.address,
            phone: place.phoneNumber || null,
            email: email,
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

async function runBackgroundSearch(
  supabase: any,
  jobId: string,
  query: string,
  location: string | undefined,
  maxResults: number,
  apiKey: string
) {
  console.log(`[Job ${jobId}] Starting background search for "${query}" in "${location}"`);
  
  try {
    // Update status to running
    await supabase.from('search_jobs').update({ 
      status: 'running',
      progress: { currentCity: 'Iniciando...', percentage: 0, currentResults: 0, targetResults: maxResults }
    }).eq('id', jobId);

    const searchVariations = generateSearchVariations(query);
    const locationContext = location ? detectLocationContext(location) : { type: 'country' as const, cities: ALL_BR_CITIES.map(c => `${c}, Brasil`) };
    
    const cities = locationContext.cities;
    const allPlaces: any[] = [];
    const seenCids = new Set<string>();
    const maxPerCity = locationContext.type === 'city' ? maxResults : Math.max(100, Math.ceil(maxResults / cities.length));

    // Helper to update progress frequently
    const updateProgress = async (city: string, cityIndex: number) => {
      const percentage = Math.min(99, Math.round((allPlaces.length / maxResults) * 100));
      await supabase.from('search_jobs').update({ 
        progress: { 
          currentCity: city, 
          cityIndex: cityIndex, 
          totalCities: cities.length,
          currentResults: allPlaces.length,
          targetResults: maxResults,
          percentage 
        },
        total_found: allPlaces.length
      }).eq('id', jobId);
    };

    for (let i = 0; i < cities.length; i++) {
      if (allPlaces.length >= maxResults) break;
      
      const city = cities[i];
      
      // Update progress at start of each city
      await updateProgress(city, i + 1);

      let cityFoundCount = 0;
      
      for (const variation of searchVariations) {
        if (allPlaces.length >= maxResults || cityFoundCount >= maxPerCity) break;
        
        try {
          // Fetch with inline progress updates
          let page = 1;
          let emptyPages = 0;
          const maxResultsPerQuery = maxPerCity - cityFoundCount;

          while (cityFoundCount < maxResultsPerQuery && page <= 10 && emptyPages < 2) {
            const response = await fetch('https://google.serper.dev/places', {
              method: 'POST',
              headers: {
                'X-API-KEY': apiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ q: `${variation} em ${city}`, num: 100, page }),
            });

            if (!response.ok) break;
            const data = await response.json();
            
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
                cityFoundCount++;
                
                // Update progress every 10 results
                if (allPlaces.length % 10 === 0) {
                  await updateProgress(city, i + 1);
                }
              }
            }

            page++;
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
          await new Promise(resolve => setTimeout(resolve, 30));
        } catch (error) {
          console.error(`[Job ${jobId}] Error in ${city}:`, error);
        }
      }

      console.log(`[Job ${jobId}] City ${i + 1}/${cities.length}: ${city} - Found ${cityFoundCount}, Total: ${allPlaces.length}`);
    }

    // Add positions
    allPlaces.forEach((place, index) => {
      place.position = index + 1;
    });

    const finalPlaces = allPlaces.slice(0, maxResults);

    // Update job as completed
    await supabase.from('search_jobs').update({ 
      status: 'completed',
      results: finalPlaces,
      total_found: finalPlaces.length,
      progress: { percentage: 100, currentCity: 'Concluído' },
      completed_at: new Date().toISOString()
    }).eq('id', jobId);

    console.log(`[Job ${jobId}] Completed with ${finalPlaces.length} results`);

  } catch (error) {
    console.error(`[Job ${jobId}] Fatal error:`, error);
    await supabase.from('search_jobs').update({ 
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      completed_at: new Date().toISOString()
    }).eq('id', jobId);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SERPER_API_KEY = Deno.env.get('SERPER_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SERPER_API_KEY) throw new Error('SERPER_API_KEY not configured');
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase not configured');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: SearchRequest = await req.json();
    const { query, location, maxResults = 1000, sessionId, userId, jobId } = body;

    // If jobId is provided, return the job status
    if (jobId) {
      const { data: job, error } = await supabase
        .from('search_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();

      if (error) throw error;
      if (!job) {
        return new Response(JSON.stringify({ error: 'Job not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(job), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create a new search job
    if (!query) throw new Error('Query is required');
    if (!sessionId) throw new Error('Session ID is required');
    if (!userId) throw new Error('User ID is required');

    // ==== VALIDATE EXTRACTION LIMIT ====
    // Get user's plan and extraction limit
    const { data: userData, error: userError } = await supabase
      .from('SAAS_Usuarios')
      .select('plano')
      .eq('id', userId)
      .single();

    if (userError || !userData?.plano) {
      return new Response(
        JSON.stringify({ error: 'Usuário não possui plano ativo. Entre em contato com o suporte.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: planInfo } = await supabase
      .from('SAAS_Planos')
      .select('qntPlaces')
      .eq('id', userData.plano)
      .single();

    const limitePlaces = planInfo?.qntPlaces || 0;
    const isUnlimited = limitePlaces === 0 || limitePlaces > 999999999;

    if (!isUnlimited) {
      // Count Places extractions this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const { count: extracoesUsadas } = await supabase
        .from('search_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('type', 'places')
        .gte('created_at', monthStart.toISOString());

      if ((extracoesUsadas || 0) >= limitePlaces) {
        return new Response(
          JSON.stringify({ 
            error: `Limite de consultas Google Places atingido (${extracoesUsadas}/${limitePlaces} este mês). Faça upgrade do seu plano para continuar.`,
            limitReached: true,
            used: extracoesUsadas,
            limit: limitePlaces
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    // ==== END VALIDATION ====

    // Create job record
    const { data: newJob, error: insertError } = await supabase
      .from('search_jobs')
      .insert({
        session_id: sessionId,
        user_id: userId,
        query,
        location: location || null,
        max_results: maxResults,
        status: 'pending',
        type: 'places',
        progress: { currentCity: 'Na fila...', percentage: 0 },
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`Created job ${newJob.id} for query "${query}"`);

    // Start background search using waitUntil
    EdgeRuntime.waitUntil(
      runBackgroundSearch(supabase, newJob.id, query, location, maxResults, SERPER_API_KEY)
    );

    // Return immediately with job ID
    return new Response(JSON.stringify({ 
      jobId: newJob.id,
      status: 'pending',
      message: 'Busca iniciada em background. Você pode sair da página.' 
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
