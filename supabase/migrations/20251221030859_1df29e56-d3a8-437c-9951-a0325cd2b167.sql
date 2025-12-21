-- Adicionar coluna crmAtivo na tabela SAAS_Conexões
ALTER TABLE public."SAAS_Conexões" 
ADD COLUMN IF NOT EXISTS "crmAtivo" boolean DEFAULT false;