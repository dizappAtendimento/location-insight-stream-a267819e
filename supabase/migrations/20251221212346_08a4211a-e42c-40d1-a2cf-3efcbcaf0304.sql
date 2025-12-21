-- Create function for updated_at if not exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create system configurations table for admin-managed settings
CREATE TABLE public.SAAS_Configuracoes (
  id SERIAL PRIMARY KEY,
  chave TEXT NOT NULL UNIQUE,
  valor TEXT,
  descricao TEXT,
  tipo TEXT DEFAULT 'text',
  categoria TEXT DEFAULT 'geral',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.SAAS_Configuracoes ENABLE ROW LEVEL SECURITY;

-- Only service role can access (admin via edge functions)
CREATE POLICY "service_role_full_access_configuracoes" 
ON public.SAAS_Configuracoes 
FOR ALL 
TO service_role
USING (true) 
WITH CHECK (true);

-- Insert default configurations
INSERT INTO public.SAAS_Configuracoes (chave, valor, descricao, tipo, categoria) VALUES
('webhook_recuperar_senha', 'https://n8n.apolinario.site/webhook-test/dizapp', 'Webhook para envio de código de recuperação de senha', 'webhook', 'webhooks'),
('webhook_disparo', '', 'Webhook para notificações de disparos', 'webhook', 'webhooks'),
('webhook_novo_usuario', '', 'Webhook para notificação de novo usuário cadastrado', 'webhook', 'webhooks'),
('api_serper', '', 'API Key do Serper para buscas', 'api_key', 'apis'),
('api_evolution', '', 'URL base da API Evolution', 'url', 'apis'),
('api_evolution_key', '', 'API Key da Evolution', 'api_key', 'apis');

-- Create trigger for updated_at
CREATE TRIGGER update_configuracoes_updated_at
BEFORE UPDATE ON public.SAAS_Configuracoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();