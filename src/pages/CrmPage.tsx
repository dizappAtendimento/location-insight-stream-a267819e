import { useState, useEffect } from 'react';
import { Kanban, MessageSquare, User, Phone, Clock, MoreHorizontal, Plus, ArrowRight, DollarSign, StickyNote, Pencil, X, Save, Settings, Trash2 } from 'lucide-react';
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

interface Lead {
  id: number;
  nome: string | null;
  telefone: string | null;
  mensagem: string | null;
  dataResposta: string | null;
  status: string;
  disparoId: number | null;
  valor: number;
  observacao: string;
}

const colorOptions = [
  'bg-blue-500', 'bg-amber-500', 'bg-purple-500', 'bg-green-500', 
  'bg-red-500', 'bg-pink-500', 'bg-cyan-500', 'bg-orange-500'
];

const defaultColumns = [
  { id: 'novo', title: 'Novos', color: 'bg-blue-500' },
  { id: 'contato', title: 'Em Contato', color: 'bg-amber-500' },
  { id: 'negociacao', title: 'Negociação', color: 'bg-purple-500' },
  { id: 'fechado', title: 'Fechado', color: 'bg-green-500' },
];

const CrmPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [columns, setColumns] = useState(defaultColumns);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [columnTitle, setColumnTitle] = useState('');
  const [isAddingLead, setIsAddingLead] = useState(false);
  const [newLead, setNewLead] = useState({ nome: '', telefone: '', valor: 0, observacao: '' });

  useEffect(() => {
    if (user?.id) {
      fetchLeads();
    }
  }, [user?.id]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('vw_Detalhes_Completo')
        .select('*')
        .eq('UserId', user?.id)
        .in('Status', ['sent', 'replied'])
        .order('dataEnvio', { ascending: false })
        .limit(50);

      if (error) throw error;

      const leadsData: Lead[] = (data || []).map((item: any, index: number) => ({
        id: item.id || index,
        nome: item.NomeGrupo || `Contato ${item.TelefoneContato?.slice(-4) || index}`,
        telefone: item.TelefoneContato || item.WhatsAppIdGrupo,
        mensagem: item.Mensagem?.slice(0, 100) || 'Sem mensagem',
        dataResposta: item.dataEnvio,
        status: ['novo', 'contato', 'negociacao', 'fechado'][index % 4],
        disparoId: item.idDisparo,
        valor: 0,
        observacao: '',
      }));

      setLeads(leadsData);
    } catch (error: any) {
      console.error('Erro ao carregar leads:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const moveLeadToColumn = (leadId: number, newStatus: string) => {
    setLeads(prev => prev.map(lead => 
      lead.id === leadId ? { ...lead, status: newStatus } : lead
    ));
    toast({ title: "Lead movido!" });
  };

  const handleDragStart = (lead: Lead) => {
    setDraggedLead(lead);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (columnId: string) => {
    if (draggedLead) {
      moveLeadToColumn(draggedLead.id, columnId);
      setDraggedLead(null);
    }
  };

  const getLeadsByColumn = (columnId: string) => {
    return leads.filter(lead => lead.status === columnId);
  };

  const getTotalValueByColumn = (columnId: string) => {
    return getLeadsByColumn(columnId).reduce((sum, lead) => sum + (lead.valor || 0), 0);
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

  const openLeadDetails = (lead: Lead) => {
    setSelectedLead({ ...lead });
    setIsDetailOpen(true);
  };

  const saveLeadChanges = () => {
    if (selectedLead) {
      setLeads(prev => prev.map(lead => 
        lead.id === selectedLead.id ? selectedLead : lead
      ));
      toast({ title: "Lead atualizado!" });
      setIsDetailOpen(false);
    }
  };

  const startEditColumn = (columnId: string, currentTitle: string) => {
    setEditingColumn(columnId);
    setColumnTitle(currentTitle);
  };

  const saveColumnTitle = (columnId: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, title: columnTitle } : col
    ));
    setEditingColumn(null);
    toast({ title: "Coluna renomeada!" });
  };

  const addNewColumn = () => {
    const newId = `col_${Date.now()}`;
    const usedColors = columns.map(c => c.color);
    const availableColor = colorOptions.find(c => !usedColors.includes(c)) || colorOptions[0];
    setColumns(prev => [...prev, { id: newId, title: 'Nova Coluna', color: availableColor }]);
    toast({ title: "Coluna adicionada!" });
  };

  const deleteColumn = (columnId: string) => {
    const leadsInColumn = getLeadsByColumn(columnId);
    if (leadsInColumn.length > 0) {
      // Move leads to first column
      setLeads(prev => prev.map(lead => 
        lead.status === columnId ? { ...lead, status: columns[0].id } : lead
      ));
    }
    setColumns(prev => prev.filter(col => col.id !== columnId));
    toast({ title: "Coluna excluída!" });
  };

  const changeColumnColor = (columnId: string, newColor: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, color: newColor } : col
    ));
  };

  const addNewLead = () => {
    if (!newLead.nome || !newLead.telefone) {
      toast({ title: "Preencha nome e telefone", variant: "destructive" });
      return;
    }
    const lead: Lead = {
      id: Date.now(),
      nome: newLead.nome,
      telefone: newLead.telefone,
      mensagem: null,
      dataResposta: new Date().toISOString(),
      status: 'novo',
      disparoId: null,
      valor: newLead.valor,
      observacao: newLead.observacao,
    };
    setLeads(prev => [lead, ...prev]);
    setNewLead({ nome: '', telefone: '', valor: 0, observacao: '' });
    setIsAddingLead(false);
    toast({ title: "Lead adicionado!" });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Kanban className="w-6 h-6 text-primary" />
              CRM - Leads
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie seus leads e oportunidades
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1">
              {leads.length} leads
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              {formatCurrency(leads.reduce((sum, l) => sum + (l.valor || 0), 0))}
            </Badge>
            <Button onClick={() => setIsAddingLead(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Novo Lead
            </Button>
            <Button onClick={addNewColumn} variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nova Coluna
            </Button>
            <Button onClick={fetchLeads} variant="outline" size="sm">
              Atualizar
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className={cn(
          "grid gap-4 min-h-[600px]",
          columns.length <= 4 ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : 
          columns.length <= 6 ? "grid-cols-1 md:grid-cols-3 lg:grid-cols-6" :
          "grid-cols-1 md:grid-cols-4 lg:grid-cols-8"
        )}>
          {columns.map((column) => (
            <div
              key={column.id}
              className="flex flex-col bg-muted/20 rounded-xl border border-border/50"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.id)}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-border/30">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1">
                    <div className={cn("w-3 h-3 rounded-full", column.color)} />
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
                        onClick={() => startEditColumn(column.id, column.title)}
                      >
                        {column.title}
                        <Pencil className="w-3 h-3 opacity-0 hover:opacity-100" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {getLeadsByColumn(column.id).length}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          <Settings className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => startEditColumn(column.id, column.title)}>
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
                                column.color === color && "ring-2 ring-offset-2 ring-primary"
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
              <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[500px]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                  </div>
                ) : getLeadsByColumn(column.id).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Plus className="w-8 h-8 mb-2 opacity-30" />
                    <span className="text-xs">Arraste leads aqui</span>
                  </div>
                ) : (
                  getLeadsByColumn(column.id).map((lead) => (
                    <Card
                      key={lead.id}
                      draggable
                      onDragStart={() => handleDragStart(lead)}
                      onClick={() => openLeadDetails(lead)}
                      className="cursor-pointer active:cursor-grabbing bg-card hover:bg-muted/30 transition-all border-border/50 hover:border-primary/30 hover:shadow-lg"
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
                                {lead.telefone?.slice(-8) || '-'}
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
                              {columns.filter(c => c.id !== lead.status).map(col => (
                                <DropdownMenuItem 
                                  key={col.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveLeadToColumn(lead.id, col.id);
                                  }}
                                >
                                  <ArrowRight className="w-4 h-4 mr-2" />
                                  Mover para {col.title}
                                </DropdownMenuItem>
                              ))}
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

                        {/* Observation */}
                        {lead.observacao && (
                          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2 flex items-start gap-1">
                            <StickyNote className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{lead.observacao}</span>
                          </div>
                        )}

                        {/* Footer */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(lead.dataResposta)}
                          </span>
                          {lead.disparoId && (
                            <Badge variant="outline" className="text-[10px]">
                              #{lead.disparoId}
                            </Badge>
                          )}
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
                    value={selectedLead.observacao}
                    onChange={(e) => setSelectedLead({ ...selectedLead, observacao: e.target.value })}
                    placeholder="Adicione uma observação..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <div className="flex gap-2 flex-wrap">
                    {columns.map(col => (
                      <Button
                        key={col.id}
                        variant={selectedLead.status === col.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedLead({ ...selectedLead, status: col.id })}
                      >
                        <div className={cn("w-2 h-2 rounded-full mr-2", col.color)} />
                        {col.title}
                      </Button>
                    ))}
                  </div>
                </div>
                {selectedLead.mensagem && (
                  <div className="space-y-2">
                    <Label>Última Mensagem</Label>
                    <div className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3">
                      <MessageSquare className="w-4 h-4 inline mr-2" />
                      {selectedLead.mensagem}
                    </div>
                  </div>
                )}
                <Button onClick={saveLeadChanges} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </Button>
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
                  value={newLead.observacao}
                  onChange={(e) => setNewLead({ ...newLead, observacao: e.target.value })}
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
