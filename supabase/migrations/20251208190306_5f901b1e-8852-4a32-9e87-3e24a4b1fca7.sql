-- Add tipo column to distinguish between plan types
ALTER TABLE public."SAAS_Planos" 
ADD COLUMN IF NOT EXISTS tipo text DEFAULT 'disparador';

-- Add extractor-specific limit column
ALTER TABLE public."SAAS_Planos" 
ADD COLUMN IF NOT EXISTS "qntExtracoes" bigint DEFAULT 0;

-- Update existing plans to be disparador type
UPDATE public."SAAS_Planos" SET tipo = 'disparador' WHERE tipo IS NULL;