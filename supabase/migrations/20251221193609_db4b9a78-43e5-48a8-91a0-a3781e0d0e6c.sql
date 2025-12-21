-- Adicionar campo de destaque na tabela de planos
ALTER TABLE public."SAAS_Planos" 
ADD COLUMN "destaque" boolean DEFAULT false;