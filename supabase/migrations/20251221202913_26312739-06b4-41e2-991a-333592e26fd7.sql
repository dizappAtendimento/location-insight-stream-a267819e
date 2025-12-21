-- Adicionar colunas para customização de planos na página de contratação
ALTER TABLE public."SAAS_Planos"
ADD COLUMN IF NOT EXISTS ordem integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS cor text DEFAULT 'violet',
ADD COLUMN IF NOT EXISTS visivel_contratacao boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS beneficios_extras text[] DEFAULT '{}';

-- Atualizar ordem dos planos existentes
UPDATE public."SAAS_Planos" SET ordem = id WHERE ordem IS NULL OR ordem = 0;

COMMENT ON COLUMN public."SAAS_Planos".ordem IS 'Ordem de exibição na página de contratação';
COMMENT ON COLUMN public."SAAS_Planos".cor IS 'Cor do card do plano (violet, blue, emerald, orange, rose, amber)';
COMMENT ON COLUMN public."SAAS_Planos".visivel_contratacao IS 'Se o plano aparece na página de contratação';
COMMENT ON COLUMN public."SAAS_Planos".beneficios_extras IS 'Lista de benefícios extras customizados';