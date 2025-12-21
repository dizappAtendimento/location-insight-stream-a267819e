-- Adicionar campo de dias de validade na tabela de planos
ALTER TABLE public."SAAS_Planos" 
ADD COLUMN "diasValidade" integer DEFAULT 30;