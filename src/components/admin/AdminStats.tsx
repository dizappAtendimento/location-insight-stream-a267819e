import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, CreditCard, Send, Link2, Contact, TrendingUp, Activity, Sparkles, Zap, DollarSign, Clock, AlertTriangle, UserX, Calendar, RefreshCw, Filter } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, differenceInDays, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalPlans: number;
  disparosThisMonth: number;
  totalConnections: number;
  totalLists: number;
  totalContacts: number;
  paidUsers: number;
  monthlyRevenue: number;
  expiredUsers: number;
  expiringIn7Days: number;
  expiringIn30Days: number;
  renewedToday: number;
  revenueToday: number;
  revenueLastMonth: number;
  renewedThisPeriod: number;
  revenuePeriod: number;
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
  status: boolean | null;
  dataValidade: string | null;
  created_at: string | null;
}

interface RenewalUser {
  id: string;
  nome: string | null;
  Email: string | null;
  plano_nome: string | null;
  valor: number;
  pago_em: string;
}

type PeriodFilter = '7d' | '30d' | 'this_month' | 'last_month' | 'all';

export function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [usersWithPlans, setUsersWithPlans] = useState<UserWithPlan[]>([]);
  const [renewedUsers, setRenewedUsers] = useState<RenewalUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('30d');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getPeriodDates = (period: PeriodFilter): { startDate: string; endDate: string } => {
    const now = new Date();
    const endDate = now.toISOString();
    
    switch (period) {
      case '7d':
        return { startDate: subDays(now, 7).toISOString(), endDate };
      case '30d':
        return { startDate: subDays(now, 30).toISOString(), endDate };
      case 'this_month':
        return { startDate: startOfMonth(now).toISOString(), endDate };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { 
          startDate: startOfMonth(lastMonth).toISOString(), 
          endDate: endOfMonth(lastMonth).toISOString() 
        };
      case 'all':
      default:
        return { startDate: new Date('2020-01-01').toISOString(), endDate };
    }
  };

  const fetchStats = async () => {
    try {
      const { startDate, endDate } = getPeriodDates(periodFilter);
      
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'get-stats', startDate, endDate }
      });

      if (!error && data) {
        setStats(data);
      }

      const { data: chartDataRes } = await supabase.functions.invoke('admin-api', {
        body: { action: 'get-chart-data' }
      });

      if (chartDataRes) {
        setChartData(chartDataRes);
      }

      const { data: usersRes } = await supabase.functions.invoke('admin-api', {
        body: { action: 'get-users' }
      });

      if (usersRes?.users) {
        setUsersWithPlans(usersRes.users);
      }

      const { data: renewedRes } = await supabase.functions.invoke('admin-api', {
        body: { action: 'get-renewed-users', startDate, endDate }
      });

      if (renewedRes?.users) {
        setRenewedUsers(renewedRes.users);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    fetchStats();
  }, [periodFilter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStats();
  };

  const getExpirationStatus = (dataValidade: string | null) => {
    if (!dataValidade) return { text: '—', color: 'text-muted-foreground', badge: null };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(dataValidade);
    const daysLeft = differenceInDays(expDate, today);
    
    if (daysLeft < 0) {
      return { 
        text: `Expirou há ${Math.abs(daysLeft)} dias`, 
        color: 'text-red-500',
        badge: <Badge variant="destructive" className="text-[10px]">Expirado</Badge>
      };
    } else if (daysLeft === 0) {
      return { 
        text: 'Expira hoje', 
        color: 'text-orange-500',
        badge: <Badge className="text-[10px] bg-orange-500">Hoje</Badge>
      };
    } else if (daysLeft <= 7) {
      return { 
        text: `${daysLeft} dias restantes`, 
        color: 'text-orange-500',
        badge: <Badge className="text-[10px] bg-orange-500">{daysLeft} dias</Badge>
      };
    } else if (daysLeft <= 30) {
      return { 
        text: `${daysLeft} dias restantes`, 
        color: 'text-yellow-500',
        badge: <Badge className="text-[10px] bg-yellow-500 text-yellow-900">{daysLeft} dias</Badge>
      };
    } else {
      return { 
        text: format(expDate, 'dd/MM/yyyy'), 
        color: 'text-emerald-500',
        badge: <Badge className="text-[10px] bg-emerald-500">{daysLeft} dias</Badge>
      };
    }
  };

  const getPeriodLabel = () => {
    switch (periodFilter) {
      case '7d': return 'últimos 7 dias';
      case '30d': return 'últimos 30 dias';
      case 'this_month': return 'este mês';
      case 'last_month': return 'mês passado';
      default: return 'todo período';
    }
  };

  const defaultUsersOverTime = chartData?.usersOverTime || [
    { date: 'Jan', users: 2 }, { date: 'Fev', users: 3 }, { date: 'Mar', users: 4 },
    { date: 'Abr', users: 5 }, { date: 'Mai', users: 6 }, { date: 'Jun', users: 7 }, { date: 'Jul', users: 8 },
  ];

  const defaultDisparosOverTime = chartData?.disparosOverTime || [
    { date: 'Seg', disparos: 12 }, { date: 'Ter', disparos: 19 }, { date: 'Qua', disparos: 8 },
    { date: 'Qui', disparos: 24 }, { date: 'Sex', disparos: 15 }, { date: 'Sáb', disparos: 5 }, { date: 'Dom', disparos: 3 },
  ];

  const defaultPlanDistribution = chartData?.planDistribution || [
    { name: 'Básico', value: 3, color: '#3b82f6' },
    { name: 'Pro', value: 4, color: '#8b5cf6' },
    { name: 'Enterprise', value: 1, color: '#10b981' },
  ];

  const defaultContactsPerList = chartData?.contactsPerList || [
    { name: 'Lista 1', contacts: 450 }, { name: 'Lista 2', contacts: 680 },
    { name: 'Lista 3', contacts: 320 }, { name: 'Lista 4', contacts: 890 }, { name: 'Lista 5', contacts: 356 },
  ];

  const revenueCards = [
    { 
      title: 'Receita Mensal', 
      value: `R$ ${(stats?.monthlyRevenue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      subtitle: `${stats?.paidUsers || 0} assinaturas pagas`,
      icon: DollarSign, 
      bgGradient: 'from-emerald-500/20 to-teal-500/10',
      iconBg: 'bg-emerald-500/20',
      textColor: 'text-emerald-500'
    },
    { 
      title: 'Receita Hoje', 
      value: `R$ ${(stats?.revenueToday || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      subtitle: `${stats?.renewedToday || 0} renovações hoje`,
      icon: TrendingUp, 
      bgGradient: 'from-green-500/20 to-emerald-400/10',
      iconBg: 'bg-green-500/20',
      textColor: 'text-green-500'
    },
    { 
      title: `Receita (${getPeriodLabel()})`, 
      value: `R$ ${(stats?.revenuePeriod || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      subtitle: `${stats?.renewedThisPeriod || 0} renovações`,
      icon: Calendar, 
      bgGradient: 'from-teal-500/20 to-cyan-400/10',
      iconBg: 'bg-teal-500/20',
      textColor: 'text-teal-500'
    },
    { 
      title: 'Receita Mês Passado', 
      value: `R$ ${(stats?.revenueLastMonth || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 
      subtitle: 'mês anterior',
      icon: Activity, 
      bgGradient: 'from-indigo-500/20 to-purple-400/10',
      iconBg: 'bg-indigo-500/20',
      textColor: 'text-indigo-500'
    },
  ];

  const usageCards = [
    { 
      title: 'Total Usuários', 
      value: stats?.totalUsers || 0, 
      subtitle: `${stats?.activeUsers || 0} ativos`,
      icon: Users, 
      bgGradient: 'from-blue-500/20 to-cyan-400/10',
      iconBg: 'bg-blue-500/20',
      textColor: 'text-blue-500'
    },
    { 
      title: 'Conexões', 
      value: stats?.totalConnections || 0, 
      subtitle: `${stats?.totalUsers ? (stats.totalConnections / stats.totalUsers).toFixed(1) : 0} por usuário`,
      icon: Link2, 
      bgGradient: 'from-violet-500/20 to-purple-400/10',
      iconBg: 'bg-violet-500/20',
      textColor: 'text-violet-500'
    },
    { 
      title: 'Disparos (Mês)', 
      value: stats?.disparosThisMonth || 0, 
      subtitle: `${stats ? Math.round(stats.disparosThisMonth / 30) : 0} por dia`,
      icon: Send, 
      bgGradient: 'from-orange-500/20 to-amber-400/10',
      iconBg: 'bg-orange-500/20',
      textColor: 'text-orange-500'
    },
    { 
      title: 'Renovados Hoje', 
      value: stats?.renewedToday || 0, 
      subtitle: 'planos renovados',
      icon: RefreshCw, 
      bgGradient: 'from-lime-500/20 to-green-400/10',
      iconBg: 'bg-lime-500/20',
      textColor: 'text-lime-500'
    },
  ];

  const statusCards = [
    { 
      title: 'Vencendo em 7 dias', 
      value: stats?.expiringIn7Days || 0, 
      subtitle: `+${stats?.expiringIn30Days || 0} em 30 dias`,
      icon: Clock, 
      bgGradient: 'from-amber-500/20 to-yellow-500/10',
      iconBg: 'bg-amber-500/20',
      textColor: 'text-amber-500'
    },
    { 
      title: 'Expirados', 
      value: stats?.expiredUsers || 0, 
      subtitle: 'Acesso bloqueado',
      icon: AlertTriangle, 
      bgGradient: 'from-red-500/20 to-rose-500/10',
      iconBg: 'bg-red-500/20',
      textColor: 'text-red-500'
    },
    { 
      title: 'Inativos', 
      value: stats?.inactiveUsers || 0, 
      subtitle: 'Sem plano ativo',
      icon: UserX, 
      bgGradient: 'from-slate-500/20 to-gray-500/10',
      iconBg: 'bg-slate-500/20',
      textColor: 'text-slate-500'
    },
    { 
      title: 'Planos Pagos', 
      value: stats?.paidUsers || 0, 
      subtitle: 'Usuários pagantes',
      icon: CreditCard, 
      bgGradient: 'from-cyan-500/20 to-sky-500/10',
      iconBg: 'bg-cyan-500/20',
      textColor: 'text-cyan-500'
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Card key={i} className="relative overflow-hidden border-border/40 animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-24 mb-3" />
                <div className="h-8 bg-muted rounded w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as PeriodFilter)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Selecione o período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="this_month">Este mês</SelectItem>
              <SelectItem value="last_month">Mês passado</SelectItem>
              <SelectItem value="all">Todo período</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Revenue Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {revenueCards.map((stat, index) => (
          <Card key={stat.title} className="relative overflow-hidden border-border/40 bg-card hover:shadow-lg hover:shadow-primary/5 transition-all duration-500 group">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-50 group-hover:opacity-70 transition-opacity duration-500`} />
            <CardContent className="relative p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.subtitle}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.iconBg} ring-1 ring-white/10 backdrop-blur-sm`}>
                  <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {usageCards.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden border-border/40 bg-card hover:shadow-lg hover:shadow-primary/5 transition-all duration-500 group">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-50 group-hover:opacity-70 transition-opacity duration-500`} />
            <CardContent className="relative p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value.toLocaleString('pt-BR')}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.subtitle}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.iconBg} ring-1 ring-white/10 backdrop-blur-sm`}>
                  <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusCards.map((stat) => (
          <Card key={stat.title} className="relative overflow-hidden border-border/40 bg-card hover:shadow-lg hover:shadow-primary/5 transition-all duration-500 group">
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-50 group-hover:opacity-70 transition-opacity duration-500`} />
            <CardContent className="relative p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                  <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value.toLocaleString('pt-BR')}</p>
                  <p className="text-[11px] text-muted-foreground">{stat.subtitle}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.iconBg} ring-1 ring-white/10 backdrop-blur-sm`}>
                  <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Renewed Users Table */}
      {renewedUsers.length > 0 && (
        <Card className="border-border/40 bg-card overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/30">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-green-500/10">
                <RefreshCw className="w-4 h-4 text-green-500" />
              </div>
              Renovações Recentes ({getPeriodLabel()})
              <Badge variant="secondary" className="ml-2 text-xs">{renewedUsers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-64">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border/30 bg-muted/30">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">Usuário</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Plano</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Valor</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renewedUsers.map((user, idx) => (
                    <TableRow key={`${user.id}-${idx}`} className="border-border/20 hover:bg-muted/30 transition-colors">
                      <TableCell className="py-2">
                        <p className="text-sm font-semibold">{user.nome || 'Sem nome'}</p>
                        <p className="text-[11px] text-muted-foreground">{user.Email}</p>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <Badge className="text-[10px] bg-gradient-to-r from-primary to-primary/80">
                          {user.plano_nome || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <span className="text-sm font-semibold text-green-500">
                          R$ {user.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(user.pago_em), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

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
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={30} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                  <Bar dataKey="disparos" fill="url(#colorDisparos)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  <Pie data={defaultPlanDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {defaultPlanDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
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
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} width={40} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="contacts" stroke="url(#colorContacts)" strokeWidth={3} dot={{ fill: '#f59e0b', strokeWidth: 0, r: 5 }} activeDot={{ fill: '#f59e0b', strokeWidth: 3, stroke: '#fef3c7', r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Summary */}
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
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Taxa de Ativação</p>
              <p className="text-2xl font-bold text-emerald-500 mt-1">
                {stats ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
              </p>
            </div>
            <div className="relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/5 border border-blue-500/20">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Média Contatos/Lista</p>
              <p className="text-2xl font-bold text-blue-500 mt-1">
                {stats && stats.totalLists > 0 ? Math.round(stats.totalContacts / stats.totalLists) : 0}
              </p>
            </div>
            <div className="relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-cyan-500/10 to-sky-500/5 border border-cyan-500/20">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Conexões/Usuário</p>
              <p className="text-2xl font-bold text-cyan-500 mt-1">
                {stats && stats.totalUsers > 0 ? (stats.totalConnections / stats.totalUsers).toFixed(1) : 0}
              </p>
            </div>
            <div className="relative overflow-hidden p-5 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/5 border border-orange-500/20">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Disparos/Dia</p>
              <p className="text-2xl font-bold text-orange-500 mt-1">
                {stats ? Math.round(stats.disparosThisMonth / 30) : 0}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-border/40 bg-card overflow-hidden">
        <CardHeader className="pb-2 border-b border-border/30">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-500/10">
              <Users className="w-4 h-4 text-violet-500" />
            </div>
            Todos os Usuários
            <span className="text-muted-foreground font-normal text-xs ml-2">
              {usersWithPlans.length} usuários encontrados
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-border/30 bg-muted/30">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider">Usuário</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Plano</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Vencimento</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Dias Restantes</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-center">Criado em</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersWithPlans.slice(0, 15).map((user) => {
                  const expStatus = getExpirationStatus(user.dataValidade);
                  return (
                    <TableRow key={user.id} className="border-border/20 hover:bg-muted/30 transition-colors">
                      <TableCell className="py-3">
                        <p className="text-sm font-semibold">{user.nome || 'Sem nome'}</p>
                        <p className="text-[11px] text-muted-foreground">{user.Email}</p>
                      </TableCell>
                      <TableCell className="text-center py-3">
                        {user.plano_nome ? (
                          <Badge variant={user.status ? 'default' : 'secondary'} className={`text-[10px] font-semibold ${user.status ? 'bg-gradient-to-r from-primary to-primary/80' : ''}`}>
                            {user.plano_nome}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-3">
                        {user.dataValidade ? (
                          <span className={`text-xs font-medium ${expStatus.color}`}>
                            {format(new Date(user.dataValidade), 'dd/MM/yyyy')}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-3">
                        {expStatus.badge || <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-center py-3">
                        {user.status ? (
                          <Badge className="text-[10px] bg-emerald-500">Ativo</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Inativo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center py-3">
                        {user.created_at ? (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(user.created_at), 'dd/MM/yyyy')}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
