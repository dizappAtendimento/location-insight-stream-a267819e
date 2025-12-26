-- Definir a senha para o usuário que foi criado via Google OAuth
UPDATE "SAAS_Usuarios" 
SET senha = '@Apocalipse12_'
WHERE id = '0c2081c2-f750-4a89-9911-bbda1fe9c46a' AND "Email" = 'atendimentodizapp@gmail.com';