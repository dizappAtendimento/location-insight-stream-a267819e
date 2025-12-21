-- Adicionar campo idLista na tabela SAAS_CRM_Leads para rastrear origem do lead
ALTER TABLE public."SAAS_CRM_Leads" 
ADD COLUMN "idLista" bigint NULL;

-- Adicionar campo nomeLista para exibição rápida (evita JOIN)
ALTER TABLE public."SAAS_CRM_Leads" 
ADD COLUMN "nomeLista" text NULL;

-- Criar índice para busca por lista
CREATE INDEX idx_crm_leads_idlista ON public."SAAS_CRM_Leads" ("idLista");

-- Comentário explicativo
COMMENT ON COLUMN public."SAAS_CRM_Leads"."idLista" IS 'ID da lista de disparo de origem do lead';
COMMENT ON COLUMN public."SAAS_CRM_Leads"."nomeLista" IS 'Nome da lista de disparo para exibição rápida';