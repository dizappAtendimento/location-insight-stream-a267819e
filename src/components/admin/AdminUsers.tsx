import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { Search, Edit2, UserX, UserCheck, RefreshCw, UserPlus, Calendar } from 'lucide-react';
import { format, addDays, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface User {
  id: string;
  nome: string | null;
  Email: string | null;
  telefone: string | null;
  status: boolean | null;
  plano_nome: string | null;
  plano_id: number | null;
  plano_tipo: string | null;
  dataValidade: string | null;
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
  
  const [editForm, setEditForm] = useState({
    nome: '',
    Email: '',
    telefone: '',
    dataValidade: '',
    plano: '',
  });

  const [addForm, setAddForm] = useState({
    nome: '',
    Email: '',
    telefone: '',
    senha: '',
    dataValidade: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
    plano: '',
  });

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

  const handleToggleStatus = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'toggle-user-status', userId }
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
        description: `Usuário ${data.newStatus ? 'ativado' : 'desativado'} com sucesso`,
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
      dataValidade: user.dataValidade || '',
      plano: user.plano_id?.toString() || '',
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
            dataValidade: editForm.dataValidade,
            plano: editForm.plano ? parseInt(editForm.plano) : null,
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
            dataValidade: addForm.dataValidade,
            plano: addForm.plano ? parseInt(addForm.plano) : null,
            status: true,
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
        dataValidade: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
        plano: '',
      });
      fetchUsers();
    } catch (err) {
      console.error('Error creating user:', err);
    }
  };

  const handleRenewUser = (user: User) => {
    setRenewingUser(user);
    setRenewDays(30);
    setIsRenewDialogOpen(true);
  };

  const handleConfirmRenew = async () => {
    if (!renewingUser) return;

    const baseDate = renewingUser.dataValidade && new Date(renewingUser.dataValidade) > new Date()
      ? new Date(renewingUser.dataValidade)
      : new Date();
    
    const newDate = addDays(baseDate, renewDays);

    try {
      const { error } = await supabase.functions.invoke('admin-api', {
        body: { 
          action: 'update-user', 
          userId: renewingUser.id,
          userData: {
            dataValidade: format(newDate, 'yyyy-MM-dd'),
            status: true,
          }
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
        description: `Validade renovada para ${format(newDate, 'dd/MM/yyyy', { locale: ptBR })}`,
      });

      setIsRenewDialogOpen(false);
      setRenewingUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Error renewing user:', err);
    }
  };

  const getPlanTypeBadge = (tipo: string | null) => {
    if (tipo === 'extrator') {
      return <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 bg-violet-500/20 text-violet-400 border-violet-500/30">EXT</Badge>;
    }
    return <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 bg-blue-500/20 text-blue-400 border-blue-500/30">DSP</Badge>;
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
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Adicionar Usuário</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={addForm.nome}
                      onChange={(e) => setAddForm({ ...addForm, nome: e.target.value })}
                    />
                  </div>
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
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={addForm.telefone}
                      onChange={(e) => setAddForm({ ...addForm, telefone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plano</Label>
                    <Select value={addForm.plano} onValueChange={(value) => setAddForm({ ...addForm, plano: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um plano" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id.toString()}>
                            {plan.nome} ({plan.tipo === 'extrator' ? 'Extrator' : 'Disparador'})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Validade</Label>
                    <Input
                      type="date"
                      value={addForm.dataValidade}
                      onChange={(e) => setAddForm({ ...addForm, dataValidade: e.target.value })}
                    />
                  </div>
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
              <TableRow className="hover:bg-transparent">
                <TableHead>Usuário</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uso</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className="group">
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.nome || 'Sem nome'}</p>
                      <p className="text-xs text-muted-foreground">{user.Email}</p>
                      {user.telefone && (
                        <p className="text-xs text-muted-foreground">{user.telefone}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Badge variant="outline" className="font-normal">
                        {user.plano_nome || 'Sem plano'}
                      </Badge>
                      {user.plano_tipo && getPlanTypeBadge(user.plano_tipo)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.dataValidade ? (
                      <span className={`text-sm ${new Date(user.dataValidade) < new Date() ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {format(new Date(user.dataValidade), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={user.status ? 'default' : 'secondary'}
                      className={user.status ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-destructive/20 text-destructive border-destructive/30'}
                    >
                      {user.status ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-0.5">
                      <p><span className="text-muted-foreground">Conexões:</span> {user.total_conexoes || 0}</p>
                      <p><span className="text-muted-foreground">Contatos:</span> {user.total_contatos || 0}</p>
                      <p><span className="text-muted-foreground">Disparos:</span> {user.total_disparos || 0}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleEditUser(user)}
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRenewUser(user)}
                        title="Renovar"
                      >
                        <Calendar className="w-4 h-4 text-primary" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleToggleStatus(user.id)}
                        title={user.status ? 'Suspender' : 'Ativar'}
                      >
                        {user.status ? (
                          <UserX className="w-4 h-4 text-destructive" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-emerald-400" />
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={editForm.nome}
                onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={editForm.Email}
                onChange={(e) => setEditForm({ ...editForm, Email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={editForm.telefone}
                onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={editForm.plano} onValueChange={(value) => setEditForm({ ...editForm, plano: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um plano" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id.toString()}>
                      {plan.nome} ({plan.tipo === 'extrator' ? 'Extrator' : 'Disparador'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data de Validade</Label>
              <Input
                type="date"
                value={editForm.dataValidade}
                onChange={(e) => setEditForm({ ...editForm, dataValidade: e.target.value })}
              />
            </div>
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
            <DialogTitle>Renovar Validade</DialogTitle>
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
                  renewingUser.dataValidade && new Date(renewingUser.dataValidade) > new Date()
                    ? new Date(renewingUser.dataValidade)
                    : new Date(),
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