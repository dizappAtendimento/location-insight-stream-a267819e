-- Add banido column to SAAS_Usuarios table
ALTER TABLE public."SAAS_Usuarios" 
ADD COLUMN IF NOT EXISTS banido boolean DEFAULT false;