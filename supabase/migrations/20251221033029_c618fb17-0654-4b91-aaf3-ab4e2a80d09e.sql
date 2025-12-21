-- Adicionar coluna instanceName à tabela SAAS_CRM_Leads
ALTER TABLE public."SAAS_CRM_Leads" 
ADD COLUMN IF NOT EXISTS "instanceName" text;