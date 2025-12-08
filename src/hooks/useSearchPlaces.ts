import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

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

export interface SearchResult {
  places: Place[];
  searchQuery: string;
  totalFound: number;
}

export interface SearchProgress {
  currentCity: string;
  cityIndex: number;
  totalCities: number;
  currentResults: number;
  targetResults: number;
  percentage: number;
  isActive: boolean;
}

export function useSearchPlaces() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const [progress, setProgress] = useState<SearchProgress | null>(null);
  const [liveResults, setLiveResults] = useState<Place[]>([]);
  const { toast } = useToast();

  const searchPlaces = useCallback(async (query: string, location?: string, maxResults: number = 100) => {
    if (!query.trim()) {
      toast({
        title: "Erro",
        description: "Digite uma busca válida",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResults(null);
    setProgress(null);
    setLiveResults([]);

    try {
      // Always use streaming for progress bar
      const supabaseUrl = 'https://egxwzmkdbymxooielidc.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVneHd6bWtkYnlteG9vaWVsaWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjgzNjcsImV4cCI6MjA3OTkwNDM2N30.XJB9t5brPcRrAmLQ_AJDsxlKEg8yYtgWZks7jgXFrdk';
      
      const response = await fetch(`${supabaseUrl}/functions/v1/search-places`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({ query, location, maxResults, stream: true }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n').filter(Boolean);

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'start') {
                setProgress({
                  currentCity: 'Iniciando...',
                  cityIndex: 0,
                  totalCities: data.totalCities,
                  currentResults: 0,
                  targetResults: maxResults,
                  percentage: 0,
                  isActive: true,
                });
              } else if (data.type === 'progress') {
                setProgress({
                  currentCity: data.currentCity,
                  cityIndex: data.cityIndex,
                  totalCities: data.totalCities,
                  currentResults: data.currentResults,
                  targetResults: data.targetResults,
                  percentage: data.percentage,
                  isActive: true,
                });
              } else if (data.type === 'found') {
                setProgress(prev => prev ? {
                  ...prev,
                  currentResults: data.totalResults,
                } : null);
                // Add new places to live results
                if (data.newPlaces && data.places) {
                  setLiveResults(prev => {
                    const newPlaces = data.places.map((p: any, i: number) => ({
                      ...p,
                      position: prev.length + i + 1,
                    }));
                    return [...prev, ...newPlaces];
                  });
                }
              } else if (data.type === 'complete') {
                setResults({
                  places: data.places,
                  searchQuery: data.searchQuery,
                  totalFound: data.totalFound,
                });
                setProgress(null);
                setLiveResults([]);
                toast({
                  title: "Busca completa!",
                  description: `Encontrados ${data.places?.length || 0} lugares`,
                });
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Erro na busca",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
      setProgress(null);
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const clearResults = () => {
    setResults(null);
    setProgress(null);
    setLiveResults([]);
  };

  const downloadCSV = () => {
    if (!results || results.places.length === 0) return;

    const headers = ['Nome', 'Endereço', 'Telefone', 'Rating', 'Avaliações', 'Categoria', 'Website'];
    const rows = results.places.map(place => [
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
    link.download = `lugares_${results.searchQuery.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSON = () => {
    if (!results || results.places.length === 0) return;

    const jsonContent = JSON.stringify(results.places, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `lugares_${results.searchQuery.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    if (!results || results.places.length === 0) return;

    const data = results.places.map(place => ({
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

    XLSX.writeFile(workbook, `lugares_${results.searchQuery.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return {
    isLoading,
    results,
    progress,
    liveResults,
    searchPlaces,
    clearResults,
    downloadCSV,
    downloadJSON,
    downloadExcel,
  };
}
