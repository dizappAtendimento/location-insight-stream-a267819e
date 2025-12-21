-- Atualizar o lead com instanceName TESTE para mostrar a conexão correta
UPDATE public."SAAS_CRM_Leads" 
SET "instanceName" = 'FIRE TV-ARWYML'
WHERE "instanceName" = 'TESTE';