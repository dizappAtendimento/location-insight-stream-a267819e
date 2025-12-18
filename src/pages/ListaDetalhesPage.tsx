import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  RefreshCw, 
  Plus, 
  Users, 
  Pencil, 
  Trash2, 
  Upload, 
  Download, 
  Phone,
  Loader2,
  FileSpreadsheet,
  MessageSquare,
  Search,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import * as XLSX from "xlsx";

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

interface Contato {
  id: number;
  nome: string | null;
  telefone: string | null;
  created_at: string;
  idLista: number;
  idUsuario: string;
  atributos: any;
}

interface Grupo {
  id: number;
  nome: string | null;
  WhatsAppId: string | null;
  participantes: number | null;
  created_at: string;
  idLista: number;
  idUsuario: string;
  idConexao: number;
  atributos: any;
}

interface Conexao {
  id: number;
  NomeConexao: string | null;
  Telefone: string | null;
  instanceName: string | null;
  Apikey: string | null;
}

const ITEMS_PER_PAGE = 10;

const ListaDetalhesPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [lista, setLista] = useState<Lista | null>(null);
  const [contatos, setContatos] = useState<Contato[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [conexoes, setConexoes] = useState<Conexao[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modals
  const [addContatoModalOpen, setAddContatoModalOpen] = useState(false);
  const [editContatoModalOpen, setEditContatoModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [importCsvModalOpen, setImportCsvModalOpen] = useState(false);
  const [importWhatsAppModalOpen, setImportWhatsAppModalOpen] = useState(false);
  
  // Form states
  const [selectedContato, setSelectedContato] = useState<Contato | null>(null);
  const [selectedGrupo, setSelectedGrupo] = useState<Grupo | null>(null);
  const [newNome, setNewNome] = useState("");
  const [newTelefone, setNewTelefone] = useState("");
  const [saving, setSaving] = useState(false);
  
  // Import states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedConexao, setSelectedConexao] = useState<string>("");
  const [importingWhatsApp, setImportingWhatsApp] = useState(false);

  const fetchLista = async () => {
    if (!id || !user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("SAAS_Listas")
        .select("*")
        .eq("id", parseInt(id))
        .eq("idUsuario", user.id)
        .single();

      if (error) throw error;
      setLista(data);
    } catch (error) {
      console.error("Erro ao buscar lista:", error);
      toast.error("Lista não encontrada");
      navigate("/listas");
    }
  };

  const fetchContatos = async () => {
    if (!id || !user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("SAAS_Contatos")
        .select("*")
        .eq("idLista", parseInt(id))
        .eq("idUsuario", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setContatos(data || []);
    } catch (error) {
      console.error("Erro ao buscar contatos:", error);
    }
  };

  const fetchGrupos = async () => {
    if (!id || !user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("SAAS_Grupos")
        .select("*")
        .eq("idLista", parseInt(id))
        .eq("idUsuario", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGrupos(data || []);
    } catch (error) {
      console.error("Erro ao buscar grupos:", error);
    }
  };

  const fetchConexoes = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from("SAAS_Conexões")
        .select("*")
        .eq("idUsuario", user.id);

      if (error) throw error;
      setConexoes(data || []);
    } catch (error) {
      console.error("Erro ao buscar conexões:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchLista(), fetchConexoes()]);
      setLoading(false);
    };
    loadData();
  }, [id, user?.id]);

  useEffect(() => {
    if (lista) {
      if (lista.tipo === "contatos") {
        fetchContatos();
      } else {
        fetchGrupos();
      }
    }
  }, [lista]);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (lista?.tipo === "contatos") {
      await fetchContatos();
    } else {
      await fetchGrupos();
    }
    setRefreshing(false);
    toast.success("Lista atualizada!");
  };

  // Filter items based on search
  const filteredContatos = contatos.filter(c => 
    c.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefone?.includes(searchTerm)
  );

  const filteredGrupos = grupos.filter(g => 
    g.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const items = lista?.tipo === "contatos" ? filteredContatos : filteredGrupos;
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const paginatedItems = items.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Add Contato
  const handleAddContato = async () => {
    if (!newNome.trim() || !newTelefone.trim()) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }

    if (!user?.id || !id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("SAAS_Contatos")
        .insert({
          nome: newNome.trim(),
          telefone: newTelefone.trim(),
          idLista: parseInt(id),
          idUsuario: user.id,
          atributos: {},
        });

      if (error) throw error;

      toast.success("Contato adicionado com sucesso!");
      setAddContatoModalOpen(false);
      setNewNome("");
      setNewTelefone("");
      fetchContatos();
    } catch (error) {
      console.error("Erro ao adicionar contato:", error);
      toast.error("Erro ao adicionar contato");
    } finally {
      setSaving(false);
    }
  };

  // Edit Contato
  const handleEditContato = async () => {
    if (!selectedContato || !newNome.trim() || !newTelefone.trim()) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("SAAS_Contatos")
        .update({
          nome: newNome.trim(),
          telefone: newTelefone.trim(),
        })
        .eq("id", selectedContato.id);

      if (error) throw error;

      toast.success("Contato atualizado com sucesso!");
      setEditContatoModalOpen(false);
      setSelectedContato(null);
      setNewNome("");
      setNewTelefone("");
      fetchContatos();
    } catch (error) {
      console.error("Erro ao atualizar contato:", error);
      toast.error("Erro ao atualizar contato");
    } finally {
      setSaving(false);
    }
  };

  // Delete item
  const handleDelete = async () => {
    if (lista?.tipo === "contatos" && selectedContato) {
      try {
        const { error } = await supabase
          .from("SAAS_Contatos")
          .delete()
          .eq("id", selectedContato.id);

        if (error) throw error;

        toast.success("Contato excluído com sucesso!");
        fetchContatos();
      } catch (error) {
        console.error("Erro ao excluir contato:", error);
        toast.error("Erro ao excluir contato");
      }
    } else if (lista?.tipo === "grupos" && selectedGrupo) {
      try {
        const { error } = await supabase
          .from("SAAS_Grupos")
          .delete()
          .eq("id", selectedGrupo.id);

        if (error) throw error;

        toast.success("Grupo excluído com sucesso!");
        fetchGrupos();
      } catch (error) {
        console.error("Erro ao excluir grupo:", error);
        toast.error("Erro ao excluir grupo");
      }
    }
    
    setDeleteDialogOpen(false);
    setSelectedContato(null);
    setSelectedGrupo(null);
  };

  // Import CSV
  const handleImportCsv = async () => {
    if (!selectedFile || !user?.id || !id) {
      toast.error("Selecione um arquivo CSV");
      return;
    }

    setSaving(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          const contatosToInsert = jsonData.map((row: any) => ({
            nome: row.nome || row.Nome || row.name || row.Name || "",
            telefone: String(row.telefone || row.Telefone || row.phone || row.Phone || ""),
            idLista: parseInt(id),
            idUsuario: user.id,
            atributos: {},
          })).filter(c => c.nome || c.telefone);

          if (contatosToInsert.length === 0) {
            toast.error("Nenhum contato válido encontrado no arquivo");
            return;
          }

          const { error } = await supabase
            .from("SAAS_Contatos")
            .insert(contatosToInsert);

          if (error) throw error;

          toast.success(`${contatosToInsert.length} contatos importados com sucesso!`);
          setImportCsvModalOpen(false);
          setSelectedFile(null);
          fetchContatos();
        } catch (error) {
          console.error("Erro ao processar arquivo:", error);
          toast.error("Erro ao processar arquivo CSV");
        }
      };
      reader.readAsBinaryString(selectedFile);
    } catch (error) {
      console.error("Erro ao importar CSV:", error);
      toast.error("Erro ao importar CSV");
    } finally {
      setSaving(false);
    }
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (lista?.tipo === "contatos") {
      const dataToExport = contatos.map(c => ({
        Nome: c.nome,
        Telefone: c.telefone,
        "Data de Criação": format(new Date(c.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Contatos");
      XLSX.writeFile(workbook, `contatos_${lista.nome}.xlsx`);
      toast.success("Arquivo exportado com sucesso!");
    } else {
      const dataToExport = grupos.map(g => ({
        Nome: g.nome,
        Participantes: g.participantes,
        "WhatsApp ID": g.WhatsAppId,
        "Data de Criação": format(new Date(g.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Grupos");
      XLSX.writeFile(workbook, `grupos_${lista.nome}.xlsx`);
      toast.success("Arquivo exportado com sucesso!");
    }
  };

  // Import from WhatsApp
  const handleImportWhatsApp = async () => {
    if (!selectedConexao || !user?.id || !id) {
      toast.error("Selecione uma conexão");
      return;
    }

    setImportingWhatsApp(true);
    try {
      const conexao = conexoes.find(c => c.id === parseInt(selectedConexao));
      if (!conexao?.instanceName || !conexao?.Apikey) {
        toast.error("Conexão inválida");
        return;
      }

      // Call the evolution API to fetch contacts
      const { data, error } = await supabase.functions.invoke("evolution-api", {
        body: {
          action: lista?.tipo === "contatos" ? "fetchContacts" : "fetchGroups",
          instanceName: conexao.instanceName,
          apiKey: conexao.Apikey,
        },
      });

      if (error) throw error;

      if (lista?.tipo === "contatos" && data?.contacts) {
        const contatosToInsert = data.contacts.map((contact: any) => ({
          nome: contact.pushName || contact.name || "",
          telefone: contact.id?.replace("@s.whatsapp.net", "") || "",
          idLista: parseInt(id),
          idUsuario: user.id,
          atributos: {},
        })).filter((c: any) => c.telefone);

        if (contatosToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from("SAAS_Contatos")
            .insert(contatosToInsert);

          if (insertError) throw insertError;
          toast.success(`${contatosToInsert.length} contatos importados!`);
          fetchContatos();
        } else {
          toast.info("Nenhum contato encontrado");
        }
      } else if (lista?.tipo === "grupos" && data?.groups) {
        const gruposToInsert = data.groups.map((group: any) => ({
          nome: group.subject || "",
          WhatsAppId: group.id || "",
          participantes: group.size || 0,
          idLista: parseInt(id),
          idUsuario: user.id,
          idConexao: parseInt(selectedConexao),
          atributos: {},
        })).filter((g: any) => g.WhatsAppId);

        if (gruposToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from("SAAS_Grupos")
            .insert(gruposToInsert);

          if (insertError) throw insertError;
          toast.success(`${gruposToInsert.length} grupos importados!`);
          fetchGrupos();
        } else {
          toast.info("Nenhum grupo encontrado");
        }
      }

      setImportWhatsAppModalOpen(false);
      setSelectedConexao("");
    } catch (error) {
      console.error("Erro ao importar do WhatsApp:", error);
      toast.error("Erro ao importar do WhatsApp");
    } finally {
      setImportingWhatsApp(false);
    }
  };

  const openEditModal = (contato: Contato) => {
    setSelectedContato(contato);
    setNewNome(contato.nome || "");
    setNewTelefone(contato.telefone || "");
    setEditContatoModalOpen(true);
  };

  const openDeleteDialog = (item: Contato | Grupo) => {
    if (lista?.tipo === "contatos") {
      setSelectedContato(item as Contato);
    } else {
      setSelectedGrupo(item as Grupo);
    }
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-primary font-medium">Carregando lista...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/listas")}
              className="mb-2 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Voltar para Listas
            </Button>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              {lista?.tipo === "contatos" ? (
                <Users className="w-8 h-8 text-primary" />
              ) : (
                <MessageSquare className="w-8 h-8 text-yellow-500" />
              )}
              {lista?.nome}
            </h1>
            <p className="text-muted-foreground mt-1">
              {lista?.tipo === "contatos" 
                ? `${contatos.length} contatos` 
                : `${grupos.length} grupos`}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button
              variant="outline"
              onClick={() => setImportWhatsAppModalOpen(true)}
              className="gap-2"
            >
              <WhatsAppIcon className="w-4 h-4" />
              Puxar do WhatsApp
            </Button>
            {lista?.tipo === "contatos" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setImportCsvModalOpen(true)}
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Importar CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={handleExportCsv}
                  className="gap-2"
                  disabled={contatos.length === 0}
                >
                  <Download className="w-4 h-4" />
                  Exportar
                </Button>
                <Button
                  onClick={() => setAddContatoModalOpen(true)}
                  className="gap-2 bg-primary hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar Contato
                </Button>
              </>
            )}
            {lista?.tipo === "grupos" && (
              <Button
                variant="outline"
                onClick={handleExportCsv}
                className="gap-2"
                disabled={grupos.length === 0}
              >
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="glass-card p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={lista?.tipo === "contatos" ? "Buscar contato..." : "Buscar grupo..."}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 bg-background/50"
            />
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-primary font-semibold">Nome</TableHead>
                {lista?.tipo === "contatos" ? (
                  <TableHead className="text-primary font-semibold">Telefone</TableHead>
                ) : (
                  <TableHead className="text-primary font-semibold">Participantes</TableHead>
                )}
                <TableHead className="text-primary font-semibold">Data de Criação</TableHead>
                <TableHead className="text-primary font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                    {items.length === 0
                      ? lista?.tipo === "contatos"
                        ? "Nenhum contato encontrado. Adicione seu primeiro contato!"
                        : "Nenhum grupo encontrado. Importe grupos do WhatsApp!"
                      : "Nenhum resultado para a busca."}
                  </TableCell>
                </TableRow>
              ) : lista?.tipo === "contatos" ? (
                (paginatedItems as Contato[]).map((contato) => (
                  <TableRow
                    key={contato.id}
                    className="border-border/50 hover:bg-primary/5 transition-colors"
                  >
                    <TableCell className="font-medium text-foreground">
                      {contato.nome || "-"}
                    </TableCell>
                    <TableCell className="text-primary font-mono">
                      {contato.telefone || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(contato.created_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(contato)}
                          className="hover:text-primary hover:bg-primary/10"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(contato)}
                          className="hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                (paginatedItems as Grupo[]).map((grupo) => (
                  <TableRow
                    key={grupo.id}
                    className="border-border/50 hover:bg-primary/5 transition-colors"
                  >
                    <TableCell className="font-medium text-foreground">
                      {grupo.nome || "-"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {grupo.participantes || 0} participantes
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(grupo.created_at), "dd/MM/yyyy HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(grupo)}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t border-border/50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Add Contato Modal */}
        <Dialog open={addContatoModalOpen} onOpenChange={setAddContatoModalOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-primary flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Adicionar Contato
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="contatoNome">Nome *</Label>
                <Input
                  id="contatoNome"
                  placeholder="Digite o nome"
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contatoTelefone">Telefone *</Label>
                <Input
                  id="contatoTelefone"
                  placeholder="Ex: 5511999999999"
                  value={newTelefone}
                  onChange={(e) => setNewTelefone(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setAddContatoModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={handleAddContato}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Adicionar"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Contato Modal */}
        <Dialog open={editContatoModalOpen} onOpenChange={setEditContatoModalOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-primary flex items-center gap-2">
                <Pencil className="w-5 h-5" />
                Editar Contato
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="editNome">Nome *</Label>
                <Input
                  id="editNome"
                  placeholder="Digite o nome"
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editTelefone">Telefone *</Label>
                <Input
                  id="editTelefone"
                  placeholder="Ex: 5511999999999"
                  value={newTelefone}
                  onChange={(e) => setNewTelefone(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditContatoModalOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={handleEditContato}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Import CSV Modal */}
        <Dialog open={importCsvModalOpen} onOpenChange={setImportCsvModalOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-primary flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Importar CSV/Excel
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                O arquivo deve conter colunas com os nomes: nome (ou Name) e telefone (ou Phone)
              </p>
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                  selectedFile 
                    ? "border-primary bg-primary/5" 
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => document.getElementById("csvInput")?.click()}
              >
                <input
                  type="file"
                  id="csvInput"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <Upload className="w-10 h-10 mx-auto mb-3 text-primary" />
                {selectedFile ? (
                  <p className="text-primary font-medium">{selectedFile.name}</p>
                ) : (
                  <p className="text-muted-foreground">
                    Clique para selecionar ou arraste o arquivo
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setImportCsvModalOpen(false);
                    setSelectedFile(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={handleImportCsv}
                  disabled={!selectedFile || saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    "Importar"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Import WhatsApp Modal */}
        <Dialog open={importWhatsAppModalOpen} onOpenChange={setImportWhatsAppModalOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-primary flex items-center gap-2">
                <WhatsAppIcon className="w-5 h-5" />
                Importar do WhatsApp
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">
                Selecione uma conexão para importar {lista?.tipo === "contatos" ? "os contatos" : "os grupos"}
              </p>
              <div className="space-y-2">
                <Label>Conexão</Label>
                <Select value={selectedConexao} onValueChange={setSelectedConexao}>
                  <SelectTrigger className="bg-background/50">
                    <SelectValue placeholder="Selecione uma conexão" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {conexoes.map((conexao) => (
                      <SelectItem key={conexao.id} value={conexao.id.toString()}>
                        {conexao.NomeConexao || conexao.Telefone || `Conexão ${conexao.id}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {conexoes.length === 0 && (
                <p className="text-sm text-yellow-500">
                  Nenhuma conexão encontrada. Conecte seu WhatsApp primeiro.
                </p>
              )}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setImportWhatsAppModalOpen(false);
                    setSelectedConexao("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={handleImportWhatsApp}
                  disabled={!selectedConexao || importingWhatsApp}
                >
                  {importingWhatsApp ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    "Importar"
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
                Excluir {lista?.tipo === "contatos" ? "Contato" : "Grupo"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir{" "}
                {lista?.tipo === "contatos" 
                  ? `o contato "${selectedContato?.nome}"` 
                  : `o grupo "${selectedGrupo?.nome}"`}?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
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

export default ListaDetalhesPage;
