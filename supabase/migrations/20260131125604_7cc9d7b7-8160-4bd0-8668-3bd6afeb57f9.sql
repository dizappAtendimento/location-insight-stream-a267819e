-- =====================================================
-- SECURITY FIX: Add missing RLS policies
-- =====================================================

-- saas_cupons: Add missing INSERT/UPDATE/DELETE for admins only
CREATE POLICY "Admins can insert coupons" ON public.saas_cupons
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update coupons" ON public.saas_cupons
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete coupons" ON public.saas_cupons
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- saas_configuracoes: Add missing INSERT/DELETE for admins only
CREATE POLICY "Admins can insert configurations" ON public.saas_configuracoes
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete configurations" ON public.saas_configuracoes
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- user_roles: Add restrictive policies (only admins can manage)
CREATE POLICY "Admins can insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- saas_pagamentos: Deny INSERT/UPDATE/DELETE to regular users (only service_role should manage)
-- These operations should only happen through edge functions with service_role

-- saas_cupons_uso: Deny direct manipulation (only service_role should manage)
-- These operations should only happen through edge functions with service_role

-- SAAS_Detalhes_Disparos: Add INSERT policy through disparo owner check
-- Note: INSERT happens through database functions with service role

-- SAAS_Usuarios: Users should not be able to INSERT or DELETE themselves
-- INSERT: handled by auth-register edge function with service_role
-- DELETE: handled by admin-api edge function with service_role

-- Remove duplicate policies to clean up
DROP POLICY IF EXISTS "Usuarios podem ver colunas" ON public."SAAS_CRM_Colunas";
DROP POLICY IF EXISTS "Usuarios podem criar colunas" ON public."SAAS_CRM_Colunas";
DROP POLICY IF EXISTS "Usuarios podem atualizar colunas" ON public."SAAS_CRM_Colunas";
DROP POLICY IF EXISTS "Usuarios podem deletar colunas" ON public."SAAS_CRM_Colunas";
DROP POLICY IF EXISTS "Usuarios podem ver suas colunas" ON public."SAAS_CRM_Colunas";
DROP POLICY IF EXISTS "Usuarios podem criar suas colunas" ON public."SAAS_CRM_Colunas";
DROP POLICY IF EXISTS "Usuarios podem atualizar suas colunas" ON public."SAAS_CRM_Colunas";
DROP POLICY IF EXISTS "Usuarios podem deletar suas colunas" ON public."SAAS_CRM_Colunas";

DROP POLICY IF EXISTS "Usuarios podem ver leads" ON public."SAAS_CRM_Leads";
DROP POLICY IF EXISTS "Usuarios podem criar leads" ON public."SAAS_CRM_Leads";
DROP POLICY IF EXISTS "Usuarios podem atualizar leads" ON public."SAAS_CRM_Leads";
DROP POLICY IF EXISTS "Usuarios podem deletar leads" ON public."SAAS_CRM_Leads";
DROP POLICY IF EXISTS "Usuarios podem ver seus leads" ON public."SAAS_CRM_Leads";
DROP POLICY IF EXISTS "Usuarios podem criar seus leads" ON public."SAAS_CRM_Leads";
DROP POLICY IF EXISTS "Usuarios podem atualizar seus leads" ON public."SAAS_CRM_Leads";
DROP POLICY IF EXISTS "Usuarios podem deletar seus leads" ON public."SAAS_CRM_Leads";

DROP POLICY IF EXISTS "Usuarios podem ver conexoes" ON public."SAAS_Conexões";
DROP POLICY IF EXISTS "Usuarios podem ver suas conexoes" ON public."SAAS_Conexões";