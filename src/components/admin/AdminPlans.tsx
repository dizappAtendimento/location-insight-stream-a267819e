import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, Users, Link2, List, Send, Contact, Search, Sparkles, Crown, Instagram, Linkedin, MapPin, MessageCircle, Calendar, Star, Eye, EyeOff, ArrowUpDown, Palette, X } from 'lucide-react';

interface Plan {
  id: number;
  nome: string | null;
  preco: number | null;
  qntConexoes: number | null;
  qntContatos: number | null;
  qntDisparos: number | null;
  qntListas: number | null;
  qntExtracoes: number | null;
  qntInstagram: number | null;
  qntLinkedin: number | null;
  qntPlaces: number | null;
  diasValidade: number | null;
  destaque: boolean | null;
  tipo: string | null;
  total_usuarios: number | null;
  ordem: number | null;
  cor: string | null;
  visivel_contratacao: boolean | null;
  beneficios_extras: string[] | null;
}

const COLOR_OPTIONS = [
  { value: 'violet', label: 'Roxo', class: 'bg-violet-500' },
  { value: 'blue', label: 'Azul', class: 'bg-blue-500' },
  { value: 'emerald', label: 'Verde', class: 'bg-emerald-500' },
  { value: 'orange', label: 'Laranja', class: 'bg-orange-500' },
  { value: 'rose', label: 'Rosa', class: 'bg-rose-500' },
  { value: 'amber', label: 'Amarelo', class: 'bg-amber-500' },
  { value: 'zinc', label: 'Cinza', class: 'bg-zinc-700' },
  { value: 'slate', label: 'Ardósia', class: 'bg-slate-700' },
  { value: 'red', label: 'Vermelho', class: 'bg-red-500' },
  { value: 'pink', label: 'Rosa Claro', class: 'bg-pink-500' },
  { value: 'indigo', label: 'Índigo', class: 'bg-indigo-500' },
  { value: 'cyan', label: 'Ciano', class: 'bg-cyan-500' },
  { value: 'teal', label: 'Teal', class: 'bg-teal-500' },
  { value: 'lime', label: 'Lima', class: 'bg-lime-500' },
];

const defaultPlanForm = {
  nome: '',
  preco: '',
  diasValidade: '30',
  destaque: false,
  qntConexoes: '',
  qntContatos: '',
  qntDisparos: '',
  qntListas: '',
  qntExtracoes: '',
  qntInstagram: '',
  qntLinkedin: '',
  qntPlaces: '',
  tipo: 'disparador',
  ordem: '0',
  cor: 'violet',
  visivel_contratacao: true,
  beneficios_extras: [] as string[],
};

export function AdminPlans() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState(defaultPlanForm);
  

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'get-plans' }
      });

      if (!error && data?.plans) {
        setPlans(data.plans);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan(plan);
    setPlanForm({
      nome: plan.nome || '',
      preco: plan.preco?.toString() || '',
      diasValidade: plan.diasValidade?.toString() || '30',
      destaque: plan.destaque || false,
      qntConexoes: plan.qntConexoes?.toString() || '',
      qntContatos: plan.qntContatos?.toString() || '',
      qntDisparos: plan.qntDisparos?.toString() || '',
      qntListas: plan.qntListas?.toString() || '',
      qntExtracoes: plan.qntExtracoes?.toString() || '',
      qntInstagram: plan.qntInstagram?.toString() || '',
      qntLinkedin: plan.qntLinkedin?.toString() || '',
      qntPlaces: plan.qntPlaces?.toString() || '',
      tipo: plan.tipo || 'disparador',
      ordem: plan.ordem?.toString() || '0',
      cor: plan.cor || 'violet',
      visivel_contratacao: plan.visivel_contratacao ?? true,
      beneficios_extras: plan.beneficios_extras || [],
    });
    setIsDialogOpen(true);
  };

  const handleNewPlan = (tipo: string) => {
    setEditingPlan(null);
    setPlanForm({ ...defaultPlanForm, tipo });
    setIsDialogOpen(true);
  };

  const handleSavePlan = async () => {
    const planData = {
      nome: planForm.nome,
      preco: parseFloat(planForm.preco) || 0,
      diasValidade: parseInt(planForm.diasValidade) || 30,
      destaque: planForm.destaque,
      qntConexoes: parseInt(planForm.qntConexoes) || 0,
      qntContatos: parseInt(planForm.qntContatos) || 0,
      qntDisparos: parseInt(planForm.qntDisparos) || 0,
      qntListas: parseInt(planForm.qntListas) || 0,
      qntExtracoes: parseInt(planForm.qntExtracoes) || 0,
      qntInstagram: parseInt(planForm.qntInstagram) || 0,
      qntLinkedin: parseInt(planForm.qntLinkedin) || 0,
      qntPlaces: parseInt(planForm.qntPlaces) || 0,
      tipo: planForm.tipo,
      ordem: parseInt(planForm.ordem) || 0,
      cor: planForm.cor,
      visivel_contratacao: planForm.visivel_contratacao,
      beneficios_extras: planForm.beneficios_extras,
    };

    try {
      if (editingPlan) {
        const { error } = await supabase.functions.invoke('admin-api', {
          body: { 
            action: 'update-plan',
            planData: { ...planData, planId: editingPlan.id }
          }
        });

        if (error) {
          toast({
            title: 'Erro',
            description: 'Erro ao atualizar plano',
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Sucesso',
          description: 'Plano atualizado com sucesso',
        });
      } else {
        const { error } = await supabase.functions.invoke('admin-api', {
          body: { action: 'create-plan', planData }
        });

        if (error) {
          toast({
            title: 'Erro',
            description: 'Erro ao criar plano',
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Sucesso',
          description: 'Plano criado com sucesso',
        });
      }

      setIsDialogOpen(false);
      fetchPlans();
    } catch (err) {
      console.error('Error saving plan:', err);
    }
  };

  const handleDeletePlan = async (planId: number) => {
    try {
      const { error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'delete-plan', planData: { planId } }
      });

      if (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao excluir plano',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Sucesso',
        description: 'Plano excluído com sucesso',
      });

      fetchPlans();
    } catch (err) {
      console.error('Error deleting plan:', err);
    }
  };

  const disparadorPlans = plans.filter(p => p.tipo === 'disparador' || !p.tipo);

  // Get color based on plan name/price for variety
  const getPlanColors = (plan: Plan, index: number) => {
    const colors = [
      { gradient: 'from-violet-500 to-purple-600', bg: 'from-violet-500/10 to-purple-600/5', text: 'text-violet-500', border: 'border-violet-500/20' },
      { gradient: 'from-blue-500 to-cyan-500', bg: 'from-blue-500/10 to-cyan-500/5', text: 'text-blue-500', border: 'border-blue-500/20' },
      { gradient: 'from-emerald-500 to-teal-500', bg: 'from-emerald-500/10 to-teal-500/5', text: 'text-emerald-500', border: 'border-emerald-500/20' },
      { gradient: 'from-orange-500 to-amber-500', bg: 'from-orange-500/10 to-amber-500/5', text: 'text-orange-500', border: 'border-orange-500/20' },
      { gradient: 'from-pink-500 to-rose-500', bg: 'from-pink-500/10 to-rose-500/5', text: 'text-pink-500', border: 'border-pink-500/20' },
    ];
    return colors[index % colors.length];
  };

  const renderPlanCard = (plan: Plan, index: number) => {
    const colors = getPlanColors(plan, index);
    const isPremium = (plan.preco || 0) > 50;
    
    return (
      <Card 
        key={plan.id} 
        className={`relative overflow-hidden border-border/40 bg-card hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 group ${colors.border}`}
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-50 group-hover:opacity-70 transition-opacity duration-500`} />
        
        {/* Decorative glow */}
        <div className={`absolute -top-20 -right-20 w-40 h-40 rounded-full bg-gradient-to-br ${colors.gradient} opacity-10 blur-3xl group-hover:opacity-20 transition-opacity duration-500`} />
        
        {/* Destaque badge */}
        {plan.destaque && (
          <div className="absolute top-3 left-3">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg px-2.5 py-1 gap-1">
              <Star className="w-3 h-3" />
              Mais Contratado
            </Badge>
          </div>
        )}
        
        {/* Premium indicator */}
        {isPremium && !plan.destaque && (
          <div className="absolute top-3 right-3">
            <div className={`p-1.5 rounded-lg bg-gradient-to-br ${colors.gradient}`}>
              <Crown className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        )}

        <CardHeader className="relative pb-3">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl font-bold">{plan.nome}</CardTitle>
              <p className={`text-3xl font-bold ${colors.text} mt-2`}>
                R$ {plan.preco?.toFixed(2).replace('.', ',')}
              </p>
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-muted/50"
                onClick={() => handleEditPlan(plan)}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Plano</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir o plano "{plan.nome}"? Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDeletePlan(plan.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="relative space-y-4">
          {/* Users count and validity */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30">
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">Usuários</span>
              </div>
              <Badge variant="secondary" className="text-xs font-bold px-2.5">
                {plan.total_usuarios || 0}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30">
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span className="text-sm font-medium">{plan.diasValidade || 30} dias</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                <Link2 className="w-4 h-4 text-cyan-500" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Conexões</p>
                  <p className="text-sm font-semibold">{plan.qntConexoes || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                <List className="w-4 h-4 text-violet-500" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Listas</p>
                  <p className="text-sm font-semibold">{plan.qntListas || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                <Contact className="w-4 h-4 text-amber-500" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Contatos</p>
                  <p className="text-sm font-semibold">{plan.qntContatos?.toLocaleString('pt-BR') || 0}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                <Send className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Disparos</p>
                  <p className="text-sm font-semibold">{plan.qntDisparos?.toLocaleString('pt-BR') || 0}</p>
                </div>
              </div>
            </div>
            <div className="pt-2 mt-2 border-t border-border/20">
              <p className="text-[9px] text-muted-foreground font-medium mb-2">CONSULTAS/MÊS</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1.5 p-1.5 rounded bg-muted/20">
                  <Instagram className="w-3 h-3 text-pink-500" />
                  <span className="text-[10px] font-medium">{plan.qntInstagram?.toLocaleString('pt-BR') || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 rounded bg-muted/20">
                  <Linkedin className="w-3 h-3 text-blue-500" />
                  <span className="text-[10px] font-medium">{plan.qntLinkedin?.toLocaleString('pt-BR') || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 rounded bg-muted/20">
                  <MapPin className="w-3 h-3 text-emerald-500" />
                  <span className="text-[10px] font-medium">{plan.qntPlaces?.toLocaleString('pt-BR') || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 p-1.5 rounded bg-muted/20">
                  <MessageCircle className="w-3 h-3 text-green-500" />
                  <span className="text-[10px] font-medium">{plan.qntExtracoes?.toLocaleString('pt-BR') || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="border-border/40 animate-pulse overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-muted/20 to-muted/5" />
            <CardContent className="relative p-6">
              <div className="h-6 bg-muted rounded w-32 mb-4" />
              <div className="h-8 bg-muted rounded w-24 mb-6" />
              <div className="space-y-3">
                <div className="h-12 bg-muted rounded-xl" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-16 bg-muted rounded-lg" />
                  <div className="h-16 bg-muted rounded-lg" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Send className="w-5 h-5 text-primary" />
            Planos Disparador ({disparadorPlans.length})
          </h3>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => handleNewPlan('disparador')} 
                className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                Novo Plano
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  {editingPlan ? 'Editar Plano' : 'Novo Plano'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Nome do Plano</Label>
                  <Input
                    value={planForm.nome}
                    onChange={(e) => setPlanForm({ ...planForm, nome: e.target.value })}
                    placeholder="Ex: Plano Básico"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preço (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={planForm.preco}
                      onChange={(e) => setPlanForm({ ...planForm, preco: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-primary" />
                      Dias de Validade
                    </Label>
                    <Input
                      type="number"
                      value={planForm.diasValidade}
                      onChange={(e) => setPlanForm({ ...planForm, diasValidade: e.target.value })}
                      placeholder="30"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    <Label htmlFor="destaque" className="text-sm font-medium cursor-pointer">
                      Destacar como "Mais Contratado"
                    </Label>
                  </div>
                  <Switch
                    id="destaque"
                    checked={planForm.destaque}
                    onCheckedChange={(checked) => setPlanForm({ ...planForm, destaque: checked })}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-500" />
                    <Label htmlFor="visivel" className="text-sm font-medium cursor-pointer">
                      Visível na página de contratação
                    </Label>
                  </div>
                  <Switch
                    id="visivel"
                    checked={planForm.visivel_contratacao}
                    onCheckedChange={(checked) => setPlanForm({ ...planForm, visivel_contratacao: checked })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <ArrowUpDown className="w-3 h-3 text-primary" />
                      Ordem de exibição
                    </Label>
                    <Input
                      type="number"
                      value={planForm.ordem}
                      onChange={(e) => setPlanForm({ ...planForm, ordem: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Palette className="w-3 h-3 text-primary" />
                      Cor do card
                    </Label>
                    <Select value={planForm.cor} onValueChange={(value) => setPlanForm({ ...planForm, cor: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COLOR_OPTIONS.map(color => (
                          <SelectItem key={color.value} value={color.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${color.class}`} />
                              {color.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Benefícios extras (um por linha)
                  </Label>
                  <textarea
                    className="w-full min-h-[80px] p-2 text-sm rounded-md border border-border bg-background resize-none"
                    value={planForm.beneficios_extras.join('\n')}
                    onChange={(e) => setPlanForm({ 
                      ...planForm, 
                      beneficios_extras: e.target.value.split('\n').filter(b => b.trim()) 
                    })}
                    placeholder="Ex: Suporte prioritário&#10;Acesso antecipado a novos recursos"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Conexões</Label>
                    <Input
                      type="number"
                      value={planForm.qntConexoes}
                      onChange={(e) => setPlanForm({ ...planForm, qntConexoes: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Listas</Label>
                    <Input
                      type="number"
                      value={planForm.qntListas}
                      onChange={(e) => setPlanForm({ ...planForm, qntListas: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Contatos</Label>
                    <Input
                      type="number"
                      value={planForm.qntContatos}
                      onChange={(e) => setPlanForm({ ...planForm, qntContatos: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Disparos</Label>
                    <Input
                      type="number"
                      value={planForm.qntDisparos}
                      onChange={(e) => setPlanForm({ ...planForm, qntDisparos: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-border/30">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Consultas/Extrações por Mês</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs">
                        <Instagram className="w-3 h-3 text-pink-500" />
                        Instagram
                      </Label>
                      <Input
                        type="number"
                        value={planForm.qntInstagram}
                        onChange={(e) => setPlanForm({ ...planForm, qntInstagram: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs">
                        <Linkedin className="w-3 h-3 text-blue-500" />
                        LinkedIn
                      </Label>
                      <Input
                        type="number"
                        value={planForm.qntLinkedin}
                        onChange={(e) => setPlanForm({ ...planForm, qntLinkedin: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs">
                        <MapPin className="w-3 h-3 text-emerald-500" />
                        Google Places
                      </Label>
                      <Input
                        type="number"
                        value={planForm.qntPlaces}
                        onChange={(e) => setPlanForm({ ...planForm, qntPlaces: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2 text-xs">
                        <MessageCircle className="w-3 h-3 text-green-500" />
                        WhatsApp Grupos
                      </Label>
                      <Input
                        type="number"
                        value={planForm.qntExtracoes}
                        onChange={(e) => setPlanForm({ ...planForm, qntExtracoes: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <Button onClick={handleSavePlan} className="w-full mt-4 bg-gradient-to-r from-primary to-primary/80">
                  {editingPlan ? 'Salvar Alterações' : 'Criar Plano'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {disparadorPlans.length === 0 ? (
          <Card className="border-border/40 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <Send className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum plano de disparador</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crie seu primeiro plano de disparador clicando no botão acima
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {disparadorPlans.map((plan, index) => renderPlanCard(plan, index))}
          </div>
        )}
      </div>
    </div>
  );
}
