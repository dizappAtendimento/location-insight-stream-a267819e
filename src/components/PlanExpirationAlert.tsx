import { useState } from 'react';
import { AlertTriangle, X, CreditCard, Loader2, CheckCircle2, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { differenceInDays } from 'date-fns';

interface PaymentData {
  pixQrCode: string;
  pixCopyPaste: string;
  paymentId: string;
  value: number;
}

interface Plan {
  id: number;
  nome: string;
  preco: number;
  tipo: string;
}

export function PlanExpirationAlert() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [showCustomerForm, setShowCustomerForm] = useState(true);
  const [customerForm, setCustomerForm] = useState({
    name: user?.nome || '',
    email: user?.Email || '',
    cpfCnpj: '',
    phone: user?.telefone || ''
  });
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  if (!user || dismissed) return null;

  // Check for disparador plan expiration
  const disparadorExpiry = user.dataValidade ? new Date(user.dataValidade) : null;
  const disparadorDaysLeft = disparadorExpiry ? differenceInDays(disparadorExpiry, new Date()) : null;
  const disparadorExpiring = disparadorDaysLeft !== null && disparadorDaysLeft <= 3 && disparadorDaysLeft >= 0;
  const isDisparadorTrial = user.planoNome?.toLowerCase().includes('teste') || user.planoNome?.toLowerCase().includes('trial');

  // Check for extrator plan expiration
  const extratorExpiry = user.dataValidadeExtrator ? new Date(user.dataValidadeExtrator) : null;
  const extratorDaysLeft = extratorExpiry ? differenceInDays(extratorExpiry, new Date()) : null;
  const extratorExpiring = extratorDaysLeft !== null && extratorDaysLeft <= 3 && extratorDaysLeft >= 0;
  const isExtratorTrial = user.planoExtratorNome?.toLowerCase().includes('teste') || user.planoExtratorNome?.toLowerCase().includes('trial');

  if (!disparadorExpiring && !extratorExpiring) return null;

  const handleRenewClick = async (planType: 'disparador' | 'extrator') => {
    // Fetch available plans to get the current user's plan info
    try {
      const { data, error } = await supabase.functions.invoke('admin-api', {
        body: { action: 'get-plans' }
      });
      
      if (error) throw error;
      
      const plans = data?.plans || [];
      const userPlanId = planType === 'disparador' ? user.planoId : user.planoExtratorId;
      const plan = plans.find((p: Plan) => p.id === userPlanId);
      
      if (plan) {
        setCurrentPlan(plan);
        setShowPaymentDialog(true);
        setPaymentData(null);
        setShowCustomerForm(true);
        setPaymentStatus('');
        setCustomerForm({
          name: user?.nome || '',
          email: user?.Email || '',
          cpfCnpj: '',
          phone: user?.telefone || ''
        });
      } else {
        // If plan not found, redirect to contratar page
        window.location.href = '/contratar';
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      window.location.href = '/contratar';
    }
  };

  const handleCreatePayment = async () => {
    if (!currentPlan || !user) return;
    
    if (!customerForm.name || !customerForm.email || !customerForm.cpfCnpj) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsProcessingPayment(true);
    
    try {
      // Create or get customer
      const { data: customerData, error: customerError } = await supabase.functions.invoke('asaas-api', {
        body: {
          action: 'create-customer',
          name: customerForm.name,
          email: customerForm.email,
          cpfCnpj: customerForm.cpfCnpj.replace(/\D/g, ''),
          phone: customerForm.phone?.replace(/\D/g, '')
        }
      });

      if (customerError) throw customerError;

      // Create PIX payment
      const { data: paymentResponse, error: paymentError } = await supabase.functions.invoke('asaas-api', {
        body: {
          action: 'create-pix-payment',
          customerId: customerData.customer.id,
          value: currentPlan.preco,
          description: `Renovação do plano ${currentPlan.nome}`
        }
      });

      if (paymentError) throw paymentError;

      setPaymentData({
        pixQrCode: paymentResponse.payment.pixQrCode,
        pixCopyPaste: paymentResponse.payment.pixCopyPaste,
        paymentId: paymentResponse.payment.id,
        value: currentPlan.preco
      });
      setShowCustomerForm(false);
      setPaymentStatus('PENDING');
      
      // Start checking payment status
      startPaymentStatusCheck(paymentResponse.payment.id);
      
      toast.success('PIX gerado com sucesso!');
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Erro ao gerar pagamento');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const startPaymentStatusCheck = (paymentId: string) => {
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('asaas-api', {
          body: { action: 'check-payment-status', paymentId }
        });

        if (error) throw error;

        if (data.status === 'CONFIRMED' || data.status === 'RECEIVED') {
          clearInterval(interval);
          setPaymentStatus('CONFIRMED');
          activatePlan();
        }
      } catch (error) {
        console.error('Error checking payment:', error);
      }
    }, 5000);

    setStatusCheckInterval(interval);
  };

  const activatePlan = async () => {
    if (!currentPlan || !user) return;

    try {
      const { error } = await supabase.functions.invoke('asaas-api', {
        body: {
          action: 'activate-plan',
          userId: user.id,
          planId: currentPlan.id,
          planType: currentPlan.tipo
        }
      });

      if (error) throw error;

      toast.success('Plano renovado com sucesso!');
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error('Error activating plan:', error);
      toast.error('Erro ao ativar plano');
    }
  };

  const handleCopyPixCode = () => {
    if (paymentData?.pixCopyPaste) {
      navigator.clipboard.writeText(paymentData.pixCopyPaste);
      toast.success('Código PIX copiado!');
    }
  };

  const handleCloseDialog = () => {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
    }
    setShowPaymentDialog(false);
  };

  return (
    <>
      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/30 rounded-lg p-4 mb-4 animate-fade-in">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          
          <div className="flex-1 space-y-2">
            {disparadorExpiring && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <p className="text-sm text-foreground">
                  {isDisparadorTrial ? (
                    <span>
                      <span className="font-semibold text-amber-500">Seu período de teste expira em {disparadorDaysLeft} {disparadorDaysLeft === 1 ? 'dia' : 'dias'}!</span>
                      {' '}Renove agora para não perder acesso ao Disparador.
                    </span>
                  ) : (
                    <span>
                      <span className="font-semibold text-amber-500">Seu plano expira em {disparadorDaysLeft} {disparadorDaysLeft === 1 ? 'dia' : 'dias'}!</span>
                      {' '}Renove agora para não perder acesso.
                    </span>
                  )}
                </p>
                <Button 
                  size="sm" 
                  className="bg-amber-500 hover:bg-amber-600 text-white w-fit"
                  onClick={() => handleRenewClick('disparador')}
                >
                  <CreditCard className="w-4 h-4 mr-1" />
                  Renovar Agora
                </Button>
              </div>
            )}
            
            {extratorExpiring && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <p className="text-sm text-foreground">
                  {isExtratorTrial ? (
                    <span>
                      <span className="font-semibold text-orange-500">Seu teste do Extrator expira em {extratorDaysLeft} {extratorDaysLeft === 1 ? 'dia' : 'dias'}!</span>
                      {' '}Renove agora para continuar extraindo.
                    </span>
                  ) : (
                    <span>
                      <span className="font-semibold text-orange-500">Seu plano do Extrator expira em {extratorDaysLeft} {extratorDaysLeft === 1 ? 'dia' : 'dias'}!</span>
                      {' '}Renove para não perder acesso.
                    </span>
                  )}
                </p>
                <Button 
                  size="sm" 
                  className="bg-orange-500 hover:bg-orange-600 text-white w-fit"
                  onClick={() => handleRenewClick('extrator')}
                >
                  <CreditCard className="w-4 h-4 mr-1" />
                  Renovar Agora
                </Button>
              </div>
            )}
          </div>
          
          <Button 
            variant="ghost" 
            size="icon" 
            className="flex-shrink-0 h-8 w-8"
            onClick={() => setDismissed(true)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              Renovar Plano - {currentPlan?.nome}
            </DialogTitle>
          </DialogHeader>

          {showCustomerForm ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Preencha seus dados para gerar o PIX de R$ {currentPlan?.preco?.toFixed(2)}
              </p>
              
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Seu nome completo"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="seu@email.com"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="cpfCnpj">CPF/CNPJ *</Label>
                  <Input
                    id="cpfCnpj"
                    value={customerForm.cpfCnpj}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, cpfCnpj: e.target.value }))}
                    placeholder="000.000.000-00"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={customerForm.phone}
                    onChange={(e) => setCustomerForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleCreatePayment}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Gerando PIX...
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4 mr-2" />
                    Gerar QR Code PIX
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary mb-2">
                  R$ {paymentData?.value?.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Escaneie o QR Code ou copie o código PIX
                </p>
              </div>
              
              {paymentData?.pixQrCode && (
                <div className="flex justify-center">
                  <img 
                    src={`data:image/png;base64,${paymentData.pixQrCode}`}
                    alt="QR Code PIX"
                    className="w-48 h-48 rounded-lg border"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Código PIX Copia e Cola</Label>
                <div className="flex gap-2">
                  <Input 
                    value={paymentData?.pixCopyPaste || ''} 
                    readOnly 
                    className="text-xs"
                  />
                  <Button variant="outline" onClick={handleCopyPixCode}>
                    Copiar
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-muted/50">
                {paymentStatus === 'PENDING' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    <span className="text-sm text-muted-foreground">Aguardando pagamento...</span>
                  </>
                ) : paymentStatus === 'CONFIRMED' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-500 font-medium">Pagamento confirmado!</span>
                  </>
                ) : null}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
