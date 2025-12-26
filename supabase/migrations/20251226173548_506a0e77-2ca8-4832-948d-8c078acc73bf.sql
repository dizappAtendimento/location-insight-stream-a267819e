
-- 1. Deletar o registro duplicado (o novo criado pelo trigger)
DELETE FROM public."SAAS_Usuarios" 
WHERE id = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

-- 2. Atualizar o email do registro original para o Gmail (para sincronizar com Google Auth)
UPDATE public."SAAS_Usuarios" 
SET "Email" = 'atendimentodizapp@gmail.com'
WHERE id = '0c2081c2-f750-4a89-9911-bbda1fe9c46a';

-- 3. Atualizar user_roles para o ID correto
UPDATE public.user_roles 
SET user_id = '0c2081c2-f750-4a89-9911-bbda1fe9c46a'
WHERE user_id = '9c3ed72d-5229-491d-b0bf-fc885c004d69';
