import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, userId, userData, planData, statusType } = await req.json();

    console.log(`[Admin API] Action: ${action}, UserId: ${userId || 'N/A'}, StatusType: ${statusType || 'N/A'}`);

    // Check if the requesting user is admin
    const checkAdmin = async (requestingUserId: string) => {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', requestingUserId)
        .eq('role', 'admin')
        .single();
      
      return !!roleData;
    };

    switch (action) {
      case 'check-admin': {
        const isAdmin = await checkAdmin(userId);
        return new Response(
          JSON.stringify({ isAdmin }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-stats': {
        // Get total users
        const { count: totalUsers } = await supabase
          .from('SAAS_Usuarios')
          .select('*', { count: 'exact', head: true });

        // Get active users
        const { count: activeUsers } = await supabase
          .from('SAAS_Usuarios')
          .select('*', { count: 'exact', head: true })
          .eq('status', true);

        // Get total plans
        const { count: totalPlans } = await supabase
          .from('SAAS_Planos')
          .select('*', { count: 'exact', head: true });

        // Get total disparos this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { count: disparosThisMonth } = await supabase
          .from('SAAS_Disparos')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfMonth.toISOString());

        // Get total connections
        const { count: totalConnections } = await supabase
          .from('SAAS_Conexões')
          .select('*', { count: 'exact', head: true });

        // Get total lists
        const { count: totalLists } = await supabase
          .from('SAAS_Listas')
          .select('*', { count: 'exact', head: true });

        // Get total contacts
        const { count: totalContacts } = await supabase
          .from('SAAS_Contatos')
          .select('*', { count: 'exact', head: true });

        console.log(`[Admin API] Stats fetched successfully`);

        return new Response(
          JSON.stringify({
            totalUsers: totalUsers || 0,
            activeUsers: activeUsers || 0,
            totalPlans: totalPlans || 0,
            disparosThisMonth: disparosThisMonth || 0,
            totalConnections: totalConnections || 0,
            totalLists: totalLists || 0,
            totalContacts: totalContacts || 0,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-users': {
        // Get users directly from SAAS_Usuarios with joins
        const { data: users, error } = await supabase
          .from('SAAS_Usuarios')
          .select(`
            id, nome, Email, telefone, status, "Status Ex", dataValidade, "dataValidade_extrator", 
            plano, plano_extrator, created_at
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[Admin API] Error fetching users:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao buscar usuários' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get all plans for mapping
        const { data: plans } = await supabase
          .from('SAAS_Planos')
          .select('id, nome, tipo');

        // Get usage stats from the view
        const { data: usageStats } = await supabase
          .from('vw_Usuarios_Com_Plano')
          .select('id, total_conexoes, total_contatos, total_disparos, total_listas');

        // Map users with plan info and usage
        const usersWithDetails = users?.map(user => {
          const planDisparador = plans?.find(p => p.id === user.plano);
          const planExtrator = plans?.find(p => p.id === user.plano_extrator);
          const usage = usageStats?.find(u => u.id === user.id);
          
          return {
            ...user,
            status_ex: user['Status Ex'],
            plano_id: user.plano,
            plano_nome: planDisparador?.nome || null,
            plano_extrator_id: user.plano_extrator,
            plano_extrator_nome: planExtrator?.nome || null,
            total_conexoes: usage?.total_conexoes || 0,
            total_contatos: usage?.total_contatos || 0,
            total_disparos: usage?.total_disparos || 0,
            total_listas: usage?.total_listas || 0,
          };
        });

        console.log(`[Admin API] Fetched ${users?.length || 0} users`);

        return new Response(
          JSON.stringify({ users: usersWithDetails }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-plans': {
        // Get plans without embedded count (due to multiple FK relationships)
        const { data: plans, error } = await supabase
          .from('SAAS_Planos')
          .select('*')
          .order('id', { ascending: true });

        if (error) {
          console.error('[Admin API] Error fetching plans:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao buscar planos' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get user counts per plan separately
        const { data: userCounts } = await supabase
          .from('SAAS_Usuarios')
          .select('plano, plano_extrator');

        // Count users per plan (either as disparador or extrator)
        const transformedPlans = plans?.map(plan => {
          const countDisparador = userCounts?.filter(u => u.plano === plan.id).length || 0;
          const countExtrator = userCounts?.filter(u => u.plano_extrator === plan.id).length || 0;
          return {
            ...plan,
            total_usuarios: countDisparador + countExtrator
          };
        });

        console.log(`[Admin API] Fetched ${plans?.length || 0} plans`);

        return new Response(
          JSON.stringify({ plans: transformedPlans }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-user': {
        const { error } = await supabase
          .from('SAAS_Usuarios')
          .update(userData)
          .eq('id', userId);

        if (error) {
          console.error('[Admin API] Error updating user:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao atualizar usuário' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] User ${userId} updated successfully`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'toggle-user-status': {
        // First get current status
        const { data: currentUser } = await supabase
          .from('SAAS_Usuarios')
          .select('status, "Status Ex"')
          .eq('id', userId)
          .single();

        let updateData = {};
        let newStatus: boolean;

        if (statusType === 'extrator') {
          // Toggle Status Ex for Extrator
          newStatus = !currentUser?.['Status Ex'];
          updateData = { 'Status Ex': newStatus };
        } else {
          // Toggle status for Disparador
          newStatus = !currentUser?.status;
          updateData = { status: newStatus };
        }

        const { error } = await supabase
          .from('SAAS_Usuarios')
          .update(updateData)
          .eq('id', userId);

        if (error) {
          console.error('[Admin API] Error toggling user status:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao alterar status do usuário' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] User ${userId} ${statusType === 'extrator' ? 'Status Ex' : 'status'} toggled to ${newStatus}`);

        return new Response(
          JSON.stringify({ success: true, newStatus }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create-user': {
        const { error } = await supabase
          .from('SAAS_Usuarios')
          .insert({
            nome: userData.nome,
            Email: userData.Email,
            telefone: userData.telefone,
            senha: userData.senha,
            dataValidade: userData.dataValidade || null,
            plano: userData.plano || null,
            plano_extrator: userData.plano_extrator || null,
            'dataValidade_extrator': userData['dataValidade_extrator'] || null,
            status: userData.status ?? false,
            'Status Ex': userData['Status Ex'] ?? false,
          });

        if (error) {
          console.error('[Admin API] Error creating user:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao criar usuário' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] User created successfully`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create-plan': {
        const { error } = await supabase
          .from('SAAS_Planos')
          .insert(planData);

        if (error) {
          console.error('[Admin API] Error creating plan:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao criar plano' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] Plan created successfully`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-plan': {
        const { planId, ...updateData } = planData;
        const { error } = await supabase
          .from('SAAS_Planos')
          .update(updateData)
          .eq('id', planId);

        if (error) {
          console.error('[Admin API] Error updating plan:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao atualizar plano' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] Plan ${planId} updated successfully`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-plan': {
        const { planId } = planData;
        const { error } = await supabase
          .from('SAAS_Planos')
          .delete()
          .eq('id', planId);

        if (error) {
          console.error('[Admin API] Error deleting plan:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao excluir plano' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] Plan ${planId} deleted successfully`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Ação inválida' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('[Admin API] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
