-- =====================================================
-- SECURITY FIX: Recreate views with security_invoker
-- =====================================================

-- Drop and recreate vw_Usuarios_Com_Plano with security_invoker
DROP VIEW IF EXISTS public.vw_Usuarios_Com_Plano;

CREATE VIEW public.vw_Usuarios_Com_Plano
WITH (security_invoker = on)
AS
SELECT 
  u.id,
  u."Email",
  u.nome,
  u.telefone,
  u.status,
  u.created_at,
  u."dataValidade",
  u.apikey_gpt,
  p.id as plano_id,
  p.nome as plano_nome,
  p.preco as plano_preco,
  p."qntConexoes" as plano_qntConexoes,
  p."qntContatos" as plano_qntContatos,
  p."qntListas" as plano_qntListas,
  p."qntDisparos" as plano_qntDisparos,
  p.created_at as plano_created_at,
  (SELECT COUNT(*) FROM public."SAAS_Conexões" c WHERE c."idUsuario" = u.id) as total_conexoes,
  (SELECT COUNT(*) FROM public."SAAS_Contatos" ct WHERE ct."idUsuario" = u.id) as total_contatos,
  (SELECT COUNT(*) FROM public."SAAS_Listas" l WHERE l."idUsuario" = u.id) as total_listas,
  (SELECT COUNT(*) FROM public."SAAS_Disparos" d WHERE d."userId" = u.id) as total_disparos
FROM public."SAAS_Usuarios" u
LEFT JOIN public."SAAS_Planos" p ON u.plano = p.id;

-- =====================================================
-- SECURITY FIX: Recreate vw_Detalhes_Completo with security_invoker
-- =====================================================

DROP VIEW IF EXISTS public.vw_Detalhes_Completo;

CREATE VIEW public.vw_Detalhes_Completo
WITH (security_invoker = on)
AS
SELECT 
  dd.id,
  dd."idDisparo",
  dd."idConexao",
  dd."idContato",
  dd."idGrupo",
  dd."Status",
  dd."Mensagem",
  dd."dataEnvio",
  dd."KeyRedis",
  dd."statusHttp",
  dd."mensagemErro",
  dd."Payload",
  dd."respostaHttp",
  dd."FakeCall",
  d."StatusDisparo",
  d."TipoDisparo",
  d."userId" as "UserId",
  c."NomeConexao",
  c."Apikey" as "ApikeyConexao",
  c."instanceName" as "InstanceName",
  ct.telefone as "TelefoneContato",
  g.nome as "NomeGrupo",
  g."WhatsAppId" as "WhatsAppIdGrupo"
FROM public."SAAS_Detalhes_Disparos" dd
LEFT JOIN public."SAAS_Disparos" d ON dd."idDisparo" = d.id
LEFT JOIN public."SAAS_Conexões" c ON dd."idConexao" = c.id
LEFT JOIN public."SAAS_Contatos" ct ON dd."idContato" = ct.id
LEFT JOIN public."SAAS_Grupos" g ON dd."idGrupo" = g.id;

-- =====================================================
-- SECURITY FIX: Recreate vw_Planos_Usuarios_Count with security_invoker
-- =====================================================

DROP VIEW IF EXISTS public.vw_Planos_Usuarios_Count;

CREATE VIEW public.vw_Planos_Usuarios_Count
WITH (security_invoker = on)
AS
SELECT 
  p.id,
  p.nome,
  p.preco,
  p."qntConexoes",
  p."qntContatos",
  p."qntListas",
  p."qntDisparos",
  p.created_at,
  (SELECT COUNT(*) FROM public."SAAS_Usuarios" u WHERE u.plano = p.id) as total_usuarios
FROM public."SAAS_Planos" p;