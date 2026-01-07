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

    const body = await req.json();
    const { action, userId, userData, planData, statusType, currentPassword, newPassword, startDate, endDate } = body;

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

      case 'check-admin-self': {
        // Check admin based on email from SAAS_Usuarios login
        const { email } = body;
        
        if (!email) {
          return new Response(
            JSON.stringify({ isAdmin: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Find user by email
        const { data: userToCheck } = await supabase
          .from('SAAS_Usuarios')
          .select('id')
          .eq('Email', email)
          .single();

        if (!userToCheck) {
          return new Response(
            JSON.stringify({ isAdmin: false }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if admin
        const isAdminSelf = await checkAdmin(userToCheck.id);
        return new Response(
          JSON.stringify({ isAdmin: isAdminSelf }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-stats': {
        const { startDate, endDate } = body;
        
        // Get total users
        const { count: totalUsers } = await supabase
          .from('SAAS_Usuarios')
          .select('*', { count: 'exact', head: true });

        // Get active users
        const { count: activeUsers } = await supabase
          .from('SAAS_Usuarios')
          .select('*', { count: 'exact', head: true })
          .eq('status', true);

        // Get inactive users
        const { count: inactiveUsers } = await supabase
          .from('SAAS_Usuarios')
          .select('*', { count: 'exact', head: true })
          .eq('status', false);

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

        // Get users with paid plans
        const { data: usersData } = await supabase
          .from('SAAS_Usuarios')
          .select('id, plano, dataValidade, status');

        const { data: plansData } = await supabase
          .from('SAAS_Planos')
          .select('id, nome, preco');

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const in7Days = new Date(today);
        in7Days.setDate(in7Days.getDate() + 7);
        const in30Days = new Date(today);
        in30Days.setDate(in30Days.getDate() + 30);

        // Calculate users with paid plans (preco > 0)
        const paidPlanIds = plansData?.filter(p => p.preco && p.preco > 0).map(p => p.id) || [];
        const paidUsers = usersData?.filter(u => u.plano && paidPlanIds.includes(u.plano) && u.status) || [];
        
        // Calculate total monthly revenue
        let monthlyRevenue = 0;
        paidUsers.forEach(user => {
          const plan = plansData?.find(p => p.id === user.plano);
          if (plan?.preco) {
            monthlyRevenue += plan.preco;
          }
        });

        // Expired users
        const expiredUsers = usersData?.filter(u => {
          if (!u.dataValidade) return false;
          const expDate = new Date(u.dataValidade);
          return expDate < today;
        }) || [];

        // Expiring in 7 days
        const expiringIn7Days = usersData?.filter(u => {
          if (!u.dataValidade) return false;
          const expDate = new Date(u.dataValidade);
          return expDate >= today && expDate <= in7Days;
        }) || [];

        // Expiring in 30 days
        const expiringIn30Days = usersData?.filter(u => {
          if (!u.dataValidade) return false;
          const expDate = new Date(u.dataValidade);
          return expDate >= today && expDate <= in30Days;
        }) || [];

        // Revenue today from payments
        const { data: paymentsToday } = await supabase
          .from('saas_pagamentos')
          .select('valor')
          .eq('status', 'paid')
          .gte('pago_em', today.toISOString())
          .lt('pago_em', tomorrow.toISOString());

        const revenueToday = paymentsToday?.reduce((sum, p) => sum + (p.valor || 0), 0) || 0;
        const renewedToday = paymentsToday?.length || 0;

        // Revenue last month
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59);
        
        const { data: paymentsLastMonth } = await supabase
          .from('saas_pagamentos')
          .select('valor')
          .eq('status', 'paid')
          .gte('pago_em', lastMonthStart.toISOString())
          .lte('pago_em', lastMonthEnd.toISOString());

        const revenueLastMonth = paymentsLastMonth?.reduce((sum, p) => sum + (p.valor || 0), 0) || 0;

        // Revenue for selected period
        let revenuePeriod = 0;
        let renewedThisPeriod = 0;
        if (startDate && endDate) {
          const { data: paymentsPeriod } = await supabase
            .from('saas_pagamentos')
            .select('valor')
            .eq('status', 'paid')
            .gte('pago_em', startDate)
            .lte('pago_em', endDate);

          revenuePeriod = paymentsPeriod?.reduce((sum, p) => sum + (p.valor || 0), 0) || 0;
          renewedThisPeriod = paymentsPeriod?.length || 0;
        }

        console.log(`[Admin API] Stats fetched successfully`);

        return new Response(
          JSON.stringify({
            totalUsers: totalUsers || 0,
            activeUsers: activeUsers || 0,
            inactiveUsers: inactiveUsers || 0,
            totalPlans: totalPlans || 0,
            disparosThisMonth: disparosThisMonth || 0,
            totalConnections: totalConnections || 0,
            totalLists: totalLists || 0,
            totalContacts: totalContacts || 0,
            paidUsers: paidUsers.length,
            monthlyRevenue: monthlyRevenue,
            expiredUsers: expiredUsers.length,
            expiringIn7Days: expiringIn7Days.length,
            expiringIn30Days: expiringIn30Days.length,
            renewedToday,
            revenueToday,
            revenueLastMonth,
            renewedThisPeriod,
            revenuePeriod,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-renewed-users': {
        const { startDate, endDate } = body;
        
        const { data: payments, error } = await supabase
          .from('saas_pagamentos')
          .select('user_id, valor, pago_em, plano_id')
          .eq('status', 'paid')
          .gte('pago_em', startDate || new Date().toISOString().split('T')[0])
          .lte('pago_em', endDate || new Date().toISOString())
          .order('pago_em', { ascending: false })
          .limit(50);

        if (error) {
          return new Response(JSON.stringify({ users: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Get user and plan details
        const userIds = [...new Set(payments?.map(p => p.user_id) || [])];
        const planIds = [...new Set(payments?.map(p => p.plano_id).filter(Boolean) || [])];

        const { data: users } = await supabase
          .from('SAAS_Usuarios')
          .select('id, nome, Email')
          .in('id', userIds);

        const { data: plans } = await supabase
          .from('SAAS_Planos')
          .select('id, nome')
          .in('id', planIds);

        const renewedUsers = payments?.map(p => {
          const user = users?.find(u => u.id === p.user_id);
          const plan = plans?.find(pl => pl.id === p.plano_id);
          return {
            id: p.user_id,
            nome: user?.nome || null,
            Email: user?.Email || null,
            plano_nome: plan?.nome || null,
            valor: p.valor,
            pago_em: p.pago_em,
          };
        }) || [];

        return new Response(
          JSON.stringify({ users: renewedUsers }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-users': {
        // Get users directly from SAAS_Usuarios with joins
        const { data: users, error } = await supabase
          .from('SAAS_Usuarios')
          .select(`
            id, nome, Email, telefone, status, "Status Ex", banido, dataValidade, "dataValidade_extrator", 
            plano, plano_extrator, created_at, desconto_renovacao
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
            banido: user.banido ?? false,
            plano_id: user.plano,
            plano_nome: planDisparador?.nome || null,
            plano_extrator_id: user.plano_extrator,
            plano_extrator_nome: planExtrator?.nome || null,
            total_conexoes: usage?.total_conexoes || 0,
            total_contatos: usage?.total_contatos || 0,
            total_disparos: usage?.total_disparos || 0,
            total_listas: usage?.total_listas || 0,
            desconto_renovacao: user.desconto_renovacao || 0,
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

      case 'toggle-ban': {
        const { banido } = body;
        
        const { error } = await supabase
          .from('SAAS_Usuarios')
          .update({ banido })
          .eq('id', userId);

        if (error) {
          console.error('[Admin API] Error toggling ban status:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao alterar status de banimento' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] User ${userId} ban status toggled to ${banido}`);

        return new Response(
          JSON.stringify({ success: true, banido }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-user': {
        // Delete user and all related data
        console.log(`[Admin API] Deleting user ${userId}`);

        // Delete related records first
        await supabase.from('SAAS_Conexões').delete().eq('idUsuario', userId);
        await supabase.from('SAAS_Listas').delete().eq('idUsuario', userId);
        await supabase.from('SAAS_Contatos').delete().eq('idUsuario', userId);
        await supabase.from('SAAS_Grupos').delete().eq('idUsuario', userId);
        await supabase.from('SAAS_Disparos').delete().eq('userId', userId);
        await supabase.from('SAAS_Maturador').delete().eq('userId', userId);
        await supabase.from('SAAS_CRM_Colunas').delete().eq('idUsuario', userId);
        await supabase.from('SAAS_CRM_Leads').delete().eq('idUsuario', userId);
        await supabase.from('SAAS_Chat_Labels').delete().eq('idUsuario', userId);
        await supabase.from('saas_pagamentos').delete().eq('user_id', userId);
        await supabase.from('saas_cupons_uso').delete().eq('user_id', userId);
        await supabase.from('user_roles').delete().eq('user_id', userId);
        await supabase.from('search_jobs').delete().eq('user_id', userId);

        // Finally delete the user
        const { error } = await supabase
          .from('SAAS_Usuarios')
          .delete()
          .eq('id', userId);

        if (error) {
          console.error('[Admin API] Error deleting user:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao excluir usuário' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] User ${userId} deleted successfully`);

        return new Response(
          JSON.stringify({ success: true }),
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

      case 'update-profile': {
        // Update user profile (nome, telefone, avatar_url)
        const { error } = await supabase
          .from('SAAS_Usuarios')
          .update({
            nome: userData.nome,
            telefone: userData.telefone,
            avatar_url: userData.avatar_url,
          })
          .eq('id', userId);

        if (error) {
          console.error('[Admin API] Error updating profile:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao atualizar perfil' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] Profile ${userId} updated successfully`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'change-password': {
        // Verify current password
        const { data: user, error: fetchError } = await supabase
          .from('SAAS_Usuarios')
          .select('senha')
          .eq('id', userId)
          .single();

        if (fetchError || !user) {
          console.error('[Admin API] Error fetching user for password change:', fetchError);
          return new Response(
            JSON.stringify({ error: 'Usuário não encontrado' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (user.senha !== currentPassword) {
          console.log(`[Admin API] Invalid current password for user ${userId}`);
          return new Response(
            JSON.stringify({ error: 'Senha atual incorreta' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update password
        const { error: updateError } = await supabase
          .from('SAAS_Usuarios')
          .update({ senha: newPassword })
          .eq('id', userId);

        if (updateError) {
          console.error('[Admin API] Error updating password:', updateError);
          return new Response(
            JSON.stringify({ error: 'Erro ao atualizar senha' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] Password changed for user ${userId}`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-user-profile': {
        // Update user's own profile (nome, telefone)
        const { nome, telefone } = body;
        
        const { error } = await supabase
          .from('SAAS_Usuarios')
          .update({
            nome: nome,
            telefone: telefone,
          })
          .eq('id', userId);

        if (error) {
          console.error('[Admin API] Error updating user profile:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao atualizar perfil' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] User profile ${userId} updated successfully`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-user-avatar': {
        // Update user's avatar
        const { avatar_url } = body;
        
        const { error } = await supabase
          .from('SAAS_Usuarios')
          .update({ avatar_url })
          .eq('id', userId);

        if (error) {
          console.error('[Admin API] Error updating avatar:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao atualizar foto' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] User avatar ${userId} updated successfully`);

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

      case 'get-user-plan-usage': {
        // Get user with plans data and API key
        const { data: userData, error: userError } = await supabase
          .from('SAAS_Usuarios')
          .select('plano, plano_extrator, dataValidade, dataValidade_extrator, apikey_gpt')
          .eq('id', userId)
          .single();

        if (userError) {
          return new Response(
            JSON.stringify({ error: 'Usuário não encontrado' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const userApiKey = userData.apikey_gpt || null;

        let disparadorData = null;
        let extratorData = null;

        // Get disparador plan info
        if (userData.plano) {
          const { data: planInfo } = await supabase
            .from('SAAS_Planos')
            .select('nome, qntDisparos, qntConexoes, qntContatos, qntListas, qntExtracoes, qntPlaces, qntInstagram, qntLinkedin')
            .eq('id', userData.plano)
            .single();

          // Get usage counts
          const { count: conexoesCount } = await supabase
            .from('SAAS_Conexões')
            .select('*', { count: 'exact', head: true })
            .eq('idUsuario', userId);

          const { count: listasCount } = await supabase
            .from('SAAS_Listas')
            .select('*', { count: 'exact', head: true })
            .eq('idUsuario', userId);

          const { count: contatosCount } = await supabase
            .from('SAAS_Contatos')
            .select('*', { count: 'exact', head: true })
            .eq('idUsuario', userId);

          // Get dispatches this month
          const monthStart = new Date();
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);
          
          const { data: disparosData } = await supabase
            .from('SAAS_Disparos')
            .select('id')
            .eq('userId', userId)
            .gte('created_at', monthStart.toISOString());

          let disparosCount = 0;
          if (disparosData && disparosData.length > 0) {
            const disparoIds = disparosData.map(d => d.id);
            const { count } = await supabase
              .from('SAAS_Detalhes_Disparos')
              .select('*', { count: 'exact', head: true })
              .in('idDisparo', disparoIds);
            disparosCount = count || 0;
          }

          // Get extractions/searches this month - count per source if possible
          const { count: extracoesCount } = await supabase
            .from('search_jobs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .gte('created_at', monthStart.toISOString());

          // Count Places extractions
          const { count: placesCount } = await supabase
            .from('search_jobs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('type', 'places')
            .gte('created_at', monthStart.toISOString());

          // Count Instagram extractions
          const { count: instagramCount } = await supabase
            .from('search_jobs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('type', 'instagram')
            .gte('created_at', monthStart.toISOString());

          // Count LinkedIn extractions
          const { count: linkedinCount } = await supabase
            .from('search_jobs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('type', 'linkedin')
            .gte('created_at', monthStart.toISOString());

          disparadorData = {
            planoNome: planInfo?.nome || null,
            limiteDisparos: planInfo?.qntDisparos || null,
            limiteConexoes: planInfo?.qntConexoes || null,
            limiteContatos: planInfo?.qntContatos || null,
            limiteListas: planInfo?.qntListas || null,
            limiteExtracoes: planInfo?.qntExtracoes || null,
            limitePlaces: planInfo?.qntPlaces || null,
            limiteInstagram: planInfo?.qntInstagram || null,
            limiteLinkedin: planInfo?.qntLinkedin || null,
            usadoDisparos: disparosCount,
            usadoConexoes: conexoesCount || 0,
            usadoContatos: contatosCount || 0,
            usadoListas: listasCount || 0,
            usadoExtracoes: extracoesCount || 0,
            usadoPlaces: placesCount || 0,
            usadoInstagram: instagramCount || 0,
            usadoLinkedin: linkedinCount || 0,
            dataValidade: userData.dataValidade || null,
          };
        }

        // Get extrator plan info
        if (userData.plano_extrator) {
          const { data: planInfo } = await supabase
            .from('SAAS_Planos')
            .select('nome, qntPlaces, qntInstagram, qntLinkedin')
            .eq('id', userData.plano_extrator)
            .single();

          // Get extraction counts this month by type
          const monthStart = new Date();
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);
          
          const { count: placesCount } = await supabase
            .from('search_jobs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('type', 'places')
            .gte('created_at', monthStart.toISOString());

          const { count: instagramCount } = await supabase
            .from('search_jobs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('type', 'instagram')
            .gte('created_at', monthStart.toISOString());

          const { count: linkedinCount } = await supabase
            .from('search_jobs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('type', 'linkedin')
            .gte('created_at', monthStart.toISOString());

          extratorData = {
            planoNome: planInfo?.nome || null,
            limitePlaces: planInfo?.qntPlaces || null,
            limiteInstagram: planInfo?.qntInstagram || null,
            limiteLinkedin: planInfo?.qntLinkedin || null,
            usadoPlaces: placesCount || 0,
            usadoInstagram: instagramCount || 0,
            usadoLinkedin: linkedinCount || 0,
            dataValidade: userData.dataValidade_extrator || null,
          };
        }

        return new Response(
          JSON.stringify({ disparador: disparadorData, extrator: extratorData, apiKey: userApiKey }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-dashboard-stats': {
        // Use startDate and endDate from the already parsed body
        
        // Get connections for user
        const { data: conexoes, error: conexoesError } = await supabase
          .from('SAAS_Conexões')
          .select('*')
          .eq('idUsuario', userId);
        
        if (conexoesError) {
          console.error('[Admin API] Error fetching connections:', conexoesError);
        }

        const totalConexoes = conexoes?.length || 0;
        const conexoesAtivas = conexoes?.filter(c => c.Telefone)?.length || 0;

        // Build date filters
        const startISO = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const endISO = endDate || new Date().toISOString();

        // Get disparos within date range
        const { data: disparos, error: disparosError } = await supabase
          .from('SAAS_Disparos')
          .select('*')
          .eq('userId', userId)
          .gte('created_at', startISO)
          .lte('created_at', endISO);
        
        if (disparosError) {
          console.error('[Admin API] Error fetching disparos:', disparosError);
        }

        const totalDisparos = disparos?.reduce((acc, d) => acc + (d.MensagensDisparadas || 0), 0) || 0;
        const mediaPorConexao = totalConexoes > 0 ? Math.round(totalDisparos / totalConexoes) : 0;

        // Build chart data by day
        const start = new Date(startISO);
        const end = new Date(endISO);
        const chartData = [];
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dayStart = new Date(d);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(d);
          dayEnd.setHours(23, 59, 59, 999);
          
          const dayDisparos = disparos?.filter(disp => {
            const recordDate = new Date(disp.created_at);
            return recordDate >= dayStart && recordDate <= dayEnd;
          }) || [];
          
          chartData.push({
            date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
            disparos: dayDisparos.reduce((acc, disp) => acc + (disp.MensagensDisparadas || 0), 0)
          });
        }

        console.log(`[Admin API] Dashboard stats for user ${userId}: ${totalDisparos} disparos, ${totalConexoes} conexoes`);

        return new Response(
          JSON.stringify({
            stats: {
              totalDisparos,
              conexoesAtivas,
              totalConexoes,
              mediaPorConexao
            },
            chartData
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-extraction-stats': {
        // Use startDate and endDate from the already parsed body
        console.log(`[Admin API] get-extraction-stats - startDate: ${startDate}, endDate: ${endDate}`);

        // Build date filters
        const startISO = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const endISO = endDate || new Date().toISOString();

        console.log(`[Admin API] Querying search_jobs for user ${userId} from ${startISO} to ${endISO}`);

        // Get search jobs (Google Places extractions) within date range
        const { data: searchJobs, error: searchJobsError } = await supabase
          .from('search_jobs')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', startISO)
          .lte('created_at', endISO)
          .order('created_at', { ascending: false });

        if (searchJobsError) {
          console.error('[Admin API] Error fetching search_jobs:', searchJobsError);
        }

        console.log(`[Admin API] Found ${searchJobs?.length || 0} search jobs`);

        // Calculate stats from search_jobs
        const totalExtractions = searchJobs?.length || 0;
        const totalLeads = searchJobs?.reduce((acc, job) => acc + (job.total_found || 0), 0) || 0;
        
        // Count emails and phones from results
        let totalEmails = 0;
        let totalPhones = 0;
        
        searchJobs?.forEach(job => {
          const results = job.results as any[] || [];
          results.forEach((r: any) => {
            if (r?.email) totalEmails++;
            if (r?.phone) totalPhones++;
          });
        });

        // Get today's stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const todayJobs = searchJobs?.filter(job => new Date(job.created_at) >= today) || [];
        const todayExtractions = todayJobs.length;
        const todayLeads = todayJobs.reduce((acc, job) => acc + (job.total_found || 0), 0);

        // Build chart data by day
        const start = new Date(startISO);
        const end = new Date(endISO);
        const chartData = [];
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dayStart = new Date(d);
          dayStart.setHours(0, 0, 0, 0);
          const dayEnd = new Date(d);
          dayEnd.setHours(23, 59, 59, 999);
          
          const dayJobs = searchJobs?.filter(job => {
            const recordDate = new Date(job.created_at);
            return recordDate >= dayStart && recordDate <= dayEnd;
          }) || [];
          
          chartData.push({
            date: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
            extractions: dayJobs.length,
            leads: dayJobs.reduce((acc, job) => acc + (job.total_found || 0), 0)
          });
        }

        // Transform search_jobs to extraction history format
        const extractionHistory = searchJobs?.map(job => ({
          id: job.id,
          type: 'places' as const,
          segment: job.query,
          location: job.location || '',
          totalResults: job.total_found || 0,
          emailsFound: ((job.results as any[]) || []).filter((r: any) => r?.email).length,
          phonesFound: ((job.results as any[]) || []).filter((r: any) => r?.phone).length,
          createdAt: job.created_at,
          status: job.status,
        })) || [];

        console.log(`[Admin API] Extraction stats for user ${userId}: ${totalExtractions} extractions, ${totalLeads} leads`);

        return new Response(
          JSON.stringify({
            stats: {
              totalExtractions,
              todayExtractions,
              totalLeads,
              todayLeads,
              totalEmails,
              totalPhones
            },
            chartData,
            history: extractionHistory
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-admins': {
        // Get all admin users with their user info
        const { data: adminRoles, error: rolesError } = await supabase
          .from('user_roles')
          .select('*')
          .eq('role', 'admin')
          .order('created_at', { ascending: true });

        if (rolesError) {
          console.error('[Admin API] Error fetching admin roles:', rolesError);
          return new Response(
            JSON.stringify({ error: 'Erro ao buscar administradores' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get user info for each admin
        const adminsWithInfo = await Promise.all(
          (adminRoles || []).map(async (role) => {
            const { data: userInfo } = await supabase
              .from('SAAS_Usuarios')
              .select('Email, nome')
              .eq('id', role.user_id)
              .single();

            return {
              ...role,
              user_email: userInfo?.Email || null,
              user_name: userInfo?.nome || null,
            };
          })
        );

        console.log(`[Admin API] Found ${adminsWithInfo.length} admins`);

        return new Response(
          JSON.stringify({ admins: adminsWithInfo }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'add-admin': {
        const { nome, email, senha } = body;
        
        if (!email) {
          return new Response(
            JSON.stringify({ error: 'Email é obrigatório' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!nome) {
          return new Response(
            JSON.stringify({ error: 'Nome é obrigatório' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!senha || senha.length < 6) {
          return new Response(
            JSON.stringify({ error: 'Senha deve ter pelo menos 6 caracteres' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if email already exists
        const { data: existingUser } = await supabase
          .from('SAAS_Usuarios')
          .select('id')
          .eq('Email', email)
          .single();

        if (existingUser) {
          return new Response(
            JSON.stringify({ error: 'Já existe um usuário com este email' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create new user
        const { data: newUser, error: createError } = await supabase
          .from('SAAS_Usuarios')
          .insert({
            nome: nome,
            Email: email,
            senha: senha,
            status: true,
            'Status Ex': false
          })
          .select('id')
          .single();

        if (createError || !newUser) {
          console.error('[Admin API] Error creating user:', createError);
          return new Response(
            JSON.stringify({ error: 'Erro ao criar usuário' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Add admin role
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({
            user_id: newUser.id,
            role: 'admin'
          });

        if (insertError) {
          console.error('[Admin API] Error adding admin role:', insertError);
          // Rollback: delete the created user
          await supabase.from('SAAS_Usuarios').delete().eq('id', newUser.id);
          return new Response(
            JSON.stringify({ error: 'Erro ao adicionar permissão de administrador' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] Created new admin user: ${email}`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'remove-admin': {
        const removeUserId = body.userId;
        
        if (!removeUserId) {
          return new Response(
            JSON.stringify({ error: 'userId é obrigatório' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if this is the first/primary admin (prevent removal)
        const { data: allAdmins } = await supabase
          .from('user_roles')
          .select('user_id, created_at')
          .eq('role', 'admin')
          .order('created_at', { ascending: true });

        if (allAdmins && allAdmins.length > 0 && allAdmins[0].user_id === removeUserId) {
          return new Response(
            JSON.stringify({ error: 'Não é possível remover o administrador principal' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Remove admin role
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', removeUserId)
          .eq('role', 'admin');

        if (deleteError) {
          console.error('[Admin API] Error removing admin role:', deleteError);
          return new Response(
            JSON.stringify({ error: 'Erro ao remover administrador' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] Removed admin role for user ${removeUserId}`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-configuracoes': {
        const { data: configuracoes, error } = await supabase
          .from('saas_configuracoes')
          .select('*')
          .order('categoria', { ascending: true });

        if (error) {
          console.error('[Admin API] Error fetching configurations:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao buscar configurações' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] Fetched ${configuracoes?.length || 0} configurations`);

        return new Response(
          JSON.stringify({ configuracoes }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-configuracao': {
        const { chave, valor } = body;

        if (!chave) {
          return new Response(
            JSON.stringify({ error: 'Chave é obrigatória' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error } = await supabase
          .from('saas_configuracoes')
          .update({ valor, updated_at: new Date().toISOString() })
          .eq('chave', chave);

        if (error) {
          console.error('[Admin API] Error updating configuration:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao atualizar configuração' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] Configuration ${chave} updated`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-configuracao': {
        const { chave } = body;

        const { data, error } = await supabase
          .from('saas_configuracoes')
          .select('valor')
          .eq('chave', chave)
          .maybeSingle();

        if (error) {
          console.error('[Admin API] Error fetching configuration:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao buscar configuração' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ valor: data?.valor || null }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-user-payments': {
        const { data: payments, error } = await supabase
          .from('SAAS_Pagamentos')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[Admin API] Error fetching user payments:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao buscar pagamentos' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Get plan names for payments
        const { data: plans } = await supabase
          .from('SAAS_Planos')
          .select('id, nome');

        const paymentsWithPlanNames = payments?.map(payment => {
          const plan = plans?.find(p => p.id === payment.plano_id);
          return {
            ...payment,
            plano_nome: plan?.nome || null
          };
        }) || [];

        console.log(`[Admin API] Fetched ${payments?.length || 0} payments for user ${userId}`);

        return new Response(
          JSON.stringify({ payments: paymentsWithPlanNames }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'get-cupons': {
        const { data: cupons, error } = await supabase
          .from('saas_cupons')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[Admin API] Error fetching cupons:', error);
          return new Response(
            JSON.stringify({ error: 'Erro ao buscar cupons' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] Fetched ${cupons?.length || 0} cupons`);

        return new Response(
          JSON.stringify({ cupons }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create-cupom': {
        const { cupom } = body;
        
        const { error } = await supabase
          .from('saas_cupons')
          .insert(cupom);

        if (error) {
          console.error('[Admin API] Error creating cupom:', error);
          return new Response(
            JSON.stringify({ error: error.message || 'Erro ao criar cupom' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] Cupom created: ${cupom.codigo}`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-cupom': {
        const { cupomId, cupom } = body;
        
        const { error } = await supabase
          .from('saas_cupons')
          .update(cupom)
          .eq('id', cupomId);

        if (error) {
          console.error('[Admin API] Error updating cupom:', error);
          return new Response(
            JSON.stringify({ error: error.message || 'Erro ao atualizar cupom' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] Cupom ${cupomId} updated`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete-cupom': {
        const { cupomId } = body;
        
        const { error } = await supabase
          .from('saas_cupons')
          .delete()
          .eq('id', cupomId);

        if (error) {
          console.error('[Admin API] Error deleting cupom:', error);
          return new Response(
            JSON.stringify({ error: error.message || 'Erro ao excluir cupom' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        console.log(`[Admin API] Cupom ${cupomId} deleted`);

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'validate-cupom': {
        const { codigo, planId, userId: validatingUserId } = body;
        
        // Find the cupom
        const { data: cupom, error: cupomError } = await supabase
          .from('saas_cupons')
          .select('*')
          .eq('codigo', codigo.toUpperCase())
          .single();

        if (cupomError || !cupom) {
          return new Response(
            JSON.stringify({ valid: false, error: 'Cupom não encontrado' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if active
        if (!cupom.ativo) {
          return new Response(
            JSON.stringify({ valid: false, error: 'Cupom inativo' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check expiration
        if (cupom.validade) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const expDate = new Date(cupom.validade);
          if (expDate < today) {
            return new Response(
              JSON.stringify({ valid: false, error: 'Cupom expirado' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        // Check usage limit
        if (cupom.quantidade_uso && cupom.quantidade_usada >= cupom.quantidade_uso) {
          return new Response(
            JSON.stringify({ valid: false, error: 'Cupom esgotado' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if plan is valid for this cupom
        if (cupom.planos_ids && cupom.planos_ids.length > 0 && !cupom.planos_ids.includes(planId)) {
          return new Response(
            JSON.stringify({ valid: false, error: 'Cupom não válido para este plano' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if uso_unico and user already used it
        if (cupom.uso_unico && validatingUserId) {
          const { data: existingUse } = await supabase
            .from('saas_cupons_uso')
            .select('id')
            .eq('cupom_id', cupom.id)
            .eq('user_id', validatingUserId)
            .single();

          if (existingUse) {
            return new Response(
              JSON.stringify({ valid: false, error: 'Você já utilizou este cupom' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }

        console.log(`[Admin API] Cupom ${codigo} validated successfully`);

        return new Response(
          JSON.stringify({ 
            valid: true, 
            cupom: {
              id: cupom.id,
              codigo: cupom.codigo,
              desconto: cupom.desconto,
              tipo_desconto: cupom.tipo_desconto
            }
          }),
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
