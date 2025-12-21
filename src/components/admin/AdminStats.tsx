import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserCheck, CreditCard, Send, Link2, List, Contact, TrendingUp, Activity, Sparkles, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalPlans: number;
  disparosThisMonth: number;
  totalConnections: number;
  totalLists: number;
  totalContacts: number;
}

interface ChartData {
  usersOverTime: { date: string; users: number }[];
  disparosOverTime: { date: string; disparos: number }[];
  planDistribution: { name: string; value: number; color: string }[];
  contactsPerList: { name: string; contacts: number }[];
}

interface UserWithPlan {
  id: string;
  nome: string | null;
  Email: string | null;
  plano_nome: string | null;
  plano_extrator_nome: string | null;
  status: boolean | null;
  status_ex: boolean | null;
  dataValidade: string | null;
  dataValidade_extrator: string | null;
}

export function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [usersWithPlans, setUsersWithPlans] = useState<UserWithPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('admin-api', {
          body: { action: 'get-stats' }
        });

        if (!error && data) {
          setStats(data);
        }

        // Fetch chart data
        const { data: chartDataRes } = await supabase.functions.invoke('admin-api', {
          body: { action: 'get-chart-data' }
        });

        if (chartDataRes) {
          setChartData(chartDataRes);
        }

        // Fetch users with plans for comparison table
        const { data: usersRes } = await supabase.functions.invoke('admin-api', {
          body: { action: 'get-users' }
        });

        if (usersRes?.users) {
          setUsersWithPlans(usersRes.users);
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { 
      title: 'Total de Usuários', 
      value: stats?.totalUsers || 0, 
      icon: Users, 
      gradient: 'from-blue-500 to-cyan-400',
      bgGradient: 'from-blue-500/20 to-cyan-400/10',
      iconBg: 'bg-blue-500/20',
      textColor: 'text-blue-500'
    },
    { 
      title: 'Usuários Ativos', 
      value: stats?.activeUsers || 0, 
      icon: UserCheck, 
      gradient: 'from-emerald-500 to-teal-400',
      bgGradient: 'from-emerald-500/20 to-teal-400/10',
      iconBg: 'bg-emerald-500/20',
      textColor: 'text-emerald-500'
    },
    { 
      title: 'Planos Cadastrados', 
      value: stats?.totalPlans || 0, 
      icon: CreditCard, 
      gradient: 'from-violet-500 to-purple-400',
      bgGradient: 'from-violet-500/20 to-purple-400/10',
      iconBg: 'bg-violet-500/20',
      textColor: 'text-violet-500'
    },
    { 
      title: 'Disparos (Mês)', 
      value: stats?.disparosThisMonth || 0, 
      icon: Send, 
      gradient: 'from-orange-500 to-amber-400',
      bgGradient: 'from-orange-500/20 to-amber-400/10',
      iconBg: 'bg-orange-500/20',
      textColor: 'text-orange-500'
    },
    { 
      title: 'Conexões', 
      value: stats?.totalConnections || 0, 
      icon: Link2, 
      gradient: 'from-cyan-500 to-sky-400',
      bgGradient: 'from-cyan-500/20 to-sky-400/10',
      iconBg: 'bg-cyan-500/20',
      textColor: 'text-cyan-500'
    },
    { 
      title: 'Listas', 
      value: stats?.totalLists || 0, 
      icon: List, 
      gradient: 'from-pink-500 to-rose-400',
      bgGradient: 'from-pink-500/20 to-rose-400/10',
      iconBg: 'bg-pink-500/20',
      textColor: 'text-pink-500'
    },
    { 
      title: 'Contatos', 
      value: stats?.totalContacts || 0, 
      icon: Contact, 
      gradient: 'from-amber-500 to-yellow-400',
      bgGradient: 'from-amber-500/20 to-yellow-400/10',
      iconBg: 'bg-amber-500/20',
      textColor: 'text-amber-500'
    },
  ];

  // Default chart data if not loaded
  const defaultUsersOverTime = chartData?.usersOverTime || [
    { date: 'Jan', users: 2 },
    { date: 'Fev', users: 3 },
    { date: 'Mar', users: 4 },
    { date: 'Abr', users: 5 },
    { date: 'Mai', users: 6 },
    { date: 'Jun', users: 7 },
    { date: 'Jul', users: 8 },
  ];

  const defaultDisparosOverTime = chartData?.disparosOverTime || [
    { date: 'Seg', disparos: 12 },
    { date: 'Ter', disparos: 19 },
    { date: 'Qua', disparos: 8 },
    { date: 'Qui', disparos: 24 },
    { date: 'Sex', disparos: 15 },
    { date: 'Sáb', disparos: 5 },
    { date: 'Dom', disparos: 3 },
  ];

  const defaultPlanDistribution = chartData?.planDistribution || [
    { name: 'Básico', value: 3, color: '#3b82f6' },
    { name: 'Pro', value: 4, color: '#8b5cf6' },
    { name: 'Enterprise', value: 1, color: '#10b981' },
  ];

  const defaultContactsPerList = chartData?.contactsPerList || [
    { name: 'Lista 1', contacts: 450 },
    { name: 'Lista 2', contacts: 680 },
    { name: 'Lista 3', contacts: 320 },
    { name: 'Lista 4', contacts: 890 },
    { name: 'Lista 5', contacts: 356 },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i} className="relative overflow-hidden border-border/40 animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-24 mb-3" />
                <div className="h-8 bg-muted rounded w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/40 animate-pulse">
              <CardContent className="p-6 h-80" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards - Modern Glass Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card 
            key={stat.title} 
            className="relative overflow-hidden border-border/40 bg-card hover:shadow-lg hover:shadow-primary/5 transition-all duration-500 group"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Gradient background overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-50 group-hover:opacity-70 transition-opacity duration-500`} />
            
            {/* Decorative elements */}
            <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${stat.gradient} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity duration-500`} />
            
            <CardContent className="relative p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                  <p className={`text-3xl font-bold ${stat.textColor}`}>
                    {stat.value.toLocaleString('pt-BR')}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${stat.iconBg} ring-1 ring-white/10 backdrop-blur-sm`}>
                  <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users Growth Chart */}
        <Card className="border-border/40 bg-card overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              Crescimento de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={defaultUsersOverTime}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="users" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorUsers)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Disparos Chart */}
        <Card className="border-border/40 bg-card overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-orange-500/10">
                <Zap className="w-4 h-4 text-orange-500" />
              </div>
              Disparos por Dia
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={defaultDisparosOverTime}>
                  <defs>
                    <linearGradient id="colorDisparos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f97316" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#fb923c" stopOpacity={0.8}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Bar 
                    dataKey="disparos" 
                    fill="url(#colorDisparos)" 
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <Card className="border-border/40 bg-card overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/10">
                <CreditCard className="w-4 h-4 text-violet-500" />
              </div>
              Distribuição por Plano
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <defs>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                      <feDropShadow dx="0" dy="4" stdDeviation="8" floodOpacity="0.2"/>
                    </filter>
                  </defs>
                  <Pie
                    data={defaultPlanDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    strokeWidth={0}
                    style={{ filter: 'url(#shadow)' }}
                  >
                    {defaultPlanDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              {defaultPlanDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full ring-2 ring-white/20" style={{ backgroundColor: item.color }} />
                  <span className="text-xs font-medium text-muted-foreground">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contacts per List */}
        <Card className="border-border/40 bg-card overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10">
                <Contact className="w-4 h-4 text-amber-500" />
              </div>
              Contatos por Lista (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={defaultContactsPerList}>
                  <defs>
                    <linearGradient id="colorContacts" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={40}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 10px 40px -10px rgba(0,0,0,0.3)'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="contacts" 
                    stroke="url(#colorContacts)" 
                    strokeWidth={3}
                    dot={{ fill: '#f59e0b', strokeWidth: 0, r: 5 }}
                    activeDot={{ fill: '#f59e0b', strokeWidth: 3, stroke: '#fef3c7', r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary - Premium Cards */}
      <Card className="border-border/40 bg-card overflow-hidden">
        <CardHeader className="pb-2 border-b border-border/30">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            Resumo de Atividades
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Taxa de Ativação</p>
              <p className="text-2xl font-bold text-emerald-500 mt-1">
                {stats ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
              </p>
            </div>
            <div className="relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 rounded-full blur-2xl" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Média Contatos/Lista</p>
              <p className="text-2xl font-bold text-blue-500 mt-1">
                {stats && stats.totalLists > 0 ? Math.round(stats.totalContacts / stats.totalLists) : 0}
              </p>
            </div>
            <div className="relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-cyan-500/10 to-sky-500/5 border border-cyan-500/20">
              <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-2xl" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conexões/Usuário</p>
              <p className="text-2xl font-bold text-cyan-500 mt-1">
                {stats && stats.totalUsers > 0 ? (stats.totalConnections / stats.totalUsers).toFixed(1) : 0}
              </p>
            </div>
            <div className="relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20">
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 rounded-full blur-2xl" />
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Disparos/Dia</p>
              <p className="text-2xl font-bold text-orange-500 mt-1">
                {stats ? Math.round(stats.disparosThisMonth / 30) : 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Products Comparison Table */}
      <Card className="border-border/40 bg-card overflow-hidden">
        <CardHeader className="pb-2 border-b border-border/30">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-500/10">
              <Users className="w-4 h-4 text-violet-500" />
            </div>
            Comparativo de Produtos por Usuário
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/30 bg-muted/30">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Usuário</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Disparador</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Validade Disp.</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Extrator</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Validade Ext.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersWithPlans.slice(0, 10).map((user) => (
                  <TableRow key={user.id} className="border-border/20 hover:bg-muted/30 transition-colors">
                    <TableCell className="py-3">
                      <p className="text-sm font-semibold">{user.nome || 'Sem nome'}</p>
                      <p className="text-[11px] text-muted-foreground">{user.Email}</p>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <div className="flex flex-col items-center gap-1.5">
                        {user.plano_nome ? (
                          <Badge 
                            variant={user.status ? 'default' : 'secondary'} 
                            className={`text-[10px] font-semibold ${user.status ? 'bg-gradient-to-r from-primary to-primary/80' : ''}`}
                          >
                            {user.plano_nome}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      {user.dataValidade ? (
                        <span className="text-xs font-medium text-muted-foreground">
                          {format(new Date(user.dataValidade), 'dd/MM/yyyy')}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center py-3">
                      <div className="flex flex-col items-center gap-1.5">
                        {user.plano_extrator_nome ? (
                          <Badge 
                            variant={user.status_ex ? 'default' : 'secondary'}
                            className={`text-[10px] font-semibold ${user.status_ex ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : ''}`}
                          >
                            {user.plano_extrator_nome}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center py-3">
                      {user.dataValidade_extrator ? (
                        <span className="text-xs font-medium text-muted-foreground">
                          {format(new Date(user.dataValidade_extrator), 'dd/MM/yyyy')}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
