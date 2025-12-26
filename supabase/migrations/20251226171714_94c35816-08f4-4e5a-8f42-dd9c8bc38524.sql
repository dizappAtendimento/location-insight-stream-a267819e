-- Fix search_path for functions that don't have it set

-- Fix f_start_disparo
CREATE OR REPLACE FUNCTION public.f_start_disparo()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$ BEGIN
  IF OLD."Status"='pending' AND NEW."Status" IN ('processing','sent','failed') THEN
    UPDATE public."SAAS_Disparos" SET "StatusDisparo"='Em andamento'
     WHERE id=NEW."idDisparo" AND "StatusDisparo"='Aguardando';
  END IF;
  RETURN NEW;
END $function$;

-- Fix f_block_delete_conexao_if_active
CREATE OR REPLACE FUNCTION public.f_block_delete_conexao_if_active()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$ BEGIN
  IF EXISTS (SELECT 1 FROM public."SAAS_Detalhes_Disparos" WHERE "idConexao"=OLD.id AND "Status" IN ('pending','processing')) THEN
    RAISE EXCEPTION 'Não é possível excluir a conexão %, há disparos pendentes/processing vinculados', OLD.id;
  END IF;
  RETURN OLD;
END $function$;

-- Fix f_finalize_disparo
CREATE OR REPLACE FUNCTION public.f_finalize_disparo()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$ BEGIN
  IF NEW."Status" IN ('sent','failed') AND OLD."Status" IS DISTINCT FROM NEW."Status" THEN
    UPDATE public."SAAS_Disparos"
       SET "MensagensDisparadas" = COALESCE("MensagensDisparadas",0) + 1
     WHERE id = NEW."idDisparo";

    PERFORM 1 FROM public."SAAS_Detalhes_Disparos"
     WHERE "idDisparo"=NEW."idDisparo" AND "Status" IN ('pending','processing');

    IF NOT FOUND THEN
      UPDATE public."SAAS_Disparos" SET "StatusDisparo"='Finalizado' WHERE id=NEW."idDisparo";
    END IF;
  END IF;
  RETURN NEW;
END $function$;

-- Fix f_block_delete_lista_if_active
CREATE OR REPLACE FUNCTION public.f_block_delete_lista_if_active()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$ BEGIN
  IF EXISTS (
    SELECT 1 FROM public."SAAS_Detalhes_Disparos" d
    JOIN public."SAAS_Contatos" c ON c.id = d."idContato"
    WHERE c."idLista" = OLD.id AND d."Status" IN ('pending','processing')
  ) OR EXISTS (
    SELECT 1 FROM public."SAAS_Detalhes_Disparos" d
    JOIN public."SAAS_Grupos" g ON g.id = d."idGrupo"
    WHERE g."idLista" = OLD.id AND d."Status" IN ('pending','processing')
  ) THEN
    RAISE EXCEPTION 'Não é possível excluir a lista %, há disparos pendentes/processing vinculados', OLD.id;
  END IF;
  RETURN OLD;
END $function$;

-- Fix f_block_delete_contato_if_active
CREATE OR REPLACE FUNCTION public.f_block_delete_contato_if_active()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$ BEGIN
  IF EXISTS (SELECT 1 FROM public."SAAS_Detalhes_Disparos" WHERE "idContato"=OLD.id AND "Status" IN ('pending','processing')) THEN
    RAISE EXCEPTION 'Não é possível excluir o contato %, há disparos pendentes/processing vinculados', OLD.id;
  END IF;
  RETURN OLD;
END $function$;

-- Fix f_block_delete_grupo_if_active
CREATE OR REPLACE FUNCTION public.f_block_delete_grupo_if_active()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$ BEGIN
  IF EXISTS (SELECT 1 FROM public."SAAS_Detalhes_Disparos" WHERE "idGrupo"=OLD.id AND "Status" IN ('pending','processing')) THEN
    RAISE EXCEPTION 'Não é possível excluir o grupo %, há disparos pendentes/processing vinculados', OLD.id;
  END IF;
  RETURN OLD;
END $function$;

-- Fix p_expire_users_daily
CREATE OR REPLACE FUNCTION public.p_expire_users_daily()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  UPDATE public."SAAS_Usuarios" u
     SET status = FALSE
   WHERE u.status IS DISTINCT FROM FALSE
     AND u."dataValidade" IS NOT NULL
     AND CURRENT_DATE > u."dataValidade";
END;
$function$;

-- Fix update_crm_lead_updated_at
CREATE OR REPLACE FUNCTION public.update_crm_lead_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix cleanup_old_search_jobs (already has SECURITY DEFINER, add search_path)
CREATE OR REPLACE FUNCTION public.cleanup_old_search_jobs()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.search_jobs 
  WHERE created_at < now() - interval '24 hours';
END;
$function$;

-- Fix get_contatos_by_lista
CREATE OR REPLACE FUNCTION public.get_contatos_by_lista(p_id_lista bigint)
 RETURNS SETOF "SAAS_Contatos"
 LANGUAGE sql
 STABLE
 SET search_path = public
AS $function$
  SELECT * FROM public."SAAS_Contatos" WHERE "idLista"=p_id_lista
$function$;

-- Fix get_grupos_by_lista
CREATE OR REPLACE FUNCTION public.get_grupos_by_lista(p_id_lista bigint)
 RETURNS SETOF "SAAS_Grupos"
 LANGUAGE sql
 STABLE
 SET search_path = public
AS $function$
  SELECT * FROM public."SAAS_Grupos" WHERE "idLista"=p_id_lista
$function$;

-- Fix f_saudacao
CREATE OR REPLACE FUNCTION public.f_saudacao(p_ts timestamp with time zone)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path = public
AS $function$
  SELECT CASE
           WHEN (p_ts AT TIME ZONE 'America/Sao_Paulo')::time BETWEEN TIME '05:00' AND TIME '11:59' THEN 'bom dia'
           WHEN (p_ts AT TIME ZONE 'America/Sao_Paulo')::time BETWEEN TIME '12:00' AND TIME '17:59' THEN 'boa tarde'
           ELSE 'boa noite'
         END
$function$;

-- Fix f_next_valid_time
CREATE OR REPLACE FUNCTION public.f_next_valid_time(p_ts timestamp with time zone, p_start time without time zone, p_end time without time zone, p_days integer[])
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 STABLE
 SET search_path = public
AS $function$
DECLARE v_local timestamp;
BEGIN
  LOOP
    v_local := p_ts AT TIME ZONE 'America/Sao_Paulo';
    IF v_local::time < p_start THEN
      v_local := date_trunc('day', v_local) + p_start;
    ELSIF v_local::time > p_end THEN
      v_local := date_trunc('day', v_local + interval '1 day') + p_start;
    END IF;

    IF p_days IS NULL OR array_length(p_days,1) IS NULL
       OR extract(isodow FROM v_local) = ANY(p_days)
    THEN
      RETURN v_local AT TIME ZONE 'America/Sao_Paulo';
    END IF;

    v_local := date_trunc('day', v_local + interval '1 day') + p_start;
    p_ts    := v_local AT TIME ZONE 'America/Sao_Paulo';
  END LOOP;
END
$function$;

-- Fix f_render_message
CREATE OR REPLACE FUNCTION public.f_render_message(p_template text, p_nome text, p_attrs jsonb, p_send_ts timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path = public
AS $function$
DECLARE v_msg TEXT := COALESCE(p_template,''); v_token TEXT; v_val TEXT; v_rec TEXT[];
BEGIN
  FOR v_rec IN SELECT regexp_matches(v_msg, '<([^>]+)>', 'g') LOOP
    v_token := v_rec[1];
    IF v_token='nome' THEN v_val := COALESCE(p_nome,'');
    ELSIF v_token='data' THEN v_val := to_char(p_send_ts AT TIME ZONE 'America/Sao_Paulo','DD/MM/YYYY');
    ELSIF v_token='diadasemana' THEN
      v_val := lower(to_char(p_send_ts AT TIME ZONE 'America/Sao_Paulo','TMDay'));
      v_val := replace(replace(replace(replace(replace(replace(replace(
               v_val,'monday','segunda-feira'),'tuesday','terça-feira'),
               'wednesday','quarta-feira'),'thursday','quinta-feira'),
               'friday','sexta-feira'),'saturday','sábado'),'sunday','domingo');
    ELSIF v_token='hora' THEN v_val := to_char(p_send_ts AT TIME ZONE 'America/Sao_Paulo','HH24:MI');
    ELSIF v_token='mes' THEN v_val := lower(to_char(p_send_ts AT TIME ZONE 'America/Sao_Paulo','TMMonth'));
    ELSIF v_token='saudacao' THEN v_val := public.f_saudacao(p_send_ts);
    ELSE v_val := COALESCE(p_attrs ->> v_token,'');
    END IF;
    v_msg := replace(v_msg, '<'||v_token||'>', COALESCE(v_val,''));
  END LOOP;
  RETURN v_msg;
END
$function$;