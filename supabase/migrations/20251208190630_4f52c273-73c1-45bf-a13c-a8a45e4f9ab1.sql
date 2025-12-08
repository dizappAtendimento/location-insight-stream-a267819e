-- Add platform-specific extraction limits
ALTER TABLE public."SAAS_Planos" 
ADD COLUMN IF NOT EXISTS "qntInstagram" bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS "qntLinkedin" bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS "qntPlaces" bigint DEFAULT 0;