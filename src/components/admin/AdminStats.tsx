import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserCheck, CreditCard, Send, Link2, List, Contact, TrendingUp, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

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

export function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
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
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: 'Total de Usuários', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-400', bgColor: 'bg-blue-400/10' },
    { title: 'Usuários Ativos', value: stats?.activeUsers || 0, icon: UserCheck, color: 'text-emerald-400', bgColor: 'bg-emerald-400/10' },
    { title: 'Planos Cadastrados', value: stats?.totalPlans || 0, icon: CreditCard, color: 'text-purple-400', bgColor: 'bg-purple-400/10' },
    { title: 'Disparos (Mês)', value: stats?.disparosThisMonth || 0, icon: Send, color: 'text-orange-400', bgColor: 'bg-orange-400/10' },
    { title: 'Conexões', value: stats?.totalConnections || 0, icon: Link2, color: 'text-cyan-400', bgColor: 'bg-cyan-400/10' },
    { title: 'Listas', value: stats?.totalLists || 0, icon: List, color: 'text-pink-400', bgColor: 'bg-pink-400/10' },
    { title: 'Contatos', value: stats?.totalContacts || 0, icon: Contact, color: 'text-yellow-400', bgColor: 'bg-yellow-400/10' },
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
    { name: 'Básico', value: 3, color: '#60a5fa' },
    { name: 'Pro', value: 4, color: '#a78bfa' },
    { name: 'Enterprise', value: 1, color: '#34d399' },
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
            <Card key={i} className="bg-card/50 border-border/50 animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-24 mb-3" />
                <div className="h-8 bg-muted rounded w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="bg-card/50 border-border/50 animate-pulse">
              <CardContent className="p-6 h-80" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card 
            key={stat.title} 
            className="bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value.toLocaleString('pt-BR')}</p>
                </div>
                <div className={`p-2.5 rounded-lg ${stat.bgColor} ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Users Growth Chart */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              Crescimento de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={defaultUsersOverTime}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="users" 
                    stroke="#60a5fa" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorUsers)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Disparos Chart */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="w-4 h-4 text-orange-400" />
              Disparos por Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={defaultDisparosOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="date" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar 
                    dataKey="disparos" 
                    fill="#fb923c" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plan Distribution */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-400" />
              Distribuição por Plano
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={defaultPlanDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {defaultPlanDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {defaultPlanDistribution.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contacts per List */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Contact className="w-4 h-4 text-yellow-400" />
              Contatos por Lista (Top 5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={defaultContactsPerList}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="contacts" 
                    stroke="#facc15" 
                    strokeWidth={2}
                    dot={{ fill: '#facc15', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Resumo de Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
              <p className="text-xs text-muted-foreground">Taxa de Ativação</p>
              <p className="text-xl font-bold text-emerald-400">
                {stats ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
              <p className="text-xs text-muted-foreground">Média Contatos/Lista</p>
              <p className="text-xl font-bold text-blue-400">
                {stats && stats.totalLists > 0 ? Math.round(stats.totalContacts / stats.totalLists) : 0}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
              <p className="text-xs text-muted-foreground">Conexões/Usuário</p>
              <p className="text-xl font-bold text-cyan-400">
                {stats && stats.totalUsers > 0 ? (stats.totalConnections / stats.totalUsers).toFixed(1) : 0}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
              <p className="text-xs text-muted-foreground">Disparos/Dia</p>
              <p className="text-xl font-bold text-orange-400">
                {stats ? Math.round(stats.disparosThisMonth / 30) : 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
