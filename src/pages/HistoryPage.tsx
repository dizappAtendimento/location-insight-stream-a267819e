import { useState, useMemo, useEffect } from 'react';
import { History, Trash2, Calendar, Instagram, Linkedin, MapPin, Search, Filter, Users, Mail, Phone, Sparkles, Download, FileSpreadsheet, MessageCircle, FileDown, Database, RefreshCw, Send } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type TypeFilter = 'all' | 'instagram' | 'linkedin' | 'places' | 'whatsapp-groups';
type PeriodFilter = '7' | '14' | '30' | 'all' | 'custom';

interface ExtractionRecord {
  id: string;
  type: 'instagram' | 'linkedin' | 'places' | 'whatsapp-groups';
  segment: string;
  location?: string;
  totalResults: number;
  emailsFound: number;
  phonesFound: number;
  createdAt: string;
  status?: string;
}

interface DisparoRecord {
  id: number;
  created_at: string;
  TipoDisparo: string;
  TotalDisparos: number;
  MensagensDisparadas: number;
  StatusDisparo: string;
  idListas: number[];
}

const HistoryPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'extracao' | 'disparo'>('extracao');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(new Date());
  
  // Extraction data from database
  const [extractionHistory, setExtractionHistory] = useState<ExtractionRecord[]>([]);
  const [loadingExtraction, setLoadingExtraction] = useState(false);
  
  // Disparo data from database
  const [disparoHistory, setDisparoHistory] = useState<DisparoRecord[]>([]);
  const [loadingDisparo, setLoadingDisparo] = useState(false);

  // Fetch extraction history from database
  const fetchExtractionHistory = async () => {
    if (!user?.id) return;
    
    setLoadingExtraction(true);
    try {
      // Use a very wide date range to get all historical data
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const startDateISO = oneYearAgo.toISOString();
      const endDateISO = new Date().toISOString();
      
      console.log('[HistoryPage] Fetching extraction history:', { startDateISO, endDateISO, userId: user.id });
      
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { 
          action: 'get-extraction-stats', 
          userId: user.id,
          startDate: startDateISO,
          endDate: endDateISO
        }
      });
      
      if (error) {
        console.error('[HistoryPage] Error invoking function:', error);
        throw error;
      }

      console.log('[HistoryPage] Received data:', data);

      if (data?.history) {
        setExtractionHistory(data.history);
        console.log('[HistoryPage] Set extraction history:', data.history.length, 'records');
      }
    } catch (error) {
      console.error('[HistoryPage] Error fetching extraction history:', error);
    } finally {
      setLoadingExtraction(false);
    }
  };

  // Fetch disparo history from database
  const fetchDisparoHistory = async () => {
    if (!user?.id) return;
    
    setLoadingDisparo(true);
    try {
      const { data, error } = await supabase.functions.invoke('disparos-api', {
        body: { 
          action: 'get-disparos', 
          userId: user.id
        }
      });
      
      if (error) throw error;

      if (data?.disparos) {
        setDisparoHistory(data.disparos);
      }
    } catch (error) {
      console.error('Error fetching disparo history:', error);
    } finally {
      setLoadingDisparo(false);
    }
  };

  useEffect(() => {
    fetchExtractionHistory();
    fetchDisparoHistory();
  }, [user?.id]);

  const typeLabels: Record<string, string> = {
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    places: 'Google Places',
    'whatsapp-groups': 'WhatsApp',
  };

  const typeIcons: Record<string, any> = {
    instagram: Instagram,
    linkedin: Linkedin,
    places: MapPin,
    'whatsapp-groups': MessageCircle,
  };

  const typeColors: Record<string, string> = {
    instagram: 'bg-gradient-to-br from-pink-500 to-purple-600',
    linkedin: 'bg-[#0A66C2]',
    places: 'bg-gradient-to-br from-emerald-500 to-green-600',
    'whatsapp-groups': 'bg-[#25D366]',
  };

  const typeBadgeColors: Record<string, string> = {
    instagram: 'bg-pink-500/10 text-pink-500',
    linkedin: 'bg-[#0A66C2]/10 text-[#0A66C2]',
    places: 'bg-emerald-500/10 text-emerald-500',
    'whatsapp-groups': 'bg-[#25D366]/10 text-[#25D366]',
  };

  const filteredHistory = useMemo(() => {
    return extractionHistory.filter((record) => {
      // Type filter
      if (typeFilter !== 'all' && record.type !== typeFilter) return false;
      
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!record.segment.toLowerCase().includes(search) && 
            !(record.location?.toLowerCase().includes(search))) {
          return false;
        }
      }
      
      // Period filter
      if (periodFilter !== 'all') {
        const recordDate = new Date(record.createdAt);
        if (periodFilter === 'custom') {
          const start = startOfDay(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (recordDate < start || recordDate > end) return false;
        } else {
          const days = parseInt(periodFilter);
          const cutoff = subDays(new Date(), days);
          if (recordDate < cutoff) return false;
        }
      }
      
      return true;
    });
  }, [extractionHistory, typeFilter, searchTerm, periodFilter, startDate, endDate]);

  const filteredDisparos = useMemo(() => {
    return disparoHistory.filter((record) => {
      // Period filter
      if (periodFilter !== 'all') {
        const recordDate = new Date(record.created_at);
        if (periodFilter === 'custom') {
          const start = startOfDay(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          if (recordDate < start || recordDate > end) return false;
        } else {
          const days = parseInt(periodFilter);
          const cutoff = subDays(new Date(), days);
          if (recordDate < cutoff) return false;
        }
      }
      
      return true;
    });
  }, [disparoHistory, periodFilter, startDate, endDate]);

  const stats = useMemo(() => {
    return {
      total: filteredHistory.length,
      leads: filteredHistory.reduce((acc, r) => acc + r.totalResults, 0),
      emails: filteredHistory.reduce((acc, r) => acc + r.emailsFound, 0),
      phones: filteredHistory.reduce((acc, r) => acc + r.phonesFound, 0),
    };
  }, [filteredHistory]);

  const disparoStats = useMemo(() => {
    return {
      total: filteredDisparos.length,
      mensagens: filteredDisparos.reduce((acc, r) => acc + (r.MensagensDisparadas || 0), 0),
      finalizados: filteredDisparos.filter(r => r.StatusDisparo === 'Finalizado').length,
      emAndamento: filteredDisparos.filter(r => r.StatusDisparo === 'Em andamento').length,
    };
  }, [filteredDisparos]);

  const handleClearHistory = () => {
    // Now we only show a message since data is in database
    toast({
      title: "Histórico",
      description: "Os dados de extração são armazenados no banco de dados",
    });
  };

  const handlePeriodChange = (period: PeriodFilter) => {
    setPeriodFilter(period);
    if (period !== 'custom' && period !== 'all') {
      const days = parseInt(period);
      setStartDate(subDays(new Date(), days));
      setEndDate(new Date());
    }
  };

  const handleRefresh = () => {
    fetchExtractionHistory();
    fetchDisparoHistory();
  };

  const exportToExcel = (records: ExtractionRecord[], filename: string) => {
    const data = records.map(r => ({
      'Tipo': typeLabels[r.type],
      'Segmento': r.segment,
      'Localização': r.location || '-',
      'Leads': r.totalResults,
      'Emails': r.emailsFound,
      'Telefones': r.phonesFound,
      'Data': format(new Date(r.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Histórico');
    XLSX.writeFile(wb, `${filename}.xlsx`);
    
    toast({
      title: "Exportado com sucesso",
      description: `${records.length} registros exportados para Excel`,
    });
  };

  const exportDisparosToExcel = (records: DisparoRecord[], filename: string) => {
    const data = records.map(r => ({
      'Tipo': r.TipoDisparo,
      'Total': r.TotalDisparos,
      'Disparadas': r.MensagensDisparadas,
      'Status': r.StatusDisparo,
      'Data': format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Disparos');
    XLSX.writeFile(wb, `${filename}.xlsx`);
    
    toast({
      title: "Exportado com sucesso",
      description: `${records.length} disparos exportados para Excel`,
    });
  };

  const handleDeleteRecord = (recordId: string) => {
    // Database records cannot be deleted from frontend
    toast({
      title: "Informação",
      description: "Os registros são armazenados permanentemente no banco de dados",
    });
  };

  const handleExportAll = () => {
    if (filteredHistory.length === 0) {
      toast({
        title: "Nenhum registro",
        description: "Não há registros para exportar",
        variant: "destructive",
      });
      return;
    }
    exportToExcel(filteredHistory, `historico_extracoes_${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const handleExportSingle = (record: ExtractionRecord) => {
    exportToExcel([record], `extração_${record.segment.replace(/\s+/g, '_')}_${format(new Date(record.createdAt), 'yyyy-MM-dd')}`);
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="opacity-0 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-lg shadow-primary/20">
                <History className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Histórico</h1>
                <p className="text-muted-foreground text-sm">Visualize todas as suas extrações</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {filteredHistory.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExportAll} className="text-primary hover:text-primary">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              )}
              {extractionHistory.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleClearHistory} className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 opacity-0 animate-fade-in" style={{ animationDelay: '50ms' }}>
          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Extrações</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Users className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.leads}</p>
                  <p className="text-xs text-muted-foreground">Leads</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Mail className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.emails}</p>
                  <p className="text-xs text-muted-foreground">Emails</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Phone className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.phones}</p>
                  <p className="text-xs text-muted-foreground">Telefones</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="opacity-0 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="w-4 h-4" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar por segmento ou localização..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Type Filter */}
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="linkedin">LinkedIn</SelectItem>
                  <SelectItem value="places">Google Places</SelectItem>
                  <SelectItem value="whatsapp-groups">WhatsApp</SelectItem>
                </SelectContent>
              </Select>

              {/* Period Filter */}
              <div className="flex items-center gap-1">
                {(['7', '14', '30', 'all'] as const).map((period) => (
                  <Button
                    key={period}
                    variant={periodFilter === period ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handlePeriodChange(period)}
                    className="min-w-[60px]"
                  >
                    {period === 'all' ? 'Todos' : `${period}d`}
                  </Button>
                ))}
              </div>

              {/* Custom Date Range */}
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn(periodFilter === 'custom' && 'border-primary')}>
                      <Calendar className="w-4 h-4 mr-2" />
                      {periodFilter === 'custom' 
                        ? `${format(startDate, "dd/MM")} - ${format(endDate, "dd/MM")}`
                        : 'Personalizado'
                      }
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border-border z-50" align="end">
                    <div className="p-3 space-y-3">
                      <p className="text-sm font-medium">Selecione o período</p>
                      <div className="flex gap-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Início</p>
                          <CalendarComponent
                            mode="single"
                            selected={startDate}
                            onSelect={(date) => { if (date) { setStartDate(date); setPeriodFilter('custom'); }}}
                            className="pointer-events-auto"
                          />
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Fim</p>
                          <CalendarComponent
                            mode="single"
                            selected={endDate}
                            onSelect={(date) => { if (date) { setEndDate(date); setPeriodFilter('custom'); }}}
                            className="pointer-events-auto"
                          />
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results List */}
        <Card className="opacity-0 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Extrações
            </CardTitle>
            <CardDescription>
              {filteredHistory.length} de {extractionHistory.length} extrações
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredHistory.length > 0 ? (
              <div className="space-y-2">
                {filteredHistory.map((record, index) => {
                  const TypeIcon = typeIcons[record.type];
                  return (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border border-border/50 hover:border-primary/30 hover:bg-secondary/50 transition-all duration-200"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-sm", typeColors[record.type])}>
                          <TypeIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{record.segment}</p>
                            <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", typeBadgeColors[record.type])}>
                              {typeLabels[record.type]}
                            </span>
                          </div>
                          {record.location && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" />
                              {record.location}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-center min-w-[50px]">
                          <p className="font-bold text-primary">{record.totalResults}</p>
                          <p className="text-xs text-muted-foreground">leads</p>
                        </div>
                        <div className="text-center min-w-[40px]">
                          <p className="font-semibold text-foreground">{record.emailsFound}</p>
                          <p className="text-xs text-muted-foreground">emails</p>
                        </div>
                        <div className="text-center min-w-[40px]">
                          <p className="font-semibold text-foreground">{record.phonesFound}</p>
                          <p className="text-xs text-muted-foreground">tel</p>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground min-w-[110px]">
                          <Calendar className="w-3 h-3" />
                          <span className="text-xs">
                            {format(new Date(record.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleExportSingle(record)}
                            className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                            title="Baixar dados"
                          >
                            <FileDown className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteRecord(record.id)}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Remover extração"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <History className="w-8 h-8 text-primary/50" />
                </div>
                <p className="text-muted-foreground font-medium">
                  {extractionHistory.length === 0 ? 'Nenhuma extração registrada' : 'Nenhum resultado encontrado'}
                </p>
                <p className="text-muted-foreground/70 text-sm mt-1">
                  {extractionHistory.length === 0 
                    ? 'O histórico aparecerá aqui após realizar extrações'
                    : 'Tente ajustar os filtros'
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default HistoryPage;