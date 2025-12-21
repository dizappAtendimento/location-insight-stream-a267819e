import { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Play, Pause, MessageSquare, Smartphone, Loader2, RefreshCw, Trash2, ChevronDown, Zap, Clock, ArrowRightLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";

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

const DEFAULT_MESSAGES = `Oi, tudo bem?
E aí, como vai?
Olá! Como você está?
Opa, beleza?
Bom dia!
Boa tarde!
Boa noite!
Como estão as coisas?
Tudo tranquilo por aí?
Legal, que bom!
Entendi, valeu!
Ok, combinado!
Perfeito!
Show de bola!
Beleza, depois a gente se fala
Até mais!
👍
✅`;

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
  const [customMessages, setCustomMessages] = useState<string>("");
  const [showCustomMessages, setShowCustomMessages] = useState(false);

  const fetchConnections = useCallback(async () => {
    if (!user?.id) return;
    
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
    
    try {
      const { data, error } = await supabase.functions.invoke('maturador-api', {
        body: { action: 'get-sessions', userId: user.id }
      });

      if (error) throw error;
      setSessions(data?.sessions || []);
    } catch (error) {
      console.error('Erro ao carregar sessões:', error);
    } finally {
      setLoadingSessions(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchConnections();
    fetchSessions();
  }, [fetchConnections, fetchSessions]);

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
      const messagesToSend = customMessages.trim() 
        ? customMessages.split('\n').filter(m => m.trim())
        : undefined;

      const { error } = await supabase.functions.invoke('maturador-api', {
        body: {
          action: 'create-session',
          userId: user?.id,
          data: {
            connection1Id: parseInt(selectedConnection1),
            connection2Id: parseInt(selectedConnection2),
            totalMessages: messageCount,
            intervalMin,
            intervalMax,
            customMessages: messagesToSend,
          }
        }
      });

      if (error) throw error;
      
      toast.success('Maturador iniciado!');
      setSelectedConnection1("");
      setSelectedConnection2("");
      setMessageCount(10);
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
        body: { action: 'pause-session', userId: user?.id, data: { sessionId } }
      });
      if (error) throw error;
      toast.info('Sessão pausada');
      fetchSessions();
    } catch (error) {
      toast.error('Erro ao pausar sessão');
    } finally {
      setProcessingAction(null);
    }
  };

  const resumeSession = async (sessionId: number) => {
    setProcessingAction(sessionId);
    try {
      const { error } = await supabase.functions.invoke('maturador-api', {
        body: { action: 'resume-session', userId: user?.id, data: { sessionId } }
      });
      if (error) throw error;
      toast.success('Sessão retomada');
      fetchSessions();
    } catch (error) {
      toast.error('Erro ao retomar sessão');
    } finally {
      setProcessingAction(null);
    }
  };

  const deleteSession = async (sessionId: number) => {
    setProcessingAction(sessionId);
    try {
      const { error } = await supabase.functions.invoke('maturador-api', {
        body: { action: 'delete-session', userId: user?.id, data: { sessionId } }
      });
      if (error) throw error;
      toast.info('Sessão removida');
      fetchSessions();
    } catch (error) {
      toast.error('Erro ao excluir sessão');
    } finally {
      setProcessingAction(null);
    }
  };

  const getConnectionName = useCallback((instanceName: string) => {
    const conn = connections.find(c => c.instanceName === instanceName);
    return conn?.NomeConexao || instanceName;
  }, [connections]);

  const availableConnections1 = useMemo(() => 
    connections.filter(c => c.id.toString() !== selectedConnection2), 
    [connections, selectedConnection2]
  );
  
  const availableConnections2 = useMemo(() => 
    connections.filter(c => c.id.toString() !== selectedConnection1), 
    [connections, selectedConnection1]
  );

  const stats = useMemo(() => ({
    active: sessions.filter(s => s.status === 'running').length,
    paused: sessions.filter(s => s.status === 'paused').length,
    completed: sessions.filter(s => s.status === 'completed').length,
    totalMessages: sessions.reduce((acc, s) => acc + s.mensagensEnviadas, 0)
  }), [sessions]);

  const isFormValid = selectedConnection1 && selectedConnection2 && selectedConnection1 !== selectedConnection2;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Maturador de Chip</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Aqueça seus números com conversas automáticas</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { fetchConnections(); fetchSessions(); }} 
            disabled={loading || loadingSessions}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${(loading || loadingSessions) ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Em execução', value: stats.active, icon: Zap, color: 'text-emerald-400' },
            { label: 'Pausadas', value: stats.paused, icon: Pause, color: 'text-yellow-400' },
            { label: 'Concluídas', value: stats.completed, icon: MessageSquare, color: 'text-blue-400' },
            { label: 'Mensagens', value: stats.totalMessages, icon: ArrowRightLeft, color: 'text-highlight' },
          ].map((stat, i) => (
            <Card key={i} className="border-border/40 bg-card/30">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-muted/50 ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Form */}
          <Card className="lg:col-span-2 border-border/40 bg-card/30">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-border/40">
                <Smartphone className="h-5 w-5 text-highlight" />
                <h2 className="font-medium">Nova Sessão</h2>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : connections.length < 2 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Smartphone className="h-10 w-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Mínimo de 2 conexões necessárias</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Conexão 1</Label>
                    <Select value={selectedConnection1} onValueChange={setSelectedConnection1}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableConnections1.map(conn => (
                          <SelectItem key={conn.id} value={conn.id.toString()}>
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${conn.status === 'open' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <span className="truncate">{conn.NomeConexao || conn.instanceName}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Conexão 2</Label>
                    <Select value={selectedConnection2} onValueChange={setSelectedConnection2}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableConnections2.map(conn => (
                          <SelectItem key={conn.id} value={conn.id.toString()}>
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${conn.status === 'open' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <span className="truncate">{conn.NomeConexao || conn.instanceName}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Quantidade de mensagens</Label>
                    <Input
                      type="number"
                      min={1}
                      max={1000}
                      value={messageCount}
                      onChange={(e) => setMessageCount(parseInt(e.target.value) || 1)}
                      className="h-10"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Min (seg)
                      </Label>
                      <Input
                        type="number"
                        min={5}
                        value={intervalMin}
                        onChange={(e) => setIntervalMin(parseInt(e.target.value) || 30)}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Max (seg)
                      </Label>
                      <Input
                        type="number"
                        min={10}
                        value={intervalMax}
                        onChange={(e) => setIntervalMax(parseInt(e.target.value) || 120)}
                        className="h-10"
                      />
                    </div>
                  </div>

                  <Collapsible open={showCustomMessages} onOpenChange={setShowCustomMessages}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="w-full justify-between h-9 text-muted-foreground hover:text-foreground">
                        Personalizar mensagens
                        <ChevronDown className={`h-4 w-4 transition-transform ${showCustomMessages ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      <Textarea
                        placeholder={DEFAULT_MESSAGES}
                        value={customMessages}
                        onChange={(e) => setCustomMessages(e.target.value)}
                        className="min-h-[120px] text-sm resize-none"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1.5">Uma mensagem por linha</p>
                    </CollapsibleContent>
                  </Collapsible>

                  <Button 
                    className="w-full h-10 bg-highlight hover:bg-highlight/90 text-highlight-foreground font-medium" 
                    onClick={startMaturador}
                    disabled={starting || !isFormValid}
                  >
                    {starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Play className="h-4 w-4 mr-2" />Iniciar</>}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sessions */}
          <Card className="lg:col-span-3 border-border/40 bg-card/30">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 pb-3 border-b border-border/40 mb-4">
                <MessageSquare className="h-5 w-5 text-highlight" />
                <h2 className="font-medium">Sessões</h2>
                <Badge variant="secondary" className="ml-auto text-xs">{sessions.length}</Badge>
              </div>

              {loadingSessions ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Nenhuma sessão ainda</p>
                </div>
              ) : (
                <ScrollArea className="h-[420px] pr-3">
                  <div className="space-y-3">
                    {sessions.map(session => {
                      const progress = (session.mensagensEnviadas / session.totalMensagens) * 100;
                      const statusConfig = {
                        running: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Executando' },
                        paused: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', label: 'Pausado' },
                        completed: { bg: 'bg-blue-500/10', text: 'text-blue-400', label: 'Concluído' },
                        error: { bg: 'bg-red-500/10', text: 'text-red-400', label: 'Erro' }
                      }[session.status] || { bg: 'bg-muted', text: 'text-muted-foreground', label: '?' };

                      return (
                        <div key={session.id} className="p-4 rounded-xl border border-border/40 bg-background/50 hover:bg-background/80 transition-colors">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 text-sm font-medium">
                                <span className="truncate">{getConnectionName(session.instanceName1)}</span>
                                <ArrowRightLeft className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="truncate">{getConnectionName(session.instanceName2)}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={`${statusConfig.bg} ${statusConfig.text} border-0 text-[10px] px-2 py-0`}>
                                  {statusConfig.label}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {session.mensagensEnviadas}/{session.totalMensagens}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {session.status === 'running' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon-sm"
                                  onClick={() => pauseSession(session.id)}
                                  disabled={processingAction === session.id}
                                >
                                  {processingAction === session.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
                                </Button>
                              )}
                              {session.status === 'paused' && (
                                <Button 
                                  variant="ghost" 
                                  size="icon-sm"
                                  onClick={() => resumeSession(session.id)}
                                  disabled={processingAction === session.id}
                                >
                                  {processingAction === session.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                                </Button>
                              )}
                              <Button 
                                variant="ghost" 
                                size="icon-sm"
                                className="text-destructive/70 hover:text-destructive"
                                onClick={() => deleteSession(session.id)}
                                disabled={processingAction === session.id}
                              >
                                {processingAction === session.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          </div>

                          <Progress value={progress} className="h-1.5 mb-2" />

                          {session.mensagemErro && (
                            <p className="text-[11px] text-red-400 mt-2">{session.mensagemErro}</p>
                          )}

                          {session.mensagens?.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/30">
                              <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Últimas mensagens</p>
                              <div className="space-y-1.5 max-h-24 overflow-y-auto">
                                {session.mensagens.slice(-4).map((msg: any, idx: number) => (
                                  <div 
                                    key={idx} 
                                    className={`text-[11px] py-1.5 px-2.5 rounded-lg ${
                                      msg.from === session.instanceName1 
                                        ? 'bg-highlight/10 text-highlight ml-6' 
                                        : 'bg-muted/50 text-muted-foreground mr-6'
                                    }`}
                                  >
                                    {msg.text}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
