import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  Clock,
  Loader2,
  Sparkles,
  Check,
  Upload,
  Wifi,
  WifiOff,
} from 'lucide-react';

// URLs da API
const API_URLS = {
  listarConexoes: 'https://api.dizapp.com.br/listarconexoes',
  puxarLista: 'https://api.dizapp.com.br/puxar-lista',
  uploadMedia: 'https://api.dizapp.com.br/uploadmedia',
  gerarMensagemIA: 'https://api.dizapp.com.br/gerarmensagem-ia',
  disparoIndividual: 'https://api.dizapp.com.br/db56b0fb-cc58-4d51-8755-d7e04ccaa120',
  evoStatus: 'https://evo.dizapp.com.br/instance/connectionState',
};

interface Connection {
  id: number;
  name: string;
  instance: string;
  apikey: string;
  phone?: string;
  isConnected: boolean;
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
  media: { type: string; filename: string; link: string; mimetype?: string } | null;
}

const DAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
const DIAS_SEMANA = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const getSaudacao = () => {
  const hora = new Date().getHours();
  if (hora >= 5 && hora < 12) return 'Bom dia';
  if (hora >= 12 && hora < 18) return 'Boa tarde';
  return 'Boa noite';
};

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

export default function DisparosPage() {
  const { user } = useAuth();
  
  // Estados principais
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnections, setSelectedConnections] = useState<number[]>([]);
  const [lists, setLists] = useState<Lista[]>([]);
  const [selectedLists, setSelectedLists] = useState<number[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([{ id: 1, text: '', media: null }]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [csvContacts, setCsvContacts] = useState<string[]>([]);
  
  // Configurações
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [intervalMin, setIntervalMin] = useState(30);
  const [intervalMax, setIntervalMax] = useState(60);
  const [pauseAfter, setPauseAfter] = useState(20);
  const [pauseMinutes, setPauseMinutes] = useState(10);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  
  // IA
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiInstructions, setAiInstructions] = useState('');
  const [aiCount, setAiCount] = useState(3);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  // Carregamento inicial
  useEffect(() => {
    if (user?.id) {
      fetchData(user.id);
    }
  }, [user]);

  const fetchData = async (userId: string) => {
    setLoadingData(true);
    try {
      // Carregar conexões e listas em paralelo
      const [connRes, listRes] = await Promise.all([
        fetch(API_URLS.listarConexoes, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        }),
        fetch(API_URLS.puxarLista, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        })
      ]);

      // Processar conexões
      const connData = await connRes.json();
      let rawConns: any[] = connData.Conexoes || (Array.isArray(connData) ? connData : []);
      
      const validConns = rawConns.filter(c => (c.NomeConexao || c.name) && (c.instanceName || c.instance_name));
      
      // Verificar status de cada conexão
      const mappedWithStatus: Connection[] = await Promise.all(validConns.map(async c => {
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
          id: c.id,
          name: c.NomeConexao || c.name,
          instance: instance,
          apikey: apikey,
          phone: c.Telefone || c.telefone,
          isConnected,
          photo: c.FotoPerfil || c.fotoPerfil || null
        };
      }));
      
      setConnections(mappedWithStatus);

      // Processar listas
      const listData = await listRes.json();
      let rawLists: any[] = listData.data || (Array.isArray(listData) ? listData : []);
      const contactsLists = rawLists.filter((l: any) => l.tipo === 'contacts');
      setLists(contactsLists);

    } catch (e) {
      console.error('Erro ao carregar dados:', e);
      toast.error('Erro ao carregar dados. Verifique console.');
    } finally {
      setLoadingData(false);
    }
  };

  const toggleConnection = (id: number) => {
    setSelectedConnections(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectActiveConnections = () => {
    const activeIds = connections.filter(c => c.isConnected).map(c => c.id);
    setSelectedConnections(activeIds);
    if (activeIds.length > 0) {
      toast.success(`${activeIds.length} conexões ativas selecionadas!`);
    } else {
      toast.error('Nenhuma conexão ativa encontrada.');
    }
  };

  const toggleList = (id: number) => {
    setSelectedLists(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const addMessage = () => {
    setMessages(prev => [...prev, { id: Date.now(), text: '', media: null }]);
  };

  const updateMessageText = (id: number, text: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, text } : m));
  };

  const insertVariable = (msgId: number, variable: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        return { ...m, text: m.text + ` <${variable}>` };
      }
      return m;
    }));
  };

  const handleFileUpload = async (id: number, file: File, type: string) => {
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
      if (!res.ok) throw new Error('Falha no upload');
      const data = await res.json();
      
      if (!data.link) throw new Error('Link não retornado');
      
      setMessages(prev => prev.map(m => m.id === id ? {
        ...m,
        media: { 
          type, 
          filename: file.name, 
          link: data.link,
          mimetype: file.type 
        }
      } : m));
      toast.success('Mídia carregada com sucesso!');
    } catch (e) {
      console.error(e);
      toast.error('Erro ao fazer upload da mídia');
    }
  };

  const removeMessage = (id: number) => {
    if (messages.length > 1) {
      setMessages(prev => prev.filter(m => m.id !== id));
    } else {
      toast.error('Deve haver pelo menos uma mensagem');
    }
  };

  const removeMedia = (id: number) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, media: null } : m));
  };

  // Handler para CSV
  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const contacts = lines.slice(1).map(line => {
        const phone = line.split(',')[0].trim();
        return phone.replace(/[^\d]/g, '');
      }).filter(p => p.length >= 10);
      
      setCsvContacts(contacts);
      toast.success(`${contacts.length} contatos carregados do CSV`);
    };
    reader.readAsText(file);
  };

  const generateAI = async () => {
    if (!user?.id) return;
    
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
          userId: user.id,
          variacoesMensagens: seeds,
          instrucoesAdicionais: aiInstructions,
          quantidadeMensagens: parseInt(String(aiCount))
        })
      });
      const data = await res.json();
      if (data && data.mensagens && data.mensagens.mensagens) {
        const newMsgs: MessageItem[] = data.mensagens.mensagens.map((txt: string, idx: number) => ({
          id: Date.now() + idx,
          text: txt,
          media: null
        }));
        setMessages(prev => [...prev, ...newMsgs]); 
        toast.success(`${newMsgs.length} mensagens geradas!`);
      } else {
        throw new Error('Formato inválido da API');
      }
    } catch (e) {
      toast.error('Erro na IA: Verifique sua API Key');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    if (selectedConnections.length === 0) {
      toast.error('Selecione ao menos uma conexão');
      return;
    }
    if (selectedLists.length === 0 && csvContacts.length === 0) {
      toast.error('Selecione uma lista ou envie um CSV');
      return;
    }
    if (selectedDays.length === 0) {
      toast.error('Selecione os dias da semana');
      return;
    }

    // Aviso de conexões offline
    const disconnected = connections.filter(c => selectedConnections.includes(c.id) && !c.isConnected);
    if (disconnected.length > 0) {
      toast.warning(`Atenção: ${disconnected.length} conexões selecionadas estão offline.`);
    }
    
    setLoading(true);

    const selConnsData = connections
      .filter(c => selectedConnections.includes(c.id))
      .map(c => ({
        id: c.id,
        instanceName: c.instance,
        nomeConexao: c.name,
        telefone: c.phone,
        apikey: c.apikey
      }));

    const messagesData = messages.filter(m => m.text || m.media).map(m => {
      const obj: any = {};
      if (m.text) obj.text = m.text;
      if (m.media) obj.media = m.media;
      return obj;
    });

    const settings: any = {
      intervalMin: parseInt(String(intervalMin)),
      intervalMax: parseInt(String(intervalMax)),
      pauseAfterMessages: parseInt(String(pauseAfter)),
      pauseMinutes: parseInt(String(pauseMinutes)),
      startTime,
      endTime,
      selectedDays
    };

    if (scheduleEnabled && scheduleDateTime) {
      settings.scheduleData = new Date(scheduleDateTime).toISOString();
    }

    const payload = {
      userId: user.id,
      connections: selConnsData,
      idLista: selectedLists,
      messages: messagesData,
      contacts: csvContacts,
      settings
    };

    try {
      const res = await fetch(API_URLS.disparoIndividual, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();
      
      if (result.plano) {
        toast.error(`Limite atingido: ${result.plano}`);
      } else {
        toast.success('Disparo iniciado com sucesso!');
        // Reset
        setSelectedConnections([]);
        setSelectedLists([]);
        setMessages([{ id: 1, text: '', media: null }]);
        setSelectedDays([]);
        setCsvContacts([]);
      }
    } catch (e: any) {
      toast.error('Erro ao iniciar disparo: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-5 lg:p-6 max-w-7xl mx-auto space-y-5 lg:space-y-6">
        {/* Header */}
        <div className="opacity-0 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <h1 className="text-xl sm:text-2xl title-gradient tracking-tight">Disparos de Mensagens</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Configure e envie mensagens personalizadas para seus contatos</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,350px]">
          {/* Formulário */}
          <div className="space-y-6">
            {/* Conexões */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Conexões Disponíveis *</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={selectActiveConnections}
                    className="text-xs"
                  >
                    <Wifi className="w-3 h-3 mr-1" />
                    Selecionar Ativas
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[250px] overflow-y-auto">
                {loadingData ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando conexões...
                  </div>
                ) : connections.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhuma conexão encontrada.</p>
                ) : (
                  connections.map(conn => (
                    <div
                      key={conn.id}
                      onClick={() => toggleConnection(conn.id)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedConnections.includes(conn.id)
                          ? 'border-primary bg-primary/10'
                          : 'border-border/50 bg-background/50 hover:border-primary/40 hover:bg-primary/5'
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
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-semibold border border-primary/20">
                            {conn.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-foreground">{conn.name}</p>
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
                        {selectedConnections.includes(conn.id) && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
              <div className="px-6 pb-4">
                <p className="text-xs text-muted-foreground">{selectedConnections.length} conexões selecionadas</p>
              </div>
            </Card>

            {/* Listas & CSV */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Destinatários *</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Listas */}
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {loadingData ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando listas...
                    </div>
                  ) : lists.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Nenhuma lista de contatos encontrada.</p>
                  ) : (
                    lists.map(list => (
                      <div
                        key={list.id}
                        onClick={() => toggleList(list.id)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedLists.includes(list.id)
                            ? 'border-primary bg-primary/10'
                            : 'border-border/50 bg-background/50 hover:border-primary/40 hover:bg-primary/5'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                            📝
                          </div>
                          <span className="font-medium text-foreground">{list.nome}</span>
                        </div>
                        {selectedLists.includes(list.id) && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* CSV Upload */}
                <div className="p-4 rounded-lg border border-dashed border-border/50 bg-background/30">
                  <div className="flex items-center gap-3">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Ou envie um arquivo CSV</p>
                      <p className="text-xs text-muted-foreground">Primeira coluna deve conter os telefones</p>
                    </div>
                    <label className="cursor-pointer">
                      <div className="px-3 py-1.5 text-xs rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
                        Escolher arquivo
                      </div>
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleCsvUpload}
                      />
                    </label>
                  </div>
                  {csvContacts.length > 0 && (
                    <p className="text-xs text-emerald-500 mt-2">✓ {csvContacts.length} contatos encontrados no CSV</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mensagens */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Mensagens *</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {messages.map((msg, idx) => (
                  <div key={msg.id} className="p-4 rounded-lg border border-border/50 bg-background/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Mensagem {idx + 1}</Label>
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

                    {/* Variáveis disponíveis */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">Variáveis disponíveis:</p>
                      <div className="flex flex-wrap gap-2">
                        {['nome', 'saudacao', 'hora', 'data'].map(key => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => insertVariable(msg.id, key)}
                            className="px-2 py-1 text-xs rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
                          >
                            {key}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <Textarea
                      placeholder="Digite sua mensagem... Use variáveis como <nome>, <saudacao>, <data>"
                      value={msg.text}
                      onChange={(e) => updateMessageText(msg.id, e.target.value)}
                      className="min-h-[100px] resize-none font-mono text-sm"
                    />

                    {msg.media && (
                      <div className="flex items-center justify-between p-2 rounded bg-primary/10 border border-primary/20">
                        <span className="text-sm text-foreground">📎 {msg.media.filename} ({msg.media.type})</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMedia(msg.id)}
                          className="text-destructive hover:text-destructive h-6 w-6 p-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    )}

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

                {/* IA */}
                <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium">🤖 Gerar com IA</span>
                    </div>
                    <Switch
                      checked={aiEnabled}
                      onCheckedChange={setAiEnabled}
                    />
                  </div>
                  {aiEnabled && (
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
                      <Button
                        onClick={generateAI}
                        disabled={isGeneratingAI}
                        className="bg-emerald-500 hover:bg-emerald-600"
                      >
                        {isGeneratingAI ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Gerar'
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Configurações */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Configurações de Envio</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Agendamento */}
                <div className="flex items-center gap-3">
                  <Label className="text-sm">Agendar Envio?</Label>
                  <Switch
                    checked={scheduleEnabled}
                    onCheckedChange={setScheduleEnabled}
                  />
                  {scheduleEnabled && (
                    <Input
                      type="datetime-local"
                      value={scheduleDateTime}
                      onChange={e => setScheduleDateTime(e.target.value)}
                      className="flex-1"
                    />
                  )}
                </div>

                {/* Intervalo */}
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="text-sm">Intervalo:</Label>
                  <Input
                    type="number"
                    value={intervalMin}
                    onChange={e => setIntervalMin(Number(e.target.value))}
                    className="w-16"
                  />
                  <span className="text-sm text-muted-foreground">a</span>
                  <Input
                    type="number"
                    value={intervalMax}
                    onChange={e => setIntervalMax(Number(e.target.value))}
                    className="w-16"
                  />
                  <span className="text-sm text-muted-foreground">segundos</span>
                </div>

                {/* Pausa */}
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="text-sm">Pausar após</Label>
                  <Input
                    type="number"
                    value={pauseAfter}
                    onChange={e => setPauseAfter(Number(e.target.value))}
                    className="w-16"
                  />
                  <span className="text-sm text-muted-foreground">msgs, por</span>
                  <Input
                    type="number"
                    value={pauseMinutes}
                    onChange={e => setPauseMinutes(Number(e.target.value))}
                    className="w-16"
                  />
                  <span className="text-sm text-muted-foreground">minutos</span>
                </div>

                {/* Horário */}
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="text-sm">Horário:</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-28"
                  />
                  <span className="text-sm text-muted-foreground">até</span>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-28"
                  />
                </div>

                {/* Dias */}
                <div className="space-y-2">
                  <Label className="text-sm">Dias da Semana:</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((d, i) => (
                      <Button
                        key={d}
                        type="button"
                        variant={selectedDays.includes(i) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleDay(i)}
                        className={selectedDays.includes(i) ? '' : 'border-border/50'}
                      >
                        {d}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botão Enviar */}
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full h-12 text-lg bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90"
              size="lg"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Send className="w-5 h-5 mr-2" />
              )}
              {scheduleEnabled ? 'Agendar Disparo' : 'Iniciar Disparo'}
            </Button>
          </div>

          {/* iPhone Preview */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              {/* iPhone Frame */}
              <div className="relative bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-900 rounded-[50px] p-2 shadow-2xl shadow-black/60 border border-zinc-700/50 max-w-[280px]">
                {/* Screen */}
                <div className="bg-[#e8ded3] rounded-[42px] overflow-hidden h-[520px] flex flex-col">
                  {/* WhatsApp Header */}
                  <div className="bg-[#075e54] pt-8 pb-3 px-3 flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-[#ddd] flex items-center justify-center">
                      <div className="w-5 h-5 rounded-full bg-[#aaa]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium text-sm">Contato</div>
                      <div className="text-[#6ab99f] text-xs">online</div>
                    </div>
                  </div>
                  
                  {/* Chat Area */}
                  <div className="flex-1 bg-[#e8ded3] p-3 overflow-y-auto">
                    {messages[0]?.text || messages[0]?.media ? (
                      <div className="space-y-2">
                        {messages.map((m, i) => (
                          <div key={i} className="flex justify-end">
                            <div className="bg-[#dcf8c6] p-2 px-3 rounded-lg rounded-tr-none max-w-[85%] shadow-sm">
                              {m.media && (
                                <div className="bg-black/10 p-2 rounded mb-2 text-xs">
                                  📎 Mídia Anexada
                                </div>
                              )}
                              {m.text && <p className="text-sm text-black whitespace-pre-wrap leading-relaxed">{substituirVariaveis(m.text)}</p>}
                              <div className="text-right text-[10px] text-black/40 mt-1">
                                {new Date().toLocaleTimeString().slice(0, 5)} ✓✓
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center text-[#6b7c85] text-sm">
                          Preview da mensagem
                        </div>
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
