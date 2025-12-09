import { SearchJob } from '@/hooks/useSearchJobs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle, Clock, Trash2, FileSpreadsheet, FileJson, FileDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface JobsListProps {
  jobs: SearchJob[];
  activeJobId: string | null;
  onSelectJob: (jobId: string) => void;
  onDeleteJob: (jobId: string) => void;
  onDownloadExcel: (job: SearchJob) => void;
  onDownloadCSV: (job: SearchJob) => void;
  onDownloadJSON: (job: SearchJob) => void;
}

export function JobsList({ 
  jobs, 
  activeJobId, 
  onSelectJob, 
  onDeleteJob,
  onDownloadExcel,
  onDownloadCSV,
  onDownloadJSON,
}: JobsListProps) {
  if (jobs.length === 0) {
    return null;
  }

  const getStatusIcon = (status: SearchJob['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusLabel = (status: SearchJob['status']) => {
    switch (status) {
      case 'pending':
        return 'Na fila';
      case 'running':
        return 'Em andamento';
      case 'completed':
        return 'Concluído';
      case 'failed':
        return 'Falhou';
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Buscas Recentes</h3>
      <div className="space-y-2">
        {jobs.map((job, index) => (
          <Card 
            key={job.id} 
            className={cn(
              "cursor-pointer transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 group opacity-0 animate-fade-in",
              activeJobId === job.id ? 'border-primary/50 ring-1 ring-primary/20 bg-primary/5' : 'border-border/40'
            )}
            style={{ animationDelay: `${index * 50}ms` }}
            onClick={() => onSelectJob(job.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {getStatusIcon(job.status)}
                    <span className={cn(
                      "text-xs font-medium",
                      job.status === 'completed' && "text-emerald-400",
                      job.status === 'running' && "text-primary",
                      job.status === 'pending' && "text-amber-400",
                      job.status === 'failed' && "text-destructive"
                    )}>
                      {getStatusLabel(job.status)}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-foreground truncate">{job.query}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {job.location || 'Brasil'} • {job.total_found} resultados
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
                
                <div className="flex flex-col gap-1">
                  {job.status === 'completed' && job.results.length > 0 && (
                    <div className="flex gap-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                        onClick={(e) => { e.stopPropagation(); onDownloadExcel(job); }}
                        title="Baixar Excel"
                      >
                        <FileDown className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:bg-secondary"
                        onClick={(e) => { e.stopPropagation(); onDownloadCSV(job); }}
                        title="Baixar CSV"
                      >
                        <FileSpreadsheet className="w-4 h-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 hover:bg-secondary"
                        onClick={(e) => { e.stopPropagation(); onDownloadJSON(job); }}
                        title="Baixar JSON"
                      >
                        <FileJson className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 self-end"
                    onClick={(e) => { e.stopPropagation(); onDeleteJob(job.id); }}
                    title="Excluir busca"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {(job.status === 'running' || job.status === 'pending') && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-primary font-semibold">
                      {job.progress?.currentResults || 0} resultados encontrados
                    </span>
                    <span className="text-muted-foreground font-medium">
                      {job.progress?.percentage || 0}%
                    </span>
                  </div>
                  <Progress value={job.progress?.percentage || 0} className="h-1.5" />
                  <p className="text-[11px] text-muted-foreground/70 truncate">
                    {job.progress?.currentCity || 'Aguardando...'}
                    {job.progress?.cityIndex && job.progress?.totalCities && (
                      <span className="text-muted-foreground/50"> • Cidade {job.progress.cityIndex}/{job.progress.totalCities}</span>
                    )}
                  </p>
                </div>
              )}

              {job.status === 'failed' && job.error_message && (
                <p className="text-xs text-destructive mt-3 p-2 bg-destructive/10 rounded-md">{job.error_message}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}