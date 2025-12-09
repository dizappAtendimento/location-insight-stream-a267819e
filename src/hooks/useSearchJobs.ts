import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';

export interface Place {
  name: string;
  address: string;
  phone: string | null;
  rating: number | null;
  reviewCount: number | null;
  category: string | null;
  website: string | null;
  cid: string | null;
  position: number;
  hasWhatsApp?: boolean;
}

export interface SearchJob {
  id: string;
  user_id: string | null;
  session_id: string;
  query: string;
  location: string | null;
  max_results: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    currentCity?: string;
    cityIndex?: number;
    totalCities?: number;
    currentResults?: number;
    targetResults?: number;
    percentage?: number;
  };
  results: Place[];
  total_found: number;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

// Generate or get session ID
function getSessionId(): string {
  let sessionId = localStorage.getItem('search_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('search_session_id', sessionId);
  }
  return sessionId;
}

export function useSearchJobs() {
  const [isLoading, setIsLoading] = useState(false);
  const [jobs, setJobs] = useState<SearchJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [filterOnlyWithPhone, setFilterOnlyWithPhone] = useState(false);
  const [isValidatingWhatsApp, setIsValidatingWhatsApp] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const sessionId = getSessionId();

  // Fetch all jobs for this user
  const fetchJobs = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('search_jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedJobs: SearchJob[] = (data || []).map(job => ({
        id: job.id,
        user_id: job.user_id,
        session_id: job.session_id,
        query: job.query,
        location: job.location,
        max_results: job.max_results,
        status: job.status as SearchJob['status'],
        progress: (job.progress as unknown as SearchJob['progress']) || {},
        results: (job.results as unknown as Place[]) || [],
        total_found: job.total_found || 0,
        error_message: job.error_message,
        created_at: job.created_at,
        completed_at: job.completed_at,
      }));
      
      setJobs(transformedJobs);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    }
  }, [user?.id]);

  // Poll for job status
  useEffect(() => {
    if (!user?.id) return;
    
    fetchJobs();
    
    // Poll every 2 seconds
    const interval = setInterval(() => {
      fetchJobs();
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchJobs, user?.id]);

  // Validate WhatsApp numbers
  const validateWhatsAppNumbers = useCallback(async (places: Place[], instanceName: string): Promise<Place[]> => {
    const phonesToValidate = places
      .filter(p => p.phone && p.phone.trim() !== '')
      .map(p => p.phone!.replace(/\D/g, ''));

    if (phonesToValidate.length === 0) return places;

    setIsValidatingWhatsApp(true);
    toast({
      title: "Validando WhatsApp",
      description: `Verificando ${phonesToValidate.length} números...`,
    });

    try {
      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'check-whatsapp',
          instanceName,
          data: { phones: phonesToValidate }
        }
      });

      if (error) throw error;

      // Create a map of phone -> hasWhatsApp
      const whatsAppMap = new Map<string, boolean>();
      if (data?.results) {
        for (const result of data.results) {
          const cleanNumber = (result.number || '').replace(/\D/g, '');
          whatsAppMap.set(cleanNumber, result.exists === true);
        }
      }

      // Update places with WhatsApp info
      const updatedPlaces = places.map(place => {
        if (place.phone) {
          const cleanPhone = place.phone.replace(/\D/g, '');
          const hasWhatsApp = whatsAppMap.get(cleanPhone) || false;
          return { ...place, hasWhatsApp };
        }
        return { ...place, hasWhatsApp: false };
      });

      toast({
        title: "Validação concluída!",
        description: `${data?.withWhatsApp || 0} de ${phonesToValidate.length} têm WhatsApp`,
      });

      return updatedPlaces;
    } catch (error) {
      console.error('Error validating WhatsApp:', error);
      toast({
        title: "Erro na validação",
        description: "Não foi possível validar os números de WhatsApp",
        variant: "destructive",
      });
      return places;
    } finally {
      setIsValidatingWhatsApp(false);
    }
  }, [toast]);

  // Create a new search job
  const createJob = useCallback(async (
    query: string, 
    location?: string, 
    maxResults: number = 1000, 
    onlyWithPhone: boolean = false,
    validateWhatsApp: boolean = false,
    instanceName?: string
  ) => {
    setFilterOnlyWithPhone(onlyWithPhone);
    if (!query.trim()) {
      toast({
        title: "Erro",
        description: "Digite uma busca válida",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para fazer buscas",
        variant: "destructive",
      });
      return;
    }

    // Store WhatsApp validation settings for when job completes
    if (validateWhatsApp && instanceName) {
      localStorage.setItem(`job_validate_${sessionId}`, JSON.stringify({ validateWhatsApp, instanceName }));
    } else {
      localStorage.removeItem(`job_validate_${sessionId}`);
    }

    setIsLoading(true);

    try {
      const response = await fetch('https://egxwzmkdbymxooielidc.supabase.co/functions/v1/search-places', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVneHd6bWtkYnlteG9vaWVsaWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjgzNjcsImV4cCI6MjA3OTkwNDM2N30.XJB9t5brPcRrAmLQ_AJDsxlKEg8yYtgWZks7jgXFrdk`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVneHd6bWtkYnlteG9vaWVsaWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjgzNjcsImV4cCI6MjA3OTkwNDM2N30.XJB9t5brPcRrAmLQ_AJDsxlKEg8yYtgWZks7jgXFrdk',
        },
        body: JSON.stringify({ query, location, maxResults, sessionId, userId: user.id }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setActiveJobId(data.jobId);
      toast({
        title: "Busca iniciada!",
        description: validateWhatsApp 
          ? "A busca está rodando. Após concluída, os números serão validados no WhatsApp."
          : "A busca está rodando em background. Você pode sair da página.",
      });

      // Refresh jobs list
      await fetchJobs();

    } catch (error) {
      console.error('Error creating job:', error);
      toast({
        title: "Erro na busca",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, user?.id, toast, fetchJobs]);

  // Get active/selected job
  const activeJob = jobs.find(j => j.id === activeJobId) || jobs.find(j => j.status === 'running' || j.status === 'pending') || (jobs.length > 0 ? jobs[0] : null);

  // Delete a job
  const deleteJob = useCallback(async (jobId: string) => {
    try {
      const { error } = await supabase
        .from('search_jobs')
        .delete()
        .eq('id', jobId);

      if (error) throw error;
      
      if (activeJobId === jobId) {
        setActiveJobId(null);
      }
      
      await fetchJobs();
      toast({
        title: "Busca removida",
      });
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  }, [activeJobId, fetchJobs, toast]);

  // Download functions
  const downloadCSV = useCallback((job: SearchJob, onlyWithPhone: boolean = false) => {
    if (!job || job.results.length === 0) return;

    const filteredResults = onlyWithPhone || filterOnlyWithPhone 
      ? job.results.filter(p => p.phone && p.phone.trim() !== '') 
      : job.results;

    if (filteredResults.length === 0) {
      toast({ title: "Aviso", description: "Nenhum resultado com telefone encontrado", variant: "destructive" });
      return;
    }

    const headers = ['Nome', 'Endereço', 'Telefone', 'Rating', 'Avaliações', 'Categoria', 'Website'];
    const rows = filteredResults.map(place => [
      place.name || '',
      place.address || '',
      place.phone || '',
      place.rating?.toString() || '',
      place.reviewCount?.toString() || '',
      place.category || '',
      place.website || '',
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const suffix = onlyWithPhone || filterOnlyWithPhone ? '_com_telefone' : '';
    link.download = `lugares_${job.query.replace(/\s+/g, '_')}${suffix}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filterOnlyWithPhone, toast]);

  const downloadJSON = useCallback((job: SearchJob, onlyWithPhone: boolean = false) => {
    if (!job || job.results.length === 0) return;

    const filteredResults = onlyWithPhone || filterOnlyWithPhone 
      ? job.results.filter(p => p.phone && p.phone.trim() !== '') 
      : job.results;

    if (filteredResults.length === 0) {
      toast({ title: "Aviso", description: "Nenhum resultado com telefone encontrado", variant: "destructive" });
      return;
    }

    const jsonContent = JSON.stringify(filteredResults, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const suffix = onlyWithPhone || filterOnlyWithPhone ? '_com_telefone' : '';
    link.download = `lugares_${job.query.replace(/\s+/g, '_')}${suffix}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filterOnlyWithPhone, toast]);

  const downloadExcel = useCallback((job: SearchJob, onlyWithPhone: boolean = false) => {
    if (!job || job.results.length === 0) return;

    const filteredResults = onlyWithPhone || filterOnlyWithPhone 
      ? job.results.filter(p => p.phone && p.phone.trim() !== '') 
      : job.results;

    if (filteredResults.length === 0) {
      toast({ title: "Aviso", description: "Nenhum resultado com telefone encontrado", variant: "destructive" });
      return;
    }

    const data = filteredResults.map(place => ({
      'Nome': place.name || '',
      'Endereço': place.address || '',
      'Telefone': place.phone || '',
      'Rating': place.rating || '',
      'Avaliações': place.reviewCount || '',
      'Categoria': place.category || '',
      'Website': place.website || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lugares');
    
    const colWidths = [
      { wch: 30 },
      { wch: 50 },
      { wch: 18 },
      { wch: 8 },
      { wch: 12 },
      { wch: 20 },
      { wch: 40 },
    ];
    worksheet['!cols'] = colWidths;

    const suffix = onlyWithPhone || filterOnlyWithPhone ? '_com_telefone' : '';
    XLSX.writeFile(workbook, `lugares_${job.query.replace(/\s+/g, '_')}${suffix}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [filterOnlyWithPhone, toast]);

  return {
    isLoading,
    isValidatingWhatsApp,
    jobs,
    activeJob,
    activeJobId,
    setActiveJobId,
    filterOnlyWithPhone,
    setFilterOnlyWithPhone,
    createJob,
    deleteJob,
    fetchJobs,
    downloadCSV,
    downloadJSON,
    downloadExcel,
    validateWhatsAppNumbers,
  };
}
