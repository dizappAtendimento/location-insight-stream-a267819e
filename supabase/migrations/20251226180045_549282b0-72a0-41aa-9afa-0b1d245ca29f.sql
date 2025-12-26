-- Migrar dados do usuário antigo para o novo ID do Google OAuth
-- ID antigo: 9c3ed72d-5229-491d-b0bf-fc885c004d69 (atendimentodizapp@gmail.com)
-- ID novo (Google): 0c2081c2-f750-4a89-9911-bbda1fe9c46a

-- 1. Migrar listas
UPDATE "SAAS_Listas" SET "idUsuario" = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' 
WHERE "idUsuario" = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

-- 2. Migrar conexões
UPDATE "SAAS_Conexões" SET "idUsuario" = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' 
WHERE "idUsuario" = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

-- 3. Migrar contatos
UPDATE "SAAS_Contatos" SET "idUsuario" = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' 
WHERE "idUsuario" = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

-- 4. Migrar grupos
UPDATE "SAAS_Grupos" SET "idUsuario" = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' 
WHERE "idUsuario" = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

-- 5. Migrar disparos
UPDATE "SAAS_Disparos" SET "userId" = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' 
WHERE "userId" = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

-- 6. Migrar colunas CRM
UPDATE "SAAS_CRM_Colunas" SET "idUsuario" = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' 
WHERE "idUsuario" = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

-- 7. Migrar leads CRM
UPDATE "SAAS_CRM_Leads" SET "idUsuario" = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' 
WHERE "idUsuario" = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

-- 8. Migrar chat labels
UPDATE "SAAS_Chat_Labels" SET "idUsuario" = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' 
WHERE "idUsuario" = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

-- 9. Migrar maturador
UPDATE "SAAS_Maturador" SET "userId" = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' 
WHERE "userId" = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

-- 10. Migrar search_jobs
UPDATE "search_jobs" SET "user_id" = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' 
WHERE "user_id" = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

-- 11. Deletar role antigo e adicionar ao novo (se não existir)
DELETE FROM "user_roles" WHERE user_id = '9c3ed72d-5229-491d-b0bf-fc885c004d69';
INSERT INTO "user_roles" (user_id, role) VALUES ('0c2081c2-f750-4a89-9911-bbda1fe9c46a', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 12. Copiar dados do plano e validade para o novo usuário
UPDATE "SAAS_Usuarios" AS new_user
SET 
  plano = old_user.plano,
  "dataValidade" = old_user."dataValidade",
  plano_extrator = old_user.plano_extrator,
  "dataValidade_extrator" = old_user."dataValidade_extrator",
  telefone = old_user.telefone,
  apikey_gpt = old_user.apikey_gpt
FROM "SAAS_Usuarios" AS old_user
WHERE new_user.id = '0c2081c2-f750-4a89-9911-bbda1fe9c46a'
  AND old_user.id = '9c3ed72d-5229-491d-b0bf-fc885c004d69';

-- 13. Deletar usuário antigo duplicado
DELETE FROM "SAAS_Usuarios" WHERE id = '9c3ed72d-5229-491d-b0bf-fc885c004d69';