-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the function with better conflict handling
CREATE OR REPLACE FUNCTION public.handle_google_user_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_nome text;
  v_email text;
  v_avatar text;
  v_trial_plan_id bigint;
  v_trial_dias int;
  v_data_validade date;
  v_existing_id uuid;
BEGIN
  -- Extrair dados do usuário do Google
  v_nome := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );
  v_email := NEW.email;
  v_avatar := NEW.raw_user_meta_data ->> 'avatar_url';

  -- Verificar se já existe um usuário com este email OU com este ID
  SELECT id INTO v_existing_id 
  FROM public."SAAS_Usuarios" 
  WHERE "Email" = v_email OR id = NEW.id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Usuário já existe, apenas atualizar o ID e dados básicos
    UPDATE public."SAAS_Usuarios"
    SET 
      id = NEW.id,
      nome = COALESCE(nome, v_nome),
      avatar_url = COALESCE(avatar_url, v_avatar)
    WHERE "Email" = v_email OR id = v_existing_id;
    
    RETURN NEW;
  END IF;

  -- Buscar plano Trial para novo usuário
  SELECT id, "diasValidade" INTO v_trial_plan_id, v_trial_dias
  FROM public."SAAS_Planos"
  WHERE nome = 'Trial' AND tipo = 'disparador'
  LIMIT 1;

  -- Calcular data de validade
  v_data_validade := CURRENT_DATE + COALESCE(v_trial_dias, 3);

  -- Criar novo usuário com plano Trial
  INSERT INTO public."SAAS_Usuarios" (
    id, nome, "Email", avatar_url, 
    status, "Status Ex",
    plano, "dataValidade"
  )
  VALUES (
    NEW.id, v_nome, v_email, v_avatar, 
    CASE WHEN v_trial_plan_id IS NOT NULL THEN true ELSE false END, 
    false,
    v_trial_plan_id, 
    CASE WHEN v_trial_plan_id IS NOT NULL THEN v_data_validade ELSE NULL END
  )
  ON CONFLICT ("Email") DO UPDATE SET
    id = EXCLUDED.id,
    nome = COALESCE(public."SAAS_Usuarios".nome, EXCLUDED.nome),
    avatar_url = COALESCE(public."SAAS_Usuarios".avatar_url, EXCLUDED.avatar_url);

  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_google_user_sync();