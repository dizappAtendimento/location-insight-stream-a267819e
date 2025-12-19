-- Função para sincronizar usuários do Google com SAAS_Usuarios
CREATE OR REPLACE FUNCTION public.handle_google_user_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_nome text;
  v_email text;
  v_avatar text;
BEGIN
  -- Extrair dados do usuário do Google
  v_nome := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );
  v_email := NEW.email;
  v_avatar := NEW.raw_user_meta_data ->> 'avatar_url';

  -- Verificar se já existe um usuário com este email
  IF EXISTS (SELECT 1 FROM public."SAAS_Usuarios" WHERE "Email" = v_email) THEN
    -- Atualizar o id do usuário existente para vincular com auth.users
    UPDATE public."SAAS_Usuarios"
    SET 
      id = NEW.id,
      nome = COALESCE(nome, v_nome),
      avatar_url = COALESCE(avatar_url, v_avatar)
    WHERE "Email" = v_email;
  ELSE
    -- Criar novo usuário
    INSERT INTO public."SAAS_Usuarios" (id, nome, "Email", avatar_url, status, "Status Ex")
    VALUES (NEW.id, v_nome, v_email, v_avatar, false, false);
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger para sincronizar quando um novo usuário é criado
DROP TRIGGER IF EXISTS on_auth_user_created_sync_saas ON auth.users;
CREATE TRIGGER on_auth_user_created_sync_saas
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_google_user_sync();