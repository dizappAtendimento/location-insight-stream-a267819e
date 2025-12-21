import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  DialogDescription,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Plus, Users, MessageSquare, Pencil, Trash2, List, Search, Loader2, Eye, Download, Upload, FileSpreadsheet, ChevronDown, Database } from "lucide-react";
import * as XLSX from 'xlsx';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRef } from "react";

interface Lista {
  id: number;
  nome: string;
  tipo: string | null;
  descricao: string | null;
  created_at: string;
  idUsuario: string;
  idConexao: number | null;
  campos: any;
  _count?: number;
}

const ListasPage = () => {
  const navigate = useNavigate();
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
  const [listaCounts, setListaCounts] = useState<Record<number, number>>({});
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const newListUploadRef = useRef<HTMLInputElement>(null);
  const [uploadTargetList, setUploadTargetList] = useState<Lista | null>(null);
  const [extractionModalOpen, setExtractionModalOpen] = useState(false);
  const [searchJobs, setSearchJobs] = useState<any[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [importingExtraction, setImportingExtraction] = useState(false);
  const [newExtractionListName, setNewExtractionListName] = useState("");

  const fetchListas = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase.functions.invoke("disparos-api", {
        body: { action: "get-listas", userId: user.id },
      });

      if (error) throw error;
      const listasData = data?.listas || [];
      setListas(listasData);
      
      // Build counts from the _count property returned by API
      const counts: Record<number, number> = {};
      listasData.forEach((lista: Lista) => {
        counts[lista.id] = lista._count || 0;
      });
      setListaCounts(counts);
    } catch (error) {
      console.error("Erro ao buscar listas:", error);
      toast.error("Erro ao carregar listas");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const downloadListaExcel = async (lista: Lista) => {
    setDownloadingId(lista.id);
    try {
      let data: any[] = [];
      
      if (lista.tipo === 'contatos' || lista.tipo === 'contacts') {
        const { data: contatos, error } = await supabase
          .from('SAAS_Contatos')
          .select('*')
          .eq('idLista', lista.id);
        
        if (error) throw error;
        
        data = (contatos || []).map(c => ({
          'Nome': c.nome || '',
          'Telefone': c.telefone || '',
          ...((typeof c.atributos === 'object' && c.atributos) ? c.atributos : {})
        }));
      } else {
        const { data: grupos, error } = await supabase
          .from('SAAS_Grupos')
          .select('*')
          .eq('idLista', lista.id);
        
        if (error) throw error;
        
        data = (grupos || []).map(g => ({
          'Nome do Grupo': g.nome || '',
          'WhatsApp ID': g.WhatsAppId || '',
          'Participantes': g.participantes || 0,
          ...((typeof g.atributos === 'object' && g.atributos) ? g.atributos : {})
        }));
      }

      if (data.length === 0) {
        toast.error('Nenhum item encontrado nesta lista');
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, lista.tipo === 'contatos' ? 'Contatos' : 'Grupos');
      
      XLSX.writeFile(workbook, `${lista.nome.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
      toast.success('Excel baixado com sucesso!');
    } catch (error) {
      console.error('Error downloading excel:', error);
      toast.error('Erro ao baixar Excel');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleUploadClick = (lista: Lista) => {
    if (lista.tipo !== 'contatos' && lista.tipo !== 'contacts') {
      toast.error('Upload só é permitido para listas de contatos');
      return;
    }
    setUploadTargetList(lista);
    uploadInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadTargetList || !user?.id) {
      if (uploadInputRef.current) uploadInputRef.current.value = '';
      return;
    }

    setUploadingId(uploadTargetList.id);
    
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (jsonData.length < 2) {
            toast.error('Arquivo vazio ou sem dados');
            return;
          }

          // Get header row and find nome/telefone columns
          const headers = (jsonData[0] as string[]).map((h: string) => h?.toString()?.toLowerCase()?.trim());
          
          let nomeIdx = headers.findIndex((h: string) => h === 'nome' || h === 'name');
          let telefoneIdx = headers.findIndex((h: string) => 
            h === 'telefone' || h === 'numero' || h === 'número' || h === 'phone' || h === 'celular' || h === 'whatsapp'
          );

          // If no headers found, assume first column is nome, second is telefone
          if (nomeIdx === -1 && telefoneIdx === -1) {
            nomeIdx = 0;
            telefoneIdx = 1;
          } else if (nomeIdx === -1) {
            nomeIdx = telefoneIdx === 0 ? 1 : 0;
          } else if (telefoneIdx === -1) {
            telefoneIdx = nomeIdx === 0 ? 1 : 0;
          }

          const contacts: { nome: string; telefone: string }[] = [];
          
          // Start from row 1 (skip header)
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            const nome = row[nomeIdx]?.toString()?.trim() || '';
            let telefone = row[telefoneIdx]?.toString()?.trim() || '';
            
            // Clean phone number - remove non-digits
            telefone = telefone.replace(/\D/g, '');
            
            // Skip if no phone
            if (!telefone) continue;
            
            // Add country code if needed
            if (telefone.length === 10 || telefone.length === 11) {
              telefone = '55' + telefone;
            }
            
            contacts.push({ nome, telefone });
          }

          if (contacts.length === 0) {
            toast.error('Nenhum contato válido encontrado no arquivo');
            return;
          }

          // Send to API
          const { data: result, error } = await supabase.functions.invoke('disparos-api', {
            body: {
              action: 'import-contatos',
              userId: user.id,
              disparoData: {
                idLista: uploadTargetList.id,
                contatos: contacts
              }
            }
          });

          if (error) throw error;

          const imported = result?.imported || 0;
          const duplicates = result?.duplicates || 0;
          const invalid = result?.invalid || 0;
          
          let message = `${imported} contatos importados`;
          if (duplicates > 0) message += `, ${duplicates} duplicados ignorados`;
          if (invalid > 0) message += `, ${invalid} inválidos`;
          
          toast.success(message);
          fetchListas(); // Refresh to update counts
          
        } catch (error: any) {
          console.error('Error processing file:', error);
          toast.error(error.message || 'Erro ao processar arquivo');
        } finally {
          setUploadingId(null);
          setUploadTargetList(null);
          if (uploadInputRef.current) uploadInputRef.current.value = '';
        }
      };

      reader.onerror = () => {
        toast.error('Erro ao ler arquivo');
        setUploadingId(null);
        setUploadTargetList(null);
        if (uploadInputRef.current) uploadInputRef.current.value = '';
      };

      reader.readAsBinaryString(file);
      
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error('Erro ao fazer upload do arquivo');
      setUploadingId(null);
      setUploadTargetList(null);
      if (uploadInputRef.current) uploadInputRef.current.value = '';
    }
  };

  // Download Excel template
  const downloadExcelTemplate = () => {
    const templateData = [
      { nome: 'João Silva', numero: '5511999999999' },
      { nome: 'Maria Santos', numero: '5521988888888' },
      { nome: 'Pedro Oliveira', numero: '5531977777777' },
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contatos');
    XLSX.writeFile(workbook, 'modelo_importacao_contatos.xlsx');
    toast.success('Modelo baixado com sucesso!');
  };

  // Handle new list Excel upload
  const handleNewListExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) {
      if (newListUploadRef.current) newListUploadRef.current.value = '';
      return;
    }

    setSaving(true);
    
    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (jsonData.length < 2) {
            toast.error('Arquivo vazio ou sem dados');
            setSaving(false);
            return;
          }

          // Get header row and find nome/telefone columns
          const headers = (jsonData[0] as string[]).map((h: string) => h?.toString()?.toLowerCase()?.trim());
          
          let nomeIdx = headers.findIndex((h: string) => h === 'nome' || h === 'name');
          let telefoneIdx = headers.findIndex((h: string) => 
            h === 'telefone' || h === 'numero' || h === 'número' || h === 'phone' || h === 'celular' || h === 'whatsapp'
          );

          if (nomeIdx === -1 && telefoneIdx === -1) {
            nomeIdx = 0;
            telefoneIdx = 1;
          } else if (nomeIdx === -1) {
            nomeIdx = telefoneIdx === 0 ? 1 : 0;
          } else if (telefoneIdx === -1) {
            telefoneIdx = nomeIdx === 0 ? 1 : 0;
          }

          const contacts: { nome: string; telefone: string }[] = [];
          
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row || row.length === 0) continue;
            
            const nome = row[nomeIdx]?.toString()?.trim() || '';
            let telefone = row[telefoneIdx]?.toString()?.trim() || '';
            telefone = telefone.replace(/\D/g, '');
            
            if (!telefone) continue;
            
            if (telefone.length === 10 || telefone.length === 11) {
              telefone = '55' + telefone;
            }
            
            contacts.push({ nome, telefone });
          }

          if (contacts.length === 0) {
            toast.error('Nenhum contato válido encontrado no arquivo');
            setSaving(false);
            return;
          }

          // Create list name from file name
          const listName = file.name.replace(/\.(xlsx|xls|csv)$/i, '').replace(/_/g, ' ');

          // Create list first
          const { data: listResult, error: listError } = await supabase.functions.invoke("disparos-api", {
            body: {
              action: "create-lista",
              userId: user.id,
              disparoData: {
                nome: listName,
                tipo: 'contacts',
                descricao: `Importado de ${file.name}`,
              },
            },
          });

          if (listError) throw listError;
          
          const newListId = listResult?.lista?.id;
          if (!newListId) throw new Error('Erro ao criar lista');

          // Import contacts
          const { data: importResult, error: importError } = await supabase.functions.invoke('disparos-api', {
            body: {
              action: 'import-contatos',
              userId: user.id,
              disparoData: {
                idLista: newListId,
                contatos: contacts
              }
            }
          });

          if (importError) throw importError;

          const imported = importResult?.imported || 0;
          const duplicates = importResult?.duplicates || 0;
          
          let message = `Lista "${listName}" criada com ${imported} contatos`;
          if (duplicates > 0) message += ` (${duplicates} duplicados ignorados)`;
          
          toast.success(message);
          fetchListas();
          
        } catch (error: any) {
          console.error('Error processing file:', error);
          toast.error(error.message || 'Erro ao processar arquivo');
        } finally {
          setSaving(false);
          if (newListUploadRef.current) newListUploadRef.current.value = '';
        }
      };

      reader.onerror = () => {
        toast.error('Erro ao ler arquivo');
        setSaving(false);
        if (newListUploadRef.current) newListUploadRef.current.value = '';
      };

      reader.readAsBinaryString(file);
      
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error('Erro ao fazer upload do arquivo');
      setSaving(false);
      if (newListUploadRef.current) newListUploadRef.current.value = '';
    }
  };

  // Fetch search jobs for extraction import
  const fetchSearchJobs = async () => {
    if (!user?.id) return;
    
    setLoadingJobs(true);
    try {
      const { data, error } = await supabase
        .from('search_jobs')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSearchJobs(data || []);
    } catch (error) {
      console.error('Error fetching search jobs:', error);
      toast.error('Erro ao carregar extrações');
    } finally {
      setLoadingJobs(false);
    }
  };

  // Import from extraction
  const handleImportFromExtraction = async () => {
    if (!user?.id || selectedJobIds.length === 0) {
      toast.error('Selecione pelo menos uma extração');
      return;
    }

    if (!newExtractionListName.trim()) {
      toast.error('Digite um nome para a lista');
      return;
    }

    setImportingExtraction(true);
    try {
      // Collect all contacts from selected jobs
      const allContacts: { nome: string; telefone: string }[] = [];
      
      for (const jobId of selectedJobIds) {
        const job = searchJobs.find(j => j.id === jobId);
        if (job?.results && Array.isArray(job.results)) {
          job.results.forEach((place: any) => {
            if (place.phone) {
              let telefone = place.phone.replace(/\D/g, '');
              if (telefone.length === 10 || telefone.length === 11) {
                telefone = '55' + telefone;
              }
              if (telefone) {
                allContacts.push({
                  nome: place.name || '',
                  telefone
                });
              }
            }
          });
        }
      }

      if (allContacts.length === 0) {
        toast.error('Nenhum contato com telefone encontrado nas extrações selecionadas');
        setImportingExtraction(false);
        return;
      }

      // Create list
      const { data: listResult, error: listError } = await supabase.functions.invoke("disparos-api", {
        body: {
          action: "create-lista",
          userId: user.id,
          disparoData: {
            nome: newExtractionListName.trim(),
            tipo: 'contacts',
            descricao: `Importado de ${selectedJobIds.length} extração(ões)`,
          },
        },
      });

      if (listError) throw listError;
      
      const newListId = listResult?.lista?.id;
      if (!newListId) throw new Error('Erro ao criar lista');

      // Import contacts
      const { data: importResult, error: importError } = await supabase.functions.invoke('disparos-api', {
        body: {
          action: 'import-contatos',
          userId: user.id,
          disparoData: {
            idLista: newListId,
            contatos: allContacts
          }
        }
      });

      if (importError) throw importError;

      const imported = importResult?.imported || 0;
      const duplicates = importResult?.duplicates || 0;
      
      let message = `Lista "${newExtractionListName}" criada com ${imported} contatos`;
      if (duplicates > 0) message += ` (${duplicates} duplicados ignorados)`;
      
      toast.success(message);
      setExtractionModalOpen(false);
      setSelectedJobIds([]);
      setNewExtractionListName('');
      fetchListas();
      
    } catch (error: any) {
      console.error('Error importing from extraction:', error);
      toast.error(error.message || 'Erro ao importar extração');
    } finally {
      setImportingExtraction(false);
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
      const { data, error } = await supabase.functions.invoke("disparos-api", {
        body: {
          action: "create-lista",
          userId: user.id,
          disparoData: {
            nome: newListName.trim(),
            tipo: newListType,
            descricao: newListDescription.trim() || null,
          },
        },
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

    if (!user?.id) return;

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("disparos-api", {
        body: {
          action: "update-lista",
          userId: user.id,
          disparoData: {
            id: selectedLista.id,
            nome: newListName.trim(),
            tipo: newListType,
            descricao: newListDescription.trim() || null,
          },
        },
      });

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
    if (!selectedLista || !user?.id) return;

    try {
      const { data, error } = await supabase.functions.invoke("disparos-api", {
        body: {
          action: "delete-lista",
          userId: user.id,
          disparoData: { id: selectedLista.id },
        },
      });

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
      {/* Hidden file inputs for Excel upload */}
      <input
        type="file"
        ref={uploadInputRef}
        onChange={handleFileUpload}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />
      <input
        type="file"
        ref={newListUploadRef}
        onChange={handleNewListExcelUpload}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />
      
      <div className="p-4 sm:p-5 lg:p-6 space-y-5 lg:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 opacity-0 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <div>
            <h1 className="text-xl sm:text-2xl title-gradient tracking-tight">Listas</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Gerencie suas listas de contatos e grupos</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            
            {/* Dropdown for creating lists */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="gap-2 bg-primary hover:bg-primary/90" disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Criar Lista
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                <DropdownMenuItem onClick={() => setCreateModalOpen(true)} className="gap-2 cursor-pointer">
                  <List className="w-4 h-4" />
                  Lista Vazia
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => newListUploadRef.current?.click()} className="gap-2 cursor-pointer">
                  <FileSpreadsheet className="w-4 h-4" />
                  Importar Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={downloadExcelTemplate} className="gap-2 cursor-pointer text-muted-foreground">
                  <Download className="w-4 h-4" />
                  Baixar Modelo Excel
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => {
                    setExtractionModalOpen(true);
                    fetchSearchJobs();
                  }} 
                  className="gap-2 cursor-pointer"
                >
                  <Database className="w-4 h-4" />
                  Importar de Extração
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Create Empty List Modal */}
        <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-primary flex items-center gap-2">
                <List className="w-5 h-5" />
                Nova Lista
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Crie uma lista vazia para adicionar contatos manualmente
              </DialogDescription>
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

        {/* Import from Extraction Modal */}
        <Dialog open={extractionModalOpen} onOpenChange={setExtractionModalOpen}>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-primary flex items-center gap-2">
                <Database className="w-5 h-5" />
                Importar de Extração
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Selecione as extrações para criar uma nova lista de contatos
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome da Lista *</Label>
                <Input
                  placeholder="Digite o nome da nova lista"
                  value={newExtractionListName}
                  onChange={(e) => setNewExtractionListName(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Selecione as Extrações</Label>
                {loadingJobs ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : searchJobs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhuma extração encontrada
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto border border-border rounded-lg">
                    {searchJobs.map((job) => {
                      const resultsCount = Array.isArray(job.results) ? job.results.length : 0;
                      const phonesCount = Array.isArray(job.results) 
                        ? job.results.filter((r: any) => r.phone).length 
                        : 0;
                      
                      return (
                        <div 
                          key={job.id} 
                          className="flex items-center gap-3 p-3 border-b border-border last:border-0 hover:bg-muted/30"
                        >
                          <Checkbox
                            checked={selectedJobIds.includes(job.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedJobIds([...selectedJobIds, job.id]);
                              } else {
                                setSelectedJobIds(selectedJobIds.filter(id => id !== job.id));
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{job.query}</p>
                            <p className="text-xs text-muted-foreground">
                              {job.location || 'Sem localização'} • {resultsCount} resultados • {phonesCount} com telefone
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(job.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setExtractionModalOpen(false);
                    setSelectedJobIds([]);
                    setNewExtractionListName('');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={handleImportFromExtraction}
                  disabled={importingExtraction || selectedJobIds.length === 0 || !newExtractionListName.trim()}
                >
                  {importingExtraction ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    `Importar ${selectedJobIds.length > 0 ? `(${selectedJobIds.length})` : ''}`
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
                    <TableHead className="text-primary font-semibold text-center">Quantidade</TableHead>
                    <TableHead className="text-primary font-semibold">Data de Criação</TableHead>
                    <TableHead className="text-primary font-semibold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredListas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
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
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center min-w-[50px] px-3 py-1 rounded-lg bg-muted text-foreground font-semibold text-sm">
                            {listaCounts[lista.id] !== undefined ? listaCounts[lista.id] : '...'}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(lista.created_at), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {(lista.tipo === 'contatos' || lista.tipo === 'contacts') && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleUploadClick(lista)}
                                disabled={uploadingId === lista.id}
                                className="hover:text-blue-500 hover:bg-blue-500/10"
                                title="Importar Excel"
                              >
                                {uploadingId === lista.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Upload className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => downloadListaExcel(lista)}
                              disabled={downloadingId === lista.id}
                              className="hover:text-emerald-500 hover:bg-emerald-500/10"
                              title="Baixar Excel"
                            >
                              {downloadingId === lista.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/listas/${lista.id}`)}
                              className="hover:text-primary hover:bg-primary/10"
                              title="Ver detalhes"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditModal(lista)}
                              className="hover:text-primary hover:bg-primary/10"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openDeleteDialog(lista)}
                              className="hover:text-destructive hover:bg-destructive/10"
                              title="Excluir"
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
