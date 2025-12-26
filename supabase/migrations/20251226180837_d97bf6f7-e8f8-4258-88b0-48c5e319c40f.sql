-- Corrigir problema de duplicação de usuários para login Google
-- O usuário com Google OAuth ID 0c2081c2-f750-4a89-9911-bbda1fe9c46a está com email errado
-- E há um usuário duplicado 9c3ed72d-5229-491d-b0bf-fc885c004d69 que precisa ser removido

-- 1. Primeiro, migrar dados do usuário antigo (9c3ed72d) para o novo (0c2081c2) se houver
UPDATE "SAAS_Listas" SET "idUsuario" = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' 
WHERE "idUsuario" = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

UPDATE "SAAS_Conexões" SET "idUsuario" = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' 
WHERE "idUsuario" = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

UPDATE "SAAS_Contatos" SET "idUsuario" = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' 
WHERE "idUsuario" = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

UPDATE "SAAS_Grupos" SET "idUsuario" = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' 
WHERE "idUsuario" = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

UPDATE "SAAS_Disparos" SET "userId" = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' 
WHERE "userId" = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

UPDATE "SAAS_CRM_Colunas" SET "idUsuario" = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' 
WHERE "idUsuario" = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

UPDATE "SAAS_CRM_Leads" SET "idUsuario" = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' 
WHERE "idUsuario" = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

UPDATE "SAAS_Chat_Labels" SET "idUsuario" = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' 
WHERE "idUsuario" = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

UPDATE "SAAS_Maturador" SET "userId" = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' 
WHERE "userId" = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

UPDATE "search_jobs" SET "user_id" = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' 
WHERE "user_id" = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

-- 2. Garantir que admin role está no ID correto
DELETE FROM "user_roles" WHERE user_id = '9c3ed72d-5229-491d-b0bf-fc885c004d69';
INSERT INTO "user_roles" (user_id, role) VALUES ('0c2081c2-f750-4a89-9911-bbda1fe9c46a', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Deletar o usuário duplicado
DELETE FROM "SAAS_Usuarios" WHERE id = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

-- 4. Atualizar o email do usuário correto para o email do Gmail
UPDATE "SAAS_Usuarios" 
SET "Email" = 'atendimentodizapp@gmail.com'
WHERE id = '0c2081c2-f750-4a89-9911-bbda1fe9c46a';