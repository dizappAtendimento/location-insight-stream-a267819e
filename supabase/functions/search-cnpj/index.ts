import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CNPJData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: string;
  data_situacao_cadastral: string;
  data_inicio_atividade: string;
  cnae_fiscal: number;
  cnae_fiscal_descricao: string;
  cnaes_secundarios: Array<{ codigo: number; descricao: string }>;
  natureza_juridica: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  uf: string;
  municipio: string;
  ddd_telefone_1: string;
  ddd_telefone_2: string;
  email: string;
  capital_social: number;
  porte: string;
  opcao_pelo_simples: boolean;
  opcao_pelo_mei: boolean;
  qsa: Array<{
    nome_socio: string;
    cnpj_cpf_do_socio: string;
    qualificacao_socio: string;
    data_entrada_sociedade: string;
  }>;
}

async function fetchCNPJ(cnpj: string): Promise<CNPJData | null> {
  // Remove caracteres não numéricos
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  if (cleanCNPJ.length !== 14) {
    throw new Error('CNPJ deve ter 14 dígitos');
  }

  try {
    // Usando BrasilAPI - gratuita e sem necessidade de chave
    const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Erro ao consultar CNPJ: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Erro ao buscar CNPJ:', error);
    throw error;
  }
}

async function searchCNPJByName(
  apiKey: string,
  query: string,
  uf: string | null,
  maxResults: number
): Promise<any[]> {
  // Busca empresas pelo nome usando Serper (Google Search)
  const searchQuery = uf 
    ? `"${query}" CNPJ site:cnpj.info OR site:empresaqui.com.br OR site:consultasocio.com ${uf}`
    : `"${query}" CNPJ site:cnpj.info OR site:empresaqui.com.br OR site:consultasocio.com`;
  
  const results: any[] = [];
  const seenCNPJs = new Set<string>();
  
  // Serper API - single request, num limits results
  const numResults = Math.min(maxResults * 2, 100); // Request more to account for duplicates/invalid
  
  try {
    console.log('Serper search query:', searchQuery);
    
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        q: searchQuery,
        gl: 'br',
        hl: 'pt-br',
        num: numResults,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Serper API error:', response.status, errorText);
      throw new Error(`Serper API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Serper response organic count:', data.organic?.length || 0);
    
    const organic = data.organic || [];

    for (const result of organic) {
      // Extrair CNPJ do snippet ou título
      const text = `${result.title || ''} ${result.snippet || ''} ${result.link || ''}`;
      const cnpjMatch = text.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g);
      
      if (cnpjMatch) {
        for (const cnpj of cnpjMatch) {
          const cleanCNPJ = cnpj.replace(/\D/g, '');
          if (cleanCNPJ.length === 14 && !seenCNPJs.has(cleanCNPJ)) {
            seenCNPJs.add(cleanCNPJ);
            
            // Buscar dados completos do CNPJ
            try {
              const cnpjData = await fetchCNPJ(cleanCNPJ);
              if (cnpjData) {
                // Filtrar por UF se especificado
                if (uf && cnpjData.uf !== uf) {
                  continue;
                }
                
                // Incluir apenas empresas ativas
                if (cnpjData.situacao_cadastral === 'ATIVA') {
                  results.push({
                    cnpj: formatCNPJ(cleanCNPJ),
                    razaoSocial: cnpjData.razao_social,
                    nomeFantasia: cnpjData.nome_fantasia || '',
                    situacao: cnpjData.situacao_cadastral,
                    dataAbertura: cnpjData.data_inicio_atividade,
                    atividadePrincipal: cnpjData.cnae_fiscal_descricao,
                    naturezaJuridica: cnpjData.natureza_juridica,
                    endereco: formatEndereco(cnpjData),
                    telefone: formatTelefone(cnpjData.ddd_telefone_1),
                    telefone2: formatTelefone(cnpjData.ddd_telefone_2),
                    email: cnpjData.email?.toLowerCase() || '',
                    capitalSocial: cnpjData.capital_social,
                    porte: cnpjData.porte,
                    simples: cnpjData.opcao_pelo_simples,
                    mei: cnpjData.opcao_pelo_mei,
                    uf: cnpjData.uf,
                    cidade: cnpjData.municipio,
                    socios: cnpjData.qsa?.map(s => s.nome_socio) || [],
                  });
                  
                  console.log(`Found CNPJ: ${cleanCNPJ} - ${cnpjData.razao_social}`);
                  
                  if (results.length >= maxResults) break;
                }
              }
              // Delay para não sobrecarregar a API BrasilAPI
              await new Promise(resolve => setTimeout(resolve, 300));
            } catch (e) {
              console.error(`Erro ao buscar CNPJ ${cleanCNPJ}:`, e);
            }
          }
        }
      }
      
      if (results.length >= maxResults) break;
    }
  } catch (error) {
    console.error('Erro na busca Serper:', error);
    throw error;
  }
  
  return results;
}

function formatCNPJ(cnpj: string): string {
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function formatTelefone(dddTelefone: string): string {
  if (!dddTelefone) return '';
  const clean = dddTelefone.replace(/\D/g, '');
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`;
  }
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`;
  }
  return dddTelefone;
}

function formatEndereco(data: CNPJData): string {
  const parts = [
    data.logradouro,
    data.numero,
    data.complemento,
    data.bairro,
    data.municipio,
    data.uf,
    data.cep ? `CEP ${data.cep}` : '',
  ].filter(Boolean);
  return parts.join(', ');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, cnpj, query, uf, maxResults = 50, userId } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Ação: Buscar CNPJ específico
    if (action === 'fetch-cnpj') {
      if (!cnpj) {
        return new Response(
          JSON.stringify({ error: 'CNPJ é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await fetchCNPJ(cnpj);
      
      if (!data) {
        return new Response(
          JSON.stringify({ error: 'CNPJ não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          empresa: {
            cnpj: formatCNPJ(cnpj.replace(/\D/g, '')),
            razaoSocial: data.razao_social,
            nomeFantasia: data.nome_fantasia || '',
            situacao: data.situacao_cadastral,
            dataAbertura: data.data_inicio_atividade,
            atividadePrincipal: data.cnae_fiscal_descricao,
            naturezaJuridica: data.natureza_juridica,
            endereco: formatEndereco(data),
            telefone: formatTelefone(data.ddd_telefone_1),
            telefone2: formatTelefone(data.ddd_telefone_2),
            email: data.email?.toLowerCase() || '',
            capitalSocial: data.capital_social,
            porte: data.porte,
            simples: data.opcao_pelo_simples,
            mei: data.opcao_pelo_mei,
            uf: data.uf,
            cidade: data.municipio,
            socios: data.qsa?.map(s => s.nome_socio) || [],
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Ação: Buscar empresas por nome/segmento
    if (action === 'search') {
      if (!query) {
        return new Response(
          JSON.stringify({ error: 'Termo de busca é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buscar API key do Serper - primeiro das configurações, depois do env
      let serperApiKey = Deno.env.get('SERPER_API_KEY');
      
      if (!serperApiKey) {
        const { data: configData } = await supabase
          .from('saas_configuracoes')
          .select('valor')
          .eq('chave', 'SERPER_API_KEY')
          .single();
        
        serperApiKey = configData?.valor || null;
      }

      if (!serperApiKey) {
        return new Response(
          JSON.stringify({ error: 'API key não configurada' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const empresas = await searchCNPJByName(
        serperApiKey,
        query,
        uf || null,
        Math.min(maxResults, 100)
      );

      return new Response(
        JSON.stringify({
          success: true,
          total: empresas.length,
          empresas,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
