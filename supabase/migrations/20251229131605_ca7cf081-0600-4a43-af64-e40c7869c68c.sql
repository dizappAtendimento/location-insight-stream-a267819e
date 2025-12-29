-- Adicionar policy para usuários lerem suas próprias conexões
CREATE POLICY "Usuarios podem ver suas conexoes"
ON public."SAAS_Conexões"
FOR SELECT
TO authenticated
USING ("idUsuario" = auth.uid());