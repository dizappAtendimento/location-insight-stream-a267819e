import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
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
}

export interface SearchJob {
  id: string;
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
  const { toast } = useToast();
  const sessionId = getSessionId();

  // Fetch all jobs for this session
  const fetchJobs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('search_jobs')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedJobs: SearchJob[] = (data || []).map(job => ({
        id: job.id,
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
  }, [sessionId]);

  // Poll for job status
  useEffect(() => {
    fetchJobs();
    
    // Poll every 2 seconds if there are running jobs
    const interval = setInterval(() => {
      const hasRunningJobs = jobs.some(j => j.status === 'pending' || j.status === 'running');
      if (hasRunningJobs) {
        fetchJobs();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [fetchJobs, jobs.length]);

  // Create a new search job
  const createJob = useCallback(async (query: string, location?: string, maxResults: number = 1000) => {
    if (!query.trim()) {
      toast({
        title: "Erro",
        description: "Digite uma busca válida",
        variant: "destructive",
      });
      return;
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
        body: JSON.stringify({ query, location, maxResults, sessionId }),
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
        description: "A busca está rodando em background. Você pode sair da página.",
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
  }, [sessionId, toast, fetchJobs]);

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
  const downloadCSV = useCallback((job: SearchJob) => {
    if (!job || job.results.length === 0) return;

    const headers = ['Nome', 'Endereço', 'Telefone', 'Rating', 'Avaliações', 'Categoria', 'Website'];
    const rows = job.results.map(place => [
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
    link.download = `lugares_${job.query.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const downloadJSON = useCallback((job: SearchJob) => {
    if (!job || job.results.length === 0) return;

    const jsonContent = JSON.stringify(job.results, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lugares_${job.query.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  const downloadExcel = useCallback((job: SearchJob) => {
    if (!job || job.results.length === 0) return;

    const data = job.results.map(place => ({
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

    XLSX.writeFile(workbook, `lugares_${job.query.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, []);

  return {
    isLoading,
    jobs,
    activeJob,
    activeJobId,
    setActiveJobId,
    createJob,
    deleteJob,
    fetchJobs,
    downloadCSV,
    downloadJSON,
    downloadExcel,
  };
}
