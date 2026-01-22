import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Trash2, Calendar, Instagram, Linkedin, MapPin, Search, Filter, Users, Mail, Phone, Sparkles, FileSpreadsheet, MessageCircle, Send, MoreVertical, Play, Pause, Trash2 as TrashIcon, RefreshCw, Eye, Clock, Pencil } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExtractionHistory, ExtractionRecord } from '@/hooks/useExtractionHistory';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getFromCache, setToCache, getCacheKey } from '@/hooks/useDataPreloader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type TypeFilter = 'all' | 'instagram' | 'linkedin' | 'places' | 'whatsapp-groups';
type PeriodFilter = '7' | '14' | '30' | 'all' | 'custom';

interface Disparo {
  id: number;
  created_at: string;
  TipoDisparo: string | null;
  StatusDisparo: string | null;
  TotalDisparos: number | null;
  MensagensDisparadas: number | null;
  DataAgendamento: string | null;
  intervaloMin: number | null;
  intervaloMax: number | null;
  PausaAposMensagens: number | null;
  PausaMinutos: number | null;
  StartTime: string | null;
  EndTime: string | null;
  DiasSelecionados: number[] | null;
}

const HistoricoPage = () => {
  const navigate = useNavigate();
  const { history, clearHistory, deleteRecord, getResults } = useExtractionHistory();
  const { toast: toastUI } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'extracao' | 'disparo'>('extracao');
  
  // Extraction state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(new Date());

  // Disparo state
  const [disparos, setDisparos] = useState<Disparo[]>([]);
  const [loadingDisparos, setLoadingDisparos] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tipoDisparoFilter, setTipoDisparoFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDisparo, setSelectedDisparo] = useState<Disparo | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [editDateDialogOpen, setEditDateDialogOpen] = useState(false);
  const [editingDisparo, setEditingDisparo] = useState<Disparo | null>(null);
  const [newDate, setNewDate] = useState<string>('');
  const [newTime, setNewTime] = useState<string>('');
  
  // Edit config state
  const [editIntervaloMin, setEditIntervaloMin] = useState<number>(30);
  const [editIntervaloMax, setEditIntervaloMax] = useState<number>(60);
  const [editPausaApos, setEditPausaApos] = useState<number>(20);
  const [editPausaMinutos, setEditPausaMinutos] = useState<number>(10);
  const [editStartTime, setEditStartTime] = useState<string>('08:00');
  const [editEndTime, setEditEndTime] = useState<string>('18:00');
  const [editDiasSelecionados, setEditDiasSelecionados] = useState<number[]>([1, 2, 3, 4, 5]);

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

  const typeIconColors: Record<string, string> = {
    instagram: 'text-instagram',
    linkedin: 'text-linkedin',
    places: 'text-places',
    'whatsapp-groups': 'text-whatsapp',
  };

  const typeBadgeColors: Record<string, string> = {
    instagram: 'bg-pink-500/10 text-pink-500',
    linkedin: 'bg-[#0A66C2]/10 text-[#0A66C2]',
    places: 'bg-emerald-500/10 text-emerald-500',
    'whatsapp-groups': 'bg-[#25D366]/10 text-[#25D366]',
  };

  // Fetch disparos with cache global
  const fetchDisparos = async (isBackground = false) => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('disparos-api', {
        body: { action: 'get-disparos', userId: user.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      const disparosData = data?.disparos || [];
      setDisparos(disparosData);
      
      // Save to global cache
      setToCache(getCacheKey('historico_disparos', user.id), disparosData);
    } catch (error) {
      console.error('Erro ao carregar disparos:', error);
      if (!isBackground) toast.error('Erro ao carregar histórico de disparos');
    } finally {
      if (!isBackground) {
        setLoadingDisparos(false);
        setRefreshing(false);
      }
    }
  };

  const loadDisparosWithCache = () => {
    if (!user?.id) return;
    
    const cached = getFromCache(getCacheKey('historico_disparos', user.id));
    
    if (cached) {
      setDisparos(cached);
      setLoadingDisparos(false);
      // Refresh in background
      fetchDisparos(true);
    } else {
      fetchDisparos(false);
    }
  };

  useEffect(() => {
    loadDisparosWithCache();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      if (activeTab === 'disparo') {
        fetchDisparos(true);
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [user?.id, activeTab]);

  const handleRefreshDisparos = () => {
    setRefreshing(true);
    fetchDisparos(false);
  };

  // Extraction filters
  const filteredHistory = useMemo(() => {
    return history.filter((record) => {
      if (typeFilter !== 'all' && record.type !== typeFilter) return false;
      
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        if (!record.segment.toLowerCase().includes(search) && 
            !(record.location?.toLowerCase().includes(search))) {
          return false;
        }
      }
      
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
  }, [history, typeFilter, searchTerm, periodFilter, startDate, endDate]);

  // Disparo filters
  const filteredDisparos = useMemo(() => {
    return disparos.filter((disparo) => {
      const tipoMatch = tipoDisparoFilter === 'todos' || 
        disparo.TipoDisparo?.toLowerCase() === tipoDisparoFilter.toLowerCase() ||
        (tipoDisparoFilter === 'grupo' && disparo.TipoDisparo?.toLowerCase() === 'grupos');
      const statusMatch = statusFilter === 'todos' || 
        disparo.StatusDisparo?.toLowerCase().replace(/ /g, '_') === statusFilter.toLowerCase() ||
        disparo.StatusDisparo?.toLowerCase() === statusFilter.toLowerCase().replace(/_/g, ' ');
      return tipoMatch && statusMatch;
    });
  }, [disparos, tipoDisparoFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: filteredHistory.length,
      leads: filteredHistory.reduce((acc, r) => acc + r.totalResults, 0),
      emails: filteredHistory.reduce((acc, r) => acc + r.emailsFound, 0),
      phones: filteredHistory.reduce((acc, r) => acc + r.phonesFound, 0),
    };
  }, [filteredHistory]);

  const handleClearHistory = () => {
    clearHistory();
    toastUI({
      title: 'Histórico limpo',
      description: 'Todo o histórico de extrações foi removido',
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

  const exportToExcel = (records: ExtractionRecord[], filename: string) => {
    const data = records.map(r => ({
      'Tipo': typeLabels[r.type],
      'Segmento': r.segment,
      'Localização': r.location || '-',
      'Leads': r.totalResults,
      'Emails': r.emailsFound,
      'Telefones': r.phonesFound,
      'Data': format(new Date(r.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Histórico');
    XLSX.writeFile(wb, `${filename}.xlsx`);
    
    toastUI({
      title: 'Exportado com sucesso',
      description: `${records.length} registros exportados para Excel`,
    });
  };

  const exportResultsToExcel = async (record: ExtractionRecord) => {
    toastUI({
      title: 'Carregando...',
      description: 'Buscando dados para exportação',
    });
    
    const results = await getResults(record.id);
    if (!results || results.length === 0) {
      toastUI({
        title: 'Sem dados',
        description: 'Não há dados salvos para esta extração',
        variant: 'destructive',
      });
      return;
    }

    let data: any[] = [];
    
    if (record.type === 'places') {
      data = results.map(r => ({
        'Nome': r.name || '',
        'Endereço': r.address || '',
        'Telefone': r.phone || '',
        'Email': r.email || '',
        'Website': r.website || '',
        'Avaliação': r.rating || '',
        'Reviews': r.reviews || '',
        'Categoria': r.category || '',
      }));
    } else if (record.type === 'instagram') {
      data = results.map(r => ({
        'Nome': r.name || '',
        'Username': r.username || '',
        'Bio': r.bio || '',
        'Email': r.email || '',
        'Telefone': r.phone || '',
        'Seguidores': r.followers || '',
        'Link': r.link || '',
      }));
    } else if (record.type === 'linkedin') {
      data = results.map(r => ({
        'Nome': r.name || '',
        'Título': r.title || '',
        'Empresa': r.company || '',
        'Localização': r.location || '',
        'Email': r.email || '',
        'Telefone': r.phone || '',
        'Link': r.link || '',
      }));
    } else if (record.type === 'whatsapp-groups') {
      data = results.map(r => ({
        'Nome do Grupo': r.name || '',
        'Descrição': r.description || '',
        'Link': r.link || '',
      }));
    } else {
      data = results;
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados');
    XLSX.writeFile(wb, `${record.segment.replace(/\s+/g, '_')}_${format(new Date(record.createdAt), 'yyyy-MM-dd')}.xlsx`);
    
    toastUI({
      title: 'Dados exportados',
      description: `${results.length} leads exportados para Excel`,
    });
  };

  const handleDeleteRecord = (recordId: string) => {
    deleteRecord(recordId);
    toastUI({
      title: 'Registro removido',
      description: 'A extração foi removida do histórico',
    });
  };

  const handleExportAll = () => {
    if (filteredHistory.length === 0) {
      toastUI({
        title: 'Nenhum registro',
        description: 'Não há registros para exportar',
        variant: 'destructive',
      });
      return;
    }
    exportToExcel(filteredHistory, `historico_extracoes_${format(new Date(), 'yyyy-MM-dd')}`);
  };

  // Disparo actions
  const handlePause = async (disparo: Disparo) => {
    setActionLoading(disparo.id);
    try {
      const { data, error } = await supabase.functions.invoke('disparos-api', {
        body: { action: 'pause-disparo', userId: user?.id, disparoData: { id: disparo.id } }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success('Disparo pausado com sucesso');
      fetchDisparos();
    } catch (error) {
      console.error('Erro ao pausar disparo:', error);
      toast.error('Erro ao pausar disparo');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (disparo: Disparo) => {
    setActionLoading(disparo.id);
    try {
      const { data, error } = await supabase.functions.invoke('disparos-api', {
        body: { action: 'resume-disparo', userId: user?.id, disparoData: { id: disparo.id } }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success('Disparo retomado com sucesso');
      fetchDisparos();
    } catch (error) {
      console.error('Erro ao retomar disparo:', error);
      toast.error('Erro ao retomar disparo');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteDisparo = async () => {
    if (!selectedDisparo) return;
    
    setActionLoading(selectedDisparo.id);
    try {
      const { data, error } = await supabase.functions.invoke('disparos-api', {
        body: { action: 'delete-disparo', userId: user?.id, disparoData: { id: selectedDisparo.id } }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success('Disparo excluído com sucesso');
      setDeleteDialogOpen(false);
      setSelectedDisparo(null);
      fetchDisparos();
    } catch (error) {
      console.error('Erro ao excluir disparo:', error);
      toast.error('Erro ao excluir disparo');
    } finally {
      setActionLoading(null);
    }
  };

  const openEditDateDialog = (disparo: Disparo) => {
    setEditingDisparo(disparo);
    const dateToEdit = disparo.DataAgendamento || disparo.created_at;
    const dateObj = new Date(dateToEdit);
    setNewDate(dateObj.toISOString().split('T')[0]);
    setNewTime(dateObj.toTimeString().slice(0, 5));
    
    // Load existing config
    setEditIntervaloMin(disparo.intervaloMin || 30);
    setEditIntervaloMax(disparo.intervaloMax || 60);
    setEditPausaApos(disparo.PausaAposMensagens || 20);
    setEditPausaMinutos(disparo.PausaMinutos || 10);
    setEditStartTime(disparo.StartTime || '08:00');
    setEditEndTime(disparo.EndTime || '18:00');
    setEditDiasSelecionados(disparo.DiasSelecionados || [1, 2, 3, 4, 5]);
    
    setEditDateDialogOpen(true);
  };

  const toggleDia = (dia: number) => {
    setEditDiasSelecionados(prev => 
      prev.includes(dia) 
        ? prev.filter(d => d !== dia)
        : [...prev, dia].sort((a, b) => a - b)
    );
  };

  const handleUpdateDateTime = async () => {
    if (!editingDisparo || !newDate || !newTime) return;
    
    setActionLoading(editingDisparo.id);
    try {
      const newDateTime = new Date(`${newDate}T${newTime}:00`);
      
      const { data, error } = await supabase.functions.invoke('disparos-api', {
        body: { 
          action: 'update-disparo-config', 
          userId: user?.id, 
          disparoData: { 
            id: editingDisparo.id,
            dataAgendamento: newDateTime.toISOString(),
            intervaloMin: editIntervaloMin,
            intervaloMax: editIntervaloMax,
            pausaAposMensagens: editPausaApos,
            pausaMinutos: editPausaMinutos,
            startTime: editStartTime,
            endTime: editEndTime,
            diasSelecionados: editDiasSelecionados
          } 
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success('Configurações atualizadas com sucesso');
      setEditDateDialogOpen(false);
      setEditingDisparo(null);
      fetchDisparos();
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      toast.error('Erro ao atualizar configurações');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };
  };

  const getStatusBadge = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case 'em andamento':
      case 'em_andamento':
        return <Badge className="badge-warning border">Em andamento</Badge>;
      case 'agendado':
        return <Badge className="badge-purple border">Agendado</Badge>;
      case 'finalizado':
      case 'enviado':
        return <Badge className="badge-success border">Finalizado</Badge>;
      case 'cancelado':
        return <Badge className="badge-error border">Cancelado</Badge>;
      case 'pausado':
        return <Badge className="badge-warning border">Pausado</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground">Aguardando</Badge>;
    }
  };

  const getTipoBadge = (tipo: string | null) => {
    if (tipo === 'grupo' || tipo === 'grupos') {
      return (
        <Badge className="badge-info border">
          <Users className="w-3 h-3 mr-1" />
          Grupos
        </Badge>
      );
    }
    return (
      <Badge className="badge-success border">
        <Send className="w-3 h-3 mr-1" />
        Individual
      </Badge>
    );
  };

  const calculateProgress = (total: number | null, sent: number | null) => {
    if (!total || total === 0) return 0;
    return Math.round(((sent || 0) / total) * 100);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-5 lg:p-6 space-y-5 lg:space-y-6">
        {/* Header */}
        <div className="opacity-0 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl title-gradient tracking-tight">Histórico</h1>
              <p className="text-muted-foreground text-xs sm:text-sm">Visualize suas extrações e disparos</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'extracao' | 'disparo')} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="extracao" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Extração
            </TabsTrigger>
            <TabsTrigger value="disparo" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Disparo
            </TabsTrigger>
          </TabsList>

          {/* Extração Tab */}
          <TabsContent value="extracao" className="space-y-6 mt-6">
            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
              {filteredHistory.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExportAll} className="text-primary hover:text-primary">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Exportar
                </Button>
              )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Filter className="w-4 h-4" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar por segmento ou localização..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

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

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn(periodFilter === 'custom' && 'border-primary')}>
                        <Calendar className="w-4 h-4 mr-2" />
                        {periodFilter === 'custom' 
                          ? `${format(startDate, 'dd/MM')} - ${format(endDate, 'dd/MM')}`
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
              </CardContent>
            </Card>

            {/* Results List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Extrações
                </CardTitle>
                <CardDescription>
                  {filteredHistory.length} de {history.length} extrações
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
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 flex items-center justify-center">
                              <TypeIcon className={cn('w-5 h-5', typeIconColors[record.type])} strokeWidth={1.5} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-foreground">{record.segment}</p>
                                <span className={cn('px-2 py-0.5 text-xs font-medium rounded', typeBadgeColors[record.type])}>
                                  {typeLabels[record.type]}
                                </span>
                              </div>
                              {record.location && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {record.location}
                                </p>
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
                                {format(new Date(record.createdAt), 'dd/MM HH:mm', { locale: ptBR })}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => exportResultsToExcel(record)}
                                className="h-8 w-8 text-primary hover:text-primary"
                              >
                                <FileSpreadsheet className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Nenhuma extração encontrada</p>
                    <p className="text-sm">Comece usando um dos extratores</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Disparo Tab */}
          <TabsContent value="disparo" className="space-y-6 mt-6">
            {/* Actions */}
            <div className="flex items-center justify-end">
              <Button
                onClick={handleRefreshDisparos}
                disabled={refreshing}
                className="bg-primary hover:bg-primary/90"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Tipo de Disparo</label>
                <Select value={tipoDisparoFilter} onValueChange={setTipoDisparoFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-background/50 border-border">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    <SelectItem value="individual">
                      <div className="flex items-center gap-2">
                        <Send className="w-3 h-3" />
                        Individual
                      </div>
                    </SelectItem>
                    <SelectItem value="grupo">
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3" />
                        Grupos
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-background/50 border-border">
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="aguardando">Aguardando</SelectItem>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="pausado">Pausado</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(tipoDisparoFilter !== 'todos' || statusFilter !== 'todos') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setTipoDisparoFilter('todos');
                    setStatusFilter('todos');
                  }}
                  className="self-end"
                >
                  Limpar filtros
                </Button>
              )}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
              {loadingDisparos ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <p className="text-primary font-medium">Carregando histórico...</p>
                </div>
              ) : filteredDisparos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                  <Send className="w-16 h-16 mb-4 opacity-50" />
                  <h3 className="text-xl font-semibold mb-2">Nenhum disparo encontrado</h3>
                  <p className="text-center">
                    {tipoDisparoFilter !== 'todos' || statusFilter !== 'todos'
                      ? 'Nenhum disparo corresponde aos filtros selecionados.'
                      : 'Você ainda não realizou nenhum disparo.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border hover:bg-transparent">
                        <TableHead className="text-foreground font-semibold">Data/Hora</TableHead>
                        <TableHead className="text-foreground font-semibold">Tipo</TableHead>
                        <TableHead className="text-foreground font-semibold text-center">Total</TableHead>
                        <TableHead className="text-foreground font-semibold text-center">Enviados</TableHead>
                        <TableHead className="text-foreground font-semibold">Progresso</TableHead>
                        <TableHead className="text-foreground font-semibold">Status</TableHead>
                        <TableHead className="text-foreground font-semibold text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDisparos.map((disparo) => {
                        const { date, time } = formatDate(disparo.created_at);
                        const progress = calculateProgress(disparo.TotalDisparos, disparo.MensagensDisparadas);
                        const isPaused = disparo.StatusDisparo?.toLowerCase() === 'pausado';
                        const isRunning = disparo.StatusDisparo?.toLowerCase() === 'em andamento' || disparo.StatusDisparo?.toLowerCase() === 'em_andamento';
                        const canPauseResume = isPaused || isRunning;

                        return (
                          <TableRow 
                            key={disparo.id} 
                            className="border-border cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => navigate(`/disparos/${disparo.id}`)}
                          >
                            <TableCell>
                              <div className="text-foreground">{date}</div>
                              <div className="text-sm text-muted-foreground">{time}</div>
                            </TableCell>
                            <TableCell>{getTipoBadge(disparo.TipoDisparo)}</TableCell>
                            <TableCell className="text-center font-semibold text-primary">
                              {disparo.TotalDisparos || 0}
                            </TableCell>
                            <TableCell className="text-center font-semibold text-primary">
                              {disparo.MensagensDisparadas || 0}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <Progress value={progress} className="w-24 h-2" />
                                <div className="text-xs text-muted-foreground">{progress}%</div>
                              </div>
                            </TableCell>
                            <TableCell>{getStatusBadge(disparo.StatusDisparo)}</TableCell>
                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    disabled={actionLoading === disparo.id}
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-card border-border">
                                  <DropdownMenuItem
                                    onClick={() => navigate(`/disparos/${disparo.id}`)}
                                    className="focus:bg-primary/10"
                                  >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Ver detalhes
                                  </DropdownMenuItem>
                                  {canPauseResume && (
                                    isPaused ? (
                                      <DropdownMenuItem
                                        onClick={() => handleResume(disparo)}
                                        className="text-green-500 focus:text-green-500 focus:bg-green-500/10"
                                      >
                                        <Play className="w-4 h-4 mr-2" />
                                        Retomar
                                      </DropdownMenuItem>
                                    ) : (
                                      <DropdownMenuItem
                                        onClick={() => handlePause(disparo)}
                                        className="text-yellow-500 focus:text-yellow-500 focus:bg-yellow-500/10"
                                      >
                                        <Pause className="w-4 h-4 mr-2" />
                                        Pausar
                                      </DropdownMenuItem>
                                    )
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => openEditDateDialog(disparo)}
                                    className="text-blue-500 focus:text-blue-500 focus:bg-blue-500/10"
                                  >
                                    <Pencil className="w-4 h-4 mr-2" />
                                    Editar data/hora
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedDisparo(disparo);
                                      setDeleteDialogOpen(true);
                                    }}
                                    className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                                  >
                                    <TrashIcon className="w-4 h-4 mr-2" />
                                    Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500">Excluir Disparo</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este disparo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted hover:bg-muted/80">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDisparo}
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={actionLoading !== null}
            >
              {actionLoading !== null ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Config Dialog */}
      <AlertDialog open={editDateDialogOpen} onOpenChange={setEditDateDialogOpen}>
        <AlertDialogContent className="bg-card border-border max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Configurações de Envio
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-5 py-4">
            {/* Data e Hora de Agendamento */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Data Agendamento</label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="bg-muted border-border"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Hora</label>
                <Input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="bg-muted border-border"
                />
              </div>
            </div>

            {/* Intervalo */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">Intervalo:</span>
              <Input
                type="number"
                value={editIntervaloMin}
                onChange={(e) => setEditIntervaloMin(Number(e.target.value))}
                className="w-20 bg-muted border-border text-center"
                min={1}
              />
              <span className="text-sm text-muted-foreground">a</span>
              <Input
                type="number"
                value={editIntervaloMax}
                onChange={(e) => setEditIntervaloMax(Number(e.target.value))}
                className="w-20 bg-muted border-border text-center"
                min={1}
              />
              <span className="text-sm text-muted-foreground">segundos</span>
            </div>

            {/* Pausa após mensagens */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">Pausar após</span>
              <Input
                type="number"
                value={editPausaApos}
                onChange={(e) => setEditPausaApos(Number(e.target.value))}
                className="w-20 bg-muted border-border text-center"
                min={1}
              />
              <span className="text-sm text-muted-foreground">msgs, por</span>
              <Input
                type="number"
                value={editPausaMinutos}
                onChange={(e) => setEditPausaMinutos(Number(e.target.value))}
                className="w-20 bg-muted border-border text-center"
                min={1}
              />
              <span className="text-sm text-muted-foreground">minutos</span>
            </div>

            {/* Horário de funcionamento */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-foreground">Horário:</span>
              <Input
                type="time"
                value={editStartTime}
                onChange={(e) => setEditStartTime(e.target.value)}
                className="w-28 bg-muted border-border"
              />
              <span className="text-sm text-muted-foreground">até</span>
              <Input
                type="time"
                value={editEndTime}
                onChange={(e) => setEditEndTime(e.target.value)}
                className="w-28 bg-muted border-border"
              />
            </div>

            {/* Dias da Semana */}
            <div className="space-y-2">
              <span className="text-sm text-foreground">Dias da Semana:</span>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: 'DOM', value: 0 },
                  { label: 'SEG', value: 1 },
                  { label: 'TER', value: 2 },
                  { label: 'QUA', value: 3 },
                  { label: 'QUI', value: 4 },
                  { label: 'SEX', value: 5 },
                  { label: 'SAB', value: 6 },
                ].map((dia) => (
                  <Button
                    key={dia.value}
                    type="button"
                    variant={editDiasSelecionados.includes(dia.value) ? 'default' : 'outline'}
                    size="sm"
                    className={editDiasSelecionados.includes(dia.value) 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted border-border'}
                    onClick={() => toggleDia(dia.value)}
                  >
                    {dia.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-muted hover:bg-muted/80">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUpdateDateTime}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={actionLoading !== null || !newDate || !newTime}
            >
              {actionLoading !== null ? 'Salvando...' : 'Salvar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default HistoricoPage;
