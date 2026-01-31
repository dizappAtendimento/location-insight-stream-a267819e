-- =====================================================
-- CORREÇÃO DE WARNINGS RESTANTES
-- =====================================================

-- 1. Corrigir políticas RLS "always true" para operações de escrita em SAAS_CRM_Colunas
-- Remover políticas service_role permissivas que usam true para INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "service_role_full_access_colunas" ON public."SAAS_CRM_Colunas";
DROP POLICY IF EXISTS "service_role_full_access_leads" ON public."SAAS_CRM_Leads";
DROP POLICY IF EXISTS "service_role_full_access" ON public."SAAS_Conexões";
DROP POLICY IF EXISTS "service_role_full_access" ON public."SAAS_Contatos";
DROP POLICY IF EXISTS "service_role_full_access" ON public."SAAS_Detalhes_Disparos";
DROP POLICY IF EXISTS "service_role_full_access" ON public."SAAS_Disparos";
DROP POLICY IF EXISTS "service_role_full_access" ON public."SAAS_Grupos";
DROP POLICY IF EXISTS "service_role_full_access" ON public."SAAS_Listas";
DROP POLICY IF EXISTS "service_role_full_access" ON public."SAAS_Maturador";
DROP POLICY IF EXISTS "service_role_full_access_chat_labels" ON public."SAAS_Chat_Labels";
DROP POLICY IF EXISTS "service_role_full_access" ON public."SAAS_Usuarios";
DROP POLICY IF EXISTS "service_role_full_access" ON public."SAAS_Planos";
DROP POLICY IF EXISTS "service_role_full_access_cupons" ON public.saas_cupons;
DROP POLICY IF EXISTS "service_role_full_access_cupons_uso" ON public.saas_cupons_uso;
DROP POLICY IF EXISTS "service_role_full_access_configuracoes" ON public.saas_configuracoes;
DROP POLICY IF EXISTS "service_role_full_access_pagamentos" ON public.saas_pagamentos;
DROP POLICY IF EXISTS "Service role full access" ON public.search_jobs;
DROP POLICY IF EXISTS "service_role_full_access" ON public.user_roles;

-- 2. Corrigir tabela SAAS_Detalhes_Disparos - acesso via join com SAAS_Disparos
DROP POLICY IF EXISTS "Users can view own detalhe disparos" ON public."SAAS_Detalhes_Disparos";
DROP POLICY IF EXISTS "Users can create own detalhe disparos" ON public."SAAS_Detalhes_Disparos";
DROP POLICY IF EXISTS "Users can update own detalhe disparos" ON public."SAAS_Detalhes_Disparos";
DROP POLICY IF EXISTS "Users can delete own detalhe disparos" ON public."SAAS_Detalhes_Disparos";

-- Criar função auxiliar para verificar dono do disparo
CREATE OR REPLACE FUNCTION public.get_disparo_owner(p_disparo_id bigint)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT "userId" FROM public."SAAS_Disparos" WHERE id = p_disparo_id
$$;

-- RLS para SAAS_Detalhes_Disparos usando a função
CREATE POLICY "Users can view own detalhe disparos" 
ON public."SAAS_Detalhes_Disparos" 
FOR SELECT 
TO authenticated
USING (public.get_disparo_owner("idDisparo") = auth.uid());

CREATE POLICY "Users can update own detalhe disparos" 
ON public."SAAS_Detalhes_Disparos" 
FOR UPDATE 
TO authenticated
USING (public.get_disparo_owner("idDisparo") = auth.uid());

-- Enable RLS
ALTER TABLE public."SAAS_Detalhes_Disparos" ENABLE ROW LEVEL SECURITY;

-- 3. Atualizar política existente "Usuarios podem..." para usar PERMISSIVE
-- Remove políticas restritivas duplicadas e recria como PERMISSIVE
DROP POLICY IF EXISTS "Usuarios podem atualizar suas colunas " ON public."SAAS_CRM_Colunas";
DROP POLICY IF EXISTS "Usuarios podem criar suas colunas " ON public."SAAS_CRM_Colunas";
DROP POLICY IF EXISTS "Usuarios podem deletar suas colunas " ON public."SAAS_CRM_Colunas";
DROP POLICY IF EXISTS "Usuarios podem ver suas colunas " ON public."SAAS_CRM_Colunas";

DROP POLICY IF EXISTS "Usuarios podem atualizar seus leads " ON public."SAAS_CRM_Leads";
DROP POLICY IF EXISTS "Usuarios podem criar seus leads " ON public."SAAS_CRM_Leads";
DROP POLICY IF EXISTS "Usuarios podem deletar seus leads " ON public."SAAS_CRM_Leads";
DROP POLICY IF EXISTS "Usuarios podem ver seus leads " ON public."SAAS_CRM_Leads";

DROP POLICY IF EXISTS "Usuarios podem ver suas conexoes " ON public."SAAS_Conexões";

-- Recriar políticas CRM Colunas como PERMISSIVE
CREATE POLICY "Usuarios podem ver colunas" 
ON public."SAAS_CRM_Colunas" 
FOR SELECT 
TO authenticated
USING ("idUsuario" = auth.uid());

CREATE POLICY "Usuarios podem criar colunas" 
ON public."SAAS_CRM_Colunas" 
FOR INSERT 
TO authenticated
WITH CHECK ("idUsuario" = auth.uid());

CREATE POLICY "Usuarios podem atualizar colunas" 
ON public."SAAS_CRM_Colunas" 
FOR UPDATE 
TO authenticated
USING ("idUsuario" = auth.uid())
WITH CHECK ("idUsuario" = auth.uid());

CREATE POLICY "Usuarios podem deletar colunas" 
ON public."SAAS_CRM_Colunas" 
FOR DELETE 
TO authenticated
USING ("idUsuario" = auth.uid());

-- Recriar políticas CRM Leads como PERMISSIVE
CREATE POLICY "Usuarios podem ver leads" 
ON public."SAAS_CRM_Leads" 
FOR SELECT 
TO authenticated
USING ("idUsuario" = auth.uid());

CREATE POLICY "Usuarios podem criar leads" 
ON public."SAAS_CRM_Leads" 
FOR INSERT 
TO authenticated
WITH CHECK ("idUsuario" = auth.uid());

CREATE POLICY "Usuarios podem atualizar leads" 
ON public."SAAS_CRM_Leads" 
FOR UPDATE 
TO authenticated
USING ("idUsuario" = auth.uid())
WITH CHECK ("idUsuario" = auth.uid());

CREATE POLICY "Usuarios podem deletar leads" 
ON public."SAAS_CRM_Leads" 
FOR DELETE 
TO authenticated
USING ("idUsuario" = auth.uid());

-- Recriar política Conexões como PERMISSIVE
CREATE POLICY "Usuarios podem ver conexoes" 
ON public."SAAS_Conexões" 
FOR SELECT 
TO authenticated
USING ("idUsuario" = auth.uid());