import { useState, useMemo } from 'react';
import { FileText, Users, Mail, Phone, TrendingUp, Calendar, RefreshCw } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useExtractionHistory } from '@/hooks/useExtractionHistory';
import { format, subDays, isAfter, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

type PeriodFilter = '7' | '14' | '30' | 'custom';

const Dashboard = () => {
  const { history } = useExtractionHistory();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('7');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(new Date());

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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
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
        <div className="flex flex-wrap items-center gap-3">
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
                  periodFilter === period && "bg-primary text-primary-foreground"
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

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total de Extrações"
            value={stats.totalExtractions}
            icon={FileText}
            trend={`+${stats.todayExtractions} hoje`}
            trendPositive={stats.todayExtractions > 0}
          />
          <StatCard
            title="Total de Leads"
            value={stats.totalLeads}
            icon={Users}
            trend={`+${stats.todayLeads} hoje`}
            trendPositive={stats.todayLeads > 0}
          />
          <StatCard
            title="Emails Encontrados"
            value={stats.totalEmails}
            icon={Mail}
          />
          <StatCard
            title="Telefones Encontrados"
            value={stats.totalPhones}
            icon={Phone}
          />
        </div>

        {/* Recent Extractions */}
        <Card>
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
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
