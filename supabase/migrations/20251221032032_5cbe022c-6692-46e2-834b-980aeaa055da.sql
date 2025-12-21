-- Adicionar coluna ordem à tabela SAAS_CRM_Colunas se não existir
ALTER TABLE public."SAAS_CRM_Colunas" 
ADD COLUMN IF NOT EXISTS ordem integer DEFAULT 0;