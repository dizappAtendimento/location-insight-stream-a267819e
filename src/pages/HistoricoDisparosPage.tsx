import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { RefreshCw, MoreVertical, Play, Pause, Trash2, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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

interface Disparo {
  id: number;
  created_at: string;
  TipoDisparo: string | null;
  StatusDisparo: string | null;
  TotalDisparos: number | null;
  MensagensDisparadas: number | null;
  DataAgendamento: string | null;
  TotalDestinatarios?: number | null; // Número de contatos/grupos únicos
}

const HistoricoDisparosPage = () => {
  const { user } = useAuth();
  const [disparos, setDisparos] = useState<Disparo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDisparo, setSelectedDisparo] = useState<Disparo | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const fetchDisparos = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase.functions.invoke("disparos-api", {
        body: { action: "get-disparos", userId: user.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      setDisparos(data?.disparos || []);
    } catch (error) {
      console.error("Erro ao carregar disparos:", error);
      toast.error("Erro ao carregar histórico de disparos");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDisparos();
  }, [user?.id]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDisparos();
  };

  const filteredDisparos = useMemo(() => {
    return disparos.filter((disparo) => {
      const tipoMatch = tipoFilter === "todos" || 
        disparo.TipoDisparo?.toLowerCase() === tipoFilter.toLowerCase() ||
        (tipoFilter === "grupo" && disparo.TipoDisparo?.toLowerCase() === "grupos");
      const statusMatch = statusFilter === "todos" || 
        disparo.StatusDisparo?.toLowerCase().replace(/ /g, "_") === statusFilter.toLowerCase() ||
        disparo.StatusDisparo?.toLowerCase() === statusFilter.toLowerCase().replace(/_/g, " ");
      return tipoMatch && statusMatch;
    });
  }, [disparos, tipoFilter, statusFilter]);

  const handlePause = async (disparo: Disparo) => {
    setActionLoading(disparo.id);
    try {
      const { data, error } = await supabase.functions.invoke("disparos-api", {
        body: { action: "pause-disparo", userId: user?.id, disparoData: { id: disparo.id } }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success("Disparo pausado com sucesso");
      fetchDisparos();
    } catch (error) {
      console.error("Erro ao pausar disparo:", error);
      toast.error("Erro ao pausar disparo");
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (disparo: Disparo) => {
    setActionLoading(disparo.id);
    try {
      const { data, error } = await supabase.functions.invoke("disparos-api", {
        body: { action: "resume-disparo", userId: user?.id, disparoData: { id: disparo.id } }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success("Disparo retomado com sucesso");
      fetchDisparos();
    } catch (error) {
      console.error("Erro ao retomar disparo:", error);
      toast.error("Erro ao retomar disparo");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedDisparo) return;
    
    setActionLoading(selectedDisparo.id);
    try {
      const { data, error } = await supabase.functions.invoke("disparos-api", {
        body: { action: "delete-disparo", userId: user?.id, disparoData: { id: selectedDisparo.id } }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      toast.success("Disparo excluído com sucesso");
      setDeleteDialogOpen(false);
      setSelectedDisparo(null);
      fetchDisparos();
    } catch (error) {
      console.error("Erro ao excluir disparo:", error);
      toast.error("Erro ao excluir disparo");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("pt-BR"),
      time: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const getStatusBadge = (status: string | null, disparo?: Disparo) => {
    // Se o disparo está completo mas o status ainda não foi atualizado, mostrar como finalizado
    if (disparo && isDisparoComplete(disparo) && 
        status?.toLowerCase() !== "finalizado" && 
        status?.toLowerCase() !== "enviado" &&
        status?.toLowerCase() !== "cancelado") {
      return <Badge className="bg-green-500/20 text-green-500 border-green-500/30 hover:bg-green-500/30">Finalizado</Badge>;
    }
    
    switch (status?.toLowerCase()) {
      case "em andamento":
      case "em_andamento":
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/30">Em andamento</Badge>;
      case "agendado":
        return <Badge className="bg-purple-500/20 text-purple-500 border-purple-500/30 hover:bg-purple-500/30">Agendado</Badge>;
      case "finalizado":
      case "enviado":
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30 hover:bg-green-500/30">Finalizado</Badge>;
      case "cancelado":
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30">Cancelado</Badge>;
      case "pausado":
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/30">Pausado</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground">Aguardando</Badge>;
    }
  };

  const getTipoBadge = (tipo: string | null) => {
    if (tipo === "grupo" || tipo === "grupos") {
      return (
        <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30 hover:bg-blue-500/30">
          <Users className="w-3 h-3 mr-1" />
          Grupos
        </Badge>
      );
    }
    return (
      <Badge className="bg-green-500/20 text-green-500 border-green-500/30 hover:bg-green-500/30">
        <Send className="w-3 h-3 mr-1" />
        Individual
      </Badge>
    );
  };

  // Calcular progresso baseado em mensagens enviadas vs total
  const calculateProgress = (disparo: Disparo) => {
    const total = disparo.TotalDisparos || 0;
    const sent = disparo.MensagensDisparadas || 0;
    if (total === 0) return 0;
    // Limitar a 100% máximo
    return Math.min(100, Math.round((sent / total) * 100));
  };

  // Verificar se o disparo está completo (para exibição de status)
  const isDisparoComplete = (disparo: Disparo) => {
    const sent = disparo.MensagensDisparadas || 0;
    const total = disparo.TotalDisparos || 0;
    return total > 0 && sent >= total;
  };

  // Obter o número a exibir como "Total" (destinatários únicos)
  const getDisplayTotal = (disparo: Disparo) => {
    // Se temos TotalDestinatarios do backend, usar ele
    if (disparo.TotalDestinatarios && disparo.TotalDestinatarios > 0) {
      return disparo.TotalDestinatarios;
    }
    // Fallback para TotalDisparos
    return disparo.TotalDisparos || 0;
  };

  // Obter o número de enviados a exibir (destinatários que receberam pelo menos uma mensagem)
  const getDisplaySent = (disparo: Disparo) => {
    // Se temos TotalDestinatarios, calcular proporcionalmente
    if (disparo.TotalDestinatarios && disparo.TotalDestinatarios > 0 && disparo.TotalDisparos && disparo.TotalDisparos > 0) {
      const mensagensPorDestinatario = disparo.TotalDisparos / disparo.TotalDestinatarios;
      const destinatariosCompletos = Math.floor((disparo.MensagensDisparadas || 0) / mensagensPorDestinatario);
      return Math.min(destinatariosCompletos, disparo.TotalDestinatarios);
    }
    // Fallback
    return disparo.MensagensDisparadas || 0;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Histórico de Disparos</h1>
            <p className="text-muted-foreground mt-1">
              Visualize e acompanhe todos os seus disparos em tempo real
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-primary hover:bg-primary/90"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Tipo de Disparo</label>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
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

          {(tipoFilter !== "todos" || statusFilter !== "todos") && (
            <Button
              variant="outline"
              onClick={() => {
                setTipoFilter("todos");
                setStatusFilter("todos");
              }}
              className="self-end"
            >
              Limpar filtros
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-primary font-medium">Carregando histórico...</p>
            </div>
          ) : filteredDisparos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Send className="w-16 h-16 mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">Nenhum disparo encontrado</h3>
              <p className="text-center">
                {tipoFilter !== "todos" || statusFilter !== "todos"
                  ? "Nenhum disparo corresponde aos filtros selecionados."
                  : "Você ainda não realizou nenhum disparo."}
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
                    const progress = calculateProgress(disparo);
                    const displayTotal = getDisplayTotal(disparo);
                    const displaySent = getDisplaySent(disparo);
                    const isPaused = disparo.StatusDisparo?.toLowerCase() === "pausado";
                    const isRunning = disparo.StatusDisparo?.toLowerCase() === "em andamento" || disparo.StatusDisparo?.toLowerCase() === "em_andamento";
                    const canPauseResume = isPaused || isRunning;

                    return (
                      <TableRow key={disparo.id} className="border-border">
                        <TableCell>
                          <div className="text-foreground">{date}</div>
                          <div className="text-sm text-muted-foreground">{time}</div>
                        </TableCell>
                        <TableCell>{getTipoBadge(disparo.TipoDisparo)}</TableCell>
                        <TableCell className="text-center font-semibold text-primary">
                          {displayTotal}
                        </TableCell>
                        <TableCell className="text-center font-semibold text-primary">
                          {displaySent}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress value={progress} className="w-24 h-2" />
                            <div className="text-xs text-muted-foreground">{progress}%</div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(disparo.StatusDisparo, disparo)}</TableCell>
                        <TableCell className="text-right">
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
                                onClick={() => {
                                  setSelectedDisparo(disparo);
                                  setDeleteDialogOpen(true);
                                }}
                                className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
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
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
              disabled={actionLoading !== null}
            >
              {actionLoading !== null ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default HistoricoDisparosPage;
