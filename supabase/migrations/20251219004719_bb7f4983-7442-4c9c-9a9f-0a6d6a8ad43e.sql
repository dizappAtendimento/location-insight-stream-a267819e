-- Create table for maturador sessions
CREATE TABLE public."SAAS_Maturador" (
  id SERIAL PRIMARY KEY,
  "userId" UUID NOT NULL,
  "idConexao1" INTEGER NOT NULL,
  "idConexao2" INTEGER NOT NULL,
  "telefone1" TEXT,
  "telefone2" TEXT,
  "instanceName1" TEXT NOT NULL,
  "instanceName2" TEXT NOT NULL,
  "totalMensagens" INTEGER NOT NULL DEFAULT 10,
  "mensagensEnviadas" INTEGER NOT NULL DEFAULT 0,
  "intervaloMin" INTEGER NOT NULL DEFAULT 30,
  "intervaloMax" INTEGER NOT NULL DEFAULT 120,
  "status" TEXT NOT NULL DEFAULT 'running' CHECK ("status" IN ('running', 'paused', 'completed', 'error')),
  "mensagens" JSONB DEFAULT '[]'::jsonb,
  "ultimaMensagem" TIMESTAMPTZ,
  "proximoEnvio" TIMESTAMPTZ,
  "mensagemErro" TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public."SAAS_Maturador" ENABLE ROW LEVEL SECURITY;

-- Create policy for service role (matching other tables)
CREATE POLICY "service_role_full_access"
ON public."SAAS_Maturador"
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add indexes for status lookups
CREATE INDEX idx_maturador_status ON public."SAAS_Maturador"("status", "proximoEnvio");
CREATE INDEX idx_maturador_user ON public."SAAS_Maturador"("userId");