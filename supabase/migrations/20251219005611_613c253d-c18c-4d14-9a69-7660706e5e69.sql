-- Habilitar pg_net se não existir
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remover cron existente se houver
SELECT cron.unschedule('maturador-process-messages') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'maturador-process-messages');

-- Criar cron job para processar mensagens do maturador a cada 30 segundos
SELECT cron.schedule(
  'maturador-process-messages',
  '*/1 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://egxwzmkdbymxooielidc.supabase.co/functions/v1/maturador-api',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVneHd6bWtkYnlteG9vaWVsaWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjgzNjcsImV4cCI6MjA3OTkwNDM2N30.XJB9t5brPcRrAmLQ_AJDsxlKEg8yYtgWZks7jgXFrdk'
    ),
    body := '{"action": "process-messages"}'::jsonb
  );
  $$
);