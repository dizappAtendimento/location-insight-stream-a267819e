import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Play, Square, MessageSquare, Smartphone, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Connection {
  id: number;
  instanceName: string;
  NomeConexao: string;
  Telefone: string;
  FotoPerfil: string | null;
  status?: string;
}

interface MaturadorSession {
  id: number;
  userId: string;
  idConexao1: number;
  idConexao2: number;
  telefone1: string | null;
  telefone2: string | null;
  instanceName1: string;
  instanceName2: string;
  totalMensagens: number;
  mensagensEnviadas: number;
  intervaloMin: number;
  intervaloMax: number;
  status: 'running' | 'paused' | 'completed' | 'error';
  mensagens: any[];
  ultimaMensagem: string | null;
  proximoEnvio: string | null;
  mensagemErro: string | null;
  created_at: string;
}

export default function MaturadorPage() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [sessions, setSessions] = useState<MaturadorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [selectedConnection1, setSelectedConnection1] = useState<string>("");
  const [selectedConnection2, setSelectedConnection2] = useState<string>("");
  const [messageCount, setMessageCount] = useState<number>(10);
  const [intervalMin, setIntervalMin] = useState<number>(30);
  const [intervalMax, setIntervalMax] = useState<number>(120);
  const [starting, setStarting] = useState(false);
  const [processingAction, setProcessingAction] = useState<number | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { action: 'list-user-instances', userId: user.id }
      });

      if (error) throw error;

      const connectionsWithStatus = (data?.instances || []).map((conn: Connection) => ({
        ...conn,
        status: conn.status || 'close'
      }));

      setConnections(connectionsWithStatus);
    } catch (error) {
      console.error('Erro ao carregar conexões:', error);
      toast.error('Erro ao carregar conexões');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const fetchSessions = useCallback(async () => {
    if (!user?.id) return;
    
    setLoadingSessions(true);
    try {
      const { data, error } = await supabase.functions.invoke('maturador-api', {
        body: { action: 'get-sessions', userId: user.id }
      });

      if (error) throw error;
      setSessions(data?.sessions || []);
    } catch (error) {
      console.error('Erro ao carregar sessões:', error);
      toast.error('Erro ao carregar sessões');
    } finally {
      setLoadingSessions(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchConnections();
    fetchSessions();
  }, [fetchConnections, fetchSessions]);

  // Auto-refresh sessions every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (sessions.some(s => s.status === 'running')) {
        fetchSessions();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [sessions, fetchSessions]);

  const startMaturador = async () => {
    if (!selectedConnection1 || !selectedConnection2) {
      toast.error('Selecione duas conexões diferentes');
      return;
    }

    if (selectedConnection1 === selectedConnection2) {
      toast.error('Selecione duas conexões diferentes');
      return;
    }

    if (messageCount < 1) {
      toast.error('Defina pelo menos 1 mensagem');
      return;
    }

    const conn1 = connections.find(c => c.id.toString() === selectedConnection1);
    const conn2 = connections.find(c => c.id.toString() === selectedConnection2);

    if (!conn1 || !conn2) {
      toast.error('Conexões não encontradas');
      return;
    }

    if (conn1.status !== 'open' || conn2.status !== 'open') {
      toast.error('Ambas as conexões precisam estar conectadas');
      return;
    }

    setStarting(true);
    try {
      const { data, error } = await supabase.functions.invoke('maturador-api', {
        body: {
          action: 'create-session',
          userId: user?.id,
          data: {
            connection1Id: parseInt(selectedConnection1),
            connection2Id: parseInt(selectedConnection2),
            totalMessages: messageCount,
            intervalMin,
            intervalMax,
          }
        }
      });

      if (error) throw error;
      
      toast.success('Maturador iniciado com sucesso!');
      
      // Reset form
      setSelectedConnection1("");
      setSelectedConnection2("");
      setMessageCount(10);
      
      // Refresh sessions
      fetchSessions();
    } catch (error) {
      console.error('Erro ao iniciar maturador:', error);
      toast.error('Erro ao iniciar maturador');
    } finally {
      setStarting(false);
    }
  };

  const pauseSession = async (sessionId: number) => {
    setProcessingAction(sessionId);
    try {
      const { error } = await supabase.functions.invoke('maturador-api', {
        body: {
          action: 'pause-session',
          userId: user?.id,
          data: { sessionId }
        }
      });

      if (error) throw error;
      
      toast.info('Sessão pausada');
      fetchSessions();
    } catch (error) {
      console.error('Erro ao pausar sessão:', error);
      toast.error('Erro ao pausar sessão');
    } finally {
      setProcessingAction(null);
    }
  };

  const resumeSession = async (sessionId: number) => {
    setProcessingAction(sessionId);
    try {
      const { error } = await supabase.functions.invoke('maturador-api', {
        body: {
          action: 'resume-session',
          userId: user?.id,
          data: { sessionId }
        }
      });

      if (error) throw error;
      
      toast.success('Sessão retomada');
      fetchSessions();
    } catch (error) {
      console.error('Erro ao retomar sessão:', error);
      toast.error('Erro ao retomar sessão');
    } finally {
      setProcessingAction(null);
    }
  };

  const deleteSession = async (sessionId: number) => {
    setProcessingAction(sessionId);
    try {
      const { error } = await supabase.functions.invoke('maturador-api', {
        body: {
          action: 'delete-session',
          userId: user?.id,
          data: { sessionId }
        }
      });

      if (error) throw error;
      
      toast.info('Sessão removida');
      fetchSessions();
    } catch (error) {
      console.error('Erro ao excluir sessão:', error);
      toast.error('Erro ao excluir sessão');
    } finally {
      setProcessingAction(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Executando</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pausado</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Concluído</Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Erro</Badge>;
      default:
        return <Badge variant="secondary">Desconhecido</Badge>;
    }
  };

  const getConnectionName = (instanceName: string) => {
    const conn = connections.find(c => c.instanceName === instanceName);
    return conn?.NomeConexao || instanceName;
  };

  const availableConnections1 = connections.filter(c => c.id.toString() !== selectedConnection2);
  const availableConnections2 = connections.filter(c => c.id.toString() !== selectedConnection1);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Maturador de Chip</h1>
            <p className="text-muted-foreground">
              Configure duas conexões para conversarem entre si automaticamente
            </p>
          </div>
          <Button variant="outline" onClick={() => { fetchConnections(); fetchSessions(); }} disabled={loading || loadingSessions}>
            <RefreshCw className={`h-4 w-4 mr-2 ${(loading || loadingSessions) ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Configuration Card */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-primary" />
                Nova Sessão de Maturação
              </CardTitle>
              <CardDescription>
                Selecione duas conexões e configure a quantidade de mensagens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : connections.length < 2 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Smartphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Você precisa de pelo menos 2 conexões ativas</p>
                  <p className="text-sm">para usar o maturador de chip.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Conexão 1</Label>
                    <Select value={selectedConnection1} onValueChange={setSelectedConnection1}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a primeira conexão" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableConnections1.map(conn => (
                          <SelectItem key={conn.id} value={conn.id.toString()}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${conn.status === 'open' ? 'bg-green-500' : 'bg-red-500'}`} />
                              {conn.NomeConexao || conn.instanceName}
                              {conn.Telefone && <span className="text-muted-foreground">({conn.Telefone})</span>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Conexão 2</Label>
                    <Select value={selectedConnection2} onValueChange={setSelectedConnection2}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a segunda conexão" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableConnections2.map(conn => (
                          <SelectItem key={conn.id} value={conn.id.toString()}>
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${conn.status === 'open' ? 'bg-green-500' : 'bg-red-500'}`} />
                              {conn.NomeConexao || conn.instanceName}
                              {conn.Telefone && <span className="text-muted-foreground">({conn.Telefone})</span>}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Quantidade de Mensagens</Label>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      value={messageCount}
                      onChange={(e) => setMessageCount(parseInt(e.target.value) || 1)}
                      placeholder="Ex: 10"
                    />
                    <p className="text-xs text-muted-foreground">
                      Total de mensagens que serão trocadas entre as duas conexões
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Intervalo Mínimo (seg)</Label>
                      <Input
                        type="number"
                        min={5}
                        max={600}
                        value={intervalMin}
                        onChange={(e) => setIntervalMin(parseInt(e.target.value) || 30)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Intervalo Máximo (seg)</Label>
                      <Input
                        type="number"
                        min={10}
                        max={600}
                        value={intervalMax}
                        onChange={(e) => setIntervalMax(parseInt(e.target.value) || 120)}
                      />
                    </div>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={startMaturador}
                    disabled={starting || !selectedConnection1 || !selectedConnection2}
                  >
                    {starting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Iniciar Maturação
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Active Sessions Card */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Sessões Ativas
              </CardTitle>
              <CardDescription>
                Acompanhe o progresso das maturações em andamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSessions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma sessão ativa</p>
                  <p className="text-sm">Configure uma nova sessão ao lado</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {sessions.map(session => (
                    <div 
                      key={session.id} 
                      className="p-4 rounded-lg border border-border/50 bg-background/50 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">
                            {getConnectionName(session.instanceName1)}
                          </span>
                          <span className="text-muted-foreground">↔</span>
                          <span className="font-medium">
                            {getConnectionName(session.instanceName2)}
                          </span>
                        </div>
                        {getStatusBadge(session.status)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progresso</span>
                          <span>{session.mensagensEnviadas}/{session.totalMensagens} mensagens</span>
                        </div>
                        <Progress 
                          value={(session.mensagensEnviadas / session.totalMensagens) * 100} 
                          className="h-2"
                        />
                      </div>

                      {session.mensagemErro && (
                        <p className="text-xs text-red-400">{session.mensagemErro}</p>
                      )}

                      {/* Mensagens trocadas */}
                      {session.mensagens && session.mensagens.length > 0 && (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          <p className="text-xs text-muted-foreground font-medium">Conversa:</p>
                          <div className="space-y-1">
                            {session.mensagens.map((msg: any, idx: number) => (
                              <div 
                                key={idx} 
                                className={`text-xs p-2 rounded ${
                                  msg.from === session.instanceName1 
                                    ? 'bg-primary/10 text-primary ml-4' 
                                    : 'bg-muted text-muted-foreground mr-4'
                                }`}
                              >
                                <span className="font-medium">
                                  {msg.from === session.instanceName1 
                                    ? getConnectionName(session.instanceName1) 
                                    : getConnectionName(session.instanceName2)}:
                                </span>{' '}
                                {msg.text}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {session.status === 'running' ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => pauseSession(session.id)}
                            disabled={processingAction === session.id}
                          >
                            {processingAction === session.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Square className="h-3 w-3 mr-1" />
                                Pausar
                              </>
                            )}
                          </Button>
                        ) : session.status === 'paused' ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => resumeSession(session.id)}
                            disabled={processingAction === session.id}
                          >
                            {processingAction === session.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <Play className="h-3 w-3 mr-1" />
                                Retomar
                              </>
                            )}
                          </Button>
                        ) : null}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => deleteSession(session.id)}
                          disabled={processingAction === session.id}
                        >
                          {processingAction === session.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remover
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-lg">Como funciona o Maturador?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="p-4 rounded-lg bg-background/50 border border-border/30">
                <div className="font-medium mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">1</span>
                  Selecione as Conexões
                </div>
                <p className="text-muted-foreground">
                  Escolha duas conexões WhatsApp que irão conversar entre si automaticamente.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background/50 border border-border/30">
                <div className="font-medium mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">2</span>
                  Defina a Quantidade
                </div>
                <p className="text-muted-foreground">
                  Configure quantas mensagens devem ser trocadas e o intervalo entre elas.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-background/50 border border-border/30">
                <div className="font-medium mb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs">3</span>
                  Acompanhe o Progresso
                </div>
                <p className="text-muted-foreground">
                  Monitore o andamento e pause ou retome a qualquer momento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
