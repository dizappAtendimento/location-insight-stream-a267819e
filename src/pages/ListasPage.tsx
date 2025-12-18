import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { RefreshCw, Plus, Users, MessageSquare, Pencil, Trash2, List, Search, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Lista {
  id: number;
  nome: string;
  tipo: string | null;
  descricao: string | null;
  created_at: string;
  idUsuario: string;
  idConexao: number | null;
  campos: any;
}

const ListasPage = () => {
  const { user } = useAuth();
  const [listas, setListas] = useState<Lista[]>([]);
  const [filteredListas, setFilteredListas] = useState<Lista[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [filterType, setFilterType] = useState("all");
  const [filterDate, setFilterDate] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLista, setSelectedLista] = useState<Lista | null>(null);
  
  // Form states
  const [newListName, setNewListName] = useState("");
  const [newListType, setNewListType] = useState("contatos");
  const [newListDescription, setNewListDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchListas = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("SAAS_Listas")
        .select("*")
        .eq("idUsuario", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setListas(data || []);
    } catch (error) {
      console.error("Erro ao buscar listas:", error);
      toast.error("Erro ao carregar listas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchListas();
  }, [user?.id]);

  useEffect(() => {
    let filtered = [...listas];

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter(lista => lista.tipo === filterType);
    }

    // Filter by date
    if (filterDate !== "all") {
      const now = new Date();
      filtered = filtered.filter(lista => {
        const createdAt = new Date(lista.created_at);
        switch (filterDate) {
          case "today":
            return createdAt.toDateString() === now.toDateString();
          case "week":
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return createdAt >= weekAgo;
          case "month":
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return createdAt >= monthAgo;
          case "year":
            const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            return createdAt >= yearAgo;
          default:
            return true;
        }
      });
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(lista =>
        lista.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredListas(filtered);
  }, [listas, filterType, filterDate, searchTerm]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchListas();
  };

  const handleCreateLista = async () => {
    if (!newListName.trim()) {
      toast.error("Nome da lista é obrigatório");
      return;
    }

    if (!user?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("SAAS_Listas")
        .insert({
          nome: newListName.trim(),
          tipo: newListType,
          descricao: newListDescription.trim() || null,
          idUsuario: user.id,
          campos: {},
        });

      if (error) throw error;

      toast.success("Lista criada com sucesso!");
      setCreateModalOpen(false);
      setNewListName("");
      setNewListType("contatos");
      setNewListDescription("");
      fetchListas();
    } catch (error) {
      console.error("Erro ao criar lista:", error);
      toast.error("Erro ao criar lista");
    } finally {
      setSaving(false);
    }
  };

  const handleEditLista = async () => {
    if (!selectedLista || !newListName.trim()) {
      toast.error("Nome da lista é obrigatório");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("SAAS_Listas")
        .update({
          nome: newListName.trim(),
          tipo: newListType,
          descricao: newListDescription.trim() || null,
        })
        .eq("id", selectedLista.id);

      if (error) throw error;

      toast.success("Lista atualizada com sucesso!");
      setEditModalOpen(false);
      setSelectedLista(null);
      setNewListName("");
      setNewListType("contatos");
      setNewListDescription("");
      fetchListas();
    } catch (error) {
      console.error("Erro ao atualizar lista:", error);
      toast.error("Erro ao atualizar lista");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLista = async () => {
    if (!selectedLista) return;

    try {
      const { error } = await supabase
        .from("SAAS_Listas")
        .delete()
        .eq("id", selectedLista.id);

      if (error) throw error;

      toast.success("Lista excluída com sucesso!");
      setDeleteDialogOpen(false);
      setSelectedLista(null);
      fetchListas();
    } catch (error) {
      console.error("Erro ao excluir lista:", error);
      toast.error("Erro ao excluir lista");
    }
  };

  const openEditModal = (lista: Lista) => {
    setSelectedLista(lista);
    setNewListName(lista.nome);
    setNewListType(lista.tipo || "contatos");
    setNewListDescription(lista.descricao || "");
    setEditModalOpen(true);
  };

  const openDeleteDialog = (lista: Lista) => {
    setSelectedLista(lista);
    setDeleteDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <List className="w-8 h-8 text-primary" />
              Listas
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie suas listas de contatos e grupos do WhatsApp
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-primary hover:bg-primary/90">
                  <Plus className="w-4 h-4" />
                  Criar Lista
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="text-primary flex items-center gap-2">
                    <List className="w-5 h-5" />
                    Nova Lista
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="listName">Nome da Lista *</Label>
                    <Input
                      id="listName"
                      placeholder="Digite o nome da lista"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="listType">Tipo de Lista *</Label>
                    <Select value={newListType} onValueChange={setNewListType}>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        <SelectItem value="contatos">
                          <span className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            Contatos
                          </span>
                        </SelectItem>
                        <SelectItem value="grupos">
                          <span className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-yellow-500" />
                            Grupos
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="listDescription">Descrição (opcional)</Label>
                    <Input
                      id="listDescription"
                      placeholder="Descrição da lista"
                      value={newListDescription}
                      onChange={(e) => setNewListDescription(e.target.value)}
                      className="bg-background/50"
                    />
                  </div>
                  <div className="flex gap-3 pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setCreateModalOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      className="flex-1 bg-primary hover:bg-primary/90"
                      onClick={handleCreateLista}
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        "Criar Lista"
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-primary font-medium">Carregando listas...</p>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="glass-card p-4 flex flex-col sm:flex-row gap-4 flex-wrap">
              <div className="flex flex-col gap-1.5 min-w-[150px]">
                <Label className="text-muted-foreground text-sm">Tipo de Lista</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="contatos">
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        Contatos
                      </span>
                    </SelectItem>
                    <SelectItem value="grupos">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-yellow-500" />
                        Grupos
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 min-w-[150px]">
                <Label className="text-muted-foreground text-sm">Data de Criação</Label>
                <Select value={filterDate} onValueChange={setFilterDate}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Todas as datas" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="all">Todas as datas</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="week">Última semana</SelectItem>
                    <SelectItem value="month">Último mês</SelectItem>
                    <SelectItem value="year">Último ano</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                <Label className="text-muted-foreground text-sm">Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar lista..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-background/50"
                  />
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-primary font-semibold">Nome da Lista</TableHead>
                    <TableHead className="text-primary font-semibold">Tipo</TableHead>
                    <TableHead className="text-primary font-semibold">Data de Criação</TableHead>
                    <TableHead className="text-primary font-semibold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredListas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                        {listas.length === 0
                          ? "Nenhuma lista encontrada. Crie sua primeira lista!"
                          : "Nenhuma lista corresponde aos filtros selecionados."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredListas.map((lista) => (
                      <TableRow
                        key={lista.id}
                        className="border-border/50 hover:bg-primary/5 transition-colors"
                      >
                        <TableCell className="font-medium text-foreground">
                          {lista.nome}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                              lista.tipo === "contatos"
                                ? "bg-primary/10 text-primary border border-primary/30"
                                : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/30"
                            }`}
                          >
                            {lista.tipo === "contatos" ? (
                              <Users className="w-3.5 h-3.5" />
                            ) : (
                              <MessageSquare className="w-3.5 h-3.5" />
                            )}
                            {lista.tipo === "contatos" ? "Contatos" : "Grupos"}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(lista.created_at), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(lista)}
                              className="hover:text-primary hover:bg-primary/10"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(lista)}
                              className="hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {/* Edit Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-primary flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                Editar Lista
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="editListName">Nome da Lista *</Label>
                <Input
                  id="editListName"
                  placeholder="Digite o nome da lista"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editListType">Tipo de Lista *</Label>
                <Select value={newListType} onValueChange={setNewListType}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="contatos">
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        Contatos
                      </span>
                    </SelectItem>
                    <SelectItem value="grupos">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="w-4 h-4 text-yellow-500" />
                        Grupos
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editListDescription">Descrição (opcional)</Label>
                <Input
                  id="editListDescription"
                  placeholder="Descrição da lista"
                  value={newListDescription}
                  onChange={(e) => setNewListDescription(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={handleEditLista}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-card border-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">
                Excluir Lista
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a lista "{selectedLista?.nome}"?
                Esta ação não pode ser desfeita e todos os contatos/grupos
                associados serão removidos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteLista}
                className="bg-destructive hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default ListasPage;
