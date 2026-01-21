import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, FileDown, Loader2, Users, Smartphone, QrCode, RefreshCw, WifiOff, Trash2, Download, ExternalLink, Globe, Clock, X, BookUser, MessageSquare } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useExtractionHistory } from '@/hooks/useExtractionHistory';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

interface PublicGroup {
  name: string;
  link: string;
  description: string;
}

interface UserInstance {
  id: number;
  instanceName: string;
  NomeConexao: string | null;
  status: 'connected' | 'disconnected';
}

interface WhatsAppContact {
  id: string;
  pushName?: string;
  profilePictureUrl?: string;
  owner?: string;
}

interface WhatsAppLabel {
  id: string;
  name: string;
  color: number;
  predefinedId?: string;
}

// Helper function to convert WhatsApp label color codes to hex colors
const getLabelColor = (colorCode: number): string => {
  const colors: Record<number, string> = {
    0: '#00A884', // Verde (padrão WhatsApp)
    1: '#54C3E8', // Azul claro
    2: '#F7D366', // Amarelo
    3: '#F78C6C', // Laranja
    4: '#FF8A9A', // Rosa
    5: '#8B5CF6', // Roxo
    6: '#64748B', // Cinza
    7: '#53BDEB', // Azul
    8: '#25D366', // Verde WhatsApp
    9: '#EC4899', // Pink
    10: '#F59E0B', // Amber
    11: '#10B981', // Emerald
    12: '#6366F1', // Indigo
    13: '#EF4444', // Red
    14: '#84CC16', // Lime
    15: '#06B6D4', // Cyan
    16: '#A855F7', // Purple
    17: '#F97316', // Orange
    18: '#3B82F6', // Blue
    19: '#22C55E', // Green
  };
  return colors[colorCode] || '#64748B';
};

const WhatsAppGroupsExtractor = () => {
  const { toast } = useToast();
  const { addRecord } = useExtractionHistory();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [isExtractingParticipants, setIsExtractingParticipants] = useState(false);
  const [isLoadingContacts, setIsLoadingContacts] = useState(false);
  const [isLoadingChats, setIsLoadingChats] = useState(false);
  
  // Labels/Etiquetas state
  const [labels, setLabels] = useState<WhatsAppLabel[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string>('all');
  const [isLoadingLabels, setIsLoadingLabels] = useState(false);
  const [isSyncingLabels, setIsSyncingLabels] = useState(false);
  const [isSettingUpWebhook, setIsSettingUpWebhook] = useState(false);
  const [extractionMode, setExtractionMode] = useState<'all' | 'by-label'>('all');
  
  // Public groups search states
  const [activeTab, setActiveTab] = useState('my-groups');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [publicGroups, setPublicGroups] = useState<PublicGroup[]>([]);
  const [isSearchingPublic, setIsSearchingPublic] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [searchStatus, setSearchStatus] = useState('');
  const [searchHistory, setSearchHistory] = useState<{terms: string[], results: number, date: string}[]>([]);

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('whatsapp_group_search_history');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading search history:', e);
      }
    }
  }, []);

  // Save search to history
  const addToSearchHistory = (terms: string[], resultsCount: number) => {
    const newEntry = {
      terms,
      results: resultsCount,
      date: new Date().toISOString()
    };
    const updated = [newEntry, ...searchHistory.slice(0, 9)]; // Keep last 10
    setSearchHistory(updated);
    localStorage.setItem('whatsapp_group_search_history', JSON.stringify(updated));
  };

  // Clear search history
  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('whatsapp_group_search_history');
  };
  
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

  // Filters for extracted groups
  const [groupFilter, setGroupFilter] = useState('');
  const [groupTypeFilter, setGroupTypeFilter] = useState<'all' | 'group' | 'community'>('all');

  // Load instances only once on mount
  const [instancesLoaded, setInstancesLoaded] = useState(false);
  
  useEffect(() => {
    if (user?.id && !instancesLoaded) {
      loadUserInstances();
      setInstancesLoaded(true);
    }
  }, [user?.id, instancesLoaded]);

  // Polling para verificar status da conexão
  useEffect(() => {
    if (!pollingInstance || !showQrDialog) return;

    const checkConnectionStatus = async () => {
      try {
        const { data } = await supabase.functions.invoke('evolution-api', {
          body: { action: 'get-instance', instanceName: pollingInstance }
        });
        
        const state = data?.instance?.connectionStatus || data?.connectionState || data?.instance?.state;
        
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

  const generateRandomSuffix = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createInstance = async () => {
    if (!newInstanceName.trim() || !user?.id) {
      toast({ title: "Erro", description: "Digite um nome para a instância", variant: "destructive" });
      return;
    }
    setIsConnecting(true);
    try {
      const suffix = generateRandomSuffix();
      const instanceNameWithSuffix = `${newInstanceName.trim()}-${suffix}`;
      
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { 
          action: 'create-instance', 
          instanceName: instanceNameWithSuffix,
          userId: user.id,
          data: { displayName: newInstanceName.trim() }
        }
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      
      toast({ title: "Sucesso", description: `Instância ${instanceNameWithSuffix} criada` });
      setShowCreateDialog(false);
      setNewInstanceName('');
      await loadUserInstances();
      
      if (data.qrcode?.base64) {
        setQrCode(data.qrcode.base64);
        setSelectedInstance(instanceNameWithSuffix);
        setPollingInstance(instanceNameWithSuffix);
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

  const fetchContacts = async () => {
    if (!selectedInstance) {
      toast({ title: "Erro", description: "Selecione uma instância conectada", variant: "destructive" });
      return;
    }
    setIsLoadingContacts(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { action: 'fetch-contacts', instanceName: selectedInstance }
      });
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      
      const contacts: WhatsAppContact[] = data.contacts || [];
      
      if (contacts.length === 0) {
        toast({ title: "Aviso", description: "Nenhum contato encontrado na lista telefônica", variant: "destructive" });
        return;
      }

      // Download Excel com contatos - formato: Nome, Telefone (número real)
      const worksheet = XLSX.utils.json_to_sheet(contacts.map((c: any) => ({
        'Nome': c.pushName || '',
        'Telefone': c.phoneNumber || '', // Número real extraído
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Contatos');
      XLSX.writeFile(workbook, `contatos_${selectedInstance}_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      addRecord({
        type: 'whatsapp-groups',
        segment: `Contatos de ${selectedInstance}`,
        totalResults: contacts.length,
        emailsFound: 0,
        phonesFound: contacts.length,
        results: contacts.map((c: any) => ({
          nome: c.pushName || '',
          telefone: c.phoneNumber || '',
        })),
      });
      
      toast({ title: "Extração concluída", description: `${contacts.length} contatos extraídos` });
    } catch (error) {
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Erro ao buscar contatos", variant: "destructive" });
    } finally {
      setIsLoadingContacts(false);
    }
  };

  const fetchLabels = async () => {
    if (!selectedInstance) return;
    setIsLoadingLabels(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { action: 'fetch-labels', instanceName: selectedInstance }
      });
      if (error) throw new Error(error.message);
      
      const fetchedLabels = data.labels || [];
      setLabels(fetchedLabels);
      console.log('Labels fetched:', fetchedLabels);
    } catch (error) {
      console.error('Error fetching labels:', error);
      setLabels([]);
    } finally {
      setIsLoadingLabels(false);
    }
  };

  const syncLabels = async () => {
    if (!selectedInstance || !user?.id) {
      toast({ title: "Erro", description: "Selecione uma instância conectada", variant: "destructive" });
      return;
    }
    
    setIsSyncingLabels(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { 
          action: 'sync-labels', 
          instanceName: selectedInstance,
          userId: user.id 
        }
      });
      
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      
      toast({ 
        title: "Sincronização concluída", 
        description: data.message || `${data.synced} associações sincronizadas`
      });
      
      // Recarrega as labels após a sincronização
      await fetchLabels();
    } catch (error) {
      console.error('Error syncing labels:', error);
      toast({ 
        title: "Erro na sincronização", 
        description: error instanceof Error ? error.message : "Erro ao sincronizar etiquetas", 
        variant: "destructive" 
      });
    } finally {
      setIsSyncingLabels(false);
    }
  };

  const setupLabelWebhook = async () => {
    if (!selectedInstance || !user?.id) {
      toast({ title: "Erro", description: "Selecione uma instância conectada", variant: "destructive" });
      return;
    }
    
    setIsSettingUpWebhook(true);
    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { 
          action: 'setup-label-webhook', 
          instanceName: selectedInstance,
          userId: user.id 
        }
      });
      
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      
      toast({ 
        title: "Webhook configurado!", 
        description: "As etiquetas serão sincronizadas automaticamente quando você atribuir no WhatsApp."
      });
    } catch (error) {
      console.error('Error setting up webhook:', error);
      toast({ 
        title: "Erro ao configurar webhook", 
        description: error instanceof Error ? error.message : "Erro ao configurar webhook", 
        variant: "destructive" 
      });
    } finally {
      setIsSettingUpWebhook(false);
    }
  };

  // Carrega etiquetas quando seleciona instância
  useEffect(() => {
    if (selectedInstance && activeTab === 'chats') {
      fetchLabels();
    }
  }, [selectedInstance, activeTab]);

  const fetchChats = async () => {
    if (!selectedInstance) {
      toast({ title: "Erro", description: "Selecione uma instância conectada", variant: "destructive" });
      return;
    }
    
    setIsLoadingChats(true);
    try {
      // Buscar TODOS os chats do bate-papo
      console.log('[WhatsApp] Fetching all chats from:', selectedInstance);
      
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: { action: 'fetch-chats', instanceName: selectedInstance }
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      
      const rawChats = data.chats;
      let chats = Array.isArray(rawChats) ? rawChats : [];
      
      console.log('[WhatsApp] Total chats received:', chats.length);
      
      // Filtrar apenas conversas individuais (não grupos)
      chats = chats.filter((c: any) => !c.isGroup && c.remoteJid && !c.remoteJid.includes('@g.us'));
      
      console.log('[WhatsApp] Individual chats (excluding groups):', chats.length);
      
      if (chats.length === 0) {
        toast({ 
          title: "Aviso", 
          description: "Nenhuma conversa encontrada", 
          variant: "destructive" 
        });
        return;
      }

      // Processar contatos extraindo número real
      const processedContacts = chats.map((c: any) => {
        // Usa phoneNumber extraído pela API, ou fallback para remoteJid
        const telefone = c.phoneNumber || (c.remoteJid || '').replace(/@.*$/, '');
        const nome = c.pushName || c.name || '';
        
        return {
          nome,
          telefone,
          id: c.remoteJid || c.id || '',
        };
      });
      
      // Filtrar contatos que têm telefone válido (apenas números)
      const validContacts = processedContacts.filter(c => c.telefone && /^\d+$/.test(c.telefone));
      
      console.log('[WhatsApp] Valid contacts with phone numbers:', validContacts.length);

      // Download Excel com contatos do bate-papo
      const worksheet = XLSX.utils.json_to_sheet(validContacts.map(c => ({
        'Nome': c.nome,
        'Telefone': c.telefone,
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Conversas');
      XLSX.writeFile(workbook, `bate-papo_${selectedInstance}_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      addRecord({
        type: 'whatsapp-groups',
        segment: `Bate-Papo de ${selectedInstance}`,
        totalResults: validContacts.length,
        emailsFound: 0,
        phonesFound: validContacts.length,
        results: validContacts,
      });
      
      toast({ 
        title: "Extração concluída", 
        description: `${validContacts.length} contatos extraídos do bate-papo` 
      });
    } catch (error) {
      console.error('[WhatsApp] Error fetching chats:', error);
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Erro ao buscar conversas", variant: "destructive" });
    } finally {
      setIsLoadingChats(false);
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

  const addSearchTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !searchTags.includes(trimmed)) {
      setSearchTags(prev => [...prev, trimmed]);
    }
    setSearchTerm('');
  };

  const removeSearchTag = (tagToRemove: string) => {
    setSearchTags(prev => prev.filter(tag => tag !== tagToRemove));
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchTerm.trim()) {
      e.preventDefault();
      addSearchTag(searchTerm);
    } else if (e.key === 'Backspace' && !searchTerm && searchTags.length > 0) {
      removeSearchTag(searchTags[searchTags.length - 1]);
    }
  };

  const searchPublicGroups = async () => {
    const allTerms = [...searchTags, searchTerm.trim()].filter(Boolean);
    if (allTerms.length === 0) {
      toast({ title: "Erro", description: "Digite pelo menos um termo para buscar", variant: "destructive" });
      return;
    }
    
    const searchQuery = allTerms.join(' ');
    
    setIsSearchingPublic(true);
    setPublicGroups([]);
    setSearchProgress(0);
    setSearchStatus('Iniciando busca profunda...');
    
    // Simulate progress while waiting for API
    const progressInterval = setInterval(() => {
      setSearchProgress(prev => {
        if (prev >= 90) return prev;
        const increment = Math.random() * 15 + 5;
        const newProgress = Math.min(prev + increment, 90);
        
        if (newProgress < 15) setSearchStatus('Preparando termos de busca...');
        else if (newProgress < 35) setSearchStatus('Buscando em diretórios de grupos...');
        else if (newProgress < 55) setSearchStatus('Pesquisando no Google...');
        else if (newProgress < 70) setSearchStatus('Buscando no Facebook e Twitter...');
        else if (newProgress < 85) setSearchStatus('Validando links ativos...');
        else setSearchStatus('Finalizando...');
        
        return newProgress;
      });
    }, 800);
    
    try {
      const { data, error } = await supabase.functions.invoke('search-whatsapp-groups', {
        body: { segment: searchQuery, maxResults: 500 }
      });
      
      clearInterval(progressInterval);
      
      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      
      setSearchProgress(100);
      setSearchStatus('Busca concluída!');
      setPublicGroups(data.groups || []);
      
      if (data.groups?.length === 0) {
        toast({ title: "Nenhum grupo encontrado", description: "Tente outro termo de busca" });
      } else {
        toast({ title: "Busca concluída", description: `${data.groups?.length || 0} grupos encontrados` });
        
        // Add to search history
        addToSearchHistory(allTerms, data.groups?.length || 0);
        
        addRecord({
          type: 'whatsapp-groups',
          segment: `Busca: ${searchQuery}`,
          totalResults: data.groups?.length || 0,
          emailsFound: 0,
          phonesFound: 0,
          results: (data.groups || []).map((g: PublicGroup) => ({
            name: g.name,
            link: g.link,
            description: g.description,
          })),
        });
      }
    } catch (error) {
      clearInterval(progressInterval);
      setSearchProgress(0);
      setSearchStatus('');
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Erro ao buscar grupos", variant: "destructive" });
    } finally {
      setIsSearchingPublic(false);
      setTimeout(() => {
        setSearchProgress(0);
        setSearchStatus('');
      }, 2000);
    }
  };

  const exportPublicGroups = () => {
    if (publicGroups.length === 0) return;
    
    const worksheet = XLSX.utils.json_to_sheet(publicGroups.map(g => ({
      'Nome': g.name,
      'Link': g.link,
      'Descrição': g.description
    })));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Grupos');
    XLSX.writeFile(workbook, `grupos_whatsapp_${searchTerm}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    addRecord({
      type: 'whatsapp-groups',
      segment: `Busca: ${searchTerm}`,
      totalResults: publicGroups.length,
      emailsFound: 0,
      phonesFound: 0,
      results: publicGroups.map(g => ({
        name: g.name,
        link: g.link,
        description: g.description,
      })),
    });
    
    toast({ title: "Exportado", description: `${publicGroups.length} grupos exportados` });
  };

  const connectedInstances = instances.filter(i => i.status === 'connected');

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-5 lg:p-6 space-y-5 lg:space-y-6">
        {/* Header */}
        <div className="opacity-0 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <h1 className="text-xl sm:text-2xl title-gradient tracking-tight">Grupos de WhatsApp</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Extraia grupos ou busque novos para entrar</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-6">
            <TabsTrigger value="my-groups" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Meus Grupos
            </TabsTrigger>
            <TabsTrigger value="contacts" className="flex items-center gap-2">
              <BookUser className="w-4 h-4" />
              Lista Telefônica
            </TabsTrigger>
            <TabsTrigger value="chats" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Bate-Papo
            </TabsTrigger>
            <TabsTrigger value="search-groups" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Buscar Grupos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-groups">
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
                  {/* Search and Filter */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar grupo..."
                        value={groupFilter}
                        onChange={(e) => setGroupFilter(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={groupTypeFilter} onValueChange={(v) => setGroupTypeFilter(v as 'all' | 'group' | 'community')}>
                      <SelectTrigger className="w-full sm:w-40">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="group">Grupos</SelectItem>
                        <SelectItem value="community">Comunidades</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 mb-4">
                    {groups
                      .filter(group => {
                        const subjectLower = (group.subject || '').toLowerCase();
                        const matchesSearch = groupFilter === '' || subjectLower.includes(groupFilter.toLowerCase());
                        const isCommunity = group.id?.includes('@g.us') === false || (group.size || 0) > 256;
                        const matchesType = groupTypeFilter === 'all' || 
                          (groupTypeFilter === 'community' && isCommunity) ||
                          (groupTypeFilter === 'group' && !isCommunity);
                        return matchesSearch && matchesType;
                      })
                      .map((group, i) => (
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
          </TabsContent>

          <TabsContent value="search-groups">
            <Card className="opacity-0 animate-fade-in-up overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#25D366] to-[#128C7E]" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-[#25D366]" />
                  Buscar Grupos Públicos
                </CardTitle>
                <CardDescription>Encontre grupos de WhatsApp por tema para entrar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tags Input Container */}
                <div className="flex flex-wrap items-center gap-2 p-2 min-h-[42px] bg-secondary/30 border border-border/50 rounded-lg focus-within:border-[#25D366]/50 transition-colors">
                  {searchTags.map((tag) => (
                    <Badge 
                      key={tag}
                      className="bg-[#25D366] text-white hover:bg-[#20BD5A] cursor-pointer flex items-center gap-1 px-2 py-1"
                      onClick={() => removeSearchTag(tag)}
                    >
                      {tag}
                      <span className="ml-1 hover:text-white/70">×</span>
                    </Badge>
                  ))}
                  <Input
                    placeholder={searchTags.length === 0 ? "Digite um termo e pressione Enter..." : "Adicionar mais..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="flex-1 min-w-[150px] border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto"
                  />
                  <Button 
                    onClick={searchPublicGroups} 
                    disabled={isSearchingPublic || (searchTags.length === 0 && !searchTerm.trim())}
                    size="sm"
                    className="bg-[#25D366] hover:bg-[#20BD5A] shrink-0"
                  >
                    {isSearchingPublic ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                  </Button>
                </div>

                {/* Quick Search Tags */}
                <div className="flex flex-wrap gap-2">
                  {['Vendas', 'Marketing Digital', 'Empreendedorismo', 'Afiliados', 'Dropshipping', 'Finanças', 'Investimentos', 'Imobiliário', 'Ecommerce', 'Network'].map((tag) => (
                    <Badge 
                      key={tag}
                      variant="outline" 
                      className="cursor-pointer hover:bg-[#25D366]/10 hover:border-[#25D366]/50 hover:text-[#25D366] transition-colors"
                      onClick={() => addSearchTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Search History */}
                {searchHistory.length > 0 && !isSearchingPublic && (
                  <div className="border border-border/50 rounded-lg p-4 bg-secondary/10">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        Histórico de Buscas
                      </h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                        onClick={clearSearchHistory}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Limpar
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {searchHistory.map((entry, index) => (
                        <div 
                          key={index}
                          className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 cursor-pointer transition-colors"
                          onClick={() => {
                            setSearchTags(entry.terms);
                            setSearchTerm('');
                          }}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-sm truncate">{entry.terms.join(', ')}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="secondary" className="text-xs">
                              {entry.results} grupos
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(entry.date).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Progress Bar */}
                {isSearchingPublic && (
                  <div className="space-y-2 py-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{searchStatus}</span>
                      <span className="font-medium text-[#25D366]">{Math.round(searchProgress)}%</span>
                    </div>
                    <Progress value={searchProgress} className="h-2 bg-secondary [&>div]:bg-gradient-to-r [&>div]:from-[#25D366] [&>div]:to-[#128C7E]" />
                    <p className="text-xs text-center text-muted-foreground">
                      Buscando até 500 grupos em múltiplas fontes...
                    </p>
                  </div>
                )}

                {publicGroups.length > 0 && !isSearchingPublic && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">{publicGroups.length} grupos encontrados</p>
                    <Button variant="outline" size="sm" onClick={exportPublicGroups}>
                      <FileDown className="w-4 h-4 mr-2" />
                      Exportar Excel
                    </Button>
                  </div>
                )}

                {isSearchingPublic && !searchProgress ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#25D366]" />
                  </div>
                ) : publicGroups.length > 0 ? (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {publicGroups.map((group, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/50 hover:border-[#25D366]/30 transition-all"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{group.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{group.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#25D366] hover:text-[#25D366] hover:bg-[#25D366]/10"
                          onClick={() => window.open(group.link, '_blank')}
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          Entrar
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Globe className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Busque grupos por tema</p>
                    <p className="text-sm text-muted-foreground/70">Ex: vendas, marketing, finanças</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contacts">
            <Card className="opacity-0 animate-fade-in-up overflow-hidden max-w-xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#25D366] to-[#128C7E]" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookUser className="w-5 h-5 text-[#25D366]" />
                  Lista Telefônica
                </CardTitle>
                <CardDescription>Extraia os contatos salvos no WhatsApp conectado</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {connectedInstances.length === 0 ? (
                  <div className="text-center py-8">
                    <Smartphone className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Nenhuma instância conectada</p>
                    <p className="text-sm text-muted-foreground/70">Conecte uma instância na aba "Meus Grupos" primeiro</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Selecione a Instância</Label>
                      <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                        <SelectTrigger><SelectValue placeholder="Selecione uma instância conectada" /></SelectTrigger>
                        <SelectContent>
                          {connectedInstances.map((instance) => (
                            <SelectItem key={`contacts-select-${instance.id}`} value={instance.instanceName}>
                              {instance.NomeConexao || instance.instanceName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button 
                      onClick={fetchContacts} 
                      className="w-full bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20BD5A] hover:to-[#0F7A6D]" 
                      disabled={isLoadingContacts || !selectedInstance}
                    >
                      {isLoadingContacts ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BookUser className="w-4 h-4 mr-2" />}
                      {isLoadingContacts ? 'Extraindo contatos...' : 'Extrair Lista Telefônica'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="chats">
            <Card className="opacity-0 animate-fade-in-up overflow-hidden max-w-xl">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#25D366] to-[#128C7E]" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#25D366]" />
                  Bate-Papo
                </CardTitle>
                <CardDescription>Extraia os contatos das suas conversas</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {connectedInstances.length === 0 ? (
                  <div className="text-center py-8">
                    <Smartphone className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Nenhuma instância conectada</p>
                    <p className="text-sm text-muted-foreground/70">Conecte uma instância na aba "Meus Grupos" primeiro</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Selecione a Instância</Label>
                      <Select value={selectedInstance} onValueChange={setSelectedInstance}>
                        <SelectTrigger><SelectValue placeholder="Selecione uma instância conectada" /></SelectTrigger>
                        <SelectContent>
                          {connectedInstances.map((instance) => (
                            <SelectItem key={`chats-select-${instance.id}`} value={instance.instanceName}>
                              {instance.NomeConexao || instance.instanceName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      onClick={fetchChats} 
                      className="w-full bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:from-[#20BD5A] hover:to-[#0F7A6D]" 
                      disabled={isLoadingChats || !selectedInstance}
                    >
                      {isLoadingChats ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageSquare className="w-4 h-4 mr-2" />}
                      {isLoadingChats ? 'Extraindo conversas...' : 'Extrair Todas as Conversas'}
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center">
                      Extrai todos os contatos das suas conversas do WhatsApp
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
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
