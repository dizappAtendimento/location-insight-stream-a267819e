import { useState, useMemo, useEffect } from 'react';
import { FileText, Users, Mail, Phone, TrendingUp, Calendar, RefreshCw, BarChart3, AreaChart as AreaChartIcon, Send, Link2, Zap } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useExtractionHistory } from '@/hooks/useExtractionHistory';
import { format, subDays, isAfter, startOfDay, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, BarChart, Bar } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type PeriodFilter = '7' | '14' | '30' | 'custom';
type ChartType = 'area' | 'bar';

interface DisparoStats {
  totalDisparos: number;
  conexoesAtivas: number;
  totalConexoes: number;
  mediaPorConexao: number;
}

interface DisparoChartData {
  date: string;
  disparos: number;
}

const Dashboard = () => {
  const { history } = useExtractionHistory();
  const { user } = useAuth();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('7');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'extrator' | 'disparo'>('extrator');
  
  // Disparo stats
  const [disparoStats, setDisparoStats] = useState<DisparoStats>({
    totalDisparos: 0,
    conexoesAtivas: 0,
    totalConexoes: 0,
    mediaPorConexao: 0
  });
  const [disparoChartData, setDisparoChartData] = useState<DisparoChartData[]>([]);
  const [loadingDisparo, setLoadingDisparo] = useState(false);

  // Fetch disparo stats via edge function (bypasses RLS)
  useEffect(() => {
    const fetchDisparoStats = async () => {
      if (!user?.id) return;
      
      setLoadingDisparo(true);
      try {
        const startISO = startDate.toISOString();
        const endISO = new Date(endDate.setHours(23, 59, 59, 999)).toISOString();
        
        const { data, error } = await supabase.functions.invoke('admin-api', {
          body: { 
            action: 'get-dashboard-stats', 
            userId: user.id,
            startDate: startISO,
            endDate: endISO
          }
        });
        
        if (error) throw error;

        if (data?.stats) {
          setDisparoStats(data.stats);
        }

        if (data?.chartData) {
          setDisparoChartData(data.chartData);
        }
      } catch (error) {
        console.error('Error fetching disparo stats:', error);
      } finally {
        setLoadingDisparo(false);
      }
    };

    fetchDisparoStats();
  }, [user?.id, startDate, endDate]);

  const filteredHistory = useMemo(() => {
    const start = startOfDay(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return history.filter(record => {
      const recordDate = new Date(record.createdAt);
      return recordDate >= start && recordDate <= end;
    });
  }, [history, startDate, endDate]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayRecords = filteredHistory.filter(r => isAfter(new Date(r.createdAt), today));
    
    return {
      totalExtractions: filteredHistory.length,
      todayExtractions: todayRecords.length,
      totalLeads: filteredHistory.reduce((acc, r) => acc + r.totalResults, 0),
      todayLeads: todayRecords.reduce((acc, r) => acc + r.totalResults, 0),
      totalEmails: filteredHistory.reduce((acc, r) => acc + r.emailsFound, 0),
      totalPhones: filteredHistory.reduce((acc, r) => acc + r.phonesFound, 0),
    };
  }, [filteredHistory]);

  const chartData = useMemo(() => {
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayRecords = filteredHistory.filter(r => {
        const recordDate = new Date(r.createdAt);
        return recordDate >= dayStart && recordDate <= dayEnd;
      });
      
      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        extractions: dayRecords.length,
        leads: dayRecords.reduce((acc, r) => acc + r.totalResults, 0),
      };
    });
  }, [filteredHistory, startDate, endDate]);

  const handlePeriodChange = (period: PeriodFilter) => {
    setPeriodFilter(period);
    if (period !== 'custom') {
      const days = parseInt(period);
      setStartDate(subDays(new Date(), days));
      setEndDate(new Date());
    }
  };

  const recentExtractions = filteredHistory.slice(0, 5);

  const typeLabels = { instagram: 'Instagram', linkedin: 'LinkedIn', places: 'Google Places' };
  const typeColors = { instagram: 'text-pink-500', linkedin: 'text-[#0A66C2]', places: 'text-green-500' };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header with filters */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 opacity-0 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">
              Acompanhe suas métricas e performance em tempo real
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => handlePeriodChange(periodFilter)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>

        {/* Period Filters */}
        <div className="flex flex-wrap items-center gap-3 opacity-0 animate-fade-in" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground mr-2">Período</span>
            {(['7', '14', '30'] as const).map((period) => (
              <Button
                key={period}
                variant={periodFilter === period ? 'default' : 'outline'}
                size="sm"
                onClick={() => handlePeriodChange(period)}
                className={cn(
                  "min-w-[70px]",
                  periodFilter === period && "bg-highlight text-highlight-foreground hover:bg-highlight/90"
                )}
              >
                {period} dias
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Data Inicial</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-[130px] justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  {format(startDate, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border z-50" align="start">
                <CalendarComponent
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => { if (date) { setStartDate(date); setPeriodFilter('custom'); }}}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <span className="text-sm text-muted-foreground">Data Final</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="min-w-[130px] justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  {format(endDate, "dd/MM/yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-card border-border z-50" align="start">
                <CalendarComponent
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => { if (date) { setEndDate(date); setPeriodFilter('custom'); }}}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Tabs for Extrator and Disparo */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'extrator' | 'disparo')} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="extrator" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Extrator
            </TabsTrigger>
            <TabsTrigger value="disparo" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Disparo
            </TabsTrigger>
          </TabsList>

          {/* Extrator Tab */}
          <TabsContent value="extrator" className="space-y-6 mt-6">
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total de Extrações"
                value={stats.totalExtractions}
                icon={FileText}
                trend={`+${stats.todayExtractions} hoje`}
                trendPositive={stats.todayExtractions > 0}
                accentColor="primary"
                delay={100}
              />
              <StatCard
                title="Total de Leads"
                value={stats.totalLeads}
                icon={Users}
                trend={`+${stats.todayLeads} hoje`}
                trendPositive={stats.todayLeads > 0}
                accentColor="success"
                delay={150}
              />
              <StatCard
                title="Emails Encontrados"
                value={stats.totalEmails}
                icon={Mail}
                accentColor="info"
                delay={200}
              />
              <StatCard
                title="Telefones Encontrados"
                value={stats.totalPhones}
                icon={Phone}
                accentColor="success"
                delay={250}
              />
            </div>

            {/* Chart */}
            <Card className="opacity-0 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Extrações por Dia
                  </CardTitle>
                  <CardDescription>
                    Evolução das extrações e leads no período
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg">
                  <Button
                    variant={chartType === 'area' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setChartType('area')}
                    className="h-8 px-3"
                  >
                    <AreaChartIcon className="w-4 h-4 mr-1" />
                    Área
                  </Button>
                  <Button
                    variant={chartType === 'bar' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setChartType('bar')}
                    className="h-8 px-3"
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Barras
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'area' ? (
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorExtractions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="extractions"
                          name="Extrações"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                          fill="url(#colorExtractions)"
                        />
                        <Area
                          type="monotone"
                          dataKey="leads"
                          name="Leads"
                          stroke="#10b981"
                          strokeWidth={2}
                          fill="url(#colorLeads)"
                        />
                      </AreaChart>
                    ) : (
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))' }}
                          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                        />
                        <Bar
                          dataKey="extractions"
                          name="Extrações"
                          fill="hsl(var(--primary))"
                          radius={[4, 4, 0, 0]}
                        />
                        <Bar
                          dataKey="leads"
                          name="Leads"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Extractions */}
            <Card className="opacity-0 animate-fade-in-up" style={{ animationDelay: '350ms' }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Extrações Recentes
                </CardTitle>
                <CardDescription>
                  Últimas extrações no período selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentExtractions.length > 0 ? (
                  <div className="space-y-3">
                    {recentExtractions.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border/50 hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded bg-secondary ${typeColors[record.type]}`}>
                            {typeLabels[record.type]}
                          </span>
                          <div>
                            <p className="font-medium text-foreground">{record.segment}</p>
                            {record.location && (
                              <p className="text-sm text-muted-foreground">{record.location}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <p className="font-semibold text-primary">{record.totalResults}</p>
                            <p className="text-xs text-muted-foreground">leads</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-foreground">{record.emailsFound}</p>
                            <p className="text-xs text-muted-foreground">emails</p>
                          </div>
                          <div className="text-center">
                            <p className="font-semibold text-foreground">{record.phonesFound}</p>
                            <p className="text-xs text-muted-foreground">telefones</p>
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground min-w-[90px]">
                            <Calendar className="w-3 h-3" />
                            <span className="text-xs">
                              {format(new Date(record.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Nenhuma extração no período selecionado</p>
                    <p className="text-sm">Comece usando um dos extratores</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Disparo Tab */}
          <TabsContent value="disparo" className="space-y-6 mt-6">
            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total de Disparos"
                value={disparoStats.totalDisparos}
                icon={Send}
                trend="+0% vs período anterior"
                trendPositive={true}
                accentColor="primary"
                delay={100}
              />
              <StatCard
                title="Conexões Ativas"
                value={disparoStats.conexoesAtivas}
                icon={Link2}
                trend="+0% vs período anterior"
                trendPositive={true}
                accentColor="success"
                delay={150}
              />
              <StatCard
                title="Total de Conexões"
                value={disparoStats.totalConexoes}
                icon={Link2}
                trend="+0% vs período anterior"
                trendPositive={true}
                accentColor="info"
                delay={200}
              />
              <StatCard
                title="Média por Conexão"
                value={disparoStats.mediaPorConexao}
                icon={Zap}
                trend="+0% vs período anterior"
                trendPositive={true}
                accentColor="success"
                delay={250}
              />
            </div>

            {/* Chart */}
            <Card className="opacity-0 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Disparos por Dia
                  </CardTitle>
                  <CardDescription>
                    Acompanhe a evolução dos seus disparos ao longo do tempo
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg">
                  <Button
                    variant={chartType === 'area' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setChartType('area')}
                    className="h-8 px-3"
                  >
                    <AreaChartIcon className="w-4 h-4 mr-1" />
                    Área
                  </Button>
                  <Button
                    variant={chartType === 'bar' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setChartType('bar')}
                    className="h-8 px-3"
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Barras
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  {loadingDisparo ? (
                    <div className="flex items-center justify-center h-full">
                      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      {chartType === 'area' ? (
                        <AreaChart data={disparoChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="colorDisparos" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
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
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                          />
                          <Area
                            type="monotone"
                            dataKey="disparos"
                            name="Disparos"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            fill="url(#colorDisparos)"
                          />
                        </AreaChart>
                      ) : (
                        <BarChart data={disparoChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                            }}
                            labelStyle={{ color: 'hsl(var(--foreground))' }}
                            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                          />
                          <Bar
                            dataKey="disparos"
                            name="Disparos"
                            fill="hsl(var(--primary))"
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
