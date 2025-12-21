import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    console.log('Webhook recebido:', JSON.stringify(body, null, 2));

    // Identificar o tipo de evento (Evolution API / Z-API / outros)
    let telefone: string | null = null;
    let nome: string | null = null;
    let mensagem: string | null = null;
    let instanceName: string | null = null;

    // Formato Evolution API
    if (body.data?.key?.remoteJid) {
      telefone = body.data.key.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
      nome = body.data.pushName || null;
      mensagem = body.data.message?.conversation || 
                 body.data.message?.extendedTextMessage?.text ||
                 body.data.message?.imageMessage?.caption ||
                 body.data.message?.videoMessage?.caption ||
                 'Mensagem recebida';
      instanceName = body.instance || null;
    }
    // Formato alternativo (alguns webhooks)
    else if (body.message && body.from) {
      telefone = body.from.replace('@s.whatsapp.net', '').replace('@g.us', '');
      nome = body.pushName || body.senderName || null;
      mensagem = body.message?.text || body.message?.body || body.message || 'Mensagem recebida';
      instanceName = body.instanceName || body.instance || null;
    }
    // Formato simples
    else if (body.telefone || body.phone) {
      telefone = body.telefone || body.phone;
      nome = body.nome || body.name || null;
      mensagem = body.mensagem || body.message || 'Mensagem recebida';
      instanceName = body.instanceName || body.instance || null;
    }

    if (!telefone) {
      console.log('Webhook sem telefone válido, ignorando');
      return new Response(
        JSON.stringify({ success: true, message: 'Evento ignorado - sem telefone' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Limpar telefone
    telefone = telefone.replace(/\D/g, '');
    console.log(`Lead recebido - Telefone: ${telefone}, Nome: ${nome}, Mensagem: ${mensagem?.slice(0, 50)}`);

    // Buscar a conexão pelo instanceName para identificar o usuário
    let userId: string | null = null;

    if (instanceName) {
      // Buscar por match exato ou parcial do instanceName
      const { data: conexao } = await supabase
        .from('SAAS_Conexões')
        .select('idUsuario, instanceName, crmAtivo')
        .ilike('instanceName', `${instanceName}%`)
        .eq('crmAtivo', true)
        .maybeSingle();

      if (conexao?.idUsuario) {
        userId = conexao.idUsuario;
        console.log(`Usuário identificado pela instância ${instanceName}: ${userId}`);
      }
    }

    // Se não encontrou por instância, buscar por conexão com CRM ativo que tenha o mesmo telefone do sender
    if (!userId) {
      // Extrair sender do webhook
      const sender = body.sender?.replace('@s.whatsapp.net', '');
      console.log(`Tentando buscar por sender: ${sender}`);
      
      if (sender) {
        const { data: conexao } = await supabase
          .from('SAAS_Conexões')
          .select('idUsuario, Telefone')
          .eq('Telefone', sender)
          .eq('crmAtivo', true)
          .maybeSingle();

        if (conexao?.idUsuario) {
          userId = conexao.idUsuario;
          console.log(`Usuário identificado pelo telefone do sender ${sender}: ${userId}`);
        }
      }
    }

    // Última tentativa: buscar qualquer conexão com CRM ativo
    if (!userId) {
      const { data: conexoes } = await supabase
        .from('SAAS_Conexões')
        .select('idUsuario, Telefone, instanceName')
        .eq('crmAtivo', true)
        .not('idUsuario', 'is', null)
        .limit(10);

      console.log(`Conexões com CRM ativo: ${JSON.stringify(conexoes)}`);
      
      if (conexoes && conexoes.length > 0) {
        userId = conexoes[0].idUsuario;
        console.log(`Usuário identificado pela primeira conexão com CRM ativo: ${userId}`);
      }
    }

    if (!userId) {
      console.log('Não foi possível identificar o usuário do webhook');
      return new Response(
        JSON.stringify({ success: true, message: 'Usuário não identificado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar a primeira coluna do CRM do usuário
    const { data: colunas, error: colunasError } = await supabase
      .from('SAAS_CRM_Colunas')
      .select('id')
      .eq('idUsuario', userId)
      .order('ordem', { ascending: true })
      .limit(1);

    if (colunasError) {
      console.error('Erro ao buscar colunas:', colunasError);
      throw colunasError;
    }

    let colunaId: number;

    // Se não houver colunas, criar as padrão
    if (!colunas || colunas.length === 0) {
      console.log('Criando colunas padrão para o usuário');
      const defaultColumns = [
        { nome: 'Novos', cor: 'bg-blue-500', ordem: 0, idUsuario: userId },
        { nome: 'Em Contato', cor: 'bg-amber-500', ordem: 1, idUsuario: userId },
        { nome: 'Negociação', cor: 'bg-purple-500', ordem: 2, idUsuario: userId },
        { nome: 'Fechado', cor: 'bg-green-500', ordem: 3, idUsuario: userId },
      ];

      const { data: newColunas, error: insertError } = await supabase
        .from('SAAS_CRM_Colunas')
        .insert(defaultColumns)
        .select('id')
        .order('ordem', { ascending: true })
        .limit(1);

      if (insertError) throw insertError;
      colunaId = newColunas![0].id;
    } else {
      colunaId = colunas[0].id;
    }

    // Verificar se já existe lead com este telefone
    const { data: existingLead } = await supabase
      .from('SAAS_CRM_Leads')
      .select('id, mensagem')
      .eq('idUsuario', userId)
      .eq('telefone', telefone)
      .maybeSingle();

    if (existingLead) {
      // Atualizar mensagem do lead existente
      console.log(`Atualizando lead existente: ${existingLead.id}`);
      const novaMensagem = mensagem ? 
        `${existingLead.mensagem ? existingLead.mensagem + '\n---\n' : ''}${mensagem}` : 
        existingLead.mensagem;

      await supabase
        .from('SAAS_CRM_Leads')
        .update({ 
          mensagem: novaMensagem?.slice(-1000), // Limitar tamanho
          nome: nome || existingLead.id // Atualizar nome se veio novo
        })
        .eq('id', existingLead.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Lead atualizado',
          leadId: existingLead.id 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Criar novo lead na primeira coluna
    console.log(`Criando novo lead na coluna ${colunaId}`);
    const { data: newLead, error: leadError } = await supabase
      .from('SAAS_CRM_Leads')
      .insert({
        idUsuario: userId,
        idColuna: colunaId,
        nome: nome || `Lead ${telefone.slice(-4)}`,
        telefone: telefone,
        mensagem: mensagem?.slice(0, 1000) || null,
        valor: 0,
      })
      .select('id')
      .single();

    if (leadError) {
      console.error('Erro ao criar lead:', leadError);
      throw leadError;
    }

    console.log(`Lead criado com sucesso: ${newLead.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Lead criado',
        leadId: newLead.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro no webhook CRM:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
