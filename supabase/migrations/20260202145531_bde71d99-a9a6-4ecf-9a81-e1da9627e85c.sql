-- Table for video attachments (PDFs, documents, etc.)
CREATE TABLE public.saas_video_anexos (
  id SERIAL PRIMARY KEY,
  video_id INTEGER NOT NULL REFERENCES public.saas_videos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  arquivo_url TEXT NOT NULL,
  tipo TEXT, -- pdf, doc, xlsx, etc.
  tamanho INTEGER, -- size in bytes
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for video ratings (1-5 stars)
CREATE TABLE public.saas_video_avaliacoes (
  id SERIAL PRIMARY KEY,
  video_id INTEGER NOT NULL REFERENCES public.saas_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, user_id) -- One rating per user per video
);

-- Table for video comments
CREATE TABLE public.saas_video_comentarios (
  id SERIAL PRIMARY KEY,
  video_id INTEGER NOT NULL REFERENCES public.saas_videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_nome TEXT,
  user_avatar TEXT,
  comentario TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.saas_video_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_video_avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_video_comentarios ENABLE ROW LEVEL SECURITY;

-- Policies for anexos (public read, admin write via edge function)
CREATE POLICY "Anexos são visíveis para todos"
  ON public.saas_video_anexos FOR SELECT
  USING (true);

-- Policies for avaliacoes
CREATE POLICY "Avaliações são visíveis para todos"
  ON public.saas_video_avaliacoes FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem criar própria avaliação"
  ON public.saas_video_avaliacoes FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem atualizar própria avaliação"
  ON public.saas_video_avaliacoes FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem deletar própria avaliação"
  ON public.saas_video_avaliacoes FOR DELETE
  USING (user_id = auth.uid());

-- Policies for comentarios
CREATE POLICY "Comentários são visíveis para todos"
  ON public.saas_video_comentarios FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem criar comentário"
  ON public.saas_video_comentarios FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Usuários podem deletar próprio comentário"
  ON public.saas_video_comentarios FOR DELETE
  USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_video_anexos_video ON public.saas_video_anexos(video_id);
CREATE INDEX idx_video_avaliacoes_video ON public.saas_video_avaliacoes(video_id);
CREATE INDEX idx_video_comentarios_video ON public.saas_video_comentarios(video_id);
CREATE INDEX idx_video_comentarios_created ON public.saas_video_comentarios(created_at DESC);

-- Create storage bucket for video attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('video-anexos', 'video-anexos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for video attachments
CREATE POLICY "Anexos são públicos para leitura"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'video-anexos');

CREATE POLICY "Admins podem fazer upload de anexos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'video-anexos' AND is_admin(auth.uid()));

CREATE POLICY "Admins podem deletar anexos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'video-anexos' AND is_admin(auth.uid()));