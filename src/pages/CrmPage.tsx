import { useState, useEffect, useCallback, useRef } from 'react';
import { Kanban, MessageSquare, User, Phone, Clock, MoreHorizontal, Plus, ArrowRight, DollarSign, StickyNote, Pencil, X, Save, Settings, Trash2, Volume2, VolumeX, ExternalLink, Search, Smartphone, List, Filter } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { WhatsAppIcon } from '@/components/icons/WhatsAppIcon';

interface CrmColuna {
  id: number;
  nome: string;
  cor: string;
  ordem: number;
}

interface CrmLead {
  id: number;
  idColuna: number;
  nome: string | null;
  telefone: string | null;
  mensagem: string | null;
  valor: number;
  created_at: string;
  instanceName: string | null;
  idLista: number | null;
  nomeLista: string | null;
}

const colorOptions = [
  'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-green-500', 
  'bg-red-500', 'bg-pink-500', 'bg-cyan-500', 'bg-orange-500'
];

const defaultColumns = [
  { nome: 'Novos', cor: 'bg-blue-500', ordem: 0 },
  { nome: 'Em Contato', cor: 'bg-amber-500', ordem: 1 },
  { nome: 'Negociação', cor: 'bg-purple-500', ordem: 2 },
  { nome: 'Fechado', cor: 'bg-green-500', ordem: 3 },
];

// Sons de notificação para diferentes eventos
const createAudioContext = () => new (window.AudioContext || (window as any).webkitAudioContext)();

const playNewLeadSound = () => {
  const audioContext = createAudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.type = 'sine';
  
  // Som ascendente alegre (novo lead)
  oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
  oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
  oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5
  oscillator.frequency.setValueAtTime(1046.50, audioContext.currentTime + 0.3); // C6
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};

const playMoveLeadSound = () => {
  const audioContext = createAudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.type = 'sine';
  
  // Som curto de "pop" (moveu lead)
  oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
  oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.05);
  
  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.15);
};

const playDeleteLeadSound = () => {
  const audioContext = createAudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.type = 'sine';
  
  // Som descendente suave (deletou lead)
  oscillator.frequency.setValueAtTime(500, audioContext.currentTime);
  oscillator.frequency.setValueAtTime(350, audioContext.currentTime + 0.1);
  oscillator.frequency.setValueAtTime(250, audioContext.currentTime + 0.2);
  
  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.3);
};

const playSuccessSound = () => {
  const audioContext = createAudioContext();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  oscillator.type = 'sine';
  
  // Som de sucesso (salvou)
  oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
  oscillator.frequency.setValueAtTime(554.37, audioContext.currentTime + 0.1); // C#5
  
  gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.2);
};

const CrmPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [leads, setLeads] = useState<CrmLead[]>([]);
  const [columns, setColumns] = useState<CrmColuna[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<CrmLead | null>(null);
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<number | null>(null);
  const [columnTitle, setColumnTitle] = useState('');
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [newLead, setNewLead] = useState({ nome: '', telefone: '', valor: 0, mensagem: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedListaFilter, setSelectedListaFilter] = useState<number | null>(null);
  const [blinkingLeadIds, setBlinkingLeadIds] = useState<Set<number>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('crm-sound-enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const initialLoadDone = useRef(false);

  // Listas únicas disponíveis nos leads
  const availableListas = leads.reduce((acc, lead) => {
    if (lead.idLista && lead.nomeLista && !acc.some(l => l.id === lead.idLista)) {
      acc.push({ id: lead.idLista, nome: lead.nomeLista });
    }
    return acc;
  }, [] as { id: number; nome: string }[]);

  // Salvar preferência de som no localStorage
  useEffect(() => {
    localStorage.setItem('crm-sound-enabled', String(soundEnabled));
  }, [soundEnabled]);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      // Buscar colunas
      const { data: colunasData, error: colunasError } = await supabase
        .from('SAAS_CRM_Colunas')
        .select('*')
        .eq('idUsuario', user.id)
        .order('ordem', { ascending: true });

      if (colunasError) throw colunasError;

      // Se não houver colunas, criar as padrão
      if (!colunasData || colunasData.length === 0) {
        const { data: newColunas, error: insertError } = await supabase
          .from('SAAS_CRM_Colunas')
          .insert(defaultColumns.map(c => ({ ...c, idUsuario: user.id })))
          .select();

        if (insertError) throw insertError;
        setColumns(newColunas || []);
      } else {
        setColumns(colunasData);
      }

      // Buscar leads - apenas os que vieram de alguma lista
      const { data: leadsData, error: leadsError } = await supabase
        .from('SAAS_CRM_Leads')
        .select('*')
        .eq('idUsuario', user.id)
        .not('idLista', 'is', null)
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;
      setLeads(leadsData?.map(l => ({
        id: l.id,
        idColuna: l.idColuna,
        nome: l.nome,
        telefone: l.telefone,
        mensagem: l.mensagem,
        valor: Number(l.valor) || 0,
        created_at: l.created_at,
        instanceName: (l as any).instanceName || null,
        idLista: (l as any).idLista || null,
        nomeLista: (l as any).nomeLista || null,
      })) || []);
      
      initialLoadDone.current = true;
    } catch (error: any) {
      console.error('Erro ao carregar CRM:', error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Função para fazer o lead piscar
  const triggerBlink = (leadId: number) => {
    setBlinkingLeadIds(prev => new Set([...prev, leadId]));
    setTimeout(() => {
      setBlinkingLeadIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(leadId);
        return newSet;
      });
    }, 3000); // Pisca por 3 segundos
  };

  // Real-time subscription para novos leads e atualizações
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('crm-leads-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'SAAS_CRM_Leads',
          filter: `idUsuario=eq.${user.id}`
        },
        (payload) => {
          console.log('Novo lead recebido:', payload);
          
          const newLeadData = payload.new as any;
          
          // Só adicionar se tiver idLista (veio de uma lista)
          if (!newLeadData.idLista) {
            console.log('Lead sem lista, ignorando no CRM');
            return;
          }
          
          const lead: CrmLead = {
            id: newLeadData.id,
            idColuna: newLeadData.idColuna,
            nome: newLeadData.nome,
            telefone: newLeadData.telefone,
            mensagem: newLeadData.mensagem,
            valor: Number(newLeadData.valor) || 0,
            created_at: newLeadData.created_at,
            instanceName: newLeadData.instanceName || null,
            idLista: newLeadData.idLista || null,
            nomeLista: newLeadData.nomeLista || null,
          };
          
          // Verifica se o lead já existe (evita duplicatas)
          setLeads(prev => {
            if (prev.some(l => l.id === lead.id)) return prev;
            return [lead, ...prev];
          });
          
          // Fazer o lead piscar
          triggerBlink(lead.id);
          
          // Só toca som se já carregou inicialmente (não toca no primeiro load)
          if (initialLoadDone.current && soundEnabled) {
            playNewLeadSound();
            toast({ 
              title: "🔔 Novo Lead!", 
              description: `${lead.nome || 'Novo contato'} - ${lead.telefone}` 
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'SAAS_CRM_Leads',
          filter: `idUsuario=eq.${user.id}`
        },
        (payload) => {
          console.log('Lead atualizado:', payload);
          
          const updatedLeadData = payload.new as any;
          
          // Atualizar o lead na lista
          setLeads(prev => prev.map(lead => 
            lead.id === updatedLeadData.id ? {
              ...lead,
              nome: updatedLeadData.nome,
              telefone: updatedLeadData.telefone,
              mensagem: updatedLeadData.mensagem,
              valor: Number(updatedLeadData.valor) || 0,
              idColuna: updatedLeadData.idColuna,
              instanceName: updatedLeadData.instanceName || null,
              idLista: updatedLeadData.idLista || null,
              nomeLista: updatedLeadData.nomeLista || null,
            } : lead
          ));
          
          // Fazer o lead piscar
          triggerBlink(updatedLeadData.id);
          
          // Só toca som se já carregou inicialmente
          if (initialLoadDone.current && soundEnabled) {
            playNewLeadSound();
            toast({ 
              title: "💬 Nova mensagem!", 
              description: `${updatedLeadData.nome || 'Contato'} enviou mensagem` 
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, soundEnabled, toast]);

  const moveLeadToColumn = async (leadId: number, newColunaId: number) => {
    try {
      const { error } = await supabase
        .from('SAAS_CRM_Leads')
        .update({ idColuna: newColunaId })
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, idColuna: newColunaId } : lead
      ));
      if (soundEnabled) playMoveLeadSound();
      toast({ title: "Lead movido!" });
    } catch (error) {
      console.error('Erro ao mover lead:', error);
      toast({ title: "Erro ao mover lead", variant: "destructive" });
    }
  };

  const handleDragStart = (lead: CrmLead) => {
    setDraggedLead(lead);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (colunaId: number) => {
    if (draggedLead) {
      moveLeadToColumn(draggedLead.id, colunaId);
      setDraggedLead(null);
    }
  };

  const getLeadsByColumn = (colunaId: number) => {
    return leads.filter(lead => lead.idColuna === colunaId);
  };

  const getTotalValueByColumn = (colunaId: number) => {
    return getLeadsByColumnFiltered(colunaId).reduce((sum, lead) => sum + (lead.valor || 0), 0);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const openWhatsApp = (telefone: string | null, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!telefone) {
      toast({ title: "Telefone não disponível", variant: "destructive" });
      return;
    }
    // Remove caracteres não numéricos
    const cleanPhone = telefone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const openLeadDetails = (lead: CrmLead) => {
    setSelectedLead({ ...lead });
    setIsDetailOpen(true);
  };

  const saveLeadChanges = async () => {
    if (!selectedLead) return;
    try {
      const { error } = await supabase
        .from('SAAS_CRM_Leads')
        .update({
          nome: selectedLead.nome,
          telefone: selectedLead.telefone,
          valor: selectedLead.valor,
          mensagem: selectedLead.mensagem,
          idColuna: selectedLead.idColuna,
        })
        .eq('id', selectedLead.id);

      if (error) throw error;

      setLeads(prev => prev.map(lead => 
        lead.id === selectedLead.id ? selectedLead : lead
      ));
      if (soundEnabled) playSuccessSound();
      toast({ title: "Lead atualizado!" });
      setIsDetailOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar lead:', error);
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    }
  };

  const deleteLead = async (leadId: number) => {
    try {
      const { error } = await supabase
        .from('SAAS_CRM_Leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.filter(lead => lead.id !== leadId));
      setIsDetailOpen(false);
      if (soundEnabled) playDeleteLeadSound();
      toast({ title: "Lead excluído!" });
    } catch (error) {
      console.error('Erro ao excluir lead:', error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const startEditColumn = (colunaId: number, currentTitle: string) => {
    setEditingColumn(colunaId);
    setColumnTitle(currentTitle);
  };

  // Filtrar leads pela busca e lista
  const filteredLeads = leads.filter(lead => {
    // Filtro por lista
    if (selectedListaFilter && lead.idLista !== selectedListaFilter) return false;
    
    // Filtro por busca
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      (lead.nome?.toLowerCase().includes(search)) ||
      (lead.telefone?.includes(search))
    );
  });

  const getLeadsByColumnFiltered = (colunaId: number) => {
    return filteredLeads.filter(lead => lead.idColuna === colunaId);
  };

  const saveColumnTitle = async (colunaId: number) => {
    try {
      const { error } = await supabase
        .from('SAAS_CRM_Colunas')
        .update({ nome: columnTitle })
        .eq('id', colunaId);

      if (error) throw error;

      setColumns(prev => prev.map(col => 
        col.id === colunaId ? { ...col, nome: columnTitle } : col
      ));
      setEditingColumn(null);
      toast({ title: "Coluna renomeada!" });
    } catch (error) {
      console.error('Erro ao renomear coluna:', error);
      toast({ title: "Erro ao renomear", variant: "destructive" });
    }
  };

  const addNewColumn = async () => {
    if (!user?.id) return;
    try {
      const usedColors = columns.map(c => c.cor);
      const availableColor = colorOptions.find(c => !usedColors.includes(c)) || colorOptions[0];
      const maxOrdem = Math.max(...columns.map(c => c.ordem), -1);

      const { data, error } = await supabase
        .from('SAAS_CRM_Colunas')
        .insert({ 
          idUsuario: user.id, 
          nome: 'Nova Coluna', 
          cor: availableColor,
          ordem: maxOrdem + 1 
        })
        .select()
        .single();

      if (error) throw error;

      setColumns(prev => [...prev, data]);
      toast({ title: "Coluna adicionada!" });
    } catch (error) {
      console.error('Erro ao adicionar coluna:', error);
      toast({ title: "Erro ao adicionar coluna", variant: "destructive" });
    }
  };

  const deleteColumn = async (colunaId: number) => {
    if (columns.length <= 1) {
      toast({ title: "Precisa ter pelo menos uma coluna", variant: "destructive" });
      return;
    }
    try {
      // Move leads para primeira coluna
      const firstColumn = columns.find(c => c.id !== colunaId);
      if (firstColumn) {
        await supabase
          .from('SAAS_CRM_Leads')
          .update({ idColuna: firstColumn.id })
          .eq('idColuna', colunaId);

        setLeads(prev => prev.map(lead => 
          lead.idColuna === colunaId ? { ...lead, idColuna: firstColumn.id } : lead
        ));
      }

      const { error } = await supabase
        .from('SAAS_CRM_Colunas')
        .delete()
        .eq('id', colunaId);

      if (error) throw error;

      setColumns(prev => prev.filter(col => col.id !== colunaId));
      toast({ title: "Coluna excluída!" });
    } catch (error) {
      console.error('Erro ao excluir coluna:', error);
      toast({ title: "Erro ao excluir coluna", variant: "destructive" });
    }
  };

  const changeColumnColor = async (colunaId: number, newColor: string) => {
    try {
      const { error } = await supabase
        .from('SAAS_CRM_Colunas')
        .update({ cor: newColor })
        .eq('id', colunaId);

      if (error) throw error;

      setColumns(prev => prev.map(col => 
        col.id === colunaId ? { ...col, cor: newColor } : col
      ));
    } catch (error) {
      console.error('Erro ao alterar cor:', error);
    }
  };

  const addNewLead = async () => {
    if (!user?.id || !newLead.nome || !newLead.telefone) {
      toast({ title: "Preencha nome e telefone", variant: "destructive" });
      return;
    }

    const firstColumn = columns[0];
    if (!firstColumn) {
      toast({ title: "Crie uma coluna primeiro", variant: "destructive" });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('SAAS_CRM_Leads')
        .insert({
          idUsuario: user.id,
          idColuna: firstColumn.id,
          nome: newLead.nome,
          telefone: newLead.telefone,
          valor: newLead.valor,
          mensagem: newLead.mensagem || null,
        })
        .select()
        .single();

      if (error) throw error;

      setLeads(prev => [{
        id: data.id,
        idColuna: data.idColuna,
        nome: data.nome,
        telefone: data.telefone,
        mensagem: data.mensagem,
        valor: Number(data.valor) || 0,
        created_at: data.created_at,
        instanceName: null,
        idLista: null,
        nomeLista: null,
      }, ...prev]);
      setNewLead({ nome: '', telefone: '', valor: 0, mensagem: '' });
      setIsAddingLead(false);
      toast({ title: "Lead adicionado!" });
    } catch (error) {
      console.error('Erro ao adicionar lead:', error);
      toast({ title: "Erro ao adicionar lead", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-5 lg:p-6 space-y-5 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between opacity-0 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <div>
            <h1 className="text-xl sm:text-2xl title-gradient tracking-tight">CRM - Leads</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Gerencie seus leads e oportunidades</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-[220px]"
              />
            </div>
            {/* Filtro por lista */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={selectedListaFilter ? "default" : "outline"} size="sm" className="gap-2">
                  <Filter className="w-4 h-4" />
                  {selectedListaFilter 
                    ? availableListas.find(l => l.id === selectedListaFilter)?.nome || 'Lista' 
                    : 'Todas Listas'
                  }
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSelectedListaFilter(null)}>
                  <List className="w-4 h-4 mr-2" />
                  Todas as Listas
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {availableListas.map(lista => (
                  <DropdownMenuItem 
                    key={lista.id} 
                    onClick={() => setSelectedListaFilter(lista.id)}
                    className={cn(selectedListaFilter === lista.id && "bg-primary/10")}
                  >
                    <List className="w-4 h-4 mr-2" />
                    {lista.nome}
                  </DropdownMenuItem>
                ))}
                {availableListas.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Nenhuma lista disponível
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Badge variant="outline" className="px-3 py-1">
              {filteredLeads.length} leads
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              {formatCurrency(filteredLeads.reduce((sum, l) => sum + (l.valor || 0), 0))}
            </Badge>
            <Button 
              onClick={() => setSoundEnabled(!soundEnabled)} 
              variant={soundEnabled ? "default" : "outline"} 
              size="sm"
              title={soundEnabled ? "Som ativado" : "Som desativado"}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </Button>
            <Button onClick={() => setIsAddingLead(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Novo Lead
            </Button>
            <Button onClick={addNewColumn} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nova Coluna
            </Button>
            <Button onClick={fetchData} variant="outline" size="sm">
              Atualizar
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className={cn(
          "grid gap-4 flex-1",
          columns.length <= 4 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : 
          columns.length <= 6 ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-6" :
          "grid-cols-1 md:grid-cols-4 lg:grid-cols-8"
        )} style={{ minHeight: 'calc(100vh - 220px)' }}>
          {columns.map((column) => (
            <div
              key={column.id}
              className="flex flex-col bg-muted/20 rounded-xl border border-border/50 h-full"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.id)}
              style={{ minHeight: 'calc(100vh - 240px)' }}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-border/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    <div className={cn("w-3 h-3 rounded-full", column.cor)} />
                    {editingColumn === column.id ? (
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          value={columnTitle}
                          onChange={(e) => setColumnTitle(e.target.value)}
                          className="h-7 text-sm"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveColumnTitle(column.id)}>
                          <Save className="w-3 h-3" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingColumn(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <span 
                        className="font-semibold text-sm cursor-pointer hover:text-primary flex items-center gap-1"
                        onClick={() => startEditColumn(column.id, column.nome)}
                      >
                        {column.nome}
                        <Pencil className="w-3 h-3 opacity-0 hover:opacity-100" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {getLeadsByColumnFiltered(column.id).length}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Settings className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => startEditColumn(column.id, column.nome)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Renomear
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Cor</div>
                        <div className="flex flex-wrap gap-1 px-2 pb-2">
                          {colorOptions.map(color => (
                            <button
                              key={color}
                              onClick={() => changeColumnColor(column.id, color)}
                              className={cn(
                                "w-5 h-5 rounded-full transition-all",
                                color,
                                column.cor === color && "ring-2 ring-offset-2 ring-primary"
                              )}
                            />
                          ))}
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => deleteColumn(column.id)}
                          className="text-red-500 focus:text-red-500"
                          disabled={columns.length <= 1}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir Coluna
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {formatCurrency(getTotalValueByColumn(column.id))}
                </div>
              </div>

              {/* Cards */}
              <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : getLeadsByColumnFiltered(column.id).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground h-full">
                    <Plus className="w-8 h-8 mb-2 opacity-30" />
                    <span className="text-xs">{searchTerm || selectedListaFilter ? 'Nenhum lead encontrado' : 'Arraste leads aqui'}</span>
                  </div>
                ) : (
                  getLeadsByColumnFiltered(column.id).map((lead) => (
                    <Card
                      key={lead.id}
                      draggable
                      onDragStart={() => handleDragStart(lead)}
                      onClick={() => openLeadDetails(lead)}
                      className={cn(
                        "cursor-pointer active:cursor-grabbing bg-card hover:bg-muted/30 transition-all border-border/50 hover:border-primary/30 hover:shadow-lg",
                        blinkingLeadIds.has(lead.id) && "animate-pulse ring-2 ring-primary ring-offset-2 ring-offset-background"
                      )}
                    >
                      <CardContent className="p-3 space-y-2">
                        {/* Lead Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                              <User className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm truncate max-w-[120px]">
                                {lead.nome || 'Sem nome'}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {lead.telefone || '-'}
                              </p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {columns.filter(c => c.id !== lead.idColuna).map(col => (
                                <DropdownMenuItem 
                                  key={col.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveLeadToColumn(lead.id, col.id);
                                  }}
                                >
                                  <ArrowRight className="w-4 h-4 mr-2" />
                                  Mover para {col.nome}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteLead(lead.id);
                                }}
                                className="text-red-500 focus:text-red-500"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Value */}
                        {lead.valor > 0 && (
                          <div className="flex items-center gap-1 text-xs font-medium text-green-500">
                            <DollarSign className="w-3 h-3" />
                            {formatCurrency(lead.valor)}
                          </div>
                        )}

                        {/* Message */}
                        {lead.mensagem && (
                          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2 flex items-start gap-1">
                            <StickyNote className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{lead.mensagem}</span>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                          <div className="flex flex-col gap-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(lead.created_at)}
                            </span>
                            <div className="flex items-center gap-2">
                              {lead.instanceName && (
                                <span className="text-[10px] text-primary/70 font-medium truncate max-w-[80px] flex items-center gap-1">
                                  <Smartphone className="w-2.5 h-2.5" />
                                  {lead.instanceName.split('-')[0]}
                                </span>
                              )}
                              {lead.nomeLista && (
                                <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[80px] flex items-center gap-1">
                                  <List className="w-2.5 h-2.5" />
                                  {lead.nomeLista}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                            onClick={(e) => openWhatsApp(lead.telefone, e)}
                            title="Abrir WhatsApp"
                          >
                            <WhatsAppIcon size={14} />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Lead Detail Modal */}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Detalhes do Lead
              </DialogTitle>
            </DialogHeader>
            {selectedLead && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={selectedLead.nome || ''}
                    onChange={(e) => setSelectedLead({ ...selectedLead, nome: e.target.value })}
                    placeholder="Nome do lead"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={selectedLead.telefone || ''}
                    onChange={(e) => setSelectedLead({ ...selectedLead, telefone: e.target.value })}
                    placeholder="Telefone"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    value={selectedLead.valor}
                    onChange={(e) => setSelectedLead({ ...selectedLead, valor: parseFloat(e.target.value) || 0 })}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Observação</Label>
                  <Textarea
                    value={selectedLead.mensagem || ''}
                    onChange={(e) => setSelectedLead({ ...selectedLead, mensagem: e.target.value })}
                    placeholder="Adicione uma observação..."
                    rows={3}
                  />
                </div>
                {selectedLead.instanceName && (
                  <div className="space-y-2">
                    <Label>Canal WhatsApp</Label>
                    <div className="px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-primary" />
                      {selectedLead.instanceName.split('-')[0]}
                    </div>
                  </div>
                )}
                {selectedLead.nomeLista && (
                  <div className="space-y-2">
                    <Label>Lista de Origem</Label>
                    <div className="px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground flex items-center gap-2">
                      <List className="w-4 h-4 text-muted-foreground" />
                      {selectedLead.nomeLista}
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex gap-2 flex-wrap">
                    {columns.map(col => (
                      <Button
                        key={col.id}
                        variant={selectedLead.idColuna === col.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedLead({ ...selectedLead, idColuna: col.id })}
                      >
                        <div className={cn("w-2 h-2 rounded-full mr-2", col.cor)} />
                        {col.nome}
                      </Button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      if (!selectedLead.telefone) {
                        toast({ title: "Telefone não disponível", variant: "destructive" });
                        return;
                      }
                      const cleanPhone = selectedLead.telefone.replace(/\D/g, '');
                      window.open(`https://wa.me/${cleanPhone}`, '_blank');
                    }} 
                    variant="outline" 
                    className="text-green-500 hover:text-green-600 hover:bg-green-500/10 border-green-500/30"
                  >
                    <WhatsAppIcon size={18} className="mr-2" />
                    WhatsApp
                  </Button>
                  <Button onClick={saveLeadChanges} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                  <Button onClick={() => deleteLead(selectedLead.id)} variant="destructive" size="icon">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Lead Modal */}
        <Dialog open={isAddingLead} onOpenChange={setIsAddingLead}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Novo Lead
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={newLead.nome}
                  onChange={(e) => setNewLead({ ...newLead, nome: e.target.value })}
                  placeholder="Nome do lead"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone *</Label>
                <Input
                  value={newLead.telefone}
                  onChange={(e) => setNewLead({ ...newLead, telefone: e.target.value })}
                  placeholder="5511999999999"
                />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input
                  type="number"
                  value={newLead.valor}
                  onChange={(e) => setNewLead({ ...newLead, valor: parseFloat(e.target.value) || 0 })}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label>Observação</Label>
                <Textarea
                  value={newLead.mensagem}
                  onChange={(e) => setNewLead({ ...newLead, mensagem: e.target.value })}
                  placeholder="Adicione uma observação..."
                  rows={3}
                />
              </div>
              <Button onClick={addNewLead} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Lead
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CrmPage;
