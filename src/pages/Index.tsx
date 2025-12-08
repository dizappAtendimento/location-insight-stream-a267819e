import { SearchForm } from '@/components/SearchForm';
import { PlaceCard } from '@/components/PlaceCard';
import { useSearchPlaces } from '@/hooks/useSearchPlaces';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, Search, Download, FileJson, FileSpreadsheet, FileDown } from 'lucide-react';

const Index = () => {
  const { isLoading, results, searchPlaces, downloadCSV, downloadJSON, downloadExcel } = useSearchPlaces();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Buscador de Lugares</h1>
              <p className="text-sm text-muted-foreground">Encontre empresas e estabelecimentos</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Buscar Lugares
            </CardTitle>
            <CardDescription>
              Pesquise por tipo de negócio e localização. Você pode buscar até 1000 resultados por vez.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SearchForm onSearch={searchPlaces} isLoading={isLoading} />
          </CardContent>
        </Card>

        {/* Results */}
        {results && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Resultados para "{results.searchQuery}"
                </h2>
                <span className="text-sm text-muted-foreground">
                  {results.places.length} lugares encontrados
                </span>
              </div>
              
              {results.places.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="default" size="sm" onClick={downloadExcel}>
                    <FileDown className="w-4 h-4 mr-2" />
                    Baixar Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadCSV}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Baixar CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={downloadJSON}>
                    <FileJson className="w-4 h-4 mr-2" />
                    Baixar JSON
                  </Button>
                </div>
              )}
            </div>

            {results.places.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {results.places.map((place, index) => (
                  <PlaceCard key={place.cid || index} place={place} index={index} />
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <MapPin className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">Nenhum lugar encontrado para esta busca</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Empty State */}
        {!results && !isLoading && (
          <Card className="text-center py-16">
            <CardContent>
              <Download className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Busque e exporte dados</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Pesquise estabelecimentos e baixe os resultados em CSV ou JSON para usar em outras ferramentas
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Index;
