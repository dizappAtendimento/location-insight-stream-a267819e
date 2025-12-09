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


  // Create a new search job
  const createJob = useCallback(async (
    query: string, 
    location?: string, 
    maxResults: number = 1000
  ) => {
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

  // Get country code from location string
  const getCountryCodeFromLocation = (location: string | null): { code: string; dialCode: string } => {
    if (!location) return { code: 'BR', dialCode: '55' };
    
    const loc = location.toLowerCase().trim();
    
    // USA patterns
    const usaPatterns = [
      'usa', 'united states', 'estados unidos', 'eua', 'america',
      'new york', 'california', 'texas', 'florida', 'illinois', 'pennsylvania',
      'ohio', 'georgia', 'north carolina', 'michigan', 'new jersey', 'virginia',
      'washington', 'arizona', 'massachusetts', 'tennessee', 'indiana', 'missouri',
      'maryland', 'wisconsin', 'colorado', 'minnesota', 'south carolina', 'alabama',
      'louisiana', 'kentucky', 'oregon', 'oklahoma', 'connecticut', 'utah', 'iowa',
      'nevada', 'arkansas', 'mississippi', 'kansas', 'new mexico', 'nebraska',
      'idaho', 'hawaii', 'maine', 'montana', 'delaware', 'south dakota',
      'north dakota', 'alaska', 'vermont', 'wyoming', 'west virginia', 'rhode island',
      'los angeles', 'chicago', 'houston', 'phoenix', 'philadelphia', 'san antonio',
      'san diego', 'dallas', 'san jose', 'austin', 'jacksonville', 'fort worth',
      'columbus', 'charlotte', 'indianapolis', 'seattle', 'denver', 'boston',
      'el paso', 'nashville', 'detroit', 'portland', 'memphis', 'oklahoma city',
      'las vegas', 'louisville', 'baltimore', 'milwaukee', 'albuquerque', 'tucson',
      'fresno', 'sacramento', 'mesa', 'atlanta', 'kansas city', 'colorado springs',
      'miami', 'raleigh', 'omaha', 'long beach', 'virginia beach', 'oakland',
      'minneapolis', 'tulsa', 'tampa', 'arlington', 'new orleans'
    ];
    
    // Canada patterns
    const canadaPatterns = [
      'canada', 'canadá', 'toronto', 'vancouver', 'montreal', 'calgary', 'edmonton',
      'ottawa', 'winnipeg', 'quebec', 'ontario', 'british columbia', 'alberta'
    ];
    
    // UK patterns
    const ukPatterns = [
      'uk', 'united kingdom', 'reino unido', 'england', 'inglaterra', 'london',
      'londres', 'scotland', 'wales', 'manchester', 'birmingham', 'liverpool'
    ];
    
    // Portugal patterns
    const portugalPatterns = [
      'portugal', 'lisboa', 'lisbon', 'porto', 'oporto', 'algarve', 'braga', 'coimbra'
    ];
    
    // Spain patterns
    const spainPatterns = [
      'spain', 'españa', 'espanha', 'madrid', 'barcelona', 'valencia', 'seville',
      'sevilla', 'bilbao', 'malaga', 'zaragoza'
    ];
    
    // Germany patterns
    const germanyPatterns = [
      'germany', 'alemania', 'alemanha', 'deutschland', 'berlin', 'munich', 'munique',
      'frankfurt', 'hamburg', 'cologne', 'koln'
    ];
    
    // France patterns
    const francePatterns = [
      'france', 'frança', 'francia', 'paris', 'lyon', 'marseille', 'toulouse', 'nice'
    ];
    
    // Italy patterns  
    const italyPatterns = [
      'italy', 'italia', 'itália', 'rome', 'roma', 'milan', 'milano', 'naples',
      'napoli', 'turin', 'torino', 'florence', 'firenze', 'venice', 'venezia'
    ];
    
    // Argentina patterns
    const argentinaPatterns = [
      'argentina', 'buenos aires', 'cordoba', 'rosario', 'mendoza'
    ];
    
    // Mexico patterns
    const mexicoPatterns = [
      'mexico', 'méxico', 'ciudad de mexico', 'guadalajara', 'monterrey', 'cancun',
      'puebla', 'tijuana'
    ];
    
    // Colombia patterns
    const colombiaPatterns = [
      'colombia', 'colômbia', 'bogota', 'bogotá', 'medellin', 'medellín', 'cali',
      'barranquilla', 'cartagena'
    ];
    
    // Chile patterns
    const chilePatterns = [
      'chile', 'santiago', 'valparaiso', 'concepcion'
    ];
    
    // Peru patterns
    const peruPatterns = [
      'peru', 'perú', 'lima', 'arequipa', 'cusco', 'trujillo'
    ];
    
    for (const pattern of usaPatterns) {
      if (loc.includes(pattern)) return { code: 'US', dialCode: '1' };
    }
    for (const pattern of canadaPatterns) {
      if (loc.includes(pattern)) return { code: 'CA', dialCode: '1' };
    }
    for (const pattern of ukPatterns) {
      if (loc.includes(pattern)) return { code: 'UK', dialCode: '44' };
    }
    for (const pattern of portugalPatterns) {
      if (loc.includes(pattern)) return { code: 'PT', dialCode: '351' };
    }
    for (const pattern of spainPatterns) {
      if (loc.includes(pattern)) return { code: 'ES', dialCode: '34' };
    }
    for (const pattern of germanyPatterns) {
      if (loc.includes(pattern)) return { code: 'DE', dialCode: '49' };
    }
    for (const pattern of francePatterns) {
      if (loc.includes(pattern)) return { code: 'FR', dialCode: '33' };
    }
    for (const pattern of italyPatterns) {
      if (loc.includes(pattern)) return { code: 'IT', dialCode: '39' };
    }
    for (const pattern of argentinaPatterns) {
      if (loc.includes(pattern)) return { code: 'AR', dialCode: '54' };
    }
    for (const pattern of mexicoPatterns) {
      if (loc.includes(pattern)) return { code: 'MX', dialCode: '52' };
    }
    for (const pattern of colombiaPatterns) {
      if (loc.includes(pattern)) return { code: 'CO', dialCode: '57' };
    }
    for (const pattern of chilePatterns) {
      if (loc.includes(pattern)) return { code: 'CL', dialCode: '56' };
    }
    for (const pattern of peruPatterns) {
      if (loc.includes(pattern)) return { code: 'PE', dialCode: '51' };
    }
    
    // Default to Brazil
    return { code: 'BR', dialCode: '55' };
  };

  // Format phone with country code from location
  const formatPhoneWithCountryCode = (phone: string | null, dialCode: string): string => {
    if (!phone) return '';
    const cleanPhone = phone.replace(/\D/g, '');
    
    // If phone already starts with the dial code, return as is
    if (cleanPhone.startsWith(dialCode)) {
      return cleanPhone;
    }
    
    // Add dial code
    return dialCode + cleanPhone;
  };

  const downloadExcel = useCallback((job: SearchJob, onlyWithPhone: boolean = false) => {
    if (!job || job.results.length === 0) return;

    const filteredResults = onlyWithPhone || filterOnlyWithPhone 
      ? job.results.filter(p => p.phone && p.phone.trim() !== '') 
      : job.results;

    if (filteredResults.length === 0) {
      toast({ title: "Aviso", description: "Nenhum resultado com telefone encontrado", variant: "destructive" });
      return;
    }

    // Get country code from job location
    const countryInfo = getCountryCodeFromLocation(job.location);

    // Check if WhatsApp validation was performed
    const hasWhatsAppValidation = filteredResults.some(p => p.hasWhatsApp !== undefined);

    const data = filteredResults.map(place => {
      const baseData: Record<string, string | number> = {
        'Nome': place.name || '',
        'Endereço': place.address || '',
        'Código País': '+' + countryInfo.dialCode,
        'Telefone': formatPhoneWithCountryCode(place.phone, countryInfo.dialCode),
      };

      // Add Validação column right after Telefone if validation was performed
      if (hasWhatsAppValidation) {
        baseData['Validação'] = place.hasWhatsApp ? 'Sim' : 'Não';
      }

      // Continue with other columns
      baseData['Rating'] = place.rating || '';
      baseData['Avaliações'] = place.reviewCount || '';
      baseData['Categoria'] = place.category || '';
      baseData['Website'] = place.website || '';

      return baseData;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Lugares');
    
    const colWidths = [
      { wch: 30 }, // Nome
      { wch: 50 }, // Endereço
      { wch: 12 }, // Código País
      { wch: 18 }, // Telefone
    ];
    
    if (hasWhatsAppValidation) {
      colWidths.push({ wch: 12 }); // Validação
    }
    
    colWidths.push(
      { wch: 8 },  // Rating
      { wch: 12 }, // Avaliações
      { wch: 20 }, // Categoria
      { wch: 40 }, // Website
    );
    
    worksheet['!cols'] = colWidths;

    const suffix = onlyWithPhone || filterOnlyWithPhone ? '_com_telefone' : '';
    XLSX.writeFile(workbook, `lugares_${job.query.replace(/\s+/g, '_')}${suffix}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [filterOnlyWithPhone, toast]);

  return {
    isLoading,
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
  };
}
