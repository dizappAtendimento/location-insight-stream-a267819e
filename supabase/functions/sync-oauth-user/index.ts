import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create service role client to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, email, nome, avatar_url } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Syncing OAuth user:', { userId, email, nome });

    // Check if user already exists
    const { data: existingUser, error: selectError } = await supabase
      .from('SAAS_Usuarios')
      .select('*')
      .eq('id', userId)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.error('Error checking user:', selectError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar usuário', details: selectError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingUser) {
      console.log('User already exists:', existingUser.id);
      
      // Fetch plan info
      let planoNome = null;
      let planoExtratorNome = null;
      
      if (existingUser.plano) {
        const { data: planoData } = await supabase
          .from('SAAS_Planos')
          .select('nome')
          .eq('id', existingUser.plano)
          .single();
        planoNome = planoData?.nome || null;
      }
      
      if (existingUser.plano_extrator) {
        const { data: planoExtratorData } = await supabase
          .from('SAAS_Planos')
          .select('nome')
          .eq('id', existingUser.plano_extrator)
          .single();
        planoExtratorNome = planoExtratorData?.nome || null;
      }

      return new Response(
        JSON.stringify({ 
          user: {
            id: existingUser.id,
            nome: existingUser.nome,
            Email: existingUser.Email,
            telefone: existingUser.telefone,
            statusDisparador: existingUser.status || false,
            statusExtrator: existingUser['Status Ex'] || false,
            avatar_url: existingUser.avatar_url,
            dataValidade: existingUser.dataValidade,
            dataValidadeExtrator: existingUser.dataValidade_extrator,
            planoId: existingUser.plano,
            planoExtratorId: existingUser.plano_extrator,
            planoNome,
            planoExtratorNome,
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Trial plan ID
    const { data: trialPlan } = await supabase
      .from('SAAS_Planos')
      .select('id, nome')
      .eq('nome', 'Trial')
      .single();

    const trialPlanId = trialPlan?.id || null;
    const trialPlanNome = trialPlan?.nome || 'Trial';

    // Calculate validity date (30 days from now)
    const dataValidade = new Date();
    dataValidade.setDate(dataValidade.getDate() + 30);
    const dataValidadeStr = dataValidade.toISOString().split('T')[0];

    // Create new user
    const { data: newUser, error: insertError } = await supabase
      .from('SAAS_Usuarios')
      .insert({
        id: userId,
        Email: email,
        nome: nome || email?.split('@')[0] || 'Usuário',
        avatar_url: avatar_url,
        status: true,
        'Status Ex': true,
        plano: trialPlanId,
        plano_extrator: trialPlanId,
        dataValidade: dataValidadeStr,
        dataValidade_extrator: dataValidadeStr,
        banido: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating user:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar usuário', details: insertError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('New user created:', newUser.id);

    return new Response(
      JSON.stringify({ 
        user: {
          id: newUser.id,
          nome: newUser.nome,
          Email: newUser.Email,
          telefone: newUser.telefone,
          statusDisparador: newUser.status || false,
          statusExtrator: newUser['Status Ex'] || false,
          avatar_url: newUser.avatar_url,
          dataValidade: newUser.dataValidade,
          dataValidadeExtrator: newUser.dataValidade_extrator,
          planoId: newUser.plano,
          planoExtratorId: newUser.plano_extrator,
          planoNome: trialPlanNome,
          planoExtratorNome: trialPlanNome,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro inesperado', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
