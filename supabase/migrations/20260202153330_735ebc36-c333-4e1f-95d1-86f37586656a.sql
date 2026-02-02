-- Fix function search_path security issues
-- Update update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Update f_saudacao function
CREATE OR REPLACE FUNCTION public.f_saudacao(p_ts timestamptz)
RETURNS text AS $$
DECLARE
  hora integer;
BEGIN
  hora := EXTRACT(HOUR FROM p_ts AT TIME ZONE 'America/Sao_Paulo');
  IF hora < 12 THEN
    RETURN 'Bom dia';
  ELSIF hora < 18 THEN
    RETURN 'Boa tarde';
  ELSE
    RETURN 'Boa noite';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE SET search_path = public;

-- Update f_render_message function
CREATE OR REPLACE FUNCTION public.f_render_message(
  p_template text,
  p_nome text,
  p_attrs jsonb,
  p_send_ts timestamptz
)
RETURNS text AS $$
DECLARE
  result text := p_template;
BEGIN
  -- Replace common variables
  result := REPLACE(result, '<nome>', COALESCE(p_nome, ''));
  result := REPLACE(result, '<saudacao>', f_saudacao(p_send_ts));
  result := REPLACE(result, '<data>', TO_CHAR(p_send_ts AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY'));
  result := REPLACE(result, '<hora>', TO_CHAR(p_send_ts AT TIME ZONE 'America/Sao_Paulo', 'HH24:MI'));
  
  -- Replace custom attributes from JSON
  IF p_attrs IS NOT NULL THEN
    SELECT COALESCE(
      REDUCE(
        ARRAY(SELECT jsonb_object_keys(p_attrs)),
        result,
        (acc, key) -> REPLACE(acc, '<' || key || '>', COALESCE(p_attrs->>key, ''))
      ),
      result
    ) INTO result;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SET search_path = public;