import { useState, useEffect, useRef } from 'react';
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
  webhook_listar_conexoes: 'https://n8n.dizapp.com.br/listarconexoes',
  webhook_puxar_lista: 'https://n8n.dizapp.com.br/puxar-lista',
  webhook_upload_media: 'https://n8n.dizapp.com.br/uploadmedia',
  webhook_gerar_mensagem_ia: 'https://n8n.dizapp.com.br/gerarmensagem-ia',
  webhook_disparo_individual: 'https://app.dizapp.com.br/individual-salvar',
  webhook_disparo_grupo: 'https://n8n.dizapp.com.br/webhook/grupo-salvar',
};

// Cache global para evitar múltiplas requisições
let cachedConfigs: WebhookConfigs | null = null;
let fetchPromise: Promise<WebhookConfigs> | null = null;

const fetchConfigsOnce = async (): Promise<WebhookConfigs> => {
  if (cachedConfigs) return cachedConfigs;
  
  if (fetchPromise) return fetchPromise;
  
  fetchPromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('saas_configuracoes')
        .select('chave, valor')
        .eq('categoria', 'webhooks');

      if (error) throw error;

      const configMap: WebhookConfigs = { ...DEFAULT_CONFIGS };
      if (data && data.length > 0) {
        data.forEach((item) => {
          if (item.chave && item.valor) {
            configMap[item.chave] = item.valor;
          }
        });
      }
      cachedConfigs = configMap;
      return configMap;
    } catch (e) {
      console.error('Erro ao carregar configurações de webhooks:', e);
      return DEFAULT_CONFIGS;
    }
  })();
  
  return fetchPromise;
};

export function useWebhookConfigs() {
  const [configs, setConfigs] = useState<WebhookConfigs>(cachedConfigs || DEFAULT_CONFIGS);
  const [loading, setLoading] = useState(!cachedConfigs);

  useEffect(() => {
    if (cachedConfigs) {
      setConfigs(cachedConfigs);
      setLoading(false);
      return;
    }

    fetchConfigsOnce().then((result) => {
      setConfigs(result);
      setLoading(false);
    });
  }, []);

  return { configs, loading };
}
