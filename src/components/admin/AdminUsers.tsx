import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Search, Edit2, UserX, UserCheck, RefreshCw, UserPlus, Calendar, Zap, Database } from 'lucide-react';
import { format, addDays, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface User {
  id: string;
  nome: string | null;
  Email: string | null;
  telefone: string | null;
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
    // Disparador
    plano: '',
    dataValidade: '',
    // Extrator
    plano_extrator: '',
    dataValidade_extrator: '',
  });

  const [addForm, setAddForm] = useState({
    nome: '',
    Email: '',
    telefone: '',
    senha: '',
    // Disparador
    plano: '',
    dataValidade: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
    // Extrator
    plano_extrator: '',
    dataValidade_extrator: '',
  });

  const disparadorPlans = plans.filter(p => !p.tipo || p.tipo === 'disparador');
  const extratorPlans = plans.filter(p => p.tipo === 'extrator');
  
  console.log('Plans loaded:', plans);
  console.log('Disparador plans:', disparadorPlans);
  console.log('Extrator plans:', extratorPlans);

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

  const handleRenewUser = (user: User, type: 'disparador' | 'extrator') => {
    setRenewingUser(user);
    setRenewType(type);
    setRenewDays(30);
    setIsRenewDialogOpen(true);
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

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-semibold">Usuários ({users.length})</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar usuário..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background/50"
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchUsers}>
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <UserPlus className="w-4 h-4" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Adicionar Usuário</DialogTitle>
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
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="disparador" className="gap-1.5">
                        <Zap className="w-3 h-3" />
                        Disparador
                      </TabsTrigger>
                      <TabsTrigger value="extrator" className="gap-1.5">
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

                  <Button onClick={handleAddUser} className="w-full">
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
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="w-[280px]">Usuário</TableHead>
                <TableHead className="w-[200px] text-center">Plano Disparador</TableHead>
                <TableHead className="w-[200px] text-center">Plano Extrator</TableHead>
                <TableHead className="w-[160px] text-center">Estatísticas</TableHead>
                <TableHead className="w-[140px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="group border-border/30">
                  {/* Coluna Usuário */}
                  <TableCell className="py-3">
                    <div className="space-y-0.5">
                      <p className="font-medium text-foreground">{user.nome || 'Sem nome'}</p>
                      <p className="text-sm text-muted-foreground">{user.Email}</p>
                      {user.telefone && (
                        <p className="text-sm text-muted-foreground/70">{user.telefone}</p>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Coluna Disparador */}
                  <TableCell className="py-3">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className="text-xs font-medium bg-blue-500/10 text-blue-400 border-blue-500/30 px-2.5"
                        >
                          {user.plano_nome || 'Sem plano'}
                        </Badge>
                        <Badge 
                          variant="outline"
                          className={`text-[10px] font-semibold px-2 py-0.5 ${
                            user.status 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                              : 'bg-red-500/20 text-red-400 border-red-500/40'
                          }`}
                        >
                          {user.status ? 'ON' : 'OFF'}
                        </Badge>
                      </div>
                      {user.dataValidade && (
                        <p className={`text-xs font-medium ${
                          new Date(user.dataValidade) < new Date() 
                            ? 'text-red-400' 
                            : 'text-muted-foreground'
                        }`}>
                          Válido até {format(new Date(user.dataValidade), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Coluna Extrator */}
                  <TableCell className="py-3">
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className="text-xs font-medium bg-violet-500/10 text-violet-400 border-violet-500/30 px-2.5"
                        >
                          {user.plano_extrator_nome || 'Sem plano'}
                        </Badge>
                        <Badge 
                          variant="outline"
                          className={`text-[10px] font-semibold px-2 py-0.5 ${
                            user.status_ex 
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                              : 'bg-red-500/20 text-red-400 border-red-500/40'
                          }`}
                        >
                          {user.status_ex ? 'ON' : 'OFF'}
                        </Badge>
                      </div>
                      {user.dataValidade_extrator && (
                        <p className={`text-xs font-medium ${
                          new Date(user.dataValidade_extrator) < new Date() 
                            ? 'text-red-400' 
                            : 'text-muted-foreground'
                        }`}>
                          Válido até {format(new Date(user.dataValidade_extrator), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Coluna Estatísticas */}
                  <TableCell className="py-3">
                    <div className="flex flex-col items-center gap-0.5 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Conexões:</span>
                        <span className="font-medium text-foreground">{user.total_conexoes || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Contatos:</span>
                        <span className="font-medium text-foreground">{user.total_contatos || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">Disparos:</span>
                        <span className="font-medium text-foreground">{user.total_disparos || 0}</span>
                      </div>
                    </div>
                  </TableCell>
                  
                  {/* Coluna Ações */}
                  <TableCell className="py-3 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 hover:bg-primary/10"
                        onClick={() => handleEditUser(user)}
                        title="Editar usuário"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-blue-500/10"
                        onClick={() => handleRenewUser(user, 'disparador')}
                        title="Renovar Disparador"
                      >
                        <Zap className="w-4 h-4 text-blue-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-violet-500/10"
                        onClick={() => handleRenewUser(user, 'extrator')}
                        title="Renovar Extrator"
                      >
                        <Database className="w-4 h-4 text-violet-400" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-blue-500/10"
                        onClick={() => handleToggleStatus(user.id, 'disparador')}
                        title={user.status ? 'Desativar Disparador' : 'Ativar Disparador'}
                      >
                        {user.status ? (
                          <UserX className="w-4 h-4 text-blue-400" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-blue-400" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-violet-500/10"
                        onClick={() => handleToggleStatus(user.id, 'extrator')}
                        title={user.status_ex ? 'Desativar Extrator' : 'Ativar Extrator'}
                      >
                        {user.status_ex ? (
                          <UserX className="w-4 h-4 text-violet-400" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-violet-400" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum usuário encontrado
          </div>
        )}
      </CardContent>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
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
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="disparador" className="gap-1.5">
                  <Zap className="w-3 h-3" />
                  Disparador
                </TabsTrigger>
                <TabsTrigger value="extrator" className="gap-1.5">
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

            <Button onClick={handleSaveUser} className="w-full">
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
            <Button onClick={handleConfirmRenew} className="w-full">
              Confirmar Renovação
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}