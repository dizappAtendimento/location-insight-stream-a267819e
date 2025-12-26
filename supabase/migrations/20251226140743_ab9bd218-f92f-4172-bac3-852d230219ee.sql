-- Função para criar usuário em SAAS_Usuarios quando faz login via Google/OAuth
CREATE OR REPLACE FUNCTION public.handle_google_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  trial_plan_id bigint;
  trial_days integer;
  expiry_date date;
BEGIN
  -- Só processa se o usuário ainda não existe em SAAS_Usuarios
  IF NOT EXISTS (SELECT 1 FROM public."SAAS_Usuarios" WHERE id = NEW.id) THEN
    -- Busca plano Trial
    SELECT id, "diasValidade" INTO trial_plan_id, trial_days
    FROM public."SAAS_Planos"
    WHERE nome = 'Trial' AND tipo = 'disparador'
    LIMIT 1;
    
    -- Calcula data de expiração
    IF trial_days IS NOT NULL THEN
      expiry_date := CURRENT_DATE + trial_days;
    ELSE
      expiry_date := CURRENT_DATE + 7; -- Default 7 dias
    END IF;
    
    -- Insere o novo usuário
    INSERT INTO public."SAAS_Usuarios" (
      id,
      "Email",
      nome,
      avatar_url,
      plano,
      "dataValidade",
      status,
      "Status Ex",
      created_at
    ) VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
      NEW.raw_user_meta_data->>'avatar_url',
      trial_plan_id,
      expiry_date,
      true,
      false,
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Remove trigger antigo se existir
DROP TRIGGER IF EXISTS on_auth_user_created_saas ON auth.users;

-- Cria trigger para novos usuários
CREATE TRIGGER on_auth_user_created_saas
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_google_auth_user();