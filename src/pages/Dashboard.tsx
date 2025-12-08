import { FileText, Users, Mail, Phone, TrendingUp, Calendar } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatCard } from '@/components/StatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useExtractionHistory } from '@/hooks/useExtractionHistory';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Dashboard = () => {
  const { history, getStats } = useExtractionHistory();
  const stats = getStats();

  const recentExtractions = history.slice(0, 5);

  const typeLabels = {
    instagram: 'Instagram',
    linkedin: 'LinkedIn',
    places: 'Google Places',
  };

  const typeColors = {
    instagram: 'text-pink-500',
    linkedin: 'text-[#0A66C2]',
    places: 'text-green-500',
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Acompanhe suas métricas e performance de extração
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total de Extrações"
            value={stats.totalExtractions}
            icon={FileText}
            trend={`+${stats.todayExtractions} hoje`}
            trendPositive={stats.todayExtractions > 0}
          />
          <StatCard
            title="Total de Leads"
            value={stats.totalLeads}
            icon={Users}
            trend={`+${stats.todayLeads} hoje`}
            trendPositive={stats.todayLeads > 0}
          />
          <StatCard
            title="Emails Encontrados"
            value={stats.totalEmails}
            icon={Mail}
          />
          <StatCard
            title="Telefones Encontrados"
            value={stats.totalPhones}
            icon={Phone}
          />
        </div>

        {/* Recent Extractions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Extrações Recentes
            </CardTitle>
            <CardDescription>
              Últimas extrações realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentExtractions.length > 0 ? (
              <div className="space-y-3">
                {recentExtractions.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${typeColors[record.type]}`}>
                          {typeLabels[record.type]}
                        </span>
                      </div>
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
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span className="text-xs">
                          {format(new Date(record.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Nenhuma extração realizada ainda</p>
                <p className="text-sm">Comece usando um dos extratores</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
