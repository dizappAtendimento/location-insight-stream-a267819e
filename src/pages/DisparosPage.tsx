import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
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
  Clock,
  Phone,
  CheckCircle,
  Loader2,
  Sparkles,
  Info,
  ChevronDown,
  Bold,
  Italic,
  Strikethrough,
  Code,
} from 'lucide-react';

interface Connection {
  id: number;
  instanceName: string | null;
  NomeConexao: string | null;
  Telefone: string | null;
  FotoPerfil: string | null;
  status?: 'open' | 'close';
}

interface Lista {
  id: number;
  nome: string;
  tipo: string | null;
  campos: any;
}

interface MessageItem {
  id: number;
  text: string;
  mediaType: 'image' | 'video' | 'audio' | 'document' | null;
  mediaUrl: string | null;
  mediaName: string | null;
}

const defaultVariables = [
  { name: 'nome', label: 'Nome' },
  { name: 'telefone', label: 'Telefone' },
];

const timeVariables = [
  { name: 'saudacao', label: 'Saudação (Bom dia/tarde/noite)' },
  { name: 'hora', label: 'Hora atual' },
  { name: 'data', label: 'Data atual' },
  { name: 'dia_semana', label: 'Dia da semana' },
];

export default function DisparosPage() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [listas, setListas] = useState<Lista[]>([]);
  const [selectedConnections, setSelectedConnections] = useState<number[]>([]);
  const [selectedListas, setSelectedListas] = useState<number[]>([]);
  const [messages, setMessages] = useState<MessageItem[]>([
    { id: 1, text: '', mediaType: null, mediaUrl: null, mediaName: null }
  ]);
  const [intervaloMin, setIntervaloMin] = useState(5);
  const [intervaloMax, setIntervaloMax] = useState(15);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [enableMissedCall, setEnableMissedCall] = useState(false);
  const [enableAI, setEnableAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [isLoadingListas, setIsLoadingListas] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [customVariables, setCustomVariables] = useState<string[]>([]);
  const timeDropdownRef = useRef<HTMLDivElement>(null);
  const textareaRefs = useRef<{ [key: number]: HTMLTextAreaElement | null }>({});

  useEffect(() => {
    fetchConnections();
    fetchListas();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
        setShowTimeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Extract custom variables from selected lists
    const allCampos = new Set<string>();
    selectedListas.forEach(listaId => {
      const lista = listas.find(l => l.id === listaId);
      if (lista?.campos) {
        try {
          const campos = typeof lista.campos === 'string' ? JSON.parse(lista.campos) : lista.campos;
          if (Array.isArray(campos)) {
            campos.forEach((campo: string) => allCampos.add(campo));
          }
        } catch (e) {
          console.error('Error parsing campos:', e);
        }
      }
    });
    setCustomVariables(Array.from(allCampos));
  }, [selectedListas, listas]);

  const fetchConnections = async () => {
    if (!user?.id) return;
    setIsLoadingConnections(true);
    try {
      const { data, error } = await supabase.functions.invoke('disparos-api', {
        body: {
          action: 'get-connections',
          userId: user.id,
        },
      });

      if (error) throw error;

      const connectionsData = data?.connections || [];
      
      // Fetch status for each connection
      const connectionsWithStatus: Connection[] = await Promise.all(
        connectionsData.map(async (conn: any) => {
          try {
            const response = await supabase.functions.invoke('evolution-api', {
              body: {
                action: 'status',
                instanceName: conn.instanceName,
                apikey: conn.Apikey,
              },
            });
            return {
              ...conn,
              status: (response.data?.state === 'open' ? 'open' : 'close') as 'open' | 'close',
            };
          } catch {
            return { ...conn, status: 'close' as const };
          }
        })
      );

      setConnections(connectionsWithStatus);
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast.error('Erro ao carregar conexões');
    } finally {
      setIsLoadingConnections(false);
    }
  };

  const fetchListas = async () => {
    if (!user?.id) return;
    setIsLoadingListas(true);
    try {
      const { data, error } = await supabase.functions.invoke('disparos-api', {
        body: {
          action: 'get-listas',
          userId: user.id,
        },
      });

      if (error) throw error;
      setListas(data?.listas || []);
    } catch (error) {
      console.error('Error fetching listas:', error);
      toast.error('Erro ao carregar listas');
    } finally {
      setIsLoadingListas(false);
    }
  };

  const toggleConnection = (id: number) => {
    setSelectedConnections(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const toggleLista = (id: number) => {
    setSelectedListas(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  };

  const selectActiveConnections = () => {
    const activeIds = connections
      .filter(c => c.status === 'open')
      .map(c => c.id);
    setSelectedConnections(activeIds);
  };

  const addMessage = () => {
    const newId = Math.max(...messages.map(m => m.id), 0) + 1;
    setMessages([...messages, { id: newId, text: '', mediaType: null, mediaUrl: null, mediaName: null }]);
  };

  const removeMessage = (id: number) => {
    if (messages.length > 1) {
      setMessages(messages.filter(m => m.id !== id));
    }
  };

  const updateMessageText = (id: number, text: string) => {
    setMessages(messages.map(m => m.id === id ? { ...m, text } : m));
  };

  const insertVariable = (messageId: number, variable: string) => {
    const textarea = textareaRefs.current[messageId];
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentText = messages.find(m => m.id === messageId)?.text || '';
      const newText = currentText.substring(0, start) + `{{${variable}}}` + currentText.substring(end);
      updateMessageText(messageId, newText);
      setTimeout(() => {
        textarea.focus();
        const newPosition = start + variable.length + 4;
        textarea.setSelectionRange(newPosition, newPosition);
      }, 0);
    }
  };

  const insertFormat = (messageId: number, format: 'bold' | 'italic' | 'strike' | 'mono') => {
    const textarea = textareaRefs.current[messageId];
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentText = messages.find(m => m.id === messageId)?.text || '';
      const selectedText = currentText.substring(start, end);
      
      let formattedText = '';
      switch (format) {
        case 'bold':
          formattedText = `*${selectedText}*`;
          break;
        case 'italic':
          formattedText = `_${selectedText}_`;
          break;
        case 'strike':
          formattedText = `~${selectedText}~`;
          break;
        case 'mono':
          formattedText = `\`\`\`${selectedText}\`\`\``;
          break;
      }
      
      const newText = currentText.substring(0, start) + formattedText + currentText.substring(end);
      updateMessageText(messageId, newText);
    }
  };

  const handleMediaUpload = async (messageId: number, file: File, type: 'image' | 'video' | 'audio' | 'document') => {
    try {
      const fileName = `${user?.id}/${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('arquivos')
        .upload(fileName, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage.from('arquivos').getPublicUrl(fileName);
      
      setMessages(messages.map(m => 
        m.id === messageId 
          ? { ...m, mediaType: type, mediaUrl: urlData.publicUrl, mediaName: file.name }
          : m
      ));
      
      toast.success('Mídia enviada com sucesso!');
    } catch (error) {
      console.error('Error uploading media:', error);
      toast.error('Erro ao enviar mídia');
    }
  };

  const removeMedia = (messageId: number) => {
    setMessages(messages.map(m => 
      m.id === messageId 
        ? { ...m, mediaType: null, mediaUrl: null, mediaName: null }
        : m
    ));
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Digite uma descrição para a mensagem');
      return;
    }

    setIsGeneratingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('disparos-api', {
        body: {
          action: 'generate-ai-message',
          userId: user?.id,
          disparoData: { 
            prompt: aiPrompt,
            currentMessages: messages.map(m => m.text).filter(t => t.trim())
          }
        }
      });

      if (error) throw error;

      if (data?.error) {
        if (data.error.includes('API key')) {
          toast.error('Configure sua API key do ChatGPT em Conexões');
        } else {
          toast.error(data.error);
        }
        return;
      }

      if (data?.message) {
        // Update first message with AI generated content
        setMessages(prev => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[0] = { ...updated[0], text: data.message };
          }
          return updated;
        });
        toast.success('Mensagem gerada com sucesso!');
      }
    } catch (error: any) {
      console.error('Error generating AI message:', error);
      toast.error('Erro ao gerar mensagem com IA');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSubmit = async () => {
    if (selectedConnections.length === 0) {
      toast.error('Selecione pelo menos uma conexão');
      return;
    }
    if (selectedListas.length === 0) {
      toast.error('Selecione pelo menos uma lista');
      return;
    }
    if (messages.every(m => !m.text.trim() && !m.mediaUrl)) {
      toast.error('Adicione pelo menos uma mensagem');
      return;
    }

    setIsSubmitting(true);
    try {
      const mensagens = messages.map(m => ({
        texto: m.text,
        mediaType: m.mediaType,
        mediaUrl: m.mediaUrl,
      }));

      const { data, error } = await supabase.rpc('create_disparo', {
        p_payload: {
          userId: user?.id,
          idConexoes: selectedConnections,
          idListas: selectedListas,
          Mensagens: mensagens,
          intervaloMin,
          intervaloMax,
          StartTime: startTime,
          EndTime: endTime,
          TipoDisparo: 'contatos',
          StatusDisparo: 'pendente',
          FakeCall: enableMissedCall,
        },
      });

      if (error) throw error;

      toast.success('Disparo criado com sucesso!');
      
      // Reset form
      setSelectedConnections([]);
      setSelectedListas([]);
      setMessages([{ id: 1, text: '', mediaType: null, mediaUrl: null, mediaName: null }]);
    } catch (error) {
      console.error('Error creating disparo:', error);
      toast.error('Erro ao criar disparo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Disparos de Mensagens
          </h1>
          <p className="text-muted-foreground">
            Configure e envie mensagens em massa para seus contatos
          </p>
        </div>

        <div className="grid gap-6">
          {/* Conexões */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Conexões WhatsApp</CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={selectActiveConnections}
                    className="text-xs"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Selecionar Ativas
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={fetchConnections}
                    disabled={isLoadingConnections}
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingConnections ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingConnections ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : connections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  Nenhuma conexão encontrada
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[200px] overflow-y-auto pr-2">
                  {connections.map((conn) => (
                    <div
                      key={conn.id}
                      onClick={() => toggleConnection(conn.id)}
                      className={`relative p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedConnections.includes(conn.id)
                          ? 'border-primary bg-primary/10'
                          : 'border-border/50 bg-muted/20 hover:border-primary/40'
                      }`}
                    >
                      {selectedConnections.includes(conn.id) && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                          {conn.FotoPerfil ? (
                            <img src={conn.FotoPerfil} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-primary font-bold">
                              {conn.NomeConexao?.charAt(0).toUpperCase() || 'W'}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{conn.NomeConexao || 'Conexão'}</p>
                          <p className="text-xs text-muted-foreground truncate">{conn.Telefone}</p>
                        </div>
                      </div>
                      <Badge
                        variant={conn.status === 'open' ? 'default' : 'destructive'}
                        className="absolute top-2 right-2 text-[10px] px-1.5"
                        style={selectedConnections.includes(conn.id) ? { top: '28px' } : {}}
                      >
                        {conn.status === 'open' ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
              {selectedConnections.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                  <span className="text-primary font-medium">{selectedConnections.length}</span> conexão(ões) selecionada(s)
                </div>
              )}
            </CardContent>
          </Card>

          {/* Listas */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Listas de Contatos</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={fetchListas}
                  disabled={isLoadingListas}
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingListas ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingListas ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : listas.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                  Nenhuma lista encontrada
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[200px] overflow-y-auto pr-2">
                  {listas.map((lista) => (
                    <div
                      key={lista.id}
                      onClick={() => toggleLista(lista.id)}
                      className={`relative p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedListas.includes(lista.id)
                          ? 'border-primary bg-primary/10'
                          : 'border-border/50 bg-muted/20 hover:border-primary/40'
                      }`}
                    >
                      {selectedListas.includes(lista.id) && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <CheckCircle className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{lista.nome}</p>
                          <p className="text-xs text-muted-foreground capitalize">{lista.tipo || 'contatos'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedListas.length > 0 && (
                <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                  <span className="text-primary font-medium">{selectedListas.length}</span> lista(s) selecionada(s)
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mensagens */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Mensagens</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className="p-4 rounded-lg border border-border/50 bg-muted/20"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-primary">
                      Mensagem {index + 1}
                    </span>
                    {messages.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMessage(message.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  {/* Variáveis */}
                  <div className="mb-3">
                    <Label className="text-xs text-muted-foreground mb-2 block">
                      Variáveis disponíveis
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {defaultVariables.map((v) => (
                        <Button
                          key={v.name}
                          variant="outline"
                          size="sm"
                          onClick={() => insertVariable(message.id, v.name)}
                          className="text-xs h-7 px-2"
                        >
                          {`{{${v.label}}}`}
                        </Button>
                      ))}
                      
                      {/* Time variables dropdown */}
                      <div className="relative" ref={timeDropdownRef}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowTimeDropdown(!showTimeDropdown)}
                          className="text-xs h-7 px-2"
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          Tempo
                          <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showTimeDropdown ? 'rotate-180' : ''}`} />
                        </Button>
                        {showTimeDropdown && (
                          <div className="absolute top-full left-0 mt-1 z-50 bg-popover border border-border rounded-lg p-2 shadow-lg min-w-[200px]">
                            {timeVariables.map((v) => (
                              <Button
                                key={v.name}
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  insertVariable(message.id, v.name);
                                  setShowTimeDropdown(false);
                                }}
                                className="w-full justify-start text-xs h-8"
                              >
                                {v.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>

                      {customVariables.map((v) => (
                        <Button
                          key={v}
                          variant="outline"
                          size="sm"
                          onClick={() => insertVariable(message.id, v)}
                          className="text-xs h-7 px-2"
                        >
                          {`{{${v}}}`}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Formatting buttons */}
                  <div className="flex gap-2 mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => insertFormat(message.id, 'bold')}
                      className="h-8 w-8 p-0"
                    >
                      <Bold className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => insertFormat(message.id, 'italic')}
                      className="h-8 w-8 p-0"
                    >
                      <Italic className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => insertFormat(message.id, 'strike')}
                      className="h-8 w-8 p-0"
                    >
                      <Strikethrough className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => insertFormat(message.id, 'mono')}
                      className="h-8 w-8 p-0"
                    >
                      <Code className="w-4 h-4" />
                    </Button>
                  </div>

                  <Textarea
                    ref={(el) => { textareaRefs.current[message.id] = el; }}
                    value={message.text}
                    onChange={(e) => updateMessageText(message.id, e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="min-h-[100px] font-mono text-sm"
                  />

                  {/* Media upload */}
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[
                      { type: 'image' as const, icon: Image, label: 'Imagem', accept: 'image/*' },
                      { type: 'video' as const, icon: Video, label: 'Vídeo', accept: 'video/*' },
                      { type: 'audio' as const, icon: FileAudio, label: 'Áudio', accept: 'audio/*' },
                      { type: 'document' as const, icon: FileText, label: 'Doc', accept: '.pdf,.doc,.docx,.xls,.xlsx' },
                    ].map((media) => (
                      <label
                        key={media.type}
                        className={`relative flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all ${
                          message.mediaType === media.type
                            ? 'border-primary bg-primary/10'
                            : 'border-border/50 hover:border-primary/40'
                        }`}
                      >
                        <input
                          type="file"
                          accept={media.accept}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleMediaUpload(message.id, file, media.type);
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                        <media.icon className="w-5 h-5 mb-1" />
                        <span className="text-xs">{media.label}</span>
                      </label>
                    ))}
                  </div>

                  {/* Media preview */}
                  {message.mediaUrl && (
                    <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-sm truncate max-w-[200px]">{message.mediaName}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMedia(message.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
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

          {/* Configurações */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Configurações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Intervalo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Intervalo Mínimo (seg)</Label>
                  <Input
                    type="number"
                    value={intervaloMin}
                    onChange={(e) => setIntervaloMin(Number(e.target.value))}
                    min={1}
                  />
                </div>
                <div>
                  <Label>Intervalo Máximo (seg)</Label>
                  <Input
                    type="number"
                    value={intervaloMax}
                    onChange={(e) => setIntervaloMax(Number(e.target.value))}
                    min={1}
                  />
                </div>
              </div>

              {/* Horário */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Hora Início</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Hora Fim</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </div>
              </div>

              {/* Ligação perdida */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted/20 border border-border/50">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">Ligação Perdida</p>
                    <p className="text-xs text-muted-foreground">
                      Simula uma ligação antes da mensagem
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enableMissedCall}
                  onCheckedChange={setEnableMissedCall}
                />
              </div>

              {/* AI */}
              <div className="p-4 rounded-lg bg-muted/20 border border-border/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                    <div>
                      <p className="font-medium text-sm">Gerar com IA</p>
                      <p className="text-xs text-muted-foreground">
                        Use ChatGPT para melhorar suas mensagens
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={enableAI}
                    onCheckedChange={setEnableAI}
                  />
                </div>

                {enableAI && (
                  <div className="space-y-3 pt-3 border-t border-border/30">
                    <Textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Descreva o tipo de mensagem que deseja gerar..."
                      className="min-h-[80px]"
                    />
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                      <Info className="w-4 h-4 text-emerald-500 mt-0.5" />
                      <p className="text-xs text-emerald-500">
                        A IA irá variar a mensagem para cada contato, mantendo o mesmo contexto.
                      </p>
                    </div>
                    <Button 
                      className="w-full bg-emerald-600 hover:bg-emerald-700"
                      onClick={generateWithAI}
                      disabled={isGeneratingAI || !aiPrompt.trim()}
                    >
                      {isGeneratingAI ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Gerando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Gerar Mensagem com IA
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Botão Enviar */}
          <Button
            size="lg"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-14 text-lg font-semibold"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Criando disparo...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Iniciar Disparo
              </>
            )}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
