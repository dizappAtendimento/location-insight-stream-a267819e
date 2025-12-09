import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FileDown, Loader2, Users, Smartphone, QrCode, RefreshCw, WifiOff, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useExtractionHistory } from '@/hooks/useExtractionHistory';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

// Custom WhatsApp icon component
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

interface WhatsAppGroup {
  id: string;
  subject: string;
  size: number;
  creation: number;
  owner: string;
  desc?: string;
}

interface GroupParticipant {
  id: string;
  admin?: string;
}

interface UserInstance {
  id: number;
  instanceName: string;
  NomeConexao: string | null;
  status: 'connected' | 'disconnected';
}

const WhatsAppGroupsExtractor = () => {
  const { toast } = useToast();
  const { addRecord } = useExtractionHistory();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [isExtractingParticipants, setIsExtractingParticipants] = useState(false);
  
  // Instance states
  const [instances, setInstances] = useState<UserInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const [isLoadingInstances, setIsLoadingInstances] = useState(false);
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [newInstanceName, setNewInstanceName] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [pollingInstance, setPollingInstance] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadUserInstances();
    }
  }, [user?.id]);

  // Polling para verificar status da conexão
  useEffect(() => {
    if (!pollingInstance || !showQrDialog) return;

    const checkConnectionStatus = async () => {
      try {
        const { data } = await supabase.functions.invoke('evolution-api', {
          body: { action: 'get-instance', instanceName: pollingInstance }
        });
        
        console.log('Polling response:', data);
        // Evolution API returns connectionStatus for connection state
        const state = data?.instance?.connectionStatus || data?.connectionState || data?.instance?.state;
        console.log('Connection state:', state);
        
        if (state === 'open') {
          toast({ title: "Conectado!", description: "WhatsApp conectado com sucesso" });
          setShowQrDialog(false);
          setQrCode('');
          setPollingInstance(null);
          await loadUserInstances();
        }
      } catch (error) {
        console.error('Error checking connection status:', error);
      }
    };

    const interval = setInterval(checkConnectionStatus, 3000);
    return () => clearInterval(interval);
  }, [pollingInstance, showQrDialog]);

  const loadUserInstances = async () => {
    if (!user?.id) return;
    setIsLoadingInstances(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { action: 'list-user-instances', userId: user.id }
      });
      
      if (error) throw error;
      
      const instancesWithStatus: UserInstance[] = (data?.instances || []).map((inst: any) => ({
        id: inst.id,
        instanceName: inst.instanceName,
        NomeConexao: inst.NomeConexao,
        status: inst.status === 'open' ? 'connected' : 'disconnected'
      }));
      
      setInstances(instancesWithStatus);
    } catch (error) {
      console.error('Error loading instances:', error);
    } finally {
      setIsLoadingInstances(false);
    }
  };

  const createInstance = async () => {
    if (!newInstanceName.trim() || !user?.id) {
      toast({ title: "Erro", description: "Digite um nome para a instância", variant: "destructive" });
      return;
    }
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { 
          action: 'create-instance', 
          instanceName: newInstanceName.trim(),
          userId: user.id,
          data: { displayName: newInstanceName.trim() }
        }
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      
      toast({ title: "Sucesso", description: "Instância criada com sucesso" });
      setShowCreateDialog(false);
      setNewInstanceName('');
      await loadUserInstances();
      
      if (data.qrcode?.base64) {
        setQrCode(data.qrcode.base64);
        setSelectedInstance(newInstanceName.trim());
        setPollingInstance(newInstanceName.trim());
        setShowQrDialog(true);
      }
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Erro ao criar instância", variant: "destructive" });
    } finally {
      setIsConnecting(false);
    }
  };

  const connectInstance = async (instanceName: string) => {
    setIsConnecting(true);
    setSelectedInstance(instanceName);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { action: 'get-qrcode', instanceName }
      });
      if (error) throw new Error(error.message);
      
      if (data.base64) {
        setQrCode(data.base64);
        setPollingInstance(instanceName);
        setShowQrDialog(true);
      } else if (data.instance?.state === 'open') {
        toast({ title: "Conectado", description: "Instância já está conectada" });
        await loadUserInstances();
      }
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Erro ao conectar", variant: "destructive" });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectInstance = async (instanceName: string) => {
    try {
      const { error } = await supabase.functions.invoke('evolution-api', {
        body: { action: 'disconnect-instance', instanceName }
      });
      if (error) throw new Error(error.message);
      toast({ title: "Desconectado", description: "Instância desconectada com sucesso" });
      await loadUserInstances();
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Erro ao desconectar", variant: "destructive" });
    }
  };

  const deleteInstance = async (instanceName: string) => {
    if (!user?.id) return;
    try {
      await supabase.functions.invoke('evolution-api', {
        body: { action: 'delete-instance', instanceName, userId: user.id }
      });
      
      toast({ title: "Excluída", description: "Instância excluída com sucesso" });
      await loadUserInstances();
      setGroups([]);
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Erro ao excluir", variant: "destructive" });
    }
  };

  const fetchGroups = async () => {
    if (!selectedInstance) {
      toast({ title: "Erro", description: "Selecione uma instância conectada", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { action: 'fetch-groups', instanceName: selectedInstance }
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      
      const fetchedGroups = data.groups || [];
      setGroups(fetchedGroups);
      
      addRecord({
        type: 'whatsapp-groups',
        segment: `Grupos de ${selectedInstance}`,
        totalResults: fetchedGroups.length,
        emailsFound: 0,
        phonesFound: 0,
      });
      
      toast({ title: "Extração concluída", description: `${fetchedGroups.length} grupos encontrados` });
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Erro ao buscar grupos", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadExcel = () => {
    if (groups.length === 0) return;
    const data = groups.map(group => ({
      'Nome do Grupo': group.subject,
      'Participantes': group.size || 0,
      'ID': group.id,
      'Descrição': group.desc || '',
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Grupos WhatsApp');
    XLSX.writeFile(workbook, `grupos_whatsapp_${selectedInstance}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedGroups.size === groups.length) {
      setSelectedGroups(new Set());
    } else {
      setSelectedGroups(new Set(groups.map(g => g.id)));
    }
  };

  const extractParticipants = async () => {
    if (selectedGroups.size === 0) {
      toast({ title: "Erro", description: "Selecione pelo menos um grupo", variant: "destructive" });
      return;
    }
    if (!selectedInstance) {
      toast({ title: "Erro", description: "Selecione uma instância conectada", variant: "destructive" });
      return;
    }

    setIsExtractingParticipants(true);
    try {
      const allParticipants: { groupName: string; participantName: string; telid: string; phone: string; isAdmin: boolean }[] = [];
      
      for (const groupId of selectedGroups) {
        const group = groups.find(g => g.id === groupId);
        if (!group) continue;

        const { data, error } = await supabase.functions.invoke('evolution-api', {
          body: { action: 'fetch-group-participants', instanceName: selectedInstance, data: { groupId } }
        });
        
        if (error) {
          console.error(`Error fetching participants for ${group.subject}:`, error);
          continue;
        }

        const participants = data?.participants || [];
        for (const p of participants) {
          // id = "275350370173177@lid", phoneNumber = "556799600629@s.whatsapp.net"
          const telid = p.id || '';
          const phone = (p.phoneNumber || '').replace('@s.whatsapp.net', '');
          const participantName = p.pushName || p.name || p.notify || '';
          if (phone) {
            allParticipants.push({
              groupName: group.subject,
              participantName,
              telid,
              phone,
              isAdmin: p.admin === 'admin' || p.admin === 'superadmin'
            });
          }
        }
      }

      if (allParticipants.length === 0) {
        toast({ title: "Aviso", description: "Nenhum participante encontrado nos grupos selecionados", variant: "destructive" });
        return;
      }

      // Download Excel com 5 colunas
      const worksheet = XLSX.utils.json_to_sheet(allParticipants.map(p => ({
        'Grupo': p.groupName,
        'Nome': p.participantName,
        'Telid': p.telid,
        'telefone': p.phone,
        'Admin': p.isAdmin ? 'Sim' : 'Não'
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Participantes');
      XLSX.writeFile(workbook, `participantes_${selectedInstance}_${new Date().toISOString().split('T')[0]}.xlsx`);

      addRecord({
        type: 'whatsapp-groups',
        segment: `Participantes de ${selectedGroups.size} grupos`,
        totalResults: allParticipants.length,
        emailsFound: 0,
        phonesFound: allParticipants.length,
      });

      toast({ title: "Sucesso", description: `${allParticipants.length} participantes extraídos` });
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Erro ao extrair participantes", variant: "destructive" });
    } finally {
      setIsExtractingParticipants(false);
    }
  };

  const connectedInstances = instances.filter(i => i.status === 'connected');

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="opacity-0 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#25D366] to-[#128C7E] shadow-lg shadow-[#25D366]/20">
              <WhatsAppIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Grupos de WhatsApp</h1>
              <p className="text-muted-foreground text-sm">Extraia grupos da sua conta via Evolution API</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Instances Card */}
          <Card className="opacity-0 animate-fade-in-up overflow-hidden" style={{ animationDelay: '100ms' }}>
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#25D366] to-[#128C7E]" />
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-[#25D366]" />
                    Instâncias WhatsApp
                  </CardTitle>
                  <CardDescription>Conecte sua conta via Evolution API</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={loadUserInstances} disabled={isLoadingInstances}>
                    <RefreshCw className={`w-4 h-4 ${isLoadingInstances ? 'animate-spin' : ''}`} />
                  </Button>
                  <Button size="sm" onClick={() => setShowCreateDialog(true)} className="bg-[#25D366] hover:bg-[#20BD5A]">
                    Nova Instância
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoadingInstances ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : instances.length === 0 ? (
                <div className="text-center py-8">
                  <Smartphone className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-muted-foreground">Nenhuma instância encontrada</p>
                  <p className="text-sm text-muted-foreground/70">Crie uma nova instância para começar</p>
                </div>
              ) : (
                instances.map((instance) => (
                  <div key={instance.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${instance.status === 'connected' ? 'bg-[#25D366]' : 'bg-muted-foreground/30'}`} />
                      <div>
                        <p className="font-medium text-sm">{instance.NomeConexao || instance.instanceName}</p>
                        <Badge variant={instance.status === 'connected' ? 'default' : 'secondary'} className="text-xs mt-0.5">
                          {instance.status === 'connected' ? 'Conectado' : 'Desconectado'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {instance.status === 'connected' ? (
                        <Button size="sm" variant="ghost" onClick={() => disconnectInstance(instance.instanceName)}>
                          <WifiOff className="w-4 h-4 text-orange-500" />
                        </Button>
                      ) : (
                        <Button size="sm" variant="ghost" onClick={() => connectInstance(instance.instanceName)} disabled={isConnecting}>
                          {isConnecting && selectedInstance === instance.instanceName ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <QrCode className="w-4 h-4 text-[#25D366]" />
                          )}
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => deleteInstance(instance.instanceName)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}

              {connectedInstances.length > 0 && (
                <div className="pt-4 border-t border-border/50 space-y-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Instância para Extração</Label>
                    <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                      <SelectTrigger><SelectValue placeholder="Selecione uma instância conectada" /></SelectTrigger>
                      <SelectContent>
                        {connectedInstances.map((instance) => (
                          <SelectItem key={`select-${instance.id}`} value={instance.instanceName}>
                            {instance.NomeConexao || instance.instanceName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={fetchGroups} 
                    className="w-full bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20BD5A] hover:to-[#0F7A6D]" 
                    disabled={isLoading || !selectedInstance}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                    {isLoading ? 'Buscando grupos...' : 'Extrair Grupos'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Card */}
          <Card className="opacity-0 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Grupos Extraídos</CardTitle>
                  <CardDescription>
                    {groups.length > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#25D366]/10 text-[#25D366] text-xs font-medium mt-1">
                        {selectedGroups.size > 0 ? `${selectedGroups.size} de ${groups.length} selecionados` : `${groups.length} grupos encontrados`}
                      </span>
                    ) : '0 grupos encontrados'}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  {groups.length > 0 && (
                    <>
                      <Button size="sm" variant="outline" onClick={toggleSelectAll}>
                        {selectedGroups.size === groups.length ? 'Desmarcar' : 'Selecionar'} Todos
                      </Button>
                      <Button size="sm" onClick={downloadExcel} className="bg-emerald-600 hover:bg-emerald-700">
                        <FileDown className="w-4 h-4 mr-2" />
                        Excel
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {groups.length > 0 ? (
                <>
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 mb-4">
                    {groups.map((group, i) => (
                      <div 
                        key={group.id} 
                        onClick={() => toggleGroupSelection(group.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${
                          selectedGroups.has(group.id) 
                            ? 'bg-[#25D366]/10 border-[#25D366]/50' 
                            : 'bg-secondary/30 border-border/50 hover:border-[#25D366]/30 hover:bg-secondary/50'
                        }`}
                      >
                        <Checkbox 
                          checked={selectedGroups.has(group.id)}
                          onCheckedChange={() => toggleGroupSelection(group.id)}
                          className="data-[state=checked]:bg-[#25D366] data-[state=checked]:border-[#25D366]"
                        />
                        <span className="w-9 h-9 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] text-white text-sm font-bold flex items-center justify-center shadow-sm">
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{group.subject}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {group.size || 0} participantes
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedGroups.size > 0 && (
                    <Button 
                      onClick={extractParticipants}
                      disabled={isExtractingParticipants}
                      className="w-full bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20BD5A] hover:to-[#0F7A6D]"
                    >
                      {isExtractingParticipants ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Extraindo participantes...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          Baixar Lista de Participantes ({selectedGroups.size} grupo{selectedGroups.size > 1 ? 's' : ''})
                        </>
                      )}
                    </Button>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#25D366]/10 to-[#128C7E]/10 flex items-center justify-center">
                    <WhatsAppIcon className="w-8 h-8 text-[#25D366]/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">Nenhum grupo extraído</p>
                  <p className="text-muted-foreground/70 text-sm mt-1">Conecte uma instância e extraia os grupos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#25D366]" />
              Escanear QR Code
            </DialogTitle>
            <DialogDescription>
              Abra o WhatsApp no seu celular e escaneie o código abaixo
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            {qrCode ? (
              <img src={qrCode} alt="QR Code" className="w-64 h-64 rounded-lg" />
            ) : (
              <div className="w-64 h-64 flex items-center justify-center bg-secondary rounded-lg">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="text-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 inline-block mr-2 animate-spin" />
            Aguardando conexão...
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => { setShowQrDialog(false); setPollingInstance(null); }}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Instance Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#25D366]" />
              Nova Instância
            </DialogTitle>
            <DialogDescription>
              Crie uma nova instância para conectar ao WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Instância</Label>
              <Input 
                placeholder="Ex: minha-empresa" 
                value={newInstanceName}
                onChange={(e) => setNewInstanceName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={createInstance} disabled={isConnecting} className="bg-[#25D366] hover:bg-[#20BD5A]">
              {isConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Criar Instância
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default WhatsAppGroupsExtractor;
