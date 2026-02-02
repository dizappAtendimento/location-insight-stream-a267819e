-- Corrigir a função f_render_message para substituir atributos personalizados corretamente
CREATE OR REPLACE FUNCTION public.f_render_message(p_template text, p_nome text, p_attrs jsonb, p_send_ts timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  result text := p_template;
  attr_key text;
  attr_value text;
BEGIN
  -- Replace common variables
  result := REPLACE(result, '<nome>', COALESCE(p_nome, ''));
  result := REPLACE(result, '<saudacao>', f_saudacao(p_send_ts));
  result := REPLACE(result, '<data>', TO_CHAR(p_send_ts AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY'));
  result := REPLACE(result, '<hora>', TO_CHAR(p_send_ts AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'));
  
  -- Replace custom attributes from JSON using loop
  IF p_attrs IS NOT NULL THEN
    FOR attr_key IN SELECT jsonb_object_keys(p_attrs)
    LOOP
      attr_value := COALESCE(p_attrs->>attr_key, '');
      result := REPLACE(result, '<' || attr_key || '>', attr_value);
    END LOOP;
  END IF;
  
  RETURN result;
END;
$function$;