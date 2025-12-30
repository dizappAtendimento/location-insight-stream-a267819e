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
import { supabase } from '@/integrations/supabase/client';
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
  const [sendingStatus, setSendingStatus] = useState<string>('');
  
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
      // Carregar conexões via evolution-api (já retorna status atualizado e sincroniza foto/telefone)
      const [connRes, listRes] = await Promise.all([
        supabase.functions.invoke('evolution-api', {
          body: { action: 'list-user-instances', userId }
        }),
        supabase.functions.invoke('disparos-api', {
          body: { action: 'get-listas', userId }
        })
      ]);

      // Processar conexões
      if (connRes.error) throw connRes.error;
      const instances = connRes.data?.instances || [];
      
      const mappedConns: Connection[] = instances
        .filter((c: any) => c.NomeConexao && c.instanceName)
        .map((c: any) => ({
          id: c.id,
          name: c.NomeConexao,
          instance: c.instanceName,
          apikey: c.Apikey || '',
          phone: c.Telefone,
          isConnected: c.status === 'open',
          photo: c.FotoPerfil || null
        }));
      
      setConnections(mappedConns);

      // Processar listas
      if (listRes.error) throw listRes.error;
      const rawLists: any[] = listRes.data?.listas || [];
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
      setSendingStatus('Preparando disparo...');
      
      // Pequeno delay para mostrar status inicial
      await new Promise(resolve => setTimeout(resolve, 500));
      setSendingStatus('Validando conexões...');
      await new Promise(resolve => setTimeout(resolve, 300));
      setSendingStatus('Enviando para o servidor...');
      
      // Usar edge function ao invés de API externa
      // IMPORTANTE: A RPC create_disparo espera o payload em formato específico
      const { data: result, error } = await supabase.functions.invoke('disparos-api', {
        body: {
          action: 'create-disparo',
          userId: user.id,
          disparoData: {
            // connections deve ser array de objetos com id
            connections: selConnsData.map(c => ({ id: c.id })),
            // idLista é o nome esperado pela RPC
            idLista: selectedLists,
            // mensagens em lowercase
            mensagens: messagesData,
            // settings como objeto separado
            settings: {
              intervalMin: parseInt(String(intervalMin)),
              intervalMax: parseInt(String(intervalMax)),
              pauseAfterMessages: parseInt(String(pauseAfter)),
              pauseMinutes: parseInt(String(pauseMinutes)),
              startTime: startTime,
              endTime: endTime,
              selectedDays: selectedDays,
              scheduleData: scheduleEnabled && scheduleDateTime ? new Date(scheduleDateTime).toISOString() : null,
            },
            TipoDisparo: 'individual',
            csvContacts: csvContacts.length > 0 ? csvContacts : null,
          }
        }
      });
      
      if (error) throw error;
      
      setSendingStatus('Finalizando...');
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (result?.error) {
        toast.error(result.error);
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
      console.error('Erro ao criar disparo:', e);
      toast.error('Erro ao iniciar disparo: ' + (e.message || 'Tente novamente'));
    } finally {
      setLoading(false);
      setSendingStatus('');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="opacity-0 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <h1 className="text-2xl sm:text-3xl font-bold title-gradient tracking-tight">Disparos de Mensagens</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">Configure e envie mensagens personalizadas para seus contatos</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr,380px]">
          {/* Formulário */}
          <div className="space-y-8">
            {/* Conexões */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm opacity-0 animate-fade-in transition-all duration-300" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
              <CardHeader className="pb-4 px-6 pt-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl font-semibold">Conexões Disponíveis *</CardTitle>
                  <Button 
                    variant="outline" 
                    size="default" 
                    onClick={selectActiveConnections}
                    className="text-sm"
                  >
                    <Wifi className="w-4 h-4 mr-2" />
                    Selecionar Ativas
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[300px] overflow-y-auto px-6 pb-6">
                {loadingData ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando conexões...
                  </div>
                ) : connections.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhuma conexão encontrada.</p>
                ) : (
                  connections.map((conn, index) => (
                    <div
                      key={conn.id}
                      onClick={() => toggleConnection(conn.id)}
                      className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                        selectedConnections.includes(conn.id)
                          ? 'border-primary bg-primary/10 shadow-sm'
                          : 'border-border/50 bg-background/50 hover:border-primary/40 hover:bg-primary/5'
                      }`}
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        {conn.photo ? (
                          <img 
                            src={conn.photo} 
                            alt={conn.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-primary font-semibold text-lg border border-primary/20">
                            {conn.name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-base text-foreground">{conn.name}</p>
                          <p className="text-sm text-muted-foreground">{conn.phone || conn.instance}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                          conn.isConnected 
                            ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' 
                            : 'bg-destructive/15 text-destructive border border-destructive/30'
                        }`}>
                          {conn.isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                          {conn.isConnected ? 'ON' : 'OFF'}
                        </div>
                        {selectedConnections.includes(conn.id) && (
                          <Check className="w-6 h-6 text-primary" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
              <div className="px-6 pb-6">
                <p className="text-sm text-muted-foreground">{selectedConnections.length} conexões selecionadas</p>
              </div>
            </Card>

            {/* Listas & CSV */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm opacity-0 animate-fade-in transition-all duration-300" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-xl font-semibold">Destinatários *</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 px-6 pb-6">
                {/* Listas */}
                <div className="space-y-3 max-h-[250px] overflow-y-auto">
                  {loadingData ? (
                    <div className="flex items-center gap-3 text-muted-foreground text-base py-4">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Carregando listas...
                    </div>
                  ) : lists.length === 0 ? (
                    <p className="text-muted-foreground text-base py-4">Nenhuma lista de contatos encontrada.</p>
                  ) : (
                    lists.map((list, index) => (
                      <div
                        key={list.id}
                        onClick={() => toggleList(list.id)}
                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] ${
                          selectedLists.includes(list.id)
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border/50 bg-background/50 hover:border-primary/40 hover:bg-primary/5'
                        }`}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <span className="font-medium text-base text-foreground">{list.nome}</span>
                        </div>
                        {selectedLists.includes(list.id) && (
                          <Check className="w-6 h-6 text-primary" />
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* CSV Upload */}
                <div className="p-5 rounded-xl border border-dashed border-border/50 bg-background/30">
                  <div className="flex items-center gap-4">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-base font-medium">Ou envie um arquivo CSV</p>
                      <p className="text-sm text-muted-foreground">Primeira coluna deve conter os telefones</p>
                    </div>
                    <label className="cursor-pointer">
                      <div className="px-4 py-2 text-sm rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors font-medium">
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
                    <p className="text-sm text-emerald-500 mt-3">✓ {csvContacts.length} contatos encontrados no CSV</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Mensagens */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm opacity-0 animate-fade-in transition-all duration-300" style={{ animationDelay: '150ms', animationFillMode: 'forwards' }}>
              <CardHeader className="pb-4 px-6 pt-6">
                <CardTitle className="text-xl font-semibold">Mensagens *</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 px-6 pb-6">
                {messages.map((msg, idx) => (
                  <div key={msg.id} className="p-5 rounded-xl border border-border/50 bg-background/50 space-y-4 transition-all duration-200 hover:border-primary/30">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Mensagem {idx + 1}</Label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMessage(msg.id)}
                        className="text-destructive hover:text-destructive"
                        disabled={messages.length <= 1}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>

                    {/* Variáveis disponíveis */}
                    <div>
                      <p className="text-sm text-muted-foreground mb-3">Variáveis disponíveis:</p>
                      <div className="flex flex-wrap gap-2">
                        {['nome', 'saudacao', 'hora', 'data'].map(key => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => insertVariable(msg.id, key)}
                            className="px-3 py-1.5 text-sm rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
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
                      className="min-h-[120px] resize-none font-mono text-base"
                    />

                    {msg.media && (
                      <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <span className="text-base text-foreground flex items-center gap-2"><FileText className="w-4 h-4" /> {msg.media.filename} ({msg.media.type})</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMedia(msg.id)}
                          className="text-destructive hover:text-destructive h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-3">
                      {[
                        { type: 'image', icon: Image, label: 'Imagem' },
                        { type: 'video', icon: Video, label: 'Vídeo' },
                        { type: 'audio', icon: FileAudio, label: 'Áudio' },
                        { type: 'document', icon: FileText, label: 'Documento' },
                      ].map(({ type, icon: Icon, label }) => (
                        <label key={type} className="cursor-pointer">
                          <div className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                            <Icon className="w-4 h-4" />
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
                  className="w-full h-12 border-dashed border-primary text-primary hover:bg-primary/10 text-base"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Nova Variação
                </Button>

                {/* IA */}
                <div className="p-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-5 h-5 text-emerald-500" />
                      <span className="text-base font-medium">🤖 Gerar com IA</span>
                    </div>
                    <Switch
                      checked={aiEnabled}
                      onCheckedChange={setAiEnabled}
                    />
                  </div>
                  {aiEnabled && (
                    <div className="flex flex-wrap gap-3 items-center">
                      <Input
                        type="number"
                        value={aiCount}
                        onChange={e => setAiCount(Number(e.target.value))}
                        className="w-20 h-11"
                        min={1}
                        max={10}
                      />
                      <Input
                        type="text"
                        placeholder="Instruções (ex: seja persuasivo)"
                        value={aiInstructions}
                        onChange={e => setAiInstructions(e.target.value)}
                        className="flex-1 min-w-[200px] h-11"
                      />
                      <Button
                        onClick={generateAI}
                        disabled={isGeneratingAI}
                        className="bg-emerald-500 hover:bg-emerald-600 h-11 px-6"
                      >
                        {isGeneratingAI ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
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
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm opacity-0 animate-fade-in transition-all duration-300" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
              <CardHeader className="pb-4 px-6 pt-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-6 h-6 text-primary" />
                  <CardTitle className="text-xl font-semibold">Configurações de Envio</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5 px-6 pb-6">
                {/* Agendamento */}
                <div className="flex flex-wrap items-center gap-4">
                  <Label className="text-base">Agendar Envio?</Label>
                  <Switch
                    checked={scheduleEnabled}
                    onCheckedChange={setScheduleEnabled}
                  />
                  {scheduleEnabled && (
                    <Input
                      type="datetime-local"
                      value={scheduleDateTime}
                      onChange={e => setScheduleDateTime(e.target.value)}
                      className="flex-1 h-11"
                    />
                  )}
                </div>

                {/* Intervalo */}
                <div className="flex flex-wrap items-center gap-3">
                  <Label className="text-base">Intervalo:</Label>
                  <Input
                    type="number"
                    value={intervalMin}
                    onChange={e => setIntervalMin(Number(e.target.value))}
                    className="w-20 h-11"
                  />
                  <span className="text-base text-muted-foreground">a</span>
                  <Input
                    type="number"
                    value={intervalMax}
                    onChange={e => setIntervalMax(Number(e.target.value))}
                    className="w-20 h-11"
                  />
                  <span className="text-base text-muted-foreground">segundos</span>
                </div>

                {/* Pausa */}
                <div className="flex flex-wrap items-center gap-3">
                  <Label className="text-base">Pausar após</Label>
                  <Input
                    type="number"
                    value={pauseAfter}
                    onChange={e => setPauseAfter(Number(e.target.value))}
                    className="w-20 h-11"
                  />
                  <span className="text-base text-muted-foreground">msgs, por</span>
                  <Input
                    type="number"
                    value={pauseMinutes}
                    onChange={e => setPauseMinutes(Number(e.target.value))}
                    className="w-20 h-11"
                  />
                  <span className="text-base text-muted-foreground">minutos</span>
                </div>

                {/* Horário */}
                <div className="flex flex-wrap items-center gap-3">
                  <Label className="text-base">Horário:</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="w-32 h-11"
                  />
                  <span className="text-base text-muted-foreground">até</span>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="w-32 h-11"
                  />
                </div>

                {/* Dias */}
                <div className="space-y-3">
                  <Label className="text-base">Dias da Semana:</Label>
                  <div className="flex flex-wrap gap-3">
                    {DAYS.map((d, i) => (
                      <Button
                        key={d}
                        type="button"
                        variant={selectedDays.includes(i) ? 'default' : 'outline'}
                        size="default"
                        onClick={() => toggleDay(i)}
                        className={`transition-all duration-200 hover:scale-105 active:scale-95 px-4 ${selectedDays.includes(i) ? '' : 'border-border/50'}`}
                      >
                        {d}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botão Enviar */}
            <div className="space-y-3">
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full h-14 text-lg font-semibold bg-violet-600 hover:bg-violet-700 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] opacity-0 animate-fade-in"
                style={{ animationDelay: '250ms', animationFillMode: 'forwards' }}
                size="lg"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Send className="w-5 h-5 mr-2" />
                )}
                {loading ? sendingStatus : (scheduleEnabled ? 'Agendar Disparo' : 'Iniciar Disparo')}
              </Button>
              
              {/* Barra de progresso durante o envio */}
              {loading && (
                <div className="relative overflow-hidden rounded-full h-2 bg-violet-200">
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-violet-500 via-violet-600 to-violet-500 animate-pulse"
                    style={{
                      animation: 'shimmer 1.5s infinite linear',
                      backgroundSize: '200% 100%',
                    }}
                  />
                  <style>{`
                    @keyframes shimmer {
                      0% { background-position: -200% 0; }
                      100% { background-position: 200% 0; }
                    }
                  `}</style>
                </div>
              )}
            </div>
          </div>

          {/* iPhone Preview */}
          <div className="hidden lg:block">
            <div className="sticky top-8">
              {/* iPhone Frame */}
              <div className="relative bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-900 rounded-[50px] p-2 shadow-2xl shadow-black/60 border border-zinc-700/50 max-w-[320px] mx-auto">
                {/* Screen */}
                <div className="bg-[#e8ded3] rounded-[42px] overflow-hidden h-[560px] flex flex-col">
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
                                <div className="mb-2 rounded overflow-hidden">
                                  {m.media.type === 'image' ? (
                                    <div className="relative">
                                      <img src={m.media.link} alt="Preview" className="w-full max-h-32 object-cover rounded" />
                                    </div>
                                  ) : m.media.type === 'video' ? (
                                    <div className="relative rounded overflow-hidden">
                                      <video 
                                        src={m.media.link} 
                                        controls
                                        className="w-full max-h-32 object-cover rounded"
                                        preload="metadata"
                                      />
                                    </div>
                                  ) : m.media.type === 'audio' ? (
                                    <div className="bg-[#c7e8bd] rounded p-2 flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-full bg-[#075e54] flex items-center justify-center">
                                        <FileAudio className="w-4 h-4 text-white" />
                                      </div>
                                      <div className="flex-1 h-1 bg-black/20 rounded" />
                                    </div>
                                  ) : (
                                    <div className="bg-black/10 p-2 rounded flex items-center gap-2">
                                      <FileText className="w-5 h-5 text-[#075e54]" />
                                      <span className="text-xs text-black/70 truncate">{m.media.filename || 'Documento'}</span>
                                    </div>
                                  )}
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
