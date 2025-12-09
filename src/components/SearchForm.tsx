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
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="query" className="text-sm font-medium text-foreground/90">
            O que você procura?
          </Label>
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <Input
              id="query"
              type="text"
              placeholder="Ex: restaurantes, dentistas..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 h-11 bg-secondary/50 border-border/50 focus:border-primary/50 focus:bg-secondary/70 transition-all"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location" className="text-sm font-medium text-foreground/90">
            Localização
          </Label>
          <div className="relative group">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-places" />
            <Input
              id="location"
              type="text"
              placeholder="Ex: São Paulo, SP"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="pl-10 h-11 bg-secondary/50 border-border/50 focus:border-places/50 focus:bg-secondary/70 transition-all"
            />
            <p className="text-[10px] text-muted-foreground/70 mt-1.5 pl-1">
              Deixe vazio ou "EUA/Brasil" para buscar em todas as cidades
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxResults" className="text-sm font-medium text-foreground/90">
            Quantidade máxima
          </Label>
          <Select value={maxResults} onValueChange={setMaxResults}>
            <SelectTrigger className="h-11 bg-secondary/50 border-border/50 focus:border-primary/50 focus:bg-secondary/70">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
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

      <div className="flex justify-end pt-1">
        <Button 
          type="submit" 
          disabled={isLoading}
          className="h-11 px-6 bg-gradient-to-r from-places to-emerald-600 hover:from-places/90 hover:to-emerald-600/90 text-white shadow-lg shadow-places/25 transition-all duration-300 hover:shadow-places/40 hover:scale-[1.02]"
        >
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