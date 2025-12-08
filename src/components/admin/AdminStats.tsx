import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserCheck, CreditCard, Send, Link2, List, Contact } from 'lucide-react';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalPlans: number;
  disparosThisMonth: number;
  totalConnections: number;
  totalLists: number;
  totalContacts: number;
}

export function AdminStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('admin-api', {
          body: { action: 'get-stats' }
        });

        if (!error && data) {
          setStats(data);
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: 'Total de Usuários', value: stats?.totalUsers || 0, icon: Users, color: 'text-blue-400' },
    { title: 'Usuários Ativos', value: stats?.activeUsers || 0, icon: UserCheck, color: 'text-emerald-400' },
    { title: 'Planos Cadastrados', value: stats?.totalPlans || 0, icon: CreditCard, color: 'text-purple-400' },
    { title: 'Disparos (Mês)', value: stats?.disparosThisMonth || 0, icon: Send, color: 'text-orange-400' },
    { title: 'Conexões', value: stats?.totalConnections || 0, icon: Link2, color: 'text-cyan-400' },
    { title: 'Listas', value: stats?.totalLists || 0, icon: List, color: 'text-pink-400' },
    { title: 'Contatos', value: stats?.totalContacts || 0, icon: Contact, color: 'text-yellow-400' },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <Card key={i} className="bg-card/50 border-border/50 animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded w-24 mb-3" />
              <div className="h-8 bg-muted rounded w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card 
          key={stat.title} 
          className="bg-card/50 border-border/50 hover:border-primary/30 transition-all duration-300"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-3xl font-bold mt-1">{stat.value.toLocaleString('pt-BR')}</p>
              </div>
              <div className={`p-3 rounded-xl bg-muted/50 ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
