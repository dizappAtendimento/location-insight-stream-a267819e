-- Fix remaining functions with mutable search_path

-- Fix create_disparo
CREATE OR REPLACE FUNCTION public.create_disparo(p_payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  v_user_id   uuid    := (p_payload ->> 'userId')::uuid;
  v_fake_call boolean := COALESCE((p_payload #>> '{settings,fakecall}')::boolean, false);
  v_messages  jsonb[] := ARRAY(SELECT m FROM jsonb_array_elements(COALESCE(p_payload->'mensagens','[]'::jsonb)) m);
  v_msg_count int     := COALESCE(array_length(v_messages, 1), 0);
  v_conn_ids  bigint[] := COALESCE(ARRAY(SELECT (c->>'id')::bigint FROM jsonb_array_elements(COALESCE(p_payload->'connections','[]'::jsonb)) c WHERE (c->>'id') ~ '^\d+$'), array[]::bigint[]);
  v_conn_count int := COALESCE(array_length(v_conn_ids,1),0);
  v_list_ids  bigint[] := COALESCE(ARRAY(SELECT (x)::bigint FROM jsonb_array_elements_text(COALESCE(p_payload->'idLista','[]'::jsonb)) x), array[]::bigint[]);
  v_interval_min  int  := COALESCE((p_payload #>> '{settings,intervalMin}')::int, 30);
  v_interval_max  int  := COALESCE((p_payload #>> '{settings,intervalMax}')::int, 60);
  v_pause_after   int  := COALESCE((p_payload #>> '{settings,pauseAfterMessages}')::int, 0);
  v_pause_minutes int  := COALESCE((p_payload #>> '{settings,pauseMinutes}')::int, 0);
  v_start_time    time := COALESCE((p_payload #>> '{settings,startTime}')::time, time '08:00');
  v_end_time      time := COALESCE((p_payload #>> '{settings,endTime}')::time,   time '18:00');
  v_days int[] := COALESCE(ARRAY(SELECT CASE WHEN dtxt='0' THEN 7 ELSE dtxt::int END FROM jsonb_array_elements_text(COALESCE(p_payload->'settings'->'selectedDays','[]'::jsonb)) WITH ORDINALITY AS t(dtxt,ord) WHERE dtxt ~ '^\d+$' ORDER BY ord), array[]::int[]);
  v_schedule_base timestamptz := COALESCE((p_payload #>> '{settings,scheduleData}')::timestamptz, now() + interval '2 minutes');
  v_cur_ts     timestamptz := public.f_next_valid_time(v_schedule_base, v_start_time, v_end_time, v_days);
  v_disparo_id bigint; v_first_ts timestamptz; v_total int := 0; v_idx_msg int := 1; v_idx_conn int := 1; v_counter int := 0; v_gap int;
  v_msg_obj jsonb; v_template text; v_media_hash text; v_conn_id bigint; v_rendered text; rec_cont record;
  v_limit_plan bigint; v_used_month bigint; v_to_send bigint; v_total_after bigint;
  v_month_start timestamptz := (date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo');
  v_next_month  timestamptz := ((date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') + interval '1 month') AT TIME ZONE 'America/Sao_Paulo');
BEGIN
  SELECT p."qntDisparos"::bigint INTO v_limit_plan
    FROM public."SAAS_Usuarios" u LEFT JOIN public."SAAS_Planos" p ON p.id = u.plano
   WHERE u.id = v_user_id;

  IF v_limit_plan IS NOT NULL THEN
    SELECT COALESCE(COUNT(*),0)::bigint INTO v_used_month
      FROM public."SAAS_Detalhes_Disparos" d JOIN public."SAAS_Disparos" h ON h.id = d."idDisparo"
     WHERE h."userId" = v_user_id AND d."dataEnvio" >= v_month_start AND d."dataEnvio" < v_next_month;

    WITH ids AS (SELECT DISTINCT unnest(v_list_ids) AS id_lista),
    base AS (SELECT DISTINCT c.telefone FROM public."SAAS_Contatos" c JOIN ids ON ids.id_lista = c."idLista"
             WHERE c."idUsuario" = v_user_id AND c.telefone IS NOT NULL)
    SELECT COALESCE(COUNT(*),0)::bigint INTO v_to_send FROM base;

    v_total_after := v_used_month + v_to_send;
    IF v_total_after > v_limit_plan THEN
      RAISE EXCEPTION 'limite atingido: % usados + % a enviar = %, limite do plano = %', v_used_month, v_to_send, v_total_after, v_limit_plan USING ERRCODE='P0001';
    END IF;
  END IF;

  INSERT INTO public."SAAS_Disparos"
    ("Mensagens","TipoDisparo","TotalDisparos","MensagensDisparadas","StatusDisparo","userId","idListas","idConexoes",
     "intervaloMin","intervaloMax","PausaAposMensagens","PausaMinutos","StartTime","EndTime","DiasSelecionados","DataAgendamento")
  VALUES (v_messages,'Individual',0,0,'Aguardando',v_user_id,v_list_ids,v_conn_ids,v_interval_min,v_interval_max,v_pause_after,v_pause_minutes,
          v_start_time,v_end_time,v_days::smallint[], CASE WHEN p_payload #>> '{settings,scheduleData}' IS NOT NULL THEN v_schedule_base ELSE NULL END)
  RETURNING id INTO v_disparo_id;

  FOR rec_cont IN
    WITH ids AS (SELECT DISTINCT unnest(v_list_ids) AS id_lista)
    SELECT DISTINCT ON (c.telefone) c.id, c.telefone, c.nome, c.atributos
      FROM public."SAAS_Contatos" c JOIN ids ON ids.id_lista = c."idLista"
     WHERE c."idUsuario" = v_user_id AND c.telefone IS NOT NULL
     ORDER BY c.telefone, c.id
  LOOP
    v_msg_obj  := v_messages[v_idx_msg];
    v_idx_msg  := (v_idx_msg % v_msg_count) + 1;
    v_template := v_msg_obj->>'text';
    v_media_hash := NULLIF(COALESCE(v_msg_obj->'media'->>'link', v_msg_obj->'media'->>'hashredis',''),'');

    v_conn_id := CASE WHEN v_conn_count > 0 THEN v_conn_ids[v_idx_conn] END;
    IF v_conn_count > 0 THEN v_idx_conn := (v_idx_conn % v_conn_count) + 1; END IF;

    IF v_pause_after > 0 AND v_counter > 0 AND v_counter % v_pause_after = 0 THEN
      v_cur_ts := public.f_next_valid_time(v_cur_ts + make_interval(mins => v_pause_minutes), v_start_time, v_end_time, v_days);
    END IF;

    v_rendered := public.f_render_message(v_template, rec_cont.nome, rec_cont.atributos, v_cur_ts);

    INSERT INTO public."SAAS_Detalhes_Disparos"
      ("idDisparo","idContato","Mensagem","idConexao","dataEnvio","Status","KeyRedis","FakeCall")
    VALUES (v_disparo_id, rec_cont.id, v_rendered, v_conn_id, v_cur_ts, 'pending', v_media_hash, v_fake_call);

    IF v_total = 0 THEN v_first_ts := v_cur_ts; END IF;

    v_total := v_total + 1; v_counter := v_counter + 1;
    v_gap := v_interval_min + floor(random() * (v_interval_max - v_interval_min + 1))::int;
    v_cur_ts := public.f_next_valid_time(v_cur_ts + make_interval(secs => v_gap), v_start_time, v_end_time, v_days);
  END LOOP;

  UPDATE public."SAAS_Disparos"
     SET "TotalDisparos"=v_total,
         "StatusDisparo"=CASE WHEN v_first_ts > now() THEN 'Aguardando' ELSE 'Em andamento' END
   WHERE id=v_disparo_id;

  RETURN v_disparo_id;
END
$function$;

-- Fix create_disparo_grupo
CREATE OR REPLACE FUNCTION public.create_disparo_grupo(p_payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  v_user_id      uuid    := (p_payload->>'userId')::uuid;
  v_mention_all  boolean := coalesce((p_payload#>>'{settings,mencionarTodos}')::boolean,false);
  v_messages  jsonb[] := ARRAY(SELECT m FROM jsonb_array_elements(COALESCE(p_payload->'mensagens','[]'::jsonb)) m);
  v_msg_count int     := coalesce(array_length(v_messages,1),0);
  v_conn_id bigint := (SELECT (c->>'id')::bigint FROM jsonb_array_elements(COALESCE(p_payload->'connections','[]'::jsonb)) c WHERE (c->>'id') ~ '^\d+$' ORDER BY 1 LIMIT 1);
  v_list_ids bigint[] := COALESCE(ARRAY(SELECT (x)::bigint FROM jsonb_array_elements_text(COALESCE(p_payload->'idLista','[]'::jsonb)) x), array[]::bigint[]);
  v_month_start timestamptz := (date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo');
  v_next_month  timestamptz := ((date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') + interval '1 month') AT TIME ZONE 'America/Sao_Paulo');
  v_limit_plan bigint; v_used_month bigint; v_to_send bigint; v_total_after bigint;
  v_schedule_base timestamptz := COALESCE((p_payload#>>'{settings,scheduleData}')::timestamptz, now() + interval '2 minutes');
  v_cur_ts timestamptz := v_schedule_base; v_disparo_id bigint; v_first_ts timestamptz; v_total int := 0; v_idx_msg int := 1;
  v_msg_obj jsonb; v_template text; v_media_hash text; v_rendered text; rec_grupo record;
BEGIN
  SELECT p."qntDisparos"::bigint INTO v_limit_plan
    FROM public."SAAS_Usuarios" u LEFT JOIN public."SAAS_Planos" p ON p.id = u.plano
   WHERE u.id = v_user_id;

  IF v_limit_plan IS NOT NULL THEN
    SELECT COALESCE(COUNT(*),0)::bigint INTO v_used_month
      FROM public."SAAS_Detalhes_Disparos" d JOIN public."SAAS_Disparos" h ON h.id = d."idDisparo"
     WHERE h."userId" = v_user_id AND d."dataEnvio" >= v_month_start AND d."dataEnvio" < v_next_month;

    WITH ids AS (SELECT DISTINCT unnest(v_list_ids) AS id_lista),
    base AS (SELECT DISTINCT g."WhatsAppId" FROM public."SAAS_Grupos" g JOIN ids ON ids.id_lista = g."idLista"
             WHERE g."idUsuario"=v_user_id AND g."WhatsAppId" IS NOT NULL)
    SELECT COALESCE(COUNT(*),0)::bigint INTO v_to_send FROM base;

    v_total_after := v_used_month + v_to_send;
    IF v_total_after > v_limit_plan THEN
      RAISE EXCEPTION 'limite atingido: % usados + % a enviar = %, limite do plano = %', v_used_month, v_to_send, v_total_after, v_limit_plan USING ERRCODE='P0001';
    END IF;
  END IF;

  INSERT INTO public."SAAS_Disparos"
    ("Mensagens","TipoDisparo","TotalDisparos","MensagensDisparadas","StatusDisparo","userId","idListas","idConexoes","DataAgendamento")
  VALUES (v_messages,'Grupos',0,0,'Aguardando',v_user_id,v_list_ids,CASE WHEN v_conn_id IS NOT NULL THEN ARRAY[v_conn_id] ELSE NULL END,v_schedule_base)
  RETURNING id INTO v_disparo_id;

  FOR rec_grupo IN
    WITH ids AS (SELECT unnest(v_list_ids) AS id_lista)
    SELECT DISTINCT ON (g."WhatsAppId") g.id, g."WhatsAppId", g.nome, g.atributos
      FROM public."SAAS_Grupos" g JOIN ids ON ids.id_lista = g."idLista"
     WHERE g."idUsuario"=v_user_id AND g."WhatsAppId" IS NOT NULL
     ORDER BY g."WhatsAppId", g.id
  LOOP
    v_msg_obj := v_messages[v_idx_msg]; v_idx_msg := (v_idx_msg % v_msg_count) + 1;
    v_template := v_msg_obj->>'text';
    v_media_hash := NULLIF(COALESCE(v_msg_obj->'media'->>'link', v_msg_obj->'media'->>'hashredis',''),'');

    v_rendered := public.f_render_message(v_template, rec_grupo.nome, rec_grupo.atributos, v_cur_ts);

    INSERT INTO public."SAAS_Detalhes_Disparos"
      ("idDisparo","idContato","idGrupo","Mensagem","idConexao","dataEnvio","Status","KeyRedis","FakeCall")
    VALUES (v_disparo_id, NULL, rec_grupo.id, v_rendered, v_conn_id, v_cur_ts, 'pending', v_media_hash, v_mention_all);

    IF v_total = 0 THEN v_first_ts := v_cur_ts; END IF;
    v_total := v_total + 1;
    v_cur_ts := v_cur_ts + interval '15 seconds';
  END LOOP;

  UPDATE public."SAAS_Disparos"
     SET "TotalDisparos"=v_total,
         "StatusDisparo"=CASE WHEN v_first_ts > now() THEN 'Aguardando' ELSE 'Em andamento' END
   WHERE id=v_disparo_id;

  RETURN v_disparo_id;
END
$function$;

-- Fix delete_disparo (both overloads)
CREATE OR REPLACE FUNCTION public.delete_disparo(p_disparo_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
AS $function$ BEGIN
  DELETE FROM public."SAAS_Detalhes_Disparos" WHERE "idDisparo"=p_disparo_id;
  DELETE FROM public."SAAS_Disparos" WHERE id=p_disparo_id;
END $function$;

CREATE OR REPLACE FUNCTION public.delete_disparo(p_disparo_id bigint, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
AS $function$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."SAAS_Disparos" WHERE id=p_disparo_id AND "userId"=p_user_id) THEN
    RAISE EXCEPTION 'Usuário inválido';
  END IF;
  DELETE FROM public."SAAS_Detalhes_Disparos" WHERE "idDisparo"=p_disparo_id;
  DELETE FROM public."SAAS_Disparos" WHERE id=p_disparo_id;
END $function$;

-- Fix pause_disparo (both overloads)
CREATE OR REPLACE FUNCTION public.pause_disparo(p_disparo_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
AS $function$ BEGIN
  UPDATE public."SAAS_Disparos" SET "StatusDisparo"='Pausado' WHERE id=p_disparo_id;
END $function$;

CREATE OR REPLACE FUNCTION public.pause_disparo(p_disparo_id bigint, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
AS $function$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."SAAS_Disparos" WHERE id=p_disparo_id AND "userId"=p_user_id) THEN
    RAISE EXCEPTION 'Usuário inválido';
  END IF;
  UPDATE public."SAAS_Disparos" SET "StatusDisparo"='Pausado' WHERE id=p_disparo_id;
END $function$;

-- Fix resume_disparo (both overloads)
CREATE OR REPLACE FUNCTION public.resume_disparo(p_disparo_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE hdr record; v_cur_ts timestamptz; v_counter int := 0; v_gap int; rec_det record;
BEGIN
  SELECT * INTO hdr FROM public."SAAS_Disparos" WHERE id = p_disparo_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Disparo % não existe', p_disparo_id; END IF;

  UPDATE public."SAAS_Disparos" SET "StatusDisparo"='Em andamento' WHERE id=p_disparo_id AND "StatusDisparo"='Pausado';

  v_cur_ts := public.f_next_valid_time(now() + interval '1 minute', hdr."StartTime", hdr."EndTime", COALESCE(hdr."DiasSelecionados",ARRAY[]::smallint[])::int[]);

  FOR rec_det IN SELECT * FROM public."SAAS_Detalhes_Disparos" WHERE "idDisparo"=p_disparo_id AND "Status"='pending' ORDER BY id LOOP
    IF COALESCE(hdr."PausaAposMensagens",0) > 0 AND v_counter > 0 AND v_counter % hdr."PausaAposMensagens" = 0 THEN
      v_cur_ts := public.f_next_valid_time(v_cur_ts + make_interval(mins => hdr."PausaMinutos"), hdr."StartTime", hdr."EndTime", COALESCE(hdr."DiasSelecionados",ARRAY[]::smallint[])::int[]);
    END IF;

    UPDATE public."SAAS_Detalhes_Disparos" SET "dataEnvio"=v_cur_ts WHERE id=rec_det.id;

    v_counter := v_counter + 1;
    v_gap := COALESCE(hdr."intervaloMin",15) + floor(random() * (COALESCE(hdr."intervaloMax",15) - COALESCE(hdr."intervaloMin",15) + 1))::int;
    v_cur_ts := public.f_next_valid_time(v_cur_ts + make_interval(secs => v_gap), hdr."StartTime", hdr."EndTime", COALESCE(hdr."DiasSelecionados",ARRAY[]::smallint[])::int[]);
  END LOOP;
END
$function$;

CREATE OR REPLACE FUNCTION public.resume_disparo(p_disparo_id bigint, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE hdr record; v_base_ts timestamptz; v_cur_ts timestamptz; v_counter int := 0; v_gap int; rec_det record;
BEGIN
  SELECT * INTO hdr FROM public."SAAS_Disparos" WHERE id=p_disparo_id AND "userId"=p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Usuário inválido'; END IF;

  hdr."intervaloMin"       := COALESCE(hdr."intervaloMin",15);
  hdr."intervaloMax"       := COALESCE(hdr."intervaloMax",15);
  hdr."PausaAposMensagens" := COALESCE(hdr."PausaAposMensagens",0);
  hdr."PausaMinutos"       := COALESCE(hdr."PausaMinutos",0);
  hdr."StartTime"          := COALESCE(hdr."StartTime", time '00:00');
  hdr."EndTime"            := COALESCE(hdr."EndTime",   time '23:59:59');

  UPDATE public."SAAS_Disparos" SET "StatusDisparo"='Em andamento' WHERE id=p_disparo_id AND "StatusDisparo"='Pausado';

  v_base_ts := now() + interval '1 minute';
  IF hdr."DataAgendamento" IS NOT NULL AND hdr."DataAgendamento" > v_base_ts THEN v_base_ts := hdr."DataAgendamento"; END IF;

  v_cur_ts := public.f_next_valid_time(v_base_ts, hdr."StartTime", hdr."EndTime", COALESCE(hdr."DiasSelecionados",ARRAY[]::smallint[])::int[]);

  FOR rec_det IN SELECT * FROM public."SAAS_Detalhes_Disparos" WHERE "idDisparo"=p_disparo_id AND "Status"='pending' ORDER BY id LOOP
    IF hdr."PausaAposMensagens" > 0 AND v_counter > 0 AND v_counter % hdr."PausaAposMensagens" = 0 THEN
      v_cur_ts := public.f_next_valid_time(v_cur_ts + make_interval(mins => hdr."PausaMinutos"), hdr."StartTime", hdr."EndTime", COALESCE(hdr."DiasSelecionados",ARRAY[]::smallint[])::int[]);
    END IF;

    UPDATE public."SAAS_Detalhes_Disparos" SET "dataEnvio"=v_cur_ts WHERE id=rec_det.id;

    v_counter := v_counter + 1;
    v_gap := hdr."intervaloMin" + floor(random() * (hdr."intervaloMax" - hdr."intervaloMin" + 1))::int;
    v_cur_ts := public.f_next_valid_time(v_cur_ts + make_interval(secs => v_gap), hdr."StartTime", hdr."EndTime", COALESCE(hdr."DiasSelecionados",ARRAY[]::smallint[])::int[]);
  END LOOP;
END
$function$;