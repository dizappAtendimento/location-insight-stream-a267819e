import React, { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';

interface Connection {
  id: number;
  name: string;
  instance: string;
  apikey: string;
  isConnected: boolean;
}

interface Lista {
  id: number;
  nome: string;
  tipo: string | null;
}

interface MessageItem {
  id: number;
  text: string;
  media: { type: string; filename: string; link: string } | null;
}

const DAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];

export default function DisparosPage() {
  const { user } = useAuth();
  
  // Estados principais
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnections, setSelectedConnections] = useState<number[]>([]);
  const [lists, setLists] = useState<Lista[]>([]);
  const [selectedLists, setSelectedLists] = useState<number[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([{ id: 1, text: '', media: null }]);
  const [loading, setLoading] = useState(false);
  
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
      loadConnections(user.id);
      loadLists(user.id);
    }
  }, [user]);

  const loadConnections = async (userId: string) => {
    try {
      const res = await fetch('https://app.dizapp.com.br/listarconexoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      let raw: any[] = [];
      if (data && data.Conexoes) raw = data.Conexoes;
      else if (Array.isArray(data)) raw = data;
      
      const valid = raw.filter(c => (c.NomeConexao || c.name) && (c.instanceName || c.instance_name));
      
      const mapped: Connection[] = valid.map(c => ({
        id: c.id,
        name: c.NomeConexao || c.name,
        instance: c.instanceName || c.instance_name,
        apikey: c.Apikey || c.apikey,
        isConnected: true
      }));
      setConnections(mapped);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar conexões');
    }
  };

  const loadLists = async (userId: string) => {
    try {
      const res = await fetch('https://app.dizapp.com.br/puxar-lista', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      let raw: any[] = [];
      if (data && data.data) raw = data.data;
      else if (Array.isArray(data)) raw = data;

      const contactsLists = raw.filter((l: any) => l.tipo === 'contacts');
      setLists(contactsLists);
    } catch (e) {
      console.error(e);
      toast.error('Erro ao carregar listas');
    }
  };

  const toggleConnection = (id: number) => {
    setSelectedConnections(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
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

  const handleFileUpload = async (id: number, file: File, type: string) => {
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
      if (!res.ok) throw new Error('Falha no upload');
      const data = await res.json();
      
      setMessages(prev => prev.map(m => m.id === id ? {
        ...m,
        media: { type, filename: file.name, link: data.link }
      } : m));
      toast.success('Mídia anexada!');
    } catch (e) {
      toast.error('Erro ao enviar mídia');
    }
  };

  const removeMessage = (id: number) => {
    if (messages.length > 1) {
      setMessages(prev => prev.filter(m => m.id !== id));
    }
  };

  const removeMedia = (id: number) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, media: null } : m));
  };

  const generateAI = async () => {
    if (!user?.id) return;
    
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
        setMessages(newMsgs); 
        toast.success('Mensagens geradas!');
      }
    } catch (e) {
      toast.error('Erro na IA. Verifique API Key.');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    if (selectedConnections.length === 0) {
      toast.error('Selecione uma conexão');
      return;
    }
    if (selectedLists.length === 0) {
      toast.error('Selecione uma lista');
      return;
    }
    if (selectedDays.length === 0) {
      toast.error('Selecione dias da semana');
      return;
    }
    
    setLoading(true);

    const selConnsData = connections
      .filter(c => selectedConnections.includes(c.id))
      .map(c => ({
        id: c.id,
        instanceName: c.instance,
        nomeConexao: c.name,
        apikey: c.apikey
      }));

    const messagesData = messages.map(m => {
      const obj: any = {};
      if (m.text) obj.text = m.text;
      if (m.media) obj.media = m.media;
      return obj;
    }).filter(m => m.text || m.media);

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
      settings
    };

    try {
      const res = await fetch('https://app.dizapp.com.br/db56b0fb-cc58-4d51-8755-d7e04ccaa120', {
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
          <p className="text-muted-foreground text-xs sm:text-sm">Configure e envie mensagens personalizadas</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr,350px]">
          {/* Formulário */}
          <div className="space-y-6">
            {/* Conexões */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Conexões Disponíveis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
                {connections.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Buscando...</p>
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
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                          {conn.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{conn.name}</p>
                          <p className="text-xs text-muted-foreground">{conn.instance}</p>
                        </div>
                      </div>
                      {selectedConnections.includes(conn.id) && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Listas */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Listas de Contatos</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
                {lists.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhuma lista ou carregando...</p>
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
                      <span className="font-medium text-foreground">{list.nome}</span>
                      {selectedLists.includes(list.id) && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Mensagens */}
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Mensagens</CardTitle>
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
                    
                    <Textarea
                      placeholder="Digite sua mensagem..."
                      value={msg.text}
                      onChange={(e) => updateMessageText(msg.id, e.target.value)}
                      className="min-h-[100px] resize-none"
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
                  Adicionar Variação
                </Button>

                {/* IA */}
                <div className="p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-500" />
                      <span className="text-sm font-medium">Gerar com IA</span>
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
                  <Label className="text-sm">Agendar?</Label>
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
                  <Label className="text-sm">Dias da semana:</Label>
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
              className="w-full h-12 text-lg"
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

          {/* Phone Preview */}
          <div className="hidden lg:block">
            <div className="sticky top-6">
              <div className="bg-black rounded-[35px] p-4 border-4 border-zinc-800 shadow-2xl">
                {/* Notch */}
                <div className="w-24 h-6 bg-black rounded-full mx-auto mb-2" />
                
                <div className="bg-[#e5ddd5] rounded-[25px] overflow-hidden h-[600px] flex flex-col">
                  {/* Header WhatsApp */}
                  <div className="bg-[#075e54] h-16 px-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-300" />
                    <div>
                      <div className="text-white font-medium">Contato</div>
                      <div className="text-white/70 text-xs">online</div>
                    </div>
                  </div>
                  
                  {/* Chat Area */}
                  <div className="flex-1 p-4 overflow-y-auto space-y-2">
                    {messages[0]?.text || messages[0]?.media ? (
                      messages.map((m, i) => (
                        <div key={i} className="bg-[#dcf8c6] p-2 rounded-lg max-w-[80%] ml-auto shadow-sm">
                          {m.media && (
                            <div className="bg-black/10 p-2 rounded mb-2 text-xs">📎 Mídia</div>
                          )}
                          <p className="text-sm text-black whitespace-pre-wrap">{m.text}</p>
                          <div className="text-right text-[10px] text-gray-500 mt-1">
                            {new Date().toLocaleTimeString().slice(0, 5)} ✓✓
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-gray-500 mt-20 text-sm">
                        Preview da mensagem
                      </div>
                    )}
                  </div>
                  
                  {/* Input Bar */}
                  <div className="bg-[#f0f0f0] h-14 px-4 flex items-center gap-3">
                    <div className="flex-1 bg-white rounded-full h-10" />
                    <div className="w-10 h-10 rounded-full bg-[#075e54]" />
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
