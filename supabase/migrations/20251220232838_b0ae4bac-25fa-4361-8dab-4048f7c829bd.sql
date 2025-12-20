-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload" ON storage.objects;

-- Create a more permissive INSERT policy for the arquivos bucket
CREATE POLICY "Permitir upload no bucket arquivos"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'arquivos');