import { useState, useEffect } from 'react';
import { Kanban, MessageSquare, User, Phone, Clock, MoreHorizontal, Plus, ArrowRight } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Lead {
  id: number;
  nome: string | null;
  telefone: string | null;
  mensagem: string | null;
  dataResposta: string | null;
  status: string;
  disparoId: number | null;
}

const columns = [
  { id: 'novo', title: 'Novos', color: 'bg-blue-500' },
  { id: 'contato', title: 'Em Contato', color: 'bg-amber-500' },
  { id: 'negociacao', title: 'Negociação', color: 'bg-purple-500' },
  { id: 'fechado', title: 'Fechado', color: 'bg-green-500' },
];

const CrmPage = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchLeads();
    }
  }, [user?.id]);

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      // Buscar detalhes de disparos que tiveram resposta (simulado por enquanto)
      // Na prática, você teria uma tabela de respostas/leads no CRM
      const { data, error } = await supabase
        .from('vw_Detalhes_Completo')
        .select('*')
        .eq('UserId', user?.id)
        .in('Status', ['sent', 'replied'])
        .order('dataEnvio', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transformar em leads (simulando status do CRM)
      const leadsData: Lead[] = (data || []).map((item: any, index: number) => ({
        id: item.id || index,
        nome: item.NomeGrupo || `Contato ${item.TelefoneContato?.slice(-4) || index}`,
        telefone: item.TelefoneContato || item.WhatsAppIdGrupo,
        mensagem: item.Mensagem?.slice(0, 100) || 'Sem mensagem',
        dataResposta: item.dataEnvio,
        status: ['novo', 'contato', 'negociacao', 'fechado'][index % 4],
        disparoId: item.idDisparo,
      }));

      setLeads(leadsData);
    } catch (error: any) {
      console.error('Erro ao carregar leads:', error);
      toast({
        title: "Erro ao carregar leads",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const moveLeadToColumn = (leadId: number, newStatus: string) => {
    setLeads(prev => prev.map(lead => 
      lead.id === leadId ? { ...lead, status: newStatus } : lead
    ));
    toast({ title: "Lead movido com sucesso!" });
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

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Kanban className="w-6 h-6 text-primary" />
              CRM - Respostas
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie as respostas dos seus disparos
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="px-3 py-1">
              {leads.length} leads
            </Badge>
            <Button onClick={fetchLeads} variant="outline" size="sm">
              Atualizar
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 min-h-[600px]">
          {columns.map((column) => (
            <div
              key={column.id}
              className="flex flex-col bg-muted/20 rounded-xl border border-border/50"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.id)}
            >
              {/* Column Header */}
              <div className="p-4 border-b border-border/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", column.color)} />
                    <span className="font-semibold text-sm">{column.title}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {getLeadsByColumn(column.id).length}
                  </Badge>
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
                      className="cursor-grab active:cursor-grabbing bg-card hover:bg-muted/30 transition-all border-border/50 hover:border-primary/30 hover:shadow-lg"
                    >
                      <CardContent className="p-3 space-y-3">
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
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {columns.filter(c => c.id !== lead.status).map(col => (
                                <DropdownMenuItem 
                                  key={col.id}
                                  onClick={() => moveLeadToColumn(lead.id, col.id)}
                                >
                                  <ArrowRight className="w-4 h-4 mr-2" />
                                  Mover para {col.title}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Message Preview */}
                        <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2">
                          <MessageSquare className="w-3 h-3 inline mr-1" />
                          {lead.mensagem?.slice(0, 60)}...
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
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
      </div>
    </DashboardLayout>
  );
};

export default CrmPage;
