-- Cron job para processar fila de disparos a cada minuto
SELECT cron.schedule(
  'process-disparo-queue',
  '*/1 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://egxwzmkdbymxooielidc.supabase.co/functions/v1/process-disparo-queue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVneHd6bWtkYnlteG9vaWVsaWRjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzMjgzNjcsImV4cCI6MjA3OTkwNDM2N30.XJB9t5brPcRrAmLQ_AJDsxlKEg8yYtgWZks7jgXFrdk'
    ),
    body := '{}'::jsonb
  );
  $$
);