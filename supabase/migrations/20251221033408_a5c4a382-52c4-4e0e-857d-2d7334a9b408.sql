-- Atualizar leads existentes com instanceName baseado na conexão com CRM ativo
UPDATE public."SAAS_CRM_Leads" l
SET "instanceName" = c."instanceName"
FROM public."SAAS_Conexões" c
WHERE l."idUsuario" = c."idUsuario"
  AND c."crmAtivo" = true
  AND l."instanceName" IS NULL;