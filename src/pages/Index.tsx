import { SearchForm } from '@/components/SearchForm';
import { PlaceCard } from '@/components/PlaceCard';
import { JobsList } from '@/components/JobsList';
import { useSearchJobs } from '@/hooks/useSearchJobs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MapPin, Download, FileJson, FileSpreadsheet, FileDown, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useExtractionHistory } from '@/hooks/useExtractionHistory';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Link } from 'react-router-dom';

const Index = () => {
  const { user } = useAuth();
  const { 
    isLoading, 
    jobs, 
    activeJob, 
    activeJobId,
    setActiveJobId,
    createJob, 
    deleteJob,
    downloadCSV, 
    downloadJSON, 
    downloadExcel 
  } = useSearchJobs();
  
  const { addRecord } = useExtractionHistory();
  const lastResultsRef = useRef<string | null>(null);
  const [planLimit, setPlanLimit] = useState<number | null>(null);
  const [isLoadingPlan, setIsLoadingPlan] = useState(true);

  // Fetch plan limits - check both regular plan and extrator plan
  useEffect(() => {
    const fetchPlanLimit = async () => {
      if (!user?.planoId && !user?.planoExtratorId) {
        setPlanLimit(0);
        setIsLoadingPlan(false);
        return;
      }

      try {
        let limit = 0;

        // Check regular plan first
        if (user?.planoId) {
          const { data } = await supabase
            .from('SAAS_Planos')
            .select('qntPlaces')
            .eq('id', user.planoId)
            .maybeSingle();
          
          if (data?.qntPlaces && data.qntPlaces > 0) {
            limit = data.qntPlaces;
          }
        }

        // If no limit from regular plan, check extrator plan
        if (limit === 0 && user?.planoExtratorId) {
          const { data } = await supabase
            .from('SAAS_Planos')
            .select('qntPlaces')
            .eq('id', user.planoExtratorId)
            .maybeSingle();
          
          if (data?.qntPlaces && data.qntPlaces > 0) {
            limit = data.qntPlaces;
          }
        }

        setPlanLimit(limit);
      } catch (err) {
        console.error('Error:', err);
        setPlanLimit(0);
      } finally {
        setIsLoadingPlan(false);
      }
    };

    fetchPlanLimit();
  }, [user?.planoId, user?.planoExtratorId]);

  // Track completed jobs in history
  useEffect(() => {
    if (activeJob && activeJob.status === 'completed' && activeJob.results.length > 0) {
      const resultId = `${activeJob.id}-${activeJob.results.length}`;
      if (lastResultsRef.current !== resultId) {
        lastResultsRef.current = resultId;
        addRecord({
          type: 'places',
          segment: activeJob.query,
          location: activeJob.location || undefined,
          totalResults: activeJob.results.length,
          emailsFound: 0,
          phonesFound: activeJob.results.filter(p => p.phone).length,
          results: activeJob.results.map(p => ({
            name: p.name,
            address: p.address,
            phone: p.phone || undefined,
            website: p.website || undefined,
            rating: p.rating || undefined,
            reviews: p.reviewCount || undefined,
            category: p.category || undefined,
          })),
        });
      }
    }
  }, [activeJob, addRecord]);

  const isJobActive = activeJob && (activeJob.status === 'running' || activeJob.status === 'pending');
  const hasPlacesQuota = planLimit !== null && planLimit > 0;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-5 lg:p-6 space-y-5 lg:space-y-6">
        {/* Header */}
        <div className="opacity-0 animate-fade-in" style={{ animationDelay: '0ms' }}>
          <h1 className="text-xl sm:text-2xl title-gradient tracking-tight">Google Places Extractor</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Encontre empresas e estabelecimentos</p>
        </div>

        {/* No quota warning */}
        {!isLoadingPlan && !hasPlacesQuota && (
          <Alert variant="destructive" className="opacity-0 animate-fade-in" style={{ animationDelay: '50ms' }}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Seu plano não inclui extrações do Google Places.</span>
              <Link to="/configuracoes?tab=planos">
                <Button variant="outline" size="sm" className="ml-4">
                  Fazer Upgrade
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

        {/* Search Card */}
        <Card className="opacity-0 animate-fade-in-up overflow-hidden relative" style={{ animationDelay: '100ms' }}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-green-600" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              Buscar Lugares
            </CardTitle>
            <CardDescription>
              Pesquise por tipo de negócio. A busca roda em background - você pode sair da página e voltar depois para baixar os resultados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingPlan ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : hasPlacesQuota ? (
              <SearchForm onSearch={createJob} isLoading={isLoading} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>Faça upgrade do seu plano para usar o extrator de Google Places.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Jobs List */}
        {jobs.length > 0 && (
          <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <JobsList 
              jobs={jobs}
              activeJobId={activeJobId}
              onSelectJob={setActiveJobId}
              onDeleteJob={deleteJob}
              onDownloadExcel={downloadExcel}
              onDownloadCSV={downloadCSV}
              onDownloadJSON={downloadJSON}
            />
          </div>
        )}

        {/* Active Job Progress */}
        {isJobActive && (
          <Card className="animate-fade-in border-primary/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <div>
                  <p className="font-medium">Buscando: {activeJob.query}</p>
                  <p className="text-sm text-muted-foreground">
                    {activeJob.progress?.currentCity || 'Iniciando...'}
                    {activeJob.progress?.cityIndex && activeJob.progress?.totalCities && (
                      <span> • Cidade {activeJob.progress.cityIndex}/{activeJob.progress.totalCities}</span>
                    )}
                  </p>
                </div>
              </div>
              <Progress value={activeJob.progress?.percentage || 0} className="h-2" />
              <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                <span>{activeJob.progress?.currentResults || 0} resultados encontrados</span>
                <span>{activeJob.progress?.percentage || 0}%</span>
              </div>
              <p className="text-xs text-muted-foreground/70 mt-3 text-center">
                Você pode sair da página. A busca continuará em background.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {activeJob && activeJob.status === 'completed' && activeJob.results.length > 0 && (
          <div className="space-y-4 opacity-0 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Resultados para "{activeJob.query}"
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium">
                  {activeJob.results.length} lugares encontrados
                </span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => downloadExcel(activeJob)} className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
                  <FileDown className="w-4 h-4 mr-2" />
                  Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadCSV(activeJob)}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadJSON(activeJob)}>
                  <FileJson className="w-4 h-4 mr-2" />
                  JSON
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {activeJob.results.map((place, index) => (
                <PlaceCard key={place.cid || index} place={place} index={index} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!activeJob && jobs.length === 0 && !isLoading && hasPlacesQuota && (
          <Card className="text-center py-16 opacity-0 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
            <CardContent>
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 flex items-center justify-center">
                <Download className="w-10 h-10 text-emerald-500/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Busque e exporte dados</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Pesquise estabelecimentos e baixe os resultados em Excel, CSV ou JSON. A busca roda em background - você pode sair e voltar depois!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Index;
