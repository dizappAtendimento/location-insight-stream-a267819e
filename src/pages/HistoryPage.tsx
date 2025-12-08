import { History, Trash2, Calendar, FileDown } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useExtractionHistory } from '@/hooks/useExtractionHistory';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const HistoryPage = () => {
  const { history, clearHistory } = useExtractionHistory();
  const { toast } = useToast();

  const typeLabels = {
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    places: 'Google Places',
  };

  const typeColors = {
    instagram: 'bg-pink-500/10 text-pink-500 border-pink-500/20',
    linkedin: 'bg-[#0A66C2]/10 text-[#0A66C2] border-[#0A66C2]/20',
    places: 'bg-green-500/10 text-green-500 border-green-500/20',
  };

  const handleClearHistory = () => {
    clearHistory();
    toast({
      title: "Histórico limpo",
      description: "Todo o histórico de extrações foi removido",
    });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Histórico de Extrações</h1>
            <p className="text-muted-foreground">
              Visualize todas as suas extrações anteriores
            </p>
          </div>
          {history.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleClearHistory}>
              <Trash2 className="w-4 h-4 mr-2" />
              Limpar Histórico
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Todas as Extrações
            </CardTitle>
            <CardDescription>
              {history.length} extrações registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history.length > 0 ? (
              <div className="space-y-3">
                {history.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded border ${typeColors[record.type]}`}>
                        {typeLabels[record.type]}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">{record.segment}</p>
                        {record.location && (
                          <p className="text-sm text-muted-foreground">{record.location}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-semibold text-foreground">{record.totalResults}</p>
                        <p className="text-xs text-muted-foreground">leads</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-foreground">{record.emailsFound}</p>
                        <p className="text-xs text-muted-foreground">emails</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-foreground">{record.phonesFound}</p>
                        <p className="text-xs text-muted-foreground">telefones</p>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground min-w-[100px]">
                        <Calendar className="w-3 h-3" />
                        <span className="text-xs">
                          {format(new Date(record.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Nenhuma extração registrada</p>
                <p className="text-sm">O histórico aparecerá aqui após realizar extrações</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default HistoryPage;
