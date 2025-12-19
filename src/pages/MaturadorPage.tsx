import { useState, useEffect } from "react";
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
import { Play, Square, MessageSquare, Smartphone, Loader2, RefreshCw } from "lucide-react";
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
  id: string;
  connection1: Connection;
  connection2: Connection;
  totalMessages: number;
  sentMessages: number;
  status: 'running' | 'paused' | 'completed' | 'error';
  startedAt: Date;
}

export default function MaturadorPage() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConnection1, setSelectedConnection1] = useState<string>("");
  const [selectedConnection2, setSelectedConnection2] = useState<string>("");
  const [messageCount, setMessageCount] = useState<number>(10);
  const [intervalMin, setIntervalMin] = useState<number>(30);
  const [intervalMax, setIntervalMax] = useState<number>(120);
  const [sessions, setSessions] = useState<MaturadorSession[]>([]);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    fetchConnections();
  }, [user]);

  const fetchConnections = async () => {
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
  };

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
      // Create a new session
      const newSession: MaturadorSession = {
        id: Date.now().toString(),
        connection1: conn1,
        connection2: conn2,
        totalMessages: messageCount,
        sentMessages: 0,
        status: 'running',
        startedAt: new Date()
      };

      setSessions(prev => [...prev, newSession]);
      
      toast.success('Maturador iniciado com sucesso!');
      
      // Reset form
      setSelectedConnection1("");
      setSelectedConnection2("");
      setMessageCount(10);
    } catch (error) {
      console.error('Erro ao iniciar maturador:', error);
      toast.error('Erro ao iniciar maturador');
    } finally {
      setStarting(false);
    }
  };

  const stopSession = (sessionId: string) => {
    setSessions(prev => 
      prev.map(s => s.id === sessionId ? { ...s, status: 'paused' as const } : s)
    );
    toast.info('Sessão pausada');
  };

  const resumeSession = (sessionId: string) => {
    setSessions(prev => 
      prev.map(s => s.id === sessionId ? { ...s, status: 'running' as const } : s)
    );
    toast.success('Sessão retomada');
  };

  const removeSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    toast.info('Sessão removida');
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
          <Button variant="outline" onClick={fetchConnections} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
              {sessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma sessão ativa</p>
                  <p className="text-sm">Configure uma nova sessão ao lado</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map(session => (
                    <div 
                      key={session.id} 
                      className="p-4 rounded-lg border border-border/50 bg-background/50 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">
                            {session.connection1.NomeConexao || session.connection1.instanceName}
                          </span>
                          <span className="text-muted-foreground">↔</span>
                          <span className="font-medium text-sm">
                            {session.connection2.NomeConexao || session.connection2.instanceName}
                          </span>
                        </div>
                        {getStatusBadge(session.status)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Progresso</span>
                          <span>{session.sentMessages}/{session.totalMessages} mensagens</span>
                        </div>
                        <Progress 
                          value={(session.sentMessages / session.totalMessages) * 100} 
                          className="h-2"
                        />
                      </div>

                      <div className="flex gap-2">
                        {session.status === 'running' ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => stopSession(session.id)}
                          >
                            <Square className="h-3 w-3 mr-1" />
                            Pausar
                          </Button>
                        ) : session.status === 'paused' ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => resumeSession(session.id)}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Retomar
                          </Button>
                        ) : null}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeSession(session.id)}
                        >
                          Remover
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
