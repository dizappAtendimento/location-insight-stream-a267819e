import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ASAAS_API_URL = "https://api.asaas.com/v3";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ASAAS_API_KEY = Deno.env.get('ASAAS_API_KEY');
    if (!ASAAS_API_KEY) {
      throw new Error('ASAAS_API_KEY não configurada');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, ...params } = await req.json();
    console.log(`[asaas-api] Action: ${action}`, params);

    switch (action) {
      case 'create-customer': {
        const { name, email, cpfCnpj, phone, userId } = params;
        
        // Verificar se cliente já existe no Asaas pelo email
        const searchResponse = await fetch(`${ASAAS_API_URL}/customers?email=${encodeURIComponent(email)}`, {
          method: 'GET',
          headers: {
            'access_token': ASAAS_API_KEY,
            'Content-Type': 'application/json'
          }
        });
        
        const searchData = await searchResponse.json();
        console.log('[asaas-api] Search customer result:', searchData);
        
        if (searchData.data && searchData.data.length > 0) {
          // Cliente já existe, retornar o primeiro encontrado
          const existingCustomer = searchData.data[0];
          console.log('[asaas-api] Customer already exists:', existingCustomer.id);
          return new Response(JSON.stringify({ 
            success: true, 
            customerId: existingCustomer.id,
            isNew: false 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        // Formatar telefone - remover caracteres especiais e garantir formato válido
        let formattedPhone = phone?.replace(/\D/g, '') || '';
        // Se tiver 11 dígitos (DDD + 9 dígitos), está no formato correto
        // Se tiver 10 dígitos (DDD + 8 dígitos - telefone fixo), está no formato correto
        // Se tiver mais de 11 dígitos, pode ter código do país, remover
        if (formattedPhone.length > 11 && formattedPhone.startsWith('55')) {
          formattedPhone = formattedPhone.substring(2);
        }
        // Se ainda tiver mais de 11 dígitos, truncar
        if (formattedPhone.length > 11) {
          formattedPhone = formattedPhone.substring(0, 11);
        }
        
        // Criar novo cliente
        const customerResponse = await fetch(`${ASAAS_API_URL}/customers`, {
          method: 'POST',
          headers: {
            'access_token': ASAAS_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name,
            email,
            cpfCnpj: cpfCnpj?.replace(/\D/g, ''),
            phone: formattedPhone || undefined,
            mobilePhone: formattedPhone || undefined,
            externalReference: userId
          })
        });

        const customerData = await customerResponse.json();
        console.log('[asaas-api] Create customer response:', customerData);

        if (customerData.errors) {
          throw new Error(customerData.errors[0]?.description || 'Erro ao criar cliente');
        }

        return new Response(JSON.stringify({ 
          success: true, 
          customerId: customerData.id,
          isNew: true 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'create-pix-payment': {
        const { customerId, value, description, planId, userId, dueDate } = params;

        // Asaas requer valor mínimo de R$ 5,00 para PIX
        if (value < 5) {
          throw new Error('O valor mínimo para pagamento PIX é R$ 5,00. Entre em contato com o suporte para renovar planos com valor inferior.');
        }

        // Calcular data de vencimento (hoje + 1 dia se não fornecida)
        const dueDateFormatted = dueDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const paymentResponse = await fetch(`${ASAAS_API_URL}/payments`, {
          method: 'POST',
          headers: {
            'access_token': ASAAS_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            customer: customerId,
            billingType: 'PIX',
            value: value,
            dueDate: dueDateFormatted,
            description: description,
            externalReference: JSON.stringify({ planId, userId })
          })
        });

        const paymentData = await paymentResponse.json();
        console.log('[asaas-api] Create payment response:', paymentData);

        if (paymentData.errors) {
          throw new Error(paymentData.errors[0]?.description || 'Erro ao criar cobrança');
        }

        // Buscar QR Code do PIX
        const pixResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentData.id}/pixQrCode`, {
          method: 'GET',
          headers: {
            'access_token': ASAAS_API_KEY,
            'Content-Type': 'application/json'
          }
        });

        const pixData = await pixResponse.json();
        console.log('[asaas-api] PIX QR Code response:', pixData);

        return new Response(JSON.stringify({ 
          success: true,
          paymentId: paymentData.id,
          invoiceUrl: paymentData.invoiceUrl,
          pixQrCode: pixData.encodedImage,
          pixCopyPaste: pixData.payload,
          expirationDate: pixData.expirationDate,
          status: paymentData.status
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'check-payment-status': {
        const { paymentId } = params;

        const statusResponse = await fetch(`${ASAAS_API_URL}/payments/${paymentId}`, {
          method: 'GET',
          headers: {
            'access_token': ASAAS_API_KEY,
            'Content-Type': 'application/json'
          }
        });

        const statusData = await statusResponse.json();
        console.log('[asaas-api] Payment status:', statusData);

        return new Response(JSON.stringify({ 
          success: true,
          status: statusData.status,
          confirmedDate: statusData.confirmedDate,
          paymentDate: statusData.paymentDate
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'activate-plan': {
        const { userId, planId, paymentId } = params;

        // Buscar plano
        const { data: planData, error: planError } = await supabase
          .from('SAAS_Planos')
          .select('*')
          .eq('id', planId)
          .single();

        if (planError || !planData) {
          throw new Error('Plano não encontrado');
        }

        // Calcular data de validade
        const diasValidade = planData.diasValidade || 30;
        const dataValidade = new Date();
        dataValidade.setDate(dataValidade.getDate() + diasValidade);

        // Atualizar usuário
        const { error: updateError } = await supabase
          .from('SAAS_Usuarios')
          .update({
            plano: planId,
            dataValidade: dataValidade.toISOString().split('T')[0],
            status: true
          })
          .eq('id', userId);

        if (updateError) {
          throw new Error('Erro ao ativar plano: ' + updateError.message);
        }

        console.log('[asaas-api] Plan activated for user:', userId);

        return new Response(JSON.stringify({ 
          success: true,
          message: 'Plano ativado com sucesso!',
          dataValidade: dataValidade.toISOString().split('T')[0]
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Action desconhecida: ${action}`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[asaas-api] Error:', errorMessage);
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
