import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  Star,
  Copy,
  Loader2,
  CheckCircle2,
  QrCode
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
  ordem: number | null;
  cor: string | null;
  visivel_contratacao: boolean | null;
  beneficios_extras: string[] | null;
}

const COLOR_MAP: Record<string, { gradient: string; text: string }> = {
  violet: { gradient: 'from-violet-500 to-purple-600', text: 'text-violet-500' },
  blue: { gradient: 'from-blue-500 to-cyan-500', text: 'text-blue-500' },
  emerald: { gradient: 'from-emerald-500 to-teal-500', text: 'text-emerald-500' },
  orange: { gradient: 'from-orange-500 to-amber-500', text: 'text-orange-500' },
  rose: { gradient: 'from-rose-500 to-pink-500', text: 'text-rose-500' },
  amber: { gradient: 'from-amber-500 to-yellow-500', text: 'text-amber-500' },
};

interface PaymentData {
  paymentId: string;
  pixQrCode: string;
  pixCopyPaste: string;
  invoiceUrl: string;
  status: string;
}

export default function ContratarPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [customerForm, setCustomerForm] = useState({
    name: '',
    email: '',
    cpfCnpj: '',
    phone: ''
  });
  const [showCustomerForm, setShowCustomerForm] = useState(true);
  const statusCheckInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('admin-api', {
          body: { action: 'get-plans' }
        });

        if (!error && data?.plans) {
          const disparadorPlans = data.plans
            .filter((p: Plan) => (p.tipo === 'disparador' || !p.tipo) && p.visivel_contratacao !== false)
            .sort((a: Plan, b: Plan) => (a.ordem || 0) - (b.ordem || 0));
          setPlans(disparadorPlans);
        }
      } catch (err) {
        console.error('Error fetching plans:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // Preencher form com dados do usuário
  useEffect(() => {
    if (user) {
      setCustomerForm(prev => ({
        ...prev,
        name: user.nome || '',
        email: user.Email || '',
        phone: user.telefone || ''
      }));
    }
  }, [user]);

  // Check if user already has an active plan
  useEffect(() => {
    if (user && (user.statusDisparador || user.statusExtrator)) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Limpar interval ao desmontar
  useEffect(() => {
    return () => {
      if (statusCheckInterval.current) {
        clearInterval(statusCheckInterval.current);
      }
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setShowPaymentDialog(true);
    setPaymentData(null);
    setPaymentStatus('');
    setShowCustomerForm(true);
  };

  const handleCreatePayment = async () => {
    if (!selectedPlan || !user) return;

    // Validar campos
    if (!customerForm.name || !customerForm.email || !customerForm.cpfCnpj) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Criar ou buscar cliente no Asaas
      const { data: customerData, error: customerError } = await supabase.functions.invoke('asaas-api', {
        body: {
          action: 'create-customer',
          name: customerForm.name,
          email: customerForm.email,
          cpfCnpj: customerForm.cpfCnpj,
          phone: customerForm.phone,
          userId: user.id
        }
      });

      if (customerError || !customerData?.success) {
        throw new Error(customerData?.error || 'Erro ao criar cliente');
      }

      console.log('Customer created/found:', customerData.customerId);

      // 2. Criar cobrança PIX
      const { data: paymentResult, error: paymentError } = await supabase.functions.invoke('asaas-api', {
        body: {
          action: 'create-pix-payment',
          customerId: customerData.customerId,
          value: selectedPlan.preco,
          description: `Plano ${selectedPlan.nome} - DizApp`,
          planId: selectedPlan.id,
          userId: user.id
        }
      });

      if (paymentError || !paymentResult?.success) {
        throw new Error(paymentResult?.error || 'Erro ao criar cobrança');
      }

      console.log('Payment created:', paymentResult);

      setPaymentData({
        paymentId: paymentResult.paymentId,
        pixQrCode: paymentResult.pixQrCode,
        pixCopyPaste: paymentResult.pixCopyPaste,
        invoiceUrl: paymentResult.invoiceUrl,
        status: paymentResult.status
      });
      setShowCustomerForm(false);
      setPaymentStatus('PENDING');

      // Iniciar verificação de status
      startPaymentStatusCheck(paymentResult.paymentId);

      toast.success('PIX gerado com sucesso! Escaneie o QR Code para pagar.');

    } catch (error: any) {
      console.error('Error creating payment:', error);
      toast.error(error.message || 'Erro ao gerar PIX');
    } finally {
      setIsProcessing(false);
    }
  };

  const startPaymentStatusCheck = (paymentId: string) => {
    // Limpar interval anterior se existir
    if (statusCheckInterval.current) {
      clearInterval(statusCheckInterval.current);
    }

    // Verificar a cada 5 segundos
    statusCheckInterval.current = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('asaas-api', {
          body: {
            action: 'check-payment-status',
            paymentId
          }
        });

        if (!error && data?.success) {
          setPaymentStatus(data.status);

          if (data.status === 'CONFIRMED' || data.status === 'RECEIVED') {
            // Pagamento confirmado! Ativar plano
            clearInterval(statusCheckInterval.current!);
            await activatePlan();
          }
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
      }
    }, 5000);
  };

  const activatePlan = async () => {
    if (!selectedPlan || !user || !paymentData) return;

    try {
      const { data, error } = await supabase.functions.invoke('asaas-api', {
        body: {
          action: 'activate-plan',
          userId: user.id,
          planId: selectedPlan.id,
          paymentId: paymentData.paymentId
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'Erro ao ativar plano');
      }

      toast.success('Pagamento confirmado! Seu plano foi ativado.');
      
      // Redirecionar para dashboard após 2 segundos
      setTimeout(() => {
        navigate('/dashboard');
        window.location.reload();
      }, 2000);

    } catch (err: any) {
      console.error('Error activating plan:', err);
      toast.error(err.message || 'Erro ao ativar plano');
    }
  };

  const handleCopyPixCode = () => {
    if (paymentData?.pixCopyPaste) {
      navigator.clipboard.writeText(paymentData.pixCopyPaste);
      toast.success('Código PIX copiado!');
    }
  };

  const getPlanColors = (plan: Plan) => {
    const cor = plan.cor || 'violet';
    return COLOR_MAP[cor] || COLOR_MAP.violet;
  };

  const renderPlanCard = (plan: Plan) => {
    const colors = getPlanColors(plan);
    const isPopular = plan.destaque === true;
    
    // Lista de benefícios padrão
    const defaultBenefits = [
      { icon: Link2, color: 'text-cyan-400', text: `${plan.qntConexoes} conexões WhatsApp` },
      { icon: List, color: 'text-violet-400', text: `${plan.qntListas} listas de contatos` },
      { icon: Contact, color: 'text-amber-400', text: `${plan.qntContatos?.toLocaleString('pt-BR')} contatos` },
      { icon: Send, color: 'text-orange-400', text: `${plan.qntDisparos?.toLocaleString('pt-BR')} disparos/mês` },
    ];
    
    return (
      <Card 
        key={plan.id} 
        className={`relative overflow-hidden border ${isPopular ? 'border-amber-500/50 ring-2 ring-amber-500/20' : 'border-zinc-700'} bg-zinc-900 hover:shadow-2xl transition-all duration-500 group ${isPopular ? 'scale-105 z-10' : ''}`}
      >
        {isPopular && (
          <div className="absolute -top-1 -right-1">
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 shadow-lg px-3 py-1">
              <Star className="w-3 h-3 mr-1" />
              Mais Contratado
            </Badge>
          </div>
        )}

        <CardHeader className="relative pb-4 text-center">
          <CardTitle className="text-2xl font-bold text-white">{plan.nome}</CardTitle>
          <div className="mt-4">
            <span className={`text-4xl font-bold ${colors.text}`}>
              R$ {plan.preco?.toFixed(2).replace('.', ',')}
            </span>
            <span className="text-sm text-zinc-400">/mês</span>
          </div>
        </CardHeader>
        
        <CardContent className="relative space-y-6">
          <div className="space-y-2">
            {defaultBenefits.map((benefit, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                <benefit.icon className={`w-4 h-4 ${benefit.color} shrink-0`} />
                <span className="text-sm text-zinc-300">{benefit.text}</span>
              </div>
            ))}
            {/* Benefícios extras do banco */}
            {plan.beneficios_extras && plan.beneficios_extras.length > 0 && plan.beneficios_extras.map((beneficio, i) => (
              <div key={`extra-${i}`} className="flex items-center gap-3 py-2">
                <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
                <span className="text-sm text-zinc-300">{beneficio}</span>
              </div>
            ))}
          </div>
          
          {(plan.preco || 0) >= 5 ? (
            <Button 
              onClick={() => handleSelectPlan(plan)}
              className={`w-full gap-2 bg-gradient-to-r ${colors.gradient} hover:opacity-90 text-white shadow-lg`}
            >
              <QrCode className="w-4 h-4" />
              Pagar com PIX
            </Button>
          ) : (
            <p className="text-xs text-center text-zinc-500">
              Plano gratuito ou promocional
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-zinc-900 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="Logo" className="h-8 w-auto" />
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <>
                <span className="text-sm text-zinc-300 hidden sm:block">
                  {user.nome || user.Email}
                </span>
                <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 border-zinc-600 text-white hover:bg-zinc-800">
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
          ) : plans.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum plano disponível no momento</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
              {plans.map((plan) => renderPlanCard(plan))}
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

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              {showCustomerForm ? 'Dados para Pagamento' : 'Pagar com PIX'}
            </DialogTitle>
            <DialogDescription>
              {showCustomerForm 
                ? `Plano ${selectedPlan?.nome} - R$ ${selectedPlan?.preco?.toFixed(2).replace('.', ',')}`
                : 'Escaneie o QR Code ou copie o código PIX'
              }
            </DialogDescription>
          </DialogHeader>

          {showCustomerForm ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo *</Label>
                <Input
                  id="name"
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Seu nome completo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="seu@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cpfCnpj">CPF ou CNPJ *</Label>
                <Input
                  id="cpfCnpj"
                  value={customerForm.cpfCnpj}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, cpfCnpj: e.target.value }))}
                  placeholder="000.000.000-00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <Button 
                onClick={handleCreatePayment} 
                disabled={isProcessing}
                className="w-full gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando PIX...
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4" />
                    Gerar PIX
                  </>
                )}
              </Button>
            </div>
          ) : paymentData && (
            <div className="space-y-4 py-4">
              {/* Status do pagamento */}
              <div className={`p-3 rounded-lg text-center ${
                paymentStatus === 'CONFIRMED' || paymentStatus === 'RECEIVED'
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'bg-amber-500/10 text-amber-500'
              }`}>
                {paymentStatus === 'CONFIRMED' || paymentStatus === 'RECEIVED' ? (
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-medium">Pagamento Confirmado!</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Aguardando pagamento...</span>
                  </div>
                )}
              </div>

              {/* QR Code */}
              {paymentData.pixQrCode && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img 
                    src={`data:image/png;base64,${paymentData.pixQrCode}`} 
                    alt="QR Code PIX"
                    className="w-48 h-48"
                  />
                </div>
              )}

              {/* Código PIX */}
              <div className="space-y-2">
                <Label>Código PIX (Copia e Cola)</Label>
                <div className="flex gap-2">
                  <Input 
                    value={paymentData.pixCopyPaste} 
                    readOnly 
                    className="text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={handleCopyPixCode}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Após o pagamento, seu plano será ativado automaticamente em alguns segundos.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
