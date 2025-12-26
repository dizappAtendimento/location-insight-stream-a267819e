-- Adiciona campo de desconto de renovação por usuário
ALTER TABLE public."SAAS_Usuarios" 
ADD COLUMN desconto_renovacao numeric DEFAULT 0;

-- Comentário explicativo
COMMENT ON COLUMN public."SAAS_Usuarios".desconto_renovacao IS 'Percentual de desconto na renovação (0-100)';