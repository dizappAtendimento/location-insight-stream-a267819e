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

    const { action, userId, userData, planData } = await req.json();

    console.log(`[Admin API] Action: ${action}, UserId: ${userId || 'N/A'}`);

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
        const { data: users, error } = await supabase
          .from('vw_Usuarios_Com_Plano')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[Admin API] Error fetching users:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao buscar usuários' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] Fetched ${users?.length || 0} users`);

        return new Response(
          JSON.stringify({ users }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-plans': {
        const { data: plans, error } = await supabase
          .from('SAAS_Planos')
          .select('*, total_usuarios:SAAS_Usuarios(count)')
          .order('id', { ascending: true });

        if (error) {
          console.error('[Admin API] Error fetching plans:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao buscar planos' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Transform the count
        const transformedPlans = plans?.map(plan => ({
          ...plan,
          total_usuarios: plan.total_usuarios?.[0]?.count || 0
        }));

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

        const newStatus = !currentUser?.status;
        const newStatusEx = !currentUser?.['Status Ex'];

        const { error } = await supabase
          .from('SAAS_Usuarios')
          .update({ status: newStatus, 'Status Ex': newStatusEx })
          .eq('id', userId);

        if (error) {
          console.error('[Admin API] Error toggling user status:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao alterar status do usuário' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] User ${userId} status toggled to ${newStatus}`);

        return new Response(
          JSON.stringify({ success: true, newStatus }),
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
