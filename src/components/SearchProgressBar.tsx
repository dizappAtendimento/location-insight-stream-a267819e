import { Progress } from '@/components/ui/progress';
import { MapPin, Loader2, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface SearchProgress {
  currentCity: string;
  cityIndex: number;
  totalCities: number;
  currentResults: number;
  targetResults: number;
  percentage: number;
  isActive: boolean;
}

interface SearchProgressBarProps {
  progress: SearchProgress;
}

export function SearchProgressBar({ progress }: SearchProgressBarProps) {
  return (
    <Card className="border-primary/30 bg-primary/5 animate-fade-in">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20 animate-pulse">
              <Loader2 className="w-5 h-5 text-primary animate-spin" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Buscando em múltiplas cidades...</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="font-medium text-primary">{progress.currentCity}</span>
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-lg font-bold text-primary">
              <Users className="w-4 h-4" />
              {progress.currentResults}
            </div>
            <p className="text-xs text-muted-foreground">leads encontrados</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Cidade {progress.cityIndex} de {progress.totalCities}
            </span>
            <span className="font-medium text-foreground">{progress.percentage}%</span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
        </div>

        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Meta: {progress.targetResults} resultados</span>
          <span className="text-primary font-medium">
            {Math.round((progress.currentResults / progress.targetResults) * 100)}% da meta
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
