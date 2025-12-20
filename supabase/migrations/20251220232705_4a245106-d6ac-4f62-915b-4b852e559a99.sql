-- Create RLS policies for arquivos bucket

-- Allow anyone to view files (public bucket)
CREATE POLICY "Arquivos são publicamente acessíveis"
ON storage.objects
FOR SELECT
USING (bucket_id = 'arquivos');

-- Allow authenticated users to upload files
CREATE POLICY "Usuários autenticados podem fazer upload"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'arquivos' AND auth.uid() IS NOT NULL);

-- Allow users to update their own files
CREATE POLICY "Usuários podem atualizar seus arquivos"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'arquivos' AND auth.uid() IS NOT NULL);

-- Allow users to delete their own files  
CREATE POLICY "Usuários podem deletar seus arquivos"
ON storage.objects
FOR DELETE
USING (bucket_id = 'arquivos' AND auth.uid() IS NOT NULL);