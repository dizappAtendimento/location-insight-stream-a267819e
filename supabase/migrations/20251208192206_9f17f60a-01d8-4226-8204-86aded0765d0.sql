-- Add fields for Extrator plan (separate from Disparador)
ALTER TABLE public."SAAS_Usuarios"
ADD COLUMN IF NOT EXISTS plano_extrator bigint REFERENCES public."SAAS_Planos"(id),
ADD COLUMN IF NOT EXISTS "dataValidade_extrator" date;