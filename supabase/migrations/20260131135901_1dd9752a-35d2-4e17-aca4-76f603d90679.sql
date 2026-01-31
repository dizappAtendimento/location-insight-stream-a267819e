-- Corrigir a função create_disparo para salvar mídia no Payload
-- O problema é que ela lê de msg_obj->'media' mas o frontend envia 'medias' (array)
-- E ela salva no KeyRedis ao invés do Payload

CREATE OR REPLACE FUNCTION public.create_disparo(p_payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  v_disparo_id bigint; 
  v_first_ts timestamptz; 
  v_total int := 0; 
  v_idx_msg int := 1; 
  v_idx_conn int := 1; 
  v_counter int := 0; 
  v_gap int;
  v_msg_obj jsonb; 
  v_template text; 
  v_media_payload jsonb;  -- Changed to store full media payload
  v_conn_id bigint; 
  v_rendered text; 
  rec_cont record;
  v_limit_plan bigint; 
  v_used_month bigint; 
  v_to_send bigint; 
  v_total_after bigint;
  v_month_start timestamptz := (date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo');
  v_next_month  timestamptz := ((date_trunc('month', now() AT TIME ZONE 'America/Sao_Paulo') + interval '1 month') AT TIME ZONE 'America/Sao_Paulo');
BEGIN
  -- Check plan limits
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

  -- Insert dispatch header
  INSERT INTO public."SAAS_Disparos"
    ("Mensagens","TipoDisparo","TotalDisparos","MensagensDisparadas","StatusDisparo","userId","idListas","idConexoes",
     "intervaloMin","intervaloMax","PausaAposMensagens","PausaMinutos","StartTime","EndTime","DiasSelecionados","DataAgendamento")
  VALUES (v_messages,'Individual',0,0,'Aguardando',v_user_id,v_list_ids,v_conn_ids,v_interval_min,v_interval_max,v_pause_after,v_pause_minutes,
          v_start_time,v_end_time,v_days::smallint[], CASE WHEN p_payload #>> '{settings,scheduleData}' IS NOT NULL THEN v_schedule_base ELSE NULL END)
  RETURNING id INTO v_disparo_id;

  -- Process each contact
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
    
    -- Extract media from either 'medias' array (first element) or legacy 'media' object
    v_media_payload := NULL;
    IF v_msg_obj->'medias' IS NOT NULL AND jsonb_array_length(COALESCE(v_msg_obj->'medias', '[]'::jsonb)) > 0 THEN
      -- New format: take first media from array
      v_media_payload := jsonb_build_object('media', v_msg_obj->'medias'->0);
    ELSIF v_msg_obj->'media' IS NOT NULL AND v_msg_obj->'media'->>'link' IS NOT NULL THEN
      -- Legacy format: single media object
      v_media_payload := jsonb_build_object('media', v_msg_obj->'media');
    END IF;

    v_conn_id := CASE WHEN v_conn_count > 0 THEN v_conn_ids[v_idx_conn] END;
    IF v_conn_count > 0 THEN v_idx_conn := (v_idx_conn % v_conn_count) + 1; END IF;

    -- Handle pause after X messages
    IF v_pause_after > 0 AND v_counter > 0 AND v_counter % v_pause_after = 0 THEN
      v_cur_ts := public.f_next_valid_time(v_cur_ts + make_interval(mins => v_pause_minutes), v_start_time, v_end_time, v_days);
    END IF;

    -- Render message with variables
    v_rendered := public.f_render_message(v_template, rec_cont.nome, rec_cont.atributos, v_cur_ts);

    -- Insert detail record with Payload instead of KeyRedis
    INSERT INTO public."SAAS_Detalhes_Disparos"
      ("idDisparo","idContato","Mensagem","idConexao","dataEnvio","Status","Payload","FakeCall")
    VALUES (v_disparo_id, rec_cont.id, v_rendered, v_conn_id, v_cur_ts, 'pending', v_media_payload, v_fake_call);

    IF v_total = 0 THEN v_first_ts := v_cur_ts; END IF;

    v_total := v_total + 1; v_counter := v_counter + 1;
    v_gap := v_interval_min + floor(random() * (v_interval_max - v_interval_min + 1))::int;
    v_cur_ts := public.f_next_valid_time(v_cur_ts + make_interval(secs => v_gap), v_start_time, v_end_time, v_days);
  END LOOP;

  -- Update dispatch totals
  UPDATE public."SAAS_Disparos"
     SET "TotalDisparos"=v_total,
         "StatusDisparo"=CASE WHEN v_first_ts > now() THEN 'Aguardando' ELSE 'Em andamento' END
   WHERE id=v_disparo_id;

  RETURN v_disparo_id;
END
$$;