import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  ChevronDown,
  Clock,
  Crown
} from "lucide-react";

interface Connection {
  id: number;
  instanceName: string | null;
  NomeConexao: string | null;
  Telefone: string | null;
  FotoPerfil: string | null;
  Apikey: string | null;
  status?: 'open' | 'close' | 'checking';
  crmAtivo?: boolean;
}

const ConexoesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState<Record<number, boolean>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChatGptModal, setShowChatGptModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  
  // Form states
  const [newConnectionName, setNewConnectionName] = useState("");
  const [creatingConnection, setCreatingConnection] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{ base64?: string; pairingCode?: string } | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [chatGptApiKey, setChatGptApiKey] = useState("");
  const [savedApiKey, setSavedApiKey] = useState<string | null>(null);
  const [isReplacingApiKey, setIsReplacingApiKey] = useState(false);
  const [savingApiKey, setSavingApiKey] = useState(false);
  const [deletingConnection, setDeletingConnection] = useState(false);
  const [forceDeleting, setForceDeleting] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [connectionInstanceName, setConnectionInstanceName] = useState<string | null>(null);
  const [hasPendingDispatches, setHasPendingDispatches] = useState(false);
  const [qrTimeRemaining, setQrTimeRemaining] = useState(120); // 2 minutes in seconds
  const [checkCount, setCheckCount] = useState(0);
  const [planLimit, setPlanLimit] = useState<number | null>(null);

  // Fetch connections using list-user-instances (same as WhatsApp Groups page)
  const fetchConnections = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Use list-user-instances que já retorna o status verificado
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { action: 'list-user-instances', userId: user.id }
      });

      if (error) throw error;
      
      const instances = data?.instances || [];
      console.log('[Conexões] Loaded instances:', instances.length);
      
      // Map to Connection format
      const conns: Connection[] = instances.map((inst: any) => ({
        id: inst.id,
        instanceName: inst.instanceName,
        NomeConexao: inst.NomeConexao,
        Telefone: inst.Telefone,
        FotoPerfil: inst.FotoPerfil,
        Apikey: inst.Apikey,
        status: inst.status === 'open' ? 'open' : 'close',
        crmAtivo: inst.crmAtivo
      }));
      
      setConnections(conns);
      setLastUpdated(new Date());
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

  // Fetch plan limit for connections
  const fetchPlanLimit = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('vw_Usuarios_Com_Plano')
        .select('plano_qntConexoes')
        .eq('id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      setPlanLimit(data?.plano_qntConexoes ?? null);
    } catch (error) {
      console.error('Error fetching plan limit:', error);
    }
  }, [user?.id]);

  // Manual status check for a single connection
  const checkConnectionStatus = async (connection: Connection) => {
    if (!connection.instanceName) {
      setConnections(prev => prev.map(c => 
        c.id === connection.id ? { ...c, status: 'close' } : c
      ));
      return;
    }
    
    setCheckingStatus(prev => ({ ...prev, [connection.id]: true }));
    
    try {
      // Use list-user-instances to get updated status
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { action: 'list-user-instances', userId: user?.id }
      });

      if (error) throw error;
      
      const instances = data?.instances || [];
      const instance = instances.find((inst: any) => inst.id === connection.id);
      const status = instance?.status === 'open' ? 'open' : 'close';
      
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
    
    // Check plan limit before creating - open limit modal instead of toast
    if (planLimit !== null && connections.length >= planLimit) {
      setShowCreateModal(false);
      setShowLimitModal(true);
      return;
    }
    
    try {
      setCreatingConnection(true);
      
      // Generate unique instance name
      const instanceName = `${newConnectionName.trim()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      
      // Use fetch directly to properly handle 400 responses
      const response = await fetch('https://egxwzmkdbymxooielidc.supabase.co/functions/v1/evolution-api', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVneHd6bWtkYnlteG9vaWVsaWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjgzNjcsImV4cCI6MjA3OTkwNDM2N30.XJB9t5brPcRrAmLQ_AJDsxlKEg8yYtgWZks7jgXFrdk',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVneHd6bWtkYnlteG9vaWVsaWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjgzNjcsImV4cCI6MjA3OTkwNDM2N30.XJB9t5brPcRrAmLQ_AJDsxlKEg8yYtgWZks7jgXFrdk`
        },
        body: JSON.stringify({
          action: 'create-instance', 
          instanceName: instanceName,
          userId: user.id,
          data: { displayName: newConnectionName.trim() }
        })
      });
      
      const data = await response.json();
      
      // Check for limit error in response
      if (data?.code === 'CONNECTION_LIMIT_REACHED' || data?.error?.includes?.('Limite de conexões')) {
        setShowCreateModal(false);
        setShowLimitModal(true);
        return;
      }
      
      // Check for other errors
      if (!response.ok || data?.error) {
        console.error('Create connection error:', data);
        throw new Error(data?.error || 'Não foi possível criar a conexão');
      }
      
      // Save instance name for polling
      setConnectionInstanceName(instanceName);
      
      if (data?.qrcode?.base64) {
        setQrCodeData({ base64: data.qrcode.base64 });
        setShowCreateModal(false);
        setShowQrModal(true);
        
        toast({
          title: "Sucesso",
          description: "Conexão criada! Escaneie o QR Code para conectar.",
        });
      } else if (data?.pairingCode) {
        setQrCodeData({ pairingCode: data.pairingCode });
        setShowCreateModal(false);
        setShowQrModal(true);
        
        toast({
          title: "Sucesso",
          description: "Conexão criada! Escaneie o QR Code para conectar.",
        });
      } else {
        toast({
          title: "Aviso",
          description: "Conexão criada, mas não foi possível obter o QR Code.",
        });
      }
      
    } catch (error: any) {
      console.error('Error creating connection:', error);
      
      // Final check for limit error in catch
      const errorStr = error?.message || '';
      if (errorStr.includes('CONNECTION_LIMIT_REACHED') || errorStr.includes('Limite de conexões')) {
        setShowCreateModal(false);
        setShowLimitModal(true);
      } else {
        toast({
          title: "Erro",
          description: error.message || "Não foi possível criar a conexão",
          variant: "destructive"
        });
        setShowCreateModal(false);
      }
    } finally {
      setCreatingConnection(false);
      setNewConnectionName("");
    }
  };

  // Poll for connection status when QR modal is open
  useEffect(() => {
    if (!showQrModal || !connectionInstanceName) return;
    
    let isCancelled = false;
    setCheckingConnection(true);
    setQrTimeRemaining(120);
    setCheckCount(0);
    
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('evolution-api', {
          body: { 
            action: 'get-instance', 
            instanceName: connectionInstanceName
          }
        });

        if (error || isCancelled) return;
        
        setCheckCount(prev => prev + 1);
        
        // Check all possible status fields from Evolution API
        const state = data?.connectionState || 
                      data?.instance?.connectionStatus || 
                      data?.instance?.state || 
                      data?.instance?.status;
        console.log('[Connection] Status check:', connectionInstanceName, 'state:', state, 'data:', JSON.stringify(data));
        
        if (state === 'open') {
          // Connection successful!
          setShowQrModal(false);
          setQrCodeData(null);
          setConnectionInstanceName(null);
          setCheckingConnection(false);
          setQrTimeRemaining(120);
          setCheckCount(0);
          
          toast({
            title: "Conectado!",
            description: "WhatsApp conectado com sucesso!",
          });
          
          // Refresh connections list
          fetchConnections();
        }
      } catch (err) {
        console.error('[Connection] Error checking status:', err);
      }
    };
    
    // Check immediately and then every 3 seconds
    checkStatus();
    const statusInterval = setInterval(checkStatus, 3000);
    
    // Countdown timer - update every second
    const countdownInterval = setInterval(() => {
      setQrTimeRemaining(prev => {
        if (prev <= 1) {
          // Timeout - close modal
          setShowQrModal(false);
          setQrCodeData(null);
          setConnectionInstanceName(null);
          setCheckingConnection(false);
          setCheckCount(0);
          toast({
            title: "Tempo esgotado",
            description: "O QR Code expirou. Tente novamente.",
            variant: "destructive"
          });
          return 120;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => {
      isCancelled = true;
      clearInterval(statusInterval);
      clearInterval(countdownInterval);
      setCheckingConnection(false);
    };
  }, [showQrModal, connectionInstanceName, fetchConnections, toast]);

  const showQrCode = async (connection: Connection) => {
    if (!connection.instanceName || !connection.Apikey) return;
    
    setSelectedConnection(connection);
    // Save instance name for polling to detect connection
    setConnectionInstanceName(connection.instanceName);
    
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
        setConnectionInstanceName(null);
        toast({
          title: "Aviso",
          description: "Não foi possível obter o QR Code. A conexão pode já estar ativa.",
        });
      }
    } catch (error) {
      console.error('Error getting QR code:', error);
      setConnectionInstanceName(null);
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
      setHasPendingDispatches(false);
      
      // Delete from database first to check if there are pending dispatches
      const { data, error } = await supabase.functions.invoke('disparos-api', {
        body: {
          action: 'delete-connection',
          userId: user.id,
          disparoData: { id: selectedConnection.id }
        }
      });

      // Check for FunctionsHttpError (non-2xx status) - indicates pending dispatches
      if (error) {
        console.error('Delete connection error:', error);
        setHasPendingDispatches(true);
        setDeletingConnection(false);
        return;
      }
      
      // Check for specific error in response data
      if (data?.error) {
        setHasPendingDispatches(true);
        setDeletingConnection(false);
        return;
      }
      
      // Only delete from Evolution API if database deletion was successful
      if (selectedConnection.instanceName) {
        const { error: evolutionError } = await supabase.functions.invoke('evolution-api', {
          body: { 
            action: 'delete-instance', 
            instanceName: selectedConnection.instanceName,
            apikey: selectedConnection.Apikey,
            userId: user.id
          }
        });
        
        if (evolutionError) {
          console.error('Error deleting from Evolution API:', evolutionError);
        }
      }
      
      toast({
        title: "Sucesso",
        description: "Conexão excluída com sucesso!",
      });
      
      setConnections(prev => prev.filter(c => c.id !== selectedConnection.id));
      setShowDeleteModal(false);
      setSelectedConnection(null);
      setHasPendingDispatches(false);
      
    } catch (error: any) {
      console.error('Error deleting connection:', error);
      toast({
        title: "Erro",
        description: 'Não foi possível excluir a conexão',
        variant: "destructive"
      });
    } finally {
      setDeletingConnection(false);
    }
  };

  const forceDeleteConnection = async () => {
    if (!selectedConnection || !user?.id) return;
    
    try {
      setForceDeleting(true);
      
      // Force delete - cancels pending dispatches first
      const { data, error } = await supabase.functions.invoke('disparos-api', {
        body: {
          action: 'force-delete-connection',
          userId: user.id,
          disparoData: { id: selectedConnection.id }
        }
      });

      if (error) {
        console.error('Force delete connection error:', error);
        throw error;
      }
      
      if (data?.error) {
        throw new Error(data.error);
      }
      
      // Delete from Evolution API
      if (selectedConnection.instanceName) {
        const { error: evolutionError } = await supabase.functions.invoke('evolution-api', {
          body: { 
            action: 'delete-instance', 
            instanceName: selectedConnection.instanceName,
            apikey: selectedConnection.Apikey,
            userId: user.id
          }
        });
        
        if (evolutionError) {
          console.error('Error deleting from Evolution API:', evolutionError);
        }
      }
      
      const cancelledCount = data?.cancelledCount || 0;
      toast({
        title: "Sucesso",
        description: cancelledCount > 0 
          ? `Conexão excluída! ${cancelledCount} disparo(s) pendente(s) foram cancelados.`
          : "Conexão excluída com sucesso!",
      });
      
      setConnections(prev => prev.filter(c => c.id !== selectedConnection.id));
      setShowDeleteModal(false);
      setSelectedConnection(null);
      setHasPendingDispatches(false);
      
    } catch (error: any) {
      console.error('Error force deleting connection:', error);
      toast({
        title: "Erro",
        description: 'Não foi possível excluir a conexão',
        variant: "destructive"
      });
    } finally {
      setForceDeleting(false);
    }
  };

  const saveXaiApiKey = async () => {
    if (!user?.id) return;
    
    try {
      setSavingApiKey(true);
      
      // First validate the API key
      if (chatGptApiKey.trim()) {
        toast({
          title: "Validando...",
          description: "Verificando se a chave API é válida",
        });
        
        const { data: validationResult, error: validationError } = await supabase.functions.invoke('disparos-api', {
          body: {
            action: 'validate-xai-key',
            disparoData: { apikey_gpt: chatGptApiKey.trim() }
          }
        });

        if (validationError) throw validationError;
        
        if (!validationResult?.valid) {
          toast({
            title: "Chave Inválida",
            description: validationResult?.error || "A chave API do xAI não é válida. Verifique e tente novamente.",
            variant: "destructive"
          });
          setSavingApiKey(false);
          return;
        }
      }
      
      // Use edge function to bypass RLS
      const { error } = await supabase.functions.invoke('disparos-api', {
        body: {
          action: 'update-user-apikey',
          userId: user.id,
          disparoData: { apikey_gpt: chatGptApiKey.trim() || null }
        }
      });

      if (error) throw error;
      
      // Update saved API key state to show masked version
      setSavedApiKey(chatGptApiKey.trim());
      setIsReplacingApiKey(false);
      setChatGptApiKey("");
      
      toast({
        title: "Sucesso",
        description: "Chave API do xAI salva com sucesso!",
      });
      
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

  const fetchSavedApiKey = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('SAAS_Usuarios')
        .select('apikey_gpt')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;
      setSavedApiKey(data?.apikey_gpt || null);
    } catch (error) {
      console.error('Error fetching API key:', error);
    }
  };

  const openXaiModal = () => {
    fetchSavedApiKey();
    setIsReplacingApiKey(false);
    setChatGptApiKey("");
    setShowChatGptModal(true);
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return `${key.substring(0, 5)}...${key.substring(key.length - 4)}`;
  };

  const [activatingCrm, setActivatingCrm] = useState<Record<number, boolean>>({});

  const toggleCrmForConnection = async (connection: Connection) => {
    if (!user?.id || !connection.instanceName) return;
    
    const isCurrentlyActive = connection.crmAtivo;
    const newCrmStatus = !isCurrentlyActive;
    setActivatingCrm(prev => ({ ...prev, [connection.id]: true }));
    
    try {
      // 1. Configure/remove webhook on Evolution API
      const { error: webhookError } = await supabase.functions.invoke('evolution-api', {
        body: { 
          action: isCurrentlyActive ? 'remove-crm-webhook' : 'setup-crm-webhook', 
          instanceName: connection.instanceName,
          userId: user.id
        }
      });

      if (webhookError) throw webhookError;
      
      // 2. Save status to database
      const { error: dbError } = await supabase.functions.invoke('disparos-api', {
        body: { 
          action: 'update-connection-crm',
          userId: user.id,
          disparoData: {
            connectionId: connection.id,
            crmAtivo: newCrmStatus
          }
        }
      });

      if (dbError) throw dbError;
      
      // Update local state
      setConnections(prev => prev.map(c => 
        c.id === connection.id ? { ...c, crmAtivo: newCrmStatus } : c
      ));
      
      toast({
        title: isCurrentlyActive ? "CRM Desativado" : "CRM Ativado!",
        description: isCurrentlyActive 
          ? `CRM desativado para ${connection.NomeConexao || connection.instanceName}`
          : `Respostas de ${connection.NomeConexao || connection.instanceName} virão para o CRM automaticamente.`,
      });
    } catch (error) {
      console.error('Error toggling CRM:', error);
      toast({
        title: "Erro",
        description: `Não foi possível ${isCurrentlyActive ? 'desativar' : 'ativar'} o CRM`,
        variant: "destructive"
      });
    } finally {
      setActivatingCrm(prev => ({ ...prev, [connection.id]: false }));
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
    fetchPlanLimit();
    
    // Auto-refresh a cada 20 segundos
    const interval = setInterval(() => {
      fetchConnections();
    }, 20000);
    
    return () => clearInterval(interval);
  }, [fetchConnections, fetchPlanLimit]);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'open':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium status-connected">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
            Conectado
          </span>
        );
      case 'close':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium status-disconnected">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 dark:bg-red-400" />
            Desconectado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium status-pending">
            <Loader2 className="w-3 h-3 animate-spin" />
            Verificando
          </span>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-5 lg:p-6 max-w-7xl mx-auto space-y-5 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 opacity-0 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <div>
            <h1 className="text-xl sm:text-2xl title-gradient tracking-tight">Conexões</h1>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground text-xs sm:text-sm">Gerencie suas conexões do WhatsApp</p>
              {lastUpdated && (
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/70">
                  <Clock className="w-3 h-3" />
                  Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchConnections}
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={deleteDisconnectedConnections}
              className="text-destructive border-destructive/30 hover:bg-destructive/10"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Excluir Desconectadas
            </Button>
            
            
            <Button
              size="sm"
              variant={planLimit !== null && connections.length >= planLimit ? "destructive" : "default"}
              onClick={() => {
                const isLimitReached = planLimit !== null && connections.length >= planLimit;
                if (isLimitReached) {
                  setShowLimitModal(true);
                  return;
                }
                setShowCreateModal(true);
              }}
            >
              {planLimit !== null && connections.length >= planLimit ? (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
                  Limite Atingido ({connections.length}/{planLimit})
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Nova Conexão {planLimit !== null && `(${connections.length}/${planLimit})`}
                </>
              )}
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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="group relative bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-all duration-300"
              >
                {/* Card Content */}
                <div className="p-5">
                  {/* Header Row */}
                  <div className="flex items-start gap-3.5 mb-5">
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted ring-2 ring-border">
                        {connection.FotoPerfil ? (
                          <img 
                            src={connection.FotoPerfil} 
                            alt={connection.NomeConexao || 'Perfil'} 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-lg font-semibold">
                            {(connection.NomeConexao || 'W')[0].toUpperCase()}
                          </div>
                        )}
                      </div>
                      {connection.status === 'open' && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-card" />
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate text-[15px] mb-0.5">
                        {connection.NomeConexao || 'Sem nome'}
                      </h3>
                      <p className="text-[13px] text-muted-foreground truncate">
                        {connection.Telefone ? `+${connection.Telefone}` : 'Aguardando conexão'}
                      </p>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="shrink-0">
                      {getStatusBadge(connection.status)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => checkConnectionStatus(connection)}
                        disabled={checkingStatus[connection.id]}
                        className="flex-1 h-9 text-[13px] bg-muted/30 border-border hover:bg-muted/50"
                      >
                        {checkingStatus[connection.id] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Verificar
                      </Button>
                      
                      {connection.status === 'close' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => showQrCode(connection)}
                          className="flex-1 h-9 text-[13px] border-primary/30 text-primary hover:bg-primary/10"
                        >
                          <QrCode className="w-3.5 h-3.5 mr-1.5" />
                          QR Code
                        </Button>
                      )}
                      
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          setSelectedConnection(connection);
                          setShowDeleteModal(true);
                        }}
                        className="h-9 w-9 shrink-0 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    
                    {/* CRM Toggle - only show when connected */}
                    {connection.status === 'open' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleCrmForConnection(connection)}
                        disabled={activatingCrm[connection.id]}
                        className={`w-full h-9 text-[13px] transition-all ${
                          connection.crmAtivo 
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30' 
                            : 'border-muted-foreground/30 text-muted-foreground hover:bg-muted/50'
                        }`}
                      >
                        {activatingCrm[connection.id] ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        ) : connection.crmAtivo ? (
                          <Check className="w-3.5 h-3.5 mr-1.5" />
                        ) : (
                          <WifiOff className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        {connection.crmAtivo ? 'CRM Ativo' : 'Ativar CRM'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Limit Reached Modal */}
      <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <DialogTitle className="text-xl">Limite de Conexões Atingido</DialogTitle>
            </div>
            <DialogDescription className="text-base pt-2">
              Você já possui <span className="font-semibold text-foreground">{connections.length}</span> conexões ativas e seu plano permite apenas <span className="font-semibold text-foreground">{planLimit}</span> conexões.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-muted/50 rounded-lg p-4 my-4">
            <h4 className="font-medium text-sm mb-2">O que você pode fazer:</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <Trash2 className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
                <span>Excluir uma conexão existente para liberar espaço</span>
              </li>
              <li className="flex items-start gap-2">
                <Crown className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                <span>Fazer upgrade do seu plano para ter mais conexões</span>
              </li>
            </ul>
          </div>
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowLimitModal(false)}
            >
              Fechar
            </Button>
            <Button
              onClick={() => {
                setShowLimitModal(false);
                navigate('/configuracoes?tab=planos');
              }}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              <Crown className="w-4 h-4 mr-2" />
              Ver Planos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Connection Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => {
        // Prevent opening if limit reached
        if (open && planLimit !== null && connections.length >= planLimit) {
          setShowLimitModal(true);
          return;
        }
        setShowCreateModal(open);
      }}>
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
      <Dialog open={showQrModal} onOpenChange={(open) => {
        setShowQrModal(open);
        if (!open) {
          setQrCodeData(null);
          setConnectionInstanceName(null);
        }
      }}>
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
            
            {checkingConnection && (
              <div className="flex flex-col items-center gap-2 mt-4">
                <div className="flex items-center gap-2 text-sm text-emerald-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Aguardando conexão...
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.floor(qrTimeRemaining / 60)}:{(qrTimeRemaining % 60).toString().padStart(2, '0')}
                  </span>
                  <span>•</span>
                  <span>{checkCount} verificações</span>
                </div>
                {qrTimeRemaining <= 30 && (
                  <div className="text-xs text-amber-400 animate-pulse">
                    ⚠️ O QR Code expira em breve!
                  </div>
                )}
              </div>
            )}
            
            <p className="text-sm text-muted-foreground mt-2 text-center">
              O modal fechará automaticamente quando conectar.
            </p>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowQrModal(false);
                setQrCodeData(null);
                setConnectionInstanceName(null);
                setQrTimeRemaining(120);
                setCheckCount(0);
              }}
              className="w-full"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={(open) => {
        if (!open) {
          setHasPendingDispatches(false);
        }
        setShowDeleteModal(open);
      }}>
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

          {hasPendingDispatches && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-4">
              <p className="text-sm text-amber-400 font-medium mb-2">
                ⚠️ Disparos pendentes detectados
              </p>
              <p className="text-xs text-muted-foreground">
                Esta conexão possui disparos pendentes. Você pode aguardar a finalização ou forçar a exclusão, 
                o que irá cancelar todos os disparos pendentes vinculados.
              </p>
            </div>
          )}
          
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedConnection(null);
                setHasPendingDispatches(false);
              }}
              disabled={deletingConnection || forceDeleting}
            >
              Cancelar
            </Button>
            
            {hasPendingDispatches ? (
              <Button
                variant="destructive"
                onClick={forceDeleteConnection}
                disabled={forceDeleting || deletingConnection}
              >
                {forceDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Forçar Exclusão
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="destructive"
                onClick={deleteConnection}
                disabled={deletingConnection || forceDeleting}
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
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* xAI API Key Modal */}
      <Dialog open={showChatGptModal} onOpenChange={setShowChatGptModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-400">
              <Settings className="w-5 h-5" />
              Chave API do xAI (Grok)
            </DialogTitle>
            <DialogDescription>
              Configure sua chave API para usar recursos de IA nos disparos
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {savedApiKey && !isReplacingApiKey ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">
                    API Key Atual
                  </label>
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
                    <code className="text-sm font-mono text-muted-foreground flex-1">
                      {maskApiKey(savedApiKey)}
                    </code>
                    <Check className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setIsReplacingApiKey(true)}
                  className="w-full"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Substituir Chave
                </Button>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {savedApiKey ? 'Nova API Key' : 'API Key'}
                </label>
                <Input
                  type="password"
                  placeholder="xai-..."
                  value={chatGptApiKey}
                  onChange={(e) => setChatGptApiKey(e.target.value)}
                  className="w-full"
                />
                {savedApiKey && isReplacingApiKey && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsReplacingApiKey(false)}
                    className="mt-2 text-muted-foreground"
                  >
                    Cancelar substituição
                  </Button>
                )}
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowChatGptModal(false);
                setChatGptApiKey("");
                setIsReplacingApiKey(false);
              }}
            >
              {savedApiKey && !isReplacingApiKey ? 'Fechar' : 'Cancelar'}
            </Button>
            {(!savedApiKey || isReplacingApiKey) && (
              <Button
                onClick={saveXaiApiKey}
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
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default ConexoesPage;
