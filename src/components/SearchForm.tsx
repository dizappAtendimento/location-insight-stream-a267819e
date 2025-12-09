import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Loader2 } from 'lucide-react';

interface SearchFormProps {
  onSearch: (query: string, location?: string, maxResults?: number) => void;
  isLoading: boolean;
}

export function SearchForm({ onSearch, isLoading }: SearchFormProps) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [maxResults, setMaxResults] = useState('100');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query, location || undefined, parseInt(maxResults));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="query" className="text-sm font-medium">
            O que você procura?
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="query"
              type="text"
              placeholder="Ex: restaurantes, dentistas..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location" className="text-sm font-medium">
            Localização
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="location"
              type="text"
              placeholder="Ex: São Paulo, SP"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="pl-10"
            />
            <p className="text-[10px] text-muted-foreground mt-1">Deixe vazio ou "EUA/Brasil" para buscar em todas as cidades</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxResults" className="text-sm font-medium">
            Quantidade máxima
          </Label>
          <Select value={maxResults} onValueChange={setMaxResults}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="100">100 resultados</SelectItem>
              <SelectItem value="250">250 resultados</SelectItem>
              <SelectItem value="500">500 resultados</SelectItem>
              <SelectItem value="1000">1000 resultados</SelectItem>
              <SelectItem value="2500">2500 resultados</SelectItem>
              <SelectItem value="5000">5000 resultados</SelectItem>
              <SelectItem value="10000">10000 resultados (máximo)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Buscando lugares...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              Buscar Lugares
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
