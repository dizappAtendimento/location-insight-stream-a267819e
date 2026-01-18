-- Create storage bucket for media uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-disparos', 'media-disparos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media-disparos');

-- Allow anyone to read files (public bucket)
CREATE POLICY "Anyone can view media"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'media-disparos');

-- Allow users to delete their own files
CREATE POLICY "Users can delete own media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'media-disparos' AND auth.uid()::text = (storage.foldername(name))[1]);