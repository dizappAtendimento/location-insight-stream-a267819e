import { SearchJob } from '@/hooks/useSearchJobs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle, XCircle, Clock, Trash2, Download, FileSpreadsheet, FileJson, FileDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
        return <Clock className="w-4 h-4 text-yellow-500" />;
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
      {jobs.map((job) => (
        <Card 
          key={job.id} 
          className={`cursor-pointer transition-all hover:border-primary/50 ${activeJobId === job.id ? 'border-primary ring-1 ring-primary/20' : ''}`}
          onClick={() => onSelectJob(job.id)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusIcon(job.status)}
                  <span className="text-xs text-muted-foreground">
                    {getStatusLabel(job.status)}
                  </span>
                </div>
                <p className="font-medium text-sm truncate">{job.query}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {job.location || 'Brasil'} • {job.total_found} resultados
                </p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {formatDistanceToNow(new Date(job.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
              
              <div className="flex flex-col gap-1">
                {job.status === 'completed' && job.results.length > 0 && (
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); onDownloadExcel(job); }}
                    >
                      <FileDown className="w-3.5 h-3.5 text-emerald-500" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); onDownloadCSV(job); }}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); onDownloadJSON(job); }}
                    >
                      <FileJson className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDeleteJob(job.id); }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {(job.status === 'running' || job.status === 'pending') && (
              <div className="mt-3 space-y-1">
                <Progress value={job.progress?.percentage || 0} className="h-1.5" />
                <p className="text-xs text-muted-foreground truncate">
                  {job.progress?.currentCity || 'Aguardando...'}
                  {job.progress?.cityIndex && job.progress?.totalCities && (
                    <span> ({job.progress.cityIndex}/{job.progress.totalCities})</span>
                  )}
                </p>
              </div>
            )}

            {job.status === 'failed' && job.error_message && (
              <p className="text-xs text-destructive mt-2">{job.error_message}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
