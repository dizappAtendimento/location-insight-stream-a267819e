import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoginRequest {
  action?: string;
  email: string;
  password?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: LoginRequest = await req.json();
    const { action, email, password } = body;

    // Password recovery flow
    if (action === 'recover-password') {
      if (!email) {
        return new Response(
          JSON.stringify({ error: 'Email é obrigatório' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`[Recovery] Checking email: ${email}`);

      // Check if user exists
      const { data: user, error: userError } = await supabase
        .from('SAAS_Usuarios')
        .select('id, Email, nome')
        .eq('Email', email)
        .maybeSingle();

      if (userError) {
        console.error('[Recovery] Database error:', userError);
        return new Response(
          JSON.stringify({ error: 'Erro ao verificar email' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!user) {
        console.log(`[Recovery] Email not found: ${email}`);
        return new Response(
          JSON.stringify({ error: 'Email não encontrado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate 6 digit code
      const recoveryCode = Math.floor(100000 + Math.random() * 900000).toString();

      console.log(`[Recovery] Sending code to webhook for: ${email}`);

      // Send to webhook
      try {
        await fetch('https://n8n.apolinario.site/webhook-test/dizapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.Email,
            code: recoveryCode,
            nome: user.nome,
            timestamp: new Date().toISOString(),
          }),
        });
        console.log(`[Recovery] Webhook sent successfully for: ${email}`);
      } catch (webhookError) {
        console.error('[Recovery] Webhook error:', webhookError);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Código enviado para seu email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email e senha são obrigatórios' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Login] Attempting login for: ${email}`);

    // Query user by email using service role (bypasses RLS)
    const { data: user, error } = await supabase
      .from('SAAS_Usuarios')
      .select('id, nome, Email, telefone, status, "Status Ex", senha, avatar_url, banido, dataValidade, dataValidade_extrator, plano, plano_extrator')
      .eq('Email', email)
      .maybeSingle();

    if (error) {
      console.error('[Login] Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao conectar ao servidor' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!user) {
      console.log(`[Login] User not found: ${email}`);
      return new Response(
        JSON.stringify({ error: 'Email não encontrado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (user.senha !== password) {
      console.log(`[Login] Invalid password for: ${email}`);
      return new Response(
        JSON.stringify({ error: 'Senha incorreta' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is banned
    if (user.banido === true) {
      console.log(`[Login] User is banned: ${email}`);
      return new Response(
        JSON.stringify({ error: 'Sua conta foi suspensa. Entre em contato com o suporte.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch plan names if they exist
    let planoNome = null;
    let planoExtratorNome = null;

    if (user.plano) {
      const { data: planData } = await supabase
        .from('SAAS_Planos')
        .select('nome')
        .eq('id', user.plano)
        .maybeSingle();
      planoNome = planData?.nome || null;
    }

    if (user.plano_extrator) {
      const { data: planExtratorData } = await supabase
        .from('SAAS_Planos')
        .select('nome')
        .eq('id', user.plano_extrator)
        .maybeSingle();
      planoExtratorNome = planExtratorData?.nome || null;
    }

    console.log(`[Login] Success for: ${email}`);

    // Return user data without password
    // Allow login regardless of plan status - the frontend will redirect to contratar page if no plan
    return new Response(
      JSON.stringify({
        user: {
          id: user.id,
          nome: user.nome,
          Email: user.Email,
          telefone: user.telefone,
          statusDisparador: user.status === true,
          statusExtrator: user['Status Ex'] === true,
          avatar_url: user.avatar_url,
          dataValidade: user.dataValidade,
          dataValidadeExtrator: user.dataValidade_extrator,
          planoId: user.plano,
          planoExtratorId: user.plano_extrator,
          planoNome,
          planoExtratorNome,
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Login] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro inesperado. Tente novamente.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
