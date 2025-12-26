-- Criar tabela de cupons de desconto
CREATE TABLE public.saas_cupons (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  codigo text NOT NULL UNIQUE,
  desconto numeric NOT NULL DEFAULT 0,
  tipo_desconto text NOT NULL DEFAULT 'percentual', -- 'percentual' ou 'fixo'
  ativo boolean NOT NULL DEFAULT true,
  uso_unico boolean NOT NULL DEFAULT false,
  quantidade_uso integer DEFAULT NULL, -- NULL = ilimitado
  quantidade_usada integer NOT NULL DEFAULT 0,
  validade date DEFAULT NULL, -- NULL = sem validade
  planos_ids bigint[] DEFAULT NULL, -- NULL = todos os planos
  descricao text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saas_cupons ENABLE ROW LEVEL SECURITY;

-- Policy for service role
CREATE POLICY "service_role_full_access_cupons" 
ON public.saas_cupons 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Trigger para updated_at
CREATE TRIGGER update_cupons_updated_at
BEFORE UPDATE ON public.saas_cupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela para rastrear uso de cupons por usuário
CREATE TABLE public.saas_cupons_uso (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  cupom_id bigint NOT NULL REFERENCES public.saas_cupons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  pagamento_id bigint REFERENCES public.saas_pagamentos(id) ON DELETE SET NULL,
  valor_desconto numeric NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saas_cupons_uso ENABLE ROW LEVEL SECURITY;

-- Policy for service role
CREATE POLICY "service_role_full_access_cupons_uso" 
ON public.saas_cupons_uso 
FOR ALL 
TO service_role 
USING (true) 
WITH CHECK (true);

-- Index para busca rápida
CREATE INDEX idx_cupons_codigo ON public.saas_cupons(codigo);
CREATE INDEX idx_cupons_uso_user ON public.saas_cupons_uso(user_id);
CREATE INDEX idx_cupons_uso_cupom ON public.saas_cupons_uso(cupom_id);