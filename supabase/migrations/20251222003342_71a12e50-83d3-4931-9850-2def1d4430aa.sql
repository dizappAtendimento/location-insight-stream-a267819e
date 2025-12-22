-- Atualizar trigger do Google para atribuir plano Trial automaticamente
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
BEGIN
  -- Extrair dados do usuário do Google
  v_nome := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );
  v_email := NEW.email;
  v_avatar := NEW.raw_user_meta_data ->> 'avatar_url';

  -- Buscar plano Trial
  SELECT id, "diasValidade" INTO v_trial_plan_id, v_trial_dias
  FROM public."SAAS_Planos"
  WHERE nome = 'Trial' AND tipo = 'disparador'
  LIMIT 1;

  -- Calcular data de validade
  v_data_validade := CURRENT_DATE + COALESCE(v_trial_dias, 3);

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
    );
  END IF;

  RETURN NEW;
END;
$function$;