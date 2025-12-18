import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { 
  Plus, 
  RefreshCw, 
  Trash2, 
  QrCode, 
  Smartphone,
  Loader2,
  Check,
  X,
  AlertTriangle,
  Wifi,
  WifiOff,
  Settings,
  ChevronDown
} from "lucide-react";

interface Connection {
  id: number;
  instanceName: string | null;
  NomeConexao: string | null;
  Telefone: string | null;
  FotoPerfil: string | null;
  Apikey: string | null;
  status?: 'open' | 'close' | 'checking';
}

const ConexoesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState<Record<number, boolean>>({});
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChatGptModal, setShowChatGptModal] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  
  // Form states
  const [newConnectionName, setNewConnectionName] = useState("");
  const [creatingConnection, setCreatingConnection] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{ base64?: string; pairingCode?: string } | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [chatGptApiKey, setChatGptApiKey] = useState("");
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [deletingConnection, setDeletingConnection] = useState(false);

  // Fetch connections
  const fetchConnections = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('disparos-api', {
        body: { action: 'get-connections', userId: user.id }
      });

      if (error) throw error;
      
      const conns = (data?.connections || []).map((c: Connection) => ({
        ...c,
        status: 'checking' as const
      }));
      
      setConnections(conns);
      
      // Check status for each connection
      for (const conn of conns) {
        checkConnectionStatus(conn);
      }
    } catch (error) {
      console.error('Error fetching connections:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as conexões",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  const checkConnectionStatus = async (connection: Connection) => {
    if (!connection.instanceName || !connection.Apikey) return;
    
    setCheckingStatus(prev => ({ ...prev, [connection.id]: true }));
    
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { 
          action: 'status', 
          instanceName: connection.instanceName,
          apikey: connection.Apikey
        }
      });

      if (error) throw error;
      
      const status = data?.state === 'open' ? 'open' : 'close';
      
      setConnections(prev => prev.map(c => 
        c.id === connection.id ? { ...c, status } : c
      ));
    } catch (error) {
      console.error('Error checking status:', error);
      setConnections(prev => prev.map(c => 
        c.id === connection.id ? { ...c, status: 'close' } : c
      ));
    } finally {
      setCheckingStatus(prev => ({ ...prev, [connection.id]: false }));
    }
  };

  const createConnection = async () => {
    if (!user?.id || !newConnectionName.trim()) return;
    
    try {
      setCreatingConnection(true);
      
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { 
          action: 'create-instance', 
          instanceName: newConnectionName.trim(),
          userId: user.id
        }
      });

      if (error) throw error;
      
      if (data?.qrcode?.base64) {
        setQrCodeData({ base64: data.qrcode.base64 });
        setShowCreateModal(false);
        setShowQrModal(true);
      } else if (data?.pairingCode) {
        setQrCodeData({ pairingCode: data.pairingCode });
        setShowCreateModal(false);
        setShowQrModal(true);
      }
      
      toast({
        title: "Sucesso",
        description: "Conexão criada! Escaneie o QR Code para conectar.",
      });
      
      // Refresh connections after creation
      setTimeout(() => fetchConnections(), 2000);
      
    } catch (error: any) {
      console.error('Error creating connection:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar a conexão",
        variant: "destructive"
      });
    } finally {
      setCreatingConnection(false);
      setNewConnectionName("");
    }
  };

  const showQrCode = async (connection: Connection) => {
    if (!connection.instanceName || !connection.Apikey) return;
    
    setSelectedConnection(connection);
    
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { 
          action: 'get-qrcode', 
          instanceName: connection.instanceName,
          apikey: connection.Apikey
        }
      });

      if (error) throw error;
      
      if (data?.base64) {
        setQrCodeData({ base64: data.base64 });
        setShowQrModal(true);
      } else if (data?.pairingCode) {
        setQrCodeData({ pairingCode: data.pairingCode });
        setShowQrModal(true);
      } else {
        toast({
          title: "Aviso",
          description: "Não foi possível obter o QR Code. A conexão pode já estar ativa.",
        });
      }
    } catch (error) {
      console.error('Error getting QR code:', error);
      toast({
        title: "Erro",
        description: "Não foi possível obter o QR Code",
        variant: "destructive"
      });
    }
  };

  const deleteConnection = async () => {
    if (!selectedConnection || !user?.id) return;
    
    try {
      setDeletingConnection(true);
      
      // Delete from Evolution API first
      if (selectedConnection.instanceName && selectedConnection.Apikey) {
        await supabase.functions.invoke('evolution-api', {
          body: { 
            action: 'delete-instance', 
            instanceName: selectedConnection.instanceName,
            apikey: selectedConnection.Apikey
          }
        });
      }
      
      // Delete from database using edge function (bypasses RLS)
      const { error } = await supabase.functions.invoke('disparos-api', {
        body: {
          action: 'delete-connection',
          userId: user.id,
          disparoData: { id: selectedConnection.id }
        }
      });

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Conexão excluída com sucesso!",
      });
      
      setConnections(prev => prev.filter(c => c.id !== selectedConnection.id));
      setShowDeleteModal(false);
      setSelectedConnection(null);
      
    } catch (error) {
      console.error('Error deleting connection:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a conexão",
        variant: "destructive"
      });
    } finally {
      setDeletingConnection(false);
    }
  };

  const saveChatGptApiKey = async () => {
    if (!user?.id) return;
    
    try {
      setSavingApiKey(true);
      
      // Use edge function to bypass RLS
      const { error } = await supabase.functions.invoke('disparos-api', {
        body: {
          action: 'update-user-apikey',
          userId: user.id,
          disparoData: { apikey_gpt: chatGptApiKey }
        }
      });

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Chave API do ChatGPT salva com sucesso!",
      });
      
      setShowChatGptModal(false);
      setChatGptApiKey("");
      
    } catch (error) {
      console.error('Error saving API key:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a chave API",
        variant: "destructive"
      });
    } finally {
      setSavingApiKey(false);
    }
  };

  const deleteDisconnectedConnections = async () => {
    if (!user?.id) return;
    
    const disconnected = connections.filter(c => c.status === 'close');
    
    if (disconnected.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há conexões desconectadas para excluir",
      });
      return;
    }

    for (const conn of disconnected) {
      try {
        if (conn.instanceName && conn.Apikey) {
          await supabase.functions.invoke('evolution-api', {
            body: { 
              action: 'delete-instance', 
              instanceName: conn.instanceName,
              apikey: conn.Apikey
            }
          });
        }
        
        // Use edge function to delete from database
        await supabase.functions.invoke('disparos-api', {
          body: {
            action: 'delete-connection',
            userId: user.id,
            disparoData: { id: conn.id }
          }
        });
          
      } catch (error) {
        console.error('Error deleting connection:', error);
      }
    }
    
    toast({
      title: "Sucesso",
      description: `${disconnected.length} conexões desconectadas foram excluídas`,
    });
    
    fetchConnections();
  };

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
            <Wifi className="w-3 h-3" />
            Conectado
          </span>
        );
      case 'close':
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-400 border border-red-500/30">
            <WifiOff className="w-3 h-3" />
            Desconectado
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
            <Loader2 className="w-3 h-3 animate-spin" />
            Verificando
          </span>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Conexões
            </h1>
            <p className="text-muted-foreground text-lg">
              Gerencie suas conexões do WhatsApp
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              onClick={deleteDisconnectedConnections}
              className="bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir Desconectadas
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setShowChatGptModal(true)}
              className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
            >
              <Settings className="w-4 h-4 mr-2" />
              API ChatGPT
            </Button>
            
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Conexão
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando conexões...</p>
          </div>
        ) : connections.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
            <Smartphone className="w-16 h-16 text-muted-foreground/50 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Nenhuma conexão encontrada
            </h3>
            <p className="text-muted-foreground max-w-md">
              Crie sua primeira conexão do WhatsApp clicando no botão "Nova Conexão"
            </p>
          </div>
        ) : (
          /* Connections Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="relative bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1"
              >
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  {getStatusBadge(connection.status)}
                </div>

                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full border-2 border-primary/30 overflow-hidden bg-primary/10 flex items-center justify-content-center">
                    {connection.FotoPerfil ? (
                      <img 
                        src={connection.FotoPerfil} 
                        alt={connection.NomeConexao || 'Perfil'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-primary text-xl font-bold">
                        {(connection.NomeConexao || 'W')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground truncate">
                      {connection.NomeConexao || 'Sem nome'}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      {connection.Telefone ? `+${connection.Telefone}` : 'Telefone não disponível'}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => checkConnectionStatus(connection)}
                    disabled={checkingStatus[connection.id]}
                    className="flex-1"
                  >
                    {checkingStatus[connection.id] ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span className="ml-2">Verificar</span>
                  </Button>
                  
                  {connection.status === 'close' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => showQrCode(connection)}
                      className="flex-1 border-primary/30 text-primary hover:bg-primary/10"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      QR Code
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedConnection(connection);
                      setShowDeleteModal(true);
                    }}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Connection Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conexão</DialogTitle>
            <DialogDescription>
              Digite um nome para identificar esta conexão do WhatsApp
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                Nome da Conexão
              </label>
              <Input
                placeholder="Ex: Comercial, Suporte, etc."
                value={newConnectionName}
                onChange={(e) => setNewConnectionName(e.target.value)}
                className="w-full"
              />
            </div>
            
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              Como conectar?
              <ChevronDown className={`w-4 h-4 transition-transform ${showInstructions ? 'rotate-180' : ''}`} />
            </button>
            
            {showInstructions && (
              <div className="bg-muted/50 rounded-lg p-4 space-y-3 text-sm animate-in slide-in-from-top-2">
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                  <div>
                    <p className="font-medium">Abra o WhatsApp</p>
                    <p className="text-muted-foreground">No seu celular</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                  <div>
                    <p className="font-medium">Vá em Configurações</p>
                    <p className="text-muted-foreground">Toque em "Aparelhos conectados"</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                  <div>
                    <p className="font-medium">Escaneie o QR Code</p>
                    <p className="text-muted-foreground">Aponte para o código exibido</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={createConnection}
              disabled={!newConnectionName.trim() || creatingConnection}
            >
              {creatingConnection ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 mr-2" />
                  Gerar QR Code
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={showQrModal} onOpenChange={setShowQrModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Escaneie o QR Code</DialogTitle>
            <DialogDescription className="text-center">
              Use o WhatsApp do seu celular para escanear
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col items-center py-6">
            {qrCodeData?.base64 ? (
              <div className="bg-white p-4 rounded-xl">
                <img 
                  src={qrCodeData.base64} 
                  alt="QR Code" 
                  className="w-64 h-64 object-contain"
                />
              </div>
            ) : qrCodeData?.pairingCode ? (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">Código de pareamento:</p>
                <div className="bg-primary text-primary-foreground text-3xl font-mono font-bold py-4 px-8 rounded-lg tracking-widest">
                  {qrCodeData.pairingCode}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center w-64 h-64 bg-muted rounded-xl">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
            
            <p className="text-sm text-muted-foreground mt-4 text-center">
              O QR Code expira em alguns segundos. Se expirar, feche e abra novamente.
            </p>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowQrModal(false);
                setQrCodeData(null);
              }}
              className="w-full"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              Excluir Conexão
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta conexão?
            </DialogDescription>
          </DialogHeader>
          
          {selectedConnection && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 my-4">
              <p className="font-medium text-foreground">
                {selectedConnection.NomeConexao || 'Sem nome'}
              </p>
              <p className="text-sm text-muted-foreground">
                {selectedConnection.Telefone ? `+${selectedConnection.Telefone}` : 'Telefone não disponível'}
              </p>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedConnection(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={deleteConnection}
              disabled={deletingConnection}
            >
              {deletingConnection ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ChatGPT API Key Modal */}
      <Dialog open={showChatGptModal} onOpenChange={setShowChatGptModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <Settings className="w-5 h-5" />
              Chave API do ChatGPT
            </DialogTitle>
            <DialogDescription>
              Configure sua chave API para usar recursos de IA nos disparos
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <label className="text-sm font-medium text-foreground mb-2 block">
              API Key
            </label>
            <Input
              type="password"
              placeholder="sk-..."
              value={chatGptApiKey}
              onChange={(e) => setChatGptApiKey(e.target.value)}
              className="w-full"
            />
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowChatGptModal(false);
                setChatGptApiKey("");
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={saveChatGptApiKey}
              disabled={!chatGptApiKey.trim() || savingApiKey}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {savingApiKey ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Salvar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ConexoesPage;
