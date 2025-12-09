import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LoginRequest {
  email: string;
  password: string;
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
    const { email, password } = body;

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
      .select('id, nome, Email, telefone, "Status Ex", senha, avatar_url')
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

    const statusEx = user['Status Ex'];
    console.log(`[Login] Status Ex value for ${email}:`, statusEx);
    
    // Block if Status Ex is null or false (only allow if explicitly true)
    if (statusEx !== true) {
      console.log(`[Login] Account disabled or not activated: ${email}`);
      return new Response(
        JSON.stringify({ error: 'Acesso negado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[Login] Success for: ${email}`);

    // Return user data without password
    return new Response(
      JSON.stringify({
        user: {
          id: user.id,
          nome: user.nome,
          Email: user.Email,
          telefone: user.telefone,
          status: user['Status Ex'],
          avatar_url: user.avatar_url,
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
