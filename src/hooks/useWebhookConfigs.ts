import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WebhookConfigs {
  webhook_listar_conexoes: string;
  webhook_puxar_lista: string;
  webhook_upload_media: string;
  webhook_gerar_mensagem_ia: string;
  webhook_disparo_individual: string;
  webhook_disparo_grupo: string;
  [key: string]: string;
}

const DEFAULT_CONFIGS: WebhookConfigs = {
  webhook_listar_conexoes: 'https://app.dizapp.com.br/listarconexoes',
  webhook_puxar_lista: 'https://app.dizapp.com.br/puxar-lista',
  webhook_upload_media: 'https://app.dizapp.com.br/uploadmedia',
  webhook_gerar_mensagem_ia: 'https://app.dizapp.com.br/gerarmensagem-ia',
  webhook_disparo_individual: 'https://app.dizapp.com.br/db56b0fb-cc58-4d51-8755-d7e04ccaa120',
  webhook_disparo_grupo: 'https://app.dizapp.com.br/db56b0fb-cc58-4d51-8755-d7e04ccaa120123',
};

export function useWebhookConfigs() {
  const [configs, setConfigs] = useState<WebhookConfigs>(DEFAULT_CONFIGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfigs = async () => {
      try {
        const { data, error } = await supabase
          .from('saas_configuracoes')
          .select('chave, valor')
          .eq('categoria', 'webhooks');

        if (error) throw error;

        if (data && data.length > 0) {
          const configMap: WebhookConfigs = { ...DEFAULT_CONFIGS };
          data.forEach((item) => {
            if (item.chave && item.valor) {
              configMap[item.chave] = item.valor;
            }
          });
          setConfigs(configMap);
        }
      } catch (e) {
        console.error('Erro ao carregar configurações de webhooks:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchConfigs();
  }, []);

  return { configs, loading };
}
