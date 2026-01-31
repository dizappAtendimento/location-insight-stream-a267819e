-- Função para incrementar contador de mensagens disparadas
CREATE OR REPLACE FUNCTION public.increment_disparo_count(p_disparo_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE "SAAS_Disparos"
  SET "MensagensDisparadas" = COALESCE("MensagensDisparadas", 0) + 1
  WHERE id = p_disparo_id;
END;
$$;

-- Habilitar extensões necessárias para cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;