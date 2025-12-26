import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Ticket, Copy, Loader2, Calendar, Users, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Cupom {
  id: number;
  codigo: string;
  desconto: number;
  tipo_desconto: string;
  ativo: boolean;
  uso_unico: boolean;
  quantidade_uso: number | null;
  quantidade_usada: number;
  validade: string | null;
  planos_ids: number[] | null;
  descricao: string | null;
  created_at: string;
}

interface Plan {
  id: number;
  nome: string;
}

export default function AdminCupons() {
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingCupom, setEditingCupom] = useState<Cupom | null>(null);
  
  const [form, setForm] = useState({
    codigo: '',
    desconto: 0,
    tipo_desconto: 'percentual',
    ativo: true,
    uso_unico: false,
    quantidade_uso: null as number | null,
    validade: '',
    planos_ids: [] as number[],
    descricao: ''
  });

  useEffect(() => {
    fetchCupons();
    fetchPlans();
  }, []);

  const fetchCupons = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'get-cupons' }
      });

      if (error) throw error;
      setCupons(data?.cupons || []);
    } catch (err) {
      console.error('Error fetching cupons:', err);
      toast.error('Erro ao carregar cupons');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'get-plans' }
      });

      if (error) throw error;
      setPlans(data?.plans || []);
    } catch (err) {
      console.error('Error fetching plans:', err);
    }
  };

  const handleOpenDialog = (cupom?: Cupom) => {
    if (cupom) {
      setEditingCupom(cupom);
      setForm({
        codigo: cupom.codigo,
        desconto: cupom.desconto,
        tipo_desconto: cupom.tipo_desconto,
        ativo: cupom.ativo,
        uso_unico: cupom.uso_unico,
        quantidade_uso: cupom.quantidade_uso,
        validade: cupom.validade || '',
        planos_ids: cupom.planos_ids || [],
        descricao: cupom.descricao || ''
      });
    } else {
      setEditingCupom(null);
      setForm({
        codigo: '',
        desconto: 0,
        tipo_desconto: 'percentual',
        ativo: true,
        uso_unico: false,
        quantidade_uso: null,
        validade: '',
        planos_ids: [],
        descricao: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.codigo || form.desconto <= 0) {
      toast.error('Preencha o código e o valor do desconto');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.functions.invoke('admin-api', {
        body: {
          action: editingCupom ? 'update-cupom' : 'create-cupom',
          cupomId: editingCupom?.id,
          cupom: {
            codigo: form.codigo.toUpperCase(),
            desconto: form.desconto,
            tipo_desconto: form.tipo_desconto,
            ativo: form.ativo,
            uso_unico: form.uso_unico,
            quantidade_uso: form.quantidade_uso || null,
            validade: form.validade || null,
            planos_ids: form.planos_ids.length > 0 ? form.planos_ids : null,
            descricao: form.descricao || null
          }
        }
      });

      if (error) throw error;
      
      toast.success(editingCupom ? 'Cupom atualizado!' : 'Cupom criado!');
      setIsDialogOpen(false);
      fetchCupons();
    } catch (err: any) {
      console.error('Error saving cupom:', err);
      toast.error(err.message || 'Erro ao salvar cupom');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (cupomId: number) => {
    if (!confirm('Tem certeza que deseja excluir este cupom?')) return;

    try {
      const { error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'delete-cupom', cupomId }
      });

      if (error) throw error;
      toast.success('Cupom excluído!');
      fetchCupons();
    } catch (err: any) {
      console.error('Error deleting cupom:', err);
      toast.error(err.message || 'Erro ao excluir cupom');
    }
  };

  const handleCopyCode = (codigo: string) => {
    navigator.clipboard.writeText(codigo);
    toast.success('Código copiado!');
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(prev => ({ ...prev, codigo: code }));
  };

  const togglePlanSelection = (planId: number) => {
    setForm(prev => ({
      ...prev,
      planos_ids: prev.planos_ids.includes(planId)
        ? prev.planos_ids.filter(id => id !== planId)
        : [...prev.planos_ids, planId]
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Ticket className="w-5 h-5" />
          Cupons de Desconto
        </CardTitle>
        <Button onClick={() => handleOpenDialog()} className="gap-2">
          <Plus className="w-4 h-4" />
          Novo Cupom
        </Button>
      </CardHeader>
      <CardContent>
        {cupons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum cupom cadastrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Uso</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cupons.map((cupom) => (
                  <TableRow key={cupom.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-muted px-2 py-1 rounded font-mono text-sm">
                          {cupom.codigo}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleCopyCode(cupom.codigo)}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                      {cupom.descricao && (
                        <p className="text-xs text-muted-foreground mt-1">{cupom.descricao}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono">
                        {cupom.tipo_desconto === 'percentual' 
                          ? `${cupom.desconto}%` 
                          : `R$ ${cupom.desconto.toFixed(2)}`
                        }
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{cupom.quantidade_usada}</span>
                        {cupom.quantidade_uso && (
                          <span className="text-muted-foreground">/ {cupom.quantidade_uso}</span>
                        )}
                      </div>
                      {cupom.uso_unico && (
                        <Badge variant="outline" className="text-xs mt-1">Uso único</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {cupom.validade ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          {format(new Date(cupom.validade), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sem validade</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={cupom.ativo ? 'default' : 'secondary'}>
                        {cupom.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(cupom)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(cupom.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Dialog de criação/edição */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ticket className="w-5 h-5" />
                {editingCupom ? 'Editar Cupom' : 'Novo Cupom'}
              </DialogTitle>
              <DialogDescription>
                {editingCupom ? 'Atualize os dados do cupom' : 'Crie um novo cupom de desconto'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Código do Cupom *</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.codigo}
                    onChange={(e) => setForm(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                    placeholder="DESCONTO10"
                    className="font-mono uppercase"
                  />
                  <Button type="button" variant="outline" onClick={generateRandomCode}>
                    Gerar
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor do Desconto *</Label>
                  <Input
                    type="number"
                    min={0}
                    step={form.tipo_desconto === 'percentual' ? 1 : 0.01}
                    value={form.desconto}
                    onChange={(e) => setForm(prev => ({ ...prev, desconto: parseFloat(e.target.value) || 0 }))}
                    placeholder="10"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Desconto</Label>
                  <Select 
                    value={form.tipo_desconto} 
                    onValueChange={(v) => setForm(prev => ({ ...prev, tipo_desconto: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentual">Percentual (%)</SelectItem>
                      <SelectItem value="fixo">Valor Fixo (R$)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Limite de Uso (opcional)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.quantidade_uso ?? ''}
                    onChange={(e) => setForm(prev => ({ ...prev, quantidade_uso: e.target.value ? parseInt(e.target.value) : null }))}
                    placeholder="Ilimitado"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Validade (opcional)</Label>
                  <Input
                    type="date"
                    value={form.validade}
                    onChange={(e) => setForm(prev => ({ ...prev, validade: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Input
                  value={form.descricao}
                  onChange={(e) => setForm(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Ex: Desconto de lançamento"
                />
              </div>

              <div className="space-y-2">
                <Label>Planos Válidos (vazio = todos)</Label>
                <div className="flex flex-wrap gap-2">
                  {plans.map((plan) => (
                    <Badge
                      key={plan.id}
                      variant={form.planos_ids.includes(plan.id) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => togglePlanSelection(plan.id)}
                    >
                      {form.planos_ids.includes(plan.id) && <Check className="w-3 h-3 mr-1" />}
                      {plan.nome}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.ativo}
                    onCheckedChange={(checked) => setForm(prev => ({ ...prev, ativo: checked }))}
                  />
                  <Label>Cupom Ativo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={form.uso_unico}
                    onCheckedChange={(checked) => setForm(prev => ({ ...prev, uso_unico: checked }))}
                  />
                  <Label>Uso Único por Usuário</Label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingCupom ? 'Salvar' : 'Criar Cupom'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
