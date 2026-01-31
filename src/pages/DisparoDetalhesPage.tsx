import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  ArrowLeft, 
  RefreshCw, 
  Loader2,
  MoreVertical,
  Play,
  Pause,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  MessageSquare,
  Calendar,
  Settings2,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Image,
  Video,
  FileAudio,
  FileText,
  Download,
  PlayCircle,
  StopCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface Disparo {
  id: number;
  created_at: string;
  StatusDisparo: string | null;
  TipoDisparo: string | null;
  TotalDisparos: number | null;
  MensagensDisparadas: number | null;
  Mensagens: any[] | null;
  idListas: number[] | null;
  idConexoes: number[] | null;
  intervaloMin: number | null;
  intervaloMax: number | null;
  StartTime: string | null;
  EndTime: string | null;
  DiasSelecionados: number[] | null;
  DataAgendamento: string | null;
}

interface Detalhe {
  id: number;
  idDisparo: number;
  idContato: number | null;
  idGrupo: number | null;
  idConexao: number | null;
  Status: string | null;
  Mensagem: string | null;
  dataEnvio: string | null;
  mensagemErro: string | null;
  TelefoneContato: string | null;
  NomeConexao: string | null;
  NomeGrupo: string | null;
  TipoDisparo: string | null;
}

interface Lista {
  id: number;
  nome: string;
  tipo: string | null;
}

interface Conexao {
  id: number;
  NomeConexao: string | null;
  Telefone: string | null;
}

const ITEMS_PER_PAGE = 20;

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default function DisparoDetalhesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [disparo, setDisparo] = useState<Disparo | null>(null);
  const [detalhes, setDetalhes] = useState<Detalhe[]>([]);
  const [listas, setListas] = useState<Lista[]>([]);
  const [conexoes, setConexoes] = useState<Conexao[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);

  // Auto-refresh every 30 seconds for active dispatches
  useEffect(() => {
    if (user?.id && id) {
      fetchDisparoDetails();
      
      // Set up auto-refresh interval
      const interval = setInterval(() => {
        if (disparo?.StatusDisparo?.toLowerCase() === 'em andamento' || 
            disparo?.StatusDisparo?.toLowerCase() === 'aguardando' ||
            disparo?.StatusDisparo?.toLowerCase() === 'processando') {
          fetchDisparoDetails();
        }
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [user?.id, id, disparo?.StatusDisparo]);

  const fetchDisparoDetails = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.functions.invoke("disparos-api", {
        body: {
          action: "get-disparo-detalhes",
          userId: user?.id,
          disparoData: { id: parseInt(id!) },
        },
      });

      if (error) throw error;

      setDisparo(data.disparo);
      setDetalhes(data.detalhes || []);
      setListas(data.listas || []);
      setConexoes(data.conexoes || []);
    } catch (error: any) {
      console.error("Error fetching disparo details:", error);
      toast.error("Erro ao carregar detalhes do disparo");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDisparoDetails();
    setIsRefreshing(false);
    toast.success("Dados atualizados");
  };

  const handlePause = async () => {
    try {
      setIsPausing(true);
      const { error } = await supabase.functions.invoke("disparos-api", {
        body: {
          action: "pause-disparo",
          userId: user?.id,
          disparoData: { id: disparo?.id },
        },
      });

      if (error) throw error;

      toast.success("Disparo pausado");
      fetchDisparoDetails();
    } catch (error: any) {
      toast.error("Erro ao pausar disparo");
    } finally {
      setIsPausing(false);
    }
  };

  const handleResume = async () => {
    try {
      setIsResuming(true);
      const { error } = await supabase.functions.invoke("disparos-api", {
        body: {
          action: "resume-disparo",
          userId: user?.id,
          disparoData: { id: disparo?.id },
        },
      });

      if (error) throw error;

      toast.success("Disparo retomado");
      fetchDisparoDetails();
    } catch (error: any) {
      toast.error("Erro ao retomar disparo");
    } finally {
      setIsResuming(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const { error } = await supabase.functions.invoke("disparos-api", {
        body: {
          action: "delete-disparo",
          userId: user?.id,
          disparoData: { id: disparo?.id },
        },
      });

      if (error) throw error;

      toast.success("Disparo excluído");
      navigate("/historico");
    } catch (error: any) {
      toast.error("Erro ao excluir disparo");
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Get first and last send times
  const getFirstSendTime = () => {
    const sentDetails = detalhes.filter(d => d.dataEnvio);
    if (sentDetails.length === 0) return null;
    const sorted = sentDetails.sort((a, b) => 
      new Date(a.dataEnvio!).getTime() - new Date(b.dataEnvio!).getTime()
    );
    return format(parseISO(sorted[0].dataEnvio!), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
  };

  const getLastSendTime = () => {
    const sentDetails = detalhes.filter(d => d.dataEnvio);
    if (sentDetails.length === 0) return null;
    const sorted = sentDetails.sort((a, b) => 
      new Date(b.dataEnvio!).getTime() - new Date(a.dataEnvio!).getTime()
    );
    // Only show end time if dispatch is completed
    if (disparo?.StatusDisparo?.toLowerCase() === 'concluido' || 
        disparo?.StatusDisparo?.toLowerCase() === 'finalizado' ||
        disparo?.StatusDisparo?.toLowerCase() === 'cancelado') {
      return format(parseISO(sorted[0].dataEnvio!), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
    }
    return null;
  };

  // Estimate finish time based on current rate
  const getEstimatedFinishTime = () => {
    if (!disparo) return null;
    
    // Only calculate for active dispatches
    const status = disparo.StatusDisparo?.toLowerCase();
    if (status === 'concluido' || status === 'finalizado' || status === 'cancelado') {
      return "Concluído";
    }
    if (status === 'pausado') {
      return "Pausado";
    }
    
    const sentDetails = detalhes.filter(d => d.dataEnvio);
    if (sentDetails.length < 2) return "Calculando...";
    
    // Sort by date
    const sorted = sentDetails.sort((a, b) => 
      new Date(a.dataEnvio!).getTime() - new Date(b.dataEnvio!).getTime()
    );
    
    const firstTime = new Date(sorted[0].dataEnvio!).getTime();
    const lastTime = new Date(sorted[sorted.length - 1].dataEnvio!).getTime();
    const elapsedMs = lastTime - firstTime;
    
    if (elapsedMs <= 0 || sentDetails.length <= 1) return "Calculando...";
    
    // Calculate rate (messages per millisecond)
    const messagesPerMs = sentDetails.length / elapsedMs;
    
    // Remaining messages
    const remaining = stats.pendentes;
    if (remaining <= 0) return "Quase pronto";
    
    // Estimated remaining time in ms
    const remainingMs = remaining / messagesPerMs;
    
    // Estimated finish date
    const estimatedFinish = new Date(Date.now() + remainingMs);
    
    return format(estimatedFinish, "dd/MM/yyyy HH:mm", { locale: ptBR });
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!disparo) return;

    // Detalhes sheet with requested columns
    const detalhesData = detalhes.map(d => ({
      "Destinatário": d.TelefoneContato || d.NomeGrupo || "N/A",
      "Conexão": d.NomeConexao || "N/A",
      "Status": d.Status || "pendente",
      "Data/Hora": d.dataEnvio ? format(parseISO(d.dataEnvio), "dd/MM/yyyy HH:mm:ss", { locale: ptBR }) : "N/A",
      "Mensagem": d.Mensagem || "N/A",
    }));

    const wb = XLSX.utils.book_new();
    const wsDetalhes = XLSX.utils.json_to_sheet(detalhesData);
    XLSX.utils.book_append_sheet(wb, wsDetalhes, "Detalhes");

    XLSX.writeFile(wb, `disparo_${disparo.id}_${format(new Date(), "yyyy-MM-dd_HH-mm")}.xlsx`);
    toast.success("Excel exportado com sucesso!");
  };

  // Calculate stats - use actual DB status values (sent, pending, failed)
  const stats = {
    enviados: detalhes.filter((d) => d.Status === "sent" || d.Status === "Enviado" || d.Status === "enviado").length,
    falhas: detalhes.filter((d) => d.Status === "failed" || d.Status === "Falha" || d.Status === "falha" || d.Status === "erro").length,
    pendentes: detalhes.filter((d) => d.Status === "pending" || d.Status === "Pendente" || d.Status === "pendente" || d.Status === "processing" || !d.Status).length,
  };

  // Agrupar detalhes por contato/grupo (mostrar cada número apenas uma vez)
  const groupedDetalhes = useMemo(() => {
    const groups: Record<string, {
      destinatario: string;
      conexao: string | null;
      totalMensagens: number;
      enviados: number;
      falhas: number;
      pendentes: number;
      ultimoEnvio: string | null;
      ultimaMensagem: string | null;
      ultimoErro: string | null;
    }> = {};
    
    detalhes.forEach((d) => {
      const key = d.TelefoneContato || d.NomeGrupo || `id_${d.idContato || d.idGrupo}`;
      if (!groups[key]) {
        groups[key] = {
          destinatario: d.TelefoneContato || d.NomeGrupo || "N/A",
          conexao: d.NomeConexao,
          totalMensagens: 0,
          enviados: 0,
          falhas: 0,
          pendentes: 0,
          ultimoEnvio: null,
          ultimaMensagem: null,
          ultimoErro: null,
        };
      }
      
      groups[key].totalMensagens++;
      
      const status = d.Status?.toLowerCase();
      if (status === "sent" || status === "enviado") {
        groups[key].enviados++;
      } else if (status === "failed" || status === "falha" || status === "erro") {
        groups[key].falhas++;
        groups[key].ultimoErro = d.mensagemErro || groups[key].ultimoErro;
      } else {
        groups[key].pendentes++;
      }
      
      if (d.dataEnvio && (!groups[key].ultimoEnvio || d.dataEnvio > groups[key].ultimoEnvio)) {
        groups[key].ultimoEnvio = d.dataEnvio;
        groups[key].ultimaMensagem = d.Mensagem;
      }
    });
    
    return Object.values(groups);
  }, [detalhes]);

  // Filter and paginate grouped data
  const filteredDetalhes = groupedDetalhes.filter((d) => {
    if (statusFilter === "all") return true;
    if (statusFilter === "enviado") return d.enviados > 0;
    if (statusFilter === "falha") return d.falhas > 0;
    if (statusFilter === "pendente") return d.pendentes > 0;
    return true;
  });

  const totalPages = Math.ceil(filteredDetalhes.length / ITEMS_PER_PAGE);
  const paginatedDetalhes = filteredDetalhes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Chart data
  const pieData = [
    { name: "Enviados", value: stats.enviados, color: "#22c55e" },
    { name: "Falhas", value: stats.falhas, color: "#ef4444" },
    { name: "Pendentes", value: stats.pendentes, color: "#f59e0b" },
  ].filter((d) => d.value > 0);

  // Group by hour for area chart - use actual DB status values
  const hourlyData = detalhes.reduce((acc: any[], d) => {
    if (!d.dataEnvio) return acc;
    const hour = format(parseISO(d.dataEnvio), "HH:00");
    const existing = acc.find((a) => a.hora === hour);
    const isSent = d.Status === "sent" || d.Status === "enviado" || d.Status === "Enviado";
    const isFailed = d.Status === "failed" || d.Status === "falha" || d.Status === "Falha";
    if (existing) {
      if (isSent) existing.enviados++;
      else if (isFailed) existing.falhas++;
    } else {
      acc.push({
        hora: hour,
        enviados: isSent ? 1 : 0,
        falhas: isFailed ? 1 : 0,
      });
    }
    return acc;
  }, []).sort((a, b) => a.hora.localeCompare(b.hora));

  const getStatusBadge = (status: string | null) => {
    const normalizedStatus = status?.toLowerCase();
    switch (normalizedStatus) {
      case "sent":
      case "enviado":
        return <Badge className="bg-success/20 text-success border-success/30">Enviado</Badge>;
      case "failed":
      case "falha":
      case "erro":
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30">Falha</Badge>;
      case "pending":
      case "pendente":
      case "processing":
      default:
        return <Badge className="bg-warning/20 text-warning border-warning/30">Pendente</Badge>;
    }
  };

  const getDisparoStatusBadge = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "concluido":
      case "finalizado":
        return <Badge className="bg-success/20 text-success border-success/30 text-lg px-4 py-1">Concluído</Badge>;
      case "em_andamento":
      case "em andamento":
      case "processando":
        return <Badge className="bg-primary/20 text-primary border-primary/30 text-lg px-4 py-1">Em Andamento</Badge>;
      case "pausado":
        return <Badge className="bg-warning/20 text-warning border-warning/30 text-lg px-4 py-1">Pausado</Badge>;
      case "cancelado":
        return <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-lg px-4 py-1">Cancelado</Badge>;
      case "agendado":
        return <Badge className="bg-info/20 text-info border-info/30 text-lg px-4 py-1">Agendado</Badge>;
      default:
        return <Badge className="bg-muted/20 text-muted-foreground text-lg px-4 py-1">{status || "N/A"}</Badge>;
    }
  };

  const getMessageTypeIcon = (msg: any) => {
    if (msg?.mediaType === "image") return <Image className="h-4 w-4" />;
    if (msg?.mediaType === "video") return <Video className="h-4 w-4" />;
    if (msg?.mediaType === "audio") return <FileAudio className="h-4 w-4" />;
    if (msg?.mediaType === "document") return <FileText className="h-4 w-4" />;
    return <MessageSquare className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando detalhes do disparo...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!disparo) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <AlertTriangle className="h-12 w-12 text-warning" />
          <p className="text-muted-foreground">Disparo não encontrado</p>
          <Button onClick={() => navigate("/historico")} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-6 rounded-xl bg-card/50 backdrop-blur border border-border/50">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
              Detalhes do Disparo #{disparo.id}
            </h1>
            <p className="text-muted-foreground">
              Criado em {format(parseISO(disparo.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outline"
              onClick={handleExportExcel}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button variant="outline" onClick={() => navigate("/historico")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {disparo.StatusDisparo?.toLowerCase() === "em_andamento" ||
                disparo.StatusDisparo?.toLowerCase() === "processando" ? (
                  <DropdownMenuItem onClick={handlePause} disabled={isPausing}>
                    <Pause className="h-4 w-4 mr-2" />
                    Pausar Disparo
                  </DropdownMenuItem>
                ) : disparo.StatusDisparo?.toLowerCase() === "pausado" ? (
                  <DropdownMenuItem onClick={handleResume} disabled={isResuming}>
                    <Play className="h-4 w-4 mr-2" />
                    Retomar Disparo
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Disparo
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status and Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Status */}
          <div className="p-6 rounded-xl bg-card/50 backdrop-blur border border-border/50 flex flex-col items-center justify-center min-h-[140px]">
            <p className="text-sm text-muted-foreground mb-3">Status do Disparo</p>
            {getDisparoStatusBadge(disparo.StatusDisparo)}
          </div>

          {/* Stats */}
          <div className="p-6 rounded-xl bg-card/50 backdrop-blur border border-border/50 flex flex-col items-center justify-center min-h-[140px]">
            <p className="text-sm text-muted-foreground mb-2">Enviados</p>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-success" />
              <span className="text-3xl font-bold text-success">{stats.enviados}</span>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-card/50 backdrop-blur border border-border/50 flex flex-col items-center justify-center min-h-[140px]">
            <p className="text-sm text-muted-foreground mb-2">Falhas</p>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-destructive" />
              <span className="text-3xl font-bold text-destructive">{stats.falhas}</span>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-card/50 backdrop-blur border border-border/50 flex flex-col items-center justify-center min-h-[140px]">
            <p className="text-sm text-muted-foreground mb-2">Pendentes</p>
            <div className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-warning" />
              <span className="text-3xl font-bold text-warning">{stats.pendentes}</span>
            </div>
          </div>

          {/* Estimated finish time */}
          <div className="p-6 rounded-xl bg-card/50 backdrop-blur border border-border/50 flex flex-col items-center justify-center min-h-[140px]">
            <p className="text-sm text-muted-foreground mb-2">Previsão de Término</p>
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-info" />
              <span className="text-lg font-bold text-info">
                {getEstimatedFinishTime() || "N/A"}
              </span>
            </div>
          </div>
        </div>

        {/* Config and Messages Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration */}
          <div className="p-6 rounded-xl bg-card/50 backdrop-blur border border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Configurações</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <div className="flex items-center gap-2">
                  <PlayCircle className="h-4 w-4 text-success" />
                  <span className="text-muted-foreground">Início</span>
                </div>
                <span className="font-medium text-success">
                  {getFirstSendTime() || "Aguardando início"}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <div className="flex items-center gap-2">
                  <StopCircle className="h-4 w-4 text-destructive" />
                  <span className="text-muted-foreground">Fim</span>
                </div>
                <span className="font-medium text-destructive">
                  {getLastSendTime() || "Em andamento"}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <span className="text-muted-foreground">Intervalo</span>
                <span className="font-medium text-primary">
                  {disparo.intervaloMin || 5}s - {disparo.intervaloMax || 15}s
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <span className="text-muted-foreground">Horário Permitido</span>
                <span className="font-medium text-primary">
                  {disparo.StartTime || "08:00"} - {disparo.EndTime || "18:00"}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <span className="text-muted-foreground">Dias da Semana</span>
                <span className="font-medium text-primary">
                  {disparo.DiasSelecionados?.map((d) => diasSemana[d]).join(", ") || "Todos"}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <span className="text-muted-foreground">Total de Disparos</span>
                <span className="font-medium text-primary">
                  {disparo.MensagensDisparadas || 0} / {disparo.TotalDisparos || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <span className="text-muted-foreground">Listas</span>
                <span className="font-medium text-primary">
                  {listas.map((l) => l.nome).join(", ") || "N/A"}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-background/50">
                <span className="text-muted-foreground">Conexões</span>
                <span className="font-medium text-primary">
                  {conexoes.map((c) => c.NomeConexao).join(", ") || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="p-6 rounded-xl bg-card/50 backdrop-blur border border-border/50">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Mensagens ({disparo.Mensagens?.length || 0})</h2>
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {disparo.Mensagens?.map((msg, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-background/50 border border-border/30">
                  <div className="flex items-center gap-2 mb-2">
                    {getMessageTypeIcon(msg)}
                    <Badge variant="outline" className="text-xs">
                      {msg.mediaType || "Texto"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {msg.text || msg.content || "Sem conteúdo de texto"}
                  </p>
                </div>
              )) || (
                <p className="text-muted-foreground text-center py-4">
                  Nenhuma mensagem configurada
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="p-6 rounded-xl bg-card/50 backdrop-blur border border-border/50">
            <h2 className="text-lg font-semibold mb-4">Distribuição de Status</h2>
            <div className="h-[300px]">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Sem dados para exibir
                </div>
              )}
            </div>
          </div>

          {/* Area Chart */}
          <div className="p-6 rounded-xl bg-card/50 backdrop-blur border border-border/50">
            <h2 className="text-lg font-semibold mb-4">Progresso por Hora</h2>
            <div className="h-[300px]">
              {hourlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hora" stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="enviados"
                      stackId="1"
                      stroke="#22c55e"
                      fill="#22c55e"
                      fillOpacity={0.6}
                      name="Enviados"
                    />
                    <Area
                      type="monotone"
                      dataKey="falhas"
                      stackId="1"
                      stroke="#ef4444"
                      fill="#ef4444"
                      fillOpacity={0.6}
                      name="Falhas"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  Sem dados para exibir
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Details Table */}
        <div className="rounded-xl bg-card/50 backdrop-blur border border-border/50 overflow-hidden">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Filtrar por status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="enviado">Enviados</SelectItem>
                  <SelectItem value="falha">Falhas</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <span className="text-sm text-muted-foreground">
              {filteredDetalhes.length} registros
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destinatário</TableHead>
                  <TableHead>Conexão</TableHead>
                  <TableHead>Mensagens</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Envio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDetalhes.map((d, idx) => (
                  <TableRow key={d.destinatario + idx}>
                    <TableCell className="font-mono text-primary">
                      {d.destinatario}
                    </TableCell>
                    <TableCell>
                      {d.conexao || (
                        <span className="text-destructive font-medium">Sem conexão</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{d.totalMensagens}</span>
                        {d.totalMensagens > 1 && (
                          <span className="text-xs text-muted-foreground">msgs</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {d.enviados > 0 && (
                          <Badge className="bg-success/20 text-success border-success/30 text-xs">
                            {d.enviados} enviado{d.enviados > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {d.falhas > 0 && (
                          <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-xs">
                            {d.falhas} falha{d.falhas > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {d.pendentes > 0 && (
                          <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">
                            {d.pendentes} pendente{d.pendentes > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.ultimoEnvio
                        ? format(parseISO(d.ultimoEnvio), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedDetalhes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/50">
              <span className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Delete Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Disparo</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este disparo? Esta ação não pode ser desfeita.
                Todos os detalhes e histórico serão removidos permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
