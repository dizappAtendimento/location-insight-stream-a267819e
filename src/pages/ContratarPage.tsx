import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Crown, 
  Zap, 
  Check, 
  Send, 
  Link2, 
  List, 
  Contact,
  LogOut,
  MessageCircle,
  Star
} from 'lucide-react';
import logoImage from '@/assets/logo.png';

interface Plan {
  id: number;
  nome: string | null;
  preco: number | null;
  qntConexoes: number | null;
  qntContatos: number | null;
  qntDisparos: number | null;
  qntListas: number | null;
  destaque: boolean | null;
  tipo: string | null;
}

export default function ContratarPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('disparador');

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('admin-api', {
          body: { action: 'get-plans' }
        });

        if (!error && data?.plans) {
          setPlans(data.plans.filter((p: Plan) => (p.preco || 0) > 0));
        }
      } catch (err) {
        console.error('Error fetching plans:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // Check if user already has an active plan
  useEffect(() => {
    if (user && (user.statusDisparador || user.statusExtrator)) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const handleContactSales = (plan: Plan) => {
    const message = encodeURIComponent(
      `Olá! Tenho interesse no plano ${plan.nome} - R$ ${plan.preco?.toFixed(2).replace('.', ',')}. Poderia me ajudar?`
    );
    window.open(`https://wa.me/5511999999999?text=${message}`, '_blank');
  };

  const disparadorPlans = plans.filter(p => p.tipo === 'disparador' || !p.tipo);

  const getPlanColors = (index: number) => {
    const colors = [
      { gradient: 'from-violet-500 to-purple-600', bg: 'from-violet-500/10 to-purple-600/5', text: 'text-violet-500', border: 'border-violet-500/30' },
      { gradient: 'from-blue-500 to-cyan-500', bg: 'from-blue-500/10 to-cyan-500/5', text: 'text-blue-500', border: 'border-blue-500/30' },
      { gradient: 'from-emerald-500 to-teal-500', bg: 'from-emerald-500/10 to-teal-500/5', text: 'text-emerald-500', border: 'border-emerald-500/30' },
      { gradient: 'from-orange-500 to-amber-500', bg: 'from-orange-500/10 to-amber-500/5', text: 'text-orange-500', border: 'border-orange-500/30' },
    ];
    return colors[index % colors.length];
  };

  const renderPlanCard = (plan: Plan, index: number) => {
    const colors = getPlanColors(index);
    const isPopular = plan.destaque === true;
    
    return (
      <Card 
        key={plan.id} 
        className={`relative overflow-hidden border-2 ${isPopular ? 'border-amber-500/50 ring-2 ring-amber-500/20' : colors.border} bg-card hover:shadow-2xl transition-all duration-500 group ${isPopular ? 'scale-105 z-10' : ''}`}
      >
        {/* Background gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br ${colors.bg} opacity-50`} />
        
        {/* Popular badge */}
        {isPopular && (
          <div className="absolute -top-1 -right-1">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg px-3 py-1">
              <Star className="w-3 h-3 mr-1" />
              Mais Contratado
            </Badge>
          </div>
        )}

        <CardHeader className="relative pb-4 text-center">
          <CardTitle className="text-2xl font-bold">{plan.nome}</CardTitle>
          <div className="mt-4">
            <span className={`text-4xl font-bold ${colors.text}`}>
              R$ {plan.preco?.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-sm text-muted-foreground">/mês</span>
          </div>
        </CardHeader>
        
        <CardContent className="relative space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="flex items-center gap-2">
                <Link2 className="w-4 h-4 text-cyan-500" />
                <span className="text-sm"><strong>{plan.qntConexoes}</strong> conexões WhatsApp</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="flex items-center gap-2">
                <List className="w-4 h-4 text-violet-500" />
                <span className="text-sm"><strong>{plan.qntListas}</strong> listas de contatos</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="flex items-center gap-2">
                <Contact className="w-4 h-4 text-amber-500" />
                <span className="text-sm"><strong>{plan.qntContatos?.toLocaleString('pt-BR')}</strong> contatos</span>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
              <Check className="w-5 h-5 text-emerald-500 shrink-0" />
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-orange-500" />
                <span className="text-sm"><strong>{plan.qntDisparos?.toLocaleString('pt-BR')}</strong> disparos/mês</span>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={() => handleContactSales(plan)}
            className={`w-full gap-2 bg-gradient-to-r ${colors.gradient} hover:opacity-90 text-white shadow-lg`}
          >
            <MessageCircle className="w-4 h-4" />
            Contratar Agora
          </Button>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="Logo" className="h-8 w-auto" />
            <span className="font-bold text-xl">DizApp</span>
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <span className="text-sm text-muted-foreground hidden sm:block">
                  {user.nome || user.Email}
                </span>
                <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
                  <LogOut className="w-4 h-4" />
                  Sair
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />
        
        <div className="container mx-auto px-4 text-center relative">
          <Badge className="mb-4 bg-amber-500/10 text-amber-500 border-amber-500/30">
            <Crown className="w-3 h-3 mr-1" />
            Escolha seu plano
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Você ainda não tem um plano ativo
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Para acessar todas as funcionalidades do DizApp, escolha um dos nossos planos abaixo e comece a automatizar suas mensagens e extrair leads agora mesmo.
          </p>
        </div>
      </section>

      {/* Plans Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : disparadorPlans.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum plano disponível no momento</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
              {disparadorPlans.map((plan, index) => renderPlanCard(plan, index))}
            </div>
          )}
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-16 border-t border-border/40">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Precisa de ajuda para escolher?</h2>
          <p className="text-muted-foreground mb-6">
            Entre em contato com nossa equipe para tirar suas dúvidas
          </p>
          <Button 
            onClick={() => window.open('https://wa.me/5511999999999', '_blank')}
            className="gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <MessageCircle className="w-4 h-4" />
            Falar com Suporte
          </Button>
        </div>
      </section>
    </div>
  );
}
