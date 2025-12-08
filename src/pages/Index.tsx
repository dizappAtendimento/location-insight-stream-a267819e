import { SearchForm } from '@/components/SearchForm';
import { PlaceCard } from '@/components/PlaceCard';
import { useSearchPlaces } from '@/hooks/useSearchPlaces';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Search, Download, FileJson, FileSpreadsheet, FileDown, Sparkles } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useExtractionHistory } from '@/hooks/useExtractionHistory';
import { useEffect, useRef } from 'react';

const Index = () => {
  const { isLoading, results, searchPlaces, downloadCSV, downloadJSON, downloadExcel } = useSearchPlaces();
  const { addRecord } = useExtractionHistory();
  const lastResultsRef = useRef<string | null>(null);

  useEffect(() => {
    if (results && results.places.length > 0) {
      const resultId = `${results.searchQuery}-${results.places.length}`;
      if (lastResultsRef.current !== resultId) {
        lastResultsRef.current = resultId;
        addRecord({
          type: 'places',
          segment: results.searchQuery,
          totalResults: results.places.length,
          emailsFound: 0,
          phonesFound: results.places.filter(p => p.phone).length,
        });
      }
    }
  }, [results, addRecord]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="opacity-0 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Google Places Extractor</h1>
              <p className="text-muted-foreground text-sm">Encontre empresas e estabelecimentos</p>
            </div>
          </div>
        </div>

        {/* Search Card */}
        <Card className="opacity-0 animate-fade-in-up overflow-hidden relative" style={{ animationDelay: '100ms' }}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-green-600" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              Buscar Lugares
            </CardTitle>
            <CardDescription>
              Pesquise por tipo de negócio. Deixe localização vazia ou "EUA/Brasil" para buscar em 200+ cidades automaticamente. Até 10.000 resultados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SearchForm onSearch={searchPlaces} isLoading={isLoading} />
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <div className="space-y-4 opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Resultados para "{results.searchQuery}"
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium">
                  {results.places.length} lugares encontrados
                </span>
              </div>
              
              {results.places.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={downloadExcel} className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
                    <FileDown className="w-4 h-4 mr-2" />
                    Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadCSV}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadJSON}>
                    <FileJson className="w-4 h-4 mr-2" />
                    JSON
                  </Button>
                </div>
              )}
            </div>

            {results.places.length > 0 ? (
              <div className="flex flex-col gap-3">
                {results.places.map((place, index) => (
                  <PlaceCard key={place.cid || index} place={place} index={index} />
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-emerald-500/50" />
                  </div>
                  <p className="text-muted-foreground font-medium">Nenhum lugar encontrado</p>
                  <p className="text-muted-foreground/70 text-sm mt-1">Tente buscar com outros termos</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Empty State */}
        {!results && !isLoading && (
          <Card className="text-center py-16 opacity-0 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <CardContent>
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 flex items-center justify-center">
                <Download className="w-10 h-10 text-emerald-500/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Busque e exporte dados</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Pesquise estabelecimentos e baixe os resultados em Excel, CSV ou JSON para usar em outras ferramentas
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Index;