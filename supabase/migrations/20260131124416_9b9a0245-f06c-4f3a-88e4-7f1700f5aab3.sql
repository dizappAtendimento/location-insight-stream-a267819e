-- =====================================================
-- CORREÇÃO COMPLETA DE SEGURANÇA
-- =====================================================

-- 1. Corrigir funções sem search_path (SECURITY FIX)
-- =====================================================

-- Corrigir função has_role
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Corrigir função is_admin
DROP FUNCTION IF EXISTS public.is_admin(uuid);
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'::public.app_role
  )
$$;

-- 2. Políticas RLS para SAAS_Usuarios (CRITICAL)
-- =====================================================
-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON public."SAAS_Usuarios";
DROP POLICY IF EXISTS "Users can update own profile" ON public."SAAS_Usuarios";

-- Usuários só podem ver seu próprio perfil
CREATE POLICY "Users can view own profile" 
ON public."SAAS_Usuarios" 
FOR SELECT 
TO authenticated
USING (id = auth.uid());

-- Usuários só podem atualizar seu próprio perfil (campos específicos)
CREATE POLICY "Users can update own profile" 
ON public."SAAS_Usuarios" 
FOR UPDATE 
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 3. Políticas RLS para search_jobs (CRITICAL)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own search jobs" ON public.search_jobs;
DROP POLICY IF EXISTS "Users can create own search jobs" ON public.search_jobs;
DROP POLICY IF EXISTS "Users can update own search jobs" ON public.search_jobs;
DROP POLICY IF EXISTS "Users can delete own search jobs" ON public.search_jobs;

CREATE POLICY "Users can view own search jobs" 
ON public.search_jobs 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can create own search jobs" 
ON public.search_jobs 
FOR INSERT 
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own search jobs" 
ON public.search_jobs 
FOR UPDATE 
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own search jobs" 
ON public.search_jobs 
FOR DELETE 
TO authenticated
USING (user_id = auth.uid());

-- 4. Políticas RLS para saas_pagamentos (CRITICAL)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own payments" ON public.saas_pagamentos;

CREATE POLICY "Users can view own payments" 
ON public.saas_pagamentos 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- 5. Políticas RLS para SAAS_Contatos (WARNING FIX)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own contacts" ON public."SAAS_Contatos";
DROP POLICY IF EXISTS "Users can create own contacts" ON public."SAAS_Contatos";
DROP POLICY IF EXISTS "Users can update own contacts" ON public."SAAS_Contatos";
DROP POLICY IF EXISTS "Users can delete own contacts" ON public."SAAS_Contatos";

CREATE POLICY "Users can view own contacts" 
ON public."SAAS_Contatos" 
FOR SELECT 
TO authenticated
USING ("idUsuario" = auth.uid());

CREATE POLICY "Users can create own contacts" 
ON public."SAAS_Contatos" 
FOR INSERT 
TO authenticated
WITH CHECK ("idUsuario" = auth.uid());

CREATE POLICY "Users can update own contacts" 
ON public."SAAS_Contatos" 
FOR UPDATE 
TO authenticated
USING ("idUsuario" = auth.uid())
WITH CHECK ("idUsuario" = auth.uid());

CREATE POLICY "Users can delete own contacts" 
ON public."SAAS_Contatos" 
FOR DELETE 
TO authenticated
USING ("idUsuario" = auth.uid());

-- 6. Políticas RLS para SAAS_Grupos (WARNING FIX)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own groups" ON public."SAAS_Grupos";
DROP POLICY IF EXISTS "Users can create own groups" ON public."SAAS_Grupos";
DROP POLICY IF EXISTS "Users can update own groups" ON public."SAAS_Grupos";
DROP POLICY IF EXISTS "Users can delete own groups" ON public."SAAS_Grupos";

CREATE POLICY "Users can view own groups" 
ON public."SAAS_Grupos" 
FOR SELECT 
TO authenticated
USING ("idUsuario" = auth.uid());

CREATE POLICY "Users can create own groups" 
ON public."SAAS_Grupos" 
FOR INSERT 
TO authenticated
WITH CHECK ("idUsuario" = auth.uid());

CREATE POLICY "Users can update own groups" 
ON public."SAAS_Grupos" 
FOR UPDATE 
TO authenticated
USING ("idUsuario" = auth.uid())
WITH CHECK ("idUsuario" = auth.uid());

CREATE POLICY "Users can delete own groups" 
ON public."SAAS_Grupos" 
FOR DELETE 
TO authenticated
USING ("idUsuario" = auth.uid());

-- 7. Políticas RLS para SAAS_Disparos (WARNING FIX)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own disparos" ON public."SAAS_Disparos";
DROP POLICY IF EXISTS "Users can create own disparos" ON public."SAAS_Disparos";
DROP POLICY IF EXISTS "Users can update own disparos" ON public."SAAS_Disparos";
DROP POLICY IF EXISTS "Users can delete own disparos" ON public."SAAS_Disparos";

CREATE POLICY "Users can view own disparos" 
ON public."SAAS_Disparos" 
FOR SELECT 
TO authenticated
USING ("userId" = auth.uid());

CREATE POLICY "Users can create own disparos" 
ON public."SAAS_Disparos" 
FOR INSERT 
TO authenticated
WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Users can update own disparos" 
ON public."SAAS_Disparos" 
FOR UPDATE 
TO authenticated
USING ("userId" = auth.uid())
WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Users can delete own disparos" 
ON public."SAAS_Disparos" 
FOR DELETE 
TO authenticated
USING ("userId" = auth.uid());

-- 8. Políticas RLS para SAAS_Listas (WARNING FIX)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own listas" ON public."SAAS_Listas";
DROP POLICY IF EXISTS "Users can create own listas" ON public."SAAS_Listas";
DROP POLICY IF EXISTS "Users can update own listas" ON public."SAAS_Listas";
DROP POLICY IF EXISTS "Users can delete own listas" ON public."SAAS_Listas";

CREATE POLICY "Users can view own listas" 
ON public."SAAS_Listas" 
FOR SELECT 
TO authenticated
USING ("idUsuario" = auth.uid());

CREATE POLICY "Users can create own listas" 
ON public."SAAS_Listas" 
FOR INSERT 
TO authenticated
WITH CHECK ("idUsuario" = auth.uid());

CREATE POLICY "Users can update own listas" 
ON public."SAAS_Listas" 
FOR UPDATE 
TO authenticated
USING ("idUsuario" = auth.uid())
WITH CHECK ("idUsuario" = auth.uid());

CREATE POLICY "Users can delete own listas" 
ON public."SAAS_Listas" 
FOR DELETE 
TO authenticated
USING ("idUsuario" = auth.uid());

-- 9. Políticas RLS para SAAS_Maturador (WARNING FIX)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own maturador" ON public."SAAS_Maturador";
DROP POLICY IF EXISTS "Users can create own maturador" ON public."SAAS_Maturador";
DROP POLICY IF EXISTS "Users can update own maturador" ON public."SAAS_Maturador";
DROP POLICY IF EXISTS "Users can delete own maturador" ON public."SAAS_Maturador";

CREATE POLICY "Users can view own maturador" 
ON public."SAAS_Maturador" 
FOR SELECT 
TO authenticated
USING ("userId" = auth.uid());

CREATE POLICY "Users can create own maturador" 
ON public."SAAS_Maturador" 
FOR INSERT 
TO authenticated
WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Users can update own maturador" 
ON public."SAAS_Maturador" 
FOR UPDATE 
TO authenticated
USING ("userId" = auth.uid())
WITH CHECK ("userId" = auth.uid());

CREATE POLICY "Users can delete own maturador" 
ON public."SAAS_Maturador" 
FOR DELETE 
TO authenticated
USING ("userId" = auth.uid());

-- 10. Políticas RLS para SAAS_Chat_Labels (WARNING FIX)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own chat labels" ON public."SAAS_Chat_Labels";
DROP POLICY IF EXISTS "Users can create own chat labels" ON public."SAAS_Chat_Labels";
DROP POLICY IF EXISTS "Users can update own chat labels" ON public."SAAS_Chat_Labels";
DROP POLICY IF EXISTS "Users can delete own chat labels" ON public."SAAS_Chat_Labels";

CREATE POLICY "Users can view own chat labels" 
ON public."SAAS_Chat_Labels" 
FOR SELECT 
TO authenticated
USING ("idUsuario" = auth.uid());

CREATE POLICY "Users can create own chat labels" 
ON public."SAAS_Chat_Labels" 
FOR INSERT 
TO authenticated
WITH CHECK ("idUsuario" = auth.uid());

CREATE POLICY "Users can update own chat labels" 
ON public."SAAS_Chat_Labels" 
FOR UPDATE 
TO authenticated
USING ("idUsuario" = auth.uid())
WITH CHECK ("idUsuario" = auth.uid());

CREATE POLICY "Users can delete own chat labels" 
ON public."SAAS_Chat_Labels" 
FOR DELETE 
TO authenticated
USING ("idUsuario" = auth.uid());

-- 11. Políticas RLS para saas_cupons_uso (WARNING FIX)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own coupon usage" ON public.saas_cupons_uso;

CREATE POLICY "Users can view own coupon usage" 
ON public.saas_cupons_uso 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- 12. Políticas RLS para user_roles (WARNING FIX)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

-- 13. Políticas RLS para SAAS_CRM_Leads (CRITICAL - já existe mas vamos garantir)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own leads" ON public."SAAS_CRM_Leads";
DROP POLICY IF EXISTS "Users can create own leads" ON public."SAAS_CRM_Leads";
DROP POLICY IF EXISTS "Users can update own leads" ON public."SAAS_CRM_Leads";
DROP POLICY IF EXISTS "Users can delete own leads" ON public."SAAS_CRM_Leads";

CREATE POLICY "Users can view own leads" 
ON public."SAAS_CRM_Leads" 
FOR SELECT 
TO authenticated
USING ("idUsuario" = auth.uid());

CREATE POLICY "Users can create own leads" 
ON public."SAAS_CRM_Leads" 
FOR INSERT 
TO authenticated
WITH CHECK ("idUsuario" = auth.uid());

CREATE POLICY "Users can update own leads" 
ON public."SAAS_CRM_Leads" 
FOR UPDATE 
TO authenticated
USING ("idUsuario" = auth.uid())
WITH CHECK ("idUsuario" = auth.uid());

CREATE POLICY "Users can delete own leads" 
ON public."SAAS_CRM_Leads" 
FOR DELETE 
TO authenticated
USING ("idUsuario" = auth.uid());

-- 14. Políticas RLS para SAAS_CRM_Colunas
-- =====================================================
DROP POLICY IF EXISTS "Users can view own columns" ON public."SAAS_CRM_Colunas";
DROP POLICY IF EXISTS "Users can create own columns" ON public."SAAS_CRM_Colunas";
DROP POLICY IF EXISTS "Users can update own columns" ON public."SAAS_CRM_Colunas";
DROP POLICY IF EXISTS "Users can delete own columns" ON public."SAAS_CRM_Colunas";

CREATE POLICY "Users can view own columns" 
ON public."SAAS_CRM_Colunas" 
FOR SELECT 
TO authenticated
USING ("idUsuario" = auth.uid());

CREATE POLICY "Users can create own columns" 
ON public."SAAS_CRM_Colunas" 
FOR INSERT 
TO authenticated
WITH CHECK ("idUsuario" = auth.uid());

CREATE POLICY "Users can update own columns" 
ON public."SAAS_CRM_Colunas" 
FOR UPDATE 
TO authenticated
USING ("idUsuario" = auth.uid())
WITH CHECK ("idUsuario" = auth.uid());

CREATE POLICY "Users can delete own columns" 
ON public."SAAS_CRM_Colunas" 
FOR DELETE 
TO authenticated
USING ("idUsuario" = auth.uid());

-- 15. Políticas RLS para SAAS_Conexões (já tem mas vamos adicionar INSERT/UPDATE/DELETE)
-- =====================================================
DROP POLICY IF EXISTS "Users can create own connections" ON public."SAAS_Conexões";
DROP POLICY IF EXISTS "Users can update own connections" ON public."SAAS_Conexões";
DROP POLICY IF EXISTS "Users can delete own connections" ON public."SAAS_Conexões";

CREATE POLICY "Users can create own connections" 
ON public."SAAS_Conexões" 
FOR INSERT 
TO authenticated
WITH CHECK ("idUsuario" = auth.uid());

CREATE POLICY "Users can update own connections" 
ON public."SAAS_Conexões" 
FOR UPDATE 
TO authenticated
USING ("idUsuario" = auth.uid())
WITH CHECK ("idUsuario" = auth.uid());

CREATE POLICY "Users can delete own connections" 
ON public."SAAS_Conexões" 
FOR DELETE 
TO authenticated
USING ("idUsuario" = auth.uid());

-- 16. Políticas para SAAS_Planos (public read para página de preços)
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view plans" ON public."SAAS_Planos";

CREATE POLICY "Anyone can view plans" 
ON public."SAAS_Planos" 
FOR SELECT 
TO anon, authenticated
USING (true);

-- 17. Políticas para saas_cupons (somente admins podem ver)
-- =====================================================
DROP POLICY IF EXISTS "Admins can view coupons" ON public.saas_cupons;

CREATE POLICY "Admins can view coupons" 
ON public.saas_cupons 
FOR SELECT 
TO authenticated
USING (public.is_admin(auth.uid()));

-- 18. Políticas para saas_configuracoes (somente admins)
-- =====================================================
DROP POLICY IF EXISTS "Admins can view configurations" ON public.saas_configuracoes;
DROP POLICY IF EXISTS "Admins can update configurations" ON public.saas_configuracoes;

CREATE POLICY "Admins can view configurations" 
ON public.saas_configuracoes 
FOR SELECT 
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update configurations" 
ON public.saas_configuracoes 
FOR UPDATE 
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- 19. Habilitar RLS em todas as tabelas (garantir)
-- =====================================================
ALTER TABLE public."SAAS_Usuarios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SAAS_Contatos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SAAS_Grupos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SAAS_Disparos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SAAS_Listas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SAAS_Maturador" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SAAS_Chat_Labels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SAAS_CRM_Leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SAAS_CRM_Colunas" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SAAS_Conexões" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SAAS_Planos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_cupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_cupons_uso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;