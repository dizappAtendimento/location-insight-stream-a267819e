import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Edit2, RefreshCw, UserPlus, Zap, Database, Eye, Copy, Users, Sparkles } from 'lucide-react';
import { format, addDays, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface User {
  id: string;
  nome: string | null;
  Email: string | null;
  telefone: string | null;
  senha: string | null;
  status: boolean | null;
  status_ex: boolean | null;
  plano_nome: string | null;
  plano_id: number | null;
  plano_extrator_id: number | null;
  plano_extrator_nome: string | null;
  dataValidade: string | null;
  dataValidade_extrator: string | null;
  created_at: string | null;
  total_conexoes: number | null;
  total_contatos: number | null;
  total_disparos: number | null;
  total_listas: number | null;
}

interface Plan {
  id: number;
  nome: string;
  tipo: string;
}

export function AdminUsers() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isRenewDialogOpen, setIsRenewDialogOpen] = useState(false);
  const [renewingUser, setRenewingUser] = useState<User | null>(null);
  const [renewDays, setRenewDays] = useState(30);
  const [renewType, setRenewType] = useState<'disparador' | 'extrator'>('disparador');
  
  const [editForm, setEditForm] = useState({
    nome: '',
    Email: '',
    telefone: '',
    plano: '',
    dataValidade: '',
    plano_extrator: '',
    dataValidade_extrator: '',
  });

  const [addForm, setAddForm] = useState({
    nome: '',
    Email: '',
    telefone: '',
    senha: '',
    plano: '',
    dataValidade: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
    plano_extrator: '',
    dataValidade_extrator: '',
  });

  const disparadorPlans = plans.filter(p => !p.tipo || p.tipo === 'disparador');
  const extratorPlans = plans.filter(p => p.tipo === 'extrator');

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'get-users' }
      });

      if (!error && data?.users) {
        setUsers(data.users);
        setFilteredUsers(data.users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'get-plans' }
      });

      if (!error && data?.plans) {
        setPlans(data.plans);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchPlans();
  }, []);

  useEffect(() => {
    const filtered = users.filter(user => 
      user.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.Email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.telefone?.includes(searchTerm)
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const handleToggleStatus = async (userId: string, type: 'disparador' | 'extrator') => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'toggle-user-status', userId, statusType: type }
      });

      if (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao alterar status do usuário',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Sucesso',
        description: `${type === 'extrator' ? 'Extrator' : 'Disparador'} ${data.newStatus ? 'ativado' : 'desativado'} com sucesso`,
      });

      fetchUsers();
    } catch (err) {
      console.error('Error toggling user status:', err);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      nome: user.nome || '',
      Email: user.Email || '',
      telefone: user.telefone || '',
      plano: user.plano_id?.toString() || '',
      dataValidade: user.dataValidade || '',
      plano_extrator: user.plano_extrator_id?.toString() || '',
      dataValidade_extrator: user.dataValidade_extrator || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      const { error } = await supabase.functions.invoke('admin-api', {
        body: { 
          action: 'update-user', 
          userId: editingUser.id,
          userData: {
            nome: editForm.nome,
            Email: editForm.Email,
            telefone: editForm.telefone,
            plano: editForm.plano ? parseInt(editForm.plano) : null,
            dataValidade: editForm.dataValidade || null,
            plano_extrator: editForm.plano_extrator ? parseInt(editForm.plano_extrator) : null,
            'dataValidade_extrator': editForm.dataValidade_extrator || null,
          }
        }
      });

      if (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao atualizar usuário',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Sucesso',
        description: 'Usuário atualizado com sucesso',
      });

      setIsEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Error updating user:', err);
    }
  };

  const handleAddUser = async () => {
    if (!addForm.Email || !addForm.senha) {
      toast({
        title: 'Erro',
        description: 'Email e senha são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('admin-api', {
        body: { 
          action: 'create-user', 
          userData: {
            nome: addForm.nome,
            Email: addForm.Email,
            telefone: addForm.telefone,
            senha: addForm.senha,
            plano: addForm.plano ? parseInt(addForm.plano) : null,
            dataValidade: addForm.dataValidade || null,
            plano_extrator: addForm.plano_extrator ? parseInt(addForm.plano_extrator) : null,
            'dataValidade_extrator': addForm.dataValidade_extrator || null,
            status: !!addForm.plano,
            'Status Ex': !!addForm.plano_extrator,
          }
        }
      });

      if (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao criar usuário',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Sucesso',
        description: 'Usuário criado com sucesso',
      });

      setIsAddDialogOpen(false);
      setAddForm({
        nome: '',
        Email: '',
        telefone: '',
        senha: '',
        plano: '',
        dataValidade: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
        plano_extrator: '',
        dataValidade_extrator: '',
      });
      fetchUsers();
    } catch (err) {
      console.error('Error creating user:', err);
    }
  };

  const handleConfirmRenew = async () => {
    if (!renewingUser) return;

    const currentValidity = renewType === 'extrator' 
      ? renewingUser.dataValidade_extrator 
      : renewingUser.dataValidade;

    const baseDate = currentValidity && new Date(currentValidity) > new Date()
      ? new Date(currentValidity)
      : new Date();
    
    const newDate = addDays(baseDate, renewDays);

    const updateData: Record<string, unknown> = renewType === 'extrator'
      ? { 'dataValidade_extrator': format(newDate, 'yyyy-MM-dd'), 'Status Ex': true }
      : { dataValidade: format(newDate, 'yyyy-MM-dd'), status: true };

    try {
      const { error } = await supabase.functions.invoke('admin-api', {
        body: { 
          action: 'update-user', 
          userId: renewingUser.id,
          userData: updateData
        }
      });

      if (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao renovar usuário',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Sucesso',
        description: `${renewType === 'extrator' ? 'Extrator' : 'Disparador'} renovado para ${format(newDate, 'dd/MM/yyyy', { locale: ptBR })}`,
      });

      setIsRenewDialogOpen(false);
      setRenewingUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Error renewing user:', err);
    }
  };

  // Get badge color based on plan name
  const getPlanBadgeStyle = (planName: string | null, isActive: boolean) => {
    if (!planName) return '';
    const name = planName.toLowerCase();
    
    if (!isActive) return 'bg-muted text-muted-foreground border border-border/50';
    
    if (name.includes('gold') || name.includes('ouro')) {
      return 'bg-amber-500 text-white border-0 shadow-sm';
    }
    if (name.includes('diamante') || name.includes('diamond')) {
      return 'bg-cyan-500 text-white border-0 shadow-sm';
    }
    if (name.includes('platina') || name.includes('platinum')) {
      return 'bg-slate-500 text-white border-0 shadow-sm';
    }
    if (name.includes('max')) {
      return 'bg-violet-500 text-white border-0 shadow-sm';
    }
    if (name.includes('ilimitado')) {
      return 'bg-emerald-500 text-white border-0 shadow-sm';
    }
    if (name.includes('free') || name.includes('grátis')) {
      return 'bg-muted text-muted-foreground border border-border/50';
    }
    
    return 'bg-primary text-primary-foreground border-0 shadow-sm';
  };

  if (isLoading) {
    return (
      <Card className="border-border/40 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Carregando usuários...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/40 overflow-hidden">
      <CardHeader className="pb-4 border-b border-border/30 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Users className="w-4 h-4 text-primary" />
            </div>
            Usuários ({users.length})
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50 border-border/40 focus:border-primary/50"
              />
            </div>
            <Button 
              variant="outline" 
              size="icon" 
              onClick={fetchUsers}
              className="border-border/40 hover:bg-muted/50"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg">
                  <UserPlus className="w-4 h-4" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Adicionar Usuário
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome</Label>
                      <Input
                        value={addForm.nome}
                        onChange={(e) => setAddForm({ ...addForm, nome: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefone</Label>
                      <Input
                        value={addForm.telefone}
                        onChange={(e) => setAddForm({ ...addForm, telefone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email *</Label>
                      <Input
                        type="email"
                        value={addForm.Email}
                        onChange={(e) => setAddForm({ ...addForm, Email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Senha *</Label>
                      <Input
                        type="password"
                        value={addForm.senha}
                        onChange={(e) => setAddForm({ ...addForm, senha: e.target.value })}
                      />
                    </div>
                  </div>

                  <Tabs defaultValue="disparador" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                      <TabsTrigger value="disparador" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                        <Zap className="w-3 h-3" />
                        Disparador
                      </TabsTrigger>
                      <TabsTrigger value="extrator" className="gap-1.5 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                        <Database className="w-3 h-3" />
                        Extrator
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="disparador" className="space-y-3 mt-3">
                      <div className="space-y-2">
                        <Label>Plano Disparador</Label>
                        <Select value={addForm.plano} onValueChange={(value) => setAddForm({ ...addForm, plano: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um plano" />
                          </SelectTrigger>
                          <SelectContent>
                            {disparadorPlans.map((plan) => (
                              <SelectItem key={plan.id} value={plan.id.toString()}>
                                {plan.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Validade Disparador</Label>
                        <Input
                          type="date"
                          value={addForm.dataValidade}
                          onChange={(e) => setAddForm({ ...addForm, dataValidade: e.target.value })}
                        />
                      </div>
                    </TabsContent>
                    <TabsContent value="extrator" className="space-y-3 mt-3">
                      <div className="space-y-2">
                        <Label>Plano Extrator</Label>
                        <Select value={addForm.plano_extrator} onValueChange={(value) => setAddForm({ ...addForm, plano_extrator: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um plano" />
                          </SelectTrigger>
                          <SelectContent>
                            {extratorPlans.map((plan) => (
                              <SelectItem key={plan.id} value={plan.id.toString()}>
                                {plan.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Validade Extrator</Label>
                        <Input
                          type="date"
                          value={addForm.dataValidade_extrator}
                          onChange={(e) => setAddForm({ ...addForm, dataValidade_extrator: e.target.value })}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>

                  <Button onClick={handleAddUser} className="w-full bg-gradient-to-r from-primary to-primary/80">
                    Criar Usuário
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/30 bg-muted/30">
                <TableHead className="w-[280px] text-xs font-semibold uppercase tracking-wider">Usuário</TableHead>
                <TableHead className="w-[220px] text-center text-xs font-semibold uppercase tracking-wider">Plano Disparador</TableHead>
                <TableHead className="w-[220px] text-center text-xs font-semibold uppercase tracking-wider">Plano Extrator</TableHead>
                <TableHead className="w-[100px] text-right text-xs font-semibold uppercase tracking-wider">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="group border-border/20 hover:bg-muted/20 transition-colors">
                  {/* User Info */}
                  <TableCell className="py-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                        {(user.nome || user.Email || '?')[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{user.nome || 'Sem nome'}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.Email}</p>
                        {user.senha && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="text-[10px] text-primary/70 hover:text-primary flex items-center gap-1 mt-1">
                                <Eye className="w-3 h-3" />
                                Ver senha
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-3" align="start">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">{user.senha}</span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7"
                                  onClick={() => {
                                    navigator.clipboard.writeText(user.senha || '');
                                    toast({ title: 'Copiado!', description: 'Senha copiada para a área de transferência' });
                                  }}
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* Disparador Plan */}
                  <TableCell className="py-3">
                    <div className="flex flex-col items-center gap-1.5 min-w-[120px]">
                      <div className="flex items-center justify-center gap-2 w-full">
                        <div className="w-[70px] flex justify-end">
                          {user.plano_nome ? (
                            <Badge className={`text-[10px] font-semibold px-2.5 py-0.5 ${getPlanBadgeStyle(user.plano_nome, !!user.status)}`}>
                              {user.plano_nome}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                        <Switch
                          checked={!!user.status}
                          onCheckedChange={() => handleToggleStatus(user.id, 'disparador')}
                          className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-muted-foreground/30 scale-[0.8]"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium h-4">
                        {user.dataValidade ? format(new Date(user.dataValidade), 'dd/MM/yyyy') : ''}
                      </p>
                    </div>
                  </TableCell>
                  
                  {/* Extrator Plan */}
                  <TableCell className="py-3">
                    <div className="flex flex-col items-center gap-1.5 min-w-[120px]">
                      <div className="flex items-center justify-center gap-2 w-full">
                        <div className="w-[70px] flex justify-end">
                          {user.plano_extrator_nome ? (
                            <Badge className={`text-[10px] font-semibold px-2.5 py-0.5 ${getPlanBadgeStyle(user.plano_extrator_nome, !!user.status_ex)}`}>
                              {user.plano_extrator_nome}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </div>
                        <Switch
                          checked={!!user.status_ex}
                          onCheckedChange={() => handleToggleStatus(user.id, 'extrator')}
                          className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-muted-foreground/30 scale-[0.8]"
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground font-medium h-4">
                        {user.dataValidade_extrator ? format(new Date(user.dataValidade_extrator), 'dd/MM/yyyy') : ''}
                      </p>
                    </div>
                  </TableCell>
                  
                  {/* Actions */}
                  <TableCell className="py-3 text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 hover:bg-primary/10 hover:text-primary" 
                      onClick={() => handleEditUser(user)} 
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 rounded-full bg-muted/50 mb-4">
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Nenhum usuário encontrado</h3>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'Tente uma busca diferente' : 'Adicione seu primeiro usuário'}
            </p>
          </div>
        )}
      </CardContent>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-primary" />
              Editar Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={editForm.nome}
                  onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={editForm.telefone}
                  onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={editForm.Email}
                onChange={(e) => setEditForm({ ...editForm, Email: e.target.value })}
              />
            </div>

            <Tabs defaultValue="disparador" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50">
                <TabsTrigger value="disparador" className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <Zap className="w-3 h-3" />
                  Disparador
                </TabsTrigger>
                <TabsTrigger value="extrator" className="gap-1.5 data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                  <Database className="w-3 h-3" />
                  Extrator
                </TabsTrigger>
              </TabsList>
              <TabsContent value="disparador" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label>Plano Disparador</Label>
                  <Select value={editForm.plano} onValueChange={(value) => setEditForm({ ...editForm, plano: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {disparadorPlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id.toString()}>
                          {plan.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Validade Disparador</Label>
                  <Input
                    type="date"
                    value={editForm.dataValidade}
                    onChange={(e) => setEditForm({ ...editForm, dataValidade: e.target.value })}
                  />
                </div>
              </TabsContent>
              <TabsContent value="extrator" className="space-y-3 mt-3">
                <div className="space-y-2">
                  <Label>Plano Extrator</Label>
                  <Select value={editForm.plano_extrator} onValueChange={(value) => setEditForm({ ...editForm, plano_extrator: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um plano" />
                    </SelectTrigger>
                    <SelectContent>
                      {extratorPlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id.toString()}>
                          {plan.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Validade Extrator</Label>
                  <Input
                    type="date"
                    value={editForm.dataValidade_extrator}
                    onChange={(e) => setEditForm({ ...editForm, dataValidade_extrator: e.target.value })}
                  />
                </div>
              </TabsContent>
            </Tabs>

            <Button onClick={handleSaveUser} className="w-full bg-gradient-to-r from-primary to-primary/80">
              Salvar Alterações
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Renew Dialog */}
      <Dialog open={isRenewDialogOpen} onOpenChange={setIsRenewDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              Renovar {renewType === 'extrator' ? 'Extrator' : 'Disparador'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Renovar acesso de <span className="font-medium text-foreground">{renewingUser?.nome || renewingUser?.Email}</span>
            </p>
            <div className="space-y-2">
              <Label>Adicionar dias</Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setRenewDays(7)}>7 dias</Button>
                <Button variant="outline" size="sm" onClick={() => setRenewDays(15)}>15 dias</Button>
                <Button variant="outline" size="sm" onClick={() => setRenewDays(30)}>30 dias</Button>
                <Button variant="outline" size="sm" onClick={() => setRenewDays(90)}>90 dias</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ou informe os dias</Label>
              <Input
                type="number"
                min="1"
                value={renewDays}
                onChange={(e) => setRenewDays(parseInt(e.target.value) || 0)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Nova validade: {renewingUser && format(
                addDays(
                  (() => {
                    const currentVal = renewType === 'extrator' 
                      ? renewingUser.dataValidade_extrator 
                      : renewingUser.dataValidade;
                    return currentVal && new Date(currentVal) > new Date()
                      ? new Date(currentVal)
                      : new Date();
                  })(),
                  renewDays
                ),
                'dd/MM/yyyy',
                { locale: ptBR }
              )}
            </p>
            <Button onClick={handleConfirmRenew} className="w-full bg-gradient-to-r from-primary to-primary/80">
              Confirmar Renovação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
