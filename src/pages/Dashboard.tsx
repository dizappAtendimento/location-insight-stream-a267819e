import { useState, useEffect, useMemo } from 'react';
import { FileText, Users, Mail, Phone, TrendingUp, Calendar, RefreshCw, BarChart3, AreaChart as AreaChartIcon, Send, Link2, Zap } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useExtractionHistory } from '@/hooks/useExtractionHistory';
import { format, subDays, startOfDay } from 'date-fns';
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
  const { user } = useAuth();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('7');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState<'extrator' | 'disparo'>('extrator');
  
  // Extraction stats from localStorage
  const { history, getStats } = useExtractionHistory();
  
  // Calculate stats based on period filter
  const extractionStats = useMemo(() => {
    const baseStats = getStats();
    const start = startOfDay(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    // Filter history by date range
    const filteredHistory = history.filter(r => {
      const recordDate = new Date(r.createdAt);
      return recordDate >= start && recordDate <= end;
    });
    
    return {
      totalExtractions: filteredHistory.length,
      todayExtractions: baseStats.todayExtractions,
      totalLeads: filteredHistory.reduce((acc, r) => acc + r.totalResults, 0),
      todayLeads: baseStats.todayLeads,
      totalEmails: filteredHistory.reduce((acc, r) => acc + r.emailsFound, 0),
      totalPhones: filteredHistory.reduce((acc, r) => acc + r.phonesFound, 0),
    };
  }, [history, startDate, endDate, getStats]);
  
  // Chart data from localStorage
  const extractionChartData = useMemo(() => {
    const start = startOfDay(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    // Create date buckets
    const daysBetween = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const chartData: { date: string; extractions: number; leads: number }[] = [];
    
    for (let i = 0; i <= daysBetween; i++) {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateStr = format(date, 'dd/MM');
      
      const dayRecords = history.filter(r => {
        const recordDate = new Date(r.createdAt);
        return format(recordDate, 'dd/MM/yyyy') === format(date, 'dd/MM/yyyy');
      });
      
      chartData.push({
        date: dateStr,
        extractions: dayRecords.length,
        leads: dayRecords.reduce((acc, r) => acc + r.totalResults, 0),
      });
    }
    
    return chartData;
  }, [history, startDate, endDate]);
  
  const recentExtractions = history.slice(0, 5);
  const loadingExtraction = false;
  
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

  const handlePeriodChange = (period: PeriodFilter) => {
    setPeriodFilter(period);
    if (period !== 'custom') {
      const days = parseInt(period);
      setStartDate(subDays(new Date(), days));
      setEndDate(new Date());
    }
  };

  const handleRefresh = () => {
    // localStorage data is reactive, just trigger re-render via period change
    handlePeriodChange(periodFilter);
  };

  const displayedExtractions = recentExtractions;

  const typeLabels: Record<string, string> = { instagram: 'Instagram', linkedin: 'LinkedIn', places: 'Google Places', 'whatsapp-groups': 'WhatsApp' };
  const typeColors: Record<string, string> = { instagram: 'text-pink-500', linkedin: 'text-[#0A66C2]', places: 'text-green-500', 'whatsapp-groups': 'text-[#25D366]' };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header with filters */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 opacity-0 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <div className="space-y-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground text-sm lg:text-base">
              Acompanhe suas métricas e performance em tempo real
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={loadingExtraction || loadingDisparo}
            className="w-fit"
          >
            <RefreshCw className={cn("w-4 h-4", (loadingExtraction || loadingDisparo) && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        {/* Period Filters */}
        <div className="flex flex-wrap items-center gap-4 opacity-0 animate-fade-in" style={{ animationDelay: '50ms' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Período</span>
            <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl border border-border/30">
              {(['7', '14', '30'] as const).map((period) => (
                <Button
                  key={period}
                  variant={periodFilter === period ? 'highlight' : 'ghost'}
                  size="sm"
                  onClick={() => handlePeriodChange(period)}
                  className={cn(
                    "min-w-[72px] h-8 text-xs font-medium",
                    periodFilter !== period && "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {period} dias
                </Button>
              ))}
            </div>
          </div>

          <div className="h-6 w-px bg-border/50 hidden sm:block" />

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Data Inicial</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="min-w-[140px] justify-start h-9 font-normal">
                    <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
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
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Data Final</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="min-w-[140px] justify-start h-9 font-normal">
                    <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
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

          <TabsContent value="extrator" className="space-y-8 mt-8">
            {/* Stats Grid */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total de Extrações"
                value={extractionStats.totalExtractions}
                icon={FileText}
                trend={`+${extractionStats.todayExtractions} hoje`}
                trendPositive={extractionStats.todayExtractions > 0}
                accentColor="primary"
                delay={100}
              />
              <StatCard
                title="Total de Leads"
                value={extractionStats.totalLeads}
                icon={Users}
                trend={`+${extractionStats.todayLeads} hoje`}
                trendPositive={extractionStats.todayLeads > 0}
                accentColor="success"
                delay={150}
              />
              <StatCard
                title="Emails Encontrados"
                value={extractionStats.totalEmails}
                icon={Mail}
                accentColor="info"
                delay={200}
              />
              <StatCard
                title="Telefones Encontrados"
                value={extractionStats.totalPhones}
                icon={Phone}
                accentColor="success"
                delay={250}
              />
            </div>

            {/* Chart */}
            <Card className="opacity-0 animate-fade-in-up overflow-hidden" style={{ animationDelay: '300ms' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                    </div>
                    Extrações por Dia
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Evolução das extrações e leads no período
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/30">
                  <Button
                    variant={chartType === 'area' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setChartType('area')}
                    className={cn(
                      "h-8 px-3 text-xs rounded-lg",
                      chartType === 'area' && "bg-card shadow-sm border border-border/50"
                    )}
                  >
                    <AreaChartIcon className="w-3.5 h-3.5 mr-1.5" />
                    Área
                  </Button>
                  <Button
                    variant={chartType === 'bar' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setChartType('bar')}
                    className={cn(
                      "h-8 px-3 text-xs rounded-lg",
                      chartType === 'bar' && "bg-card shadow-sm border border-border/50"
                    )}
                  >
                    <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
                    Barras
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'area' ? (
                      <AreaChart data={extractionChartData} margin={{ top: 20, right: 20, left: -10, bottom: 10 }}>
                        <defs>
                          <linearGradient id="colorExtractions" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(160 70% 45%)" stopOpacity={0.4}/>
                            <stop offset="100%" stopColor="hsl(160 70% 45%)" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity={0.25}/>
                            <stop offset="100%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          stroke="hsl(var(--border))" 
                          opacity={0.4}
                          vertical={false}
                        />
                        <XAxis 
                          dataKey="date" 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          dx={-5}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                            boxShadow: '0 8px 30px -6px rgba(0,0,0,0.2)',
                            padding: '12px 16px',
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: '8px' }}
                          itemStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '13px' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="leads"
                          name="Leads"
                          stroke="hsl(160 70% 45%)"
                          strokeWidth={2.5}
                          fill="url(#colorExtractions)"
                          dot={false}
                          activeDot={{ r: 6, stroke: 'hsl(var(--background))', strokeWidth: 2 }}
                        />
                      </AreaChart>
                    ) : (
                      <BarChart data={extractionChartData} margin={{ top: 20, right: 20, left: -10, bottom: 10 }}>
                        <CartesianGrid 
                          strokeDasharray="3 3" 
                          stroke="hsl(var(--border))" 
                          opacity={0.4}
                          vertical={false}
                        />
                        <XAxis 
                          dataKey="date" 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          dy={10}
                        />
                        <YAxis 
                          stroke="hsl(var(--muted-foreground))" 
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          dx={-5}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                            boxShadow: '0 8px 30px -6px rgba(0,0,0,0.2)',
                            padding: '12px 16px',
                          }}
                          labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600, marginBottom: '8px' }}
                          itemStyle={{ color: 'hsl(var(--muted-foreground))', fontSize: '13px' }}
                          cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2, radius: 4 }}
                        />
                        <Bar
                          dataKey="extractions"
                          name="Extrações"
                          fill="hsl(var(--primary))"
                          radius={[6, 6, 0, 0]}
                        />
                        <Bar
                          dataKey="leads"
                          name="Leads"
                          fill="hsl(160 70% 45%)"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Recent Extractions */}
            <Card className="opacity-0 animate-fade-in-up overflow-hidden" style={{ animationDelay: '350ms' }}>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  </div>
                  Extrações Recentes
                </CardTitle>
                <CardDescription className="text-xs">
                  Últimas extrações no período selecionado
                </CardDescription>
              </CardHeader>
              <CardContent>
                {displayedExtractions.length > 0 ? (
                  <div className="space-y-3">
                    {displayedExtractions.map((record, index) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/30 hover:border-border/60 hover:bg-muted/40 transition-all duration-300 opacity-0 animate-fade-in"
                        style={{ animationDelay: `${400 + index * 50}ms` }}
                      >
                        <div className="flex items-center gap-4">
                          <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-card border border-border/50 ${typeColors[record.type]}`}>
                            {typeLabels[record.type]}
                          </span>
                          <div>
                            <p className="font-medium text-foreground text-sm">{record.segment}</p>
                            {record.location && (
                              <p className="text-xs text-muted-foreground mt-0.5">{record.location}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center min-w-[50px]">
                            <p className="font-bold text-emerald-500 text-base">{record.totalResults}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">leads</p>
                          </div>
                          <div className="text-center min-w-[50px]">
                            <p className="font-semibold text-foreground">{record.emailsFound}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">emails</p>
                          </div>
                          <div className="text-center min-w-[50px]">
                            <p className="font-semibold text-foreground">{record.phonesFound}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">tel</p>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground min-w-[90px]">
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
                  <div className="text-center py-16 text-muted-foreground">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
                      <FileText className="w-8 h-8 opacity-40" />
                    </div>
                    <p className="font-medium">Nenhuma extração no período selecionado</p>
                    <p className="text-sm mt-1">Comece usando um dos extratores</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Disparo Tab */}
          <TabsContent value="disparo" className="space-y-8 mt-8">
            {/* Stats Grid */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
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
