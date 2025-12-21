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
import { useExtractionHistory } from "@/hooks/useExtractionHistory";

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
  const { history: localExtractions, getResults } = useExtractionHistory();
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
  const [existingListas, setExistingListas] = useState<any[]>([]);
  const [existingGrupos, setExistingGrupos] = useState<any[]>([]);
  const [existingBatePapo, setExistingBatePapo] = useState<any[]>([]);
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [selectedListaIds, setSelectedListaIds] = useState<number[]>([]);
  const [selectedGrupoListaIds, setSelectedGrupoListaIds] = useState<number[]>([]);
  const [selectedBatePapoIds, setSelectedBatePapoIds] = useState<number[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [importingExtraction, setImportingExtraction] = useState(false);
  const [newExtractionListName, setNewExtractionListName] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [platformFilter, setPlatformFilter] = useState("");

  // WhatsApp validation states
  const [validateWhatsApp, setValidateWhatsApp] = useState(false);
  const [validateWhatsAppExtraction, setValidateWhatsAppExtraction] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>("");
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [excelImportModalOpen, setExcelImportModalOpen] = useState(false);
  const [pendingExcelFile, setPendingExcelFile] = useState<File | null>(null);
  const [excelListName, setExcelListName] = useState("");
  const [importSource, setImportSource] = useState<'extractions' | 'lists' | 'groups' | 'batepapo'>('extractions');

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

  // Handle new list Excel upload - open modal for options
  const handleNewListExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) {
      if (newListUploadRef.current) newListUploadRef.current.value = '';
      return;
    }
    
    // Store the file and open modal for options
    setPendingExcelFile(file);
    setExcelListName(file.name.replace(/\.(xlsx|xls|csv)$/i, '').replace(/_/g, ' '));
    setValidateWhatsApp(false);
    setSelectedConnectionId("");
    fetchConnections();
    setExcelImportModalOpen(true);
    if (newListUploadRef.current) newListUploadRef.current.value = '';
  };

  // Process Excel import with options
  const processExcelImport = async () => {
    if (!pendingExcelFile || !user?.id) return;
    
    if (validateWhatsApp && !selectedConnectionId) {
      toast.error('Selecione uma conexão para validar WhatsApp');
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

          const listName = excelListName.trim() || pendingExcelFile.name.replace(/\.(xlsx|xls|csv)$/i, '').replace(/_/g, ' ');

          // Create list first
          const { data: listResult, error: listError } = await supabase.functions.invoke("disparos-api", {
            body: {
              action: "create-lista",
              userId: user.id,
              disparoData: {
                nome: listName,
                tipo: 'contacts',
                descricao: `Importado de ${pendingExcelFile.name}`,
              },
            },
          });

          if (listError) throw listError;
          
          const newListId = listResult?.lista?.id;
          if (!newListId) throw new Error('Erro ao criar lista');

          // Import contacts with optional WhatsApp validation
          const { data: importResult, error: importError } = await supabase.functions.invoke('disparos-api', {
            body: {
              action: 'import-contatos',
              userId: user.id,
              disparoData: {
                idLista: newListId,
                contatos: contacts,
                validateWhatsApp: validateWhatsApp,
                connectionId: validateWhatsApp ? parseInt(selectedConnectionId) : undefined
              }
            }
          });

          if (importError) throw importError;

          const imported = importResult?.imported || 0;
          const duplicates = importResult?.duplicates || 0;
          const invalid = importResult?.invalid || 0;
          
          let message = `Lista "${listName}" criada com ${imported} contatos`;
          if (duplicates > 0) message += `, ${duplicates} duplicados`;
          if (invalid > 0) message += `, ${invalid} inválidos`;
          
          toast.success(message);
          setExcelImportModalOpen(false);
          setPendingExcelFile(null);
          setExcelListName("");
          setValidateWhatsApp(false);
          setSelectedConnectionId("");
          fetchListas();
          
        } catch (error: any) {
          console.error('Error processing file:', error);
          toast.error(error.message || 'Erro ao processar arquivo');
        } finally {
          setSaving(false);
        }
      };

      reader.onerror = () => {
        toast.error('Erro ao ler arquivo');
        setSaving(false);
      };

      reader.readAsBinaryString(pendingExcelFile);
      
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error('Erro ao fazer upload do arquivo');
      setSaving(false);
    }
  };

  // Fetch connections for WhatsApp validation
  const fetchConnections = async () => {
    if (!user?.id) return;
    
    setLoadingConnections(true);
    try {
      const { data, error } = await supabase.functions.invoke("disparos-api", {
        body: { action: "get-connections", userId: user.id },
      });

      if (error) throw error;
      setConnections(data?.connections || []);
    } catch (error) {
      console.error('Error fetching connections:', error);
    } finally {
      setLoadingConnections(false);
    }
  };

  // Fetch search jobs and existing lists for extraction import
  const fetchAllSources = async () => {
    if (!user?.id) return;
    
    setLoadingJobs(true);
    try {
      // Fetch search jobs from database (extractions from Google Places, etc.)
      const { data: jobsData, error: jobsError } = await supabase
        .from('search_jobs')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      
      if (jobsError) throw jobsError;
      const dbJobs = jobsData || [];
      
      // Convert localStorage extractions to same format as search_jobs
      const localJobs = localExtractions.map(record => ({
        id: record.id,
        query: record.segment,
        location: record.location || '',
        status: 'completed',
        total_found: record.totalResults,
        created_at: record.createdAt,
        results: getResults(record.id) || [],
        source: 'local', // Mark as coming from localStorage
        type: record.type,
        phonesFound: record.phonesFound,
        emailsFound: record.emailsFound
      }));
      
      // Combine all extractions (avoid duplicates by id)
      const dbJobIds = new Set(dbJobs.map((j: any) => j.id));
      const combinedJobs = [
        ...dbJobs,
        ...localJobs.filter(j => !dbJobIds.has(j.id))
      ];
      
      setSearchJobs(combinedJobs);
      
      // Don't auto-select - let user choose manually
      setSelectedJobIds([]);
      
      // Fetch existing lists with contact/group counts
      const { data: listasResult, error: listasError } = await supabase.functions.invoke("disparos-api", {
        body: { action: "get-listas", userId: user.id },
      });
      
      if (listasError) throw listasError;
      
      // Filter contact lists with items
      const contactLists = (listasResult?.listas || []).filter(
        (l: any) => (l.tipo === 'contacts' || l.tipo === 'contatos') && (l._count || 0) > 0
      );
      setExistingListas(contactLists);
      
      // Don't auto-select - let user choose manually
      setSelectedListaIds([]);
      
      // Filter group lists with items
      const groupLists = (listasResult?.listas || []).filter(
        (l: any) => (l.tipo === 'groups' || l.tipo === 'grupos') && (l._count || 0) > 0
      );
      setExistingGrupos(groupLists);
      
      // Don't auto-select - let user choose manually
      setSelectedGrupoListaIds([]);
      
      // Filter bate-papo lists with items
      const batePapoLists = (listasResult?.listas || []).filter(
        (l: any) => (l.tipo === 'bate-papo' || l.tipo === 'batepapo' || l.tipo === 'chat') && (l._count || 0) > 0
      );
      setExistingBatePapo(batePapoLists);
      
      // Don't auto-select - let user choose manually
      setSelectedBatePapoIds([]);
      
    } catch (error) {
      console.error('Error fetching sources:', error);
      toast.error('Erro ao carregar fontes');
    } finally {
      setLoadingJobs(false);
    }
  };

  // Import from extraction or existing list
  const handleImportFromSource = async () => {
    if (!user?.id) return;
    
    const hasExtractions = selectedJobIds.length > 0;
    const hasLists = selectedListaIds.length > 0;
    const hasGroups = selectedGrupoListaIds.length > 0;
    const hasBatePapo = selectedBatePapoIds.length > 0;
    
    if (!hasExtractions && !hasLists && !hasGroups && !hasBatePapo) {
      toast.error('Selecione pelo menos uma fonte');
      return;
    }

    if (!newExtractionListName.trim()) {
      toast.error('Digite um nome para a lista');
      return;
    }

    if (validateWhatsAppExtraction && !selectedConnectionId) {
      toast.error('Selecione uma conexão para validar WhatsApp');
      return;
    }

    setImportingExtraction(true);
    try {
      const allContacts: { nome: string; telefone: string }[] = [];
      
      // Collect contacts from selected search jobs (extractions)
      for (const jobId of selectedJobIds) {
        const job = searchJobs.find(j => j.id === jobId);
        if (!job) continue;
        
        // Get results - either from job object or fetch from localStorage
        let results = job.results;
        if (job.source === 'local' && (!results || results.length === 0)) {
          results = getResults(jobId) || [];
        }
        
        if (results && Array.isArray(results)) {
          results.forEach((place: any) => {
            const phone = place.phone || place.telefone;
            if (phone) {
              let telefone = phone.replace(/\D/g, '');
              if (telefone.length === 10 || telefone.length === 11) {
                telefone = '55' + telefone;
              }
              if (telefone) {
                allContacts.push({
                  nome: place.name || place.nome || '',
                  telefone
                });
              }
            }
          });
        }
      }
      
      // Collect contacts from selected existing contact lists
      for (const listaId of selectedListaIds) {
        const { data: contatos, error: contatosError } = await supabase
          .from('SAAS_Contatos')
          .select('nome, telefone')
          .eq('idLista', listaId);
        
        if (contatosError) throw contatosError;
        
        (contatos || []).forEach((c: any) => {
          if (c.telefone) {
            let telefone = c.telefone.replace(/\D/g, '');
            if (telefone.length === 10 || telefone.length === 11) {
              telefone = '55' + telefone;
            }
            if (telefone) {
              allContacts.push({
                nome: c.nome || '',
                telefone
              });
            }
          }
        });
      }
      
      // Collect contacts from selected group lists (extracting participant phones if available)
      for (const listaId of selectedGrupoListaIds) {
        const { data: grupos, error: gruposError } = await supabase
          .from('SAAS_Grupos')
          .select('nome, WhatsAppId, atributos')
          .eq('idLista', listaId);
        
        if (gruposError) throw gruposError;
        
        (grupos || []).forEach((g: any) => {
          // Try to extract phone from WhatsAppId (format: 5511999999999@g.us or similar)
          if (g.WhatsAppId) {
            const match = g.WhatsAppId.match(/^(\d+)@/);
            if (match && match[1]) {
              let telefone = match[1];
              if (telefone.length === 10 || telefone.length === 11) {
                telefone = '55' + telefone;
              }
              allContacts.push({
                nome: g.nome || '',
                telefone
              });
            }
          }
          // Also check atributos for participant data
          if (g.atributos && typeof g.atributos === 'object') {
            const attrs = g.atributos as Record<string, any>;
            if (attrs.participants && Array.isArray(attrs.participants)) {
              attrs.participants.forEach((p: any) => {
                if (p.id) {
                  const pMatch = p.id.match(/^(\d+)@/);
                  if (pMatch && pMatch[1]) {
                    let telefone = pMatch[1];
                    if (telefone.length === 10 || telefone.length === 11) {
                      telefone = '55' + telefone;
                    }
                    allContacts.push({
                      nome: p.name || p.pushname || '',
                      telefone
                    });
                  }
                }
              });
            }
          }
        });
      }
      
      // Collect contacts from selected bate-papo lists
      for (const listaId of selectedBatePapoIds) {
        const { data: contatos, error: contatosError } = await supabase
          .from('SAAS_Contatos')
          .select('nome, telefone')
          .eq('idLista', listaId);
        
        if (contatosError) throw contatosError;
        
        (contatos || []).forEach((c: any) => {
          if (c.telefone) {
            let telefone = c.telefone.replace(/\D/g, '');
            if (telefone.length === 10 || telefone.length === 11) {
              telefone = '55' + telefone;
            }
            if (telefone) {
              allContacts.push({
                nome: c.nome || '',
                telefone
              });
            }
          }
        });
      }

      if (allContacts.length === 0) {
        toast.error('Nenhum contato encontrado nas fontes selecionadas');
        setImportingExtraction(false);
        return;
      }

      // Create list
      const sourcesCount = selectedJobIds.length + selectedListaIds.length + selectedGrupoListaIds.length + selectedBatePapoIds.length;
      const { data: listResult, error: listError } = await supabase.functions.invoke("disparos-api", {
        body: {
          action: "create-lista",
          userId: user.id,
          disparoData: {
            nome: newExtractionListName.trim(),
            tipo: 'contacts',
            descricao: `Importado de ${sourcesCount} fonte(s)`,
          },
        },
      });

      if (listError) throw listError;
      
      const newListId = listResult?.lista?.id;
      if (!newListId) throw new Error('Erro ao criar lista');

      // Import contacts with optional WhatsApp validation
      const { data: importResult, error: importError } = await supabase.functions.invoke('disparos-api', {
        body: {
          action: 'import-contatos',
          userId: user.id,
          disparoData: {
            idLista: newListId,
            contatos: allContacts,
            validateWhatsApp: validateWhatsAppExtraction,
            connectionId: validateWhatsAppExtraction ? parseInt(selectedConnectionId) : undefined
          }
        }
      });

      if (importError) throw importError;

      const imported = importResult?.imported || 0;
      const duplicates = importResult?.duplicates || 0;
      const invalid = importResult?.invalid || 0;
      
      let message = `Lista "${newExtractionListName}" criada com ${imported} contatos`;
      if (duplicates > 0) message += `, ${duplicates} duplicados`;
      if (invalid > 0) message += `, ${invalid} inválidos`;
      
      toast.success(message);
      setExtractionModalOpen(false);
      setSelectedJobIds([]);
      setSelectedListaIds([]);
      setSelectedGrupoListaIds([]);
      setSelectedBatePapoIds([]);
      setNewExtractionListName('');
      setValidateWhatsAppExtraction(false);
      setSelectedConnectionId("");
      setImportSource('extractions');
      fetchListas();
      
    } catch (error: any) {
      console.error('Error importing:', error);
      toast.error(error.message || 'Erro ao importar');
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
                <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90" disabled={saving}>
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
                    fetchAllSources();
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

        {/* Excel Import Modal */}
        <Dialog open={excelImportModalOpen} onOpenChange={(open) => {
          setExcelImportModalOpen(open);
          if (!open) {
            setPendingExcelFile(null);
            setExcelListName("");
            setValidateWhatsApp(false);
            setSelectedConnectionId("");
          }
        }}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-primary flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                Importar Excel
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Configure as opções de importação para o arquivo: {pendingExcelFile?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome da Lista *</Label>
                <Input
                  placeholder="Digite o nome da lista"
                  value={excelListName}
                  onChange={(e) => setExcelListName(e.target.value)}
                  className="bg-background/50"
                />
              </div>
              
              <div className="flex items-center space-x-2 py-2">
                <Checkbox
                  id="validateWhatsApp"
                  checked={validateWhatsApp}
                  onCheckedChange={(checked) => setValidateWhatsApp(checked === true)}
                />
                <label
                  htmlFor="validateWhatsApp"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Validar números no WhatsApp antes de importar
                </label>
              </div>
              
              {validateWhatsApp && (
                <div className="space-y-2">
                  <Label>Conexão para Validação *</Label>
                  {loadingConnections ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando conexões...
                    </div>
                  ) : connections.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma conexão disponível</p>
                  ) : (
                    <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="Selecione uma conexão" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {connections.map((conn) => (
                          <SelectItem key={conn.id} value={conn.id.toString()}>
                            {conn.NomeConexao || conn.Telefone || `Conexão ${conn.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    A validação pode demorar mais tempo dependendo da quantidade de contatos
                  </p>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setExcelImportModalOpen(false);
                    setPendingExcelFile(null);
                    setExcelListName("");
                    setValidateWhatsApp(false);
                    setSelectedConnectionId("");
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={processExcelImport}
                  disabled={saving || !excelListName.trim() || (validateWhatsApp && !selectedConnectionId)}
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

        {/* Import from Extraction/Lists Modal */}
        <Dialog open={extractionModalOpen} onOpenChange={(open) => {
          setExtractionModalOpen(open);
          if (!open) {
            setSelectedJobIds([]);
            setSelectedListaIds([]);
            setNewExtractionListName('');
            setValidateWhatsAppExtraction(false);
            setSelectedConnectionId("");
            setImportSource('extractions');
            setLocationFilter("");
            setPlatformFilter("");
          }
        }}>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-primary flex items-center gap-2">
                <Database className="w-5 h-5" />
                Importar Contatos
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Selecione extrações ou listas existentes para criar uma nova lista
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
              
              {/* Tabs for source selection */}
              <div className="flex gap-2 border-b border-border overflow-x-auto">
                <button
                  onClick={() => setImportSource('extractions')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    importSource === 'extractions' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Extrações ({searchJobs.length})
                </button>
                <button
                  onClick={() => setImportSource('lists')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    importSource === 'lists' 
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Listas de Contatos ({existingListas.length})
                </button>
              </div>
              
              {loadingJobs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : importSource === 'extractions' ? (
                <div className="space-y-2">
                  {/* Filters */}
                  {searchJobs.length > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      {/* Platform Filter */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Plataforma</Label>
                        <Select 
                          value={platformFilter || "all"} 
                          onValueChange={(value) => {
                            setPlatformFilter(value === "all" ? "" : value);
                          }}
                        >
                          <SelectTrigger className="bg-background/50">
                            <SelectValue placeholder="Todas as plataformas" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="all">Todas as plataformas</SelectItem>
                            <SelectItem value="places">Google Places</SelectItem>
                            <SelectItem value="whatsapp-groups">WhatsApp</SelectItem>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="linkedin">LinkedIn</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      {/* Location Filter */}
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Localidade</Label>
                        <Select 
                          value={locationFilter || "all"} 
                          onValueChange={(value) => {
                            setLocationFilter(value === "all" ? "" : value);
                          }}
                        >
                          <SelectTrigger className="bg-background/50">
                            <SelectValue placeholder="Todas as localidades" />
                          </SelectTrigger>
                          <SelectContent className="bg-card border-border">
                            <SelectItem value="all">Todas as localidades</SelectItem>
                            {[...new Set(searchJobs.map(j => j.location).filter(Boolean))].map((location) => (
                              <SelectItem key={location} value={location}>
                                {location}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  
                  {searchJobs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma extração encontrada
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                      {searchJobs
                        .filter(job => {
                          // Platform filter
                          if (platformFilter) {
                            const jobType = job.source === 'local' ? job.type : 'places';
                            if (jobType !== platformFilter) return false;
                          }
                          // Location filter
                          if (locationFilter && !(job.location || '').toLowerCase().includes(locationFilter.toLowerCase())) {
                            return false;
                          }
                          return true;
                        })
                        .map((job) => {
                          const resultsCount = job.total_found || (Array.isArray(job.results) ? job.results.length : 0);
                          const phonesCount = job.phonesFound ?? (Array.isArray(job.results) 
                            ? job.results.filter((r: any) => r.phone).length 
                            : 0);
                          const sourceLabel = job.source === 'local' 
                            ? (job.type === 'whatsapp-groups' ? 'WhatsApp' : job.type === 'places' ? 'Google Places' : job.type === 'instagram' ? 'Instagram' : job.type === 'linkedin' ? 'LinkedIn' : job.type || 'Local')
                            : 'Google Places';
                          
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
                                <p className="font-medium truncate">
                                  {job.query}
                                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                    {sourceLabel}
                                  </span>
                                </p>
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
              ) : importSource === 'lists' ? (
                <div className="space-y-2">
                  {existingListas.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma lista com contatos encontrada
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                      {existingListas.map((lista) => (
                        <div 
                          key={lista.id} 
                          className="flex items-center gap-3 p-3 border-b border-border last:border-0 hover:bg-muted/30"
                        >
                          <Checkbox
                            checked={selectedListaIds.includes(lista.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedListaIds([...selectedListaIds, lista.id]);
                              } else {
                                setSelectedListaIds(selectedListaIds.filter(id => id !== lista.id));
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{lista.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {lista._count || 0} contatos
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(lista.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : importSource === 'groups' ? (
                <div className="space-y-2">
                  {existingGrupos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma lista de grupos encontrada
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                      {existingGrupos.map((lista) => (
                        <div 
                          key={lista.id} 
                          className="flex items-center gap-3 p-3 border-b border-border last:border-0 hover:bg-muted/30"
                        >
                          <Checkbox
                            checked={selectedGrupoListaIds.includes(lista.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedGrupoListaIds([...selectedGrupoListaIds, lista.id]);
                              } else {
                                setSelectedGrupoListaIds(selectedGrupoListaIds.filter(id => id !== lista.id));
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{lista.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {lista._count || 0} grupos
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(lista.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : importSource === 'batepapo' ? (
                <div className="space-y-2">
                  {existingBatePapo.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma lista de bate-papo encontrada
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                      {existingBatePapo.map((lista) => (
                        <div 
                          key={lista.id} 
                          className="flex items-center gap-3 p-3 border-b border-border last:border-0 hover:bg-muted/30"
                        >
                          <Checkbox
                            checked={selectedBatePapoIds.includes(lista.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedBatePapoIds([...selectedBatePapoIds, lista.id]);
                              } else {
                                setSelectedBatePapoIds(selectedBatePapoIds.filter(id => id !== lista.id));
                              }
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{lista.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {lista._count || 0} contatos
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(lista.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
              
              {/* Selection summary */}
              {(selectedJobIds.length > 0 || selectedListaIds.length > 0 || selectedGrupoListaIds.length > 0 || selectedBatePapoIds.length > 0) && (
                <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                  Selecionado: {selectedJobIds.length} extração(ões), {selectedListaIds.length} lista(s) de contatos, {selectedGrupoListaIds.length} lista(s) de grupos, {selectedBatePapoIds.length} bate-papo
                </div>
              )}
              
              <div className="flex items-center space-x-2 py-2">
                <Checkbox
                  id="validateWhatsAppExtraction"
                  checked={validateWhatsAppExtraction}
                  onCheckedChange={(checked) => {
                    setValidateWhatsAppExtraction(checked === true);
                    if (checked && connections.length === 0) {
                      fetchConnections();
                    }
                  }}
                />
                <label
                  htmlFor="validateWhatsAppExtraction"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Validar números no WhatsApp antes de importar
                </label>
              </div>
              
              {validateWhatsAppExtraction && (
                <div className="space-y-2">
                  <Label>Conexão para Validação *</Label>
                  {loadingConnections ? (
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Carregando conexões...
                    </div>
                  ) : connections.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhuma conexão disponível</p>
                  ) : (
                    <Select value={selectedConnectionId} onValueChange={setSelectedConnectionId}>
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="Selecione uma conexão" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {connections.map((conn) => (
                          <SelectItem key={conn.id} value={conn.id.toString()}>
                            {conn.NomeConexao || conn.Telefone || `Conexão ${conn.id}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    A validação pode demorar mais tempo dependendo da quantidade de contatos
                  </p>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setExtractionModalOpen(false);
                    setSelectedJobIds([]);
                    setSelectedListaIds([]);
                    setSelectedGrupoListaIds([]);
                    setSelectedBatePapoIds([]);
                    setNewExtractionListName('');
                    setValidateWhatsAppExtraction(false);
                    setSelectedConnectionId("");
                    setImportSource('extractions');
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={handleImportFromSource}
                  disabled={importingExtraction || (selectedJobIds.length === 0 && selectedListaIds.length === 0 && selectedGrupoListaIds.length === 0 && selectedBatePapoIds.length === 0) || !newExtractionListName.trim() || (validateWhatsAppExtraction && !selectedConnectionId)}
                >
                  {importingExtraction ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importando...
                    </>
                  ) : (
                    `Importar (${selectedJobIds.length + selectedListaIds.length + selectedGrupoListaIds.length + selectedBatePapoIds.length})`
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
