import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

export function useSearchPlaces() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResult | null>(null);
  const { toast } = useToast();

  const searchPlaces = async (query: string, location?: string, maxResults: number = 100) => {
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

    try {
      const { data, error } = await supabase.functions.invoke('search-places', {
        body: { query, location, maxResults },
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setResults(data);
      toast({
        title: "Sucesso",
        description: `Encontrados ${data.places?.length || 0} lugares`,
      });
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Erro na busca",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults(null);
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
    
    // Auto-size columns
    const colWidths = [
      { wch: 30 }, // Nome
      { wch: 50 }, // Endereço
      { wch: 18 }, // Telefone
      { wch: 8 },  // Rating
      { wch: 12 }, // Avaliações
      { wch: 20 }, // Categoria
      { wch: 40 }, // Website
    ];
    worksheet['!cols'] = colWidths;

    XLSX.writeFile(workbook, `lugares_${results.searchQuery.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  return {
    isLoading,
    results,
    searchPlaces,
    clearResults,
    downloadCSV,
    downloadJSON,
    downloadExcel,
  };
}
