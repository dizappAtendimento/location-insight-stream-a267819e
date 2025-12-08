import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Plus, Edit2, Trash2, Users, Link2, List, Send, Contact, Instagram, Linkedin, MapPin } from 'lucide-react';

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
  tipo: string | null;
  total_usuarios: number | null;
}

const defaultPlanForm = {
  nome: '',
  preco: '',
  qntConexoes: '',
  qntContatos: '',
  qntDisparos: '',
  qntListas: '',
  qntInstagram: '',
  qntLinkedin: '',
  qntPlaces: '',
  tipo: 'disparador',
};

export function AdminPlans() {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [planForm, setPlanForm] = useState(defaultPlanForm);
  const [activeTab, setActiveTab] = useState('disparador');

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
      qntConexoes: plan.qntConexoes?.toString() || '',
      qntContatos: plan.qntContatos?.toString() || '',
      qntDisparos: plan.qntDisparos?.toString() || '',
      qntListas: plan.qntListas?.toString() || '',
      qntInstagram: plan.qntInstagram?.toString() || '',
      qntLinkedin: plan.qntLinkedin?.toString() || '',
      qntPlaces: plan.qntPlaces?.toString() || '',
      tipo: plan.tipo || 'disparador',
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
      qntConexoes: parseInt(planForm.qntConexoes) || 0,
      qntContatos: parseInt(planForm.qntContatos) || 0,
      qntDisparos: parseInt(planForm.qntDisparos) || 0,
      qntListas: parseInt(planForm.qntListas) || 0,
      qntInstagram: parseInt(planForm.qntInstagram) || 0,
      qntLinkedin: parseInt(planForm.qntLinkedin) || 0,
      qntPlaces: parseInt(planForm.qntPlaces) || 0,
      tipo: planForm.tipo,
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
  const extratorPlans = plans.filter(p => p.tipo === 'extrator');

  const renderPlanCard = (plan: Plan) => (
    <Card key={plan.id} className="bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300 group">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{plan.nome}</CardTitle>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleEditPlan(plan)}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
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
        <p className="text-2xl font-bold text-primary">
          R$ {plan.preco?.toFixed(2).replace('.', ',')}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span>Usuários</span>
          </div>
          <Badge variant="secondary">{plan.total_usuarios || 0}</Badge>
        </div>
        
        {plan.tipo === 'extrator' ? (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm">
              <Instagram className="w-4 h-4 text-pink-400" />
              <span className="text-muted-foreground">Instagram:</span>
              <span className="font-medium">{plan.qntInstagram?.toLocaleString('pt-BR') || 0}/mês</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Linkedin className="w-4 h-4 text-[#0A66C2]" />
              <span className="text-muted-foreground">LinkedIn:</span>
              <span className="font-medium">{plan.qntLinkedin?.toLocaleString('pt-BR') || 0}/mês</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span className="text-muted-foreground">Google Places:</span>
              <span className="font-medium">{plan.qntPlaces?.toLocaleString('pt-BR') || 0}/mês</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link2 className="w-3.5 h-3.5" />
              <span>{plan.qntConexoes || 0} conexões</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <List className="w-3.5 h-3.5" />
              <span>{plan.qntListas || 0} listas</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Contact className="w-3.5 h-3.5" />
              <span>{plan.qntContatos?.toLocaleString('pt-BR') || 0} contatos</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Send className="w-3.5 h-3.5" />
              <span>{plan.qntDisparos?.toLocaleString('pt-BR') || 0} disparos</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="bg-card/50 border-border/50 animate-pulse">
            <CardContent className="p-6">
              <div className="h-6 bg-muted rounded w-32 mb-4" />
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-4 bg-muted rounded w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList className="bg-card/50 border border-border/50">
            <TabsTrigger value="disparador" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Send className="w-4 h-4" />
              Disparador ({disparadorPlans.length})
            </TabsTrigger>
            <TabsTrigger value="extrator" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MapPin className="w-4 h-4" />
              Extrator ({extratorPlans.length})
            </TabsTrigger>
          </TabsList>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleNewPlan(activeTab)} className="gap-2">
                <Plus className="w-4 h-4" />
                Novo Plano
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingPlan ? 'Editar Plano' : 'Novo Plano'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Tipo do Plano</Label>
                  <Select 
                    value={planForm.tipo} 
                    onValueChange={(value) => setPlanForm({ ...planForm, tipo: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disparador">Disparador</SelectItem>
                      <SelectItem value="extrator">Extrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nome do Plano</Label>
                  <Input
                    value={planForm.nome}
                    onChange={(e) => setPlanForm({ ...planForm, nome: e.target.value })}
                    placeholder="Ex: Plano Básico"
                  />
                </div>
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
                
                {planForm.tipo === 'extrator' ? (
                  <div className="space-y-4">
                    <p className="text-sm font-medium text-muted-foreground">Limites de Extração por Mês</p>
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Instagram className="w-4 h-4 text-pink-400" />
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
                        <Label className="flex items-center gap-2">
                          <Linkedin className="w-4 h-4 text-[#0A66C2]" />
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
                        <Label className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-400" />
                          Google Places
                        </Label>
                        <Input
                          type="number"
                          value={planForm.qntPlaces}
                          onChange={(e) => setPlanForm({ ...planForm, qntPlaces: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
                
                <Button onClick={handleSavePlan} className="w-full">
                  {editingPlan ? 'Salvar Alterações' : 'Criar Plano'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <TabsContent value="disparador" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {disparadorPlans.map(renderPlanCard)}
          </div>
          {disparadorPlans.length === 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum plano de disparador cadastrado
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="extrator" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {extratorPlans.map(renderPlanCard)}
          </div>
          {extratorPlans.length === 0 && (
            <Card className="bg-card/50 border-border/50">
              <CardContent className="py-12 text-center text-muted-foreground">
                Nenhum plano de extrator cadastrado
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
