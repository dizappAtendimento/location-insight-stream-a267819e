import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Plus, Trash2, Shield, Crown } from 'lucide-react';

interface AdminUser {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
}

export function AdminSuperAdmins() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [firstAdminId, setFirstAdminId] = useState<string | null>(null);

  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'get-admins' }
      });

      if (error) throw error;

      if (data?.admins) {
        setAdmins(data.admins);
        // The first admin (oldest) is the principal
        if (data.admins.length > 0) {
          const sorted = [...data.admins].sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          setFirstAdminId(sorted[0].user_id);
        }
      }
    } catch (err) {
      console.error('Error fetching admins:', err);
      toast.error('Erro ao buscar administradores');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAddAdmin = async () => {
    if (!newAdminName.trim()) {
      toast.error('Digite o nome do administrador');
      return;
    }
    if (!newAdminEmail.trim()) {
      toast.error('Digite o email do administrador');
      return;
    }
    if (!newAdminPassword.trim()) {
      toast.error('Digite a senha do administrador');
      return;
    }
    if (newAdminPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { 
          action: 'add-admin',
          nome: newAdminName.trim(),
          email: newAdminEmail.trim(),
          senha: newAdminPassword
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success('Administrador adicionado com sucesso!');
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setIsAddDialogOpen(false);
      fetchAdmins();
    } catch (err) {
      console.error('Error adding admin:', err);
      toast.error('Erro ao adicionar administrador');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveAdmin = async (userId: string, email: string) => {
    if (userId === firstAdminId) {
      toast.error('Não é possível remover o administrador principal');
      return;
    }

    if (userId === user?.id) {
      toast.error('Você não pode remover a si mesmo');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { 
          action: 'remove-admin',
          userId: userId
        }
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      toast.success(`Administrador ${email} removido`);
      fetchAdmins();
    } catch (err) {
      console.error('Error removing admin:', err);
      toast.error('Erro ao remover administrador');
    }
  };

  if (isLoading) {
    return (
      <Card className="border-border/40 bg-card">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48" />
            <div className="h-24 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/40 bg-card overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/30">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10">
                <Shield className="w-5 h-5 text-amber-500" />
              </div>
              Super Admins
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Usuários com acesso ao painel administrativo
            </p>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4" />
                Novo Super Admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Super Admin</DialogTitle>
                <DialogDescription>
                  Preencha os dados para criar um novo administrador.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Nome do administrador"
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@exemplo.com"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleAddAdmin} 
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSubmitting ? 'Adicionando...' : 'Adicionar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/30 bg-muted/30">
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Email</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider">Adicionado em</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                    Nenhum administrador encontrado
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((admin) => (
                  <TableRow key={admin.id} className="border-border/20 hover:bg-muted/30 transition-colors">
                    <TableCell className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-semibold text-primary">
                            {(admin.user_email || admin.user_name || 'A')[0].toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-primary">
                            {admin.user_email || admin.user_name || 'Email não disponível'}
                          </span>
                          {admin.user_id === firstAdminId && (
                            <Badge variant="secondary" className="text-[10px] gap-1">
                              <Crown className="w-3 h-3" />
                              Principal
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(admin.created_at), "dd/MM/yyyy 'às' HH:mm")}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 text-right">
                      {admin.user_id !== firstAdminId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          onClick={() => handleRemoveAdmin(admin.user_id, admin.user_email || '')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
