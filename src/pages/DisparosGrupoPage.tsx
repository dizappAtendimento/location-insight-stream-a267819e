import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';

interface Connection {
  id: number;
  name: string;
  instance: string;
  phone?: string;
  apikey: string;
  isConnected?: boolean;
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
      const res = await fetch('https://app.dizapp.com.br/listarconexoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id })
      });
      const data = await res.json();
      const rawConns = data.Conexoes || (Array.isArray(data) ? data : []);
      
      const validConns = rawConns
        .filter((c: any) => c.instanceName || c.NomeConexao)
        .map((c: any) => ({
          id: c.id || c.ID,
          name: c.NomeConexao || c.nomeConexao || c.name,
          instance: c.instanceName || c.instance_name,
          phone: c.Telefone || c.telefone,
          apikey: c.Apikey || c.apikey,
          isConnected: true
        }));
      
      setConnections(validConns);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar conexões');
    }
  };

  const loadLists = async () => {
    try {
      const res = await fetch('https://app.dizapp.com.br/puxar-lista', {
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
      const res = await fetch('https://app.dizapp.com.br/uploadmedia', {
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
      toast.error('Escreva pelo menos uma mensagem base');
      return;
    }

    setIsGeneratingAI(true);
    try {
      const res = await fetch('https://app.dizapp.com.br/gerarmensagem-ia', {
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
        toast.success('Mensagens geradas com IA!');
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
      messages: messages.filter(m => m.text || m.media).map(m => ({
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
      const res = await fetch('https://app.dizapp.com.br/db56b0fb-cc58-4d51-8755-d7e04ccaa120123', {
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
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Disparos em Grupos
          </h1>
          <p className="text-muted-foreground">
            Envie mensagens para múltiplos grupos do WhatsApp.
          </p>
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
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-primary font-bold">
                              {conn.name?.charAt(0).toUpperCase() || 'W'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-sm">{conn.name}</p>
                            <p className="text-xs text-muted-foreground">{conn.instance}</p>
                          </div>
                        </div>
                        {selectedConnection?.id === conn.id && (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <CheckCircle className="w-4 h-4 text-primary-foreground" />
                          </div>
                        )}
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
                      {messages.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMessage(msg.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    {/* Variáveis de Tempo */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Variáveis de tempo:</p>
                      <div className="flex flex-wrap gap-2">
                        {timeVariables.map(v => (
                          <Badge
                            key={v}
                            variant="outline"
                            className="cursor-pointer hover:bg-primary/20 hover:border-primary"
                            onClick={() => insertVariable(msg.id, v)}
                          >
                            {v}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <Textarea
                      value={msg.text}
                      onChange={(e) => updateMessageText(msg.id, e.target.value)}
                      placeholder="Digite sua mensagem aqui..."
                      className="min-h-[100px] bg-background/50"
                    />

                    {/* Upload de Mídia */}
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { type: 'image', icon: Image, label: 'IMAGEM' },
                        { type: 'video', icon: Video, label: 'VÍDEO' },
                        { type: 'audio', icon: FileAudio, label: 'ÁUDIO' },
                        { type: 'document', icon: FileText, label: 'DOC' },
                      ].map(({ type, icon: Icon, label }) => (
                        <label
                          key={type}
                          className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg border border-border/50 bg-muted/20 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all"
                        >
                          <Icon className="w-4 h-4 text-muted-foreground" />
                          <span className="text-[10px] text-muted-foreground">{label}</span>
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => e.target.files?.[0] && handleFileUpload(msg.id, e.target.files[0], type)}
                          />
                        </label>
                      ))}
                    </div>

                    {/* Preview de Mídia Anexada */}
                    {msg.media && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/30">
                        <span className="text-sm text-foreground">
                          📎 {msg.media.filename} ({msg.media.type})
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMedia(msg.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  variant="outline"
                  onClick={addMessage}
                  className="w-full border-dashed"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Mensagem
                </Button>
              </CardContent>
            </Card>

            {/* AI Settings */}
            <Card className="border-green-500/30 bg-green-500/5 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-green-500" />
                    <CardTitle className="text-lg">Gerar com IA</CardTitle>
                  </div>
                  <Switch
                    checked={aiEnabled}
                    onCheckedChange={setAiEnabled}
                  />
                </div>
              </CardHeader>
              {aiEnabled && (
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Quantidade:</Label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={aiCount}
                        onChange={(e) => setAiCount(parseInt(e.target.value) || 3)}
                        className="bg-background/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Instruções:</Label>
                      <Textarea
                        value={aiInstructions}
                        onChange={(e) => setAiInstructions(e.target.value)}
                        placeholder="Ex: Use um tom profissional e persuasivo..."
                        className="min-h-[60px] bg-background/50"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={generateAI}
                    disabled={isGeneratingAI}
                    className="w-full bg-green-600 hover:bg-green-700"
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
              className="w-full h-14 text-lg font-semibold"
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

          {/* Phone Preview */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <div className="w-full max-w-[320px] mx-auto bg-black rounded-[35px] p-3 border-4 border-zinc-700">
                <div className="bg-[#e5ddd5] rounded-[25px] overflow-hidden h-[600px] flex flex-col">
                  {/* Header */}
                  <div className="bg-[#075e54] px-4 py-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-300 flex items-center justify-center">
                      <Users className="w-5 h-5 text-zinc-600" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">Grupo Exemplo</p>
                      <p className="text-white/70 text-xs">você, +42 pessoas</p>
                    </div>
                  </div>

                  {/* Chat Area */}
                  <div className="flex-1 p-4 overflow-y-auto">
                    {messages[0]?.text || messages[0]?.media ? (
                      <div className="bg-[#dcf8c6] p-2 px-3 rounded-lg max-w-[85%] ml-auto">
                        {messages[0].media && (
                          <div className="bg-black/10 p-2 rounded mb-2 text-xs">
                            📎 {messages[0].media.filename}
                          </div>
                        )}
                        <p className="text-black text-sm whitespace-pre-wrap">
                          {messages[0].text}
                        </p>
                        <p className="text-right text-[10px] text-black/50 mt-1">
                          {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ) : (
                      <div className="text-center text-zinc-500 text-sm mt-20">
                        Digite uma mensagem para ver o preview
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
