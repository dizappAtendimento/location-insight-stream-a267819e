import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  Send,
  Plus,
  Trash2,
  Image,
  Video,
  FileAudio,
  FileText,
  RefreshCw,
  Users,
  CheckCircle,
  Loader2,
  Sparkles,
  AlertTriangle,
  Calendar,
  Clock,
  X,
  Wifi,
  WifiOff,
} from 'lucide-react';

// URLs da API
const API_URLS = {
  listarConexoes: 'https://api.dizapp.com.br/listarconexoes',
  puxarLista: 'https://api.dizapp.com.br/puxar-lista',
  uploadMedia: 'https://api.dizapp.com.br/uploadmedia',
  gerarMensagemIA: 'https://api.dizapp.com.br/gerarmensagem-ia',
  disparoGrupo: 'https://api.dizapp.com.br/grupo-salvar',
  evoStatus: 'https://evo.dizapp.com.br/instance/connectionState',
};

interface Connection {
  id: number;
  name: string;
  instance: string;
  phone?: string;
  apikey: string;
  isConnected?: boolean;
  photo?: string;
}

interface Lista {
  id: number;
  nome: string;
  tipo: string | null;
}

interface MessageItem {
  id: number;
  text: string;
  media: {
    type: string;
    filename: string;
    link: string;
  } | null;
}

export default function DisparosGrupoPage() {
  const { user } = useAuth();
  
  // Estados principais
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [lists, setLists] = useState<Lista[]>([]);
  const [selectedLists, setSelectedLists] = useState<number[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([{ id: 1, text: '', media: null }]);
  const [sendDate, setSendDate] = useState('');
  const [markAll, setMarkAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // AI States
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiCount, setAiCount] = useState(3);
  const [aiInstructions, setAiInstructions] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Variáveis de tempo disponíveis
  const timeVariables = ['saudacao', 'hora', 'data', 'diadasemana', 'mes'];

  const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  // Função para obter saudação baseada na hora
  const getSaudacao = () => {
    const hora = new Date().getHours();
    if (hora >= 5 && hora < 12) return 'Bom dia';
    if (hora >= 12 && hora < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // Função para substituir variáveis no preview
  const substituirVariaveis = (texto: string) => {
    const now = new Date();
    return texto
      .replace(/<saudacao>/gi, getSaudacao())
      .replace(/<saudação>/gi, getSaudacao())
      .replace(/<nome>/gi, 'João')
      .replace(/<data>/gi, now.toLocaleDateString('pt-BR'))
      .replace(/<hora>/gi, now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
      .replace(/<diadasemana>/gi, DIAS_SEMANA[now.getDay()])
      .replace(/<mes>/gi, MESES[now.getMonth()])
      .replace(/<mês>/gi, MESES[now.getMonth()]);
  };

  // --- Carregar dados iniciais ---
  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      await Promise.all([loadConnections(), loadLists()]);
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadConnections = async () => {
    try {
      const res = await fetch(API_URLS.listarConexoes, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      });
      const data = await res.json();
      const rawConns = data.Conexoes || (Array.isArray(data) ? data : []);
      
      const validConns = rawConns.filter((c: any) => c.instanceName || c.NomeConexao);
      
      // Verificar status de cada conexão
      const mappedWithStatus: Connection[] = await Promise.all(validConns.map(async (c: any) => {
        const instance = c.instanceName || c.instance_name;
        const apikey = c.Apikey || c.apikey;
        let isConnected = false;
        
        try {
          if (instance && apikey) {
            const statusRes = await fetch(`${API_URLS.evoStatus}/${instance}`, {
              headers: { 'apikey': apikey }
            });
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              const state = statusData.instance?.state || statusData.state;
              isConnected = state === 'open' || state === 'connected';
            }
          }
        } catch (err) {
          console.error('Erro ao verificar status da conexão:', err);
        }

        return {
          id: c.id || c.ID,
          name: c.NomeConexao || c.nomeConexao || c.name,
          instance: instance,
          phone: c.Telefone || c.telefone,
          apikey: apikey,
          isConnected,
          photo: c.FotoPerfil || c.fotoPerfil || null
        };
      }));
      
      setConnections(mappedWithStatus);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar conexões');
    }
  };

  const loadLists = async () => {
    try {
      const res = await fetch(API_URLS.puxarLista, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      });
      const data = await res.json();
      const rawLists = data.data || (Array.isArray(data) ? data : []);
      
      // Filtra apenas tipo 'groups'
      setLists(rawLists.filter((l: any) => l.tipo === 'groups' || l.tipo === 'Grupos'));
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar listas');
    }
  };

  // --- Handlers ---
  const handleSelectConnection = (conn: Connection) => {
    setSelectedConnection(selectedConnection?.id === conn.id ? null : conn);
  };

  const toggleList = (id: number) => {
    setSelectedLists(prev => 
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  };

  const addMessage = () => {
    setMessages(prev => [...prev, { id: Date.now(), text: '', media: null }]);
  };

  const removeMessage = (id: number) => {
    if (messages.length > 1) {
      setMessages(prev => prev.filter(m => m.id !== id));
    } else {
      toast.error('Deve haver pelo menos uma mensagem');
    }
  };

  const updateMessageText = (id: number, text: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, text } : m));
  };

  const insertVariable = (msgId: number, variable: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return { ...m, text: m.text + ` <${variable}> ` };
      }
      return m;
    }));
  };

  const handleFileUpload = async (msgId: number, file: File, type: string) => {
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      toast.error('Arquivo muito grande (Max 16MB)');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(API_URLS.uploadMedia, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Upload falhou');
      
      const data = await res.json();
      if (!data.link) throw new Error('Link não retornado');

      setMessages(prev => prev.map(m => m.id === msgId ? {
        ...m,
        media: {
          filename: file.name,
          type: type,
          link: data.link
        }
      } : m));
      
      toast.success('Arquivo anexado com sucesso!');
    } catch (e) {
      console.error(e);
      toast.error('Erro no upload da mídia');
    }
  };

  const removeMedia = (msgId: number) => {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, media: null } : m));
  };

  // --- AI Generation ---
  const generateAI = async () => {
    const seeds = messages.filter(m => m.text.trim()).map(m => m.text);
    if (seeds.length === 0) {
      toast.error('Escreva pelo menos uma mensagem base para a IA');
      return;
    }

    setIsGeneratingAI(true);
    try {
      const res = await fetch(API_URLS.gerarMensagemIA, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          variacoesMensagens: seeds,
          instrucoesAdicionais: aiInstructions,
          quantidadeMensagens: parseInt(String(aiCount)),
          tipo: 'grupos'
        })
      });
      
      const data = await res.json();
      if (data?.mensagens?.mensagens) {
        const newMsgs = data.mensagens.mensagens.map((txt: string, idx: number) => ({
          id: Date.now() + idx,
          text: txt,
          media: null
        }));
        setMessages(prev => [...prev, ...newMsgs]);
        toast.success(`${newMsgs.length} mensagens geradas com IA!`);
      } else {
        throw new Error('Formato inválido da API');
      }
    } catch (e) {
      toast.error('Erro ao gerar com IA');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // --- Submit ---
  const handleSubmit = async () => {
    if (!selectedConnection) {
      toast.error('Selecione uma conexão');
      return;
    }
    if (selectedLists.length === 0) {
      toast.error('Selecione uma lista de grupos');
      return;
    }
    if (!sendDate) {
      toast.error('Selecione a data de envio');
      return;
    }
    if (!messages.some(m => m.text.trim() || m.media)) {
      toast.error('Adicione uma mensagem válida');
      return;
    }

    // Aviso de conexão offline
    if (!selectedConnection.isConnected) {
      toast.warning('Atenção: A conexão selecionada está offline.');
    }

    setLoading(true);

    const payload = {
      userId: user?.id,
      connections: [{
        id: selectedConnection.id,
        instanceName: selectedConnection.instance,
        nomeConexao: selectedConnection.name,
        telefone: selectedConnection.phone,
        apikey: selectedConnection.apikey
      }],
      idLista: selectedLists,
      mensagens: messages.filter(m => m.text || m.media).map(m => ({
        text: m.text,
        type: 'text',
        media: m.media
      })),
      contacts: [],
      settings: {
        scheduleData: new Date(sendDate).toISOString(),
        mencionarTodos: markAll
      }
    };

    try {
      const res = await fetch(API_URLS.disparoGrupo, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      
      if (result.plano) {
        toast.error(`Limite atingido: ${result.plano}`);
      } else {
        toast.success('Disparo em grupos agendado!');
        // Reset form
        setSelectedConnection(null);
        setSelectedLists([]);
        setMessages([{ id: 1, text: '', media: null }]);
        setSendDate('');
        setMarkAll(false);
      }
    } catch (e: any) {
      toast.error('Erro ao agendar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Render ---
  return (
    <DashboardLayout>
      <div className="p-4 sm:p-5 lg:p-6 max-w-7xl mx-auto space-y-5 lg:space-y-6">
        {/* Header */}
        <div className="opacity-0 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <h1 className="text-xl sm:text-2xl title-gradient tracking-tight">Disparos em Grupos</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Envie mensagens para múltiplos grupos</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Form Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Conexões */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Selecione uma conexão *</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={loadConnections}
                    disabled={isLoadingData}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : connections.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    Nenhuma conexão encontrada
                  </div>
                ) : (
                  <div className="grid gap-3 max-h-[200px] overflow-y-auto pr-2">
                    {connections.map((conn) => (
                      <div
                        key={conn.id}
                        onClick={() => handleSelectConnection(conn)}
                        className={`relative p-4 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                          selectedConnection?.id === conn.id
                            ? 'border-primary bg-primary/10'
                            : 'border-border/50 bg-muted/20 hover:border-primary/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {conn.photo ? (
                            <img 
                              src={conn.photo} 
                              alt={conn.name}
                              className="w-11 h-11 rounded-full object-cover border-2 border-primary/20"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20">
                              <span className="text-primary font-bold">
                                {conn.name?.charAt(0).toUpperCase() || 'W'}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{conn.name}</p>
                            <p className="text-xs text-muted-foreground">{conn.phone || conn.instance}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 ${
                            conn.isConnected 
                              ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' 
                              : 'bg-destructive/15 text-destructive border border-destructive/30'
                          }`}>
                            {conn.isConnected ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                            {conn.isConnected ? 'ON' : 'OFF'}
                          </div>
                          {selectedConnection?.id === conn.id && (
                            <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Listas de Grupos */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Listas de grupos *</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {lists.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma lista de grupos encontrada.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 max-h-[200px] overflow-y-auto pr-2">
                    {lists.map((list) => (
                      <div
                        key={list.id}
                        onClick={() => toggleList(list.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                          selectedLists.includes(list.id)
                            ? 'border-primary bg-primary/10'
                            : 'border-border/50 bg-muted/20 hover:border-primary/40'
                        }`}
                      >
                        <span className="font-medium text-sm">{list.nome}</span>
                        {selectedLists.includes(list.id) && (
                          <CheckCircle className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Aviso do WhatsApp */}
                {selectedConnection && selectedLists.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-500">
                      Certifique-se que o WhatsApp selecionado está em todos os grupos da lista.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mensagens */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Mensagens *</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {messages.map((msg, idx) => (
                  <div key={msg.id} className="p-4 rounded-lg border border-border/50 bg-muted/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Mensagem {idx + 1}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMessage(msg.id)}
                        className="text-destructive hover:text-destructive"
                        disabled={messages.length <= 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Variáveis */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Variáveis disponíveis:</p>
                      <div className="flex flex-wrap gap-2">
                        {timeVariables.map(v => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => insertVariable(msg.id, v)}
                            className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>

                    <Textarea
                      placeholder="Digite sua mensagem... Use variáveis como <saudacao>, <data>"
                      value={msg.text}
                      onChange={(e) => updateMessageText(msg.id, e.target.value)}
                      className="min-h-[100px] resize-none font-mono text-sm"
                    />

                    {/* Media preview */}
                    {msg.media && (
                      <div className="flex items-center justify-between p-2 rounded bg-primary/10 border border-primary/20">
                        <span className="text-sm">📎 {msg.media.filename} ({msg.media.type})</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMedia(msg.id)}
                          className="text-destructive hover:text-destructive h-6 w-6 p-0"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

                    {/* Media buttons */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { type: 'image', icon: Image, label: 'Imagem' },
                        { type: 'video', icon: Video, label: 'Vídeo' },
                        { type: 'audio', icon: FileAudio, label: 'Áudio' },
                        { type: 'document', icon: FileText, label: 'Documento' },
                      ].map(({ type, icon: Icon, label }) => (
                        <label key={type} className="cursor-pointer">
                          <div className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md bg-muted hover:bg-muted/80 transition-colors">
                            <Icon className="w-3 h-3" />
                            {label}
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept={type === 'image' ? 'image/*' : type === 'video' ? 'video/*' : type === 'audio' ? 'audio/*' : '*'}
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(msg.id, e.target.files[0], type)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={addMessage}
                  className="w-full border-dashed border-primary text-primary hover:bg-primary/10"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Variação
                </Button>
              </CardContent>
            </Card>

            {/* IA */}
            <Card className="border-emerald-500/30 bg-emerald-500/5 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                    <CardTitle className="text-lg">🤖 Gerar com IA</CardTitle>
                  </div>
                  <Switch
                    checked={aiEnabled}
                    onCheckedChange={setAiEnabled}
                  />
                </div>
              </CardHeader>
              {aiEnabled && (
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 items-center">
                    <Input
                      type="number"
                      value={aiCount}
                      onChange={e => setAiCount(Number(e.target.value))}
                      className="w-16"
                      min={1}
                      max={10}
                    />
                    <Input
                      type="text"
                      placeholder="Instruções (ex: seja persuasivo)"
                      value={aiInstructions}
                      onChange={e => setAiInstructions(e.target.value)}
                      className="flex-1 min-w-[200px]"
                    />
                  </div>
                  <Button
                    onClick={generateAI}
                    disabled={isGeneratingAI}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isGeneratingAI ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Gerando...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Gerar Mensagens
                      </>
                    )}
                  </Button>
                </CardContent>
              )}
            </Card>

            {/* Configurações Finais */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Configurações</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Data para envio *
                    </Label>
                    <Input
                      type="datetime-local"
                      value={sendDate}
                      onChange={(e) => setSendDate(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Marcar todos (@todos)</Label>
                    <div
                      onClick={() => setMarkAll(!markAll)}
                      className={`w-14 h-8 rounded-full cursor-pointer transition-all flex items-center px-1 ${
                        markAll ? 'bg-primary' : 'bg-muted'
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs transition-transform ${
                          markAll ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      >
                        {markAll ? '✓' : '✗'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full h-14 text-lg font-semibold bg-violet-600 hover:bg-violet-700"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Agendando...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Agendar Disparo
                </>
              )}
            </Button>
          </div>

          {/* iPhone Preview */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              {/* iPhone Frame */}
              <div className="relative bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-900 rounded-[50px] p-2 shadow-2xl shadow-black/60 border border-zinc-700/50 max-w-[280px] mx-auto">
                {/* Screen */}
                <div className="bg-[#e8ded3] rounded-[42px] overflow-hidden h-[520px] flex flex-col">
                  {/* WhatsApp Header */}
                  <div className="bg-[#075e54] pt-8 pb-3 px-3 flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-[#ddd] flex items-center justify-center">
                      <Users className="w-5 h-5 text-[#666]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium text-sm">Grupo Exemplo</div>
                      <div className="text-[#6ab99f] text-xs">você, +42 pessoas</div>
                    </div>
                  </div>
                  
                  {/* Chat Area */}
                  <div className="flex-1 bg-[#e8ded3] p-3 overflow-y-auto flex items-center justify-center">
                    {messages[0]?.text || messages[0]?.media ? (
                      <div className="self-start w-full">
                        <div className="flex justify-end">
                          <div className="bg-[#dcf8c6] p-2 px-3 rounded-lg rounded-tr-none max-w-[85%] shadow-sm">
                            {messages[0].media && (
                              messages[0].media.type === 'image' ? (
                                <img 
                                  src={messages[0].media.link} 
                                  alt="Mídia" 
                                  className="rounded-lg mb-2 max-w-full h-auto max-h-32 object-cover"
                                />
                              ) : messages[0].media.type === 'video' ? (
                                <div className="bg-black/20 p-3 rounded-lg mb-2 flex items-center gap-2">
                                  <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center">
                                    <div className="w-0 h-0 border-l-[8px] border-l-white border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent ml-1" />
                                  </div>
                                  <span className="text-xs text-black/60">{messages[0].media.filename}</span>
                                </div>
                              ) : messages[0].media.type === 'audio' ? (
                                <div className="bg-[#c8e6c9] p-2 rounded-lg mb-2 flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-[#075e54] flex items-center justify-center">
                                    <div className="w-0 h-0 border-l-[6px] border-l-white border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent ml-0.5" />
                                  </div>
                                  <div className="flex-1 h-1.5 bg-[#075e54]/30 rounded-full">
                                    <div className="w-1/3 h-full bg-[#075e54] rounded-full" />
                                  </div>
                                  <span className="text-[10px] text-black/50">0:00</span>
                                </div>
                              ) : (
                                <div className="bg-white/50 p-2 rounded-lg mb-2 flex items-center gap-2">
                                  <div className="text-2xl">📄</div>
                                  <span className="text-xs text-black/70 truncate">{messages[0].media.filename}</span>
                                </div>
                              )
                            )}
                            {messages[0].text && (
                              <p className="text-sm text-black whitespace-pre-wrap leading-relaxed">
                                {substituirVariaveis(messages[0].text)}
                              </p>
                            )}
                            <div className="text-right text-[10px] text-black/40 mt-1">
                              {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ✓✓
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-[#6b7c85] text-sm">
                          <span className="text-[#6ab99f]">Digite uma mensagem</span> para ver o
                        </p>
                        <p className="text-[#e09e5c]">preview</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Home Indicator */}
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-24 h-1 bg-white/30 rounded-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
